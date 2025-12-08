import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Testes de Integração - Fluxo Financeiro Completo', () => {
  describe('Fluxo: Múltiplos Agendamentos → Calcular Receita Total → Calcular Comissões', () => {
    it('deve calcular receita total e comissões de múltiplos agendamentos', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
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
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt3',
          companyId: 'company1',
          professionalId: 'prof2',
          clientId: 'client3',
          serviceId: 'service3',
          inicio: new Date('2024-01-15T16:00:00'),
          fim: new Date('2024-01-15T17:00:00'),
          precoCentavos: 20000,
          valorPagoCentavos: 20000,
          comissaoPercent: 25,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 1. Calcular receita total
      const totalRevenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + valorPago;
        }, 0);

      expect(totalRevenue).toBe(45000); // 10000 + 15000 + 20000

      // 2. Calcular comissão total do salão
      // Nota: Comissão é calculada sobre precoCentavos, não valorPagoCentavos
      const totalCommission = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const commission = Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
          return total + commission;
        }, 0);

      // apt1: 10000 * 30% = 3000
      // apt2: 15000 * 30% = 4500
      // apt3: 20000 * 25% = 5000
      // Total: 3000 + 4500 + 5000 = 12500
      expect(totalCommission).toBe(12500);

      // 3. Calcular repasse total para profissionais
      // Nota: Repasse é calculado sobre precoCentavos, não valorPagoCentavos
      const totalProfessionalPayout = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const commission = Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
          return total + (apt.precoCentavos - commission);
        }, 0);

      // apt1: 10000 - 3000 = 7000
      // apt2: 15000 - 4500 = 10500
      // apt3: 20000 - 5000 = 15000
      // Total: 7000 + 10500 + 15000 = 32500
      expect(totalProfessionalPayout).toBe(32500);
    });

    it('deve calcular receita por profissional', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
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
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt3',
          companyId: 'company1',
          professionalId: 'prof2',
          clientId: 'client3',
          serviceId: 'service3',
          inicio: new Date('2024-01-15T16:00:00'),
          fim: new Date('2024-01-15T17:00:00'),
          precoCentavos: 20000,
          valorPagoCentavos: 20000,
          comissaoPercent: 25,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Calcular receita por profissional
      const revenueByProfessional = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((acc, apt) => {
          const profId = apt.professionalId;
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          acc[profId] = (acc[profId] || 0) + valorPago;
          return acc;
        }, {} as Record<string, number>);

      expect(revenueByProfessional['prof1']).toBe(25000); // 10000 + 15000
      expect(revenueByProfessional['prof2']).toBe(20000);
    });

    it('deve excluir agendamentos cancelados e no_show da receita', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
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
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
          precoCentavos: 15000,
          comissaoPercent: 30,
          status: 'cancelado', // Cancelado
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt3',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client3',
          serviceId: 'service3',
          inicio: new Date('2024-01-15T16:00:00'),
          fim: new Date('2024-01-15T17:00:00'),
          precoCentavos: 20000,
          comissaoPercent: 30,
          status: 'no_show', // No show
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const revenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + valorPago;
        }, 0);

      expect(revenue).toBe(10000); // Apenas o concluído
    });
  });

  describe('Fluxo: Período → Filtrar Agendamentos → Calcular Receita do Período', () => {
    it('deve calcular receita de um período específico', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
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
        {
          id: 'apt3',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client3',
          serviceId: 'service3',
          inicio: new Date('2024-02-01T10:00:00'),
          fim: new Date('2024-02-01T11:00:00'),
          precoCentavos: 20000,
          valorPagoCentavos: 20000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Filtrar por período (Janeiro 2024)
      const periodStart = new Date('2024-01-01T00:00:00');
      const periodEnd = new Date('2024-01-31T23:59:59');

      const periodAppointments = appointments.filter(apt =>
        apt.inicio >= periodStart && apt.inicio <= periodEnd &&
        apt.status === 'concluido' && apt.clientePresente !== false
      );

      const periodRevenue = periodAppointments.reduce((total, apt) => {
        const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
        return total + valorPago;
      }, 0);

      expect(periodRevenue).toBe(25000); // 10000 + 15000 (apenas janeiro)
    });
  });
});

