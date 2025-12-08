import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import * as firebase from '@/lib/firebase';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('@/lib/firebase', () => ({
  loginWithGoogle: vi.fn(),
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  handleGoogleRedirect: vi.fn(),
  auth: {
    authStateReady: vi.fn(() => Promise.resolve()),
    currentUser: null,
  },
  db: {},
}));

// Mock do framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionElement = (tag: string) => {
    return React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, whileInView, initial, animate, exit, viewport, transition, onClick, ...restProps } = props;
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

// Mock dos ícones do lucide-react
vi.mock('lucide-react', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const IconComponent = (props: any) => {
      return React.createElement('svg', { ...props, 'data-icon': name, 'data-testid': `icon-${name.toLowerCase()}` }, null);
    };
    IconComponent.displayName = name;
    return IconComponent;
  };
  
  return {
    Calendar: createIcon('Calendar'),
    Mail: createIcon('Mail'),
    Lock: createIcon('Lock'),
    User: createIcon('User'),
    Eye: createIcon('Eye'),
    EyeOff: createIcon('EyeOff'),
    X: createIcon('X'),
  };
});

describe('LoginPage', () => {
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
    (usePathname as any).mockReturnValue('/login');
    
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      needsCompanySetup: false,
      companyId: null,
    });

    // Mock do window.location
    delete (window as any).location;
    (window as any).location = {
      href: '/login',
      replace: vi.fn(),
    };
  });

  describe('Quando não está autenticado', () => {
    it('deve renderizar a página de login corretamente', () => {
      render(<LoginPage />);

      expect(screen.getByText(/Bem-vindo de volta/i)).toBeInTheDocument();
      expect(screen.getByText(/Faça login para acessar sua conta/i)).toBeInTheDocument();
    });

    it('deve exibir botão de login com Google', () => {
      render(<LoginPage />);

      const googleButton = screen.getByText(/Entrar com Google/i);
      expect(googleButton).toBeInTheDocument();
    });

    it('deve exibir campos de email e senha', () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/Sua senha/i);
      
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it('deve alternar entre modo login e registro', () => {
      render(<LoginPage />);

      const criarContaButton = screen.getByText(/Criar conta/i);
      fireEvent.click(criarContaButton);

      expect(screen.getByText(/Crie sua conta/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Seu nome completo/i)).toBeInTheDocument();
    });

    it('deve mostrar/ocultar senha ao clicar no ícone', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText(/Sua senha/i) as HTMLInputElement;
      const toggleButton = screen.getByLabelText(/Mostrar senha|Ocultar senha/i);
      
      expect(passwordInput.type).toBe('password');
      
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
      
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('deve exibir link para recuperar senha no modo login', () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByText(/Esqueci minha senha/i);
      expect(forgotPasswordLink).toBeInTheDocument();
    });

    it('deve abrir modal de recuperação de senha', () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByText(/Esqueci minha senha/i);
      fireEvent.click(forgotPasswordLink);

      expect(screen.getByText(/Recuperar senha/i)).toBeInTheDocument();
    });

    it('deve chamar loginWithGoogle ao clicar no botão Google', async () => {
      (firebase.loginWithGoogle as any).mockResolvedValue({ user: { uid: 'test-user' } });
      
      render(<LoginPage />);

      const googleButton = screen.getByText(/Entrar com Google/i);
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(firebase.loginWithGoogle).toHaveBeenCalled();
      });
    });

    it('deve chamar loginWithEmail ao submeter formulário de login', async () => {
      (firebase.loginWithEmail as any).mockResolvedValue({ user: { uid: 'test-user' } });
      
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/Sua senha/i);
      const submitButtons = screen.getAllByText(/Entrar/i);
      const submitButton = submitButtons.find(btn => btn.tagName === 'BUTTON' && btn.type === 'submit') || submitButtons[0];

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebase.loginWithEmail).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('deve chamar registerWithEmail ao submeter formulário de registro', async () => {
      (firebase.registerWithEmail as any).mockResolvedValue({ user: { uid: 'test-user' } });
      
      render(<LoginPage />);

      // Alternar para modo registro
      const criarContaButton = screen.getByText(/Criar conta/i);
      fireEvent.click(criarContaButton);

      const nomeInput = screen.getByPlaceholderText(/Seu nome completo/i);
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/Sua senha/i);
      const submitButton = screen.getByText(/Começar teste/i);

      fireEvent.change(nomeInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebase.registerWithEmail).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          nome: 'Test User',
        });
      });
    });
  });

  describe('Quando está carregando', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
        needsCompanySetup: false,
        companyId: null,
      });
    });

    it('deve exibir loading spinner', () => {
      render(<LoginPage />);

      const loadingElement = document.querySelector('.animate-spin');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Quando já está autenticado', () => {
    let mockLocationHref: string;

    beforeEach(() => {
      mockLocationHref = '/login';
      
      (usePathname as any).mockReturnValue('/login');
      
      delete (window as any).location;
      (window as any).location = {
        get href() {
          return mockLocationHref;
        },
        set href(value: string) {
          mockLocationHref = value;
        },
        replace: vi.fn(),
      };

      (useAuth as any).mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
        },
        loading: false,
        needsCompanySetup: false,
        companyId: 'test-company-id',
      });
    });

    it('deve redirecionar para / quando já autenticado e não precisa setup', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(window.location.href).toBe('/');
      }, { timeout: 3000 });
    });

    it('deve redirecionar para /setup quando precisa configurar empresa', async () => {
      (useAuth as any).mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
        },
        loading: false,
        needsCompanySetup: true,
        companyId: 'test-company-id',
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(window.location.href).toBe('/setup');
      }, { timeout: 3000 });
    });
  });
});

