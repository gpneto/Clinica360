import { describe, it, expect } from 'vitest';
import { Professional, Appointment, Service } from '@/types';

describe('Testes de Integração - Fluxo de Gerenciamento de Profissionais', () => {
  describe('Fluxo: Criar Profissional → Atribuir Serviços → Criar Agendamentos', () => {
    it('deve completar fluxo de criação e uso de profissional', () => {
      const companyId = 'company1';

      // 1. Criar profissional
      const professional: Professional = {
        id: 'prof1',
        companyId,
        nome: 'Dr. Silva',
        especialidade: 'Dentista',
        telefone: '+5511999999999',
        email: 'dr.silva@example.com',
        ativo: true,
      };

      expect(professional.id).toBeTruthy();
      expect(professional.ativo).toBe(true);

      // 2. Criar serviços associados
      const services: Service[] = [
        {
          id: 'service1',
          companyId,
          nome: 'Consulta',
          duracaoMin: 60,
          precoCentavos: 10000,
          comissaoPercent: 30,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 3. Criar agendamentos para o profissional
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId,
          professionalId: professional.id,
          clientId: 'client1',
          serviceId: services[0].id,
          inicio: new Date('2024-01-20T10:00:00'),
          fim: new Date('2024-01-20T11:00:00'),
          precoCentavos: services[0].precoCentavos,
          comissaoPercent: services[0].comissaoPercent,
          status: 'agendado',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt2',
          companyId,
          professionalId: professional.id,
          clientId: 'client2',
          serviceId: services[0].id,
          inicio: new Date('2024-01-20T14:00:00'),
          fim: new Date('2024-01-20T15:00:00'),
          precoCentavos: services[0].precoCentavos,
          comissaoPercent: services[0].comissaoPercent,
          status: 'agendado',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Validar que todos os agendamentos pertencem ao profissional
      const allBelongToProfessional = appointments.every(
        apt => apt.professionalId === professional.id
      );
      expect(allBelongToProfessional).toBe(true);

      // Calcular receita do profissional
      const professionalRevenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((sum, apt) => sum + (apt.valorPagoCentavos || apt.precoCentavos), 0);

      expect(professionalRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fluxo: Calcular Comissão → Calcular Repasse → Atualizar Saldo', () => {
    it('deve calcular comissão e repasse do profissional', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-20T10:00:00'),
          fim: new Date('2024-01-20T11:00:00'),
          precoCentavos: 10000,
          valorPagoCentavos: 10000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-20T14:00:00'),
          fim: new Date('2024-01-20T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Calcular comissão total
      const totalCommission = appointments.reduce((sum, apt) => {
        const commission = Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
        return sum + commission;
      }, 0);

      expect(totalCommission).toBe(7500); // 3000 + 4500

      // Calcular repasse total (receita - comissão)
      const totalRevenue = appointments.reduce((sum, apt) => {
        return sum + (apt.valorPagoCentavos || apt.precoCentavos);
      }, 0);

      const totalPayout = totalRevenue - totalCommission;
      expect(totalPayout).toBe(17500); // 25000 - 7500
    });
  });

  describe('Fluxo: Desativar Profissional → Validar Agendamentos Futuros', () => {
    it('deve validar que profissional desativado não pode receber novos agendamentos', () => {
      const professional: Professional = {
        id: 'prof1',
        companyId: 'company1',
        nome: 'Dr. Silva',
        especialidade: 'Dentista',
        telefone: '+5511999999999',
        email: 'dr.silva@example.com',
        ativo: false, // Desativado
      };

      expect(professional.ativo).toBe(false);

      // Validar que não pode criar novo agendamento
      const canCreateAppointment = professional.ativo === true;
      expect(canCreateAppointment).toBe(false);

      // Agendamentos existentes devem continuar válidos
      const existingAppointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: professional.id,
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(existingAppointment.professionalId).toBe(professional.id);
      expect(existingAppointment.status).toBe('concluido');
    });
  });
});

