import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AccessGuard } from '@/components/AccessGuard';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    authStateReady: vi.fn(() => Promise.resolve()),
  },
}));

describe('AccessGuard Component', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  describe('Quando está carregando', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        userData: null,
        loading: true,
        role: null,
        needsCompanySetup: false,
      });
    });

    it('deve exibir spinner de loading', () => {
      render(
        <AccessGuard allowed={['owner']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Quando não está autenticado', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        userData: null,
        loading: false,
        role: null,
        needsCompanySetup: false,
      });

      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
          href: '/',
          replace: vi.fn(),
        },
        writable: true,
      });
    });

    it('não deve renderizar conteúdo quando não há usuário', () => {
      const { container } = render(
        <AccessGuard allowed={['owner']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      // Deve retornar null quando não há usuário
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Quando está autenticado com acesso permitido', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        userData: {
          role: 'owner',
          ativo: true,
        },
        loading: false,
        role: 'owner',
        needsCompanySetup: false,
      });
    });

    it('deve renderizar conteúdo quando tem acesso', () => {
      render(
        <AccessGuard allowed={['owner', 'admin']}>
          <div data-testid="content">Conteúdo Protegido</div>
        </AccessGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('deve permitir acesso para role owner', () => {
      render(
        <AccessGuard allowed={['owner']}>
          <div data-testid="content">Conteúdo</div>
        </AccessGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('deve permitir acesso para role admin', () => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        userData: {
          role: 'admin',
          ativo: true,
        },
        loading: false,
        role: 'admin',
        needsCompanySetup: false,
      });

      render(
        <AccessGuard allowed={['admin', 'owner']}>
          <div data-testid="content">Conteúdo</div>
        </AccessGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Quando não tem acesso', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        userData: {
          role: 'atendente',
          ativo: true,
        },
        loading: false,
        role: 'atendente',
        needsCompanySetup: false,
      });
    });

    it('deve exibir mensagem de acesso negado', () => {
      render(
        <AccessGuard allowed={['owner', 'admin']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      expect(screen.getByText(/Acesso Negado/i)).toBeInTheDocument();
      expect(screen.getByText(/Você não tem permissão para acessar esta página/i)).toBeInTheDocument();
    });

    it('deve exibir botão para voltar ao login', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: '/',
        },
        writable: true,
      });

      render(
        <AccessGuard allowed={['owner']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      const backButton = screen.getByText(/Voltar ao Login/i);
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Quando usuário está inativo', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        userData: {
          role: 'owner',
          ativo: false,
        },
        loading: false,
        role: 'owner',
        needsCompanySetup: false,
      });
    });

    it('deve exibir mensagem de usuário inativo', () => {
      render(
        <AccessGuard allowed={['owner']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      expect(screen.getByText(/Sua conta está inativa/i)).toBeInTheDocument();
    });
  });

  describe('Quando precisa configurar empresa', () => {
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        userData: {
          role: 'owner',
          ativo: true,
        },
        loading: false,
        role: 'owner',
        needsCompanySetup: true,
      });
    });

    it('deve redirecionar para /setup', () => {
      render(
        <AccessGuard allowed={['owner']}>
          <div>Conteúdo</div>
        </AccessGuard>
      );

      expect(mockPush).toHaveBeenCalledWith('/setup');
    });
  });
});

