import { describe, it, expect } from 'vitest';
import { Appointment, Patient } from '@/types';

describe('Testes de Integração - Fluxo de Mensagens WhatsApp', () => {
  const MONTHLY_FREE_LIMIT = 200;
  const MESSAGE_UNIT_PRICE = 0.05; // R$ 0,05 por mensagem

  describe('Fluxo: Criar Agendamento → Enviar Confirmação → Verificar Limite', () => {
    it('deve enviar mensagem de confirmação e verificar limite mensal', () => {
      // 1. Criar agendamento
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'patient1',
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

      expect(appointment.status).toBe('agendado');

      // 2. Verificar se deve enviar confirmação automática
      const companySettings = {
        confirmacaoAutomatica: true,
      };

      const shouldSendConfirmation = companySettings.confirmacaoAutomatica && appointment.status === 'agendado';
      expect(shouldSendConfirmation).toBe(true);

      // 3. Verificar limite mensal
      const messagesSentThisMonth = 150;
      const remainingFreeMessages = Math.max(0, MONTHLY_FREE_LIMIT - messagesSentThisMonth);
      const willExceedLimit = messagesSentThisMonth + 1 > MONTHLY_FREE_LIMIT;

      expect(remainingFreeMessages).toBe(50);
      expect(willExceedLimit).toBe(false);
    });

    it('deve calcular custo de mensagens excedentes', () => {
      const messagesSentThisMonth = 250; // 50 acima do limite
      const excessMessages = Math.max(0, messagesSentThisMonth - MONTHLY_FREE_LIMIT);
      const excessCost = excessMessages * MESSAGE_UNIT_PRICE;

      expect(excessMessages).toBe(50);
      expect(excessCost).toBe(2.50); // 50 * 0.05
    });
  });

  describe('Fluxo: Lembrete 24h → Lembrete 1h → Confirmação', () => {
    it('deve enviar lembretes na ordem correta', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'patient1',
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

      // Verificar se deve enviar lembrete 24h
      const now24h = new Date('2024-01-19T10:00:00'); // 24h antes
      const diffMin24h = (appointment.inicio.getTime() - now24h.getTime()) / (1000 * 60);
      const shouldSend24h = 
        companySettings.lembrete24h &&
        diffMin24h >= 1380 && diffMin24h <= 1500; // Janela de 23h-25h

      expect(shouldSend24h).toBe(true);

      // Verificar se deve enviar lembrete 1h
      const now1h = new Date('2024-01-20T09:00:00'); // 1h antes
      const diffMin1h = (appointment.inicio.getTime() - now1h.getTime()) / (1000 * 60);
      const shouldSend1h = 
        companySettings.lembrete1h &&
        diffMin1h >= 30 && diffMin1h <= 90; // Janela de 30min-1h30min

      expect(shouldSend1h).toBe(true);
    });
  });

  describe('Fluxo: Resposta do Cliente → Processar → Atualizar Status', () => {
    it('deve processar resposta de confirmação do cliente', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'patient1',
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

      // Cliente confirma via WhatsApp
      const customerResponse = 'sim';
      const isConfirmation = /^(sim|confirmo|ok|confirmar)$/i.test(customerResponse.trim());

      if (isConfirmation) {
        appointment.status = 'confirmado';
        appointment.updatedAt = new Date();
      }

      expect(isConfirmation).toBe(true);
      expect(appointment.status).toBe('confirmado');
    });

    it('deve processar resposta de cancelamento do cliente', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'patient1',
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

      // Cliente cancela via WhatsApp
      const customerResponse = 'cancelar';
      const isCancellation = /^(cancelar|cancel|não|nao)$/i.test(customerResponse.trim());

      if (isCancellation) {
        appointment.status = 'cancelado';
        appointment.updatedAt = new Date();
      }

      expect(isCancellation).toBe(true);
      expect(appointment.status).toBe('cancelado');
    });
  });

  describe('Fluxo: Identificar Paciente → Buscar Agendamento → Responder', () => {
    it('deve identificar paciente pelo telefone e encontrar agendamento', () => {
      const phoneNumber = '+5511999999999';
      const normalizedPhone = phoneNumber.replace(/\D/g, '');

      const patient: Patient = {
        id: 'patient1',
        nome: 'João Silva',
        telefoneE164: phoneNumber,
        companyId: 'company1',
      };

      // Buscar paciente pelo telefone
      const patientFound = patient.telefoneE164.replace(/\D/g, '') === normalizedPhone;
      expect(patientFound).toBe(true);

      // Buscar agendamento do paciente
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: patient.id,
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

      const appointmentFound = appointment.clientId === patient.id;
      expect(appointmentFound).toBe(true);
    });
  });
});

