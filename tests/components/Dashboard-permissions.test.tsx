import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import { useAuth } from '@/lib/auth-context';
import type { User, GranularPermissions } from '@/types';

// Mock do useAuth
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock dos hooks do Firestore
vi.mock('@/hooks/useFirestore', () => ({
  useAppointments: () => ({
    appointments: [],
    loading: false,
  }),
  useProfessionals: () => ({
    professionals: [],
    loading: false,
  }),
  useServices: () => ({
    services: [],
    loading: false,
  }),
  usePatients: () => ({
    patients: [],
    loading: false,
  }),
  useCompany: () => ({
    company: null,
    loading: false,
  }),
}));

// Mock do useCustomerLabels
vi.mock('@/hooks/useCustomerLabels', () => ({
  useCustomerLabels: () => ({
    singularTitle: 'Paciente',
    pluralTitle: 'Pacientes',
  }),
}));

describe('Dashboard - Verificação de Permissões Financeiras', () => {
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

  describe('Card Receita do Dia', () => {
    it('deve exibir card Receita do Dia para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
    });

    it('deve exibir card Receita do Dia para admin', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user2' },
        userData: createUserData('admin'),
        role: 'admin',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
    });

    it('deve exibir card Receita do Dia para outro com financeiroAcessoCompleto=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { financeiroAcessoCompleto: true }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
    });

    it('NÃO deve exibir card Receita do Dia para outro sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { financeiroAcessoCompleto: false }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByText('Receita do Dia')).not.toBeInTheDocument();
    });

    it('NÃO deve exibir card Receita do Dia para pro sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user3' },
        userData: createUserData('pro'),
        role: 'pro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByText('Receita do Dia')).not.toBeInTheDocument();
    });

    it('NÃO deve exibir card Receita do Dia para atendente sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user4' },
        userData: createUserData('atendente'),
        role: 'atendente',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByText('Receita do Dia')).not.toBeInTheDocument();
    });
  });

  describe('Card Receita (30 dias)', () => {
    it('deve exibir card Receita (30 dias) para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita (30 dias)')).toBeInTheDocument();
    });

    it('deve exibir card Receita (30 dias) para outro com financeiroAcessoCompleto=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { financeiroAcessoCompleto: true }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita (30 dias)')).toBeInTheDocument();
    });

    it('NÃO deve exibir card Receita (30 dias) para outro sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { financeiroAcessoCompleto: false }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByText('Receita (30 dias)')).not.toBeInTheDocument();
    });
  });

  describe('Botão Mostrar/Ocultar Valores Monetários', () => {
    it('deve exibir botão para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      // Verificar se o botão existe (pode ser pelo título ou aria-label)
      const button = screen.getByTitle(/valores monetários/i);
      expect(button).toBeInTheDocument();
    });

    it('deve exibir botão para outro com financeiroAcessoCompleto=true', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { financeiroAcessoCompleto: true }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      const button = screen.getByTitle(/valores monetários/i);
      expect(button).toBeInTheDocument();
    });

    it('NÃO deve exibir botão para outro sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro', { financeiroAcessoCompleto: false }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByTitle(/valores monetários/i)).not.toBeInTheDocument();
    });

    it('NÃO deve exibir botão para pro sem acesso financeiro', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user3' },
        userData: createUserData('pro'),
        role: 'pro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByTitle(/valores monetários/i)).not.toBeInTheDocument();
    });
  });

  describe('Cenários de Integração', () => {
    it('deve exibir todos os cards financeiros para owner', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user1' },
        userData: createUserData('owner'),
        role: 'owner',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
      expect(screen.getByText('Receita (30 dias)')).toBeInTheDocument();
      expect(screen.getByTitle(/valores monetários/i)).toBeInTheDocument();
    });

    it('deve exibir todos os cards financeiros para outro com acesso completo', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user5' },
        userData: createUserData('outro', { financeiroAcessoCompleto: true }),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
      expect(screen.getByText('Receita (30 dias)')).toBeInTheDocument();
      expect(screen.getByTitle(/valores monetários/i)).toBeInTheDocument();
    });

    it('NÃO deve exibir nenhum card financeiro para outro sem acesso', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user6' },
        userData: createUserData('outro'),
        role: 'outro',
        companyId: 'company1',
        themePreference: 'neutral',
      });

      render(<Dashboard />);
      expect(screen.queryByText('Receita do Dia')).not.toBeInTheDocument();
      expect(screen.queryByText('Receita (30 dias)')).not.toBeInTheDocument();
      expect(screen.queryByTitle(/valores monetários/i)).not.toBeInTheDocument();
    });
  });
});










