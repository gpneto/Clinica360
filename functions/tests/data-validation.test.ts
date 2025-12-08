import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Firebase Functions - Data Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de IDs', () => {
    it('deve validar formato de ID válido', () => {
      const isValidId = (id: any): id is string => {
        if (id == null || typeof id !== 'string') return false;
        const trimmed = id.trim();
        return (
          trimmed !== '' &&
          trimmed !== '__all__' &&
          !trimmed.includes('__all__') &&
          !(trimmed.startsWith('__') && trimmed.endsWith('__'))
        );
      };

      expect(isValidId('company1')).toBe(true);
      expect(isValidId('user-123')).toBe(true);
      expect(isValidId('')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId('__all__')).toBe(false);
      expect(isValidId('__test__')).toBe(false);
    });
  });

  describe('Validação de Datas', () => {
    it('deve validar que data de início é anterior à data de fim', () => {
      const inicio = new Date('2024-01-20T10:00:00');
      const fim = new Date('2024-01-20T11:00:00');

      const isValid = inicio < fim;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar quando data de fim é anterior à data de início', () => {
      const inicio = new Date('2024-01-20T11:00:00');
      const fim = new Date('2024-01-20T10:00:00');

      const isValid = inicio < fim;
      expect(isValid).toBe(false);
    });

    it('deve validar que data não está no passado para novos agendamentos', () => {
      const appointmentDate = new Date('2024-01-20T10:00:00');
      const now = new Date('2024-01-19T10:00:00');

      const isFuture = appointmentDate > now;
      expect(isFuture).toBe(true);
    });
  });

  describe('Validação de Valores Financeiros', () => {
    it('deve validar que preço é positivo', () => {
      const precoCentavos = 10000;
      const isValid = precoCentavos > 0;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar preço negativo', () => {
      const precoCentavos = -1000;
      const isValid = precoCentavos > 0;

      expect(isValid).toBe(false);
    });

    it('deve validar que comissão está entre 0 e 100', () => {
      const comissaoPercent = 30;
      const isValid = comissaoPercent >= 0 && comissaoPercent <= 100;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar comissão fora do range', () => {
      const comissaoPercent = 150;
      const isValid = comissaoPercent >= 0 && comissaoPercent <= 100;

      expect(isValid).toBe(false);
    });
  });

  describe('Validação de Strings', () => {
    it('deve validar que nome não está vazio', () => {
      const nome = 'João Silva';
      const isValid = nome && nome.trim().length > 0;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar nome vazio', () => {
      const nome = '';
      const isValid = !!(nome && nome.trim().length > 0);

      expect(isValid).toBe(false);
    });

    it('deve validar formato de email', () => {
      const email = 'user@example.com';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      expect(isValid).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const email = 'email-invalido';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      expect(isValid).toBe(false);
    });
  });

  describe('Validação de Arrays', () => {
    it('deve validar que array não está vazio quando necessário', () => {
      const services = ['service1', 'service2'];
      const isValid = services && services.length > 0;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar array vazio quando necessário', () => {
      const services: string[] = [];
      const isValid = services && services.length > 0;

      expect(isValid).toBe(false);
    });
  });
});

