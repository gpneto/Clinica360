import * as admin from 'firebase-admin';
import { DateTime } from 'luxon';
import { sendEvolutionTextMessage } from './evolutionClient';
import { getCompanySettings, normalizePhoneForContact, handleWebhookAgendamento } from './whatsappEnvio';
import type { WebHookAgendamentoRequest } from './types/webhook-agendamento';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// Estados do fluxo de agendamento
export type AgendamentoState = 
  | 'initial' // Primeira pergunta: agendar ou falar com atendente
  | 'agendar_ou_consultar' // Escolha: agendar novo ou consultar existente
  | 'selecionar_profissional' // Escolher profissional
  | 'selecionar_servico' // Escolher serviço
  | 'selecionar_data' // Escolher data
  | 'selecionar_horario' // Escolher horário
  | 'confirmar_agendamento' // Confirmar dados
  | 'consultar_agendamento' // Consultar agendamentos existentes
  | 'solicitar_nome_paciente' // Solicitar nome para criar novo paciente
  | 'manual_mode'; // Modo manual (atendente responde)

interface AgendamentoContext {
  state: AgendamentoState;
  companyId: string;
  chatId: string;
  patientId?: string;
  patientName?: string; // Nome do paciente sendo cadastrado
  professionalId?: string;
  serviceIds?: string[];
  selectedDate?: string; // YYYY-MM-DD
  selectedTime?: string; // HH:mm
  // Validações salvas para evitar verificações repetidas
  agendamentoEnabled?: boolean;
  canAgendar?: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface HorarioDisponivel {
  inicio: string; // HH:mm
  fim: string; // HH:mm
}

interface HorarioFuncionamentoConfig {
  horariosPorDia?: Array<{
    diaSemana: number;
    inicio: string;
    fim: string;
    ativo: boolean;
  }>;
  intervalos?: Array<{
    id: string;
    diaSemana: number;
    inicio: string;
    fim: string;
    descricao?: string;
  }>;
  bloqueios?: Array<{
    id: string;
    tipo: 'semanal' | 'mensal' | 'data_especifica';
    diaSemana?: number;
    diaMes?: number;
    dataEspecifica?: string;
    inicio: string;
    fim: string;
    descricao?: string;
    ativo: boolean;
  }>;
}

/**
 * Converte um valor do Firestore para Date
 */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value.seconds) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return null;
}

/**
 * Formata um número para opções (apenas número, sem emoji)
 */
function formatNumberOption(num: number): string {
  return `${num}.`;
}

/**
 * Obtém ou cria o contexto de agendamento para um chat
 */
async function getAgendamentoContext(companyId: string, chatId: string): Promise<AgendamentoContext | null> {
  const contextStart = Date.now();
  console.log(`[WhatsApp Agendamento] [${chatId}] getAgendamentoContext INÍCIO`);
  
  try {
    const dbStart = Date.now();
    const contextRef = db.collection(`companies/${companyId}/whatsappAgendamentoContext`).doc(chatId);
    const contextDoc = await contextRef.get();
    console.log(`[WhatsApp Agendamento] [${chatId}] Firestore query executada em ${Date.now() - dbStart}ms`);
    
    if (contextDoc.exists) {
      console.log(`[WhatsApp Agendamento] [${chatId}] Contexto encontrado em ${Date.now() - contextStart}ms`);
      return contextDoc.data() as AgendamentoContext;
    }
    
    // Criar novo contexto
    const createStart = Date.now();
    console.log(`[WhatsApp Agendamento] [${chatId}] Contexto não existe, criando novo...`);
    const newContext: AgendamentoContext = {
      state: 'initial',
      companyId,
      chatId,
      createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      updatedAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };
    
    await contextRef.set(newContext);
    console.log(`[WhatsApp Agendamento] [${chatId}] Novo contexto criado em ${Date.now() - createStart}ms`);
    console.log(`[WhatsApp Agendamento] [${chatId}] getAgendamentoContext FIM - ${Date.now() - contextStart}ms total`);
    return newContext;
  } catch (error) {
    console.error(`[WhatsApp Agendamento] [${chatId}] Erro ao obter contexto em ${Date.now() - contextStart}ms:`, error);
    return null;
  }
}

/**
 * Atualiza o contexto de agendamento
 */
async function updateAgendamentoContext(
  companyId: string,
  chatId: string,
  updates: Partial<AgendamentoContext>
): Promise<void> {
  try {
    const contextRef = db.collection(`companies/${companyId}/whatsappAgendamentoContext`).doc(chatId);
    await contextRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao atualizar contexto:', error);
  }
}

/**
 * Reseta o contexto de agendamento
 */
