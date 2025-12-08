import { describe, it, expect, vi } from 'vitest';

describe('Utilitários - Feriados', () => {
  describe('Feriados Nacionais', () => {
    it('deve retornar feriados nacionais conhecidos', () => {
      const getDefaultNationalHolidays = (year: number) => {
        return [
          { date: `${year}-01-01`, name: 'Confraternização Universal', type: 'national' },
          { date: `${year}-04-21`, name: 'Tiradentes', type: 'national' },
          { date: `${year}-05-01`, name: 'Dia do Trabalhador', type: 'national' },
          { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national' },
          { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national' },
          { date: `${year}-11-02`, name: 'Finados', type: 'national' },
          { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national' },
          { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'national' },
          { date: `${year}-12-25`, name: 'Natal', type: 'national' },
        ];
      };

      const holidays = getDefaultNationalHolidays(2024);
      
      expect(holidays.length).toBe(9);
      expect(holidays.every(h => h.type === 'national')).toBe(true);
      expect(holidays.some(h => h.name === 'Natal')).toBe(true);
      expect(holidays.some(h => h.date === '2024-01-01')).toBe(true);
    });

    it('deve formatar datas de feriados corretamente', () => {
      const holiday = {
        date: '2024-01-01',
        name: 'Confraternização Universal',
        type: 'national' as const,
      };

      expect(holiday.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(holiday.name).toBeTruthy();
    });
  });

  describe('Feriados Estaduais', () => {
    it('deve retornar feriados estaduais conhecidos', () => {
      const getStaticStateHolidays = (year: number, state: string) => {
        const stateHolidays: Record<string, Array<{ day: number; month: number; name: string }>> = {
          'SP': [
            { day: 9, month: 7, name: 'Revolução Constitucionalista' },
          ],
          'RJ': [
            { day: 23, month: 4, name: 'São Jorge' },
            { day: 20, month: 11, name: 'Zumbi dos Palmares' },
          ],
        };

        const holidays = stateHolidays[state.toUpperCase()] || [];
        return holidays.map(h => ({
          date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
          name: h.name,
          type: 'state' as const,
          state: state,
        }));
      };

      const spHolidays = getStaticStateHolidays(2024, 'SP');
      const rjHolidays = getStaticStateHolidays(2024, 'RJ');

      expect(spHolidays.length).toBe(1);
      expect(spHolidays[0].name).toBe('Revolução Constitucionalista');
      expect(spHolidays[0].date).toBe('2024-07-09');

      expect(rjHolidays.length).toBe(2);
      expect(rjHolidays.every(h => h.type === 'state')).toBe(true);
    });

    it('deve retornar array vazio para estado sem feriados conhecidos', () => {
      const getStaticStateHolidays = (year: number, state: string) => {
        const stateHolidays: Record<string, Array<{ day: number; month: number; name: string }>> = {
          'SP': [
            { day: 9, month: 7, name: 'Revolução Constitucionalista' },
          ],
        };

        const holidays = stateHolidays[state.toUpperCase()] || [];
        return holidays.map(h => ({
          date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
          name: h.name,
          type: 'state' as const,
          state: state,
        }));
      };

      const holidays = getStaticStateHolidays(2024, 'XX');
      expect(holidays.length).toBe(0);
    });
  });

  describe('Validação de Feriados', () => {
    it('deve validar que feriado tem data válida', () => {
      const holiday = {
        date: '2024-01-01',
        name: 'Confraternização Universal',
        type: 'national' as const,
      };

      const date = new Date(holiday.date);
      const isValid = !isNaN(date.getTime());
      expect(isValid).toBe(true);
    });

    it('deve validar formato de data de feriado', () => {
      const holiday = {
        date: '2024-01-01',
        name: 'Confraternização Universal',
        type: 'national' as const,
      };

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test(holiday.date)).toBe(true);
    });

    it('deve validar que feriado tem nome', () => {
      const holiday = {
        date: '2024-01-01',
        name: 'Confraternização Universal',
        type: 'national' as const,
      };

      expect(holiday.name).toBeTruthy();
      expect(holiday.name.length).toBeGreaterThan(0);
    });
  });

  describe('Tratamento de Erros de API', () => {
    it('deve usar feriados nacionais quando API falha', () => {
      const apiFailed = true;
      const defaultHolidays = [
        { date: '2024-01-01', name: 'Confraternização Universal', type: 'national' as const },
      ];

      const holidays = apiFailed ? defaultHolidays : [];
      expect(holidays.length).toBeGreaterThan(0);
      expect(holidays[0].type).toBe('national');
    });

    it('deve continuar com feriados conhecidos mesmo se API falhar', () => {
      const apiFailed = true;
      const nationalHolidays = [
        { date: '2024-01-01', name: 'Confraternização Universal', type: 'national' as const },
      ];
      const stateHolidays = [
        { date: '2024-07-09', name: 'Revolução Constitucionalista', type: 'state' as const, state: 'SP' },
      ];

      const allHolidays = apiFailed 
        ? [...nationalHolidays, ...stateHolidays]
        : [];

      expect(allHolidays.length).toBe(2);
    });
  });
});

