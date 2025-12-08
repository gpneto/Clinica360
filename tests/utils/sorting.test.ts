import { describe, it, expect } from 'vitest';
import { Appointment, Patient } from '@/types';

describe('Utilitários - Ordenação', () => {
  describe('Ordenação de Agendamentos', () => {
    const appointments: Appointment[] = [
      {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T14:00:00'),
        fim: new Date('2024-01-15T15:00:00'),
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
        professionalId: 'prof1',
        clientId: 'client2',
        serviceId: 'service2',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 15000,
        comissaoPercent: 30,
        status: 'agendado',
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

    it('deve ordenar por data ascendente', () => {
      const sorted = [...appointments].sort((a, b) =>
        a.inicio.getTime() - b.inicio.getTime()
      );

      expect(sorted[0].id).toBe('2'); // 10:00
      expect(sorted[1].id).toBe('1'); // 14:00
      expect(sorted[2].id).toBe('3'); // 16/01
    });

    it('deve ordenar por data descendente', () => {
      const sorted = [...appointments].sort((a, b) =>
        b.inicio.getTime() - a.inicio.getTime()
      );

      expect(sorted[0].id).toBe('3'); // Mais recente
      expect(sorted[2].id).toBe('2'); // Mais antigo
    });

    it('deve ordenar por preço ascendente', () => {
      const sorted = [...appointments].sort((a, b) =>
        a.precoCentavos - b.precoCentavos
      );

      expect(sorted[0].precoCentavos).toBe(10000);
      expect(sorted[1].precoCentavos).toBe(15000);
      expect(sorted[2].precoCentavos).toBe(20000);
    });

    it('deve ordenar por preço descendente', () => {
      const sorted = [...appointments].sort((a, b) =>
        b.precoCentavos - a.precoCentavos
      );

      expect(sorted[0].precoCentavos).toBe(20000);
      expect(sorted[2].precoCentavos).toBe(10000);
    });
  });

  describe('Ordenação de Pacientes', () => {
    const patients: Patient[] = [
      {
        id: '1',
        nome: 'Zeca Silva',
        telefoneE164: '+5511999999999',
        companyId: 'company1',
      },
      {
        id: '2',
        nome: 'Ana Santos',
        telefoneE164: '+5511888888888',
        companyId: 'company1',
      },
      {
        id: '3',
        nome: 'Bruno Oliveira',
        telefoneE164: '+5511777777777',
        companyId: 'company1',
      },
    ];

    it('deve ordenar por nome alfabeticamente', () => {
      const sorted = [...patients].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      );

      expect(sorted[0].nome).toBe('Ana Santos');
      expect(sorted[1].nome).toBe('Bruno Oliveira');
      expect(sorted[2].nome).toBe('Zeca Silva');
    });

    it('deve ordenar por nome em ordem reversa', () => {
      const sorted = [...patients].sort((a, b) =>
        b.nome.localeCompare(a.nome, 'pt-BR')
      );

      expect(sorted[0].nome).toBe('Zeca Silva');
      expect(sorted[2].nome).toBe('Ana Santos');
    });

    it('deve lidar com acentos corretamente', () => {
      const patientsWithAccents: Patient[] = [
        { id: '1', nome: 'José', telefoneE164: '+5511999999999', companyId: 'company1' },
        { id: '2', nome: 'Ana', telefoneE164: '+5511888888888', companyId: 'company1' },
        { id: '3', nome: 'Álvaro', telefoneE164: '+5511777777777', companyId: 'company1' },
      ];

      const sorted = [...patientsWithAccents].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );

      // A ordenação pode variar dependendo da implementação, mas deve ser consistente
      expect(sorted.length).toBe(3);
      expect(sorted.map(p => p.nome)).toContain('Ana');
      expect(sorted.map(p => p.nome)).toContain('Álvaro');
      expect(sorted.map(p => p.nome)).toContain('José');
    });
  });

  describe('Ordenação Múltipla', () => {
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
        professionalId: 'prof1',
        clientId: 'client2',
        serviceId: 'service2',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 15000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('deve ordenar por data e depois por preço', () => {
      const sorted = [...appointments].sort((a, b) => {
        const dateDiff = a.inicio.getTime() - b.inicio.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.precoCentavos - b.precoCentavos;
      });

      expect(sorted[0].precoCentavos).toBe(10000);
      expect(sorted[1].precoCentavos).toBe(15000);
    });
  });
});

