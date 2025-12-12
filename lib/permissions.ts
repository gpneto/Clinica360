import { GranularPermissions, User } from '@/types';

// Tipo mais flexível para usuário com permissões (pode incluir super_admin)
export type UserWithPermissions = {
  uid: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro' | 'super_admin';
  nome?: string;
  email?: string;
  ativo?: boolean;
  companyId?: string;
  professionalId?: string;
  permissions?: GranularPermissions;
} | null;

/**
 * Verifica se o usuário tem acesso total (owner ou admin)
 */
export function hasFullAccess(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  return user.role === 'owner' || user.role === 'admin';
}

/**
 * Verifica se o usuário é profissional (vê apenas sua própria agenda)
 */
export function isProfessional(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  return user.role === 'pro';
}

/**
 * Verifica se o usuário é do tipo 'outro' (recepcionista com permissões granulares)
 */
export function isOtherRole(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  return user.role === 'outro';
}

/**
 * Verifica se o usuário pode editar agendamentos
 */
export function canEditAppointments(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Profissional pode editar apenas seus próprios agendamentos (validação específica na operação)
  if (isProfessional(user)) return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.agendaEdicao || false;
  }
  
  // Atendente tem permissão padrão (para manter compatibilidade)
  if (user.role === 'atendente') return true;
  
  return false;
}

/**
 * Verifica se o usuário pode visualizar agendas de todos os profissionais
 */
export function canViewAllAgendas(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Profissional vê apenas sua própria agenda
  if (isProfessional(user)) return false;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.agendaVisualizacao || false;
  }
  
  // Atendente tem permissão padrão (para manter compatibilidade)
  if (user.role === 'atendente') return true;
  
  return false;
}

/**
 * Verifica se o usuário tem acesso à aba Débitos de Pacientes
 */
export function canAccessPatientDebits(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.financeiroDebitosPacientes || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário tem acesso apenas aos seus próprios lançamentos financeiros
 */
export function canAccessOnlyOwnFinancials(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso completo
  if (hasFullAccess(user)) return false;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.financeiroApenasProprios || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário tem acesso completo ao Controle Financeiro
 */
export function hasFullFinancialAccess(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.financeiroAcessoCompleto || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário pode acessar o menu de Agenda
 */
export function canAccessAgendaMenu(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Pro e atendente têm acesso padrão
  if (user.role === 'pro' || user.role === 'atendente') return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.menuAgenda || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário pode acessar o menu de Profissionais
 */
export function canAccessProfessionalsMenu(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.menuProfissionais || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário pode acessar o menu de Clientes
 */
export function canAccessClientsMenu(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Pro e atendente têm acesso padrão
  if (user.role === 'pro' || user.role === 'atendente') return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.menuClientes || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário pode acessar o menu de Serviços
 */
export function canAccessServicesMenu(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Pro e atendente têm acesso padrão
  if (user.role === 'pro' || user.role === 'atendente') return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.menuServicos || false;
  }
  
  return false;
}

/**
 * Verifica se o usuário pode acessar o menu de Mensagens
 */
export function canAccessMessagesMenu(user: UserWithPermissions | User | null): boolean {
  if (!user) return false;
  
  // Owner e admin têm acesso total
  if (hasFullAccess(user)) return true;
  
  // Pro e atendente têm acesso padrão
  if (user.role === 'pro' || user.role === 'atendente') return true;
  
  // Para tipo 'outro', verificar permissão granular
  if (isOtherRole(user)) {
    return user.permissions?.menuMensagens || false;
  }
  
  return false;
}

/**
 * Cria um objeto de permissões padrão (todas desabilitadas)
 */
export function createDefaultPermissions(): GranularPermissions {
  return {
    agendaEdicao: false,
    agendaVisualizacao: false,
    financeiroDebitosPacientes: false,
    financeiroApenasProprios: false,
    financeiroAcessoCompleto: false,
    menuAgenda: false,
    menuProfissionais: false,
    menuClientes: false,
    menuServicos: false,
    menuMensagens: false,
  };
}

