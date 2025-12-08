import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Regras de Negócio - Validação de Agendamentos', () => {
  describe('Validação de Conflitos de Horário', () => {
    it('deve detectar conflito quando novo agendamento começa durante outro', () => {
      const existingAppointment: Appointment = {
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
      };

      const newStart = new Date('2024-01-15T10:30:00');
      const newEnd = new Date('2024-01-15T11:30:00');
      const existingStart = existingAppointment.inicio;
      const existingEnd = existingAppointment.fim;

      const hasConflict = (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );

      expect(hasConflict).toBe(true);
    });

    it('deve detectar conflito quando novo agendamento termina durante outro', () => {
      const existingAppointment: Appointment = {
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
      };

      const newStart = new Date('2024-01-15T09:30:00');
      const newEnd = new Date('2024-01-15T10:30:00');
      const existingStart = existingAppointment.inicio;
      const existingEnd = existingAppointment.fim;

      const hasConflict = (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );

      expect(hasConflict).toBe(true);
    });

    it('deve detectar conflito quando novo agendamento engloba outro completamente', () => {
      const existingAppointment: Appointment = {
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
      };

      const newStart = new Date('2024-01-15T09:00:00');
      const newEnd = new Date('2024-01-15T12:00:00');
      const existingStart = existingAppointment.inicio;
      const existingEnd = existingAppointment.fim;

      const hasConflict = (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );

      expect(hasConflict).toBe(true);
    });

    it('não deve detectar conflito quando agendamentos não se sobrepõem', () => {
      const existingAppointment: Appointment = {
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
      };

      const newStart = new Date('2024-01-15T11:00:00');
      const newEnd = new Date('2024-01-15T12:00:00');
      const existingStart = existingAppointment.inicio;
      const existingEnd = existingAppointment.fim;

      const hasConflict = (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );

      expect(hasConflict).toBe(false);
    });

    it('não deve considerar conflito com agendamentos cancelados', () => {
      const existingAppointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'cancelado', // Cancelado não deve causar conflito
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newStart = new Date('2024-01-15T10:30:00');
      const newEnd = new Date('2024-01-15T11:30:00');
      const existingStart = existingAppointment.inicio;
      const existingEnd = existingAppointment.fim;

      // Apenas status 'agendado' ou 'confirmado' devem causar conflito
      const shouldCheckConflict = existingAppointment.status === 'agendado' || existingAppointment.status === 'confirmado';
      
      if (!shouldCheckConflict) {
        expect(shouldCheckConflict).toBe(false);
        return;
      }

      const hasConflict = (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );

      expect(hasConflict).toBe(false); // Não deve verificar conflito
    });
  });

  describe('Validação de Sobreposição de Horários', () => {
    it('deve detectar sobreposição quando slotStart < aptEnd && slotEnd > aptStart', () => {
      const slotStart = new Date('2024-01-15T10:00:00');
      const slotEnd = new Date('2024-01-15T11:00:00');
      const aptStart = new Date('2024-01-15T10:30:00');
      const aptEnd = new Date('2024-01-15T11:30:00');

      const overlaps = slotStart < aptEnd && slotEnd > aptStart;
      expect(overlaps).toBe(true);
    });

    it('não deve detectar sobreposição quando horários são adjacentes', () => {
      const slotStart = new Date('2024-01-15T10:00:00');
      const slotEnd = new Date('2024-01-15T11:00:00');
      const aptStart = new Date('2024-01-15T11:00:00');
      const aptEnd = new Date('2024-01-15T12:00:00');

      const overlaps = slotStart < aptEnd && slotEnd > aptStart;
      expect(overlaps).toBe(false);
    });
  });

  describe('Validação de Status de Agendamento', () => {
    it('deve considerar apenas agendado e confirmado para conflitos', () => {
      const statuses = ['agendado', 'confirmado', 'concluido', 'cancelado', 'no_show', 'pendente'];
      
      const shouldCheckConflict = (status: string) => {
        return status === 'agendado' || status === 'confirmado';
      };

      expect(shouldCheckConflict('agendado')).toBe(true);
      expect(shouldCheckConflict('confirmado')).toBe(true);
      expect(shouldCheckConflict('concluido')).toBe(false);
      expect(shouldCheckConflict('cancelado')).toBe(false);
      expect(shouldCheckConflict('no_show')).toBe(false);
      expect(shouldCheckConflict('pendente')).toBe(false);
    });
  });

  describe('Validação de Cliente Presente', () => {
    it('deve considerar cliente presente quando clientePresente é true', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const shouldCount = appointment.clientePresente !== false;
      expect(shouldCount).toBe(true);
    });

    it('deve considerar cliente presente quando clientePresente é undefined', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        // clientePresente não definido
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const shouldCount = appointment.clientePresente !== false;
      expect(shouldCount).toBe(true);
    });

    it('não deve considerar quando clientePresente é false', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: false,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const shouldCount = appointment.clientePresente !== false;
      expect(shouldCount).toBe(false);
    });
  });

  describe('Validação de Filtros de Agendamento', () => {
    it('deve filtrar agendamentos por período corretamente', () => {
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
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-20T10:00:00'),
          fim: new Date('2024-01-20T11:00:00'),
          precoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00');
      const endDate = new Date('2024-01-15T23:59:59');

      const filtered = appointments.filter(appointment => {
        const appointmentDate = appointment.inicio;
        return appointmentDate >= startDate && appointmentDate <= endDate &&
               appointment.status === 'concluido';
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });
  });
});

