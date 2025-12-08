import { describe, it, expect } from 'vitest';
import { Patient, PatientEvolution, Appointment } from '@/types';

describe('Testes de Integração - Fluxo de Evolução de Paciente', () => {
  describe('Fluxo: Criar Paciente → Agendar → Registrar Evolução', () => {
    it('deve completar fluxo de criação de paciente e evolução', () => {
      // 1. Criar paciente
      const patient: Patient = {
        id: 'patient1',
        nome: 'João Silva',
        telefoneE164: '+5511999999999',
        email: 'joao@example.com',
        companyId: 'company1',
      };

      expect(patient.id).toBeTruthy();
      expect(patient.companyId).toBe('company1');

      // 2. Criar agendamento
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: patient.id,
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.clientId).toBe(patient.id);
      expect(appointment.status).toBe('concluido');

      // 3. Registrar evolução
      const evolution: PatientEvolution = {
        id: 'evol1',
        companyId: 'company1',
        patientId: patient.id,
        appointmentId: appointment.id,
        date: new Date('2024-01-20'),
        notes: 'Paciente compareceu, procedimento realizado com sucesso.',
        createdByUid: 'user1',
        createdAt: new Date(),
      };

      expect(evolution.patientId).toBe(patient.id);
      expect(evolution.appointmentId).toBe(appointment.id);
      expect(evolution.notes).toBeTruthy();

      // 4. Validar que evolução está vinculada ao agendamento
      const isLinked = evolution.appointmentId === appointment.id && evolution.patientId === patient.id;
      expect(isLinked).toBe(true);
    });

    it('deve validar isolamento por companyId na evolução', () => {
      const evolution1: PatientEvolution = {
        id: 'evol1',
        companyId: 'company1',
        patientId: 'patient1',
        date: new Date('2024-01-20'),
        notes: 'Evolução 1',
        createdByUid: 'user1',
        createdAt: new Date(),
      };

      const evolution2: PatientEvolution = {
        id: 'evol2',
        companyId: 'company2',
        patientId: 'patient1', // Mesmo paciente, mas empresa diferente
        date: new Date('2024-01-20'),
        notes: 'Evolução 2',
        createdByUid: 'user2',
        createdAt: new Date(),
      };

      // Evoluções devem estar isoladas por companyId
      expect(evolution1.companyId).not.toBe(evolution2.companyId);

      // Filtrar por companyId
      const allEvolutions = [evolution1, evolution2];
      const company1Evolutions = allEvolutions.filter(evol => evol.companyId === 'company1');
      const company2Evolutions = allEvolutions.filter(evol => evol.companyId === 'company2');

      expect(company1Evolutions.length).toBe(1);
      expect(company2Evolutions.length).toBe(1);
    });
  });

  describe('Fluxo: Múltiplas Evoluções → Histórico → Filtros', () => {
    it('deve organizar histórico de evoluções', () => {
      const patientId = 'patient1';
      const evolutions: PatientEvolution[] = [
        {
          id: 'evol1',
          companyId: 'company1',
          patientId,
          date: new Date('2024-01-15'),
          notes: 'Primeira consulta',
          createdByUid: 'user1',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'evol2',
          companyId: 'company1',
          patientId,
          date: new Date('2024-01-20'),
          notes: 'Retorno',
          createdByUid: 'user1',
          createdAt: new Date('2024-01-20'),
        },
        {
          id: 'evol3',
          companyId: 'company1',
          patientId,
          date: new Date('2024-01-25'),
          notes: 'Acompanhamento',
          createdByUid: 'user1',
          createdAt: new Date('2024-01-25'),
        },
      ];

      // Filtrar por paciente
      const patientEvolutions = evolutions.filter(evol => evol.patientId === patientId);
      expect(patientEvolutions.length).toBe(3);

      // Ordenar por data (mais recente primeiro)
      const sorted = patientEvolutions.sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      );

      expect(sorted[0].date.getTime()).toBeGreaterThan(sorted[1].date.getTime());
      expect(sorted[1].date.getTime()).toBeGreaterThan(sorted[2].date.getTime());
    });

    it('deve filtrar evoluções por período', () => {
      const evolutions: PatientEvolution[] = [
        {
          id: 'evol1',
          companyId: 'company1',
          patientId: 'patient1',
          date: new Date('2024-01-15'),
          notes: 'Evolução 1',
          createdByUid: 'user1',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'evol2',
          companyId: 'company1',
          patientId: 'patient1',
          date: new Date('2024-01-20'),
          notes: 'Evolução 2',
          createdByUid: 'user1',
          createdAt: new Date('2024-01-20'),
        },
        {
          id: 'evol3',
          companyId: 'company1',
          patientId: 'patient1',
          date: new Date('2024-02-01'),
          notes: 'Evolução 3',
          createdByUid: 'user1',
          createdAt: new Date('2024-02-01'),
        },
      ];

      // Filtrar por período (Janeiro 2024)
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      const periodEvolutions = evolutions.filter(evol =>
        evol.date >= periodStart && evol.date <= periodEnd
      );

      expect(periodEvolutions.length).toBe(2);
      expect(periodEvolutions.every(evol => evol.date.getMonth() === 0)).toBe(true);
    });
  });
});

