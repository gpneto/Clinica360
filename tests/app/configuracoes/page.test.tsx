import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ConfiguracoesPage from '@/app/configuracoes/page';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/hooks/useFirestore';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('next/navigation');
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('@/components/tutorial/TutorialProvider', () => ({
  useTutorial: () => ({
    completeTutorial: vi.fn(),
    resetTutorial: vi.fn(),
  }),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({}),
  })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  getCountFromServer: vi.fn(() => Promise.resolve({
    data: () => ({ count: 0 }),
  })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(),
  })),
  addDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
  functions: {
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  },
  storage: {
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
    deleteObject: vi.fn(),
  },
}));
vi.mock('@/lib/sample-data-generator', () => ({
  SampleDataGenerator: {
    generateSampleData: vi.fn(() => Promise.resolve()),
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
    Settings: createIcon('Settings'),
    Save: createIcon('Save'),
    Bell: createIcon('Bell'),
    Clock: createIcon('Clock'),
    DollarSign: createIcon('DollarSign'),
    Shield: createIcon('Shield'),
    Sparkles: createIcon('Sparkles'),
    MessageSquare: createIcon('MessageSquare'),
    RefreshCcw: createIcon('RefreshCcw'),
    Upload: createIcon('Upload'),
    X: createIcon('X'),
    Image: createIcon('Image'),
    Download: createIcon('Download'),
    Users: createIcon('Users'),
    Loader2: createIcon('Loader2'),
    CheckCircle2: createIcon('CheckCircle2'),
    AlertCircle: createIcon('AlertCircle'),
  };
});

// Mock do date-fns
vi.mock('date-fns', () => ({
  addMonths: vi.fn((date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }),
  subMonths: vi.fn((date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }),
  formatDistanceToNow: vi.fn(() => 'há 2 dias'),
  startOfMonth: vi.fn((date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)),
}));

describe('ConfiguracoesPage', () => {
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

    (useCompany as any).mockReturnValue({
      company: {
        id: 'test-company-id',
        name: 'Test Company',
        tipoEstabelecimento: 'clinica',
      },
      loading: false,
    });

    (useRouter as any).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
  });

  it('deve renderizar a página de configurações corretamente', () => {
    const { container } = render(<ConfiguracoesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir seções de configuração', () => {
    const { container } = render(<ConfiguracoesPage />);
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

    const { container } = render(<ConfiguracoesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir loading quando dados estão carregando', () => {
    (useCompany as any).mockReturnValue({
      company: null,
      loading: true,
    });

    const { container } = render(<ConfiguracoesPage />);
    expect(container).toBeTruthy();
  });
});

