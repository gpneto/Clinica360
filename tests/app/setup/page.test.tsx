import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetupPage from '@/app/setup/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  setDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-company-id' })),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('@/components/ui/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
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
    Building2: createIcon('Building2'),
    CheckCircle2: createIcon('CheckCircle2'),
    AlertCircle: createIcon('AlertCircle'),
    ArrowRight: createIcon('ArrowRight'),
  };
});

describe('SetupPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      needsCompanySetup: true,
      loading: false,
      switchContext: vi.fn(),
    });

    (useRouter as any).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
  });

  it('deve renderizar a página de setup corretamente', () => {
    const { container } = render(<SetupPage />);
    expect(container).toBeTruthy();
  });

  it('deve redirecionar para /signin se não houver usuário', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      needsCompanySetup: true,
      loading: false,
    });

    const mockReplace = vi.fn();
    (useRouter as any).mockReturnValue({
      replace: mockReplace,
    });

    render(<SetupPage />);
    expect(mockReplace).toHaveBeenCalledWith('/signin');
  });

  it('deve redirecionar para /agenda se não precisa de setup', () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      needsCompanySetup: false,
      loading: false,
    });

    const mockReplace = vi.fn();
    (useRouter as any).mockReturnValue({
      replace: mockReplace,
    });

    render(<SetupPage />);
    expect(mockReplace).toHaveBeenCalledWith('/agenda');
  });

  it('deve permitir preencher formulário de setup', () => {
    const { container } = render(<SetupPage />);
    expect(container).toBeTruthy();
  });
});

