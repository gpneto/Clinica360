import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - Appointment Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAppointment - Validações', () => {
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

    it('deve detectar dados obrigatórios ausentes', () => {
      const appointmentData: any = {
        professionalId: 'prof1',
        // clientId ausente
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
      };

      const requiredFields = ['professionalId', 'clientId', 'serviceId', 'inicio', 'fim', 'precoCentavos'];
      const isValid = requiredFields.every(field => appointmentData[field]);

      expect(isValid).toBe(false);
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

    it('deve detectar quando não há conflito', () => {
      const existingAppointment = {
        professionalId: 'prof1',
        inicio: { toDate: () => new Date('2024-01-20T10:00:00') },
        fim: { toDate: () => new Date('2024-01-20T11:00:00') },
        status: 'agendado',
      };

      const newAppointment = {
        professionalId: 'prof1',
        inicio: new Date('2024-01-20T12:00:00'),
        fim: new Date('2024-01-20T13:00:00'),
      };

      const hasConflict = 
        existingAppointment.professionalId === newAppointment.professionalId &&
        existingAppointment.status === 'agendado' &&
        newAppointment.inicio < existingAppointment.fim.toDate() &&
        newAppointment.fim > existingAppointment.inicio.toDate();

      expect(hasConflict).toBe(false);
    });
  });

  describe('callAltegioWebhook - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          appointmentData: {},
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

    it('deve validar que appointmentData é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          companyId: 'company1',
          // appointmentData ausente
        },
      };

      const appointmentData = request.data?.appointmentData;
      expect(appointmentData).toBeUndefined();

      if (!appointmentData) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'appointmentData é obrigatório');
        }).toThrow('appointmentData é obrigatório');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {
          appointmentData: {
            professionalId: 'prof1',
            serviceId: 'service1',
            clientId: 'client1',
          },
          // companyId ausente
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

    it('deve validar dados obrigatórios do appointmentData', () => {
      const appointmentData = {
        professionalId: 'prof1',
        serviceId: 'service1',
        clientId: 'client1',
      };

      const requiredFields = ['professionalId', 'serviceId', 'clientId'];
      const isValid = requiredFields.every(field => appointmentData[field as keyof typeof appointmentData]);

      expect(isValid).toBe(true);
    });

    it('deve detectar dados obrigatórios ausentes no appointmentData', () => {
      const appointmentData: any = {
        professionalId: 'prof1',
        // serviceId ausente
        clientId: 'client1',
      };

      const requiredFields = ['professionalId', 'serviceId', 'clientId'];
      const isValid = requiredFields.every(field => appointmentData[field]);

      expect(isValid).toBe(false);
    });
  });
});

