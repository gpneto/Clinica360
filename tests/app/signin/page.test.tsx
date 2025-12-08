import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SignIn from '@/app/signin/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';

// Mock do useAuth
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');

// Mock do framer-motion - mais completo
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionElement = (tag: string) => {
    return React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, whileInView, initial, animate, exit, viewport, transition, ...restProps } = props;
      return React.createElement(tag, { ref, ...restProps }, children);
    });
  };
  
  return {
    motion: {
      div: createMotionElement('div'),
      h1: createMotionElement('h1'),
      h2: createMotionElement('h2'),
      h3: createMotionElement('h3'),
      p: createMotionElement('p'),
      section: createMotionElement('section'),
      button: createMotionElement('button'),
      nav: createMotionElement('nav'),
      footer: createMotionElement('footer'),
      span: createMotionElement('span'),
      img: createMotionElement('img'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock do handleGoogleRedirect
vi.mock('@/lib/firebase', () => ({
  handleGoogleRedirect: vi.fn(),
}));

describe('SignIn Page', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/signin',
    query: {},
    asPath: '/signin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue('/signin');
  });

  describe('Quando não está autenticado', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
        needsCompanySetup: false,
        companyId: null,
      });
    });

    it('deve renderizar a página de signin corretamente', () => {
      render(<SignIn />);

      // Verificar elementos principais do hero
      expect(screen.getByText(/Organize sua clínica ou/i)).toBeInTheDocument();
      // O texto "consultório de forma inteligente" pode estar quebrado em múltiplos elementos
      expect(screen.getByText(/consultório/i)).toBeInTheDocument();
      expect(screen.getByText(/de forma inteligente/i)).toBeInTheDocument();
    });

    it('deve exibir o logo e nome da aplicação', () => {
      render(<SignIn />);

      // "Clínica 360" aparece várias vezes, então verificamos que pelo menos uma existe
      const clinica360Elements = screen.getAllByText('Clínica 360');
      expect(clinica360Elements.length).toBeGreaterThan(0);
    });

    it('deve exibir botões de navegação no header', () => {
      render(<SignIn />);

      const entrarButton = screen.getAllByText('Entrar')[0];
      const comecarTesteButton = screen.getAllByText('Começar teste')[0];

      expect(entrarButton).toBeInTheDocument();
      expect(comecarTesteButton).toBeInTheDocument();
    });

    it('deve exibir o botão "Começar agora" no hero', () => {
      render(<SignIn />);

      const comecarAgoraButton = screen.getByText('Começar agora');
      expect(comecarAgoraButton).toBeInTheDocument();
    });

    it('deve exibir o botão "Saiba mais" no hero', () => {
      render(<SignIn />);

      const saibaMaisButton = screen.getByText('Saiba mais');
      expect(saibaMaisButton).toBeInTheDocument();
    });

    it('deve exibir indicadores de confiança', () => {
      render(<SignIn />);

      // "Comece seu teste" aparece várias vezes, então verificamos que pelo menos uma existe
      const comeceTesteElements = screen.getAllByText(/Comece seu teste/i);
      expect(comeceTesteElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Sem necessidade de cartão/i)).toBeInTheDocument();
      expect(screen.getByText(/Setup em minutos/i)).toBeInTheDocument();
    });

    it('deve exibir a seção de assistente IA', () => {
      render(<SignIn />);

      expect(screen.getByText(/Assistente Inteligente com IA/i)).toBeInTheDocument();
    });

    it('deve exibir todas as features', () => {
      render(<SignIn />);

      expect(screen.getByText(/Assistente IA Inteligente/i)).toBeInTheDocument();
      // "Clínica 360" aparece várias vezes, então verificamos que pelo menos uma existe
      const clinica360Elements = screen.getAllByText(/Clínica 360/i);
      expect(clinica360Elements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Gestão Multi-profissionais/i)).toBeInTheDocument();
      // "Lembretes Automáticos" pode aparecer várias vezes
      const lembretesElements = screen.getAllByText(/Lembretes Automáticos/i);
      expect(lembretesElements.length).toBeGreaterThan(0);
      // "Controle Financeiro" pode aparecer várias vezes
      const controleFinanceiroElements = screen.getAllByText(/Controle Financeiro/i);
      expect(controleFinanceiroElements.length).toBeGreaterThan(0);
      // "Prontuários Digitais" pode aparecer várias vezes
      const prontuariosElements = screen.getAllByText(/Prontuários Digitais/i);
      expect(prontuariosElements.length).toBeGreaterThan(0);
      // "100% Responsivo" pode aparecer várias vezes
      const responsivoElements = screen.getAllByText(/100% Responsivo/i);
      expect(responsivoElements.length).toBeGreaterThan(0);
    });

    it('deve exibir a seção "Como funciona"', () => {
      render(<SignIn />);

      expect(screen.getByText(/Como funciona/i)).toBeInTheDocument();
      expect(screen.getByText(/Crie sua conta/i)).toBeInTheDocument();
      expect(screen.getByText(/Configure profissionais e serviços/i)).toBeInTheDocument();
      expect(screen.getByText(/Comece a agendar/i)).toBeInTheDocument();
    });

    it('deve exibir a seção de benefícios', () => {
      render(<SignIn />);

      expect(screen.getByText(/Resultados que fazem a diferença/i)).toBeInTheDocument();
      expect(screen.getByText(/Redução de faltas em até 40%/i)).toBeInTheDocument();
    });

    it('deve exibir o footer', () => {
      render(<SignIn />);

      const footer = screen.getByText(/©/i);
      expect(footer).toBeInTheDocument();
      expect(screen.getByText(/Todos os direitos reservados/i)).toBeInTheDocument();
    });

    it('deve navegar para /login quando clicar em "Entrar"', () => {
      render(<SignIn />);

      const entrarButtons = screen.getAllByText('Entrar');
      entrarButtons[0].click();

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('deve navegar para /login quando clicar em "Começar teste"', () => {
      render(<SignIn />);

      const comecarTesteButtons = screen.getAllByText('Começar teste');
      comecarTesteButtons[0].click();

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('deve navegar para /login quando clicar em "Começar agora"', () => {
      render(<SignIn />);

      const comecarAgoraButton = screen.getByText('Começar agora');
      comecarAgoraButton.click();

      expect(mockPush).toHaveBeenCalledWith('/login');
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
      render(<SignIn />);

      // Verificar se há um elemento de loading (spinner)
      const loadingElement = document.querySelector('.animate-spin');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Quando já está autenticado', () => {
    let mockLocationHref: string;
    let mockUsePathname: any;

    beforeEach(() => {
      mockLocationHref = '/signin';
      
      // Mock do usePathname para retornar '/signin'
      mockUsePathname = vi.fn(() => '/signin');
      (usePathname as any).mockReturnValue('/signin');
      
      // Mock do window.location que permite verificar mudanças
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
      render(<SignIn />);

      await waitFor(() => {
        // Verificar se window.location.href foi alterado para '/'
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

      render(<SignIn />);

      await waitFor(() => {
        // Verificar se window.location.href foi alterado para '/setup'
        expect(window.location.href).toBe('/setup');
      }, { timeout: 3000 });
    });
  });

  describe('Profissionais suportados', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
        needsCompanySetup: false,
        companyId: null,
      });
    });

    it('deve exibir lista de profissionais suportados', () => {
      render(<SignIn />);

      // Verificar alguns profissionais na lista
      expect(screen.getByText(/Clinicas Odontológicas/i)).toBeInTheDocument();
      expect(screen.getByText(/Salões de Beleza/i)).toBeInTheDocument();
      expect(screen.getByText(/Barbearias/i)).toBeInTheDocument();
    });
  });
});

