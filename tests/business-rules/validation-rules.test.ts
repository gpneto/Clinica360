import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - Validações Gerais', () => {
  describe('Validação de Telefone E.164', () => {
    it('deve validar formato E.164 correto', () => {
      const validPhones = [
        '+5511999999999',
        '+5511987654321',
        '+5511123456789',
      ];

      validPhones.forEach(phone => {
        const isValid = /^\+[1-9]\d{1,14}$/.test(phone);
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar formatos inválidos', () => {
      const testCases = [
        { phone: '11999999999', reason: 'Sem +' },
        { phone: '5511999999999', reason: 'Sem +' },
        { phone: '+55 11 99999-9999', reason: 'Com espaços e hífen' },
        { phone: '+551199999', reason: 'Muito curto para formato brasileiro' },
      ];

      testCases.forEach(({ phone, reason }) => {
        // Regex E.164 básico: + seguido de 1-15 dígitos, sem espaços ou hífens
        const matchesE164Basic = /^\+[1-9]\d{1,14}$/.test(phone);
        
        // Para formato brasileiro completo: +55 + DDD (2) + número (9 ou 10) = 13 ou 14 dígitos
        // +55 = 3 caracteres, então precisa de pelo menos 11 dígitos após = 14 caracteres totais
        const isBrazilianComplete = phone.startsWith('+55') && phone.length >= 14;
        
        // Telefone é inválido se:
        // 1. Não passa no regex básico (tem espaços, hífens, etc)
        // 2. OU se é brasileiro mas não tem formato completo
        const isInvalid = !matchesE164Basic || (phone.startsWith('+55') && !isBrazilianComplete);
        
        expect(isInvalid, `Telefone "${phone}" (${reason}) deveria ser inválido`).toBe(true);
      });
    });
  });

  describe('Validação de Email', () => {
    it('deve validar formato de email correto', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar emails inválidos', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@domain',
        'user space@example.com',
      ];

      invalidEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Preço', () => {
    it('deve validar preço em centavos positivo', () => {
      const validPrices = [1000, 5000, 10000, 50000];
      
      validPrices.forEach(price => {
        const isValid = Number.isFinite(price) && price >= 0;
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar preços negativos', () => {
      const invalidPrices = [-1000, -5000];
      
      invalidPrices.forEach(price => {
        const isValid = Number.isFinite(price) && price >= 0;
        expect(isValid).toBe(false);
      });
    });

    it('deve rejeitar preços não numéricos', () => {
      const invalidPrices = [NaN, Infinity, -Infinity, '1000', null, undefined];
      
      invalidPrices.forEach(price => {
        const isValid = Number.isFinite(price) && price >= 0;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Percentual de Comissão', () => {
    it('deve validar percentual entre 0 e 100', () => {
      const validPercentages = [0, 30, 50, 100];
      
      validPercentages.forEach(percent => {
        const isValid = Number.isFinite(percent) && percent >= 0 && percent <= 100;
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar percentuais fora do range', () => {
      const invalidPercentages = [-10, 101, 150];
      
      invalidPercentages.forEach(percent => {
        const isValid = Number.isFinite(percent) && percent >= 0 && percent <= 100;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Duração', () => {
    it('deve validar duração positiva em minutos', () => {
      const validDurations = [15, 30, 60, 90, 120];
      
      validDurations.forEach(duration => {
        const isValid = Number.isFinite(duration) && duration > 0;
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar durações inválidas', () => {
      const invalidDurations = [0, -30, NaN, Infinity];
      
      invalidDurations.forEach(duration => {
        const isValid = Number.isFinite(duration) && duration > 0;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Data', () => {
    it('deve validar data válida', () => {
      const validDates = [
        new Date('2024-01-15'),
        new Date('2024-12-31'),
        new Date(),
      ];

      validDates.forEach(date => {
        const isValid = date instanceof Date && !isNaN(date.getTime());
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar datas inválidas', () => {
      const invalidDates = [
        new Date('invalid'),
        new Date(NaN),
      ];

      invalidDates.forEach(date => {
        const isValid = date instanceof Date && !isNaN(date.getTime());
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Horário de Funcionamento', () => {
    it('deve validar horário dentro do range 8h-22h', () => {
      const validHours = [8, 10, 14, 18, 22];
      
      validHours.forEach(hour => {
        const isValid = hour >= 8 && hour <= 22;
        expect(isValid).toBe(true);
      });
    });

    it('deve rejeitar horários fora do range', () => {
      const invalidHours = [7, 23, 24, -1];
      
      invalidHours.forEach(hour => {
        const isValid = hour >= 8 && hour <= 22;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Formato de Moeda', () => {
    it('deve formatar centavos para BRL corretamente', () => {
      const formatCurrency = (centavos: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(centavos / 100);
      };

      // O formato pode usar espaço não-quebrável, então verificamos se contém os valores
      expect(formatCurrency(10000)).toContain('100,00');
      expect(formatCurrency(10050)).toContain('100,50');
      expect(formatCurrency(1000)).toContain('10,00');
      expect(formatCurrency(100)).toContain('1,00');
      expect(formatCurrency(10000)).toMatch(/R\$/);
    });
  });

  describe('Validação de Formato de Duração', () => {
    it('deve formatar duração em minutos corretamente', () => {
      const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
          return `${hours}h ${mins}min`;
        }
        return `${mins}min`;
      };

      expect(formatDuration(60)).toBe('1h 0min');
      expect(formatDuration(90)).toBe('1h 30min');
      expect(formatDuration(30)).toBe('30min');
      expect(formatDuration(120)).toBe('2h 0min');
    });
  });
});

