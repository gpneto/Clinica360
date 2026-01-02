import { describe, it, expect, beforeEach } from 'vitest';
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
  canAccessAgendaMenu,
  canAccessMessagesMenu,
  createDefaultPermissions,
} from '@/lib/permissions';
import type { User, GranularPermissions, UserWithPermissions } from '@/types';

describe('Testes Completos de Permissões', () => {
  // Helper para criar usuário base
  const createUser = (role: User['role'], permissions?: Partial<GranularPermissions>): User => {
    const defaultPermissions: GranularPermissions = {
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

    return {
      uid: `user-${role}`,
      role,
      nome: `User ${role}`,
      email: `${role}@test.com`,
      ativo: true,
      companyId: 'company1',
      permissions: permissions ? { ...defaultPermissions, ...permissions } : undefined,
    };
  };

  describe('Funções Auxiliares', () => {
    describe('hasFullAccess', () => {
      it('deve retornar true apenas para owner e admin', () => {
        expect(hasFullAccess(createUser('owner'))).toBe(true);
        expect(hasFullAccess(createUser('admin'))).toBe(true);
        expect(hasFullAccess(createUser('pro'))).toBe(false);
        expect(hasFullAccess(createUser('atendente'))).toBe(false);
        expect(hasFullAccess(createUser('outro'))).toBe(false);
        expect(hasFullAccess(null)).toBe(false);
      });
    });

    describe('isProfessional', () => {
      it('deve identificar corretamente profissionais', () => {
        expect(isProfessional(createUser('pro'))).toBe(true);
        expect(isProfessional(createUser('owner'))).toBe(false);
        expect(isProfessional(createUser('admin'))).toBe(false);
        expect(isProfessional(createUser('atendente'))).toBe(false);
        expect(isProfessional(createUser('outro'))).toBe(false);
        expect(isProfessional(null)).toBe(false);
      });
    });

    describe('isOtherRole', () => {
      it('deve identificar corretamente role outro', () => {
        expect(isOtherRole(createUser('outro'))).toBe(true);
        expect(isOtherRole(createUser('owner'))).toBe(false);
        expect(isOtherRole(createUser('admin'))).toBe(false);
        expect(isOtherRole(createUser('pro'))).toBe(false);
        expect(isOtherRole(createUser('atendente'))).toBe(false);
        expect(isOtherRole(null)).toBe(false);
      });
    });
  });

  describe('Permissões de Agenda', () => {
    describe('canEditAppointments', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canEditAppointments(createUser('owner'))).toBe(true);
        expect(canEditAppointments(createUser('admin'))).toBe(true);
      });

      it('pro e atendente devem ter acesso padrão', () => {
        expect(canEditAppointments(createUser('pro'))).toBe(true);
        expect(canEditAppointments(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão agendaEdicao', () => {
        expect(canEditAppointments(createUser('outro', { agendaEdicao: true }))).toBe(true);
        expect(canEditAppointments(createUser('outro', { agendaEdicao: false }))).toBe(false);
        expect(canEditAppointments(createUser('outro'))).toBe(false); // sem permissões
      });

      it('deve retornar false para null', () => {
        expect(canEditAppointments(null)).toBe(false);
      });
    });

    describe('canViewAllAgendas', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canViewAllAgendas(createUser('owner'))).toBe(true);
        expect(canViewAllAgendas(createUser('admin'))).toBe(true);
      });

      it('pro não deve ver todas as agendas', () => {
        expect(canViewAllAgendas(createUser('pro'))).toBe(false);
      });

      it('atendente deve ter acesso padrão', () => {
        expect(canViewAllAgendas(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão agendaVisualizacao', () => {
        expect(canViewAllAgendas(createUser('outro', { agendaVisualizacao: true }))).toBe(true);
        expect(canViewAllAgendas(createUser('outro', { agendaVisualizacao: false }))).toBe(false);
        expect(canViewAllAgendas(createUser('outro'))).toBe(false);
      });
    });

    describe('canAccessAgendaMenu', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessAgendaMenu(createUser('owner'))).toBe(true);
        expect(canAccessAgendaMenu(createUser('admin'))).toBe(true);
      });

      it('pro e atendente devem ter acesso padrão', () => {
        expect(canAccessAgendaMenu(createUser('pro'))).toBe(true);
        expect(canAccessAgendaMenu(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão menuAgenda', () => {
        expect(canAccessAgendaMenu(createUser('outro', { menuAgenda: true }))).toBe(true);
        expect(canAccessAgendaMenu(createUser('outro', { menuAgenda: false }))).toBe(false);
        expect(canAccessAgendaMenu(createUser('outro'))).toBe(false);
      });

      it('deve retornar false para null', () => {
        expect(canAccessAgendaMenu(null)).toBe(false);
      });
    });
  });

  describe('Permissões Financeiras', () => {
    describe('canAccessPatientDebits', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessPatientDebits(createUser('owner'))).toBe(true);
        expect(canAccessPatientDebits(createUser('admin'))).toBe(true);
      });

      it('outros roles sem permissão não devem ter acesso', () => {
        expect(canAccessPatientDebits(createUser('pro'))).toBe(false);
        expect(canAccessPatientDebits(createUser('atendente'))).toBe(false);
      });

      it('outro deve verificar permissão financeiroDebitosPacientes', () => {
        expect(canAccessPatientDebits(createUser('outro', { financeiroDebitosPacientes: true }))).toBe(true);
        expect(canAccessPatientDebits(createUser('outro', { financeiroDebitosPacientes: false }))).toBe(false);
        expect(canAccessPatientDebits(createUser('outro'))).toBe(false);
      });
    });

    describe('canAccessOnlyOwnFinancials', () => {
      it('owner e admin não devem ter acesso apenas aos próprios', () => {
        expect(canAccessOnlyOwnFinancials(createUser('owner'))).toBe(false);
        expect(canAccessOnlyOwnFinancials(createUser('admin'))).toBe(false);
      });

      it('outro deve verificar permissão financeiroApenasProprios', () => {
        expect(canAccessOnlyOwnFinancials(createUser('outro', { financeiroApenasProprios: true }))).toBe(true);
        expect(canAccessOnlyOwnFinancials(createUser('outro', { financeiroApenasProprios: false }))).toBe(false);
        expect(canAccessOnlyOwnFinancials(createUser('outro'))).toBe(false);
      });
    });

    describe('hasFullFinancialAccess', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(hasFullFinancialAccess(createUser('owner'))).toBe(true);
        expect(hasFullFinancialAccess(createUser('admin'))).toBe(true);
      });

      it('outros roles sem permissão não devem ter acesso', () => {
        expect(hasFullFinancialAccess(createUser('pro'))).toBe(false);
        expect(hasFullFinancialAccess(createUser('atendente'))).toBe(false);
      });

      it('outro deve verificar permissão financeiroAcessoCompleto', () => {
        expect(hasFullFinancialAccess(createUser('outro', { financeiroAcessoCompleto: true }))).toBe(true);
        expect(hasFullFinancialAccess(createUser('outro', { financeiroAcessoCompleto: false }))).toBe(false);
        expect(hasFullFinancialAccess(createUser('outro'))).toBe(false);
      });
    });
  });

  describe('Permissões de Menus', () => {
    describe('canAccessProfessionalsMenu', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessProfessionalsMenu(createUser('owner'))).toBe(true);
        expect(canAccessProfessionalsMenu(createUser('admin'))).toBe(true);
      });

      it('outros roles sem permissão não devem ter acesso', () => {
        expect(canAccessProfessionalsMenu(createUser('pro'))).toBe(false);
        expect(canAccessProfessionalsMenu(createUser('atendente'))).toBe(false);
      });

      it('outro deve verificar permissão menuProfissionais', () => {
        expect(canAccessProfessionalsMenu(createUser('outro', { menuProfissionais: true }))).toBe(true);
        expect(canAccessProfessionalsMenu(createUser('outro', { menuProfissionais: false }))).toBe(false);
        expect(canAccessProfessionalsMenu(createUser('outro'))).toBe(false);
      });
    });

    describe('canAccessClientsMenu', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessClientsMenu(createUser('owner'))).toBe(true);
        expect(canAccessClientsMenu(createUser('admin'))).toBe(true);
      });

      it('pro e atendente devem ter acesso padrão', () => {
        expect(canAccessClientsMenu(createUser('pro'))).toBe(true);
        expect(canAccessClientsMenu(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão menuClientes', () => {
        expect(canAccessClientsMenu(createUser('outro', { menuClientes: true }))).toBe(true);
        expect(canAccessClientsMenu(createUser('outro', { menuClientes: false }))).toBe(false);
        expect(canAccessClientsMenu(createUser('outro'))).toBe(false);
      });
    });

    describe('canAccessServicesMenu', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessServicesMenu(createUser('owner'))).toBe(true);
        expect(canAccessServicesMenu(createUser('admin'))).toBe(true);
      });

      it('pro e atendente devem ter acesso padrão', () => {
        expect(canAccessServicesMenu(createUser('pro'))).toBe(true);
        expect(canAccessServicesMenu(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão menuServicos', () => {
        expect(canAccessServicesMenu(createUser('outro', { menuServicos: true }))).toBe(true);
        expect(canAccessServicesMenu(createUser('outro', { menuServicos: false }))).toBe(false);
        expect(canAccessServicesMenu(createUser('outro'))).toBe(false);
      });
    });

    describe('canAccessMessagesMenu', () => {
      it('owner e admin devem ter acesso total', () => {
        expect(canAccessMessagesMenu(createUser('owner'))).toBe(true);
        expect(canAccessMessagesMenu(createUser('admin'))).toBe(true);
      });

      it('pro e atendente devem ter acesso padrão', () => {
        expect(canAccessMessagesMenu(createUser('pro'))).toBe(true);
        expect(canAccessMessagesMenu(createUser('atendente'))).toBe(true);
      });

      it('outro deve verificar permissão menuMensagens', () => {
        expect(canAccessMessagesMenu(createUser('outro', { menuMensagens: true }))).toBe(true);
        expect(canAccessMessagesMenu(createUser('outro', { menuMensagens: false }))).toBe(false);
        expect(canAccessMessagesMenu(createUser('outro'))).toBe(false);
      });
    });
  });

  describe('createDefaultPermissions', () => {
    it('deve criar todas as permissões como false', () => {
      const permissions = createDefaultPermissions();
      
      expect(permissions.agendaEdicao).toBe(false);
      expect(permissions.agendaVisualizacao).toBe(false);
      expect(permissions.financeiroDebitosPacientes).toBe(false);
      expect(permissions.financeiroApenasProprios).toBe(false);
      expect(permissions.financeiroAcessoCompleto).toBe(false);
      expect(permissions.menuAgenda).toBe(false);
      expect(permissions.menuProfissionais).toBe(false);
      expect(permissions.menuClientes).toBe(false);
      expect(permissions.menuServicos).toBe(false);
      expect(permissions.menuMensagens).toBe(false);
    });

    it('deve retornar novo objeto a cada chamada', () => {
      const p1 = createDefaultPermissions();
      const p2 = createDefaultPermissions();
      
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
    });
  });

  describe('Cenários de Integração', () => {
    it('deve permitir owner acesso completo a tudo', () => {
      const owner = createUser('owner');
      
      expect(hasFullAccess(owner)).toBe(true);
      expect(canEditAppointments(owner)).toBe(true);
      expect(canViewAllAgendas(owner)).toBe(true);
      expect(canAccessPatientDebits(owner)).toBe(true);
      expect(hasFullFinancialAccess(owner)).toBe(true);
      expect(canAccessAgendaMenu(owner)).toBe(true);
      expect(canAccessProfessionalsMenu(owner)).toBe(true);
      expect(canAccessClientsMenu(owner)).toBe(true);
      expect(canAccessServicesMenu(owner)).toBe(true);
      expect(canAccessMessagesMenu(owner)).toBe(true);
    });

    it('deve permitir admin acesso completo a tudo', () => {
      const admin = createUser('admin');
      
      expect(hasFullAccess(admin)).toBe(true);
      expect(canEditAppointments(admin)).toBe(true);
      expect(canViewAllAgendas(admin)).toBe(true);
      expect(canAccessPatientDebits(admin)).toBe(true);
      expect(hasFullFinancialAccess(admin)).toBe(true);
      expect(canAccessAgendaMenu(admin)).toBe(true);
      expect(canAccessProfessionalsMenu(admin)).toBe(true);
      expect(canAccessClientsMenu(admin)).toBe(true);
      expect(canAccessServicesMenu(admin)).toBe(true);
      expect(canAccessMessagesMenu(admin)).toBe(true);
    });

    it('deve permitir pro acesso a agenda, clientes, serviços e mensagens', () => {
      const pro = createUser('pro');
      
      expect(hasFullAccess(pro)).toBe(false);
      expect(canEditAppointments(pro)).toBe(true);
      expect(canViewAllAgendas(pro)).toBe(false); // vê apenas sua agenda
      expect(canAccessPatientDebits(pro)).toBe(false);
      expect(hasFullFinancialAccess(pro)).toBe(false);
      expect(canAccessAgendaMenu(pro)).toBe(true);
      expect(canAccessProfessionalsMenu(pro)).toBe(false);
      expect(canAccessClientsMenu(pro)).toBe(true);
      expect(canAccessServicesMenu(pro)).toBe(true);
      expect(canAccessMessagesMenu(pro)).toBe(true);
    });

    it('deve permitir atendente acesso a agenda, clientes, serviços e mensagens', () => {
      const atendente = createUser('atendente');
      
      expect(hasFullAccess(atendente)).toBe(false);
      expect(canEditAppointments(atendente)).toBe(true);
      expect(canViewAllAgendas(atendente)).toBe(true);
      expect(canAccessPatientDebits(atendente)).toBe(false);
      expect(hasFullFinancialAccess(atendente)).toBe(false);
      expect(canAccessAgendaMenu(atendente)).toBe(true);
      expect(canAccessProfessionalsMenu(atendente)).toBe(false);
      expect(canAccessClientsMenu(atendente)).toBe(true);
      expect(canAccessServicesMenu(atendente)).toBe(true);
      expect(canAccessMessagesMenu(atendente)).toBe(true);
    });

    it('deve permitir outro com todas as permissões marcadas', () => {
      const outro = createUser('outro', {
        agendaEdicao: true,
        agendaVisualizacao: true,
        financeiroDebitosPacientes: true,
        financeiroApenasProprios: false,
        financeiroAcessoCompleto: true,
        menuAgenda: true,
        menuProfissionais: true,
        menuClientes: true,
        menuServicos: true,
        menuMensagens: true,
      });
      
      expect(hasFullAccess(outro)).toBe(false);
      expect(canEditAppointments(outro)).toBe(true);
      expect(canViewAllAgendas(outro)).toBe(true);
      expect(canAccessPatientDebits(outro)).toBe(true);
      expect(hasFullFinancialAccess(outro)).toBe(true);
      expect(canAccessAgendaMenu(outro)).toBe(true);
      expect(canAccessProfessionalsMenu(outro)).toBe(true);
      expect(canAccessClientsMenu(outro)).toBe(true);
      expect(canAccessServicesMenu(outro)).toBe(true);
      expect(canAccessMessagesMenu(outro)).toBe(true);
    });

    it('deve negar acesso para outro sem permissões', () => {
      const outro = createUser('outro');
      
      expect(hasFullAccess(outro)).toBe(false);
      expect(canEditAppointments(outro)).toBe(false);
      expect(canViewAllAgendas(outro)).toBe(false);
      expect(canAccessPatientDebits(outro)).toBe(false);
      expect(hasFullFinancialAccess(outro)).toBe(false);
      expect(canAccessAgendaMenu(outro)).toBe(false);
      expect(canAccessProfessionalsMenu(outro)).toBe(false);
      expect(canAccessClientsMenu(outro)).toBe(false);
      expect(canAccessServicesMenu(outro)).toBe(false);
      expect(canAccessMessagesMenu(outro)).toBe(false);
    });

    it('deve permitir outro com permissões parciais', () => {
      const outro = createUser('outro', {
        agendaEdicao: true,
        menuAgenda: true,
        menuClientes: true,
      });
      
      expect(canEditAppointments(outro)).toBe(true);
      expect(canViewAllAgendas(outro)).toBe(false);
      expect(canAccessAgendaMenu(outro)).toBe(true);
      expect(canAccessClientsMenu(outro)).toBe(true);
      expect(canAccessServicesMenu(outro)).toBe(false);
      expect(canAccessMessagesMenu(outro)).toBe(false);
    });
  });

  describe('Edge Cases e Validações', () => {
    it('deve lidar com usuário null em todas as funções', () => {
      expect(hasFullAccess(null)).toBe(false);
      expect(isProfessional(null)).toBe(false);
      expect(isOtherRole(null)).toBe(false);
      expect(canEditAppointments(null)).toBe(false);
      expect(canViewAllAgendas(null)).toBe(false);
      expect(canAccessPatientDebits(null)).toBe(false);
      expect(canAccessOnlyOwnFinancials(null)).toBe(false);
      expect(hasFullFinancialAccess(null)).toBe(false);
      expect(canAccessAgendaMenu(null)).toBe(false);
      expect(canAccessProfessionalsMenu(null)).toBe(false);
      expect(canAccessClientsMenu(null)).toBe(false);
      expect(canAccessServicesMenu(null)).toBe(false);
      expect(canAccessMessagesMenu(null)).toBe(false);
    });

    it('deve lidar com usuário sem permissões definidas (outro)', () => {
      const outro = createUser('outro');
      delete (outro as any).permissions;
      
      expect(canEditAppointments(outro)).toBe(false);
      expect(canViewAllAgendas(outro)).toBe(false);
      expect(canAccessPatientDebits(outro)).toBe(false);
      expect(hasFullFinancialAccess(outro)).toBe(false);
      expect(canAccessAgendaMenu(outro)).toBe(false);
      expect(canAccessProfessionalsMenu(outro)).toBe(false);
      expect(canAccessClientsMenu(outro)).toBe(false);
      expect(canAccessServicesMenu(outro)).toBe(false);
      expect(canAccessMessagesMenu(outro)).toBe(false);
    });

    it('deve lidar com permissões undefined vs false', () => {
      const outroComUndefined = createUser('outro');
      delete (outroComUndefined as any).permissions;
      
      const outroComFalse = createUser('outro', {
        menuAgenda: false,
        menuMensagens: false,
      });
      
      // Ambos devem retornar false
      expect(canAccessAgendaMenu(outroComUndefined)).toBe(false);
      expect(canAccessAgendaMenu(outroComFalse)).toBe(false);
      expect(canAccessMessagesMenu(outroComUndefined)).toBe(false);
      expect(canAccessMessagesMenu(outroComFalse)).toBe(false);
    });

    it('deve verificar que financeiroApenasProprios e financeiroAcessoCompleto são mutuamente exclusivos', () => {
      const outroApenasProprios = createUser('outro', {
        financeiroApenasProprios: true,
        financeiroAcessoCompleto: false,
      });
      
      const outroAcessoCompleto = createUser('outro', {
        financeiroApenasProprios: false,
        financeiroAcessoCompleto: true,
      });
      
      expect(canAccessOnlyOwnFinancials(outroApenasProprios)).toBe(true);
      expect(hasFullFinancialAccess(outroApenasProprios)).toBe(false);
      
      expect(canAccessOnlyOwnFinancials(outroAcessoCompleto)).toBe(false);
      expect(hasFullFinancialAccess(outroAcessoCompleto)).toBe(true);
    });
  });

  describe('Compatibilidade com UserWithPermissions', () => {
    it('deve funcionar com UserWithPermissions type', () => {
      const userWithPermissions: UserWithPermissions = {
        uid: 'user1',
        role: 'outro',
        permissions: {
          menuAgenda: true,
          menuMensagens: true,
        },
      };
      
      expect(canAccessAgendaMenu(userWithPermissions)).toBe(true);
      expect(canAccessMessagesMenu(userWithPermissions)).toBe(true);
    });

    it('deve funcionar com User type', () => {
      const user: User = createUser('outro', {
        menuAgenda: true,
        menuMensagens: true,
      });
      
      expect(canAccessAgendaMenu(user)).toBe(true);
      expect(canAccessMessagesMenu(user)).toBe(true);
    });
  });
});










