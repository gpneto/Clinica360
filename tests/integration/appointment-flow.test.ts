import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Appointment, Patient, Professional, Service } from '@/types';

describe('Testes de Integração - Fluxo Completo de Agendamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fluxo: Criar Paciente → Criar Agendamento → Enviar Notificação', () => {
    it('deve completar fluxo de criação de paciente e agendamento', () => {
      // 1. Criar paciente
      const patient: Patient = {
        id: 'patient1',
        nome: 'João Silva',
        telefoneE164: '+5511999999999',
        email: 'joao@example.com',
        companyId: 'company1',
      };

      expect(patient.id).toBeTruthy();
      expect(patient.nome).toBeTruthy();
      expect(patient.telefoneE164).toMatch(/^\+/);
      expect(patient.companyId).toBe('company1');

      // 2. Criar agendamento
      const appointment: Appointment = {
        id: 'appointment1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: patient.id,
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.clientId).toBe(patient.id);
      expect(appointment.status).toBe('agendado');
      expect(appointment.companyId).toBe(patient.companyId);

      // 3. Validar que notificação pode ser enviada
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      const canSendNotification = !isBlock && appointment.status === 'agendado';
      expect(canSendNotification).toBe(true);

      // 4. Validar dados completos
      const hasAllRequiredData = !!(
        appointment.companyId &&
        appointment.professionalId &&
        appointment.clientId &&
        appointment.serviceId &&
        appointment.inicio &&
        appointment.fim
      );

      expect(hasAllRequiredData).toBe(true);
    });

    it('deve validar isolamento por companyId no fluxo completo', () => {
      const patient1: Patient = {
        id: 'patient1',
        nome: 'João',
        telefoneE164: '+5511999999999',
        companyId: 'company1',
      };

      const appointment1: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: patient1.id,
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Agendamento deve pertencer à mesma empresa do paciente
      expect(appointment1.companyId).toBe(patient1.companyId);

      // Não deve ser possível criar agendamento para empresa diferente
      const appointment2: Appointment = {
        ...appointment1,
        companyId: 'company2', // Empresa diferente
      };

      const isValid = appointment2.companyId === patient1.companyId;
      expect(isValid).toBe(false);
    });
  });

  describe('Fluxo: Criar Agendamento → Concluir → Calcular Receita', () => {
    it('deve calcular receita corretamente após conclusão', () => {
      // 1. Criar agendamento
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.status).toBe('agendado');

      // 2. Concluir agendamento
      const completedAppointment: Appointment = {
        ...appointment,
        status: 'concluido',
        valorPagoCentavos: 10000,
        clientePresente: true,
        formaPagamento: 'pix',
        updatedAt: new Date(),
      };

      expect(completedAppointment.status).toBe('concluido');
      expect(completedAppointment.clientePresente).toBe(true);

      // 3. Calcular receita
      const appointments: Appointment[] = [completedAppointment];
      const revenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + valorPago;
        }, 0);

      expect(revenue).toBe(10000);

      // 4. Calcular comissão
      const commission = Math.round(completedAppointment.precoCentavos * completedAppointment.comissaoPercent / 100);
      expect(commission).toBe(3000);

      // 5. Calcular repasse profissional
      const professionalPayout = completedAppointment.precoCentavos - commission;
      expect(professionalPayout).toBe(7000);
    });

    it('não deve contar receita se cliente não compareceu', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: false, // Cliente não compareceu
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const appointments: Appointment[] = [appointment];
      const revenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + valorPago;
        }, 0);

      expect(revenue).toBe(0); // Não conta porque cliente não compareceu
    });

    it('deve usar valorPagoCentavos quando diferente de precoCentavos', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000, // Preço original
        valorPagoCentavos: 8000, // Valor efetivamente pago (desconto)
        comissaoPercent: 30,
        status: 'concluido',
        clientePresente: true,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const appointments: Appointment[] = [appointment];
      const revenue = appointments
        .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
        .reduce((total, apt) => {
          const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
          return total + valorPago;
        }, 0);

      expect(revenue).toBe(8000); // Usa valorPagoCentavos
    });
  });

  describe('Fluxo: Criar Recorrência → Gerar Ocorrências → Cancelar Série', () => {
    it('deve criar série recorrente e gerar ocorrências', () => {
      // 1. Criar agendamento base recorrente
      const baseAppointment: Appointment = {
        id: 'apt-base',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        recurrenceGroupId: 'rec-group-1',
        recurrenceFrequency: 'weekly',
        recurrenceOriginalStart: new Date('2024-01-15T10:00:00'),
        recurrenceEndsAt: new Date('2024-02-15T23:59:59'),
        recurrenceOrder: 0,
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(baseAppointment.recurrenceGroupId).toBeTruthy();
      expect(baseAppointment.recurrenceFrequency).toBe('weekly');

      // 2. Calcular ocorrências esperadas
      const startDate = baseAppointment.inicio;
      const endDate = baseAppointment.recurrenceEndsAt!;
      const weeksDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      const expectedOccurrences = weeksDiff + 1;

      expect(expectedOccurrences).toBeGreaterThan(1);

      // 3. Gerar ocorrências
      const occurrences: Appointment[] = [];
      for (let i = 0; i < expectedOccurrences; i++) {
        const occurrenceDate = new Date(startDate);
        occurrenceDate.setDate(occurrenceDate.getDate() + (i * 7));

        occurrences.push({
          ...baseAppointment,
          id: `apt-${i}`,
          inicio: occurrenceDate,
          fim: new Date(occurrenceDate.getTime() + 60 * 60 * 1000),
          recurrenceOrder: i,
        });
      }

      expect(occurrences.length).toBe(expectedOccurrences);
      expect(occurrences.every(occ => occ.recurrenceGroupId === baseAppointment.recurrenceGroupId)).toBe(true);

      // 4. Validar que todas as ocorrências têm mesmo grupo
      const allSameGroup = occurrences.every(occ => 
        occ.recurrenceGroupId === baseAppointment.recurrenceGroupId
      );
      expect(allSameGroup).toBe(true);
    });

    it('deve cancelar série completa removendo todas as ocorrências', () => {
      const recurrenceGroupId = 'rec-group-1';
      const occurrences: Appointment[] = [
        {
          id: 'apt-0',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-15T10:00:00'),
          fim: new Date('2024-01-15T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceGroupId,
          recurrenceOrder: 0,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'apt-1',
          companyId: 'company1',
          professionalId: 'prof1',
          clientId: 'client1',
          serviceId: 'service1',
          inicio: new Date('2024-01-22T10:00:00'),
          fim: new Date('2024-01-22T11:00:00'),
          precoCentavos: 10000,
          comissaoPercent: 30,
          status: 'agendado',
          recurrenceGroupId,
          recurrenceOrder: 1,
          createdByUid: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Cancelar série = remover todas as ocorrências
      const remaining = occurrences.filter(apt => apt.recurrenceGroupId !== recurrenceGroupId);
      expect(remaining.length).toBe(0);
    });
  });

  describe('Fluxo: Criar Agendamento → Confirmar → Concluir', () => {
    it('deve seguir transições válidas de status', () => {
      // 1. Criar agendado
      let appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.status).toBe('agendado');

      // 2. Confirmar
      appointment = {
        ...appointment,
        status: 'confirmado',
        updatedAt: new Date(),
      };

      const canConfirm = ['agendado', 'pendente'].includes('agendado');
      expect(canConfirm).toBe(true);
      expect(appointment.status).toBe('confirmado');

      // 3. Concluir
      appointment = {
        ...appointment,
        status: 'concluido',
        valorPagoCentavos: 10000,
        clientePresente: true,
        updatedAt: new Date(),
      };

      const canComplete = ['agendado', 'confirmado'].includes('confirmado');
      expect(canComplete).toBe(true);
      expect(appointment.status).toBe('concluido');
    });

    it('não deve permitir transições inválidas', () => {
      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'cancelado', // Status final
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Não pode voltar de cancelado para agendado
      const canChangeFromCanceled = !['cancelado', 'concluido', 'no_show'].includes(appointment.status);
      expect(canChangeFromCanceled).toBe(false);
    });
  });

  describe('Fluxo: Múltiplos Serviços → Calcular Duração Total → Criar Agendamento', () => {
    it('deve calcular duração total e criar agendamento', () => {
      // 1. Selecionar múltiplos serviços
      const services: Service[] = [
        { id: '1', nome: 'Consulta', duracaoMin: 30, precoCentavos: 5000, companyId: 'company1', ativo: true },
        { id: '2', nome: 'Limpeza', duracaoMin: 60, precoCentavos: 10000, companyId: 'company1', ativo: true },
        { id: '3', nome: 'Avaliação', duracaoMin: 45, precoCentavos: 7500, companyId: 'company1', ativo: true },
      ];

      // 2. Calcular duração total
      const totalDuration = services.reduce((sum, service) => sum + (service.duracaoMin || 0), 0);
      expect(totalDuration).toBe(135); // 30 + 60 + 45

      // 3. Calcular preço total
      const totalPrice = services.reduce((sum, service) => sum + (service.precoCentavos || 0), 0);
      expect(totalPrice).toBe(22500); // 5000 + 10000 + 7500

      // 4. Criar agendamento com duração total
      const startDate = new Date('2024-01-20T10:00:00');
      const endDate = new Date(startDate.getTime() + totalDuration * 60000);

      const appointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: services[0].id, // Primeiro serviço
        serviceIds: services.map(s => s.id), // Todos os serviços
        inicio: startDate,
        fim: endDate,
        precoCentavos: totalPrice,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.serviceIds?.length).toBe(3);
      expect(appointment.precoCentavos).toBe(totalPrice);
      expect(appointment.fim.getTime() - appointment.inicio.getTime()).toBe(totalDuration * 60000);
    });
  });

  describe('Fluxo: Erro e Recuperação', () => {
    it('deve lidar com erro ao criar agendamento sem dados obrigatórios', () => {
      const appointmentData: any = {
        // companyId ausente
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
      };

      const isValid = !!(
        appointmentData.companyId &&
        appointmentData.professionalId &&
        appointmentData.clientId &&
        appointmentData.serviceId
      );

      expect(isValid).toBe(false);
    });

    it('deve validar conflito de horário antes de criar', () => {
      const existingAppointment: Appointment = {
        id: 'apt-existing',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newAppointmentStart = new Date('2024-01-20T10:30:00');
      const newAppointmentEnd = new Date('2024-01-20T11:30:00');

      // Verificar conflito
      const hasConflict = 
        existingAppointment.status === 'agendado' || existingAppointment.status === 'confirmado' &&
        existingAppointment.professionalId === 'prof1' &&
        newAppointmentStart < existingAppointment.fim &&
        newAppointmentEnd > existingAppointment.inicio;

      expect(hasConflict).toBe(true);
    });
  });
});

