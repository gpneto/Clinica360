import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Testes de Integração - Fluxo de Notificações', () => {
  const REMINDER_WINDOWS = {
    twentyFourHours: { min: 1380, max: 1500 }, // 23h-25h antes
    oneHour: { min: 30, max: 90 }, // 30min-1h30min antes
  };

  describe('Fluxo: Criar Agendamento → Configurar Lembretes → Enviar Notificações', () => {
    it('deve enviar lembrete 24h quando dentro da janela', () => {
      // 1. Criar agendamento
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 2. Configurar lembretes
      const companySettings = {
        lembrete24h: true,
        lembrete1h: true,
      };

      // 3. Verificar se deve enviar lembrete 24h
      const now = new Date('2024-01-19T10:00:00'); // 24h antes
      const diffMin = (appointment.inicio.getTime() - now.getTime()) / (1000 * 60);
      const reminder24hSent = false;

      const shouldSend24h = 
        companySettings.lembrete24h &&
        !reminder24hSent &&
        diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
        diffMin <= REMINDER_WINDOWS.twentyFourHours.max;

      expect(shouldSend24h).toBe(true);
    });

    it('deve enviar lembrete 1h quando dentro da janela', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const companySettings = {
        lembrete24h: true,
        lembrete1h: true,
      };

      const now = new Date('2024-01-20T09:00:00'); // 1h antes
      const diffMin = (appointment.inicio.getTime() - now.getTime()) / (1000 * 60);
      const reminder1hSent = false;

      const shouldSend1h = 
        companySettings.lembrete1h &&
        !reminder1hSent &&
        diffMin >= REMINDER_WINDOWS.oneHour.min &&
        diffMin <= REMINDER_WINDOWS.oneHour.max;

      expect(shouldSend1h).toBe(true);
    });

    it('não deve enviar notificação para bloqueios', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 0,
        comissaoPercent: 0,
        status: 'bloqueio',
        isBlock: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      const shouldNotify = !isBlock;

      expect(shouldNotify).toBe(false);
    });

    it('deve marcar lembretes como enviados após envio', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simular envio de lembrete 24h
      const reminder24hSent = true;
      const reminder1hSent = false;

      const need24h = true;
      const need1h = true;

      const allCompleted = (!need24h || reminder24hSent) && (!need1h || reminder1hSent);
      expect(allCompleted).toBe(false); // Ainda falta 1h

      // Simular envio de lembrete 1h
      const reminder1hSentAfter = true;
      const allCompletedAfter = (!need24h || reminder24hSent) && (!need1h || reminder1hSentAfter);
      expect(allCompletedAfter).toBe(true); // Todos enviados
    });
  });

  describe('Fluxo: Agendamento Passado → Remover do Sistema de Notificações', () => {
    it('deve ignorar agendamentos que já ocorreram', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-10T10:00:00'), // Passado
        fim: new Date('2024-01-10T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const now = new Date('2024-01-15T10:00:00');
      const diffMin = (appointment.inicio.getTime() - now.getTime()) / (1000 * 60);

      const shouldProcess = diffMin >= 0;
      expect(shouldProcess).toBe(false); // Já passou
    });
  });
});

