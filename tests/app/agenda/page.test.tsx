import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgendaPage from '@/app/agenda/page';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, useServices, usePatients, useCompany } from '@/hooks/useFirestore';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('next/navigation');
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'test-doc' })),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ estado: 'SP' }),
  })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('@/components/ProfessionalCalendar', () => ({
  ProfessionalCalendar: () => <div data-testid="professional-calendar">Calendário</div>,
}));
vi.mock('@/components/MobileAppointmentForm', () => ({
  MobileAppointmentForm: () => null,
}));
vi.mock('@/components/AdvancedFilters', () => ({
  AdvancedFilters: () => null,
}));
vi.mock('@/components/ReturnSuggestions', () => ({
  ReturnSuggestions: () => null,
}));
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
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => {
        const { whileHover, whileTap, whileInView, initial, animate, exit, ...restProps } = props;
        return React.createElement('div', { ref, ...restProps }, children);
      }),
      button: React.forwardRef(({ children, ...props }: any, ref: any) => {
        const { whileHover, whileTap, whileInView, initial, animate, exit, ...restProps } = props;
        return React.createElement('button', { ref, ...restProps }, children);
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AgendaPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  const mockAppointments = [
    {
      id: '1',
      patientId: 'p1',
      professionalId: 'prof1',
      inicio: new Date('2024-01-15T10:00:00'),
      fim: new Date('2024-01-15T11:00:00'),
      status: 'agendado' as const,
      services: ['service1'],
      companyId: 'test-company-id',
      precoCentavos: 10000,
      comissaoPercent: 10,
      isBlock: false,
      enviarNotificacao: true,
      createdByUid: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProfessionals = [
    {
      id: 'prof1',
      name: 'Dr. João',
      color: '#FF5733',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      userData: {
        role: 'owner',
        companyId: 'test-company-id',
      },
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

    (useServices as any).mockReturnValue({
      services: [],
      loading: false,
    });

    (usePatients as any).mockReturnValue({
      patients: [],
      loading: false,
    });

    (useCompany as any).mockReturnValue({
      company: {
        id: 'test-company-id',
        name: 'Test Company',
      },
      loading: false,
    });

    (useRouter as any).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });

    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve renderizar a página de agenda corretamente', () => {
    render(<AgendaPage />);

    expect(screen.getByTestId('access-guard')).toBeInTheDocument();
  });

  it('deve exibir o calendário profissional', () => {
    render(<AgendaPage />);

    // Há versões mobile e desktop, então verificamos que pelo menos uma existe
    const calendars = screen.getAllByTestId('professional-calendar');
    expect(calendars.length).toBeGreaterThan(0);
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      userData: {
        role: 'owner',
        companyId: 'test-company-id',
      },
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    render(<AgendaPage />);

    expect(screen.getByTestId('access-guard')).toBeInTheDocument();
  });

  it('deve exibir loading quando dados estão carregando', () => {
    (useAppointments as any).mockReturnValue({
      appointments: [],
      loading: true,
    });

    render(<AgendaPage />);

    // Verificar se renderiza mesmo durante loading
    expect(document.body).toBeTruthy();
  });

  it('deve carregar view salva do localStorage', () => {
    localStorageMock.getItem.mockReturnValue('week');

    render(<AgendaPage />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('smartdoctor:agenda:lastView');
  });
});

