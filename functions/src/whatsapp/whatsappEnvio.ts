import type { WebHookAgendamentoRequest, Staff } from "./types/webhook-agendamento";
import * as admin from "firebase-admin";
import { DateTime } from "luxon";
import { sendEvolutionTextMessage } from "./evolutionClient";
// Função helper para obter a URL do serviço Redis Cache
// Usa o secret evolution-api-url para extrair o host e construir a URL do serviço
function getRedisServiceUrl(): string | null {
  // Tentar variável de ambiente direta primeiro
  if (process.env.REDIS_SERVICE_URL) {
    return process.env.REDIS_SERVICE_URL;
  }

  // Tentar obter do secret evolution-api-url
  const env = process.env as any;
  const evolutionApiUrl = env['evolution-api-url'] || 
                         env.EVOLUTION_API_URL || 
                         process.env.EVOLUTION_API_URL;

  if (evolutionApiUrl) {
    try {
      // Extrair host da URL (pode ser http:// ou https://)
      const url = new URL(evolutionApiUrl);
      // Construir URL do serviço Redis Cache na porta 8081
      // SEMPRE usar HTTP (não HTTPS) para o serviço interno
      let redisServiceUrl = `http://${url.hostname}:8081`;
      
      // Garantir que não está usando HTTPS (segurança extra)
      if (redisServiceUrl.startsWith('https://')) {
        redisServiceUrl = redisServiceUrl.replace('https://', 'http://');
      }
      
      console.log(`[Settings] URL do Redis Cache Service construída a partir de evolution-api-url: ${redisServiceUrl} (original: ${evolutionApiUrl})`);
      return redisServiceUrl;
    } catch (error) {
      console.warn(`[Settings] Erro ao extrair host de evolution-api-url (${evolutionApiUrl}):`, error);
    }
  }

  return null;
}

// Usar cache HTTP se disponível, senão usar cache direto
const REDIS_SERVICE_URL = getRedisServiceUrl();
let getCache: <T>(key: string) => Promise<T | null>;
let setCache: <T>(key: string, value: T, ttl?: number) => Promise<boolean>;
let deleteCache: (key: string) => Promise<boolean>;

