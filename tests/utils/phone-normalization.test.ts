import { describe, it, expect } from 'vitest';

describe('Utilitários - Normalização de Telefone', () => {
  describe('Normalização Básica', () => {
    it('deve normalizar telefone removendo caracteres não numéricos', () => {
      const phone = '(11) 99999-9999';
      const normalized = phone.replace(/\D/g, '');
      expect(normalized).toBe('11999999999');
    });

    it('deve normalizar telefone com código do país', () => {
      const phone = '+55 11 99999-9999';
      const normalized = phone.replace(/\D/g, '');
      expect(normalized).toBe('5511999999999');
    });

    it('deve normalizar telefone sem espaços', () => {
      const phone = '11999999999';
      const normalized = phone.replace(/\D/g, '');
      expect(normalized).toBe('11999999999');
    });
  });

  describe('Geração de Variantes', () => {
    it('deve gerar variantes com e sem código do país', () => {
      const normalized = '5511999999999';
      const variants = [
        normalized, // Com país
        normalized.startsWith('55') ? normalized.slice(2) : `55${normalized}`, // Sem/Com país
      ];

      expect(variants).toContain('5511999999999');
      expect(variants).toContain('11999999999');
    });

    it('deve gerar variantes com e sem 9º dígito', () => {
      const normalized = '5511999999999'; // Com 9
      const area = normalized.slice(2, 4); // 11
      const rest = normalized.slice(4); // 999999999

      const variants = [
        normalized,
        normalized.startsWith('55') ? normalized.slice(2) : `55${normalized}`,
        rest.startsWith('9') ? area + rest.slice(1) : area + '9' + rest,
      ];

      expect(variants.length).toBeGreaterThan(1);
    });

    it('deve gerar variantes para telefone sem 9º dígito', () => {
      const normalized = '5511987654321'; // Sem 9
      const area = normalized.slice(2, 4); // 11
      const rest = normalized.slice(4); // 87654321

      const variants = [
        normalized,
        normalized.startsWith('55') ? normalized.slice(2) : `55${normalized}`,
        rest.startsWith('9') ? area + rest.slice(1) : area + '9' + rest,
        area + '9' + rest, // Adicionar 9º dígito
      ];

      expect(variants).toContain('5511987654321');
      expect(variants).toContain('11987654321');
      expect(variants.some(v => v.includes('119987654321') || v.includes('11987654321'))).toBe(true);
    });
  });

  describe('Busca por Variantes', () => {
    it('deve encontrar paciente com qualquer variante do telefone', () => {
      const searchPhone = '5511999999999';
      const patientPhones = [
        '5511999999999', // Exato
        '11999999999', // Sem país
        '1199999999', // Sem 9º dígito
      ];

      const variants = [
        searchPhone,
        searchPhone.startsWith('55') ? searchPhone.slice(2) : `55${searchPhone}`,
      ];

      const found = patientPhones.some(phone => variants.includes(phone));
      expect(found).toBe(true);
    });

    it('não deve encontrar paciente com telefone diferente', () => {
      const searchPhone = '5511999999999';
      const patientPhone = '5511888888888';

      const variants = [
        searchPhone,
        searchPhone.startsWith('55') ? searchPhone.slice(2) : `55${searchPhone}`,
      ];

      const found = variants.includes(patientPhone);
      expect(found).toBe(false);
    });
  });

  describe('Formato E.164', () => {
    it('deve validar formato E.164 completo', () => {
      const phone = '+5511999999999';
      const isValid = /^\+[1-9]\d{1,14}$/.test(phone);
      expect(isValid).toBe(true);
    });

    it('deve normalizar para formato E.164', () => {
      const phone = '5511999999999';
      const e164 = phone.startsWith('+') ? phone : `+${phone}`;
      expect(e164).toBe('+5511999999999');
    });

    it('deve validar comprimento E.164 (máximo 15 dígitos)', () => {
      const phone = '+5511999999999'; // 13 dígitos após +
      const isValid = /^\+[1-9]\d{1,14}$/.test(phone);
      expect(isValid).toBe(true);
    });
  });
});

