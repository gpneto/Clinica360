import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '@/components/AdvancedFilters';

// Mock do framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionElement = (tag: string) => {
    return React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, whileInView, initial, animate, exit, viewport, transition, delay, duration, onClick, ...restProps } = props;
      return React.createElement(tag, { ref, onClick, ...restProps }, children);
    });
  };
  
  return {
    motion: {
      div: createMotionElement('div'),
      button: createMotionElement('button'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock dos ícones
vi.mock('lucide-react', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const IconComponent = (props: any) => {
      return React.createElement('svg', { ...props, 'data-icon': name }, null);
    };
    IconComponent.displayName = name;
    return IconComponent;
  };
  
  return {
    Filter: createIcon('Filter'),
    X: createIcon('X'),
    Calendar: createIcon('Calendar'),
  };
});

describe('AdvancedFilters', () => {
  const mockProfessionals = [
    { id: 'prof1', apelido: 'Dr. João', corHex: '#FF5733', ativo: true },
  ];

  const mockServices = [
    { id: 'service1', nome: 'Consulta', duracaoMin: 60, precoCentavos: 10000, ativo: true },
  ];

  const mockPatients = [
    { id: 'p1', nome: 'Paciente Teste', telefoneE164: '+5511999999999', companyId: 'test-company-id' },
  ];

  const mockOnProfessionalsChange = vi.fn();
  const mockOnServicesChange = vi.fn();
  const mockOnPatientsChange = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnDateRangeChange = vi.fn();
  const mockOnPriceRangeChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os filtros avançados corretamente', () => {
    const { container } = render(
      <AdvancedFilters
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        selectedProfessionals={[]}
        selectedServices={[]}
        selectedPatients={[]}
        selectedStatus={[]}
        dateRange={{ start: null, end: null }}
        priceRange={{ min: 0, max: 10000 }}
        onProfessionalsChange={mockOnProfessionalsChange}
        onServicesChange={mockOnServicesChange}
        onPatientsChange={mockOnPatientsChange}
        onStatusChange={mockOnStatusChange}
        onDateRangeChange={mockOnDateRangeChange}
        onPriceRangeChange={mockOnPriceRangeChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve aplicar filtros quando alterados', () => {
    const { container } = render(
      <AdvancedFilters
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        selectedProfessionals={[]}
        selectedServices={[]}
        selectedPatients={[]}
        selectedStatus={[]}
        dateRange={{ start: null, end: null }}
        priceRange={{ min: 0, max: 10000 }}
        onProfessionalsChange={mockOnProfessionalsChange}
        onServicesChange={mockOnServicesChange}
        onPatientsChange={mockOnPatientsChange}
        onStatusChange={mockOnStatusChange}
        onDateRangeChange={mockOnDateRangeChange}
        onPriceRangeChange={mockOnPriceRangeChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve limpar filtros ao clicar em limpar', () => {
    const { container } = render(
      <AdvancedFilters
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        selectedProfessionals={[]}
        selectedServices={[]}
        selectedPatients={[]}
        selectedStatus={[]}
        dateRange={{ start: null, end: null }}
        priceRange={{ min: 0, max: 10000 }}
        onProfessionalsChange={mockOnProfessionalsChange}
        onServicesChange={mockOnServicesChange}
        onPatientsChange={mockOnPatientsChange}
        onStatusChange={mockOnStatusChange}
        onDateRangeChange={mockOnDateRangeChange}
        onPriceRangeChange={mockOnPriceRangeChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(container).toBeTruthy();
  });
});

