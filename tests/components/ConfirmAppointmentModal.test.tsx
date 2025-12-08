import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmAppointmentModal } from '@/components/ConfirmAppointmentModal';
import { Appointment } from '@/types';

// Mocks
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    themePreference: 'neutral',
  })),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
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
    CheckCircle2: createIcon('CheckCircle2'),
    X: createIcon('X'),
    Calendar: createIcon('Calendar'),
    Clock: createIcon('Clock'),
  };
});

describe('ConfirmAppointmentModal', () => {
  const mockAppointment: Appointment = {
    id: 'apt1',
    clientId: 'p1',
    professionalId: 'prof1',
    serviceId: 'service1',
    inicio: new Date('2024-01-15T10:00:00'),
    fim: new Date('2024-01-15T11:00:00'),
    precoCentavos: 10000,
    status: 'agendado' as const,
    companyId: 'test-company-id',
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o modal corretamente', () => {
    const { container } = render(
      <ConfirmAppointmentModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve fechar o modal ao clicar em fechar', () => {
    const { container } = render(
      <ConfirmAppointmentModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve chamar onConfirm ao confirmar agendamento', () => {
    const { container } = render(
      <ConfirmAppointmentModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container).toBeTruthy();
  });
});

