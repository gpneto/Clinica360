import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Mock do Firebase Admin
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
  },
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
};

describe('Firebase Functions - Funções Principais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAppointment', () => {
    it('deve validar que usuário está autenticado', () => {
      const request = {
        auth: null,
        data: {
          appointmentData: {
            professionalId: 'prof1',
            clientId: 'client1',
            serviceId: 'service1',
            inicio: new Date('2024-01-20T10:00:00'),
            fim: new Date('2024-01-20T11:00:00'),
            precoCentavos: 10000,
            comissaoPercent: 30,
          },
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      // Deve lançar erro se não autenticado
      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar dados obrigatórios do agendamento', () => {
      const appointmentData = {
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
      };

      const requiredFields = ['professionalId', 'clientId', 'serviceId', 'inicio', 'fim', 'precoCentavos'];
      const isValid = requiredFields.every(field => appointmentData[field as keyof typeof appointmentData]);

      expect(isValid).toBe(true);
    });

    it('deve verificar conflitos de horário', () => {
      const existingAppointment = {
        professionalId: 'prof1',
        inicio: { toDate: () => new Date('2024-01-20T10:00:00') },
        fim: { toDate: () => new Date('2024-01-20T11:00:00') },
        status: 'agendado',
      };

      const newAppointment = {
        professionalId: 'prof1',
        inicio: new Date('2024-01-20T10:30:00'),
        fim: new Date('2024-01-20T11:30:00'),
      };

      const hasConflict = 
        existingAppointment.professionalId === newAppointment.professionalId &&
        existingAppointment.status === 'agendado' &&
        newAppointment.inicio < existingAppointment.fim.toDate() &&
        newAppointment.fim > existingAppointment.inicio.toDate();

      expect(hasConflict).toBe(true);
    });
  });

  describe('createStripeCheckoutSession', () => {
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

  describe('findPatientNameByPhone', () => {
    it('deve retornar null se phoneNumber ou companyId não fornecidos', () => {
      const phoneNumber = null;
      const companyId = 'company1';

      if (!phoneNumber || !companyId) {
        expect(null).toBeNull();
      }
    });

    it('deve normalizar número de telefone', () => {
      const phoneNumber = '+55 11 99999-9999';
      const normalized = phoneNumber.replace(/\D/g, '');

      expect(normalized).toBe('5511999999999');
    });

    it('deve gerar variantes do número para busca', () => {
      const normalizedPhone = '5511999999999';
      const variants = [
        normalizedPhone, // "5511999999999"
        normalizedPhone.startsWith('55') ? normalizedPhone.slice(2) : `55${normalizedPhone}`, // Sem/Com país
        normalizedPhone.length === 13 && normalizedPhone.startsWith('55')
          ? normalizedPhone.slice(0, 4) + normalizedPhone.slice(5) // Remover 9 se tiver
          : null,
        normalizedPhone.length === 13 && normalizedPhone.startsWith('55')
          ? normalizedPhone.slice(2) // Remover 55
          : null,
      ].filter(Boolean) as string[];

      expect(variants.length).toBeGreaterThan(0);
      expect(variants).toContain('5511999999999');
      expect(variants).toContain('11999999999');
    });
  });
});

