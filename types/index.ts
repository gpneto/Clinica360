export type TipoEstabelecimento = 
  | 'salao_beleza'
  | 'clinica_estetica'
  | 'profissional_autonomo'
  | 'clinica_medica'
  | 'dentista'
  | 'clinica_veterinaria'
  | 'barbearia'
  | 'estudio_tatuagem'
  | 'clinica_fisioterapia'
  | 'psicologia'
  | 'nutricao'
  | 'outros';

export interface Company {
  id: string;
  nome: string;
  tipoEstabelecimento?: TipoEstabelecimento;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  ativo: boolean;
  // Trial e assinatura
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  subscriptionActive?: boolean;
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  subscriptionProvider?: 'stripe';
  subscriptionType?: 'monthly' | 'pay-as-you-go'; // Tipo de assinatura: mensal fixo ou avulso por uso
  subscriptionCurrentPeriodEnd?: Date;
  customerId?: string; // Stripe customer id
  subscriptionId?: string; // Stripe subscription id
  logoUrl?: string; // URL do logo da empresa
  createdAt: Date;
  updatedAt: Date;
}

// Permissões granulares para usuários tipo 'outro' (recepcionista)
export interface GranularPermissions {
  // Agenda
  agendaEdicao: boolean; // Edição de agendamentos: criar, alterar e deletar eventos de todos os profissionais
  agendaVisualizacao: boolean; // Visualização da agenda: ver agendas de todos os profissionais
  
  // Financeiro
  financeiroDebitosPacientes: boolean; // Aba Débitos de Pacientes: acesso completo a todos os lançamentos da aba Débitos
  financeiroApenasProprios: boolean; // Acesso apenas aos lançamentos do usuário
  financeiroAcessoCompleto: boolean; // Acesso completo ao Controle Financeiro (inclui Relatórios e Resumo de Comissões)
  
  // Menus
  menuProfissionais: boolean; // Menu de Profissionais
  menuClientes: boolean; // Menu de Clientes
  menuServicos: boolean; // Menu de Serviços
}

export interface CompanyUser {
  id: string;
  companyId: string;
  uid: string;
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro';
  ativo: boolean;
  // Permissões granulares (apenas para role 'outro')
  permissions?: GranularPermissions;
  createdAt: Date;
  updatedAt: Date;
}

// Usuário Super Admin que gerencia empresas (collection root/users)
export interface SuperAdminUser {
  uid: string;
  nome: string;
  email: string;
  role: 'super_admin'; // Role exclusivo para super admins
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro';
  nome: string;
  telefoneE164?: string;
  email: string;
  ativo: boolean;
  professionalId?: string;
  companyId: string; // Adiciona suporte multi-tenant
  // Permissões granulares (apenas para role 'outro')
  permissions?: GranularPermissions;
}

export interface Professional {
  id: string;
  userUid?: string;
  companyId: string; // Adiciona suporte multi-tenant
  apelido: string;
  corHex: string;
  ativo: boolean;
  signatureImageUrl?: string; // URL da assinatura do profissional no Storage
  cro?: string; // CRO (Conselho Regional de Odontologia) - apenas para dentistas
  croEstado?: string; // Estado do CRO (ex: SP, RJ, MG) - apenas para dentistas
  janelaAtendimento: {
    diasSemana: number[]; // 0-6 (domingo-sábado)
    inicio: string; // HH:mm
    fim: string; // HH:mm
  };
}

export interface Service {
  id: string;
  companyId: string; // Adiciona suporte multi-tenant
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  comissaoPercent: number;
  ativo: boolean;
}

export interface Patient {
  id: string;
  companyId: string; // Adiciona suporte multi-tenant
  nome: string;
  telefoneE164?: string; // Telefone agora é opcional
  email?: string;
  cpf?: string; // CPF do paciente
  preferenciaNotificacao: 'whatsapp' | 'sms' | 'email';
  ownerUid: string;
  anamnese?: string;
  dataNascimento?: Date; // Data de nascimento para exibir aniversário no calendário
  ultimoProcedimentoDate?: Date; // Data do último procedimento concluído
  idCapim?: string; // ID do paciente no sistema Capim (para migração e correlação)
}

