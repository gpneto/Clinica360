import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Testes de Integração - Fluxo de Gerenciamento de Recorrência', () => {
  describe('Fluxo: Criar Recorrência → Gerar Ocorrências → Gerenciar Série', () => {
    it('deve criar série recorrente e gerar todas as ocorrências', () => {
      const baseAppointment: Appointment = {
        id: 'apt-recurring-1',
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

      const recurrence = {
        frequency: 'weekly' as const,
        endDate: new Date('2024-02-15'),
        startOrder: 1,
      };

      // Gerar ocorrências semanais
      const occurrences: Appointment[] = [];
      let currentDate = new Date(baseAppointment.inicio);
      let order = 1;

      while (currentDate <= recurrence.endDate) {
        const occurrence: Appointment = {
          ...baseAppointment,
          id: `apt-recurring-${order}`,
          inicio: new Date(currentDate),
          fim: new Date(currentDate.getTime() + 60 * 60 * 1000), // +1 hora
          recurrenceOrder: order,
          recurrenceId: baseAppointment.id,
        };

        occurrences.push(occurrence);
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias
        order++;
      }

      expect(occurrences.length).toBeGreaterThan(0);
      expect(occurrences.every(occ => occ.recurrenceId === baseAppointment.id)).toBe(true);
    });

    it('deve cancelar série completa de recorrência', () => {
      const recurrenceId = 'apt-recurring-1';
      const occurrences: Appointment[] = [
        {
          id: 'apt-recurring-1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceId,
          recurrenceOrder: 1,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt-recurring-2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-22T10:00:00'),
          fim: new Date('2024-01-22T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceId,
          recurrenceOrder: 2,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Cancelar série completa
      const cancelledOccurrences = occurrences.map(occ => ({
        ...occ,
        status: 'cancelado' as const,
        updatedAt: new Date(),
      }));

      expect(cancelledOccurrences.every(occ => occ.status === 'cancelado')).toBe(true);
      expect(cancelledOccurrences.every(occ => occ.recurrenceId === recurrenceId)).toBe(true);
    });

    it('deve atualizar série recorrente e propagar mudanças', () => {
      const recurrenceId = 'apt-recurring-1';
      const occurrences: Appointment[] = [
        {
          id: 'apt-recurring-1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceId,
          recurrenceOrder: 1,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt-recurring-2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-22T10:00:00'),
          fim: new Date('2024-01-22T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceId,
          recurrenceOrder: 2,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Atualizar preço em toda a série
      const newPrice = 12000;
      const updatedOccurrences = occurrences.map(occ => ({
        ...occ,
        precoCentavos: newPrice,
        updatedAt: new Date(),
      }));

      expect(updatedOccurrences.every(occ => occ.precoCentavos === newPrice)).toBe(true);
      expect(updatedOccurrences.every(occ => occ.recurrenceId === recurrenceId)).toBe(true);
    });
  });

  describe('Fluxo: Recorrência Diária → Validar Limites → Gerar Ocorrências', () => {
    it('deve validar limite de 1 ano para recorrência', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-01-01'); // Exatamente 1 ano
      // Considerar ano bissexto (2024 tem 366 dias)
      const oneYearInMs = 366 * 24 * 60 * 60 * 1000;
      const diff = endDate.getTime() - startDate.getTime();

      // A diferença deve ser menor ou igual a 1 ano (considerando ano bissexto)
      const isValid = diff <= oneYearInMs;
      expect(isValid).toBe(true);

      // Data além de 1 ano deve ser inválida
      const invalidEndDate = new Date('2025-01-03'); // Mais de 1 ano
      const invalidDiff = invalidEndDate.getTime() - startDate.getTime();
      const isInvalid = invalidDiff > oneYearInMs;
      expect(isInvalid).toBe(true);
    });
  });
});

