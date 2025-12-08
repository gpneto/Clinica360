import { describe, it, expect } from 'vitest';
import { Patient, Appointment } from '@/types';

describe('Utilitários - Filtros e Busca', () => {
  describe('Busca de Pacientes', () => {
    const patients: Patient[] = [
      {
        id: '1',
        nome: 'João Silva',
        telefoneE164: '+5511999999999',
        email: 'joao@example.com',
        companyId: 'company1',
      },
      {
        id: '2',
        nome: 'Maria Santos',
        telefoneE164: '+5511888888888',
        email: 'maria@example.com',
        companyId: 'company1',
      },
      {
        id: '3',
        nome: 'Pedro Oliveira',
        telefoneE164: '+5511777777777',
        email: 'pedro@example.com',
        companyId: 'company1',
      },
    ];

    it('deve buscar paciente por nome', () => {
      const searchTerm = 'joão';
      const filtered = patients.filter(patient =>
        patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].nome).toBe('João Silva');
    });

    it('deve buscar paciente por telefone', () => {
      const searchTerm = '99999';
      const filtered = patients.filter(patient =>
        patient.telefoneE164.includes(searchTerm)
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].telefoneE164).toContain('99999');
    });

    it('deve buscar paciente por email', () => {
      const searchTerm = 'maria';
      const filtered = patients.filter(patient =>
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].email).toContain('maria');
    });

    it('deve fazer busca case-insensitive', () => {
      const searchTerm = 'PEDRO';
      const filtered = patients.filter(patient =>
        patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].nome).toBe('Pedro Oliveira');
    });

    it('deve fazer busca parcial', () => {
      const searchTerm = 'sil';
      const filtered = patients.filter(patient =>
        patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].nome).toContain('Silva');
    });

    it('deve retornar vazio quando não encontra', () => {
      const searchTerm = 'inexistente';
      const filtered = patients.filter(patient =>
        patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(0);
    });
  });

  describe('Filtros de Agendamentos', () => {
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
        companyId: 'company1',
        professionalId: 'prof2',
        clientId: 'client2',
        serviceId: 'service2',
        inicio: new Date('2024-01-15T14:00:00'),
        fim: new Date('2024-01-15T15:00:00'),
        precoCentavos: 15000,
        comissaoPercent: 30,
        status: 'concluido',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client3',
        serviceId: 'service3',
        inicio: new Date('2024-01-16T10:00:00'),
        fim: new Date('2024-01-16T11:00:00'),
        precoCentavos: 20000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('deve filtrar por profissional', () => {
      const professionalId = 'prof1';
      const filtered = appointments.filter(apt => apt.professionalId === professionalId);

      expect(filtered.length).toBe(2);
      expect(filtered.every(apt => apt.professionalId === 'prof1')).toBe(true);
    });

    it('deve filtrar por status', () => {
      const status = 'agendado';
      const filtered = appointments.filter(apt => apt.status === status);

      expect(filtered.length).toBe(2);
      expect(filtered.every(apt => apt.status === 'agendado')).toBe(true);
    });

    it('deve filtrar por período', () => {
      const startDate = new Date('2024-01-15T00:00:00');
      const endDate = new Date('2024-01-15T23:59:59');
      const filtered = appointments.filter(apt =>
        apt.inicio >= startDate && apt.inicio <= endDate
      );

      expect(filtered.length).toBe(2);
    });

    it('deve filtrar por múltiplos critérios', () => {
      const professionalId = 'prof1';
      const status = 'agendado';
      const filtered = appointments.filter(apt =>
        apt.professionalId === professionalId && apt.status === status
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every(apt => apt.professionalId === 'prof1' && apt.status === 'agendado')).toBe(true);
    });
  });

  describe('Filtros de Serviços', () => {
    const services = [
      { id: '1', nome: 'Consulta', ativo: true },
      { id: '2', nome: 'Limpeza', ativo: true },
      { id: '3', nome: 'Extração', ativo: false },
    ];

    it('deve filtrar serviços ativos', () => {
      const filtered = services.filter(svc => svc.ativo);
      expect(filtered.length).toBe(2);
      expect(filtered.every(svc => svc.ativo)).toBe(true);
    });

    it('deve buscar serviço por nome', () => {
      const searchTerm = 'consulta';
      const filtered = services.filter(svc =>
        svc.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].nome).toBe('Consulta');
    });
  });
});

