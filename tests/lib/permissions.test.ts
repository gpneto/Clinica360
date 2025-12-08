import { describe, it, expect } from 'vitest';
import {
  hasFullAccess,
  isProfessional,
  isOtherRole,
  canEditAppointments,
  canViewAllAgendas,
  canAccessPatientDebits,
  canAccessOnlyOwnFinancials,
  hasFullFinancialAccess,
  canAccessProfessionalsMenu,
  canAccessClientsMenu,
  canAccessServicesMenu,
  createDefaultPermissions,
} from '@/lib/permissions';
import type { User, GranularPermissions } from '@/types';

describe('Funções de Permissões', () => {
  describe('hasFullAccess', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(false);
    });

    it('deve retornar false para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(false);
    });

    it('deve retornar false para outro', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(hasFullAccess(null)).toBe(false);
    });

    it('deve retornar false para undefined', () => {
      expect(hasFullAccess(undefined as any)).toBe(false);
    });
  });

  describe('isProfessional', () => {
    it('deve retornar true para profissional', () => {
      const user: User = {
        uid: 'user1',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isProfessional(user)).toBe(true);
    });

    it('deve retornar false para owner', () => {
      const user: User = {
        uid: 'user2',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isProfessional(user)).toBe(false);
    });

    it('deve retornar false para admin', () => {
      const user: User = {
        uid: 'user3',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isProfessional(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(isProfessional(null)).toBe(false);
    });
  });

  describe('isOtherRole', () => {
    it('deve retornar true para outro', () => {
      const user: User = {
        uid: 'user1',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isOtherRole(user)).toBe(true);
    });

    it('deve retornar false para owner', () => {
      const user: User = {
        uid: 'user2',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isOtherRole(user)).toBe(false);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isOtherRole(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(isOtherRole(null)).toBe(false);
    });
  });

  describe('canEditAppointments', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve retornar true para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve retornar true para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve retornar true para outro com permissão agendaEdicao', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: true,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão agendaEdicao', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canEditAppointments(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canEditAppointments(null)).toBe(false);
    });
  });

  describe('canViewAllAgendas', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(false);
    });

    it('deve retornar true para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });

    it('deve retornar true para outro com permissão agendaVisualizacao', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: true,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão agendaVisualizacao', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canViewAllAgendas(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canViewAllAgendas(null)).toBe(false);
    });
  });

  describe('canAccessPatientDebits', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessPatientDebits(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessPatientDebits(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessPatientDebits(user)).toBe(false);
    });

    it('deve retornar false para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessPatientDebits(user)).toBe(false);
    });

    it('deve retornar true para outro com permissão financeiroDebitosPacientes', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: true,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessPatientDebits(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão financeiroDebitosPacientes', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessPatientDebits(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canAccessPatientDebits(null)).toBe(false);
    });
  });

  describe('canAccessOnlyOwnFinancials', () => {
    it('deve retornar false para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
    });

    it('deve retornar false para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
    });

    it('deve retornar true para outro com permissão financeiroApenasProprios', () => {
      const user: User = {
        uid: 'user4',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: true,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessOnlyOwnFinancials(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão financeiroApenasProprios', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canAccessOnlyOwnFinancials(null)).toBe(false);
    });
  });

  describe('hasFullFinancialAccess', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullFinancialAccess(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullFinancialAccess(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullFinancialAccess(user)).toBe(false);
    });

    it('deve retornar false para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullFinancialAccess(user)).toBe(false);
    });

    it('deve retornar true para outro com permissão financeiroAcessoCompleto', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: true,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(hasFullFinancialAccess(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão financeiroAcessoCompleto', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(hasFullFinancialAccess(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(hasFullFinancialAccess(null)).toBe(false);
    });
  });

  describe('canAccessProfessionalsMenu', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessProfessionalsMenu(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessProfessionalsMenu(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessProfessionalsMenu(user)).toBe(false);
    });

    it('deve retornar false para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessProfessionalsMenu(user)).toBe(false);
    });

    it('deve retornar true para outro com permissão menuProfissionais', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: true,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessProfessionalsMenu(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão menuProfissionais', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessProfessionalsMenu(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canAccessProfessionalsMenu(null)).toBe(false);
    });
  });

  describe('canAccessClientsMenu', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(false);
    });

    it('deve retornar true para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve retornar true para outro com permissão menuClientes', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: true,
          menuServicos: false,
        },
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão menuClientes', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessClientsMenu(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canAccessClientsMenu(null)).toBe(false);
    });
  });

  describe('canAccessServicesMenu', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: 'user1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessServicesMenu(user)).toBe(true);
    });

    it('deve retornar true para admin', () => {
      const user: User = {
        uid: 'user2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessServicesMenu(user)).toBe(true);
    });

    it('deve retornar false para profissional', () => {
      const user: User = {
        uid: 'user3',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessServicesMenu(user)).toBe(false);
    });

    it('deve retornar false para atendente', () => {
      const user: User = {
        uid: 'user4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessServicesMenu(user)).toBe(false);
    });

    it('deve retornar true para outro com permissão menuServicos', () => {
      const user: User = {
        uid: 'user5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: true,
        },
      };
      expect(canAccessServicesMenu(user)).toBe(true);
    });

    it('deve retornar false para outro sem permissão menuServicos', () => {
      const user: User = {
        uid: 'user6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      expect(canAccessServicesMenu(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(canAccessServicesMenu(null)).toBe(false);
    });
  });

  describe('createDefaultPermissions', () => {
    it('deve criar objeto de permissões com todas desabilitadas', () => {
      const permissions = createDefaultPermissions();
      
      expect(permissions).toEqual({
        agendaEdicao: false,
        agendaVisualizacao: false,
        financeiroDebitosPacientes: false,
        financeiroApenasProprios: false,
        financeiroAcessoCompleto: false,
        menuProfissionais: false,
        menuClientes: false,
        menuServicos: false,
      });
    });

    it('deve retornar objeto do tipo GranularPermissions', () => {
      const permissions = createDefaultPermissions();
      
      expect(permissions).toHaveProperty('agendaEdicao');
      expect(permissions).toHaveProperty('agendaVisualizacao');
      expect(permissions).toHaveProperty('financeiroDebitosPacientes');
      expect(permissions).toHaveProperty('financeiroApenasProprios');
      expect(permissions).toHaveProperty('financeiroAcessoCompleto');
      expect(permissions).toHaveProperty('menuProfissionais');
      expect(permissions).toHaveProperty('menuClientes');
      expect(permissions).toHaveProperty('menuServicos');
    });

    it('deve retornar novo objeto a cada chamada', () => {
      const permissions1 = createDefaultPermissions();
      const permissions2 = createDefaultPermissions();
      
      expect(permissions1).not.toBe(permissions2);
      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('Casos de Borda e Edge Cases', () => {
    it('deve lidar com usuário sem permissões definidas (outro)', () => {
      const user: User = {
        uid: 'user1',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        // permissions não definido
      };
      
      expect(canEditAppointments(user)).toBe(false);
      expect(canViewAllAgendas(user)).toBe(false);
      expect(canAccessPatientDebits(user)).toBe(false);
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
      expect(hasFullFinancialAccess(user)).toBe(false);
      expect(canAccessProfessionalsMenu(user)).toBe(false);
      expect(canAccessClientsMenu(user)).toBe(false);
      expect(canAccessServicesMenu(user)).toBe(false);
    });

    it('deve lidar com permissões parcialmente definidas', () => {
      const user: User = {
        uid: 'user1',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: true,
          agendaVisualizacao: false,
          financeiroDebitosPacientes: false,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: false,
          menuProfissionais: false,
          menuClientes: false,
          menuServicos: false,
        },
      };
      
      expect(canEditAppointments(user)).toBe(true);
      expect(canViewAllAgendas(user)).toBe(false);
    });

    it('deve verificar múltiplas permissões para mesmo usuário', () => {
      const user: User = {
        uid: 'user1',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: true,
          agendaVisualizacao: true,
          financeiroDebitosPacientes: true,
          financeiroApenasProprios: false,
          financeiroAcessoCompleto: true,
          menuProfissionais: true,
          menuClientes: true,
          menuServicos: true,
        },
      };
      
      expect(canEditAppointments(user)).toBe(true);
      expect(canViewAllAgendas(user)).toBe(true);
      expect(canAccessPatientDebits(user)).toBe(true);
      expect(canAccessOnlyOwnFinancials(user)).toBe(false);
      expect(hasFullFinancialAccess(user)).toBe(true);
      expect(canAccessProfessionalsMenu(user)).toBe(true);
      expect(canAccessClientsMenu(user)).toBe(true);
      expect(canAccessServicesMenu(user)).toBe(true);
    });
  });
});

