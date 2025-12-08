import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do firebase-admin antes de importar
vi.mock('firebase-admin', () => {
  const mockFirestoreInstance = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({
          exists: false,
          data: () => null,
        })),
      })),
    })),
  };

  const mockFirestore = vi.fn(() => mockFirestoreInstance);

  const mockAdmin = {
    initializeApp: vi.fn(),
    apps: [],
    firestore: mockFirestore,
  };

  return {
    default: mockAdmin,
    ...mockAdmin,
  };
});

import {
  normalizarTelefone,
  normalizePhoneForContact,
  generatePhoneVariants,
  substituirParametros,
  templatesWhats,
} from '../src/whatsapp/whatsappEnvio';

describe('Firebase Functions - WhatsApp Envio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizarTelefone', () => {
    it('deve remover caracteres não numéricos', () => {
      const result = normalizarTelefone('+55 11 99999-9999');
      expect(result).toBe('5511999999999');
    });

    it('deve retornar string vazia para null', () => {
      const result = normalizarTelefone(null);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para undefined', () => {
      const result = normalizarTelefone(undefined);
      expect(result).toBe('');
    });

    it('deve manter apenas dígitos', () => {
      const result = normalizarTelefone('(11) 99999-9999');
      expect(result).toBe('11999999999');
    });
  });

  describe('normalizePhoneForContact', () => {
    it('deve normalizar número brasileiro com 9º dígito', () => {
      const result = normalizePhoneForContact('5511999999999');
      expect(result).toContain('5511999999999');
    });

    it('deve adicionar 9º dígito se necessário', () => {
      const result = normalizePhoneForContact('5511888888888');
      expect(result).toBeTruthy();
    });

    it('deve retornar string vazia para null', () => {
      const result = normalizePhoneForContact(null);
      expect(result).toBe('');
    });
  });

  describe('generatePhoneVariants', () => {
    it('deve gerar variantes de telefone brasileiro', () => {
      const variants = generatePhoneVariants('5511999999999');
      expect(variants.length).toBeGreaterThan(0);
      expect(variants).toContain('5511999999999');
    });

    it('deve incluir variante sem código do país', () => {
      const variants = generatePhoneVariants('5511999999999');
      expect(variants.some(v => v.startsWith('11'))).toBe(true);
    });

    it('deve retornar array vazio para número inválido', () => {
      const variants = generatePhoneVariants('');
      expect(variants).toEqual([]);
    });
  });

  describe('substituirParametros', () => {
    it('deve substituir parâmetros no template', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters = [
        { type: 'text', text: 'João' },
        { type: 'text', text: '15/01/2024' },
      ];

      const result = substituirParametros(template, parameters);
      expect(result).toBe('Olá, João! Seu agendamento é em 15/01/2024.');
    });

    it('deve substituir por string vazia se parâmetros não fornecidos', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters: Array<{ type: string; text: string }> = [];

      const result = substituirParametros(template, parameters);
      // A função substitui por string vazia quando parâmetro não existe
      expect(result).toBe('Olá, ! Seu agendamento é em .');
    });

    it('deve substituir apenas parâmetros fornecidos', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters = [
        { type: 'text', text: 'João' },
      ];

      const result = substituirParametros(template, parameters);
      expect(result).toContain('João');
      // {{2}} será substituído por string vazia
      expect(result).toBe('Olá, João! Seu agendamento é em .');
    });
  });

  describe('templatesWhats', () => {
    it('deve conter template de confirmação', () => {
      expect(templatesWhats.agendamento_informar_v2).toBeTruthy();
      expect(templatesWhats.agendamento_informar_v2).toContain('{{1}}');
    });

    it('deve conter template de lembrete', () => {
      expect(templatesWhats.agendamento_lembrar_v2).toBeTruthy();
      expect(templatesWhats.agendamento_lembrar_v2).toContain('{{1}}');
    });

    it('deve conter template de cancelamento', () => {
      expect(templatesWhats.agendamento_deletar_v2).toBeTruthy();
      expect(templatesWhats.agendamento_deletar_v2).toContain('{{1}}');
    });
  });

});

