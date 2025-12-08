import { describe, it, expect } from 'vitest';
import { Appointment } from '@/types';

describe('Regras de Negócio - Cálculos Financeiros', () => {
  describe('Cálculo de Comissão do Salão', () => {
    it('deve calcular comissão corretamente com 30%', () => {
      const precoCentavos = 10000; // R$ 100,00
      const comissaoPercent = 30;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      
      expect(comissaoCentavos).toBe(3000); // R$ 30,00
    });

    it('deve calcular comissão corretamente com 50%', () => {
      const precoCentavos = 10000; // R$ 100,00
      const comissaoPercent = 50;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      
      expect(comissaoCentavos).toBe(5000); // R$ 50,00
    });

    it('deve calcular comissão zero quando percentual é 0', () => {
      const precoCentavos = 10000;
      const comissaoPercent = 0;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      
      expect(comissaoCentavos).toBe(0);
    });

    it('deve calcular comissão corretamente com valores decimais', () => {
      const precoCentavos = 10050; // R$ 100,50
      const comissaoPercent = 30;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      
      expect(comissaoCentavos).toBe(3015); // R$ 30,15 (arredondado)
    });
  });

  describe('Cálculo de Repasse para Profissional', () => {
    it('deve calcular repasse corretamente (preço - comissão)', () => {
      const precoCentavos = 10000; // R$ 100,00
      const comissaoPercent = 30;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      const repasseProfissional = precoCentavos - comissaoCentavos;
      
      expect(repasseProfissional).toBe(7000); // R$ 70,00
    });

    it('deve retornar valor total quando comissão é 0', () => {
      const precoCentavos = 10000;
      const comissaoPercent = 0;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      const repasseProfissional = precoCentavos - comissaoCentavos;
      
      expect(repasseProfissional).toBe(10000);
    });

    it('deve retornar 0 quando comissão é 100%', () => {
      const precoCentavos = 10000;
      const comissaoPercent = 100;
      const comissaoCentavos = Math.round(precoCentavos * comissaoPercent / 100);
      const repasseProfissional = precoCentavos - comissaoCentavos;
      
      expect(repasseProfissional).toBe(0);
    });
  });

  describe('Cálculo de Receita Total', () => {
    it('deve calcular receita total de múltiplos agendamentos', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
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
          id: '2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
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

      const receitaTotal = appointments.reduce((total, apt) => {
        const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
        return total + (apt.clientePresente !== false ? valorPago : 0);
      }, 0);

      expect(receitaTotal).toBe(25000); // R$ 250,00
    });

    it('deve ignorar agendamentos onde cliente não compareceu', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
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
          id: '2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
          precoCentavos: 15000,
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          status: 'concluido',
          clientePresente: false, // Cliente não compareceu
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const receitaTotal = appointments.reduce((total, apt) => {
        const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
        return total + (apt.clientePresente !== false ? valorPago : 0);
      }, 0);

      expect(receitaTotal).toBe(10000); // Apenas R$ 100,00
    });

    it('deve usar valorPagoCentavos quando disponível', () => {
      const appointment: Appointment = {
        id: '1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000, // Preço original
        valorPagoCentavos: 8000, // Valor efetivamente pago (desconto)
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const valorPago = appointment.valorPagoCentavos || appointment.precoCentavos;
      expect(valorPago).toBe(8000); // Deve usar valorPagoCentavos
    });
  });

  describe('Cálculo de Comissão por Profissional', () => {
    it('deve calcular comissão total por profissional', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
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
          id: '2',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client2',
          serviceId: 'service2',
          inicio: new Date('2024-01-15T14:00:00'),
          fim: new Date('2024-01-15T15:00:00'),
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

      const showCommission = true;
      let comissaoSalao = 0;

      appointments.forEach(appointment => {
        if (appointment.clientePresente !== false) {
          const valorPago = appointment.valorPagoCentavos || appointment.precoCentavos;
          const commissionPercent = showCommission ? (appointment.comissaoPercent ?? 0) : 0;
          const comissaoCentavos = Math.round(valorPago * commissionPercent / 100);
          comissaoSalao += showCommission ? comissaoCentavos : 0;
        }
      });

      expect(comissaoSalao).toBe(7500); // 30% de 100 + 30% de 150 = 30 + 45 = 75
    });

    it('deve calcular repasse total por profissional', () => {
      const appointments: Appointment[] = [
        {
          id: '1',
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
      ];

      const showCommission = true;
      let repasseProfissional = 0;

      appointments.forEach(appointment => {
        if (appointment.clientePresente !== false) {
          const valorPago = appointment.valorPagoCentavos || appointment.precoCentavos;
          const commissionPercent = showCommission ? (appointment.comissaoPercent ?? 0) : 0;
          const comissaoCentavos = Math.round(valorPago * commissionPercent / 100);
          repasseProfissional += showCommission ? (valorPago - comissaoCentavos) : valorPago;
        }
      });

      expect(repasseProfissional).toBe(7000); // 100 - 30 = 70
    });
  });

  describe('Cálculo quando showCommission é false', () => {
    it('deve retornar valor total quando comissão não é exibida', () => {
      const precoCentavos = 10000;
      const showCommission = false;
      const comissaoPercent = 30;

      const commissionPercent = showCommission ? comissaoPercent : 0;
      const comissaoCentavos = Math.round(precoCentavos * commissionPercent / 100);
      const repasseProfissional = showCommission ? (precoCentavos - comissaoCentavos) : precoCentavos;

      expect(repasseProfissional).toBe(10000);
      expect(comissaoCentavos).toBe(0);
    });
  });
});

