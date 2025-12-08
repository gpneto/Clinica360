import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';

describe('Utilitários - Normalização de Datas', () => {
  describe('Normalização para Horário Local', () => {
    it('deve normalizar Date corretamente', () => {
      const date = new Date('2024-01-15T10:00:00');
      const normalized = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      );

      expect(normalized.getTime()).toBe(date.getTime());
    });

    it('deve normalizar Timestamp do Firestore', () => {
      const timestamp = {
        toDate: () => new Date('2024-01-15T10:00:00'),
        seconds: 1705316400,
        nanoseconds: 0,
      };

      const dateObj = timestamp.toDate();
      const normalized = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        dateObj.getHours(),
        dateObj.getMinutes(),
        dateObj.getSeconds(),
        dateObj.getMilliseconds()
      );

      expect(normalized).toBeInstanceOf(Date);
      expect(normalized.getTime()).toBeGreaterThan(0);
    });

    it('deve normalizar string ISO', () => {
      const dateString = '2024-01-15T10:00:00';
      const dateObj = new Date(dateString);
      const normalized = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        dateObj.getHours(),
        dateObj.getMinutes(),
        dateObj.getSeconds(),
        dateObj.getMilliseconds()
      );

      expect(normalized).toBeInstanceOf(Date);
      expect(normalized.getTime()).toBeGreaterThan(0);
    });

    it('deve usar fallback para data inválida', () => {
      const invalidDate: any = null;
      const fallback = new Date('2024-01-01');
      const normalized = invalidDate || fallback;

      expect(normalized).toBeInstanceOf(Date);
      expect(normalized.getTime()).toBe(fallback.getTime());
    });
  });

  describe('Validação de Datas', () => {
    it('deve validar data válida', () => {
      const date = new Date('2024-01-15T10:00:00');
      const isValid = date instanceof Date && !isNaN(date.getTime());
      expect(isValid).toBe(true);
    });

    it('deve rejeitar data inválida', () => {
      const date = new Date('invalid');
      const isValid = date instanceof Date && !isNaN(date.getTime());
      expect(isValid).toBe(false);
    });

    it('deve validar Timestamp do Firestore', () => {
      const timestamp = {
        toDate: () => new Date('2024-01-15T10:00:00'),
        seconds: 1705316400,
        nanoseconds: 0,
      };

      const dateObj = timestamp.toDate();
      const isValid = dateObj instanceof Date && !isNaN(dateObj.getTime());
      expect(isValid).toBe(true);
    });
  });

  describe('Conversão de Timestamp', () => {
    it('deve converter Timestamp para Date', () => {
      const timestamp = {
        toDate: () => new Date('2024-01-15T10:00:00'),
        seconds: 1705316400,
        nanoseconds: 0,
      };

      const date = timestamp.toDate();
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('deve lidar com Timestamp undefined', () => {
      const timestamp: any = undefined;
      const date = timestamp?.toDate ? timestamp.toDate() : new Date();
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('Cálculo de Diferença de Tempo', () => {
    it('deve calcular diferença em minutos corretamente', () => {
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T11:30:00');
      const diffMin = (end.getTime() - start.getTime()) / (1000 * 60);
      expect(diffMin).toBe(90);
    });

    it('deve calcular diferença em horas corretamente', () => {
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T14:00:00');
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(4);
    });

    it('deve calcular diferença em dias corretamente', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(5);
    });
  });
});

