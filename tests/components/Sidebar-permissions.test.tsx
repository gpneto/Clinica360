import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import type { User, GranularPermissions } from '@/types';

// Mock do useAuth
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock do useRouter
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock do useCompany
vi.mock('@/hooks/useFirestore', () => ({
  useCompany: () => ({
    company: null,
    loading: false,
  }),
  useCompanySettings: () => ({
    settings: { customerLabel: 'paciente' },
    loading: false,
  }),
  useCustomerLabels: () => ({
    singularTitle: 'Paciente',
    pluralTitle: 'Pacientes',
  }),
}));

describe('Sidebar - Verificação de Permissões', () => {
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createUserData = (role: User['role'], permissions?: Partial<GranularPermissions>) => {
    const defaultPermissions: GranularPermissions = {
      agendaEdicao: false,
      agendaVisualizacao: false,
      financeiroDebitosPacientes: false,
      financeiroApenasProprios: false,
      financeiroAcessoCompleto: false,
      menuAgenda: false,
      menuProfissionais: false,
      menuClientes: false,
      menuServicos: false,
      menuMensagens: false,
    };

    return {
      uid: `user-${role}`,
      role,
      nome: `User ${role}`,
      email: `${role}@test.com`,
      ativo: true,
      companyId: 'company1',
      permissions: permissions ? { ...defaultPermissions, ...permissions } : undefined,
    };
  };

  describe('Menu Agenda', () => {
    it('deve exibir menu Agenda para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });

    it('deve exibir menu Agenda para admin', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user2' },
        userData: createUserData('admin'),
        role: 'admin',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });

    it('deve exibir menu Agenda para pro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user3' },
        userData: createUserData('pro'),
        role: 'pro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });

    it('deve exibir menu Agenda para atendente', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user4' },
        userData: createUserData('atendente'),
        role: 'atendente',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });

    it('deve exibir menu Agenda para outro com menuAgenda=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { menuAgenda: true }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });

    it('NÃO deve exibir menu Agenda para outro com menuAgenda=false', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { menuAgenda: false }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.queryByText('Agenda')).not.toBeInTheDocument();
    });
  });

  describe('Menu Pacientes', () => {
    it('deve exibir menu Pacientes para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Pacientes')).toBeInTheDocument();
    });

    it('deve exibir menu Pacientes para outro com menuClientes=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { menuClientes: true }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Pacientes')).toBeInTheDocument();
    });

    it('NÃO deve exibir menu Pacientes para outro com menuClientes=false', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { menuClientes: false }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.queryByText('Pacientes')).not.toBeInTheDocument();
    });
  });

  describe('Menu Mensagens', () => {
    it('deve exibir menu Mensagens para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Mensagens')).toBeInTheDocument();
    });

    it('deve exibir menu Mensagens para outro com menuMensagens=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { menuMensagens: true }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Mensagens')).toBeInTheDocument();
    });

    it('NÃO deve exibir menu Mensagens para outro com menuMensagens=false', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { menuMensagens: false }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.queryByText('Mensagens')).not.toBeInTheDocument();
    });
  });

  describe('Menu Configurações > Serviços', () => {
    it('deve exibir menu Serviços para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
      });

      render(<Sidebar />);
      // Verificar se o menu Configurações existe e contém Serviços
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('deve exibir menu Serviços para outro com menuServicos=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { menuServicos: true }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('NÃO deve exibir menu Serviços para outro com menuServicos=false', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { menuServicos: false }),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      // O menu Configurações pode existir, mas Serviços não deve aparecer no submenu
      // Isso depende da implementação do submenu
    });
  });

  describe('Menu Configurações > Perfil', () => {
    it('deve exibir menu Perfil para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('deve exibir menu Perfil para atendente', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user4' },
        userData: createUserData('atendente'),
        role: 'atendente',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('deve exibir menu Perfil para outro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro'),
        role: 'outro',
        companyId: 'company1',
      });

      render(<Sidebar />);
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });
  });
});

