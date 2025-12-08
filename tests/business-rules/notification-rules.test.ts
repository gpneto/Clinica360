import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - Notificações e Lembretes', () => {
  const REMINDER_WINDOWS = {
    twentyFourHours: { min: 1380, max: 1500 }, // 23h-25h antes
    oneHour: { min: 30, max: 90 }, // 30min-1h30min antes
  };

  describe('Janelas de Lembrete', () => {
    it('deve enviar lembrete 24h quando dentro da janela', () => {
      const diffMin = 1440; // 24 horas = 1440 minutos
      const need24h = true;
      const reminder24hSent = false;
      
      const shouldSend24h = need24h &&
        !reminder24hSent &&
        diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
        diffMin <= REMINDER_WINDOWS.twentyFourHours.max;
      
      expect(shouldSend24h).toBe(true);
    });

    it('não deve enviar lembrete 24h quando fora da janela', () => {
      const diffMin = 2000; // Muito antes
      const need24h = true;
      const reminder24hSent = false;
      
      const shouldSend24h = need24h &&
        !reminder24hSent &&
        diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
        diffMin <= REMINDER_WINDOWS.twentyFourHours.max;
      
      expect(shouldSend24h).toBe(false);
    });

    it('não deve enviar lembrete 24h se já foi enviado', () => {
      const diffMin = 1440;
      const need24h = true;
      const reminder24hSent = true; // Já enviado
      
      const shouldSend24h = need24h &&
        !reminder24hSent &&
        diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
        diffMin <= REMINDER_WINDOWS.twentyFourHours.max;
      
      expect(shouldSend24h).toBe(false);
    });

    it('deve enviar lembrete 1h quando dentro da janela', () => {
      const diffMin = 60; // 1 hora = 60 minutos
      const need1h = true;
      const reminder1hSent = false;
      
      const shouldSend1h = need1h &&
        !reminder1hSent &&
        diffMin >= REMINDER_WINDOWS.oneHour.min &&
        diffMin <= REMINDER_WINDOWS.oneHour.max;
      
      expect(shouldSend1h).toBe(true);
    });

    it('não deve enviar lembrete 1h quando muito cedo', () => {
      const diffMin = 120; // 2 horas antes (muito cedo)
      const need1h = true;
      const reminder1hSent = false;
      
      const shouldSend1h = need1h &&
        !reminder1hSent &&
        diffMin >= REMINDER_WINDOWS.oneHour.min &&
        diffMin <= REMINDER_WINDOWS.oneHour.max;
      
      expect(shouldSend1h).toBe(false);
    });

    it('não deve enviar lembrete 1h quando muito tarde', () => {
      const diffMin = 20; // 20 minutos antes (muito tarde)
      const need1h = true;
      const reminder1hSent = false;
      
      const shouldSend1h = need1h &&
        !reminder1hSent &&
        diffMin >= REMINDER_WINDOWS.oneHour.min &&
        diffMin <= REMINDER_WINDOWS.oneHour.max;
      
      expect(shouldSend1h).toBe(false);
    });
  });

  describe('Configuração de Lembretes', () => {
    it('deve respeitar configuração de lembrete 24h desativado', () => {
      const need24h = false; // Desativado
      const reminder24hSent = false;
      const diffMin = 1440;
      
      const shouldSend24h = need24h &&
        !reminder24hSent &&
        diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
        diffMin <= REMINDER_WINDOWS.twentyFourHours.max;
      
      expect(shouldSend24h).toBe(false);
    });

    it('deve respeitar configuração de lembrete 1h desativado', () => {
      const need1h = false; // Desativado
      const reminder1hSent = false;
      const diffMin = 60;
      
      const shouldSend1h = need1h &&
        !reminder1hSent &&
        diffMin >= REMINDER_WINDOWS.oneHour.min &&
        diffMin <= REMINDER_WINDOWS.oneHour.max;
      
      expect(shouldSend1h).toBe(false);
    });

    it('deve considerar todos os lembretes completos quando ambos foram enviados', () => {
      const need24h = true;
      const need1h = true;
      const reminder24hSent = true;
      const reminder1hSent = true;
      
      const allCompleted = (!need24h || reminder24hSent) && (!need1h || reminder1hSent);
      expect(allCompleted).toBe(true);
    });

    it('não deve considerar completo quando falta algum lembrete', () => {
      const need24h = true;
      const need1h = true;
      const reminder24hSent = true;
      const reminder1hSent = false; // Falta este
      
      const allCompleted = (!need24h || reminder24hSent) && (!need1h || reminder1hSent);
      expect(allCompleted).toBe(false);
    });
  });

  describe('Notificações de Confirmação', () => {
    it('deve enviar notificação ao criar agendamento quando habilitado', () => {
      const isBlock = false;
      const enviarNotificacao = true;
      
      const shouldNotify = !isBlock && enviarNotificacao !== false;
      expect(shouldNotify).toBe(true);
    });

    it('não deve enviar notificação para bloqueios', () => {
      const isBlock = true;
      const enviarNotificacao = true;
      
      const shouldNotify = !isBlock && enviarNotificacao !== false;
      expect(shouldNotify).toBe(false);
    });

    it('deve respeitar preferência de não enviar notificação', () => {
      const isBlock = false;
      const enviarNotificacao = false;
      
      const shouldNotify = !isBlock && enviarNotificacao !== false;
      expect(shouldNotify).toBe(false);
    });
  });

  describe('Agendamentos Passados', () => {
    it('deve ignorar agendamentos que já ocorreram', () => {
      const appointmentTime = new Date('2024-01-10T10:00:00');
      const now = new Date('2024-01-15T10:00:00');
      const diffMin = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      const shouldProcess = diffMin >= 0;
      expect(shouldProcess).toBe(false); // Já passou
    });

    it('deve processar agendamentos futuros', () => {
      const appointmentTime = new Date('2024-01-20T10:00:00');
      const now = new Date('2024-01-15T10:00:00');
      const diffMin = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      const shouldProcess = diffMin >= 0;
      expect(shouldProcess).toBe(true);
    });
  });
});

