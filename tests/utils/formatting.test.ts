import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Utilitários - Formatação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatCurrency', () => {
    it('deve formatar centavos para moeda BRL', () => {
      const formatCurrency = (centavos: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(centavos / 100);
      };

      expect(formatCurrency(10000)).toContain('100,00');
      expect(formatCurrency(10050)).toContain('100,50');
      expect(formatCurrency(1000)).toContain('10,00');
      expect(formatCurrency(100)).toContain('1,00');
      expect(formatCurrency(0)).toContain('0,00');
    });

    it('deve incluir símbolo R$', () => {
      const formatCurrency = (centavos: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(centavos / 100);
      };

      expect(formatCurrency(10000)).toMatch(/R\$/);
    });

    it('deve formatar valores grandes corretamente', () => {
      const formatCurrency = (centavos: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(centavos / 100);
      };

      expect(formatCurrency(1000000)).toContain('10.000,00');
      expect(formatCurrency(1234567)).toContain('12.345,67');
    });

    it('deve formatar valores decimais corretamente', () => {
      const formatCurrency = (centavos: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(centavos / 100);
      };

      expect(formatCurrency(10033)).toContain('100,33');
      expect(formatCurrency(10099)).toContain('100,99');
    });
  });

  describe('formatDuration', () => {
    it('deve formatar duração em minutos para horas e minutos', () => {
      const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) {
          return `${hours}h ${mins}min`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else {
          return `${mins}min`;
        }
      };

      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30min');
      expect(formatDuration(30)).toBe('30min');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(135)).toBe('2h 15min');
    });

    it('deve formatar duração de 0 minutos', () => {
      const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) {
          return `${hours}h ${mins}min`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else {
          return `${mins}min`;
        }
      };

      expect(formatDuration(0)).toBe('0min');
    });

    it('deve formatar durações longas corretamente', () => {
      const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) {
          return `${hours}h ${mins}min`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else {
          return `${mins}min`;
        }
      };

      expect(formatDuration(480)).toBe('8h');
      expect(formatDuration(495)).toBe('8h 15min');
    });
  });

  describe('formatPhoneNumber', () => {
    it('deve formatar telefone com 11 dígitos (com 9º dígito)', () => {
      const formatPhoneNumber = (phone?: string) => {
        if (!phone) return 'Telefone não informado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        if (cleaned.length === 10) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
      };

      const result = formatPhoneNumber('11999999999');
      expect(result).toBe('(11) 99999-9999');
    });

    it('deve formatar telefone com 10 dígitos (sem 9º dígito)', () => {
      const formatPhoneNumber = (phone?: string) => {
        if (!phone) return 'Telefone não informado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        if (cleaned.length === 10) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
      };

      const result = formatPhoneNumber('1188888888');
      expect(result).toBe('(11) 8888-8888');
    });

    it('deve retornar mensagem quando telefone não informado', () => {
      const formatPhoneNumber = (phone?: string) => {
        if (!phone) return 'Telefone não informado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        if (cleaned.length === 10) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
      };

      expect(formatPhoneNumber()).toBe('Telefone não informado');
      expect(formatPhoneNumber('')).toBe('Telefone não informado');
    });

    it('deve manter formato original se não for 10 ou 11 dígitos', () => {
      const formatPhoneNumber = (phone?: string) => {
        if (!phone) return 'Telefone não informado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        if (cleaned.length === 10) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
      };

      expect(formatPhoneNumber('12345')).toBe('12345');
      expect(formatPhoneNumber('+5511999999999')).toBe('+5511999999999');
    });
  });

  describe('formatDate', () => {
    it('deve formatar data no formato brasileiro', () => {
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      };

      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('deve formatar data e hora', () => {
      const formatDateTime = (date: Date) => {
        return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const date = new Date('2024-01-15T10:30:00');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('15/01/2024');
      expect(formatted).toContain('10:30');
    });
  });
});

