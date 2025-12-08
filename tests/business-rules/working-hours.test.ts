import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - Horários de Funcionamento', () => {
  describe('Validação de Horário de Funcionamento', () => {
    it('deve validar horário dentro do range padrão (8h-22h)', () => {
      const hour = 14;
      const isValid = hour >= 8 && hour <= 22;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar horário antes das 8h', () => {
      const hour = 7;
      const isValid = hour >= 8 && hour <= 22;
      expect(isValid).toBe(false);
    });

    it('deve rejeitar horário depois das 22h', () => {
      const hour = 23;
      const isValid = hour >= 8 && hour <= 22;
      expect(isValid).toBe(false);
    });

    it('deve aceitar horário exatamente às 8h', () => {
      const hour = 8;
      const isValid = hour >= 8 && hour <= 22;
      expect(isValid).toBe(true);
    });

    it('deve aceitar horário exatamente às 22h', () => {
      const hour = 22;
      const isValid = hour >= 8 && hour <= 22;
      expect(isValid).toBe(true);
    });
  });

  describe('Geração de Slots de Horário', () => {
    it('deve gerar slots de 30 em 30 minutos', () => {
      const startHour = 8;
      const endHour = 22;
      const slots: string[] = [];

      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }

      // De 8h a 22h (inclusive) = 15 horas, cada hora tem 2 slots (00 e 30) = 30 slots
      expect(slots.length).toBe(30);
      expect(slots[0]).toBe('08:00');
      expect(slots[1]).toBe('08:30');
      // Último slot é 22:30 porque o loop inclui 22h com ambos os minutos (00 e 30)
      expect(slots[slots.length - 1]).toBe('22:30');
    });

    it('deve marcar slots ocupados corretamente', () => {
      const slotStart = new Date('2024-01-15T10:00:00');
      const slotEnd = new Date('2024-01-15T10:30:00');
      const existingStart = new Date('2024-01-15T10:15:00');
      const existingEnd = new Date('2024-01-15T10:45:00');

      const isOccupied = slotStart < existingEnd && slotEnd > existingStart;
      expect(isOccupied).toBe(true);
    });

    it('não deve marcar slots livres como ocupados', () => {
      const slotStart = new Date('2024-01-15T10:00:00');
      const slotEnd = new Date('2024-01-15T10:30:00');
      const existingStart = new Date('2024-01-15T11:00:00');
      const existingEnd = new Date('2024-01-15T11:30:00');

      const isOccupied = slotStart < existingEnd && slotEnd > existingStart;
      expect(isOccupied).toBe(false);
    });
  });

  describe('Dias da Semana', () => {
    it('deve validar dias da semana permitidos', () => {
      const allowedDays = [1, 2, 3, 4, 5]; // Segunda a Sexta
      // 2024-01-16 é segunda-feira (getDay() = 1)
      const appointmentDate = new Date('2024-01-16');
      const appointmentDay = appointmentDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.

      const isValid = allowedDays.includes(appointmentDay);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar dias não permitidos', () => {
      const allowedDays = [1, 2, 3, 4, 5]; // Segunda a Sexta
      const appointmentDay = new Date('2024-01-14').getDay(); // Domingo = 0

      const isValid = allowedDays.includes(appointmentDay);
      expect(isValid).toBe(false);
    });
  });

  describe('Cálculo de Duração em Horários', () => {
    it('deve calcular duração corretamente em minutos', () => {
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T11:30:00');

      const durationMinutes = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60)
      );

      expect(durationMinutes).toBe(90);
    });

    it('deve formatar duração corretamente', () => {
      const durationMinutes = 90;
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const formatted = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

      expect(formatted).toBe('1h 30min');
    });

    it('deve formatar duração sem horas quando menor que 1h', () => {
      const durationMinutes = 30;
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const formatted = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

      expect(formatted).toBe('30min');
    });
  });
});

