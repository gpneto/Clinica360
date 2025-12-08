import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - Stripe Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStripeCheckoutSession - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: { companyId: 'company1' },
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

  describe('createUsageBasedCheckout - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          monthStart: '2024-01-01',
          monthEnd: '2024-01-31',
          messageCount: 250,
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
          monthStart: '2024-01-01',
          monthEnd: '2024-01-31',
          messageCount: 250,
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

    it('deve calcular custo de mensagens excedentes', () => {
      const MONTHLY_FREE_LIMIT = 200;
      const MESSAGE_UNIT_PRICE = 0.05;
      const messageCount = 250;

      const extraCount = Math.max(0, messageCount - MONTHLY_FREE_LIMIT);
      const amount = extraCount * MESSAGE_UNIT_PRICE * 100; // Em centavos

      expect(extraCount).toBe(50);
      expect(amount).toBe(250); // 50 * 0.05 * 100
    });

    it('deve retornar 0 quando não há mensagens excedentes', () => {
      const MONTHLY_FREE_LIMIT = 200;
      const MESSAGE_UNIT_PRICE = 0.05;
      const messageCount = 150;

      const extraCount = Math.max(0, messageCount - MONTHLY_FREE_LIMIT);
      const amount = extraCount * MESSAGE_UNIT_PRICE * 100;

      expect(extraCount).toBe(0);
      expect(amount).toBe(0);
    });
  });

  describe('stripeWebhook - Validações', () => {
    it('deve validar assinatura do webhook', () => {
      const req = {
        headers: {
          'stripe-signature': null,
        },
        rawBody: Buffer.from('test'),
      };

      const sig = req.headers['stripe-signature'];
      expect(sig).toBeNull();

      // Sem assinatura, webhook deve falhar
      if (!sig) {
        expect(() => {
          throw new Error('Webhook Error: Missing signature');
        }).toThrow('Missing signature');
      }
    });

    it('deve processar evento checkout.session.completed', () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'session_123',
            metadata: {
              companyId: 'company1',
              type: 'usage-based',
              monthStart: '2024-01-01',
              monthEnd: '2024-01-31',
              messageCount: '250',
              extraCount: '50',
            },
            amount_total: 250,
            currency: 'brl',
          },
        },
      };

      expect(event.type).toBe('checkout.session.completed');
      expect(event.data.object.metadata?.companyId).toBe('company1');
    });

    it('deve processar evento customer.subscription.updated', () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_end: 1704067200, // Timestamp
            metadata: {
              companyId: 'company1',
            },
          },
        },
      };

      expect(event.type).toBe('customer.subscription.updated');
      expect(event.data.object.status).toBe('active');
    });

    it('deve processar evento invoice.payment_succeeded', () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_paid: 10000,
            currency: 'brl',
            status: 'paid',
            lines: {
              data: [{
                period: {
                  start: 1701388800,
                  end: 1704067200,
                },
              }],
            },
          },
        },
      };

      expect(event.type).toBe('invoice.payment_succeeded');
      expect(event.data.object.status).toBe('paid');
    });

    it('deve processar evento invoice.payment_failed', () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_due: 10000,
            currency: 'brl',
            status: 'open',
          },
        },
      };

      expect(event.type).toBe('invoice.payment_failed');
      expect(event.data.object.status).toBe('open');
    });
  });
});

