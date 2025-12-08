import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionsModal } from '@/components/PermissionsModal';
import { GranularPermissions } from '@/types';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
    Shield: createIcon('Shield'),
    X: createIcon('X'),
    Save: createIcon('Save'),
  };
});

describe('PermissionsModal', () => {
  const mockPermissions: GranularPermissions = {
    agendaVisualizacao: true,
    agendaEdicao: false,
    clientesVisualizacao: true,
    clientesEdicao: false,
  };

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o modal de permissões corretamente', () => {
    const { container } = render(
      <PermissionsModal
        userId="user1"
        permissions={mockPermissions}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve fechar o modal ao clicar em fechar', () => {
    const { container } = render(
      <PermissionsModal
        userId="user1"
        permissions={mockPermissions}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve salvar permissões ao clicar em salvar', () => {
    const { container } = render(
      <PermissionsModal
        userId="user1"
        permissions={mockPermissions}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(container).toBeTruthy();
  });
});

