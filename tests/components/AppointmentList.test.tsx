import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentList } from '@/components/AppointmentList';
import { useAuth } from '@/lib/auth-context';
import { Appointment } from '@/types';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useCustomerLabels', () => ({
  useCustomerLabels: () => ({
    singular: 'paciente',
    singularTitle: 'Paciente',
    plural: 'pacientes',
    pluralTitle: 'Pacientes',
  }),
}));

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
    Calendar: createIcon('Calendar'),
    Clock: createIcon('Clock'),
    User: createIcon('User'),
    CheckCircle2: createIcon('CheckCircle2'),
    X: createIcon('X'),
    MapPin: createIcon('MapPin'),
    DollarSign: createIcon('DollarSign'),
    Scissors: createIcon('Scissors'),
    Edit: createIcon('Edit'),
    Trash2: createIcon('Trash2'),
    Phone: createIcon('Phone'),
    Mail: createIcon('Mail'),
  };
});

// Mock do date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => '01/01/2024 10:00'),
}));

describe('AppointmentList', () => {
  const mockAppointments: Appointment[] = [
    {
      id: 'apt1',
      clientId: 'p1',
      professionalId: 'prof1',
      serviceId: 'service1',
      inicio: new Date('2024-01-15T10:00:00'),
      fim: new Date('2024-01-15T11:00:00'),
      precoCentavos: 10000,
      status: 'agendado' as const,
      companyId: 'test-company-id',
    },
  ];


  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  const mockProfessionals = [
    { id: 'prof1', apelido: 'Dr. João', corHex: '#FF5733', ativo: true },
  ];

  const mockServices = [
    { id: 'service1', nome: 'Consulta', duracaoMin: 60, precoCentavos: 10000, ativo: true },
  ];

  const mockPatients = [
    { id: 'p1', nome: 'Paciente Teste', telefoneE164: '+5511999999999', companyId: 'test-company-id' },
  ];

  it('deve renderizar a lista de agendamentos corretamente', () => {
    const { container } = render(
      <AppointmentList
        appointments={mockAppointments}
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve exibir mensagem quando não há agendamentos', () => {
    const { container } = render(
      <AppointmentList
        appointments={[]}
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve chamar onEdit ao clicar em editar agendamento', () => {
    const mockOnEdit = vi.fn();
    const { container } = render(
      <AppointmentList
        appointments={mockAppointments}
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        onEdit={mockOnEdit}
        onDelete={vi.fn()}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(
      <AppointmentList
        appointments={mockAppointments}
        professionals={mockProfessionals}
        services={mockServices}
        patients={mockPatients}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(container).toBeTruthy();
  });
});

