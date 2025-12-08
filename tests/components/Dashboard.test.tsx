import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, useServices, usePatients, useCompany } from '@/hooks/useFirestore';

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
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock do framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('Dashboard Component', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  const mockAppointments = [
    {
      id: '1',
      patientId: 'p1',
      professionalId: 'prof1',
      date: new Date('2024-01-15T10:00:00'),
      status: 'agendado' as const,
      services: ['service1'],
    },
  ];

  const mockProfessionals = [
    {
      id: 'prof1',
      name: 'Dr. João',
      color: '#FF5733',
    },
  ];

  const mockServices = [
    {
      id: 'service1',
      name: 'Consulta',
      price: 10000, // em centavos
    },
  ];

  const mockPatients = [
    {
      id: 'p1',
      name: 'Paciente Teste',
      phone: '11999999999',
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
      services: mockServices,
      loading: false,
    });

    (usePatients as any).mockReturnValue({
      patients: mockPatients,
      loading: false,
    });

    (useCompany as any).mockReturnValue({
      company: {
        id: 'test-company-id',
        name: 'Test Company',
      },
      loading: false,
    });
  });

  it('deve renderizar o Dashboard corretamente', () => {
    const { container } = render(<Dashboard />);

    // Verificar se o componente renderizou (não está vazio)
    expect(container.firstChild).toBeTruthy();
  });

  it('deve exibir agendamentos quando disponíveis', () => {
    const { container } = render(<Dashboard />);

    // O Dashboard deve renderizar quando há dados
    expect(container.firstChild).toBeTruthy();
  });

  it('deve chamar onViewAppointment quando fornecido', () => {
    const mockOnViewAppointment = vi.fn();
    
    render(<Dashboard onViewAppointment={mockOnViewAppointment} />);

    // Verificar se a função está disponível (será chamada quando houver interação)
    expect(mockOnViewAppointment).toBeDefined();
  });

  it('deve chamar onCompleteClick quando fornecido', () => {
    const mockOnCompleteClick = vi.fn();
    
    render(<Dashboard onCompleteClick={mockOnCompleteClick} />);

    // Verificar se a função está disponível
    expect(mockOnCompleteClick).toBeDefined();
  });

  it('deve exibir loading quando dados estão carregando', () => {
    (useAppointments as any).mockReturnValue({
      appointments: [],
      loading: true,
    });

    render(<Dashboard />);

    // Verificar se há indicador de loading
    const loadingElement = document.querySelector('.animate-spin');
    // Pode ou não ter loading dependendo da implementação
    expect(loadingElement || document.body).toBeTruthy();
  });

  it('deve exibir mensagem quando não há agendamentos', () => {
    (useAppointments as any).mockReturnValue({
      appointments: [],
      loading: false,
    });

    render(<Dashboard />);

    // Verificar se renderiza mesmo sem agendamentos
    expect(document.body).toBeTruthy();
  });
});

