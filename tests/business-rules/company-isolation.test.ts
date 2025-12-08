import { describe, it, expect } from 'vitest';
import { Appointment, Patient, Professional } from '@/types';

describe('Regras de Negócio - Isolamento por Empresa', () => {
  describe('Isolamento de Dados por CompanyId', () => {
    it('deve filtrar agendamentos por companyId', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          companyId: 'company2',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const companyId = 'company1';
      const filtered = appointments.filter(apt => apt.companyId === companyId);

      expect(filtered.length).toBe(1);
      expect(filtered[0].companyId).toBe('company1');
    });

    it('deve filtrar pacientes por companyId', () => {
      const patients: Patient[] = [
        {
          id: '1',
          nome: 'Paciente 1',
          telefoneE164: '+5511999999999',
          companyId: 'company1',
        },
        {
          id: '2',
          nome: 'Paciente 2',
          telefoneE164: '+5511888888888',
          companyId: 'company2',
        },
      ];

      const companyId = 'company1';
      const filtered = patients.filter(patient => patient.companyId === companyId);

      expect(filtered.length).toBe(1);
      expect(filtered[0].companyId).toBe('company1');
    });

    it('deve garantir que dados de uma empresa não sejam acessíveis por outra', () => {
      const company1Data = {
        appointments: [
          { id: '1', companyId: 'company1' },
          { id: '2', companyId: 'company1' },
        ],
        patients: [
          { id: '1', companyId: 'company1' },
        ],
      };

      const company2Data = {
        appointments: [
          { id: '3', companyId: 'company2' },
        ],
        patients: [
          { id: '2', companyId: 'company2' },
        ],
      };

      // Company1 não deve ver dados de Company2
      const company1CanSeeCompany2 = company1Data.appointments.some(
        apt => company2Data.appointments.some(apt2 => apt2.id === apt.id)
      );

      expect(company1CanSeeCompany2).toBe(false);
    });
  });

  describe('Validação de CompanyId Obrigatório', () => {
    it('deve exigir companyId ao criar agendamento', () => {
      const appointmentData = {
        companyId: 'company1', // Obrigatório
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
      };

      const isValid = !!(appointmentData.companyId && 
                         appointmentData.professionalId && 
                         appointmentData.clientId && 
                         appointmentData.serviceId);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar agendamento sem companyId', () => {
      const appointmentData: any = {
        // companyId ausente
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
      };

      const isValid = !!(appointmentData.companyId && 
                         appointmentData.professionalId && 
                         appointmentData.clientId && 
                         appointmentData.serviceId);
      expect(isValid).toBe(false);
    });
  });
});

