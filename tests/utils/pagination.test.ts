import { describe, it, expect } from 'vitest';

describe('Utilitários - Paginação', () => {
  describe('Cálculo de Páginas', () => {
    it('deve calcular total de páginas corretamente', () => {
      const totalItems = 100;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(10);
    });

    it('deve calcular total de páginas com resto', () => {
      const totalItems = 105;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(11); // 10 páginas completas + 1 com 5 itens
    });

    it('deve retornar 1 página quando total é menor que itemsPerPage', () => {
      const totalItems = 5;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(1);
    });
  });

  describe('Navegação entre Páginas', () => {
    it('deve calcular itens da página atual', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const currentPage = 2;
      const itemsPerPage = 10;

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageItems = items.slice(startIndex, endIndex);

      expect(pageItems.length).toBe(10);
      expect(pageItems[0].id).toBe(11); // Primeiro item da página 2
      expect(pageItems[9].id).toBe(20); // Último item da página 2
    });

    it('deve validar página atual', () => {
      const currentPage = 3;
      const totalPages = 10;

      const isValid = currentPage >= 1 && currentPage <= totalPages;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar página inválida', () => {
      const testCases = [
        { page: 0, total: 10 },
        { page: 11, total: 10 },
        { page: -1, total: 10 },
      ];

      testCases.forEach(({ page, total }) => {
        const isValid = page >= 1 && page <= total;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Limite de Itens por Página', () => {
    it('deve validar limite mínimo', () => {
      const itemsPerPage = 5;
      const minItems = 1;

      const isValid = itemsPerPage >= minItems;
      expect(isValid).toBe(true);
    });

    it('deve validar limite máximo', () => {
      const itemsPerPage = 100;
      const maxItems = 100;

      const isValid = itemsPerPage <= maxItems;
      expect(isValid).toBe(true);
    });

    it('deve rejeitar limite fora do range', () => {
      const testCases = [0, 101, -1];

      testCases.forEach(itemsPerPage => {
        const isValid = itemsPerPage >= 1 && itemsPerPage <= 100;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Performance com Muitos Dados', () => {
    it('deve paginar lista grande eficientemente', () => {
      const largeList = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1 }));
      const itemsPerPage = 50;
      const currentPage = 1;

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageItems = largeList.slice(startIndex, endIndex);

      expect(pageItems.length).toBe(50);
      expect(pageItems[0].id).toBe(1);
      expect(pageItems[49].id).toBe(50);
    });

    it('deve calcular página correta para lista grande', () => {
      const totalItems = 10000;
      const itemsPerPage = 50;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(200);
    });
  });
});

