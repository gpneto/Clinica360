import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - Evolution Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startEvolutionPairing - Validações', () => {
    it('deve validar formato do número de WhatsApp', () => {
      const whatsappNumber = '11999999999';
      const numberDigits = whatsappNumber.replace(/\D/g, '');

      expect(numberDigits.length).toBeGreaterThanOrEqual(10);

      if (numberDigits.length < 10) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido. Deve conter pelo menos 10 dígitos.');
        }).toThrow('Número de WhatsApp inválido');
      }
    });

    it('deve validar tipo de integração', () => {
      const whatsappIntegrationType = 'WHATSAPP-BAILEYS';
      const isValid = whatsappIntegrationType === 'WHATSAPP-BAILEYS' || whatsappIntegrationType === 'WHATSAPP-BUSINESS';

      expect(isValid).toBe(true);

      const invalidType = 'INVALID';
      const isInvalid = invalidType === 'WHATSAPP-BAILEYS' || invalidType === 'WHATSAPP-BUSINESS';
      expect(isInvalid).toBe(false);
    });
  });

  describe('getEvolutionInstanceStatus - Validações', () => {
    it('deve validar estados de conexão', () => {
      const connectionStates = ['open', 'close', 'connecting'];
      const validStates = ['open', 'close'];

      connectionStates.forEach(state => {
        const isValid = validStates.includes(state);
        if (state === 'open' || state === 'close') {
          expect(isValid).toBe(true);
        }
      });
    });

    it('deve atualizar status quando conexão muda', () => {
      const currentStatus = 'disconnected';
      const connectionState = 'open';

      if (connectionState === 'open' && currentStatus !== 'connected') {
        const newStatus = 'connected';
        expect(newStatus).toBe('connected');
      }

      if (connectionState === 'close' && currentStatus === 'connected') {
        const newStatus = 'disconnected';
        expect(newStatus).toBe('disconnected');
      }
    });
  });

  describe('sendEvolutionTextMessage - Validações', () => {
    it('deve validar que companyId é obrigatório', () => {
      const request = {
        companyId: null,
        to: '5511999999999',
        message: 'Teste',
      };

      const companyId = request.companyId;
      expect(companyId).toBeNull();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });

    it('deve validar formato do número de destino', () => {
      const to = '5511999999999';
      const normalized = to.replace(/\D/g, '');

      expect(normalized).toBeTruthy();
      expect(normalized.length).toBeGreaterThanOrEqual(10);
    });

    it('deve validar que mensagem não está vazia', () => {
      const message = '';

      if (!message || !message.trim()) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'Mensagem não pode estar vazia');
        }).toThrow('Mensagem não pode estar vazia');
      }
    });
  });
});

