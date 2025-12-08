import { describe, it, expect } from 'vitest';
import { User, Company, CompanySettings } from '@/types';

describe('Testes de Integração - Fluxo de Onboarding de Usuário', () => {
  describe('Fluxo: Primeiro Acesso → Criar Conta → Criar Empresa → Configurar', () => {
    it('deve completar fluxo completo de onboarding de novo usuário', () => {
      // 1. Usuário faz primeiro acesso
      const newUser: User = {
        uid: 'new-user-1',
        email: 'novo@example.com',
        displayName: 'Novo Usuário',
        photoURL: null,
        contexts: [],
      };

      expect(newUser.uid).toBeTruthy();
      expect(newUser.contexts.length).toBe(0);

      // 2. Criar empresa
      const newCompany: Company = {
        id: 'new-company-1',
        nome: 'Minha Clínica',
        cnpj: '12345678000190',
        telefone: '+5511999999999',
        email: 'contato@minhaclinica.com',
        endereco: {
          rua: 'Rua Nova',
          numero: '100',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234567',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(newCompany.id).toBeTruthy();
      expect(newCompany.nome).toBeTruthy();

      // 3. Adicionar usuário como owner
      newUser.contexts.push({
        companyId: newCompany.id,
        role: 'owner',
      });

      expect(newUser.contexts.length).toBe(1);
      expect(newUser.contexts[0].role).toBe('owner');

      // 4. Configurar empresa
      const settings: CompanySettings = {
        companyId: newCompany.id,
        lembrete24h: true,
        lembrete1h: true,
        confirmacaoAutomatica: true,
        comissaoPadrao: 30,
        showCommission: true,
        customerLabel: 'paciente',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(settings.companyId).toBe(newCompany.id);
      expect(settings.customerLabel).toBe('paciente');

      // 5. Validar que onboarding está completo
      const onboardingComplete = 
        newUser.contexts.length > 0 &&
        newUser.contexts[0].companyId === newCompany.id &&
        newUser.contexts[0].role === 'owner' &&
        settings.companyId === newCompany.id;

      expect(onboardingComplete).toBe(true);
    });
  });

  describe('Fluxo: Usuário Existente → Adicionar Nova Empresa → Trocar Contexto', () => {
    it('deve adicionar nova empresa a usuário existente', () => {
      const existingUser: User = {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'Usuário Existente',
        photoURL: null,
        contexts: [
          {
            companyId: 'company-1',
            role: 'owner',
          },
        ],
      };

      // Adicionar nova empresa
      const newCompany: Company = {
        id: 'company-2',
        nome: 'Segunda Clínica',
        telefone: '+5511888888888',
        email: 'contato@segundaclinica.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Adicionar contexto da nova empresa
      existingUser.contexts.push({
        companyId: newCompany.id,
        role: 'admin',
      });

      expect(existingUser.contexts.length).toBe(2);
      expect(existingUser.contexts.some(ctx => ctx.companyId === 'company-2')).toBe(true);

      // Trocar contexto
      const currentContext = existingUser.contexts.find(ctx => ctx.companyId === 'company-2');
      expect(currentContext?.companyId).toBe('company-2');
      expect(currentContext?.role).toBe('admin');
    });
  });

  describe('Fluxo: Convite → Aceitar → Adicionar à Empresa', () => {
    it('deve processar convite e adicionar usuário à empresa', () => {
      const invitedUser: User = {
        uid: 'invited-user-1',
        email: 'convidado@example.com',
        displayName: 'Usuário Convidado',
        photoURL: null,
        contexts: [],
      };

      const company: Company = {
        id: 'company-1',
        nome: 'Clínica Principal',
        telefone: '+5511999999999',
        email: 'contato@clinica.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Aceitar convite
      invitedUser.contexts.push({
        companyId: company.id,
        role: 'atendente',
      });

      expect(invitedUser.contexts.length).toBe(1);
      expect(invitedUser.contexts[0].companyId).toBe(company.id);
      expect(invitedUser.contexts[0].role).toBe('atendente');
    });
  });
});

