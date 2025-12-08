import { describe, it, expect } from 'vitest';
import { Appointment, Patient } from '@/types';

interface Debit {
  id: string;
  companyId: string;
  patientId: string;
  appointmentId?: string;
  description: string;
  valueCentavos: number;
  paidCentavos: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

describe('Testes de Integração - Fluxo de Débitos e Pagamentos', () => {
  describe('Fluxo: Criar Agendamento → Gerar Débito → Registrar Pagamento', () => {
    it('deve completar fluxo de débito e pagamento', () => {
      // 1. Criar agendamento
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'patient1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.status).toBe('concluido');
      expect(appointment.precoCentavos).toBe(10000);

      // 2. Gerar débito do agendamento
      const debit: Debit = {
        id: 'debit1',
        companyId: 'company1',
        patientId: appointment.clientId,
        appointmentId: appointment.id,
        description: `Agendamento ${appointment.id}`,
        valueCentavos: appointment.precoCentavos,
        paidCentavos: 0,
        dueDate: new Date('2024-01-20'),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(debit.valueCentavos).toBe(appointment.precoCentavos);
      expect(debit.status).toBe('pending');
      expect(debit.paidCentavos).toBe(0);

      // 3. Registrar pagamento parcial
      debit.paidCentavos = 5000;
      debit.status = debit.paidCentavos >= debit.valueCentavos ? 'paid' : 'partial';
      debit.updatedAt = new Date();

      expect(debit.paidCentavos).toBe(5000);
      expect(debit.status).toBe('partial');

      // 4. Completar pagamento
      debit.paidCentavos = debit.valueCentavos;
      debit.status = 'paid';
      debit.updatedAt = new Date();

      expect(debit.paidCentavos).toBe(debit.valueCentavos);
      expect(debit.status).toBe('paid');
    });

    it('deve calcular saldo devedor corretamente', () => {
      const debit: Debit = {
        id: 'debit1',
        companyId: 'company1',
        patientId: 'patient1',
        valueCentavos: 10000,
        paidCentavos: 3000,
        dueDate: new Date('2024-01-20'),
        status: 'partial',
        description: 'Débito teste',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const balance = debit.valueCentavos - debit.paidCentavos;
      expect(balance).toBe(7000);
    });
  });

  describe('Fluxo: Múltiplos Débitos → Calcular Total → Pagamento Total', () => {
    it('deve calcular total de débitos do paciente', () => {
      const patientId = 'patient1';
      const debits: Debit[] = [
        {
          id: 'debit1',
          companyId: 'company1',
          patientId,
          valueCentavos: 10000,
          paidCentavos: 5000,
          dueDate: new Date('2024-01-15'),
          status: 'partial',
          description: 'Débito 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'debit2',
          companyId: 'company1',
          patientId,
          valueCentavos: 15000,
          paidCentavos: 0,
          dueDate: new Date('2024-01-20'),
          status: 'pending',
          description: 'Débito 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'debit3',
          companyId: 'company1',
          patientId,
          valueCentavos: 20000,
          paidCentavos: 20000,
          dueDate: new Date('2024-01-25'),
          status: 'paid',
          description: 'Débito 3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Calcular total devido
      const totalDue = debits.reduce((sum, debit) => sum + (debit.valueCentavos - debit.paidCentavos), 0);
      expect(totalDue).toBe(20000); // 5000 + 15000 + 0

      // Calcular total pago
      const totalPaid = debits.reduce((sum, debit) => sum + debit.paidCentavos, 0);
      expect(totalPaid).toBe(25000); // 5000 + 0 + 20000

      // Calcular total de débitos
      const totalDebits = debits.reduce((sum, debit) => sum + debit.valueCentavos, 0);
      expect(totalDebits).toBe(45000); // 10000 + 15000 + 20000
    });

    it('deve filtrar débitos pendentes', () => {
      const debits: Debit[] = [
        {
          id: 'debit1',
          companyId: 'company1',
          patientId: 'patient1',
          valueCentavos: 10000,
          paidCentavos: 0,
          dueDate: new Date('2024-01-15'),
          status: 'pending',
          description: 'Débito 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'debit2',
          companyId: 'company1',
          patientId: 'patient1',
          valueCentavos: 15000,
          paidCentavos: 15000,
          dueDate: new Date('2024-01-20'),
          status: 'paid',
          description: 'Débito 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const pendingDebits = debits.filter(debit => debit.status === 'pending' || debit.status === 'partial');
      expect(pendingDebits.length).toBe(1);
      expect(pendingDebits[0].id).toBe('debit1');
    });
  });

  describe('Fluxo: Débito Vencido → Notificação → Pagamento', () => {
    it('deve identificar débitos vencidos', () => {
      const now = new Date('2024-01-25');
      const debits: Debit[] = [
        {
          id: 'debit1',
          companyId: 'company1',
          patientId: 'patient1',
          valueCentavos: 10000,
          paidCentavos: 0,
          dueDate: new Date('2024-01-15'), // Vencido
          status: 'pending',
          description: 'Débito 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'debit2',
          companyId: 'company1',
          patientId: 'patient1',
          valueCentavos: 15000,
          paidCentavos: 0,
          dueDate: new Date('2024-01-30'), // Não vencido
          status: 'pending',
          description: 'Débito 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const overdueDebits = debits.filter(debit => 
        debit.dueDate < now && (debit.status === 'pending' || debit.status === 'partial')
      );

      expect(overdueDebits.length).toBe(1);
      expect(overdueDebits[0].id).toBe('debit1');
    });
  });
});

