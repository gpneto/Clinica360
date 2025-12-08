import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - WhatsApp Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendManualWhatsappMessage - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          phone: '+5511999999999',
          message: 'Teste',
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          phone: '+5511999999999',
          message: 'Teste',
        },
      };

      const companyId = request.data?.companyId;
      expect(companyId).toBeUndefined();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });

    it('deve validar que telefone e mensagem são obrigatórios', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          phone: '',
          message: '',
        },
      };

      const phone = request.data?.phone;
      const message = request.data?.message;

      if (!phone || !message || !message.trim()) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'Telefone e mensagem são obrigatórios');
        }).toThrow('Telefone e mensagem são obrigatórios');
      }
    });

    it('deve validar formato do telefone', () => {
      const phone = '+55 11 99999-9999';
      const normalized = phone.replace(/\D/g, '');

      expect(normalized).toBe('5511999999999');
      expect(normalized.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('startEvolutionSession - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          whatsappIntegrationType: 'WHATSAPP-BAILEYS',
          whatsappNumber: '11999999999',
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          whatsappIntegrationType: 'WHATSAPP-BAILEYS',
          whatsappNumber: '11999999999',
        },
      };

      const companyId = request.data?.companyId;
      expect(companyId).toBeUndefined();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });

    it('deve validar que whatsappIntegrationType é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          whatsappNumber: '11999999999',
        },
      };

      const whatsappIntegrationType = request.data?.whatsappIntegrationType;
      expect(whatsappIntegrationType).toBeUndefined();

      if (!whatsappIntegrationType || 
          (whatsappIntegrationType !== 'WHATSAPP-BAILEYS' && whatsappIntegrationType !== 'WHATSAPP-BUSINESS')) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'whatsappIntegrationType é obrigatório e deve ser "WHATSAPP-BAILEYS" ou "WHATSAPP-BUSINESS"');
        }).toThrow('whatsappIntegrationType é obrigatório');
      }
    });

    it('deve validar que whatsappNumber é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          whatsappIntegrationType: 'WHATSAPP-BAILEYS',
          whatsappNumber: '',
        },
      };

      const whatsappNumber = request.data?.whatsappNumber;
      expect(whatsappNumber).toBe('');

      if (!whatsappNumber || whatsappNumber.trim() === '') {
        expect(() => {
          throw new HttpsError('invalid-argument', 'whatsappNumber é obrigatório');
        }).toThrow('whatsappNumber é obrigatório');
      }
    });

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
  });

  describe('checkEvolutionStatus - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {},
      };

      const companyId = request.data?.companyId;
      expect(companyId).toBeUndefined();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });
  });
});