async function resetAgendamentoContext(companyId: string, chatId: string): Promise<void> {
  try {
    const contextRef = db.collection(`companies/${companyId}/whatsappAgendamentoContext`).doc(chatId);
    const updateData: any = {
      state: 'initial',
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Usar FieldValue.delete() para remover campos
    updateData.professionalId = admin.firestore.FieldValue.delete();
    updateData.serviceIds = admin.firestore.FieldValue.delete();
    updateData.selectedDate = admin.firestore.FieldValue.delete();
    updateData.selectedTime = admin.firestore.FieldValue.delete();
    updateData.patientName = admin.firestore.FieldValue.delete();
    
    await contextRef.update(updateData);
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao resetar contexto:', error);
  }
}

/**
 * Verifica se o agendamento pelo WhatsApp está habilitado
 */
export async function isAgendamentoWhatsappEnabled(companyId: string): Promise<boolean> {
  const checkStart = Date.now();
  console.log(`[WhatsApp Agendamento] [${companyId}] isAgendamentoWhatsappEnabled INÍCIO`);
  
  try {
    const settings = await getCompanySettings(companyId);
    const result = settings.agendamentoWhatsappHabilitado === true;
    console.log(`[WhatsApp Agendamento] [${companyId}] isAgendamentoWhatsappEnabled FIM - ${Date.now() - checkStart}ms (resultado: ${result})`);
    return result;
  } catch (error) {
    console.error(`[WhatsApp Agendamento] [${companyId}] Erro ao verificar se está habilitado em ${Date.now() - checkStart}ms:`, error);
    return false;
  }
}

/**
 * Busca paciente pelo número de telefone
 */
async function findPatientByPhone(companyId: string, phone: string): Promise<string | null> {
  try {
    const normalizedPhone = normalizePhoneForContact(phone);
    const patientsRef = db.collection(`companies/${companyId}/patients`);
    const snapshot = await patientsRef
      .where('telefoneE164', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao buscar paciente:', error);
    return null;
  }
}

/**
 * Verifica se o paciente pode agendar (se a opção "apenas contatos" está ativa)
 */
export async function canPatientAgendar(companyId: string, phone: string): Promise<boolean> {
  try {
    const settings = await getCompanySettings(companyId);
    
    // Se não está habilitado, não pode agendar
    if (!settings.agendamentoWhatsappHabilitado) {
      return false;
    }
    
    // Se a opção "apenas contatos" está desabilitada, qualquer um pode agendar
    if (!settings.agendamentoWhatsappApenasContatos) {
      return true;
    }
    
    // Se está habilitada, verificar se o paciente existe
    const patientId = await findPatientByPhone(companyId, phone);
    return patientId !== null;
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao verificar se pode agendar:', error);
    return false;
  }
}

/**
 * Envia mensagem via Evolution API
 */
async function sendMessage(companyId: string, chatId: string, message: string): Promise<void> {
  const sendStart = Date.now();
  const messagePreview = message.substring(0, 50).replace(/\n/g, ' ');
  console.log(`[WhatsApp Agendamento] [${chatId}] Enviando mensagem: "${messagePreview}..."`);
  
  try {
    await sendEvolutionTextMessage({
      companyId,
      to: chatId,
      message,
    });
    console.log(`[WhatsApp Agendamento] [${chatId}] Mensagem enviada com sucesso em ${Date.now() - sendStart}ms`);
  } catch (error) {
    console.error(`[WhatsApp Agendamento] [${chatId}] Erro ao enviar mensagem em ${Date.now() - sendStart}ms:`, error);
    throw error;
  }
}

/**
 * Adiciona opção de sair ao final da mensagem
 */
function addSairOption(message: string): string {
  return `${message}\n\n❌ Digite *SAIR* a qualquer momento para cancelar e voltar ao menu inicial.`;
}

/**
 * Verifica se o usuário quer sair do fluxo
 */
function isSairCommand(text: string): boolean {
  const textUpper = text.trim().toUpperCase();
  return textUpper === 'SAIR' || textUpper === 'CANCELAR' || textUpper === 'CANCEL' || textUpper.includes('SAIR');
}

/**
 * Processa comando de sair
 */
async function handleSairCommand(
  companyId: string,
  chatId: string
): Promise<boolean> {
  await sendMessage(
    companyId,
    chatId,
    'Operação cancelada. Se precisar de algo, é só me chamar! 👋'
  );
  await resetAgendamentoContext(companyId, chatId);
  return true;
}

/**
 * Processa a primeira mensagem quando agendamento está habilitado
 */
export async function handleInitialMessage(
  companyId: string,
  chatId: string,
  messageText: string
): Promise<boolean> {
  const startTime = Date.now();
  console.log(`[WhatsApp Agendamento] [${chatId}] handleInitialMessage INÍCIO - ${new Date().toISOString()}`);
  
  try {
    // Buscar contexto
    const contextStart = Date.now();
    console.log(`[WhatsApp Agendamento] [${chatId}] Buscando contexto...`);
    const context = await getAgendamentoContext(companyId, chatId);
    console.log(`[WhatsApp Agendamento] [${chatId}] Contexto obtido em ${Date.now() - contextStart}ms`);
    
    if (!context) {
      console.log(`[WhatsApp Agendamento] [${chatId}] Contexto não encontrado, retornando false`);
      return false;
    }
    
    // Verificar se as validações já estão salvas no contexto
    let agendamentoEnabled = context.agendamentoEnabled;
    let canAgendar = context.canAgendar;
    console.log(`[WhatsApp Agendamento] [${chatId}] Validações no contexto: agendamentoEnabled=${agendamentoEnabled}, canAgendar=${canAgendar}`);
    
    // Se não estão salvas, fazer as validações e salvar
    if (agendamentoEnabled === undefined || canAgendar === undefined) {
      const validationStart = Date.now();
      console.log(`[WhatsApp Agendamento] [${chatId}] Validações não encontradas, buscando settings...`);
      const settings = await getCompanySettings(companyId);
      console.log(`[WhatsApp Agendamento] [${chatId}] Settings obtidos em ${Date.now() - validationStart}ms`);
      
      agendamentoEnabled = settings.agendamentoWhatsappHabilitado === true;
      
      if (!agendamentoEnabled) {
        console.log(`[WhatsApp Agendamento] [${chatId}] Agendamento não habilitado, salvando no contexto...`);
        // Salvar no contexto para não verificar novamente
        await updateAgendamentoContext(companyId, chatId, { 
          agendamentoEnabled: false,
          canAgendar: false 
        });
        console.log(`[WhatsApp Agendamento] [${chatId}] handleInitialMessage FIM (não habilitado) - ${Date.now() - startTime}ms total`);
        return false;
      }
      
      // Verificar se pode agendar
      const canAgendarStart = Date.now();
      console.log(`[WhatsApp Agendamento] [${chatId}] Verificando se pode agendar...`);
      canAgendar = true;
      if (settings.agendamentoWhatsappApenasContatos) {
        const patientCheckStart = Date.now();
        const patientId = await findPatientByPhone(companyId, chatId);
        console.log(`[WhatsApp Agendamento] [${chatId}] Busca de paciente em ${Date.now() - patientCheckStart}ms`);
        canAgendar = patientId !== null;
      }
      console.log(`[WhatsApp Agendamento] [${chatId}] Verificação canAgendar em ${Date.now() - canAgendarStart}ms`);
      
      // Salvar validações no contexto
      const saveStart = Date.now();
      console.log(`[WhatsApp Agendamento] [${chatId}] Salvando validações no contexto...`);
      await updateAgendamentoContext(companyId, chatId, { 
        agendamentoEnabled: true,
        canAgendar 
      });
      console.log(`[WhatsApp Agendamento] [${chatId}] Validações salvas em ${Date.now() - saveStart}ms`);
    } else {
      console.log(`[WhatsApp Agendamento] [${chatId}] Usando validações do contexto (cache)`);
    }
    
    if (!agendamentoEnabled) {
      return false;
    }
    
    if (!canAgendar) {
      await sendMessage(
        companyId,
        chatId,
        'Olá! O agendamento pelo WhatsApp está disponível apenas para clientes cadastrados. Por favor, entre em contato conosco para se cadastrar.'
      );
      return true;
    }
    
    // Verificar se passou um dia desde a última atualização
    const agora = DateTime.now().setZone('America/Sao_Paulo');
    const updatedAtDate = toDate(context.updatedAt);
    const createdAtDate = toDate(context.createdAt);
    const ultimaAtualizacao = updatedAtDate
      ? DateTime.fromJSDate(updatedAtDate).setZone('America/Sao_Paulo')
      : createdAtDate
      ? DateTime.fromJSDate(createdAtDate).setZone('America/Sao_Paulo')
      : null;
    
    const passouUmDia = ultimaAtualizacao 
      ? agora.startOf('day') > ultimaAtualizacao.startOf('day')
      : false;
    
    // Se passou um dia, resetar contexto e mostrar menu inicial (mesmo em modo manual)
    if (passouUmDia) {
      console.log(`[WhatsApp Agendamento] Passou um dia desde última interação, resetando contexto para ${chatId}`);
      await resetAgendamentoContext(companyId, chatId);
      await sendMessage(
        companyId,
        chatId,
        addSairOption(`Olá! 👋\n\nComo posso ajudá-lo hoje?\n\n1️⃣ *Agendar consulta*\n2️⃣ *Consultar meu agendamento*\n3️⃣ *Falar com atendente*\n\nDigite o número da opção desejada.`)
      );
      await updateAgendamentoContext(companyId, chatId, { state: 'agendar_ou_consultar' });
      return true;
    }
    
    // Se está em modo manual, verificar se o usuário quer voltar ao menu automático
    if (context.state === 'manual_mode') {
      const text = messageText.trim().toLowerCase();
      // Palavras-chave para voltar ao menu automático
      const voltarKeywords = ['voltar', 'menu', 'agendar', 'agendamento', 'inicio', 'começar', 'novo', '1', '2', '3'];
      const querVoltar = voltarKeywords.some(keyword => text.includes(keyword));
      
      if (querVoltar) {
        // Resetar contexto e mostrar menu novamente
        await resetAgendamentoContext(companyId, chatId);
        await sendMessage(
          companyId,
          chatId,
          addSairOption(`Olá! 👋\n\nComo posso ajudá-lo hoje?\n\n1️⃣ *Agendar consulta*\n2️⃣ *Consultar meu agendamento*\n3️⃣ *Falar com atendente*\n\nDigite o número da opção desejada.`)
        );
        await updateAgendamentoContext(companyId, chatId, { state: 'agendar_ou_consultar' });
        return true;
      }
      
      // Se não quer voltar, continuar em modo manual (não processar)
      return false;
    }
    
    // Se é a primeira mensagem ou estado inicial, enviar pergunta inicial
    if (context.state === 'initial') {
      console.log(`[WhatsApp Agendamento] [${chatId}] Estado inicial, enviando menu...`);
      // Aguardar um pouco para garantir que o feedback foi processado antes de enviar as opções
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const messageStart = Date.now();
      await sendMessage(
        companyId,
        chatId,
        addSairOption(`Olá! 👋\n\nComo posso ajudá-lo hoje?\n\n1. *Agendar consulta*\n2. *Consultar meu agendamento*\n3. *Falar com atendente*\n\nDigite o número da opção desejada.`)
      );
      console.log(`[WhatsApp Agendamento] [${chatId}] Mensagem do menu enviada em ${Date.now() - messageStart}ms`);
      
      const updateStart = Date.now();
      await updateAgendamentoContext(companyId, chatId, { state: 'agendar_ou_consultar' });
      console.log(`[WhatsApp Agendamento] [${chatId}] Contexto atualizado em ${Date.now() - updateStart}ms`);
      console.log(`[WhatsApp Agendamento] [${chatId}] handleInitialMessage FIM (menu enviado) - ${Date.now() - startTime}ms total`);
      return true;
    }
    
    console.log(`[WhatsApp Agendamento] [${chatId}] handleInitialMessage FIM (não processado) - ${Date.now() - startTime}ms total`);
    return false;
  } catch (error) {
    console.error(`[WhatsApp Agendamento] [${chatId}] Erro ao processar mensagem inicial:`, error);
    console.log(`[WhatsApp Agendamento] [${chatId}] handleInitialMessage FIM (erro) - ${Date.now() - startTime}ms total`);
    return false;
  }
}

/**
 * Processa mensagens durante o fluxo de agendamento
 */
export async function processAgendamentoMessage(
  companyId: string,
  chatId: string,
  messageText: string
): Promise<boolean> {
  try {
    const context = await getAgendamentoContext(companyId, chatId);
    if (!context) {
      return false;
    }
    
    // Usar validações salvas no contexto (já foram validadas em handleInitialMessage)
    if (context.agendamentoEnabled === false || context.canAgendar === false) {
      return false;
    }
    
    // Se não estão salvas, verificar (caso não tenha passado por handleInitialMessage)
    if (context.agendamentoEnabled === undefined) {
      const settings = await getCompanySettings(companyId);
      const agendamentoEnabled = settings.agendamentoWhatsappHabilitado === true;
      
      if (!agendamentoEnabled) {
        await updateAgendamentoContext(companyId, chatId, { agendamentoEnabled: false });
        return false;
      }
      
      let canAgendar = true;
      if (settings.agendamentoWhatsappApenasContatos) {
        const patientId = await findPatientByPhone(companyId, chatId);
        canAgendar = patientId !== null;
      }
      
      await updateAgendamentoContext(companyId, chatId, { 
        agendamentoEnabled: true,
        canAgendar 
      });
      
      if (!canAgendar) {
        return false;
      }
    }
    
    // Verificar se passou um dia desde a última atualização
    const agora = DateTime.now().setZone('America/Sao_Paulo');
    const updatedAtDate = toDate(context.updatedAt);
    const createdAtDate = toDate(context.createdAt);
    const ultimaAtualizacao = updatedAtDate
      ? DateTime.fromJSDate(updatedAtDate).setZone('America/Sao_Paulo')
      : createdAtDate
      ? DateTime.fromJSDate(createdAtDate).setZone('America/Sao_Paulo')
      : null;
    
    const passouUmDia = ultimaAtualizacao 
      ? agora.startOf('day') > ultimaAtualizacao.startOf('day')
      : false;
    
    // Se passou um dia, resetar contexto e mostrar menu inicial (mesmo em modo manual)
    if (passouUmDia) {
      console.log(`[WhatsApp Agendamento] Passou um dia desde última interação, resetando contexto para ${chatId}`);
      await resetAgendamentoContext(companyId, chatId);
      await sendMessage(
        companyId,
        chatId,
        addSairOption(`Olá! 👋\n\nComo posso ajudá-lo hoje?\n\n1️⃣ *Agendar consulta*\n2️⃣ *Consultar meu agendamento*\n3️⃣ *Falar com atendente*\n\nDigite o número da opção desejada.`)
      );
      await updateAgendamentoContext(companyId, chatId, { state: 'agendar_ou_consultar' });
      return true;
    }
    
    // Se está em modo manual, verificar se o usuário quer voltar ao menu automático
    if (context.state === 'manual_mode') {
      const text = messageText.trim().toLowerCase();
      // Palavras-chave para voltar ao menu automático
      const voltarKeywords = ['voltar', 'menu', 'agendar', 'agendamento', 'inicio', 'começar', 'novo', '1', '2', '3'];
      const querVoltar = voltarKeywords.some(keyword => text.includes(keyword));
      
      if (querVoltar) {
        // Resetar contexto e mostrar menu novamente
        await resetAgendamentoContext(companyId, chatId);
        await sendMessage(
          companyId,
          chatId,
          addSairOption(`Olá! 👋\n\nComo posso ajudá-lo hoje?\n\n1️⃣ *Agendar consulta*\n2️⃣ *Consultar meu agendamento*\n3️⃣ *Falar com atendente*\n\nDigite o número da opção desejada.`)
        );
        await updateAgendamentoContext(companyId, chatId, { state: 'agendar_ou_consultar' });
        return true;
      }
      
      // Se não quer voltar, continuar em modo manual (não processar)
      return false;
    }
    
    const text = messageText.trim().toLowerCase();
    
    // Processar de acordo com o estado atual
    switch (context.state) {
      case 'agendar_ou_consultar':
        return await handleAgendarOuConsultar(companyId, chatId, text, context);
      
      case 'selecionar_profissional':
        return await handleSelecionarProfissional(companyId, chatId, text, context);
      
      case 'selecionar_servico':
        return await handleSelecionarServico(companyId, chatId, text, context);
      
      case 'selecionar_data':
        return await handleSelecionarData(companyId, chatId, text, context);
      
      case 'selecionar_horario':
        return await handleSelecionarHorario(companyId, chatId, text, context);
      
      case 'confirmar_agendamento':
        return await handleConfirmarAgendamento(companyId, chatId, text, context);
      
      case 'consultar_agendamento':
        return await handleConsultarAgendamento(companyId, chatId, text, context);
      
      case 'solicitar_nome_paciente':
        return await handleSolicitarNomePaciente(companyId, chatId, text, context);
      
      default:
        return false;
    }
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao processar mensagem:', error);
    return false;
  }
}

/**
 * Processa escolha inicial: agendar, consultar ou falar com atendente
 */
async function handleAgendarOuConsultar(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  if (text === '1' || text.includes('agendar') || text.includes('1️⃣')) {
    // Enviar feedback
    await sendMessage(companyId, chatId, '⏳ Buscando profissionais disponíveis...');
    
    // Buscar profissionais
    const professionalsRef = db.collection(`companies/${companyId}/professionals`);
    const professionalsSnapshot = await professionalsRef
      .where('ativo', '==', true)
      .get();
    
    if (professionalsSnapshot.empty) {
      await sendMessage(
        companyId,
        chatId,
        addSairOption('Desculpe, não há profissionais disponíveis no momento. Por favor, entre em contato conosco.')
      );
      await resetAgendamentoContext(companyId, chatId);
      return true;
    }
    
    const professionals = professionalsSnapshot.docs.map((doc, index) => ({
      id: doc.id,
      nome: doc.data().apelido || 'Profissional',
      index: index + 1,
    }));
    
    let message = 'Por favor, escolha o profissional:\n\n';
    professionals.forEach((prof) => {
      message += `${formatNumberOption(prof.index)} ${prof.nome}\n`;
    });
    
    await sendMessage(companyId, chatId, addSairOption(message));
    await updateAgendamentoContext(companyId, chatId, { 
      state: 'selecionar_profissional',
      // Salvar lista de profissionais no contexto (temporariamente)
    });
    return true;
  }
  
  if (text === '2' || text.includes('consultar') || text.includes('2️⃣')) {
    return await handleConsultarAgendamento(companyId, chatId, '', context);
  }
  
  if (text === '3' || text.includes('atendente') || text.includes('falar') || text.includes('3️⃣')) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Você será atendido por um de nossos atendentes em breve. Aguarde um momento, por favor.\n\n💡 *Dica:* Digite "voltar", "menu" ou "agendar" a qualquer momento para retornar ao menu automático.')
    );
    await updateAgendamentoContext(companyId, chatId, { state: 'manual_mode' });
    return true;
  }
  
  // Se não reconheceu, pedir novamente
  await sendMessage(
    companyId,
    chatId,
    addSairOption('Por favor, escolha uma das opções:\n\n1️⃣ Agendar consulta\n2️⃣ Consultar meu agendamento\n3️⃣ Falar com atendente\n\nDigite o número da opção.')
  );
  return true;
}

