import { describe, it, expect } from 'vitest';
import { Appointment, Patient } from '@/types';

describe('Utilitários - Exportação de Dados', () => {
  describe('Exportação para CSV', () => {
    it('deve formatar dados para CSV', () => {
      const appointments: Appointment[] = [
        {
          id: 'apt1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'concluido',
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Simular formatação CSV
      const csvHeaders = ['ID', 'Data', 'Hora', 'Status', 'Preço'];
      const csvRow = [
        appointments[0].id,
        appointments[0].inicio.toLocaleDateString('pt-BR'),
        appointments[0].inicio.toLocaleTimeString('pt-BR'),
        appointments[0].status,
        `R$ ${(appointments[0].precoCentavos / 100).toFixed(2).replace('.', ',')}`,
      ];

      const csvLine = csvRow.join(';');
      expect(csvLine).toContain('apt1');
      expect(csvLine).toContain('concluido');
    });

    it('deve escapar caracteres especiais em CSV', () => {
      const data = 'Texto com "aspas" e vírgulas, pontos.';
      // CSV geralmente usa aspas para escapar
      const escaped = `"${data.replace(/"/g, '""')}"`;
      
      expect(escaped).toContain('""'); // Aspas duplicadas
    });
  });

  describe('Exportação para Excel', () => {
    it('deve formatar dados para Excel', () => {
      const patients: Patient[] = [
        {
          id: '1',
          nome: 'João Silva',
          telefoneE164: '+5511999999999',
          email: 'joao@example.com',
          companyId: 'company1',
        },
      ];

      // Simular estrutura de dados para Excel
      const excelData = patients.map(patient => ({
        Nome: patient.nome,
        Telefone: patient.telefoneE164,
        Email: patient.email || '',
      }));

      expect(excelData.length).toBe(1);
      expect(excelData[0].Nome).toBe('João Silva');
      expect(excelData[0].Telefone).toBe('+5511999999999');
    });

    it('deve lidar com valores nulos/undefined', () => {
      const patients: Patient[] = [
        {
          id: '1',
          nome: 'João Silva',
          telefoneE164: '+5511999999999',
          companyId: 'company1',
          // email ausente
        },
      ];

      const excelData = patients.map(patient => ({
        Nome: patient.nome,
        Telefone: patient.telefoneE164,
        Email: patient.email || '',
      }));

      expect(excelData[0].Email).toBe('');
    });
  });

  describe('Validação de Encoding', () => {
    it('deve manter caracteres especiais brasileiros', () => {
      const data = 'João, Maria, José, São Paulo';
      const encoded = encodeURIComponent(data);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(data);
    });

    it('deve lidar com acentos corretamente', () => {
      const data = 'Ação, Coração, Açúcar';
      const encoded = encodeURIComponent(data);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(data);
    });
  });

  describe('Formatação de Dados Exportados', () => {
    it('deve formatar datas para exportação', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('deve formatar valores monetários para exportação', () => {
      const centavos = 10050;
      const formatted = `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

      expect(formatted).toBe('R$ 100,50');
    });
  });
});

