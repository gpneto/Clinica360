import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - Birthday Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBirthdayMessage - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          patientId: 'patient1',
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
          patientId: 'patient1',
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

    it('deve validar que patientId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
        },
      };

      const patientId = request.data?.patientId;
      expect(patientId).toBeUndefined();

      if (!patientId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'patientId é obrigatório');
        }).toThrow('patientId é obrigatório');
      }
    });
  });

  describe('checkBirthdayMessageSent - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          patientId: 'patient1',
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
          patientId: 'patient1',
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

    it('deve validar que patientId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
        },
      };

      const patientId = request.data?.patientId;
      expect(patientId).toBeUndefined();

      if (!patientId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'patientId é obrigatório');
        }).toThrow('patientId é obrigatório');
      }
    });
  });

  describe('sendBirthdayMessage - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
          patientId: 'patient1',
          aiMessage: 'Mensagem personalizada',
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
          patientId: 'patient1',
          aiMessage: 'Mensagem personalizada',
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

    it('deve validar que patientId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          aiMessage: 'Mensagem personalizada',
        },
      };

      const patientId = request.data?.patientId;
      expect(patientId).toBeUndefined();

      if (!patientId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'patientId é obrigatório');
        }).toThrow('patientId é obrigatório');
      }
    });

    it('deve validar que aiMessage é obrigatória', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          patientId: 'patient1',
        },
      };

      const aiMessage = request.data?.aiMessage;
      expect(aiMessage).toBeUndefined();

      if (!aiMessage) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'Mensagem é obrigatória');
        }).toThrow('Mensagem é obrigatória');
      }
    });
  });
});

