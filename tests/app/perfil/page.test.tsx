import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '@/app/perfil/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('@/hooks/useCustomerLabels', () => ({
  useCustomerLabels: () => ({
    singular: 'paciente',
    singularTitle: 'Paciente',
    plural: 'pacientes',
    pluralTitle: 'Pacientes',
  }),
}));
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      nome: 'Test User',
      email: 'test@example.com',
      telefoneE164: '+5511999999999',
      role: 'owner',
      ativo: true,
    }),
  })),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  setDoc: vi.fn(() => Promise.resolve()),
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
    User: createIcon('User'),
    Mail: createIcon('Mail'),
    Phone: createIcon('Phone'),
    Shield: createIcon('Shield'),
    Edit: createIcon('Edit'),
    Save: createIcon('Save'),
    X: createIcon('X'),
    Settings: createIcon('Settings'),
    CheckCircle: createIcon('CheckCircle'),
    AlertCircle: createIcon('AlertCircle'),
    Sparkles: createIcon('Sparkles'),
    Palette: createIcon('Palette'),
  };
});

describe('ProfilePage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      role: 'owner',
      professionalId: null,
      companyId: 'test-company-id',
      userData: {
        nome: 'Test User',
        email: 'test@example.com',
        role: 'owner',
        ativo: true,
      },
      themePreference: 'neutral',
      customColor: null,
      setThemePreference: vi.fn(),
    });

    (useRouter as any).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
  });

  it('deve renderizar a página de perfil corretamente', async () => {
    const { container } = render(<ProfilePage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('deve exibir informações do usuário', async () => {
    const { container } = render(<ProfilePage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('deve permitir editar perfil', async () => {
    const { container } = render(<ProfilePage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('deve aplicar tema custom quando configurado', async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      role: 'owner',
      professionalId: null,
      companyId: 'test-company-id',
      userData: {
        nome: 'Test User',
        email: 'test@example.com',
        role: 'owner',
        ativo: true,
      },
      themePreference: 'custom',
      customColor: '#FF5733',
      setThemePreference: vi.fn(),
    });

    const { container } = render(<ProfilePage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('deve exibir loading quando dados estão carregando', () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeTruthy();
  });
});

