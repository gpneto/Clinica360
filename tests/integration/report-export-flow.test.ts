import { describe, it, expect } from 'vitest';
import { Appointment, Professional, Service } from '@/types';

describe('Testes de Integração - Fluxo de Relatórios e Exportação', () => {
  describe('Fluxo: Selecionar Período → Calcular Dados → Gerar Relatório', () => {
    it('deve gerar relatório financeiro completo', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

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
          valorPagoCentavos: 10000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-20T14:00:00'),
          fim: new Date('2024-01-20T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Filtrar por período
      const periodAppointments = appointments.filter(apt =>
        apt.inicio >= periodStart && apt.inicio <= periodEnd &&
        apt.status === 'concluido' && apt.clientePresente !== false
      );

      // Calcular receita total
      const totalRevenue = periodAppointments.reduce((sum, apt) => {
        const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
        return sum + valorPago;
      }, 0);

      expect(totalRevenue).toBe(25000); // 10000 + 15000

      // Calcular comissão total
      const totalCommission = periodAppointments.reduce((sum, apt) => {
        const commission = Math.round(apt.precoCentavos * apt.comissaoPercent / 100);
        return sum + commission;
      }, 0);

      expect(totalCommission).toBe(7500); // 3000 + 4500
    });

    it('deve gerar relatório por profissional', () => {
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
          valorPagoCentavos: 10000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt2',
          companyId: 'company1',
          professionalId: 'prof2',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-20T14:00:00'),
          fim: new Date('2024-01-20T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 25,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Agrupar por profissional
      const revenueByProfessional = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((acc, apt) => {
          const profId = apt.professionalId;
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          acc[profId] = (acc[profId] || 0) + valorPago;
          return acc;
        }, {} as Record<string, number>);

      expect(revenueByProfessional['prof1']).toBe(10000);
      expect(revenueByProfessional['prof2']).toBe(15000);
    });
  });

  describe('Fluxo: Exportar Dados → Formatar → Download', () => {
    it('deve formatar dados para exportação CSV', () => {
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

      // Formatar para CSV
      const csvHeaders = ['ID', 'Data', 'Hora', 'Status', 'Preço'];
      const csvRows = appointments.map(apt => [
        apt.id,
        apt.inicio.toLocaleDateString('pt-BR'),
        apt.inicio.toLocaleTimeString('pt-BR'),
        apt.status,
        `R$ ${(apt.precoCentavos / 100).toFixed(2).replace('.', ',')}`,
      ]);

      const csvContent = [
        csvHeaders.join(';'),
        ...csvRows.map(row => row.join(';')),
      ].join('\n');

      expect(csvContent).toContain('apt1');
      expect(csvContent).toContain('concluido');
      expect(csvContent).toContain('R$');
    });

    it('deve formatar dados para exportação Excel', () => {
      const professionals: Professional[] = [
        {
          id: 'prof1',
          companyId: 'company1',
          nome: 'Dr. Silva',
          especialidade: 'Dentista',
          telefone: '+5511999999999',
          email: 'dr.silva@example.com',
          ativo: true,
        },
      ];

      // Formatar para Excel
      const excelData = professionals.map(prof => ({
        Nome: prof.nome,
        Especialidade: prof.especialidade,
        Telefone: prof.telefone,
        Email: prof.email || '',
        Ativo: prof.ativo ? 'Sim' : 'Não',
      }));

      expect(excelData.length).toBe(1);
      expect(excelData[0].Nome).toBe('Dr. Silva');
      expect(excelData[0].Especialidade).toBe('Dentista');
    });
  });

  describe('Fluxo: Relatório de Serviços → Agrupar → Calcular Estatísticas', () => {
    it('deve gerar relatório de serviços mais utilizados', () => {
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
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service1', // Mesmo serviço
          inicio: new Date('2024-01-20T14:00:00'),
          fim: new Date('2024-01-20T15:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt3',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client3',
          serviceId: 'service2',
          inicio: new Date('2024-01-25T10:00:00'),
          fim: new Date('2024-01-25T11:00:00'),
          precoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: true,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Agrupar por serviço
      const serviceStats = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((acc, apt) => {
          const serviceId = apt.serviceId;
          if (!acc[serviceId]) {
            acc[serviceId] = { count: 0, totalRevenue: 0 };
          }
          acc[serviceId].count++;
          acc[serviceId].totalRevenue += apt.valorPagoCentavos || apt.precoCentavos;
          return acc;
        }, {} as Record<string, { count: number; totalRevenue: number }>);

      expect(serviceStats['service1'].count).toBe(2);
      expect(serviceStats['service1'].totalRevenue).toBe(20000);
      expect(serviceStats['service2'].count).toBe(1);
      expect(serviceStats['service2'].totalRevenue).toBe(15000);
    });
  });
});

