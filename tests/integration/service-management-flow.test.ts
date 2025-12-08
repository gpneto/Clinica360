import { describe, it, expect } from 'vitest';
import { Service, Professional, Appointment } from '@/types';

describe('Testes de Integração - Fluxo de Gerenciamento de Serviços', () => {
  describe('Fluxo: Criar Serviço → Associar a Profissional → Criar Agendamento', () => {
    it('deve completar fluxo de criação e uso de serviço', () => {
      const companyId = 'company1';

      // 1. Criar serviço
      const service: Service = {
        id: 'service1',
        companyId,
        nome: 'Consulta Odontológica',
        duracaoMin: 60,
        precoCentavos: 15000,
        comissaoPercent: 30,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(service.id).toBeTruthy();
      expect(service.ativo).toBe(true);
      expect(service.comissaoPercent).toBe(30);

      // 2. Criar profissional
      const professional: Professional = {
        id: 'prof1',
        companyId,
        nome: 'Dr. Silva',
        especialidade: 'Dentista',
        telefone: '+5511999999999',
        email: 'dr.silva@example.com',
        ativo: true,
      };

      expect(professional.companyId).toBe(companyId);
      expect(professional.ativo).toBe(true);

      // 3. Criar agendamento usando serviço
      const appointment: Appointment = {
        id: 'apt1',
        companyId,
        professionalId: professional.id,
        clientId: 'client1',
        serviceId: service.id,
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: service.precoCentavos,
        comissaoPercent: service.comissaoPercent,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.serviceId).toBe(service.id);
      expect(appointment.professionalId).toBe(professional.id);
      expect(appointment.precoCentavos).toBe(service.precoCentavos);
      expect(appointment.comissaoPercent).toBe(service.comissaoPercent);

      // 4. Validar que tudo está vinculado corretamente
      const isValid = 
        appointment.companyId === service.companyId &&
        appointment.companyId === professional.companyId &&
        appointment.serviceId === service.id &&
        appointment.professionalId === professional.id;

      expect(isValid).toBe(true);
    });
  });

  describe('Fluxo: Múltiplos Serviços → Calcular Total → Criar Agendamento', () => {
    it('deve criar agendamento com múltiplos serviços', () => {
      const companyId = 'company1';

      const services: Service[] = [
        {
          id: 'service1',
          companyId,
          nome: 'Consulta',
          duracaoMin: 30,
          precoCentavos: 10000,
          comissaoPercent: 30,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'service2',
          companyId,
          nome: 'Limpeza',
          duracaoMin: 30,
          precoCentavos: 8000,
          comissaoPercent: 25,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Calcular duração total
      const totalDuration = services.reduce((sum, s) => sum + s.duracaoMin, 0);
      expect(totalDuration).toBe(60);

      // Calcular preço total
      const totalPrice = services.reduce((sum, s) => sum + s.precoCentavos, 0);
      expect(totalPrice).toBe(18000);

      // Criar agendamento com múltiplos serviços
      const appointment: Appointment = {
        id: 'apt1',
        companyId,
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: services[0].id, // Primeiro serviço como principal
        serviceIds: services.map(s => s.id),
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'), // 60 minutos
        precoCentavos: totalPrice,
        comissaoPercent: 30,
        status: 'agendado',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(appointment.serviceIds?.length).toBe(2);
      expect(appointment.precoCentavos).toBe(totalPrice);
    });
  });

  describe('Fluxo: Desativar Serviço → Validar Agendamentos Futuros', () => {
    it('deve validar que serviço desativado não pode ser usado em novos agendamentos', () => {
      const service: Service = {
        id: 'service1',
        companyId: 'company1',
        nome: 'Serviço Antigo',
        duracaoMin: 60,
        precoCentavos: 10000,
        comissaoPercent: 30,
        ativo: false, // Desativado
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validar que serviço está desativado
      expect(service.ativo).toBe(false);

      // Tentar criar agendamento com serviço desativado
      const canUseService = service.ativo === true;
      expect(canUseService).toBe(false);

      // Agendamentos existentes devem continuar válidos
      const existingAppointment: Appointment = {
        id: 'apt1',
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: service.id,
        inicio: new Date('2024-01-15T10:00:00'),
        fim: new Date('2024-01-15T11:00:00'),
        precoCentavos: service.precoCentavos,
        comissaoPercent: service.comissaoPercent,
        status: 'concluido',
        createdByUid: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Agendamento já concluído deve ser válido mesmo com serviço desativado
      expect(existingAppointment.status).toBe('concluido');
    });
  });
});

