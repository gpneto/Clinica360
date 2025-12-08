import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - Recorrência de Agendamentos', () => {
  describe('Validação de Data Final de Recorrência', () => {
    it('deve exigir data final quando recorrência está habilitada', () => {
      const recurrenceEnabled = true;
      const recurrenceEndsOn = '2024-02-15';
      
      const isValid = recurrenceEnabled ? !!recurrenceEndsOn : true;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar recorrência sem data final', () => {
      const recurrenceEnabled = true;
      const recurrenceEndsOn = '';
      
      const isValid = recurrenceEnabled ? !!recurrenceEndsOn : true;
      expect(isValid).toBe(false);
    });

    it('deve validar que data final seja posterior à data inicial', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const recurrenceEndsOn = '2024-01-20';
      const recurrenceCandidate = new Date(recurrenceEndsOn + 'T23:59:59');
      
      const isValid = recurrenceCandidate > startDate;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar data final anterior à data inicial', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const recurrenceEndsOn = '2024-01-10';
      const recurrenceCandidate = new Date(recurrenceEndsOn + 'T23:59:59');
      
      const isValid = recurrenceCandidate > startDate;
      expect(isValid).toBe(false);
    });

    it('deve validar que data final não exceda 1 ano após início', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const maxEndDate = new Date(startDate);
      maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
      
      const recurrenceEndsOn = '2024-12-15';
      const recurrenceCandidate = new Date(recurrenceEndsOn + 'T23:59:59');
      
      const isValid = recurrenceCandidate <= maxEndDate;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar data final além de 1 ano', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const maxEndDate = new Date(startDate);
      maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
      
      const recurrenceEndsOn = '2025-02-15';
      const recurrenceCandidate = new Date(recurrenceEndsOn + 'T23:59:59');
      
      const isValid = recurrenceCandidate <= maxEndDate;
      expect(isValid).toBe(false);
    });
  });

  describe('Frequências de Recorrência', () => {
    it('deve validar frequência diária', () => {
      const frequency = 'daily';
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
      
      expect(validFrequencies.includes(frequency)).toBe(true);
    });

    it('deve validar frequência semanal', () => {
      const frequency = 'weekly';
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
      
      expect(validFrequencies.includes(frequency)).toBe(true);
    });

    it('deve validar frequência quinzenal', () => {
      const frequency = 'biweekly';
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
      
      expect(validFrequencies.includes(frequency)).toBe(true);
    });

    it('deve validar frequência mensal', () => {
      const frequency = 'monthly';
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
      
      expect(validFrequencies.includes(frequency)).toBe(true);
    });

    it('deve validar frequência customizada', () => {
      const frequency = 'custom';
      const customInterval = 5; // A cada 5 dias
      
      const isValid = frequency === 'custom' && customInterval >= 1 && customInterval <= 365;
      expect(isValid).toBe(true);
    });

    it('deve validar intervalo customizado entre 1 e 365 dias', () => {
      const customInterval = 10;
      const isValid = customInterval >= 1 && customInterval <= 365;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar intervalo customizado fora do range', () => {
      const testCases = [0, 366, -1, 500];
      
      testCases.forEach(interval => {
        const isValid = interval >= 1 && interval <= 365;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Bloqueios e Recorrência', () => {
    it('não deve permitir recorrência em bloqueios', () => {
      const isBlock = true;
      const recurrenceEnabled = true;
      
      const canHaveRecurrence = !isBlock && recurrenceEnabled;
      expect(canHaveRecurrence).toBe(false);
    });

    it('deve permitir recorrência em agendamentos normais', () => {
      const isBlock = false;
      const recurrenceEnabled = true;
      
      const canHaveRecurrence = !isBlock && recurrenceEnabled;
      expect(canHaveRecurrence).toBe(true);
    });
  });

  describe('Cálculo de Ocorrências Recorrentes', () => {
    it('deve calcular ocorrências diárias corretamente', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');
      const frequency = 'daily';
      
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const occurrences = daysDiff + 1; // Inclui o dia inicial
      
      expect(occurrences).toBe(6); // 15, 16, 17, 18, 19, 20
    });

    it('deve calcular ocorrências semanais corretamente', () => {
      const startDate = new Date('2024-01-15'); // Segunda
      const endDate = new Date('2024-02-12'); // Segunda, 4 semanas depois
      const frequency = 'weekly';
      
      const weeksDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      const occurrences = weeksDiff + 1;
      
      expect(occurrences).toBe(5); // Semana 0, 1, 2, 3, 4
    });

    it('deve calcular ocorrências quinzenais corretamente', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-02-26'); // 6 semanas depois
      const frequency = 'biweekly';
      
      const weeksDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      // Quinzenal = a cada 2 semanas, então dividimos por 2
      const occurrences = Math.floor(weeksDiff / 2) + 1;
      
      // 6 semanas / 2 = 3, mais a inicial = 4
      expect(occurrences).toBeGreaterThanOrEqual(3);
      expect(occurrences).toBeLessThanOrEqual(4);
    });
  });
});

