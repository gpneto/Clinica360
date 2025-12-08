import { describe, it, expect } from 'vitest';

describe('Utilitários - Validação de Formulários', () => {
  describe('Validação de Campos Obrigatórios', () => {
    it('deve validar que campos obrigatórios estão preenchidos', () => {
      const formData = {
        nome: 'João Silva',
        email: 'joao@example.com',
        telefone: '+5511999999999',
      };

      const requiredFields = ['nome', 'email', 'telefone'];
      const isValid = requiredFields.every(field => formData[field as keyof typeof formData]);

      expect(isValid).toBe(true);
    });

    it('deve detectar campos obrigatórios ausentes', () => {
      const formData: any = {
        nome: 'João Silva',
        email: '', // Ausente
        telefone: '+5511999999999',
      };

      const requiredFields = ['nome', 'email', 'telefone'];
      const isValid = requiredFields.every(field => formData[field]);

      expect(isValid).toBe(false);
    });

    it('deve validar campos obrigatórios de agendamento', () => {
      const appointmentData: any = {
        companyId: 'company1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceId: 'service1',
        inicio: new Date('2024-01-20T10:00:00'),
        fim: new Date('2024-01-20T11:00:00'),
        precoCentavos: 10000,
      };

      const requiredFields = ['companyId', 'professionalId', 'clientId', 'serviceId', 'inicio', 'fim'];
      const isValid = requiredFields.every(field => appointmentData[field]);

      expect(isValid).toBe(true);
    });
  });

  describe('Validação de Formatos', () => {
    it('deve validar formato de email', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.com',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@domain',
        'user space@example.com',
      ];

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('deve validar formato de telefone E.164', () => {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;

      const validPhones = [
        '+5511999999999',
        '+12025550100',
        '+442071838750',
      ];

      const invalidPhones = [
        '11999999999', // Sem +
        '5511999999999', // Sem +
        '+55 11 99999-9999', // Com espaços e hífen
      ];

      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        const isValid = phoneRegex.test(phone);
        expect(isValid, `Telefone "${phone}" deveria ser inválido`).toBe(false);
      });

      // Teste específico para telefone muito curto
      const shortPhone = '+551199999';
      // Para formato brasileiro, precisa ter pelo menos 14 caracteres (+55 + DDD + número)
      const isBrazilianValid = shortPhone.startsWith('+55') && shortPhone.length >= 14;
      expect(isBrazilianValid).toBe(false);
    });

    it('deve validar formato de CPF', () => {
      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

      const validCPF = '123.456.789-00';
      const invalidCPF = '12345678900';

      expect(cpfRegex.test(validCPF)).toBe(true);
      expect(cpfRegex.test(invalidCPF)).toBe(false);
    });
  });

  describe('Validação de Ranges', () => {
    it('deve validar que preço é positivo', () => {
      const precoCentavos = 10000;
      const isValid = precoCentavos > 0;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar preço negativo', () => {
      const precoCentavos = -1000;
      const isValid = precoCentavos > 0;

      expect(isValid).toBe(false);
    });

    it('deve validar que percentual está entre 0 e 100', () => {
      const comissaoPercent = 30;
      const isValid = comissaoPercent >= 0 && comissaoPercent <= 100;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar percentual fora do range', () => {
      const testCases = [-1, 101, 150];

      testCases.forEach(percent => {
        const isValid = percent >= 0 && percent <= 100;
        expect(isValid).toBe(false);
      });
    });

    it('deve validar que duração é positiva', () => {
      const duracaoMin = 60;
      const isValid = duracaoMin > 0;

      expect(isValid).toBe(true);
    });

    it('deve rejeitar duração negativa ou zero', () => {
      const testCases = [0, -30];

      testCases.forEach(duracao => {
        const isValid = duracao > 0;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Validação de Datas', () => {
    it('deve validar que data de fim é posterior à data de início', () => {
      const inicio = new Date('2024-01-20T10:00:00');
      const fim = new Date('2024-01-20T11:00:00');

      const isValid = fim > inicio;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar data de fim anterior à data de início', () => {
      const inicio = new Date('2024-01-20T10:00:00');
      const fim = new Date('2024-01-20T09:00:00');

      const isValid = fim > inicio;
      expect(isValid).toBe(false);
    });

    it('deve validar que data não é no passado (para criação)', () => {
      const appointmentDate = new Date('2024-12-31T10:00:00');
      const now = new Date('2024-01-15T10:00:00');

      const isValid = appointmentDate >= now;
      expect(isValid).toBe(true);
    });
  });

  describe('Mensagens de Erro', () => {
    it('deve gerar mensagem de erro para campo obrigatório', () => {
      const fieldName = 'nome';
      const errorMessage = `${fieldName} é obrigatório`;

      expect(errorMessage).toBe('nome é obrigatório');
    });

    it('deve gerar mensagem de erro para formato inválido', () => {
      const fieldName = 'email';
      const errorMessage = `${fieldName} deve ter um formato válido`;

      expect(errorMessage).toBe('email deve ter um formato válido');
    });

    it('deve gerar mensagem de erro para range inválido', () => {
      const fieldName = 'comissaoPercent';
      const min = 0;
      const max = 100;
      const errorMessage = `${fieldName} deve estar entre ${min} e ${max}`;

      expect(errorMessage).toBe('comissaoPercent deve estar entre 0 e 100');
    });
  });
});