if (REDIS_SERVICE_URL) {
  // Usar serviço HTTP (mais rápido, conexão sempre aberta)
  const httpCache = require("../utils/redisCacheHttp");
  getCache = httpCache.getCache;
  setCache = httpCache.setCache;
  deleteCache = httpCache.deleteCache;
  console.log(`[Settings] Usando Redis Cache Service HTTP: ${REDIS_SERVICE_URL}`);
} else {
  // Usar conexão direta (fallback)
  const directCache = require("../utils/redisCache");
  getCache = directCache.getCache;
  setCache = directCache.setCache;
  deleteCache = directCache.deleteCache;
  console.log(`[Settings] Usando conexão Redis direta (REDIS_SERVICE_URL não configurado e evolution-api-url não disponível)`);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

export type WhatsappProvider = "meta" | "evolution" | "disabled";

export interface CompanySettings {
  customerLabel?: "paciente" | "cliente";
  confirmacaoAutomatica?: boolean;
  lembrete1h?: boolean;
  lembrete24h?: boolean;
  whatsappProvider?: WhatsappProvider;
  whatsappIntegrationType?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  telefoneSalao?: string;
  agendamentoWhatsappHabilitado?: boolean;
  agendamentoWhatsappApenasContatos?: boolean;
  agendamentoWhatsappServicosIds?: string[];
  horarioFuncionamento?: {
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
  };
  [key: string]: unknown;
}

export interface DisabledWhatsappConfig {
  provider: "disabled";
  companyId?: string;
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  customerLabel: "paciente",
  confirmacaoAutomatica: true,
  lembrete1h: true,
  lembrete24h: true,
  whatsappProvider: "disabled",
  whatsappIntegrationType: "WHATSAPP-BAILEYS",
};

/**
 * Chave de cache para configurações da empresa
 */
function getSettingsCacheKey(companyId: string): string {
  return `company:${companyId}:settings`;
}

export async function getCompanySettings(companyId?: string): Promise<CompanySettings> {
  if (!companyId) {
    return { ...DEFAULT_COMPANY_SETTINGS };
  }

  const settingsStart = Date.now();
  const cacheKey = getSettingsCacheKey(companyId);
  
  // PASSO 1: Tentar obter do cache Redis primeiro
  console.log(`[Settings] [${companyId}] 🔍 Verificando cache Redis...`);
  try {
    const cached = await getCache<CompanySettings>(cacheKey);
    if (cached) {
      console.log(`[Settings] [${companyId}] ✅ Configurações obtidas do CACHE em ${Date.now() - settingsStart}ms`);
      return cached;
    }
    console.log(`[Settings] [${companyId}] ⚠️ Cache não encontrado, buscando no Firestore...`);
  } catch (error) {
    console.warn(`[Settings] [${companyId}] ⚠️ Erro ao obter do cache, buscando no Firestore:`, error);
  }

  // PASSO 2: Se não estiver no cache (ou cache indisponível), buscar no Firestore
  console.log(`[Settings] [${companyId}] 📥 Buscando configurações no Firestore...`);
  
  try {
    const dbStart = Date.now();
    const settingsSnap = await db
      .collection(`companies/${companyId}/settings`)
      .doc("general")
      .get();
    console.log(`[Settings] [${companyId}] ⏱️ Firestore query executada em ${Date.now() - dbStart}ms`);

    const settingsData = settingsSnap.exists ? settingsSnap.data() ?? {} : {};
    const result = { ...DEFAULT_COMPANY_SETTINGS, ...settingsData };
    
    // PASSO 3: SEMPRE tentar salvar no cache Redis após buscar no Firestore
    // TTL = 0 significa sem expiração (cache permanente até ser invalidado manualmente)
    console.log(`[Settings] [${companyId}] 💾 Salvando configurações no cache Redis (sem TTL)...`);
    try {
      const cacheSaved = await setCache(cacheKey, result, 0);
      if (cacheSaved) {
        console.log(`[Settings] [${companyId}] ✅ Configurações salvas no cache Redis com sucesso (sem expiração)`);
      } else {
        console.warn(`[Settings] [${companyId}] ⚠️ Não foi possível salvar no cache Redis (mas configurações foram obtidas do Firestore)`);
      }
    } catch (cacheError) {
      console.warn(`[Settings] [${companyId}] ⚠️ Erro ao salvar no cache Redis (não crítico):`, cacheError);
      // Não bloquear o retorno mesmo se o cache falhar
    }
    
    console.log(`[Settings] [${companyId}] ✅ Configurações obtidas do Firestore e cache atualizado em ${Date.now() - settingsStart}ms total`);
    return result;
  } catch (error) {
    console.error(`[Settings] [${companyId}] ❌ Falha ao obter configurações em ${Date.now() - settingsStart}ms:`, error);
    return { ...DEFAULT_COMPANY_SETTINGS };
  }
}

/**
 * Invalida o cache de configurações da empresa
 */
export async function invalidateCompanySettingsCache(companyId: string): Promise<void> {
  const cacheKey = getSettingsCacheKey(companyId);
  try {
    await deleteCache(cacheKey);
    console.log(`[Settings] [${companyId}] Cache de configurações invalidado`);
  } catch (error) {
    console.error(`[Settings] [${companyId}] Erro ao invalidar cache:`, error);
  }
}

/**
 * Atualiza o cache de configurações da empresa com os valores mais recentes do Firestore
 */
export async function updateCompanySettingsCache(companyId: string): Promise<void> {
  const cacheKey = getSettingsCacheKey(companyId);
  try {
    // Buscar configurações atualizadas do Firestore
    console.log(`[Settings] [${companyId}] 🔄 Atualizando cache com valores do Firestore...`);
    const settingsSnap = await db
      .collection(`companies/${companyId}/settings`)
      .doc("general")
      .get();

    const settingsData = settingsSnap.exists ? settingsSnap.data() ?? {} : {};
    const result = { ...DEFAULT_COMPANY_SETTINGS, ...settingsData };
    
    // Atualizar cache com os novos valores (TTL = 0 = sem expiração)
    const cacheSaved = await setCache(cacheKey, result, 0);
    if (cacheSaved) {
      console.log(`[Settings] [${companyId}] ✅ Cache atualizado com sucesso`);
    } else {
      console.warn(`[Settings] [${companyId}] ⚠️ Não foi possível atualizar o cache`);
    }
  } catch (error) {
    console.error(`[Settings] [${companyId}] Erro ao atualizar cache:`, error);
  }
}

export interface MetaWhatsappConfig {
  provider: "meta";
  webhookVerifyToken: string;
  whatsappApiPhoneNumberId: string;
  whatsappAccessToken: string;
  facebookAppSecret?: string;
}


export interface EvolutionWhatsappConfig {
  provider: "evolution";
  companyId: string;
  evolutionNumber?: string;
  telefoneOriginal?: string;
}

export type WhatsappConfig = MetaWhatsappConfig | EvolutionWhatsappConfig | DisabledWhatsappConfig;

const STATIC_WHATSAPP_CONFIG: MetaWhatsappConfig = {
  provider: "meta",
  webhookVerifyToken: "1a6e341ee409ea59122ee0b09b765128bf80d5c1eba9def1bbed5a666e035dcf",
  whatsappApiPhoneNumberId: "585260501335809",
  whatsappAccessToken: "EAAQ0AKOhLVcBO6gWsncBmGeQgI3SNJCZAFq9SbGrVVZAALH5a8Djval14sKrPjwzMyTuZB3DGqIZAVWYOG1YPDvOcjscZAYzS2CCVx1QTmPvXxFnijm0ZAXg9R0jfZAOaZCihTPnZAXB4PVpgiQewvNVhZAqEIjk8EQlv4x24e235Q4S1yQNTa6kQdgGiZC76baNPZAExQZDZD",
  facebookAppSecret: "799aad4206a54108d97529191d27d857",
};

export async function getWhatsappConfig(companyId?: string): Promise<WhatsappConfig> {
  if (!companyId) {
    return STATIC_WHATSAPP_CONFIG;
  }

  const settingsData = await getCompanySettings(companyId);
  const provider = settingsData.whatsappProvider as WhatsappProvider | undefined;
  const rawNumber = settingsData.telefoneSalao || "";
  const normalizedDigits = normalizarTelefone(rawNumber);
  const e164 = normalizedDigits
    ? normalizedDigits.startsWith("55")
      ? normalizedDigits
      : `55${normalizedDigits}`
    : "";

  // Se provider está desabilitado ou não está definido, retornar config desabilitado
  if (provider === "disabled" || !provider) {
    console.log("[getWhatsappConfig] WhatsApp desabilitado", { companyId, motivo: !provider ? "não configurado" : "explicitamente desabilitado" });
    return {
      provider: "disabled",
      companyId,
    };
  }

  console.log("[getWhatsappConfig] Provider selecionado", {
    companyId,
    providerConfigurado: provider,
    temNumero: !!e164,
    rawNumber,
  });

  if (provider === "evolution") {
    console.log("[getWhatsappConfig] Usando Evolution", { companyId, evolutionNumber: e164 });
    return {
      provider: "evolution",
      companyId,
      evolutionNumber: e164,
      telefoneOriginal: rawNumber,
    };
  }

  // Fallback para Meta apenas se provider for explicitamente "meta"
  if (provider === "meta") {
    console.log("[getWhatsappConfig] Usando Meta", { companyId });
    return STATIC_WHATSAPP_CONFIG;
  }

  // Se provider é inválido, retornar desabilitado
  console.log("[getWhatsappConfig] Provider inválido, desabilitando", { companyId, provider });
  return {
    provider: "disabled",
    companyId,
  };
}

type TemplateType = "agendamento_informar_v2" | "agendamento_atualizar_v1" | "agendamento_deletar_v2" | "agendamento_lembrar_v2" | "aniversario_v1";

export const templatesWhats: Record<TemplateType, string> = {
  agendamento_informar_v2: `📢 *Confirmação de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Sua reserva foi confirmada! Aqui estão os detalhes do seu atendimento:

👤 Profissional: {{2}}
💼 Serviço:  *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}
📍 Endereço: {{6}}
📞 Contato: {{7}}

Se precisar reagendar ou tiver dúvidas, fale conosco! 💆‍♂️✨

Nos vemos em breve!`,

agendamento_atualizar_v1: `🔔 *Atualização no Seu Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Seu agendamento foi atualizado! Aqui estão os novos detalhes:

👤 Profissional: {{2}}
💼 Serviço:  *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}
📍 Endereço: {{6}}
📞 Contato: {{7}}

Se precisar reagendar ou tiver dúvidas, fale conosco! 💆‍♂️✨

Nos vemos em breve!`,

  agendamento_deletar_v2: `❌ *Cancelamento de Agendamento - *

Olá, {{1}}!

Informamos que seu agendamento foi cancelado.

💼 Serviço: *{{2}}*
⏰ Data: *{{3}}*

Se desejar reagendar, entre em contato:

📞 *Contato:* {{4}}

Aguardamos seu retorno! 🙂`,

  agendamento_lembrar_v2: `📌 *Lembrete de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Lembramos que seu atendimento será em aproximadamente *{{2}}*.

👤 Profissional: {{3}}
💼 Serviço:  *{{4}}*
⏰ Data e Horário: *{{5}}*
⏳ Duração: {{6}}
📍 Endereço: {{7}}
📞 Contato: {{8}}

Para reagendar ou esclarecer dúvidas, entre em contato pelo número acima.

Nos vemos em breve!`,

  aniversario_v1: `🎉 *Feliz Aniversário, {{1}}!* 🎉

{{2}}

Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de saúde, alegria e realizações! 🎂✨

Parabéns pelo seu dia especial! 🎈`
};

export function substituirParametros(template: string, parameters: Array<{ type: string; text: string }>) {
  return template.replace(/{{(\d+)}}/g, (_, index) => parameters[parseInt(index, 10) - 1]?.text || "");
}

function formatarDataLuxon(datetimeString: string) {
  return DateTime.fromISO(datetimeString, { zone: "America/Sao_Paulo" })
    .setLocale("pt-BR")
    .toFormat("dd 'de' MMMM 'de' yyyy 'às' HH:mm");
}

function formatarDuracao(segundos: number) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas > 0 ? `${horas}h` : ""}${minutos > 0 ? ` ${minutos}min` : ""}`.trim() || "0min";
}

export function normalizarTelefone(tel: string | null | undefined): string {
  return tel?.replace(/\D/g, "") || "";
}

/**
 * Normaliza número de telefone para formato consistente usado como ID de contato
 * Sempre usa formato com dígito 9 para números brasileiros (se aplicável)
 * Exemplo: 555181987429 -> 5551981987429
 */
export function normalizePhoneForContact(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remover caracteres não numéricos
  const digits = phone.replace(/\D/g, "");
  
  if (!digits || digits.length < 10) {
    return digits;
  }
  
  // Se começar com 55 (Brasil) e tiver 12 dígitos (55 + DDD + 8 dígitos), adicionar 9
  if (digits.startsWith("55") && digits.length === 12) {
    // Formato: 55 + DDD (2 dígitos) + número (8 dígitos)
    // Adicionar 9 após o DDD: 55 + DDD + 9 + número
    return digits.slice(0, 4) + "9" + digits.slice(4);
  }
  
  // Se começar com 55 e tiver 13 dígitos, já está correto (com 9)
  if (digits.startsWith("55") && digits.length === 13) {
    return digits;
  }
  
  // Se não começar com 55, adicionar 55 e normalizar
  if (!digits.startsWith("55")) {
    const withCountry = "55" + digits;
    // Se tiver 12 dígitos após adicionar 55, adicionar 9
    if (withCountry.length === 12) {
      return withCountry.slice(0, 4) + "9" + withCountry.slice(4);
    }
    return withCountry;
  }
  
  return digits;
}

function obterNomeStaff(staff: Staff | string | undefined): string {
  if (!staff) return "Letícia Lima";
  if (typeof staff === "string") return staff;
  return staff.name || "Letícia Lima";
}

/**
 * Busca um paciente pelo número de telefone na empresa
 * @param companyId ID da empresa
 * @param phoneNumber Número de telefone no formato WhatsApp (ex: "5519999999999")
 * @returns Nome do paciente se encontrado, null caso contrário
 */
async function findPatientNameByPhone(
  companyId: string,
  phoneNumber: string
): Promise<string | null> {
  try {
    if (!phoneNumber || !companyId) return null;

    // Normalizar número (remover caracteres não numéricos)
    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    // Gerar variantes do número para busca
    // Formato do WhatsApp: 55 (país) + DDD + número
    // Formato do paciente: telefoneE164 (pode estar com ou sem o 55)
    const variants = [
      normalizedPhone, // Ex: "5519999999999"
      normalizedPhone.startsWith("55") ? normalizedPhone.slice(2) : `55${normalizedPhone}`, // Sem/Com país
      normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
        ? normalizedPhone.slice(0, 4) + normalizedPhone.slice(5) // Remover 9 se tiver
        : null,
      normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
        ? normalizedPhone.slice(2) // Remover 55
        : null,
    ].filter(Boolean) as string[];

    // Buscar paciente na coleção de pacientes da empresa
    const patientsSnapshot = await db
      .collection(`companies/${companyId}/patients`)
      .where("telefoneE164", "in", variants)
      .limit(1)
      .get();

    if (!patientsSnapshot.empty) {
      const patientData = patientsSnapshot.docs[0].data();
      const patientName = patientData?.nome;
      if (patientName) {
        console.log(
          `[whatsappEnvio] Paciente encontrado para ${normalizedPhone}: ${patientName}`
        );
        return patientName as string;
      }
    }

    return null;
  } catch (error) {
    console.error(
      `[whatsappEnvio] Erro ao buscar paciente para ${phoneNumber}:`,
      error
    );
    return null;
  }
}

async function salvarOuAtualizarContato(webhookBody: WebHookAgendamentoRequest, companyId?: string | null) {
  try {
    console.log("   📝 [SALVAR CONTATO] Processando contato do agendamento...");
    
    const telefoneOriginal = webhookBody.data.client.phone;
    const nomeCliente = webhookBody.data.client.name || webhookBody.data.client.display_name || "Cliente Sem Nome";
    
    if (!telefoneOriginal) {
      console.warn("   ⚠️  Telefone não informado no webhook, pulando salvamento do contato");
      return;
    }

    const telefoneNormalizado = normalizarTelefone(telefoneOriginal);
    
    if (!telefoneNormalizado) {
      console.warn("   ⚠️  Não foi possível normalizar o telefone, pulando salvamento");
      return;
    }

    console.log("   📞 Telefone original:", telefoneOriginal);
    console.log("   📞 Telefone normalizado:", telefoneNormalizado);
    console.log("   🔢 WA_ID:", telefoneNormalizado);
    console.log("   👤 Nome do cliente:", nomeCliente);

    if (!companyId) {
      console.warn("   ⚠️ companyId não disponível, não é possível salvar contato");
      return;
    }

    const contatosCollection = db.collection(`companies/${companyId}/whatsappContacts`);
    const contatoDocRef = contatosCollection.doc(telefoneNormalizado);
    const contatoSnapshot = await contatoDocRef.get();

    // Buscar paciente pelo número de telefone para obter o nome
    const patientName = await findPatientNameByPhone(companyId, telefoneNormalizado);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: telefoneNormalizado,
      profile_name: nomeCliente,
      last_message_at: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      companyId: companyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    } else {
      // Se não encontrou paciente, usar o nome do cliente do webhook
      contactData.name = nomeCliente;
    }

    if (contatoSnapshot.exists) {
      console.log("   ✅ Contato já existe, atualizando informações...");
      await contatoDocRef.set(contactData, { merge: true });
      console.log("   ✅ Contato atualizado com sucesso!");
    } else {
      console.log("   🆕 Criando novo contato...");
      await contatoDocRef.set({
        ...contactData,
        in_chat: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log("   ✅ Novo contato criado com sucesso!");
    }
  } catch (error) {
    console.error("   🚨 Erro ao processar contato:", error);
    // Não propagamos o erro para não quebrar o fluxo do webhook
  }
}

export function generatePhoneVariants(raw: string): string[] {
  const variants = new Set<string>();
  const digits = normalizarTelefone(raw);
  if (!digits) return [];
  variants.add(digits);

  // Remove leading country code
  if (digits.startsWith("55") && digits.length > 2) {
    const withoutCountry = digits.slice(2);
    variants.add(withoutCountry);

    // Handle optional ninth digit after area code (Brazil)
    if (withoutCountry.length >= 9) {
      const area = withoutCountry.slice(0, 2);
      const rest = withoutCountry.slice(2);
      if (rest.length >= 9) {
        if (rest.startsWith("9")) {
          variants.add(area + rest.slice(1));
          variants.add("55" + area + rest.slice(1));
        } else {
          variants.add(area + "9" + rest);
          variants.add("55" + area + "9" + rest);
        }
      }
    }
  }

  return Array.from(variants);
}

interface SendWhatsAppMessageOptions {
  reminderWindowText?: string;
}

export async function sendWhatsAppMessage(
  webhookBody: WebHookAgendamentoRequest,
  template: TemplateType,
  config?: WhatsappConfig,
  options?: SendWhatsAppMessageOptions & { messageSource?: 'automatic' | 'manual' }
) {
  try {
    console.log("🚀 Preparando envio de mensagem WhatsApp");
    const companyIdFromWebhook =
      (webhookBody as any)?.companyId ??
      (webhookBody.data as any)?.companyId ??
      undefined;

    const resolvedConfig = config ?? await getWhatsappConfig(companyIdFromWebhook);

    let nameService = "Massagem";
    if (webhookBody.data.services.length === 1) {
      nameService = webhookBody.data.services[0].title;
    }

    const staffName = obterNomeStaff(webhookBody.data.staff);

    let parameters: Array<{ type: string; text: string }>;
    if (template === "agendamento_deletar_v2") {
      parameters = [
        { type: "text", text: webhookBody.data.client.name.split(" ")[0] },
        { type: "text", text: nameService },
        { type: "text", text: formatarDataLuxon(webhookBody.data.datetime) },
        { type: "text", text: webhookBody.data.company_phone || "" },
      ];
    } else {
      const clientFirstName = webhookBody.data.client.name.split(" ")[0];
      const formattedDate = formatarDataLuxon(webhookBody.data.datetime);
      const durationText = formatarDuracao(webhookBody.data.seance_length || 0);
      const addressText = webhookBody.data.company_adress || "";
      const phoneText = webhookBody.data.company_phone || "";

      if (template === "agendamento_lembrar_v2") {
        const reminderWindowText = options?.reminderWindowText ?? "1 hora";
        parameters = [
          { type: "text", text: clientFirstName },
          { type: "text", text: reminderWindowText },
          { type: "text", text: staffName },
          { type: "text", text: nameService },
          { type: "text", text: formattedDate },
          { type: "text", text: durationText },
          { type: "text", text: addressText },
          { type: "text", text: phoneText },
        ];
      } else {
        parameters = [
          { type: "text", text: clientFirstName },
          { type: "text", text: staffName },
          { type: "text", text: nameService },
          { type: "text", text: formattedDate },
          { type: "text", text: durationText },
          { type: "text", text: addressText },
          { type: "text", text: phoneText },
        ];
      }
    }

    const headerParameters = [{ type: "text", text: webhookBody.data.company_name || "" }];
    const mensagemFormatada = substituirParametros(templatesWhats[template], parameters);

    console.log("[sendWhatsAppMessage] Provider selecionado:", {
      provider: resolvedConfig.provider,
      companyId: companyIdFromWebhook,
      template,
    });

    const messageSource = options?.messageSource || 'automatic'; // Padrão: automático

    // Verificar se WhatsApp está desabilitado
    if (resolvedConfig.provider === "disabled") {
      console.log("[sendWhatsAppMessage] ⚠️ WhatsApp desabilitado. Mensagem não será enviada.");
      return new Response("WhatsApp desabilitado", { status: 200 });
    }

    if (resolvedConfig.provider === "evolution") {
      console.log("[sendWhatsAppMessage] Enviando via Evolution");
      return await sendViaEvolution({
        webhookBody,
        template,
        mensagemFormatada,
        config: resolvedConfig,
        messageSource,
      });
    }

    console.log("[sendWhatsAppMessage] Enviando via Meta (fallback)");
    return await sendViaMeta({
      webhookBody,
      template,
      config: resolvedConfig,
      headerParameters,
      parameters,
      mensagemFormatada,
      companyId: companyIdFromWebhook,
      messageSource,
    });

  } catch (error) {
    console.error("🚨 Erro ao enviar mensagem:", error);
    throw (error instanceof Error ? error : new Error(String(error)));
  }
}

async function sendViaMeta(params: {
  webhookBody: WebHookAgendamentoRequest;
  template: TemplateType;
  config: MetaWhatsappConfig;
  headerParameters: Array<{ type: string; text: string }>;
  parameters: Array<{ type: string; text: string }>;
  mensagemFormatada: string;
  companyId?: string;
  messageSource?: 'automatic' | 'manual';
}) {
  const { webhookBody, template, config, headerParameters, parameters, mensagemFormatada, companyId, messageSource = 'automatic' } = params;

  const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${config.whatsappApiPhoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: webhookBody.data.client.phone,
    type: "template",
    template: {
      name: template,
      language: { code: "pt_BR" },
      components: [
        { type: "header", parameters: headerParameters },
        { type: "body", parameters },
      ],
    },
  };

  console.log("📤 Enviando requisição para o WhatsApp:", JSON.stringify(payload, null, 2));

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.whatsappAccessToken}`,
  };

  const response = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  console.log("📡 Status da resposta:", response.status);

  const responseText = await response.text();
  console.log("🔎 Resposta bruta da API:", responseText);

  let responseJson: any;
  try {
    responseJson = JSON.parse(responseText);
    console.log("✅ Resposta JSON:", responseJson);
  } catch (error) {
    console.error("🚨 Erro ao converter resposta para JSON:", error);
    return new Response("Erro ao processar JSON", { status: 500 });
  }

  if (!responseJson.messages?.length) {
    console.warn("⚠️ A resposta não contém um ID de mensagem válido.");
    return new Response("OK");
  }

  const wamId = responseJson.messages[0].id as string;
  console.log("✅ Mensagem enviada com sucesso. ID:", wamId);

  const mensagemParaSalvar = {
    id: wamId,
    to: webhookBody.data.client.phone.replace("+", ""),
    type: "template" as const,
    provider: "meta" as const,
    template: {
      name: template,
      language: { code: "pt_BR" },
    },
    text: {
      body: mensagemFormatada,
      preview_url: false,
    },
  };

  const chatIdRaw = responseJson.contacts?.[0]?.wa_id ?? null;
  // Normalizar para formato consistente usado como ID de contato
  const chatId = chatIdRaw ? normalizePhoneForContact(chatIdRaw) : null;

  // Salvar dentro da coleção da empresa se companyId estiver disponível
  if (companyId) {
    const messageRef = db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId);
    await messageRef.set({
      message: mensagemParaSalvar,
      wam_id: wamId,
      chat_id: chatId,
      provider: "meta",
      companyId: companyId,
      messageSource,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    // Verificar se foi salvo corretamente
    const savedDoc = await messageRef.get();
    if (savedDoc.exists) {
      const savedData = savedDoc.data();
      console.log("[Meta] ✅ Mensagem salva no Firestore:", {
        wamId,
        chatId,
        messageSource: savedData?.messageSource,
        direction: 'outbound',
        companyId,
      });
    } else {
      console.error("[Meta] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
    }
  } else {
    // Fallback para coleção global se companyId não estiver disponível (compatibilidade)
    const messageRef = db.collection("whatsappMessages").doc(wamId);
    await messageRef.set({
      message: mensagemParaSalvar,
      wam_id: wamId,
      chat_id: chatId,
      provider: "meta",
      companyId: null,
      messageSource,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    // Verificar se foi salvo corretamente
    const savedDoc = await messageRef.get();
    if (savedDoc.exists) {
      console.log("[Meta] ✅ Mensagem salva no Firestore (coleção global):", { wamId, chatId });
    } else {
      console.error("[Meta] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
    }
  }

  if (chatId && companyId) {
    // Buscar paciente pelo número de telefone para obter o nome
    const patientName = await findPatientNameByPhone(companyId, chatId);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: chatId,
      last_message_at: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      companyId: companyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    }

    await db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId).set(
      contactData,
      { merge: true }
    );
  }

  console.log("📌 Mensagem salva no Firestore ✅");

  return new Response("OK");
}


async function sendViaEvolution(params: {
  webhookBody: WebHookAgendamentoRequest;
  template: TemplateType;
  mensagemFormatada: string;
  config: EvolutionWhatsappConfig;
  messageSource?: 'automatic' | 'manual';
}) {
  const { webhookBody, template, mensagemFormatada, config, messageSource = 'automatic' } = params;

  const rawPhone = webhookBody.data.client.phone || "";
  const normalized = normalizarTelefone(rawPhone);
  if (!normalized) {
    console.warn("⚠️ Telefone do cliente inválido para envio via Evolution:", rawPhone);
    return new Response("Telefone do cliente inválido", { status: 200 });
  }

  // Normalizar número para formato E.164 (com código do país)
  const destino = normalized.startsWith("55") ? normalized : `55${normalized}`;
  
  console.log("[Evolution] Enviando mensagem", {
    companyId: config.companyId,
    to: destino,
    template,
  });

  try {
    const resultadoEnvio = await sendEvolutionTextMessage({
      companyId: config.companyId,
      to: destino,
      message: mensagemFormatada,
    });

    const wamId = resultadoEnvio.messageId || `evolution_${Date.now()}`;
    // Normalizar para formato consistente usado como ID de contato
    const chatId = normalizePhoneForContact(destino);

    const mensagemParaSalvar = {
      id: wamId,
      to: chatId,
      type: "text" as const,
      provider: "evolution" as const,
      template: {
        name: template,
        language: { code: "pt_BR" },
      },
      text: {
        body: mensagemFormatada,
        preview_url: false,
      },
    };

    const messageRef = db.collection(`companies/${config.companyId}/whatsappMessages`).doc(wamId);
    await messageRef.set({
      message: mensagemParaSalvar,
      wam_id: wamId,
      chat_id: chatId,
      provider: "evolution",
      companyId: config.companyId,
      direction: "outbound",
      messageSource,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Verificar se foi salvo corretamente
    const savedDoc = await messageRef.get();
    if (savedDoc.exists) {
      const savedData = savedDoc.data();
      console.log("[Evolution] ✅ Mensagem salva no Firestore:", {
        wamId,
        chatId,
        messageSource: savedData?.messageSource,
        direction: savedData?.direction,
        companyId: config.companyId,
      });
    } else {
      console.error("[Evolution] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
    }

    // Buscar paciente pelo número de telefone para obter o nome
    const patientName = await findPatientNameByPhone(config.companyId, chatId);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: chatId,
      last_message_at: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      companyId: config.companyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    }

    await db.collection(`companies/${config.companyId}/whatsappContacts`).doc(chatId).set(
      contactData,
      { merge: true }
    );

    await db
      .collection(`companies/${config.companyId}/integrations`)
      .doc("whatsappEvolution")
      .set(
        {
          lastMessageAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log("📌 Mensagem enviada via Evolution e salva no Firestore ✅");

    return new Response("OK");
  } catch (error) {
    console.error("🚨 Erro ao enviar mensagem via Evolution:", error);
    throw error;
  }
}

async function saveWebhookAgendamento(webhookBody: WebHookAgendamentoRequest) {
  try {
    const logsCollection = db.collection("webhookLogAgendamento");
    await logsCollection.add({
      body: webhookBody,
      datetime_scheduler: webhookBody.data.datetime,
      status: webhookBody.status,
      createdAt: FieldValue.serverTimestamp()
    });

    const resourceId = webhookBody.resource_id ? String(webhookBody.resource_id) : `resource_${Date.now()}`;
    const agendamentoDocRef = db.collection("webhookAgendamentos").doc(resourceId);

    if (webhookBody.status === "delete") {
      await agendamentoDocRef.delete();
      console.log("🗑️  Webhook deletado do Firestore");
      return;
    }

    let phoneNormalized = normalizarTelefone(webhookBody.data?.client?.phone || "");
    if (phoneNormalized && !phoneNormalized.startsWith("55")) {
      phoneNormalized = `55${phoneNormalized}`;
    }

    const phoneVariants = generatePhoneVariants(webhookBody.data?.client?.phone || "");

    const baseData = {
      body: webhookBody,
      datetime_scheduler: webhookBody.data.datetime,
      notified: false,
      updatedAt: FieldValue.serverTimestamp(),
      companyId: (webhookBody as any)?.companyId || null,
      phoneNormalized: phoneNormalized || null,
      phoneVariants,
      customerPhone: webhookBody.data?.client?.phone || null,
      lastStatus: webhookBody.status
    };

    if (webhookBody.status === "update") {
      await agendamentoDocRef.set(
        {
          ...baseData,
          reminder24hSent: false,
          reminder24hSentAt: null,
          reminder1hSent: false,
          reminder1hSentAt: null,
          notified: false,
          notifiedAt: null,
        },
        { merge: true }
      );
      console.log("🔄 Webhook atualizado no Firestore");
    } else {
      await agendamentoDocRef.set(
        {
          ...baseData,
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      console.log("✅ Webhook salvo no Firestore");
    }
  } catch (error) {
    console.error("🚨 Erro ao processar webhook:", error);
  }
}

async function sendWhatsAppMessageCreate(
  webhookBody: WebHookAgendamentoRequest,
  config: WhatsappConfig,
  companySettings?: CompanySettings
) {
  const statusTemplateMap: Record<string, TemplateType> = {
    create: "agendamento_informar_v2",
    update: "agendamento_atualizar_v1",
    delete: "agendamento_deletar_v2"
  };

  const template = statusTemplateMap[webhookBody.status];
  if (!template) return;

  await sendWhatsAppMessage(webhookBody, template, config);
}

export async function handleWebhookAgendamento(
  webhookBody: WebHookAgendamentoRequest,
  providedConfig?: WhatsappConfig,
  companyId?: string
) {
  const config = providedConfig ?? await getWhatsappConfig(companyId);
  console.log("📩 Webhook recebido:", webhookBody);

  const resolvedCompanyId =
    companyId ??
    (webhookBody as any)?.companyId ??
    (webhookBody.data as any)?.companyId ??
    undefined;
  const companySettings = await getCompanySettings(resolvedCompanyId);

  if (webhookBody.resource === "record") {
    console.log("\n🔄 [ETAPA 1] Salvando/atualizando contato...");
    await salvarOuAtualizarContato(webhookBody, resolvedCompanyId);

    console.log("\n💾 [ETAPA 2] Salvando webhook no banco...");
    await saveWebhookAgendamento(webhookBody);

    const enviarNotificacao = webhookBody.enviarNotificacao !== false;
    if (enviarNotificacao) {
      console.log("\n📱 [ETAPA 3] Enviando mensagem WhatsApp...");
      await sendWhatsAppMessageCreate(webhookBody, config, companySettings);
    } else {
      console.log("\n🔕 [ETAPA 3] Notificação desabilitada (enviarNotificacao: false)");
    }
  }
}

