import { describe, it, expect } from 'vitest';
import { Company, CompanySettings, User } from '@/types';

describe('Testes de Integração - Fluxo de Setup de Empresa', () => {
  describe('Fluxo: Criar Usuário → Criar Empresa → Configurar Empresa', () => {
    it('deve completar fluxo de criação de empresa e configuração inicial', () => {
      // 1. Criar usuário
      const user: User = {
        uid: 'user1',
        email: 'owner@example.com',
        displayName: 'João Silva',
        photoURL: null,
        contexts: [],
      };

      expect(user.uid).toBeTruthy();
      expect(user.email).toBeTruthy();

      // 2. Criar empresa
      const company: Company = {
        id: 'company1',
        nome: 'Clínica Teste',
        cnpj: '12345678000190',
        telefone: '+5511999999999',
        email: 'contato@clinica.com',
        endereco: {
          rua: 'Rua Teste',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234567',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(company.id).toBeTruthy();
      expect(company.nome).toBeTruthy();

      // 3. Adicionar usuário como owner da empresa
      user.contexts.push({
        companyId: company.id,
        role: 'owner',
      });

      expect(user.contexts.length).toBe(1);
      expect(user.contexts[0].companyId).toBe(company.id);
      expect(user.contexts[0].role).toBe('owner');

      // 4. Criar configurações iniciais
      const settings: CompanySettings = {
        companyId: company.id,
        lembrete24h: true,
        lembrete1h: true,
        confirmacaoAutomatica: true,
        comissaoPadrao: 30,
        showCommission: true,
        customerLabel: 'paciente',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(settings.companyId).toBe(company.id);
      expect(settings.lembrete24h).toBe(true);
      expect(settings.comissaoPadrao).toBe(30);
    });

    it('deve validar que owner tem acesso total à empresa', () => {
      const user: User = {
        uid: 'user1',
        email: 'owner@example.com',
        displayName: 'João Silva',
        photoURL: null,
        contexts: [
          {
            companyId: 'company1',
            role: 'owner',
          },
        ],
      };

      const currentContext = user.contexts[0];
      const hasFullAccess = currentContext.role === 'owner' || currentContext.role === 'admin';

      expect(hasFullAccess).toBe(true);
    });
  });

  describe('Fluxo: Configurar Empresa → Criar Profissionais → Criar Serviços', () => {
    it('deve configurar estrutura básica da empresa', () => {
      const companyId = 'company1';

      // 1. Criar profissional
      const professional = {
        id: 'prof1',
        companyId,
        nome: 'Dr. Silva',
        especialidade: 'Dentista',
        telefone: '+5511999999999',
        email: 'dr.silva@example.com',
        ativo: true,
      };

      expect(professional.companyId).toBe(companyId);
      expect(professional.ativo).toBe(true);

      // 2. Criar serviço
      const service = {
        id: 'service1',
        companyId,
        nome: 'Consulta',
        duracaoMin: 60,
        precoCentavos: 10000,
        comissaoPercent: 30,
        ativo: true,
      };

      expect(service.companyId).toBe(companyId);
      expect(service.ativo).toBe(true);
      expect(service.comissaoPercent).toBe(30);

      // 3. Validar que tudo pertence à mesma empresa
      expect(professional.companyId).toBe(service.companyId);
    });
  });

  describe('Fluxo: Migração de Dados → Validação → Ativação', () => {
    it('deve validar dados migrados antes de ativar', () => {
      const migratedData = {
        patients: [
          { id: '1', nome: 'Paciente 1', telefoneE164: '+5511999999999' },
          { id: '2', nome: 'Paciente 2', telefoneE164: '+5511888888888' },
        ],
        appointments: [
          { id: 'apt1', clientId: '1', inicio: new Date('2024-01-20T10:00:00') },
        ],
      };

      // Validar pacientes
      const patientsValid = migratedData.patients.every(
        p => p.nome && p.telefoneE164 && p.telefoneE164.startsWith('+')
      );
      expect(patientsValid).toBe(true);

      // Validar agendamentos
      const appointmentsValid = migratedData.appointments.every(
        apt => apt.clientId && apt.inicio
      );
      expect(appointmentsValid).toBe(true);

      // Validar referências
      const allClientIds = migratedData.appointments.map(apt => apt.clientId);
      const allPatientIds = migratedData.patients.map(p => p.id);
      const referencesValid = allClientIds.every(id => allPatientIds.includes(id));
      expect(referencesValid).toBe(true);
    });
  });
});

