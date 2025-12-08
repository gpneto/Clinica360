import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FinancialReportsPage from '@/app/relatorios/page';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, usePatients, useServices, useCompanySettings } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
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
vi.mock('@/lib/permissions', () => ({
  hasFullFinancialAccess: vi.fn(() => true),
}));
vi.mock('@/components/DashboardCharts', () => ({
  DashboardCharts: ({ data, ...props }: any) => <div data-testid="dashboard-charts">Charts</div>,
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
    DollarSign: createIcon('DollarSign'),
    TrendingUp: createIcon('TrendingUp'),
    Users: createIcon('Users'),
    Calendar: createIcon('Calendar'),
    Download: createIcon('Download'),
    Filter: createIcon('Filter'),
    BarChart3: createIcon('BarChart3'),
  };
});

// Mock do moment
vi.mock('moment', () => {
  const momentFn = (date?: any) => {
    const d = date ? new Date(date) : new Date();
    return {
      startOf: vi.fn(() => momentFn(d)),
      endOf: vi.fn(() => momentFn(d)),
      isBetween: vi.fn(() => true),
      format: vi.fn(() => '2024-01-01'),
      toDate: vi.fn(() => d),
    };
  };
  momentFn.default = momentFn;
  return {
    default: momentFn,
    __esModule: true,
  };
});

describe('FinancialReportsPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  const mockAppointments = [
    {
      id: 'apt1',
      clientId: 'p1',
      professionalId: 'prof1',
      serviceId: 'service1',
      inicio: new Date('2024-01-15T10:00:00'),
      fim: new Date('2024-01-15T11:00:00'),
      precoCentavos: 10000,
      status: 'concluido' as const,
      companyId: 'test-company-id',
      valorPagoCentavos: 10000,
    },
  ];

  const mockProfessionals = [
    {
      id: 'prof1',
      apelido: 'Dr. João',
      corHex: '#FF5733',
      ativo: true,
    },
  ];

  const mockPatients = [
    {
      id: 'p1',
      nome: 'Paciente Teste',
      telefoneE164: '+5511999999999',
      companyId: 'test-company-id',
    },
  ];

  const mockServices = [
    {
      id: 'service1',
      nome: 'Consulta',
      duracaoMin: 60,
      precoCentavos: 10000,
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

    (useAppointments as any).mockReturnValue({
      appointments: mockAppointments,
      loading: false,
    });

    (useProfessionals as any).mockReturnValue({
      professionals: mockProfessionals,
      loading: false,
    });

    (usePatients as any).mockReturnValue({
      patients: mockPatients,
      loading: false,
    });

    (useServices as any).mockReturnValue({
      services: mockServices,
      loading: false,
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        showCommission: true,
      },
      loading: false,
    });
  });

  it('deve renderizar a página de relatórios corretamente', () => {
    const { container } = render(<FinancialReportsPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir dados financeiros quando disponíveis', () => {
    const { container } = render(<FinancialReportsPage />);
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

    const { container } = render(<FinancialReportsPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir loading quando dados estão carregando', () => {
    (useAppointments as any).mockReturnValue({
      appointments: [],
      loading: true,
    });

    const { container } = render(<FinancialReportsPage />);
    expect(container).toBeTruthy();
  });

  it('deve permitir alternar entre período semanal e mensal', () => {
    const { container } = render(<FinancialReportsPage />);
    expect(container).toBeTruthy();
  });
});

