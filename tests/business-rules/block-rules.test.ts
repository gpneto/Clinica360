import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Regras de Negócio - Bloqueios de Agenda', () => {
  describe('Identificação de Bloqueios', () => {
    it('deve identificar bloqueio por isBlock', () => {
      const appointment: Appointment = {
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

      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      expect(isBlock).toBe(true);
    });

    it('deve identificar bloqueio por status', () => {
      const appointment: Appointment = {
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
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      expect(isBlock).toBe(true);
    });

    it('não deve identificar agendamento normal como bloqueio', () => {
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

      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      expect(isBlock).toBe(false);
    });
  });

  describe('Escopo de Bloqueios', () => {
    it('deve aplicar bloqueio para profissional específico', () => {
      const blockScope = 'single';
      const professionalId = 'prof1';
      
      const targetProfessionalId = blockScope === 'all' ? '__all__' : professionalId;
      expect(targetProfessionalId).toBe('prof1');
    });

    it('deve aplicar bloqueio para todos os profissionais', () => {
      const blockScope = 'all';
      const professionalId = 'prof1';
      
      const targetProfessionalId = blockScope === 'all' ? '__all__' : professionalId;
      expect(targetProfessionalId).toBe('__all__');
    });
  });

  describe('Bloqueios e Validações', () => {
    it('não deve permitir recorrência em bloqueios', () => {
      const isBlock = true;
      const recurrenceEnabled = true;
      
      const canHaveRecurrence = !isBlock && recurrenceEnabled;
      expect(canHaveRecurrence).toBe(false);
    });

    it('não deve enviar notificações para bloqueios', () => {
      const isBlock = true;
      const enviarNotificacao = true;
      
      const shouldNotify = !isBlock && enviarNotificacao !== false;
      expect(shouldNotify).toBe(false);
    });

    it('não deve considerar bloqueios em cálculos financeiros', () => {
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
          precoCentavos: 0,
          comissaoPercent: 0,
          status: 'bloqueio',
          isBlock: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const revenue = appointments
        .filter(apt => !apt.isBlock && apt.status !== 'bloqueio' && apt.status === 'concluido')
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + (apt.clientePresente !== false ? valorPago : 0);
        }, 0);

      expect(revenue).toBe(10000); // Apenas o agendamento normal
    });
  });

  describe('Filtros de Bloqueios', () => {
    it('deve filtrar bloqueios ao listar agendamentos normais', () => {
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
          status: 'agendado',
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
          precoCentavos: 0,
          comissaoPercent: 0,
          status: 'bloqueio',
          isBlock: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const normalAppointments = appointments.filter(
        apt => !apt.isBlock && apt.status !== 'bloqueio'
      );

      expect(normalAppointments.length).toBe(1);
      expect(normalAppointments[0].id).toBe('1');
    });
  });
});

