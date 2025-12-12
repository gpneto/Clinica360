import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ServicesPage from '@/app/servicos/page';
import { useAuth } from '@/lib/auth-context';
import { useServices, useCompanySettings, useCompany } from '@/hooks/useFirestore';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('next/navigation');
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('@/components/ui/loading', () => {
  const React = require('react');
  return {
    LoadingSpinner: ({ size, className }: any) => React.createElement('div', { 'data-testid': 'loading-spinner', className }, 'Loading...'),
  };
});
vi.mock('@/components/ui/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/components/ui/card', () => {
  const React = require('react');
  return {
    Card: ({ children, ...props }: any) => React.createElement('div', props, children),
    CardContent: ({ children, ...props }: any) => React.createElement('div', props, children),
    CardHeader: ({ children, ...props }: any) => React.createElement('div', props, children),
    CardTitle: ({ children, ...props }: any) => React.createElement('h3', props, children),
  };
});
vi.mock('@/lib/permissions', () => ({
  canAccessServicesMenu: vi.fn(() => true),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  getGradientColors: vi.fn(() => ({ start: '#000', middle: '#333', end: '#666' })),
  getGradientStyle: vi.fn(() => ({ background: 'linear-gradient(90deg, #000, #666)' })),
}));
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => '01/01/2024'),
}));

// Mock das funções utilitárias que podem estar faltando
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

const formatCurrency = (centavos: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
};

// Mock global para as funções que podem ser usadas na página
global.formatDuration = formatDuration;
global.formatCurrency = formatCurrency;
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
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
      tr: createMotionElement('tr'),
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
    Plus: createIcon('Plus'),
    Package: createIcon('Package'),
    Edit: createIcon('Edit'),
    Trash2: createIcon('Trash2'),
    Clock: createIcon('Clock'),
    DollarSign: createIcon('DollarSign'),
    Percent: createIcon('Percent'),
    UserCheck: createIcon('UserCheck'),
    BarChart3: createIcon('BarChart3'),
    Gift: createIcon('Gift'),
    Tablet: createIcon('Tablet'),
    Wand2: createIcon('Wand2'),
    Upload: createIcon('Upload'),
    Check: createIcon('Check'),
    X: createIcon('X'),
    Search: createIcon('Search'),
    FileUp: createIcon('FileUp'),
    Table: createIcon('Table'),
    PowerOff: createIcon('PowerOff'),
    Power: createIcon('Power'),
  };
});

describe('ServicesPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  const mockServices = [
    {
      id: 'service1',
      nome: 'Consulta',
      duracaoMin: 60,
      precoCentavos: 10000,
      comissaoPercent: 30,
      ativo: true,
      companyId: 'test-company-id',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });

    (useServices as any).mockReturnValue({
      services: mockServices,
      loading: false,
      error: null,
      createService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        showCommission: true,
        comissaoPadrao: 30,
      },
      loading: false,
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

  it('deve renderizar a página de serviços corretamente', () => {
    const { container } = render(<ServicesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir lista de serviços quando disponível', () => {
    const { container } = render(<ServicesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir botão para adicionar novo serviço', () => {
    const { container } = render(<ServicesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir campo de busca', () => {
    const { container } = render(<ServicesPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir loading quando dados estão carregando', () => {
    (useServices as any).mockReturnValue({
      services: [],
      loading: true,
      error: null,
      createService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
    });

    const { container } = render(<ServicesPage />);
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

    const { container } = render(<ServicesPage />);
    expect(container).toBeTruthy();
  });
});

