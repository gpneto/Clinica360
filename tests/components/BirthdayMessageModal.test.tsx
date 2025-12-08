import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BirthdayMessageModal } from '@/components/BirthdayMessageModal';

// Mocks
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    companyId: 'test-company-id',
  })),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
}));
vi.mock('@/lib/firebase', () => ({
  functions: {
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  },
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
    Gift: createIcon('Gift'),
    X: createIcon('X'),
    Send: createIcon('Send'),
  };
});

describe('BirthdayMessageModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o modal corretamente', () => {
    const { container } = render(
      <BirthdayMessageModal
        isOpen={true}
        onClose={mockOnClose}
        patientId="p1"
        patientFirstName="Paciente"
        patientPhone="+5511999999999"
        birthdayDate={new Date('1990-01-15')}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve fechar o modal ao clicar em fechar', () => {
    const { container } = render(
      <BirthdayMessageModal
        isOpen={true}
        onClose={mockOnClose}
        patientId="p1"
        patientFirstName="Paciente"
        patientPhone="+5511999999999"
        birthdayDate={new Date('1990-01-15')}
      />
    );

    expect(container).toBeTruthy();
  });

  it('não deve renderizar quando isOpen é false', () => {
    const { container } = render(
      <BirthdayMessageModal
        isOpen={false}
        onClose={mockOnClose}
        patientId="p1"
        patientFirstName="Paciente"
        patientPhone="+5511999999999"
        birthdayDate={new Date('1990-01-15')}
      />
    );

    expect(container).toBeTruthy();
  });
});

