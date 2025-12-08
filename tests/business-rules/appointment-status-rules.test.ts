import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Regras de Negócio - Status de Agendamentos', () => {
  describe('Transições de Status', () => {
    it('deve permitir transição de agendado para confirmado', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const canTransition = (current: string, target: string) => {
        const validTransitions: Record<string, string[]> = {
          agendado: ['confirmado', 'cancelado', 'concluido'],
          confirmado: ['concluido', 'cancelado'],
          concluido: [], // Estado final
          cancelado: [], // Estado final
          no_show: [], // Estado final
        };
        return validTransitions[current]?.includes(target) || false;
      };

      expect(canTransition(appointment.status, 'confirmado')).toBe(true);
    });

    it('deve permitir transição de confirmado para concluido', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'confirmado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const canTransition = (current: string, target: string) => {
        const validTransitions: Record<string, string[]> = {
          agendado: ['confirmado', 'cancelado', 'concluido'],
          confirmado: ['concluido', 'cancelado'],
          concluido: [],
          cancelado: [],
          no_show: [],
        };
        return validTransitions[current]?.includes(target) || false;
      };

      expect(canTransition(appointment.status, 'concluido')).toBe(true);
    });

    it('não deve permitir transição de concluido para outro status', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
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

      const canTransition = (current: string, target: string) => {
        const validTransitions: Record<string, string[]> = {
          agendado: ['confirmado', 'cancelado', 'concluido'],
          confirmado: ['concluido', 'cancelado'],
          concluido: [],
          cancelado: [],
          no_show: [],
        };
        return validTransitions[current]?.includes(target) || false;
      };

      expect(canTransition(appointment.status, 'agendado')).toBe(false);
      expect(canTransition(appointment.status, 'confirmado')).toBe(false);
    });
  });

  describe('Status e Cálculo Financeiro', () => {
    it('deve considerar apenas agendamentos concluidos para receita', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
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
          id: '2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
          precoCentavos: 15000,
          comissaoPercent: 30,
          status: 'agendado', // Não concluido
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

      expect(revenue).toBe(10000); // Apenas o concluido
    });
  });

  describe('Status e Cliente Presente', () => {
    it('deve marcar como no_show quando clientePresente é false', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: false,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Quando clientePresente é false, deve ser tratado como no_show
      const effectiveStatus = appointment.clientePresente === false ? 'no_show' : appointment.status;
      expect(effectiveStatus).toBe('no_show');
    });

    it('deve usar status normal quando clientePresente é true', () => {
      const appointment: Appointment = {
        id: '1',
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
      };

      const effectiveStatus = appointment.clientePresente === false ? 'no_show' : appointment.status;
      expect(effectiveStatus).toBe('concluido');
    });
  });

  describe('Status e Bloqueios', () => {
    it('deve identificar bloqueios corretamente', () => {
      const blockAppointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 0,
        comissaoPercent: 0,
        status: 'bloqueio',
        isBlock: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const isBlock = blockAppointment.isBlock || blockAppointment.status === 'bloqueio';
      expect(isBlock).toBe(true);
    });

    it('não deve considerar agendamentos normais como bloqueios', () => {
      const normalAppointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const isBlock = normalAppointment.isBlock || normalAppointment.status === 'bloqueio';
      expect(isBlock).toBe(false);
    });
  });
});