/**
 * Processa seleção de profissional
 */
async function handleSelecionarProfissional(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  // Buscar profissionais novamente
  const professionalsRef = db.collection(`companies/${companyId}/professionals`);
  const professionalsSnapshot = await professionalsRef
    .where('ativo', '==', true)
    .get();
  
  if (professionalsSnapshot.empty) {
    await sendMessage(
      companyId,
      chatId,
      'Desculpe, não há profissionais disponíveis. Voltando ao menu inicial...'
    );
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  const professionals = professionalsSnapshot.docs.map((doc, index) => ({
    id: doc.id,
    nome: doc.data().apelido || 'Profissional',
    index: index + 1,
  }));
  
  // Tentar encontrar por número ou nome
  const selectedIndex = parseInt(text);
  let selectedProfessional = null;
  
  if (!isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= professionals.length) {
    selectedProfessional = professionals[selectedIndex - 1];
  } else {
    // Tentar encontrar por nome
    const found = professionals.find(p => 
      p.nome.toLowerCase().includes(text) || text.includes(p.nome.toLowerCase())
    );
    if (found) {
      selectedProfessional = found;
    }
  }
  
  if (!selectedProfessional) {
    let message = 'Profissional não encontrado. Por favor, escolha um dos profissionais:\n\n';
    professionals.forEach((prof) => {
      message += `${formatNumberOption(prof.index)} ${prof.nome}\n`;
    });
    await sendMessage(companyId, chatId, addSairOption(message));
    return true;
  }
  
  // Enviar feedback
  await sendMessage(companyId, chatId, '⏳ Buscando serviços disponíveis...');
  
  // Buscar serviços disponíveis
  const settings = await getCompanySettings(companyId);
  const servicosIds = settings.agendamentoWhatsappServicosIds || [];
  
  const servicesRef = db.collection(`companies/${companyId}/services`);
  let servicesQuery = servicesRef.where('ativo', '==', true);
  
  // Se há serviços específicos configurados, filtrar por eles
  if (servicosIds.length > 0) {
    // Firestore não suporta 'in' com mais de 10 itens, então vamos buscar todos e filtrar
    const allServicesSnapshot = await servicesQuery.get();
    const filteredServices = allServicesSnapshot.docs
      .filter(doc => servicosIds.includes(doc.id))
      .map((doc, index) => ({
        id: doc.id,
        nome: doc.data().nome,
        duracaoMin: doc.data().duracaoMin || 60,
        precoCentavos: doc.data().precoCentavos || 0,
        index: index + 1,
      }));
    
    if (filteredServices.length === 0) {
      await sendMessage(
        companyId,
        chatId,
        addSairOption('Desculpe, não há serviços disponíveis para agendamento no momento.')
      );
      await resetAgendamentoContext(companyId, chatId);
      return true;
    }
    
    let message = `Profissional selecionado: *${selectedProfessional.nome}*\n\nAgora, escolha o serviço:\n\n`;
    filteredServices.forEach((service) => {
      const preco = (service.precoCentavos / 100).toFixed(2);
      message += `${formatNumberOption(service.index)} ${service.nome} - R$ ${preco} (${service.duracaoMin} min)\n`;
    });
    
    await sendMessage(companyId, chatId, addSairOption(message));
    await updateAgendamentoContext(companyId, chatId, {
      state: 'selecionar_servico',
      professionalId: selectedProfessional.id,
    });
    return true;
  } else {
    // Todos os serviços ativos estão disponíveis
    const allServicesSnapshot = await servicesQuery.get();
    const services = allServicesSnapshot.docs.map((doc, index) => ({
      id: doc.id,
      nome: doc.data().nome,
      duracaoMin: doc.data().duracaoMin || 60,
      precoCentavos: doc.data().precoCentavos || 0,
      index: index + 1,
    }));
    
    if (services.length === 0) {
      await sendMessage(
        companyId,
        chatId,
        addSairOption('Desculpe, não há serviços disponíveis para agendamento no momento.')
      );
      await resetAgendamentoContext(companyId, chatId);
      return true;
    }
    
    let message = `Profissional selecionado: *${selectedProfessional.nome}*\n\nAgora, escolha o serviço:\n\n`;
    services.forEach((service) => {
      const preco = (service.precoCentavos / 100).toFixed(2);
      message += `${formatNumberOption(service.index)} ${service.nome} - R$ ${preco} (${service.duracaoMin} min)\n`;
    });
    
    await sendMessage(companyId, chatId, addSairOption(message));
    await updateAgendamentoContext(companyId, chatId, {
      state: 'selecionar_servico',
      professionalId: selectedProfessional.id,
    });
    return true;
  }
}

/**
 * Processa seleção de serviço
 */
async function handleSelecionarServico(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  if (!context.professionalId) {
    await sendMessage(companyId, chatId, 'Erro: Profissional não selecionado. Voltando ao início...');
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  // Buscar serviços disponíveis
  const settings = await getCompanySettings(companyId);
  const servicosIds = settings.agendamentoWhatsappServicosIds || [];
  
  const servicesRef = db.collection(`companies/${companyId}/services`);
  let servicesQuery = servicesRef.where('ativo', '==', true);
  
  let services: Array<{ id: string; nome: string; index: number }> = [];
  
  if (servicosIds.length > 0) {
    const allServicesSnapshot = await servicesQuery.get();
    services = allServicesSnapshot.docs
      .filter(doc => servicosIds.includes(doc.id))
      .map((doc, index) => ({
        id: doc.id,
        nome: doc.data().nome,
        index: index + 1,
      }));
  } else {
    const allServicesSnapshot = await servicesQuery.get();
    services = allServicesSnapshot.docs.map((doc, index) => ({
      id: doc.id,
      nome: doc.data().nome,
      index: index + 1,
    }));
  }
  
  // Tentar encontrar serviço
  const selectedIndex = parseInt(text);
  let selectedService = null;
  
  if (!isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= services.length) {
    selectedService = services[selectedIndex - 1];
  } else {
    const found = services.find(s => 
      s.nome.toLowerCase().includes(text) || text.includes(s.nome.toLowerCase())
    );
    if (found) {
      selectedService = found;
    }
  }
  
  if (!selectedService) {
    let message = 'Serviço não encontrado. Por favor, escolha um dos serviços:\n\n';
    services.forEach((service) => {
      message += `${formatNumberOption(service.index)} ${service.nome}\n`;
    });
    await sendMessage(companyId, chatId, addSairOption(message));
    return true;
  }
  
  // Pedir data (sem feedback, pois não há operação demorada aqui)
  const hoje = DateTime.now().setZone('America/Sao_Paulo');
  const proximos30Dias: string[] = [];
  
  for (let i = 0; i < 30; i++) {
    const data = hoje.plus({ days: i });
    proximos30Dias.push(data.toFormat('yyyy-MM-dd'));
  }
  
  let message = `Serviço selecionado: *${selectedService.nome}*\n\nPor favor, escolha uma data:\n\n`;
  message += 'Digite a data no formato DD/MM/AAAA (ex: 25/12/2024)\n';
  message += `ou digite "hoje" para hoje (${hoje.toFormat('dd/MM/yyyy')})\n`;
  message += `ou "amanhã" para amanhã (${hoje.plus({ days: 1 }).toFormat('dd/MM/yyyy')})`;
  
  await sendMessage(companyId, chatId, addSairOption(message));
  await updateAgendamentoContext(companyId, chatId, {
    state: 'selecionar_data',
    serviceIds: [selectedService.id],
  });
  return true;
}

/**
 * Processa seleção de data
 */
async function handleSelecionarData(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  // Enviar feedback
  await sendMessage(companyId, chatId, '⏳ Verificando horários disponíveis para a data selecionada...');
  
  if (!context.professionalId || !context.serviceIds || context.serviceIds.length === 0) {
    await sendMessage(companyId, chatId, 'Erro: Dados incompletos. Voltando ao início...');
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  const hoje = DateTime.now().setZone('America/Sao_Paulo');
  let selectedDate: DateTime | null = null;
  
  // Processar diferentes formatos de data
  if (text === 'hoje' || text.includes('hoje')) {
    selectedDate = hoje;
  } else if (text === 'amanhã' || text.includes('amanhã') || text.includes('amanha')) {
    selectedDate = hoje.plus({ days: 1 });
  } else {
    // Tentar parsear DD/MM/YYYY ou DD-MM-YYYY
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      selectedDate = DateTime.fromObject({
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
      }, { zone: 'America/Sao_Paulo' });
    }
  }
  
  if (!selectedDate || !selectedDate.isValid) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Data inválida. Por favor, digite a data no formato DD/MM/AAAA (ex: 25/12/2024), "hoje" ou "amanhã".')
    );
    return true;
  }
  
  // Verificar se a data não é no passado
  if (selectedDate.startOf('day') < hoje.startOf('day')) {
    await sendMessage(companyId, chatId, addSairOption('Não é possível agendar para datas passadas. Por favor, escolha uma data futura.'));
    return true;
  }
  
  // Verificar se não está muito longe (ex: máximo 90 dias)
  const maxDate = hoje.plus({ days: 90 });
  if (selectedDate > maxDate) {
    await sendMessage(companyId, chatId, addSairOption('Não é possível agendar com mais de 90 dias de antecedência. Por favor, escolha uma data mais próxima.'));
    return true;
  }
  
  // Buscar horários disponíveis para esta data (com duração dos serviços)
  const horariosDisponiveis = await getHorariosDisponiveis(
    companyId,
    context.professionalId!,
    selectedDate.toFormat('yyyy-MM-dd'),
    context.serviceIds
  );
  
  if (horariosDisponiveis.length === 0) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption(`Não há horários disponíveis para ${selectedDate.toFormat('dd/MM/yyyy')}. Por favor, escolha outra data.`)
    );
    return true;
  }
  
  let message = `Data selecionada: *${selectedDate.toFormat('dd/MM/yyyy')}*\n\nHorários disponíveis:\n\n`;
  horariosDisponiveis.forEach((horario, index) => {
    message += `${formatNumberOption(index + 1)} ${horario.inicio} às ${horario.fim}\n`;
  });
  message += '\nDigite o número do horário desejado.';
  
  await sendMessage(companyId, chatId, addSairOption(message));
  await updateAgendamentoContext(companyId, chatId, {
    state: 'selecionar_horario',
    selectedDate: selectedDate.toFormat('yyyy-MM-dd'),
  });
  return true;
}

