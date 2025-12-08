import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

/**
 * Teste para validar a correção de fuso horário no createAppointment
 * 
 * Este teste verifica que quando uma data sem timezone é fornecida
 * (ex: "2025-12-08T10:30:00"), ela é interpretada corretamente como
 * horário de Brasília e não como UTC, evitando o bug de criar
 * agendamentos 3 horas antes do horário solicitado.
 * 
 * Para executar este teste isoladamente:
 * npx vitest run timezone-fix.test.ts --config vitest.config.ts
 */

describe('Correção de Fuso Horário - createAppointment', () => {
  const TIMEZONE_BRASIL = 'America/Sao_Paulo';

  /**
   * Função auxiliar que simula a conversão de data sem timezone
   * (mesma lógica usada na função createAppointment em aiAssistant.ts)
   */
  function convertDateWithoutTimezone(inicio: string): Date {
    if (inicio.includes('Z') || inicio.includes('+') || inicio.includes('-', 10)) {
      // Tem timezone explícito, usar como está
      return new Date(inicio);
    } else {
      // Não tem timezone, interpretar como hora local do Brasil usando Luxon
      const match = inicio.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        // Usar Luxon para criar a data no timezone do Brasil
        const brazilDateTime = DateTime.fromObject(
          {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            second: parseInt(second || '0'),
          },
          { zone: TIMEZONE_BRASIL }
        );
        // Converter para Date JavaScript (já em UTC corretamente)
        return brazilDateTime.toJSDate();
      } else {
        return new Date(inicio);
      }
    }
  }

  describe('Conversão de datas sem timezone', () => {
    it('deve interpretar data sem timezone como horário de Brasília (10:30)', () => {
      // Data sem timezone: 10:30 no horário local
      const inicioISO = '2025-12-08T10:30:00';
      const inicioDate = convertDateWithoutTimezone(inicioISO);

      // Verificar que a data foi convertida corretamente
      const brazilTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      
      expect(brazilTime.hour).toBe(10);
      expect(brazilTime.minute).toBe(30);
      expect(brazilTime.day).toBe(8);
      expect(brazilTime.month).toBe(12);
      expect(brazilTime.year).toBe(2025);
    });

    it('deve manter o horário correto quando convertido de volta para Brasília', () => {
      const inicioISO = '2025-12-08T10:30:00';
      const inicioDate = convertDateWithoutTimezone(inicioISO);

      // Converter de volta para o timezone do Brasil
      const brazilDateTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      
      // Verificar que o horário permanece 10:30
      expect(brazilDateTime.toFormat('HH:mm')).toBe('10:30');
      expect(brazilDateTime.toFormat('dd/MM/yyyy')).toBe('08/12/2025');
    });

    it('não deve criar agendamento 3 horas antes do horário solicitado', () => {
      // Solicitar agendamento para 10:30
      const inicioISO = '2025-12-08T10:30:00';
      const inicioDate = convertDateWithoutTimezone(inicioISO);

      // Converter para horário de Brasília
      const brazilDateTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      
      // Verificar que NÃO é 07:30 (que seria o bug)
      // O bug seria: hora = 7 E minuto = 30
      const isBuggyTime = brazilDateTime.hour === 7 && brazilDateTime.minute === 30;
      expect(isBuggyTime).toBe(false);
      
      // Verificar que É 10:30 (correto)
      expect(brazilDateTime.hour).toBe(10);
      expect(brazilDateTime.minute).toBe(30);
    });

    it('deve tratar corretamente diferentes horários do dia', () => {
      const testCases = [
        { input: '2025-12-08T08:00:00', expectedHour: 8, expectedMinute: 0 },
        { input: '2025-12-08T14:30:00', expectedHour: 14, expectedMinute: 30 },
        { input: '2025-12-08T18:45:00', expectedHour: 18, expectedMinute: 45 },
        { input: '2025-12-08T23:59:00', expectedHour: 23, expectedMinute: 59 },
      ];

      testCases.forEach(({ input, expectedHour, expectedMinute }) => {
        const inicioDate = convertDateWithoutTimezone(input);
        const brazilDateTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
        
        expect(brazilDateTime.hour).toBe(expectedHour);
        expect(brazilDateTime.minute).toBe(expectedMinute);
      });
    });

    it('deve preservar timezone quando a string já tem timezone explícito', () => {
      // Data com timezone UTC
      const inicioISO = '2025-12-08T10:30:00Z';
      const inicioDate = convertDateWithoutTimezone(inicioISO);
      
      // Deve usar o timezone fornecido
      expect(inicioDate).toBeInstanceOf(Date);
      
      // Converter para Brasília para verificar
      const brazilDateTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      // 10:30 UTC = 07:30 em Brasília (UTC-3)
      expect(brazilDateTime.hour).toBe(7);
      expect(brazilDateTime.minute).toBe(30);
    });

    it('deve calcular corretamente a data de fim baseada na duração', () => {
      const inicioISO = '2025-12-08T10:30:00';
      const inicioDate = convertDateWithoutTimezone(inicioISO);
      
      // Simular cálculo de fim (60 minutos depois)
      const duracaoMinutos = 60;
      const fimDate = new Date(inicioDate.getTime() + duracaoMinutos * 60000);
      
      // Converter para horário de Brasília
      const inicioBrazil = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      const fimBrazil = DateTime.fromJSDate(fimDate).setZone(TIMEZONE_BRASIL);
      
      // Verificar que o fim é 1 hora depois do início
      expect(fimBrazil.hour).toBe(11);
      expect(fimBrazil.minute).toBe(30);
      expect(inicioBrazil.day).toBe(fimBrazil.day);
    });
  });

  describe('Cenário real: agendamento para 10:30', () => {
    it('deve criar agendamento para 10:30 e não para 07:30', () => {
      // Simular o que acontece quando o usuário solicita "agendamento para 10:30"
      const inicioISO = '2025-12-08T10:30:00'; // Sem timezone
      
      // Converter usando a função corrigida
      const inicioDate = convertDateWithoutTimezone(inicioISO);
      
      // Converter para horário de Brasília para verificação
      const brazilDateTime = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
      
      // Verificar que o horário é 10:30 (não 07:30)
      expect(brazilDateTime.hour).toBe(10);
      expect(brazilDateTime.minute).toBe(30);
      
      // O importante é que quando convertido de volta para Brasília, seja 10:30
      const utcDateTime = DateTime.fromJSDate(inicioDate).setZone('UTC');
      const backToBrazil = utcDateTime.setZone(TIMEZONE_BRASIL);
      expect(backToBrazil.hour).toBe(10);
      expect(backToBrazil.minute).toBe(30);
    });
  });
});
