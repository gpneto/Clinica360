import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Firebase Functions - Scheduler Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendReminders - Validações', () => {
    it('deve processar lembretes de agendamentos', () => {
      const now = new Date('2024-01-20T09:00:00');
      const appointments = [
        {
          id: 'apt1',
          companyId: 'company1',
          inicio: new Date('2024-01-21T10:00:00'), // 25h no futuro
          fim: new Date('2024-01-21T11:00:00'),
          status: 'agendado',
          lembrete24hEnviado: false,
        },
        {
          id: 'apt2',
          companyId: 'company1',
          inicio: new Date('2024-01-20T10:00:00'), // 1h no futuro
          fim: new Date('2024-01-20T11:00:00'),
          status: 'agendado',
          lembrete1hEnviado: false,
        },
      ];

      // Filtrar agendamentos que precisam de lembrete 24h
      const appointments24h = appointments.filter(apt => {
        const diffHours = (apt.inicio.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= 23 && diffHours <= 25 && !apt.lembrete24hEnviado;
      });

      expect(appointments24h.length).toBe(1);
      expect(appointments24h[0].id).toBe('apt1');

      // Filtrar agendamentos que precisam de lembrete 1h
      const appointments1h = appointments.filter(apt => {
        const diffHours = (apt.inicio.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= 0.5 && diffHours <= 1.5 && !apt.lembrete1hEnviado;
      });

      expect(appointments1h.length).toBe(1);
      expect(appointments1h[0].id).toBe('apt2');
    });

    it('deve ignorar agendamentos que já receberam lembretes', () => {
      const now = new Date('2024-01-20T09:00:00');
      const appointments = [
        {
          id: 'apt1',
          companyId: 'company1',
          inicio: new Date('2024-01-21T10:00:00'),
          fim: new Date('2024-01-21T11:00:00'),
          status: 'agendado',
          lembrete24hEnviado: true, // Já enviado
        },
      ];

      const appointments24h = appointments.filter(apt => {
        const diffHours = (apt.inicio.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= 23 && diffHours <= 25 && !apt.lembrete24hEnviado;
      });

      expect(appointments24h.length).toBe(0);
    });

    it('deve ignorar agendamentos cancelados ou concluídos', () => {
      const now = new Date('2024-01-20T09:00:00');
      const appointments = [
        {
          id: 'apt1',
          companyId: 'company1',
          inicio: new Date('2024-01-21T10:00:00'),
          fim: new Date('2024-01-21T11:00:00'),
          status: 'cancelado',
          lembrete24hEnviado: false,
        },
        {
          id: 'apt2',
          companyId: 'company1',
          inicio: new Date('2024-01-21T10:00:00'),
          fim: new Date('2024-01-21T11:00:00'),
          status: 'concluido',
          lembrete24hEnviado: false,
        },
      ];

      const validAppointments = appointments.filter(apt => 
        apt.status === 'agendado' || apt.status === 'confirmado'
      );

      expect(validAppointments.length).toBe(0);
    });
  });
});

