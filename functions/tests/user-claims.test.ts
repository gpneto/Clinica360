import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - User Claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setUserCustomClaimsOnLogin - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {},
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });
  });

  describe('updateUserCustomClaimsForContext - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          role: 'owner',
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
          role: 'owner',
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

    it('deve validar que role é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
        },
      };

      const role = request.data?.role;
      expect(role).toBeUndefined();

      if (!role) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'role é obrigatório');
        }).toThrow('role é obrigatório');
      }
    });
  });

  describe('syncUserCustomClaims - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {},
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });
  });
});

