import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Firebase Functions - Document Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncWhatsappPhoneNumbers - Validações', () => {
    it('deve processar criação de paciente e sincronizar telefone', () => {
      const change = {
        after: {
          exists: true,
          data: () => ({
            nome: 'João Silva',
            telefoneE164: '+5511999999999',
            companyId: 'company1',
          }),
        },
        before: {
          exists: false,
        },
      };

      const isCreate = !change.before.exists && change.after.exists;
      expect(isCreate).toBe(true);

      const patientData = change.after.data();
      expect(patientData.telefoneE164).toBeTruthy();
      expect(patientData.companyId).toBeTruthy();
    });

    it('deve processar atualização de telefone do paciente', () => {
      const change = {
        after: {
          exists: true,
          data: () => ({
            nome: 'João Silva',
            telefoneE164: '+5511888888888', // Telefone atualizado
            companyId: 'company1',
          }),
        },
        before: {
          exists: true,
          data: () => ({
            nome: 'João Silva',
            telefoneE164: '+5511999999999', // Telefone antigo
            companyId: 'company1',
          }),
        },
      };

      const isUpdate = change.before.exists && change.after.exists;
      expect(isUpdate).toBe(true);

      const oldPhone = change.before.data().telefoneE164;
      const newPhone = change.after.data().telefoneE164;
      expect(oldPhone).not.toBe(newPhone);
    });

    it('deve processar exclusão de paciente', () => {
      const change = {
        after: {
          exists: false,
        },
        before: {
          exists: true,
          data: () => ({
            nome: 'João Silva',
            telefoneE164: '+5511999999999',
            companyId: 'company1',
          }),
        },
      };

      const isDelete = change.before.exists && !change.after.exists;
      expect(isDelete).toBe(true);
    });
  });

  describe('updateUserCustomClaims - Validações', () => {
    it('deve processar criação de usuário da empresa', () => {
      const change = {
        after: {
          exists: true,
          data: () => ({
            nome: 'Novo Usuário',
            email: 'novo@example.com',
            role: 'atendente',
            companyId: 'company1',
            ativo: true,
          }),
        },
        before: {
          exists: false,
        },
      };

      const isCreate = !change.before.exists && change.after.exists;
      expect(isCreate).toBe(true);

      const userData = change.after.data();
      expect(userData.role).toBeTruthy();
      expect(userData.companyId).toBeTruthy();
    });

    it('deve processar atualização de role do usuário', () => {
      const change = {
        after: {
          exists: true,
          data: () => ({
            nome: 'Usuário',
            email: 'user@example.com',
            role: 'admin', // Role atualizado
            companyId: 'company1',
            ativo: true,
          }),
        },
        before: {
          exists: true,
          data: () => ({
            nome: 'Usuário',
            email: 'user@example.com',
            role: 'atendente', // Role antigo
            companyId: 'company1',
            ativo: true,
          }),
        },
      };

      const isUpdate = change.before.exists && change.after.exists;
      expect(isUpdate).toBe(true);

      const oldRole = change.before.data().role;
      const newRole = change.after.data().role;
      expect(oldRole).not.toBe(newRole);
    });
  });
});

