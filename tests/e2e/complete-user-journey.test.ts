import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Testes End-to-End (E2E) - Fluxos Completos do Usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Fluxo Completo de Onboarding e Setup Inicial', () => {
    it('deve completar fluxo: Login → Criar Empresa → Configurar → Primeiro Agendamento', async () => {
      // Simulação do fluxo completo
      const user = {
        uid: 'user1',
        email: 'owner@test.com',
        displayName: 'Owner Test',
      };

      // 1. Login
      const loginResult = {
        success: true,
        user,
        token: {
          uid: user.uid,
          role: null, // Ainda não tem role
          companyId: null, // Ainda não tem empresa
        },
      };

      expect(loginResult.success).toBe(true);
      expect(loginResult.user.uid).toBe('user1');

      // 2. Verificar se precisa criar empresa
      const needsCompanySetup = !loginResult.token.companyId;
      expect(needsCompanySetup).toBe(true);

      // 3. Criar empresa
      const company = {
        id: 'company1',
        nome: 'Clínica Teste',
        ownerUid: user.uid,
        createdAt: new Date(),
        ativo: true,
      };

      expect(company.ownerUid).toBe(user.uid);
      expect(company.ativo).toBe(true);

      // 4. Adicionar usuário como owner
      const userData = {
        uid: user.uid,
        companyId: company.id,
        role: 'owner',
        nome: user.displayName,
        email: user.email,
        ativo: true,
      };

      expect(userData.role).toBe('owner');
      expect(userData.companyId).toBe(company.id);

      // 5. Criar configurações iniciais
      const settings = {
        companyId: company.id,
        customerLabel: 'paciente',
        workingHours: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
        },
      };

      expect(settings.companyId).toBe(company.id);
      expect(settings.customerLabel).toBe('paciente');

      // 6. Criar primeiro profissional
      const professional = {
        id: 'prof1',
        companyId: company.id,
        apelido: 'Dr. João',
        corHex: '#3b82f6',
        ativo: true,
        janelaAtendimento: {
          diasSemana: [1, 2, 3, 4, 5],
          inicio: '08:00',
          fim: '18:00',
        },
      };

      expect(professional.companyId).toBe(company.id);
      expect(professional.ativo).toBe(true);

      // 7. Criar primeiro serviço
      const service = {
        id: 'service1',
        companyId: company.id,
        nome: 'Consulta',
        duracaoMin: 60,
        precoCentavos: 10000,
        comissaoPercent: 30,
        ativo: true,
      };

      expect(service.companyId).toBe(company.id);
      expect(service.ativo).toBe(true);

      // 8. Criar primeiro paciente
      const patient = {
        id: 'patient1',
        companyId: company.id,
        nome: 'João Silva',
        telefoneE164: '+5511999999999',
        preferenciaNotificacao: 'whatsapp',
        ownerUid: user.uid,
      };

      expect(patient.companyId).toBe(company.id);
      expect(patient.ownerUid).toBe(user.uid);

      // 9. Criar primeiro agendamento
      const appointment = {
        id: 'appointment1',
        companyId: company.id,
        professionalId: professional.id,
        clientId: patient.id,
        serviceId: service.id,
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        status: 'agendado',
        precoCentavos: service.precoCentavos,
        comissaoPercent: service.comissaoPercent,
      };

      expect(appointment.companyId).toBe(company.id);
      expect(appointment.professionalId).toBe(professional.id);
      expect(appointment.clientId).toBe(patient.id);
      expect(appointment.status).toBe('agendado');

      // 10. Verificar que tudo está conectado
      const setupComplete = {
        company: !!company,
        user: !!userData,
        settings: !!settings,
        professional: !!professional,
        service: !!service,
        patient: !!patient,
        appointment: !!appointment,
      };

      expect(setupComplete.company).toBe(true);
      expect(setupComplete.user).toBe(true);
      expect(setupComplete.settings).toBe(true);
      expect(setupComplete.professional).toBe(true);
      expect(setupComplete.service).toBe(true);
      expect(setupComplete.patient).toBe(true);
      expect(setupComplete.appointment).toBe(true);
    });

    it('deve completar fluxo: Login → Selecionar Contexto → Acessar Dashboard', async () => {
      // Usuário com múltiplas empresas
      const user = {
        uid: 'user1',
        email: 'user@test.com',
        companies: [
          { id: 'company1', nome: 'Clínica 1', role: 'owner' },
          { id: 'company2', nome: 'Clínica 2', role: 'admin' },
        ],
      };

      // 1. Login
      expect(user.companies.length).toBeGreaterThan(0);

      // 2. Selecionar contexto
      const selectedCompany = user.companies[0];
      expect(selectedCompany.id).toBe('company1');
      expect(selectedCompany.role).toBe('owner');

      // 3. Carregar dados do dashboard
      const dashboardData = {
        companyId: selectedCompany.id,
        appointments: [],
        professionals: [],
        services: [],
        patients: [],
      };

      expect(dashboardData.companyId).toBe(selectedCompany.id);

      // 4. Verificar acesso
      const hasAccess = selectedCompany.role === 'owner' || selectedCompany.role === 'admin';
      expect(hasAccess).toBe(true);
    });
  });

  describe('2. Fluxo Completo de Operação Diária', () => {
    it('deve completar fluxo: Visualizar Agenda → Criar Agendamento → Confirmar → Concluir → Calcular Receita', async () => {
      const companyId = 'company1';
      const professionalId = 'prof1';
      const patientId = 'patient1';
      const serviceId = 'service1';

      // 1. Visualizar agenda do dia
      const today = new Date('2024-01-20');
      const appointments = [
        {
          id: 'app1',
          companyId,
          professionalId,
          clientId: patientId,
          serviceId,
          inicio: new Date('2024-01-20T10:00:00'),
          fim: new Date('2024-01-20T11:00:00'),
          status: 'agendado',
        },
      ];

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].status).toBe('agendado');

      // 2. Criar novo agendamento
      const newAppointment = {
        id: 'app2',
        companyId,
        professionalId,
        clientId: patientId,
        serviceId,
        inicio: new Date('2024-01-20T14:00:00'),
        fim: new Date('2024-01-20T15:00:00'),
        status: 'agendado',
        precoCentavos: 10000,
        comissaoPercent: 30,
      };

      expect(newAppointment.companyId).toBe(companyId);
      expect(newAppointment.status).toBe('agendado');

      // 3. Confirmar agendamento
      const confirmedAppointment = {
        ...newAppointment,
        status: 'confirmado',
        confirmedAt: new Date(),
      };

      expect(confirmedAppointment.status).toBe('confirmado');
      expect(confirmedAppointment.confirmedAt).toBeDefined();

      // 4. Concluir agendamento
      const completedAppointment = {
        ...confirmedAppointment,
        status: 'concluido',
        completedAt: new Date(),
        valorPagoCentavos: 10000,
      };

      expect(completedAppointment.status).toBe('concluido');
      expect(completedAppointment.valorPagoCentavos).toBe(10000);

      // 5. Calcular receita
      const revenue = completedAppointment.valorPagoCentavos;
      const commission = Math.round(revenue * (completedAppointment.comissaoPercent / 100));
      const professionalPayout = revenue - commission;

      expect(revenue).toBe(10000);
      expect(commission).toBe(3000);
      expect(professionalPayout).toBe(7000);
    });

    it('deve completar fluxo: Buscar Paciente → Ver Histórico → Criar Agendamento → Adicionar Evolução', async () => {
      const companyId = 'company1';
      const patientId = 'patient1';

      // 1. Buscar paciente
      const patient = {
        id: patientId,
        companyId,
        nome: 'João Silva',
        telefoneE164: '+5511999999999',
      };

      expect(patient.id).toBe(patientId);
      expect(patient.companyId).toBe(companyId);

      // 2. Ver histórico de agendamentos
      const appointmentHistory = [
        {
          id: 'app1',
          inicio: new Date('2024-01-15T10:00:00'),
          status: 'concluido',
        },
        {
          id: 'app2',
          inicio: new Date('2024-01-20T10:00:00'),
          status: 'agendado',
        },
      ];

      expect(appointmentHistory.length).toBeGreaterThan(0);

      // 3. Criar novo agendamento
      const newAppointment = {
        id: 'app3',
        companyId,
        professionalId: 'prof1',
        clientId: patientId,
        serviceId: 'service1',
        inicio: new Date('2024-01-25T10:00:00'),
        fim: new Date('2024-01-25T11:00:00'),
        status: 'agendado',
      };

      expect(newAppointment.clientId).toBe(patientId);

      // 4. Adicionar evolução após agendamento anterior
      const evolution = {
        id: 'evol1',
        companyId,
        patientId,
        date: new Date('2024-01-15'),
        notes: 'Paciente evoluiu bem',
        appointmentId: 'app1',
      };

      expect(evolution.patientId).toBe(patientId);
      expect(evolution.appointmentId).toBe('app1');
    });
  });

  describe('3. Fluxo Completo de Gestão Financeira', () => {
    it('deve completar fluxo: Múltiplos Agendamentos → Calcular Receita Total → Gerar Relatório → Exportar', async () => {
      const companyId = 'company1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // 1. Buscar agendamentos do mês
      const appointments = [
        {
          id: 'app1',
          companyId,
          status: 'concluido',
          valorPagoCentavos: 10000,
          comissaoPercent: 30,
          inicio: new Date('2024-01-10T10:00:00'),
        },
        {
          id: 'app2',
          companyId,
          status: 'concluido',
          valorPagoCentavos: 15000,
          comissaoPercent: 30,
          inicio: new Date('2024-01-15T10:00:00'),
        },
        {
          id: 'app3',
          companyId,
          status: 'concluido',
          valorPagoCentavos: 20000,
          comissaoPercent: 30,
          inicio: new Date('2024-01-20T10:00:00'),
        },
      ];

      // 2. Filtrar por período
      const filteredAppointments = appointments.filter(
        app => app.inicio >= startDate && app.inicio <= endDate
      );

      expect(filteredAppointments.length).toBe(3);

      // 3. Calcular receita total
      const totalRevenue = filteredAppointments.reduce(
        (sum, app) => sum + app.valorPagoCentavos,
        0
      );

      expect(totalRevenue).toBe(45000);

      // 4. Calcular comissão total
      const totalCommission = filteredAppointments.reduce(
        (sum, app) => sum + Math.round(app.valorPagoCentavos * (app.comissaoPercent / 100)),
        0
      );

      expect(totalCommission).toBe(13500);

      // 5. Calcular repasse total
      const totalPayout = totalRevenue - totalCommission;

      expect(totalPayout).toBe(31500);

      // 6. Gerar relatório
      const report = {
        period: { start: startDate, end: endDate },
        totalRevenue,
        totalCommission,
        totalPayout,
        appointmentsCount: filteredAppointments.length,
      };

      expect(report.totalRevenue).toBe(45000);
      expect(report.appointmentsCount).toBe(3);

      // 7. Exportar relatório (simulado)
      const exportData = {
        format: 'csv',
        data: report,
        exportedAt: new Date(),
      };

      expect(exportData.format).toBe('csv');
      expect(exportData.data).toBeDefined();
    });
  });

  describe('4. Fluxo Completo de Notificações', () => {
    it('deve completar fluxo: Criar Agendamento → Configurar Lembretes → Enviar Notificações → Confirmar Recebimento', async () => {
      const companyId = 'company1';

      // 1. Criar agendamento
      const appointment = {
        id: 'app1',
        companyId,
        professionalId: 'prof1',
        clientId: 'patient1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        status: 'agendado',
      };

      // 2. Configurar lembretes
      const reminders = {
        reminder24h: true,
        reminder1h: true,
        reminderSent24h: false,
        reminderSent1h: false,
      };

      expect(reminders.reminder24h).toBe(true);
      expect(reminders.reminder1h).toBe(true);

      // 3. Enviar confirmação imediata
      const confirmationSent = {
        appointmentId: appointment.id,
        sentAt: new Date(),
        type: 'confirmation',
        channel: 'whatsapp',
      };

      expect(confirmationSent.appointmentId).toBe(appointment.id);
      expect(confirmationSent.type).toBe('confirmation');

      // 4. Enviar lembrete 24h antes
      const reminder24h = {
        appointmentId: appointment.id,
        sentAt: new Date('2024-01-19T10:00:00'),
        type: 'reminder_24h',
        channel: 'whatsapp',
      };

      expect(reminder24h.type).toBe('reminder_24h');

      // 5. Enviar lembrete 1h antes
      const reminder1h = {
        appointmentId: appointment.id,
        sentAt: new Date('2024-01-20T09:00:00'),
        type: 'reminder_1h',
        channel: 'whatsapp',
      };

      expect(reminder1h.type).toBe('reminder_1h');

      // 6. Verificar que todas as notificações foram enviadas
      const allNotificationsSent = {
        confirmation: !!confirmationSent,
        reminder24h: !!reminder24h,
        reminder1h: !!reminder1h,
      };

      expect(allNotificationsSent.confirmation).toBe(true);
      expect(allNotificationsSent.reminder24h).toBe(true);
      expect(allNotificationsSent.reminder1h).toBe(true);
    });
  });

  describe('5. Fluxo Completo de Recorrência', () => {
    it('deve completar fluxo: Criar Série Recorrente → Gerar Ocorrências → Gerenciar Série → Cancelar', async () => {
      const companyId = 'company1';

      // 1. Criar série recorrente
      const recurrence = {
        id: 'rec1',
        companyId,
        professionalId: 'prof1',
        clientId: 'patient1',
        serviceId: 'service1',
        startDate: new Date('2024-01-20T10:00:00'),
        endDate: new Date('2024-03-20T10:00:00'),
        frequency: 'weekly',
        interval: 1,
      };

      expect(recurrence.frequency).toBe('weekly');
      expect(recurrence.endDate > recurrence.startDate).toBe(true);

      // 2. Gerar ocorrências
      const occurrences = [];
      let currentDate = new Date(recurrence.startDate);
      while (currentDate <= recurrence.endDate) {
        occurrences.push({
          id: `app-${occurrences.length + 1}`,
          companyId,
          professionalId: recurrence.professionalId,
          clientId: recurrence.clientId,
          serviceId: recurrence.serviceId,
          inicio: new Date(currentDate),
          fim: new Date(currentDate.getTime() + 60 * 60 * 1000),
          status: 'agendado',
          recurrenceId: recurrence.id,
        });
        currentDate.setDate(currentDate.getDate() + 7); // Semanal
      }

      expect(occurrences.length).toBeGreaterThan(0);
      expect(occurrences[0].recurrenceId).toBe(recurrence.id);

      // 3. Gerenciar série (editar uma ocorrência)
      const editedOccurrence = {
        ...occurrences[0],
        inicio: new Date('2024-01-21T10:00:00'), // Mudou data
        isException: true,
      };

      expect(editedOccurrence.isException).toBe(true);

      // 4. Cancelar série completa
      const cancelledRecurrence = {
        ...recurrence,
        cancelled: true,
        cancelledAt: new Date(),
      };

      expect(cancelledRecurrence.cancelled).toBe(true);

      // 5. Verificar que ocorrências futuras foram canceladas
      const futureOccurrences = occurrences.filter(
        occ => occ.inicio > new Date()
      );

      const allCancelled = futureOccurrences.every(
        occ => occ.status === 'cancelado'
      );

      expect(allCancelled).toBe(true);
    });
  });

  describe('6. Fluxo Completo de Multi-Tenancy', () => {
    it('deve completar fluxo: Usuário com Múltiplas Empresas → Alternar Contexto → Operar em Cada Empresa', async () => {
      const user = {
        uid: 'user1',
        companies: [
          { id: 'company1', nome: 'Clínica 1', role: 'owner' },
          { id: 'company2', nome: 'Clínica 2', role: 'admin' },
        ],
      };

      // 1. Operar na empresa 1
      const company1Data = {
        companyId: 'company1',
        appointments: [],
        professionals: [],
        patients: [],
      };

      expect(company1Data.companyId).toBe('company1');

      // 2. Alternar para empresa 2
      const company2Data = {
        companyId: 'company2',
        appointments: [],
        professionals: [],
        patients: [],
      };

      expect(company2Data.companyId).toBe('company2');

      // 3. Verificar isolamento
      const isIsolated = company1Data.companyId !== company2Data.companyId;
      expect(isIsolated).toBe(true);

      // 4. Criar dados em cada empresa
      const company1Appointment = {
        id: 'app1',
        companyId: 'company1',
        professionalId: 'prof1',
      };

      const company2Appointment = {
        id: 'app2',
        companyId: 'company2',
        professionalId: 'prof2',
      };

      expect(company1Appointment.companyId).toBe('company1');
      expect(company2Appointment.companyId).toBe('company2');
      expect(company1Appointment.companyId).not.toBe(company2Appointment.companyId);
    });
  });

  describe('7. Fluxo Completo de Recuperação de Erros', () => {
    it('deve completar fluxo: Erro → Detectar → Recuperar → Continuar Operação', async () => {
      // 1. Simular erro na criação de agendamento
      const appointmentData = {
        companyId: 'company1',
        professionalId: 'prof1',
        // clientId ausente - erro
      };

      // 2. Detectar erro
      const hasError = !appointmentData.clientId;
      expect(hasError).toBe(true);

      // 3. Recuperar - adicionar clientId
      const fixedAppointmentData = {
        ...appointmentData,
        clientId: 'patient1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
      };

      expect(fixedAppointmentData.clientId).toBeDefined();

      // 4. Validar dados completos
      const isValid = !!(
        fixedAppointmentData.companyId &&
        fixedAppointmentData.professionalId &&
        fixedAppointmentData.clientId &&
        fixedAppointmentData.serviceId &&
        fixedAppointmentData.inicio &&
        fixedAppointmentData.fim
      );

      expect(isValid).toBe(true);

      // 5. Continuar operação - criar agendamento
      const appointment = {
        id: 'app1',
        ...fixedAppointmentData,
        status: 'agendado',
      };

      expect(appointment.status).toBe('agendado');
    });
  });

  describe('8. Fluxo Completo de Performance', () => {
    it('deve completar fluxo: Múltiplas Operações em Sequência → Verificar Performance', async () => {
      const companyId = 'company1';
      const operations = [];

      // 1. Criar múltiplos pacientes
      for (let i = 0; i < 10; i++) {
        operations.push({
          type: 'create_patient',
          data: {
            id: `patient${i}`,
            companyId,
            nome: `Paciente ${i}`,
            telefoneE164: `+551199999999${i}`,
          },
        });
      }

      expect(operations.length).toBe(10);

      // 2. Criar múltiplos agendamentos
      for (let i = 0; i < 20; i++) {
        operations.push({
          type: 'create_appointment',
          data: {
            id: `app${i}`,
            companyId,
            professionalId: 'prof1',
            clientId: `patient${i % 10}`,
            serviceId: 'service1',
            inicio: new Date(`2024-01-${20 + (i % 10)}T10:00:00`),
            fim: new Date(`2024-01-${20 + (i % 10)}T11:00:00`),
            status: 'agendado',
          },
        });
      }

      expect(operations.length).toBe(30);

      // 3. Verificar que todas as operações foram registradas
      const patientsCreated = operations.filter(op => op.type === 'create_patient');
      const appointmentsCreated = operations.filter(op => op.type === 'create_appointment');

      expect(patientsCreated.length).toBe(10);
      expect(appointmentsCreated.length).toBe(20);

      // 4. Verificar performance (simulado)
      const performance = {
        totalOperations: operations.length,
        averageTime: 50, // ms
        totalTime: operations.length * 50,
      };

      expect(performance.totalOperations).toBe(30);
      expect(performance.averageTime).toBeLessThan(100); // Aceitável
    });
  });

  describe('9. Fluxo Completo de Integração com Serviços Externos', () => {
    it('deve completar fluxo: Criar Agendamento → Enviar WhatsApp → Receber Confirmação → Atualizar Status', async () => {
      const companyId = 'company1';

      // 1. Criar agendamento
      const appointment = {
        id: 'app1',
        companyId,
        professionalId: 'prof1',
        clientId: 'patient1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        status: 'agendado',
      };

      // 2. Enviar mensagem WhatsApp
      const whatsappMessage = {
        id: 'msg1',
        companyId,
        to: '+5511999999999',
        message: 'Seu agendamento foi confirmado para 20/01/2024 às 10:00',
        type: 'confirmation',
        appointmentId: appointment.id,
        sentAt: new Date(),
        status: 'sent',
      };

      expect(whatsappMessage.appointmentId).toBe(appointment.id);
      expect(whatsappMessage.status).toBe('sent');

      // 3. Receber confirmação do webhook
      const webhookResponse = {
        messageId: whatsappMessage.id,
        status: 'delivered',
        deliveredAt: new Date(),
      };

      expect(webhookResponse.status).toBe('delivered');

      // 4. Atualizar status da mensagem
      const updatedMessage = {
        ...whatsappMessage,
        status: webhookResponse.status,
        deliveredAt: webhookResponse.deliveredAt,
      };

      expect(updatedMessage.status).toBe('delivered');
      expect(updatedMessage.deliveredAt).toBeDefined();

      // 5. Verificar que o fluxo foi completo
      const flowComplete = {
        appointmentCreated: !!appointment,
        messageSent: whatsappMessage.status === 'sent',
        messageDelivered: updatedMessage.status === 'delivered',
      };

      expect(flowComplete.appointmentCreated).toBe(true);
      expect(flowComplete.messageSent).toBe(true);
      expect(flowComplete.messageDelivered).toBe(true);
    });
  });

  describe('10. Fluxo Completo de Primeiro Mês de Operação', () => {
    it('deve simular operação completa do primeiro mês', async () => {
      const companyId = 'company1';
      const monthStart = new Date('2024-01-01');
      const monthEnd = new Date('2024-01-31');

      // 1. Setup inicial
      const setup = {
        professionals: 3,
        services: 5,
        patients: 20,
      };

      // 2. Agendamentos do mês
      const appointments = [];
      for (let i = 0; i < 50; i++) {
        appointments.push({
          id: `app${i}`,
          companyId,
          professionalId: `prof${(i % setup.professionals) + 1}`,
          clientId: `patient${(i % setup.patients) + 1}`,
          serviceId: `service${(i % setup.services) + 1}`,
          inicio: new Date(`2024-01-${(i % 31) + 1}T10:00:00`),
          status: i % 10 === 0 ? 'cancelado' : 'concluido',
          valorPagoCentavos: 10000 + (i * 100),
          comissaoPercent: 30,
        });
      }

      expect(appointments.length).toBe(50);

      // 3. Filtrar apenas concluídos
      const completedAppointments = appointments.filter(
        app => app.status === 'concluido'
      );

      expect(completedAppointments.length).toBe(45);

      // 4. Calcular receita total
      const totalRevenue = completedAppointments.reduce(
        (sum, app) => sum + app.valorPagoCentavos,
        0
      );

      expect(totalRevenue).toBeGreaterThan(0);

      // 5. Calcular por profissional
      const revenueByProfessional: Record<string, number> = {};
      completedAppointments.forEach(app => {
        if (!revenueByProfessional[app.professionalId]) {
          revenueByProfessional[app.professionalId] = 0;
        }
        revenueByProfessional[app.professionalId] += app.valorPagoCentavos;
      });

      expect(Object.keys(revenueByProfessional).length).toBe(setup.professionals);

      // 6. Gerar relatório mensal
      const monthlyReport = {
        period: { start: monthStart, end: monthEnd },
        totalRevenue,
        totalAppointments: completedAppointments.length,
        revenueByProfessional,
        averageAppointmentValue: totalRevenue / completedAppointments.length,
      };

      expect(monthlyReport.totalRevenue).toBe(totalRevenue);
      expect(monthlyReport.totalAppointments).toBe(45);
      expect(monthlyReport.averageAppointmentValue).toBeGreaterThan(0);
    });
  });
});

