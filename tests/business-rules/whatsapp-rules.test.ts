import { describe, it, expect } from 'vitest';

describe('Regras de Negócio - WhatsApp', () => {
  const MONTHLY_WHATSAPP_FREE_LIMIT = 200;
  const WHATSAPP_MESSAGE_UNIT_PRICE = 0.3; // R$ 0,30 por mensagem excedente

  describe('Cálculo de Uso de Mensagens', () => {
    it('deve calcular mensagens excedentes corretamente', () => {
      const monthCount = 250;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      
      expect(extraCount).toBe(50);
    });

    it('deve retornar 0 quando não há excedente', () => {
      const monthCount = 150;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      
      expect(extraCount).toBe(0);
    });

    it('deve retornar 0 quando exatamente no limite', () => {
      const monthCount = 200;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      
      expect(extraCount).toBe(0);
    });

    it('não deve retornar negativo quando abaixo do limite', () => {
      const monthCount = 100;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      
      expect(extraCount).toBe(0);
    });
  });

  describe('Cálculo de Custo Excedente', () => {
    it('deve calcular custo excedente corretamente', () => {
      const extraCount = 50;
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;
      
      expect(estimatedCost).toBe(15); // 50 * 0.30 = R$ 15,00
    });

    it('deve retornar 0 quando não há excedente', () => {
      const extraCount = 0;
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;
      
      expect(estimatedCost).toBe(0);
    });

    it('deve calcular custo para grandes volumes', () => {
      const extraCount = 1000;
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;
      
      expect(estimatedCost).toBe(300); // 1000 * 0.30 = R$ 300,00
    });
  });

  describe('Filtro de Mensagens Automáticas', () => {
    it('deve filtrar apenas mensagens automáticas', () => {
      const messages = [
        { id: '1', messageSource: 'automatic', createdAt: new Date('2024-01-15') },
        { id: '2', messageSource: 'manual', createdAt: new Date('2024-01-15') },
        { id: '3', messageSource: 'automatic', createdAt: new Date('2024-01-15') },
      ];

      const automaticMessages = messages.filter(msg => msg.messageSource === 'automatic');
      
      expect(automaticMessages.length).toBe(2);
      expect(automaticMessages.every(msg => msg.messageSource === 'automatic')).toBe(true);
    });
  });

  describe('Cálculo Completo de Uso e Custo', () => {
    it('deve calcular uso e custo completo corretamente', () => {
      const monthCount = 350; // 350 mensagens automáticas
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;

      expect(monthCount).toBe(350);
      expect(extraCount).toBe(150); // 350 - 200 = 150
      expect(estimatedCost).toBe(45); // 150 * 0.30 = R$ 45,00
    });

    it('deve calcular corretamente quando exatamente no limite', () => {
      const monthCount = 200;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;

      expect(extraCount).toBe(0);
      expect(estimatedCost).toBe(0);
    });
  });
});

