import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - Múltiplos Serviços', () => {
  describe('Cálculo de Duração Total', () => {
    it('deve calcular duração total de múltiplos serviços', () => {
      const services = [
        { id: '1', duracaoMin: 30 },
        { id: '2', duracaoMin: 60 },
        { id: '3', duracaoMin: 45 },
      ];

      const totalDuration = services.reduce((sum, service) => {
        return sum + (service.duracaoMin || 0);
      }, 0);

      expect(totalDuration).toBe(135); // 30 + 60 + 45
    });

    it('deve usar duração padrão quando serviços não têm duração', () => {
      const services: any[] = [];
      const defaultDuration = 60;

      const totalDuration = services.reduce((sum, service) => {
        return sum + (service.duracaoMin || 0);
      }, 0) || defaultDuration;

      expect(totalDuration).toBe(60);
    });

    it('deve calcular data de fim baseada na duração total', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const totalDurationMinutes = 135; // 2h15min

      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60000);

      const expectedEndDate = new Date('2024-01-15T12:15:00');
      expect(endDate.getTime()).toBe(expectedEndDate.getTime());
    });
  });

  describe('Cálculo de Preço Total', () => {
    it('deve calcular preço total de múltiplos serviços', () => {
      const services = [
        { id: '1', precoCentavos: 5000 },
        { id: '2', precoCentavos: 10000 },
        { id: '3', precoCentavos: 7500 },
      ];

      const totalPrice = services.reduce((sum, service) => {
        return sum + (service.precoCentavos || 0);
      }, 0);

      expect(totalPrice).toBe(22500); // R$ 225,00
    });

    it('deve usar preço do agendamento quando disponível', () => {
      const services = [
        { id: '1', precoCentavos: 5000 },
        { id: '2', precoCentavos: 10000 },
      ];
      const appointmentPrice = 20000; // Preço customizado

      const finalPrice = appointmentPrice || services.reduce((sum, service) => {
        return sum + (service.precoCentavos || 0);
      }, 0);

      expect(finalPrice).toBe(20000);
    });
  });

  describe('Validação de Serviços', () => {
    it('deve exigir pelo menos um serviço', () => {
      const selectedServices: any[] = [];
      const hasServices = selectedServices.length > 0;

      expect(hasServices).toBe(false);
    });

    it('deve validar que serviços selecionados existem', () => {
      const selectedServices = ['service1', 'service2'];
      const availableServices = [
        { id: 'service1', nome: 'Serviço 1' },
        { id: 'service2', nome: 'Serviço 2' },
        { id: 'service3', nome: 'Serviço 3' },
      ];

      const allValid = selectedServices.every(serviceId =>
        availableServices.some(svc => svc.id === serviceId)
      );

      expect(allValid).toBe(true);
    });

    it('deve rejeitar serviços inexistentes', () => {
      const selectedServices = ['service1', 'invalid-service'];
      const availableServices = [
        { id: 'service1', nome: 'Serviço 1' },
        { id: 'service2', nome: 'Serviço 2' },
      ];

      const allValid = selectedServices.every(serviceId =>
        availableServices.some(svc => svc.id === serviceId)
      );

      expect(allValid).toBe(false);
    });
  });

  describe('Compatibilidade com serviceId Único', () => {
    it('deve usar serviceId quando serviceIds não está disponível', () => {
      const appointment = {
        serviceId: 'service1',
        serviceIds: undefined,
      };

      const primaryServiceId = appointment.serviceIds?.[0] || appointment.serviceId;
      expect(primaryServiceId).toBe('service1');
    });

    it('deve priorizar serviceIds quando disponível', () => {
      const appointment = {
        serviceId: 'service1',
        serviceIds: ['service2', 'service3'],
      };

      const primaryServiceId = appointment.serviceIds?.[0] || appointment.serviceId;
      expect(primaryServiceId).toBe('service2');
    });
  });
});

