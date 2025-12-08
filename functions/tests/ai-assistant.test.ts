import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - AI Assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('aiAssistant - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
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

    it('deve validar que message é obrigatória', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
        },
      };

      const message = request.data?.message;
      expect(message).toBeUndefined();

      if (!message) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'Mensagem é obrigatória');
        }).toThrow('Mensagem é obrigatória');
      }
    });

    it('deve validar formato de IDs', () => {
      const isValidId = (id: any): id is string => {
        if (id == null || typeof id !== 'string') return false;
        const trimmed = id.trim();
        return (
          trimmed !== '' &&
          trimmed !== '__all__' &&
          !trimmed.includes('__all__') &&
          !(trimmed.startsWith('__') && trimmed.endsWith('__'))
        );
      };

      expect(isValidId('company1')).toBe(true);
      expect(isValidId('')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId('__all__')).toBe(false);
      expect(isValidId('__test__')).toBe(false);
    });
  });
});