/**
 * Processa seleção de horário
 */
async function handleSelecionarHorario(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  // Enviar feedback
  await sendMessage(companyId, chatId, '⏳ Verificando disponibilidade do horário...');
  
  if (!context.professionalId || !context.serviceIds || !context.selectedDate) {
    await sendMessage(companyId, chatId, 'Erro: Dados incompletos. Voltando ao início...');
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  // Buscar horários disponíveis novamente (com duração dos serviços)
  const horariosDisponiveis = await getHorariosDisponiveis(
    companyId,
    context.professionalId,
    context.selectedDate,
    context.serviceIds
  );
  
  if (horariosDisponiveis.length === 0) {
    await sendMessage(companyId, chatId, addSairOption('Não há horários disponíveis. Voltando à seleção de data...'));
    await updateAgendamentoContext(companyId, chatId, { state: 'selecionar_data' });
    return true;
  }
  
  // Tentar encontrar horário
  const selectedIndex = parseInt(text);
  let selectedHorario: HorarioDisponivel | null = null;
  
  if (!isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= horariosDisponiveis.length) {
    selectedHorario = horariosDisponiveis[selectedIndex - 1];
  } else {
    // Tentar encontrar por texto (ex: "08:00" ou "8h")
    const timeMatch = text.match(/(\d{1,2})[:h](\d{2})?/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      selectedHorario = horariosDisponiveis.find(h => h.inicio === timeStr) || null;
    }
  }
  
  if (!selectedHorario) {
    let message = 'Horário não encontrado. Por favor, escolha um dos horários:\n\n';
    horariosDisponiveis.forEach((horario, index) => {
      message += `${formatNumberOption(index + 1)} ${horario.inicio} às ${horario.fim}\n`;
    });
    await sendMessage(companyId, chatId, addSairOption(message));
    return true;
  }
  
  // Verificar conflitos
  const hasConflict = await verificarConflitoAgendamento(
    companyId,
    context.professionalId,
    context.selectedDate,
    selectedHorario.inicio,
    selectedHorario.fim
  );
  
  if (hasConflict) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Este horário não está mais disponível. Por favor, escolha outro horário.')
    );
    // Mostrar horários novamente
    let message = 'Horários disponíveis:\n\n';
    horariosDisponiveis.forEach((horario, index) => {
      message += `${formatNumberOption(index + 1)} ${horario.inicio} às ${horario.fim}\n`;
    });
    await sendMessage(companyId, chatId, addSairOption(message));
    return true;
  }
  
  // Buscar informações para confirmação
  const professionalDoc = await db.collection(`companies/${companyId}/professionals`).doc(context.professionalId).get();
  const professionalName = professionalDoc.data()?.apelido || 'Profissional';
  
  const services: string[] = [];
  let totalPrice = 0;
  
  for (const serviceId of context.serviceIds) {
    const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(serviceId).get();
    if (serviceDoc.exists) {
      const serviceData = serviceDoc.data()!;
      services.push(serviceData.nome);
      totalPrice += serviceData.precoCentavos || 0;
    }
  }
  
  const dateObj = DateTime.fromFormat(context.selectedDate, 'yyyy-MM-dd', { zone: 'America/Sao_Paulo' });
  
  let message = `*Confirme os dados do agendamento:*\n\n`;
  message += `👤 Profissional: ${professionalName}\n`;
  message += `📋 Serviço(s): ${services.join(', ')}\n`;
  message += `📅 Data: ${dateObj.toFormat('dd/MM/yyyy')}\n`;
  message += `🕐 Horário: ${selectedHorario.inicio} às ${selectedHorario.fim}\n`;
  message += `💰 Valor: R$ ${(totalPrice / 100).toFixed(2)}\n\n`;
  message += `Digite *CONFIRMAR* para confirmar o agendamento ou *CANCELAR* para cancelar.`;
  
  await sendMessage(companyId, chatId, addSairOption(message));
  await updateAgendamentoContext(companyId, chatId, {
    state: 'confirmar_agendamento',
    selectedTime: selectedHorario.inicio,
  });
  return true;
}

