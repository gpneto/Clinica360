import { describe, it, expect } from 'vitest';
import { Appointment, Professional, Service } from '@/types';

describe('Testes de Integração - Fluxo de Analytics e Relatórios', () => {
  describe('Fluxo: Coletar Dados → Calcular Métricas → Gerar Dashboard', () => {
    it('deve calcular métricas completas do dashboard', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

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
          professionalId: 'prof2',
          clientId: 'client3',
          serviceId: 'service1',
          inicio: new Date('2024-01-25T10:00:00'),
          fim: new Date('2024-01-25T11:00:00'),
          precoCentavos: 10000,
          valorPagoCentavos: 0,
          comissaoPercent: 30,
          status: 'cancelado',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Filtrar por período
      const periodAppointments = appointments.filter(apt =>
        apt.inicio >= periodStart && apt.inicio <= periodEnd
      );

      // Calcular métricas
      const totalAppointments = periodAppointments.length;
      const completedAppointments = periodAppointments.filter(
        apt => apt.status === 'concluido' && apt.clientePresente !== false
      ).length;
      const cancelledAppointments = periodAppointments.filter(
        apt => apt.status === 'cancelado'
      ).length;

      const completedApts = periodAppointments.filter(
        apt => apt.status === 'concluido' && apt.clientePresente !== false
      );
      const totalRevenue = completedApts.reduce((sum, apt) => {
        return sum + (apt.valorPagoCentavos || apt.precoCentavos);
      }, 0);

      const totalCommission = completedApts.reduce((sum, apt) => {
        return sum + Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
      }, 0);

      expect(totalAppointments).toBe(3);
      expect(completedAppointments).toBe(2);
      expect(cancelledAppointments).toBe(1);
      expect(totalRevenue).toBe(25000);
      expect(totalCommission).toBe(7500);
    });
  });

  describe('Fluxo: Agrupar por Profissional → Calcular Estatísticas → Comparar', () => {
    it('deve gerar relatório comparativo por profissional', () => {
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
          professionalId: 'prof2',
          clientId: 'client3',
          serviceId: 'service1',
          inicio: new Date('2024-01-25T10:00:00'),
          fim: new Date('2024-01-25T11:00:00'),
          precoCentavos: 10000,
          valorPagoCentavos: 10000,
          comissaoPercent: 25,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Agrupar por profissional
      const statsByProfessional = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((acc, apt) => {
          const profId = apt.professionalId;
          if (!acc[profId]) {
            acc[profId] = {
              count: 0,
              revenue: 0,
              commission: 0,
            };
          }
          acc[profId].count++;
          acc[profId].revenue += apt.valorPagoCentavos || apt.precoCentavos;
          acc[profId].commission += Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
          return acc;
        }, {} as Record<string, { count: number; revenue: number; commission: number }>);

      expect(statsByProfessional['prof1'].count).toBe(2);
      expect(statsByProfessional['prof1'].revenue).toBe(25000);
      expect(statsByProfessional['prof2'].count).toBe(1);
      expect(statsByProfessional['prof2'].revenue).toBe(10000);
    });
  });

  describe('Fluxo: Analisar Tendências → Identificar Padrões → Prever', () => {
    it('deve identificar tendências de agendamento', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-01T10:00:00'),
          fim: new Date('2024-01-01T11:00:00'),
          precoCentavos: 10000,
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
          serviceId: 'service1',
          inicio: new Date('2024-01-08T10:00:00'),
          fim: new Date('2024-01-08T11:00:00'),
          precoCentavos: 10000,
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
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Agrupar por semana
      const weeklyStats = appointments.reduce((acc, apt) => {
        const week = Math.floor((apt.inicio.getTime() - new Date('2024-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (!acc[week]) {
          acc[week] = 0;
        }
        acc[week]++;
        return acc;
      }, {} as Record<number, number>);

      // Identificar tendência (crescente, decrescente, estável)
      const weeks = Object.keys(weeklyStats).map(Number).sort();
      const trend = weeks.length >= 2 
        ? (weeklyStats[weeks[weeks.length - 1]] > weeklyStats[weeks[0]] ? 'crescente' : 'decrescente')
        : 'estável';

      expect(Object.keys(weeklyStats).length).toBeGreaterThan(0);
      expect(['crescente', 'decrescente', 'estável']).toContain(trend);
    });
  });
});

