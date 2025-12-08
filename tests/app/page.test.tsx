import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { useAuth } from '@/lib/auth-context';
import { useAppointments } from '@/hooks/useFirestore';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('next/navigation');
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ onViewAppointment, onCompleteClick }: any) => (
    <div data-testid="dashboard">
      <button onClick={() => onViewAppointment?.({ id: '1', patientId: 'p1' })}>
        Ver Agendamento
      </button>
      <button onClick={() => onCompleteClick?.({ id: '1', patientId: 'p1' })}>
        Concluir Agendamento
      </button>
    </div>
  ),
}));
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('@/components/MobileAppointmentForm', () => ({
  MobileAppointmentForm: ({ isOpen, onClose }: any) => 
    isOpen ? <div data-testid="mobile-form">Formulário Mobile</div> : null,
}));
vi.mock('@/components/CompleteAppointmentModal', () => ({
  CompleteAppointmentModal: ({ isOpen, onClose }: any) => 
    isOpen ? <div data-testid="complete-modal">Modal de Conclusão</div> : null,
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
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('Home Page', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  };

  const mockAppointments = [
    {
      id: '1',
      patientId: 'p1',
      professionalId: 'prof1',
      date: new Date(),
      status: 'agendado' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        hostname: 'localhost',
        replace: vi.fn(),
        href: '/',
      },
      writable: true,
    });

    (useAppointments as any).mockReturnValue({
      appointments: mockAppointments,
      updateAppointment: vi.fn(),
      loading: false,
    });
  });

  describe('Quando está carregando', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
        themePreference: 'neutral',
        customColor: null,
        customColor2: null,
        companyId: null,
      });
    });

    it('deve exibir spinner de loading', () => {
      render(<Home />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Quando não está autenticado', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
        themePreference: 'neutral',
        customColor: null,
        customColor2: null,
        companyId: null,
      });
    });

    it('não deve renderizar conteúdo quando não há usuário', () => {
      const { container } = render(<Home />);
      
      // Deve retornar null quando não há usuário
      expect(container.firstChild).toBeNull();
    });

    it('deve redirecionar para /signin quando não autenticado', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
          hostname: 'localhost',
          replace: vi.fn(),
          href: '/',
        },
        writable: true,
      });

      render(<Home />);

      await waitFor(() => {
        expect(window.location.replace).toHaveBeenCalledWith('/signin');
      });
    });
  });

  describe('Quando está autenticado', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        themePreference: 'neutral',
        customColor: null,
        customColor2: null,
        companyId: 'test-company-id',
      });
    });

    it('deve renderizar o Dashboard quando autenticado', () => {
      render(<Home />);

      expect(screen.getByTestId('access-guard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('deve renderizar o AccessGuard com roles permitidos', () => {
      render(<Home />);

      const accessGuard = screen.getByTestId('access-guard');
      expect(accessGuard).toBeInTheDocument();
    });

    it('deve abrir formulário mobile ao visualizar agendamento', async () => {
      render(<Home />);

      const viewButton = screen.getByText('Ver Agendamento');
      viewButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-form')).toBeInTheDocument();
      });
    });

    it('deve abrir modal de conclusão ao clicar em concluir', async () => {
      render(<Home />);

      const completeButton = screen.getByText('Concluir Agendamento');
      completeButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('complete-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Temas e cores customizadas', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
    };

    it('deve aplicar tema vibrant quando configurado', () => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        themePreference: 'vibrant',
        customColor: null,
        customColor2: null,
        companyId: 'test-company-id',
      });

      render(<Home />);

      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('deve aplicar tema custom quando configurado', () => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        themePreference: 'custom',
        customColor: '#FF5733',
        customColor2: '#33FF57',
        companyId: 'test-company-id',
      });

      render(<Home />);

      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  describe('Redirecionamento por hostname', () => {
    it('deve redirecionar para /login quando hostname é texai.online e não autenticado', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
          hostname: 'texai.online',
          replace: vi.fn(),
          href: '/',
        },
        writable: true,
      });

      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
        themePreference: 'neutral',
        customColor: null,
        customColor2: null,
        companyId: null,
      });

      render(<Home />);

      await waitFor(() => {
        expect(window.location.replace).toHaveBeenCalledWith('/login');
      });
    });
  });
});

