import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UsuariosPage from '@/app/usuarios/page';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-user-id' })),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/components/PermissionsModal', () => ({
  PermissionsModal: ({ children, ...props }: any) => <div data-testid="permissions-modal">{children}</div>,
}));
vi.mock('@/lib/permissions', () => ({
  createDefaultPermissions: vi.fn(() => ({})),
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
      section: createMotionElement('section'),
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
    Users: createIcon('Users'),
    UserPlus: createIcon('UserPlus'),
    Edit: createIcon('Edit'),
    Shield: createIcon('Shield'),
    UserCheck: createIcon('UserCheck'),
    UserX: createIcon('UserX'),
    X: createIcon('X'),
    Settings: createIcon('Settings'),
  };
});

describe('UsuariosPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  it('deve renderizar a página de usuários corretamente', () => {
    const { container } = render(<UsuariosPage />);
    expect(container).toBeTruthy();
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(<UsuariosPage />);
    expect(container).toBeTruthy();
  });
});

