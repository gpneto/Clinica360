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
import { User, GranularPermissions } from '@/types';

describe('Regras de Negócio - Permissões', () => {
  describe('hasFullAccess', () => {
    it('deve retornar true para owner', () => {
      const user: User = {
        uid: '1',
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
        uid: '2',
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
        uid: '3',
        role: 'pro',
        nome: 'Pro',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullAccess(user)).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(hasFullAccess(null)).toBe(false);
    });
  });

  describe('isProfessional', () => {
    it('deve retornar true para role pro', () => {
      const user: User = {
        uid: '1',
        role: 'pro',
        nome: 'Pro',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isProfessional(user)).toBe(true);
    });

    it('deve retornar false para owner', () => {
      const user: User = {
        uid: '1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(isProfessional(user)).toBe(false);
    });
  });

  describe('canEditAppointments', () => {
    it('deve permitir owner editar agendamentos', () => {
      const user: User = {
        uid: '1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve permitir admin editar agendamentos', () => {
      const user: User = {
        uid: '2',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve permitir profissional editar agendamentos', () => {
      const user: User = {
        uid: '3',
        role: 'pro',
        nome: 'Pro',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve permitir atendente editar agendamentos', () => {
      const user: User = {
        uid: '4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canEditAppointments(user)).toBe(true);
    });

    it('deve verificar permissão granular para role outro', () => {
      const user: User = {
        uid: '5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: true,
        } as GranularPermissions,
      };
      expect(canEditAppointments(user)).toBe(true);

      const userWithoutPermission: User = {
        uid: '6',
        role: 'outro',
        nome: 'Outro',
        email: 'outro2@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaEdicao: false,
        } as GranularPermissions,
      };
      expect(canEditAppointments(userWithoutPermission)).toBe(false);
    });
  });

  describe('canViewAllAgendas', () => {
    it('deve permitir owner ver todas as agendas', () => {
      const user: User = {
        uid: '1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });

    it('deve negar profissional ver todas as agendas', () => {
      const user: User = {
        uid: '3',
        role: 'pro',
        nome: 'Pro',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canViewAllAgendas(user)).toBe(false);
    });

    it('deve verificar permissão granular para role outro', () => {
      const user: User = {
        uid: '5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          agendaVisualizacao: true,
        } as GranularPermissions,
      };
      expect(canViewAllAgendas(user)).toBe(true);
    });
  });

  describe('hasFullFinancialAccess', () => {
    it('deve permitir owner acesso financeiro completo', () => {
      const user: User = {
        uid: '1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(hasFullFinancialAccess(user)).toBe(true);
    });

    it('deve verificar permissão granular para role outro', () => {
      const user: User = {
        uid: '5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          financeiroAcessoCompleto: true,
        } as GranularPermissions,
      };
      expect(hasFullFinancialAccess(user)).toBe(true);
    });
  });

  describe('canAccessClientsMenu', () => {
    it('deve permitir owner acessar menu de clientes', () => {
      const user: User = {
        uid: '1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve permitir atendente acessar menu de clientes', () => {
      const user: User = {
        uid: '4',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });

    it('deve verificar permissão granular para role outro', () => {
      const user: User = {
        uid: '5',
        role: 'outro',
        nome: 'Outro',
        email: 'outro@test.com',
        ativo: true,
        companyId: 'company1',
        permissions: {
          menuClientes: true,
        } as GranularPermissions,
      };
      expect(canAccessClientsMenu(user)).toBe(true);
    });
  });

  describe('createDefaultPermissions', () => {
    it('deve criar permissões padrão com todas desabilitadas', () => {
      const permissions = createDefaultPermissions();
      expect(permissions.agendaEdicao).toBe(false);
      expect(permissions.agendaVisualizacao).toBe(false);
      expect(permissions.financeiroDebitosPacientes).toBe(false);
      expect(permissions.financeiroApenasProprios).toBe(false);
      expect(permissions.financeiroAcessoCompleto).toBe(false);
      expect(permissions.menuProfissionais).toBe(false);
      expect(permissions.menuClientes).toBe(false);
      expect(permissions.menuServicos).toBe(false);
    });
  });
});