export interface PatientEvolutionImage {
  url: string;
  storagePath: string;
  name: string;
  size: number;
  contentType?: string;
  uploadedAt: Date;
}

export interface PatientEvolution {
  id: string;
  companyId: string;
  patientId: string;
  date: Date;
  notes: string;
  images: PatientEvolutionImage[];
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
}

export interface Appointment {
  id: string;
  companyId: string; // Adiciona suporte multi-tenant
  professionalId: string;
  clientId: string;
  serviceId: string; // Mantido para compatibilidade (primeiro serviço)
  serviceIds?: string[]; // Array com todos os serviços selecionados
  inicio: Date;
  fim: Date;
  precoCentavos: number;
  comissaoPercent: number;
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'no_show' | 'pendente' | 'bloqueio';
  observacoes?: string;
  valorPagoCentavos?: number; // Valor efetivamente pago (pode ser diferente do preço)
  formaPagamento?: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'outros';
  clientePresente?: boolean; // Se o cliente compareceu
  isBlock?: boolean;
  blockDescription?: string;
  blockScope?: 'single' | 'all';
  createdByUid: string;
  createdAt: Date;
  updatedAt: Date;
  recurrenceGroupId?: string;
  recurrenceFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurrenceOrder?: number;
  recurrenceOriginalStart?: Date;
  recurrenceEndsAt?: Date;
  idCapim?: string; // ID do agendamento no sistema Capim (para migração e correlação)
}

export interface Message {
  id: string;
  companyId: string; // Adiciona suporte multi-tenant
  appointmentId: string;
  tipo: 'confirmacao' | 'lembrete' | 'cancelamento';
  canal: 'whatsapp' | 'sms' | 'email';
  status: 'enviado' | 'falhou';
  payload: Record<string, any>;
  response?: Record<string, any>;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  companyId: string; // Adiciona suporte multi-tenant
  actorUid: string;
  entity: string;
  entityId: string;
  acao: string;
  diff?: Record<string, any>;
  at: Date;
}

export interface FinancialReport {
  companyId: string; // Adiciona suporte multi-tenant
  professionalId: string;
  professionalName: string;
  totalAtendimentos: number;
  valorBruto: number;
  comissaoSalao: number;
  repasseProfissional: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  color: string;
  appointment?: Appointment;
}

// Tipos para Ficha Clínica Odontológica
export type TipoDenticao = 'permanente' | 'decidua';

export type FaceDente = 'C' | 'D' | 'M' | 'O' | 'P' | 'V';

export type EstadoProcedimento = 'a_realizar' | 'realizado' | 'pre_existente';

export interface DenteProcedimento {
  numero: number;
  faces: FaceDente[];
}

export interface ProcedimentoOdontologico {
  id: string;
  companyId: string;
  patientId: string;
  procedimento: string;
  valorCentavos: number;
  dentes: DenteProcedimento[];
  selectionTypes?: Array<'ALL' | 'UPPER' | 'LOWER'>; // seleção em lote simbólica (múltipla)
  profissionalId: string;
  estado: EstadoProcedimento;
  realizadoEm?: Date;
  gerarPagamentoFinanceiro: boolean;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
  debitoId?: string; // ID do débito vinculado, se gerarPagamentoFinanceiro for true
}

// Tipos para Débitos de Pacientes
export type StatusDebito = 'pendente' | 'parcial' | 'concluido' | 'cancelado';

export interface LancamentoDebito {
  id: string;
  valorCentavos: number;
  data: Date;
  formaPagamento?: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'outros';
  observacoes?: string;
  createdAt: Date;
  createdByUid?: string;
}

export interface DebitoPaciente {
  id: string;
  companyId: string;
  patientId: string;
  procedimento: string; // Nome do procedimento
  valorTotalCentavos: number;
  saldoReceberCentavos: number; // Valor total - valor recebido
  saldoRecebidoCentavos: number; // Valor já recebido
  lancamentos: LancamentoDebito[];
  status: StatusDebito;
  profissionalId?: string;
  observacoes?: string;
  dentalProcedureId?: string; // ID do procedimento odontológico vinculado
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
}

// Tipos para Orçamentos
export type StatusOrcamento = 'rascunho' | 'aguardando_assinatura' | 'aprovado' | 'recusado' | 'finalizado';