/**
 * Processa confirmação de agendamento
 */
async function handleConfirmarAgendamento(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  const textUpper = text.toUpperCase().trim();
  
  // Se for confirmar, enviar feedback antes de processar
  if (textUpper.includes('CONFIRMAR') || textUpper.includes('CONFIRM')) {
    await sendMessage(companyId, chatId, '⏳ Processando seu agendamento...');
  }
  
  if (textUpper.includes('CANCELAR') || textUpper.includes('CANCEL')) {
    await sendMessage(companyId, chatId, 'Agendamento cancelado. Obrigado!');
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  if (!textUpper.includes('CONFIRMAR') && !textUpper.includes('CONFIRM')) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Por favor, digite *CONFIRMAR* para confirmar o agendamento ou *CANCELAR* para cancelar.')
    );
    return true;
  }
  
  if (!context.professionalId || !context.serviceIds || !context.selectedDate || !context.selectedTime) {
    await sendMessage(companyId, chatId, 'Erro: Dados incompletos. Voltando ao início...');
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  // Buscar ou criar paciente
  let patientId = context.patientId;
  if (!patientId) {
    patientId = await findPatientByPhone(companyId, chatId) || undefined;
    
    // Se não encontrou e a opção "apenas contatos" está ativa, não pode criar
    const settings = await getCompanySettings(companyId);
    if (!patientId && settings.agendamentoWhatsappApenasContatos) {
      await sendMessage(
        companyId,
        chatId,
        'Você precisa estar cadastrado para agendar. Por favor, entre em contato conosco para se cadastrar.'
      );
      await resetAgendamentoContext(companyId, chatId);
      return true;
    }
    
    // Se não encontrou mas pode criar, solicitar nome primeiro
    if (!patientId) {
      await sendMessage(
        companyId,
        chatId,
        addSairOption('Para finalizar o agendamento, precisamos do seu nome para criar seu cadastro.\n\nPor favor, digite seu nome completo:')
      );
      await updateAgendamentoContext(companyId, chatId, { 
        state: 'solicitar_nome_paciente',
        // Manter dados do agendamento para continuar depois
      });
      return true;
    }
  }
  
  // Calcular data/hora de início e fim
  const dateObj = DateTime.fromFormat(context.selectedDate, 'yyyy-MM-dd', { zone: 'America/Sao_Paulo' });
  const [hour, minute] = context.selectedTime.split(':').map(Number);
  const inicio = dateObj.set({ hour, minute, second: 0, millisecond: 0 });
  
  // Calcular duração total dos serviços
  let totalDuration = 0;
  for (const serviceId of context.serviceIds) {
    const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(serviceId).get();
    if (serviceDoc.exists) {
      totalDuration += serviceDoc.data()?.duracaoMin || 60;
    }
  }
  
  const fim = inicio.plus({ minutes: totalDuration });
  
  // Calcular preço total
  let totalPrice = 0;
  for (const serviceId of context.serviceIds) {
    const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(serviceId).get();
    if (serviceDoc.exists) {
      totalPrice += serviceDoc.data()?.precoCentavos || 0;
    }
  }
  
  // Verificar conflito uma última vez
  const hasConflict = await verificarConflitoAgendamento(
    companyId,
    context.professionalId,
    context.selectedDate,
    context.selectedTime,
    fim.toFormat('HH:mm')
  );
  
  if (hasConflict) {
    await sendMessage(
      companyId,
      chatId,
      'Este horário não está mais disponível. Por favor, inicie um novo agendamento.'
    );
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  // Criar agendamento
  try {
    const appointmentsRef = db.collection(`companies/${companyId}/appointments`);
    const newAppointment = {
      companyId,
      professionalId: context.professionalId,
      clientId: patientId!,
      serviceId: context.serviceIds[0], // Primeiro serviço (compatibilidade)
      serviceIds: context.serviceIds,
      inicio: admin.firestore.Timestamp.fromDate(inicio.toJSDate()),
      fim: admin.firestore.Timestamp.fromDate(fim.toJSDate()),
      precoCentavos: totalPrice,
      comissaoPercent: 0, // Será calculado depois
      status: 'agendado',
      observacoes: 'Agendamento criado via WhatsApp',
      criadoViaWhatsapp: true, // Label para identificar agendamentos criados pelo cliente via WhatsApp
      createdByUid: '', // Sistema
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const appointmentDocRef = await appointmentsRef.add(newAppointment);
    const appointmentId = appointmentDocRef.id;
    
    // Buscar dados necessários para o webhook
    const [companyDoc, professionalDoc, clientDoc, settingsDoc, ...serviceDocs] = await Promise.all([
      db.collection('companies').doc(companyId).get(),
      db.collection(`companies/${companyId}/professionals`).doc(context.professionalId).get(),
      db.collection(`companies/${companyId}/patients`).doc(patientId).get(),
      db.collection(`companies/${companyId}/settings`).doc('general').get(),
      ...context.serviceIds.map((serviceId: string) => 
        db.collection(`companies/${companyId}/services`).doc(serviceId).get()
      )
    ]);
    
    const company = companyDoc.data();
    const professional = professionalDoc.data();
    const client = clientDoc.data();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;
    const services = serviceDocs
      .map(doc => doc.exists ? doc.data() : null)
      .filter((service): service is any => service !== null);
    
    if (company && professional && client && services.length > 0) {
      // Calcular duração em segundos
      const durationMs = fim.toJSDate().getTime() - inicio.toJSDate().getTime();
      const seanceLength = Math.round(durationMs / 1000);
      
      // Formatar data no padrão ISO com timezone -03:00
      const offsetMinutes = -180; // America/Sao_Paulo UTC-03:00
      const localForIso = new Date(inicio.toJSDate().getTime() + offsetMinutes * 60 * 1000);
      const isoNoZ = localForIso.toISOString().slice(0, 19);
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const abs = Math.abs(offsetMinutes);
      const hh = String(Math.floor(abs / 60)).padStart(2, '0');
      const mm = String(abs % 60).padStart(2, '0');
      const datetime = `${isoNoZ}${sign}${hh}:${mm}`;
      
      // Montar endereço
      const computedAddress = company.endereco ?
        `${company.endereco.rua}, ${company.endereco.numero}. ${company.endereco.bairro}/${company.endereco.estado}` : '';
      
      // Montar webhook data
      const webhookData: WebHookAgendamentoRequest = {
        resource_id: appointmentId,
        resource: 'record',
        status: 'create',
        enviarNotificacao: true,
        companyId,
        data: {
          seance_length: seanceLength,
          company_name: settings?.nomeSalao || company.nome || 'Empresa',
          company_adress: settings?.enderecoSalao || computedAddress,
          company_phone: settings?.telefoneSalao || company.telefone || '',
          staff: professional.apelido || 'Profissional',
          services: services.map(s => ({ title: s.nome || 'Serviço' })),
          client: {
            name: client.nome || 'Cliente',
            phone: client.telefoneE164 || ''
          },
          datetime: datetime
        }
      };
      
      // Chamar webhook para enviar notificação
      try {
        console.log('[WhatsApp Agendamento] Enviando webhook de agendamento criado via WhatsApp');
        await handleWebhookAgendamento(webhookData, undefined, companyId);
        console.log('[WhatsApp Agendamento] Webhook enviado com sucesso');
      } catch (webhookError) {
        console.error('[WhatsApp Agendamento] Erro ao enviar webhook (não crítico):', webhookError);
        // Não falhar o agendamento se o webhook falhar
      }
    }
    
    // Não enviar mensagem de confirmação aqui, pois o callAltegioWebhook já envia
    // Apenas resetar o contexto
    await resetAgendamentoContext(companyId, chatId);
    return true;
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao criar agendamento:', error);
    await sendMessage(
      companyId,
      chatId,
      'Desculpe, ocorreu um erro ao criar o agendamento. Por favor, tente novamente ou entre em contato conosco.'
    );
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
}

/**
 * Processa consulta de agendamentos
 */
async function handleConsultarAgendamento(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  // Enviar feedback
  await sendMessage(companyId, chatId, '⏳ Consultando seus agendamentos...');
  
  // Buscar paciente pelo telefone
  const patientId = await findPatientByPhone(companyId, chatId);
  
  if (!patientId) {
    // Se não encontrou paciente, solicitar nome para criar
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Não encontramos seu cadastro em nosso sistema.\n\nPara consultar seus agendamentos, precisamos do seu nome para criar seu cadastro.\n\nPor favor, digite seu nome completo:')
    );
    await updateAgendamentoContext(companyId, chatId, { state: 'solicitar_nome_paciente' });
    return true;
  }
  
  // Buscar agendamentos futuros do paciente
  const agora = admin.firestore.Timestamp.now();
  const appointmentsRef = db.collection(`companies/${companyId}/appointments`);
  const appointmentsSnapshot = await appointmentsRef
    .where('clientId', '==', patientId)
    .where('inicio', '>=', agora)
    .where('status', 'in', ['agendado', 'confirmado'])
    .orderBy('inicio', 'asc')
    .limit(10)
    .get();
  
  if (appointmentsSnapshot.empty) {
    await sendMessage(
      companyId,
      chatId,
      'Você não possui agendamentos futuros no momento.'
    );
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
  
  let message = '*Seus agendamentos:*\n\n';
  
  for (const appointmentDoc of appointmentsSnapshot.docs) {
    const appointment = appointmentDoc.data();
    const inicio = appointment.inicio.toDate();
    const dateFormatted = DateTime.fromJSDate(inicio).setZone('America/Sao_Paulo').toFormat('dd/MM/yyyy');
    const timeFormatted = DateTime.fromJSDate(inicio).setZone('America/Sao_Paulo').toFormat('HH:mm');
    
    const professionalDoc = await db.collection(`companies/${companyId}/professionals`).doc(appointment.professionalId).get();
    const professionalName = professionalDoc.data()?.apelido || 'Profissional';
    
    const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(appointment.serviceId).get();
    const serviceName = serviceDoc.data()?.nome || 'Serviço';
    
    message += `📅 ${dateFormatted} às ${timeFormatted}\n`;
    message += `👤 ${professionalName}\n`;
    message += `📋 ${serviceName}\n`;
    message += `Status: ${appointment.status === 'confirmado' ? '✅ Confirmado' : '⏳ Agendado'}\n\n`;
  }
  
  await sendMessage(companyId, chatId, message);
  await resetAgendamentoContext(companyId, chatId);
  return true;
}

/**
 * Processa solicitação de nome do paciente
 */
async function handleSolicitarNomePaciente(
  companyId: string,
  chatId: string,
  text: string,
  context: AgendamentoContext
): Promise<boolean> {
  // Verificar se quer sair
  if (isSairCommand(text)) {
    return await handleSairCommand(companyId, chatId);
  }
  
  // Enviar feedback
  await sendMessage(companyId, chatId, '⏳ Criando seu cadastro...');
  
  const nome = text.trim();
  
  if (!nome || nome.length < 2) {
    await sendMessage(
      companyId,
      chatId,
      addSairOption('Por favor, digite um nome válido (mínimo 2 caracteres).')
    );
    return true;
  }
  
  // Criar paciente com label de WhatsApp
  try {
    const patientsRef = db.collection(`companies/${companyId}/patients`);
    const newPatientRef = await patientsRef.add({
      nome: nome,
      telefoneE164: normalizePhoneForContact(chatId),
      preferenciaNotificacao: 'whatsapp',
      ownerUid: '', // Será atualizado depois
      companyId,
      criadoViaWhatsapp: true, // Label para identificar pacientes criados via WhatsApp
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    const patientId = newPatientRef.id;
    
    // Verificar se estava em processo de agendamento
    if (context.professionalId && context.serviceIds && context.selectedDate && context.selectedTime) {
      // Continuar com a confirmação do agendamento
      await updateAgendamentoContext(companyId, chatId, { 
        patientId,
        patientName: nome,
        state: 'confirmar_agendamento',
      });
      
      // Buscar informações para confirmação
      const professionalDoc = await db.collection(`companies/${companyId}/professionals`).doc(context.professionalId).get();
      const professionalName = professionalDoc.data()?.apelido || 'Profissional';
      
      const services: string[] = [];
      let totalPrice = 0;
      
      for (const serviceId of context.serviceIds) {
        const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(serviceId).get();
        if (serviceDoc.exists) {
          const serviceData = serviceDoc.data()!;
          services.push(serviceData.nome);
          totalPrice += serviceData.precoCentavos || 0;
        }
      }
      
      const dateObj = DateTime.fromFormat(context.selectedDate, 'yyyy-MM-dd', { zone: 'America/Sao_Paulo' });
      
      let message = `✅ Cadastro criado com sucesso, ${nome}!\n\n`;
      message += `*Confirme os dados do agendamento:*\n\n`;
      message += `👤 Profissional: ${professionalName}\n`;
      message += `📋 Serviço(s): ${services.join(', ')}\n`;
      message += `📅 Data: ${dateObj.toFormat('dd/MM/yyyy')}\n`;
      message += `🕐 Horário: ${context.selectedTime}\n`;
      message += `💰 Valor: R$ ${(totalPrice / 100).toFixed(2)}\n\n`;
      message += `Digite *CONFIRMAR* para confirmar o agendamento ou *CANCELAR* para cancelar.`;
      
      await sendMessage(companyId, chatId, addSairOption(message));
      return true;
    }
    
    // Se não estava em processo de agendamento, mostrar agendamentos ou menu
    await sendMessage(
      companyId,
      chatId,
      addSairOption(`✅ Cadastro criado com sucesso, ${nome}!\n\nAgora você pode consultar seus agendamentos ou criar um novo agendamento.`)
    );
    
    // Buscar agendamentos futuros
    const agora = admin.firestore.Timestamp.now();
    const appointmentsRef = db.collection(`companies/${companyId}/appointments`);
    const appointmentsSnapshot = await appointmentsRef
      .where('clientId', '==', patientId)
      .where('inicio', '>=', agora)
      .where('status', 'in', ['agendado', 'confirmado'])
      .orderBy('inicio', 'asc')
      .limit(10)
      .get();
    
    if (appointmentsSnapshot.empty) {
      await sendMessage(
        companyId,
        chatId,
        addSairOption('Você não possui agendamentos futuros no momento.\n\nDeseja criar um novo agendamento? Digite 1 para agendar ou 3 para falar com atendente.')
      );
      await updateAgendamentoContext(companyId, chatId, { 
        state: 'agendar_ou_consultar',
        patientId,
        patientName: nome,
      });
      return true;
    }
    
    let message = '*Seus agendamentos:*\n\n';
    
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();
      const inicio = appointment.inicio.toDate();
      const dateFormatted = DateTime.fromJSDate(inicio).setZone('America/Sao_Paulo').toFormat('dd/MM/yyyy');
      const timeFormatted = DateTime.fromJSDate(inicio).setZone('America/Sao_Paulo').toFormat('HH:mm');
      
      const professionalDoc = await db.collection(`companies/${companyId}/professionals`).doc(appointment.professionalId).get();
      const professionalName = professionalDoc.data()?.apelido || 'Profissional';
      
      const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(appointment.serviceId).get();
      const serviceName = serviceDoc.data()?.nome || 'Serviço';
      
      message += `📅 ${dateFormatted} às ${timeFormatted}\n`;
      message += `👤 ${professionalName}\n`;
      message += `📋 ${serviceName}\n`;
      message += `Status: ${appointment.status === 'confirmado' ? '✅ Confirmado' : '⏳ Agendado'}\n\n`;
    }
    
    await sendMessage(companyId, chatId, message);
    await resetAgendamentoContext(companyId, chatId);
    return true;
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao criar paciente:', error);
    await sendMessage(
      companyId,
      chatId,
      'Desculpe, ocorreu um erro ao criar seu cadastro. Por favor, tente novamente ou entre em contato conosco.'
    );
    await resetAgendamentoContext(companyId, chatId);
    return true;
  }
}

/**
 * Obtém horários disponíveis para uma data específica
 */
async function getHorariosDisponiveis(
  companyId: string,
  professionalId: string,
  date: string, // YYYY-MM-DD
  serviceIds?: string[] // IDs dos serviços para calcular duração total
): Promise<HorarioDisponivel[]> {
  try {
    // Buscar configurações de horário
    const settingsDoc = await db.collection(`companies/${companyId}/settings`).doc('general').get();
    const settings = settingsDoc.data();
    const horarioConfig: HorarioFuncionamentoConfig = settings?.horarioFuncionamento || {};
    
    // Buscar horário do profissional
    const professionalDoc = await db.collection(`companies/${companyId}/professionals`).doc(professionalId).get();
    const professional = professionalDoc.data();
    const professionalHorario = professional?.janelaAtendimento || {
      diasSemana: [1, 2, 3, 4, 5],
      inicio: '08:00',
      fim: '18:00',
    };
    
    // Determinar dia da semana (0 = domingo, 1 = segunda, etc)
    const dateObj = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'America/Sao_Paulo' });
    const diaSemana = dateObj.weekday === 7 ? 0 : dateObj.weekday; // Ajustar para 0-6 (domingo-sábado)
    
    // Verificar se o profissional atende neste dia
    if (!professionalHorario.diasSemana.includes(diaSemana)) {
      return [];
    }
    
    // Buscar horário específico do dia nas configurações
    const horarioDia = horarioConfig.horariosPorDia?.find(h => h.diaSemana === diaSemana && h.ativo);
    const inicioGeral = horarioDia?.inicio || horarioConfig.horariosPorDia?.[0]?.inicio || professionalHorario.inicio || '08:00';
    const fimGeral = horarioDia?.fim || horarioConfig.horariosPorDia?.[0]?.fim || professionalHorario.fim || '18:00';
    
    // Buscar intervalos do dia
    const intervalos = horarioConfig.intervalos?.filter(i => i.diaSemana === diaSemana) || [];
    
    // Buscar bloqueios
    const bloqueios: Array<{ inicio: string; fim: string }> = [];
    
    // Bloqueios semanais
    horarioConfig.bloqueios?.forEach(bloqueio => {
      if (!bloqueio.ativo) return;
      
      if (bloqueio.tipo === 'semanal' && bloqueio.diaSemana === diaSemana) {
        bloqueios.push({ inicio: bloqueio.inicio, fim: bloqueio.fim });
      } else if (bloqueio.tipo === 'mensal' && bloqueio.diaMes === dateObj.day) {
        bloqueios.push({ inicio: bloqueio.inicio, fim: bloqueio.fim });
      } else if (bloqueio.tipo === 'data_especifica' && bloqueio.dataEspecifica === date) {
        bloqueios.push({ inicio: bloqueio.inicio, fim: bloqueio.fim });
      }
    });
    
    // Calcular duração total dos serviços (se fornecidos)
    let duracaoTotalMinutos = 30; // Padrão de 30 minutos
    if (serviceIds && serviceIds.length > 0) {
      duracaoTotalMinutos = 0;
      for (const serviceId of serviceIds) {
        const serviceDoc = await db.collection(`companies/${companyId}/services`).doc(serviceId).get();
        if (serviceDoc.exists) {
          duracaoTotalMinutos += serviceDoc.data()?.duracaoMin || 60;
        }
      }
      // Se não encontrou nenhum serviço, usar padrão
      if (duracaoTotalMinutos === 0) {
        duracaoTotalMinutos = 30;
      }
    }
    
    // Buscar agendamentos existentes do profissional neste dia
    const dayStart = dateObj.startOf('day').toJSDate();
    const dayEnd = dateObj.endOf('day').toJSDate();
    
    const appointmentsRef = db.collection(`companies/${companyId}/appointments`);
    const appointmentsSnapshot = await appointmentsRef
      .where('professionalId', '==', professionalId)
      .where('inicio', '>=', admin.firestore.Timestamp.fromDate(dayStart))
      .where('inicio', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
      .where('status', 'in', ['agendado', 'confirmado'])
      .get();
    
    const agendamentosOcupados: Array<{ inicio: Date; fim: Date }> = [];
    appointmentsSnapshot.forEach(doc => {
      const data = doc.data();
      agendamentosOcupados.push({
        inicio: data.inicio.toDate(),
        fim: data.fim.toDate(),
      });
    });
    
    // Gerar slots considerando a duração total dos serviços
    const slots: HorarioDisponivel[] = [];
    const [inicioHour, inicioMin] = inicioGeral.split(':').map(Number);
    const [fimHour, fimMin] = fimGeral.split(':').map(Number);
    
    let currentTime = dateObj.set({ hour: inicioHour, minute: inicioMin, second: 0, millisecond: 0 });
    const endTime = dateObj.set({ hour: fimHour, minute: fimMin, second: 0, millisecond: 0 });
    
    while (currentTime < endTime) {
      const slotInicioTime = currentTime;
      const slotFimTime = currentTime.plus({ minutes: duracaoTotalMinutos });
      
      // Verificar se o slot completo não ultrapassa o horário de funcionamento
      if (slotFimTime > endTime) {
        break; // Não há mais horários disponíveis
      }
      
      const slotInicio = slotInicioTime.toFormat('HH:mm');
      const slotFim = slotFimTime.toFormat('HH:mm');
      
      // Verificar se o slot completo não está em um intervalo
      const isInInterval = intervalos.some(intervalo => {
        const intervaloInicio = dateObj.set({
          hour: parseInt(intervalo.inicio.split(':')[0]),
          minute: parseInt(intervalo.inicio.split(':')[1]),
          second: 0,
          millisecond: 0
        });
        const intervaloFim = dateObj.set({
          hour: parseInt(intervalo.fim.split(':')[0]),
          minute: parseInt(intervalo.fim.split(':')[1]),
          second: 0,
          millisecond: 0
        });
        
        // Verificar se o slot se sobrepõe ao intervalo
        return (slotInicioTime >= intervaloInicio && slotInicioTime < intervaloFim) ||
               (slotFimTime > intervaloInicio && slotFimTime <= intervaloFim) ||
               (slotInicioTime <= intervaloInicio && slotFimTime >= intervaloFim);
      });
      
      // Verificar se o slot completo não está em um bloqueio
      const isInBlock = bloqueios.some(bloqueio => {
        const bloqueioInicio = dateObj.set({
          hour: parseInt(bloqueio.inicio.split(':')[0]),
          minute: parseInt(bloqueio.inicio.split(':')[1]),
          second: 0,
          millisecond: 0
        });
        const bloqueioFim = dateObj.set({
          hour: parseInt(bloqueio.fim.split(':')[0]),
          minute: parseInt(bloqueio.fim.split(':')[1]),
          second: 0,
          millisecond: 0
        });
        
        // Verificar se o slot se sobrepõe ao bloqueio
        return (slotInicioTime >= bloqueioInicio && slotInicioTime < bloqueioFim) ||
               (slotFimTime > bloqueioInicio && slotFimTime <= bloqueioFim) ||
               (slotInicioTime <= bloqueioInicio && slotFimTime >= bloqueioFim);
      });
      
      // Verificar se o slot completo não está ocupado por outro agendamento
      const isOccupied = agendamentosOcupados.some(agendamento => {
        const agendamentoInicio = DateTime.fromJSDate(agendamento.inicio).setZone('America/Sao_Paulo');
        const agendamentoFim = DateTime.fromJSDate(agendamento.fim).setZone('America/Sao_Paulo');
        
        // Verificar sobreposição completa
        return (slotInicioTime >= agendamentoInicio && slotInicioTime < agendamentoFim) ||
               (slotFimTime > agendamentoInicio && slotFimTime <= agendamentoFim) ||
               (slotInicioTime <= agendamentoInicio && slotFimTime >= agendamentoFim);
      });
      
      if (!isInInterval && !isInBlock && !isOccupied) {
        slots.push({ inicio: slotInicio, fim: slotFim });
      }
      
      // Avançar em incrementos de 15 minutos para ter mais opções
      currentTime = currentTime.plus({ minutes: 15 });
    }
    
    return slots;
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao buscar horários disponíveis:', error);
    return [];
  }
}

/**
 * Verifica se há conflito de agendamento
 */
async function verificarConflitoAgendamento(
  companyId: string,
  professionalId: string,
  date: string, // YYYY-MM-DD
  inicio: string, // HH:mm
  fim: string // HH:mm
): Promise<boolean> {
  try {
    const dateObj = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'America/Sao_Paulo' });
    const [inicioHour, inicioMin] = inicio.split(':').map(Number);
    const [fimHour, fimMin] = fim.split(':').map(Number);
    
    const inicioDate = dateObj.set({ hour: inicioHour, minute: inicioMin, second: 0, millisecond: 0 }).toJSDate();
    const fimDate = dateObj.set({ hour: fimHour, minute: fimMin, second: 0, millisecond: 0 }).toJSDate();
    
    const appointmentsRef = db.collection(`companies/${companyId}/appointments`);
    const appointmentsSnapshot = await appointmentsRef
      .where('professionalId', '==', professionalId)
      .where('status', 'in', ['agendado', 'confirmado'])
      .get();
    
    for (const doc of appointmentsSnapshot.docs) {
      const appointment = doc.data();
      const appointmentInicio = appointment.inicio.toDate();
      const appointmentFim = appointment.fim.toDate();
      
      // Verificar sobreposição
      if (
        (inicioDate >= appointmentInicio && inicioDate < appointmentFim) ||
        (fimDate > appointmentInicio && fimDate <= appointmentFim) ||
        (inicioDate <= appointmentInicio && fimDate >= appointmentFim)
      ) {
        return true; // Há conflito
      }
    }
    
    return false; // Não há conflito
  } catch (error) {
    console.error('[WhatsApp Agendamento] Erro ao verificar conflito:', error);
    return true; // Em caso de erro, considerar como conflito para segurança
  }
}