export interface OrcamentoPagamento {
  parcela: number;
  valorCentavos: number;
  meioPagamento: 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro';
  dataVencimento: string; // DD/MM/AAAA
}

export interface OrcamentoEntrada {
  valorCentavos: number;
  meioPagamento: 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro';
  dataVencimento: string; // DD/MM/AAAA
}

export interface OrcamentoParcelado {
  numeroParcelas: number;
  meioPagamento: 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro';
  dataPrimeiroPagamento: string; // DD/MM/AAAA
}

export interface Orcamento {
  id: string;
  companyId: string;
  patientId: string;
  procedimentos: Array<{
    id: string;
    procedimento: string;
    valorCentavos: number;
    valorCentavosEditado?: number;
    comissaoPercent?: number;
    comissaoPercentEditado?: number;
    dentes?: Array<{ numero: number; faces: string[] }>;
    selectionTypes?: Array<'ALL' | 'UPPER' | 'LOWER'>;
  }>;
  descontoCentavos: number;
  valorTotalCentavos: number;
  observacoes?: string;
  formaPagamento: 'avista' | 'parcelado' | 'multiplas';
  pagamentos?: OrcamentoPagamento[]; // Para múltiplas formas de pagamento
  entrada?: OrcamentoEntrada; // Para parcelado com entrada
  parcelado?: OrcamentoParcelado; // Para parcelado
  status: StatusOrcamento;
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
  // Campos de assinatura
  signatureToken?: string; // Token único para assinatura
  signatureLink?: string; // Link completo para assinatura
  signedAt?: Date; // Data da assinatura
  signedBy?: string; // Nome de quem assinou
  signatureIP?: string; // IP de quem assinou
  signatureImageUrl?: string; // URL da imagem da assinatura no Storage
}

export type TipoMedida = 'ampola' | 'caixa' | 'comprimido' | 'frasco' | 'pacote' | 'tubo' | 'capsula';

export interface ControleEspecialInfo {
  // Identificação do Comprador
  compradorNome?: string;
  compradorIdent?: string; // RG, CPF, etc
  compradorOrgaoEmissor?: string;
  compradorEndereco?: string;
  compradorCidade?: string;
  compradorUF?: string;
  compradorTelefone?: string;
  // Identificação do Fornecedor
  fornecedorNome?: string;
  fornecedorIdent?: string;
  fornecedorOrgaoEmissor?: string;
  fornecedorEndereco?: string;
  fornecedorCidade?: string;
  fornecedorUF?: string;
  fornecedorTelefone?: string;
  // Assinatura do Farmacêutico
  farmaceuticoAssinatura?: string; // URL da assinatura ou texto
  farmaceuticoData?: Date;
}

export interface Medicamento {
  nome: string;
  quantidade: number;
  medida: TipoMedida;
  posologia: string;
  exigeControleEspecial: boolean;
  controleEspecialInfo?: ControleEspecialInfo; // Informações estruturadas de controle especial
  informacoesControleEspecial?: string; // Campo de texto livre (manter para compatibilidade)
}

export interface Receita {
  id: string;
  companyId: string;
  patientId: string;
  professionalId: string; // ID do profissional que prescreveu
  professionalName: string; // Nome do profissional
  professionalSignatureUrl?: string; // URL da assinatura do profissional
  medicamentos: Medicamento[];
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
}

export interface Atestado {
  id: string;
  companyId: string;
  patientId: string;
  professionalId: string; // ID do profissional que emitiu
  professionalName: string; // Nome do profissional
  professionalSignatureUrl?: string; // URL da assinatura do profissional
  texto: string; // Texto do atestado
  diasAfastamento?: number; // Número de dias de afastamento
  horasAfastamento?: number; // Número de horas de afastamento
  tipoAfastamento?: 'dias' | 'horas'; // Tipo de afastamento
  horaInicio?: string; // Horário de início do atendimento (formato HH:mm)
  horaFim?: string; // Horário de fim do atendimento (formato HH:mm)
  cid?: string; // Código CID (Código Internacional de Doenças)
  createdAt: Date;
  updatedAt: Date;
  createdByUid?: string;
}
