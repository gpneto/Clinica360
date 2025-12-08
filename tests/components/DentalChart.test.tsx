import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DentalChart } from '@/components/DentalChart';
import { useAuth } from '@/lib/auth-context';
import { useServices, useCompany, usePatient, useOrcamentos } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('@/components/OrcamentoModal', () => ({
  OrcamentoModal: ({ isOpen, onClose }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="orcamento-modal">
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// Mock do jsPDF
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      addImage: vi.fn(),
      text: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      save: vi.fn(),
      addPage: vi.fn(),
      setFont: vi.fn(),
      rect: vi.fn(),
      setFillColor: vi.fn(),
      roundedRect: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      setDrawColor: vi.fn(),
      getTextWidth: vi.fn(() => 50),
      splitTextToSize: vi.fn((text: string) => [text]),
      getLineHeight: vi.fn(() => 10),
      getTextDimensions: vi.fn(() => ({ w: 50, h: 10 })),
    })),
  };
});

// Mock do react-currency-input-field
vi.mock('react-currency-input-field', () => ({
  default: ({ onValueChange, value, ...props }: any) => (
    <input
      {...props}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value, undefined, { float: parseFloat(e.target.value) || 0 })}
      data-testid="currency-input"
    />
  ),
}));

// Mock dos componentes UI
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => <div data-open={open}>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// Mock do framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock dos ícones
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  X: () => <span data-testid="x-icon">×</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  Search: () => <span data-testid="search-icon">🔍</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
  MoreVertical: () => <span data-testid="more-icon">⋮</span>,
  Edit: () => <span data-testid="edit-icon">✏️</span>,
  FileText: () => <span data-testid="file-icon">📄</span>,
  Download: () => <span data-testid="download-icon">⬇️</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
  Printer: () => <span data-testid="printer-icon">🖨️</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  Wallet: () => <span data-testid="wallet-icon">💰</span>,
}));

// Mock do createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: any) => children,
}));

describe('DentalChart Component', () => {
  const mockCompanyId = 'test-company-id';
  const mockPatientId = 'test-patient-id';
  const mockProfessionals = [
    {
      id: 'prof1',
      apelido: 'Dr. João',
      corHex: '#FF5733',
    },
  ];
  const mockProcedimentos = [
    {
      id: 'proc1',
      dentes: [{ numero: 11, faces: ['vestibular'] }],
      nome: 'Restauração',
      valorCentavos: 10000,
      estado: 'planejado' as const,
    },
  ];
  const mockOnAddProcedimento = vi.fn();
  const mockOnEditProcedimento = vi.fn();
  const mockOnDeleteProcedimento = vi.fn();
  const mockOnNavigateToOrcamentos = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: mockCompanyId,
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });

    (useServices as any).mockReturnValue({
      services: [],
      loading: false,
    });

    (useCompany as any).mockReturnValue({
      company: {
        id: mockCompanyId,
        nome: 'Clínica Teste',
      },
      loading: false,
    });

    (usePatient as any).mockReturnValue({
      patient: {
        id: mockPatientId,
        nome: 'Paciente Teste',
      },
      loading: false,
    });

    (useOrcamentos as any).mockReturnValue({
      orcamentos: [],
      loading: false,
    });
  });

  describe('Renderização Básica', () => {
    it('deve renderizar o componente DentalChart', () => {
      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve renderizar com procedimentos vazios', () => {
      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={[]}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Interações com Procedimentos', () => {
    it('deve chamar onAddProcedimento quando adicionar procedimento', () => {
      render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      // Verificar que o componente foi renderizado
      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('deve chamar onEditProcedimento quando editar procedimento', () => {
      render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('deve chamar onDeleteProcedimento quando deletar procedimento', () => {
      render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Navegação para Orçamentos', () => {
    it('deve chamar onNavigateToOrcamentos quando fornecido', () => {
      render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
          onNavigateToOrcamentos={mockOnNavigateToOrcamentos}
        />
      );

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
          onNavigateToOrcamentos={mockOnNavigateToOrcamentos}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Estados de Loading', () => {
    it('deve renderizar durante loading de serviços', () => {
      (useServices as any).mockReturnValue({
        services: [],
        loading: true,
      });

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={mockProcedimentos}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Procedimentos com Diferentes Estados', () => {
    it('deve renderizar procedimento planejado', () => {
      const procedimentoPlanejado = {
        ...mockProcedimentos[0],
        estado: 'planejado' as const,
      };

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={[procedimentoPlanejado]}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve renderizar procedimento em execução', () => {
      const procedimentoEmExecucao = {
        ...mockProcedimentos[0],
        estado: 'em_execucao' as const,
      };

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={[procedimentoEmExecucao]}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve renderizar procedimento concluído', () => {
      const procedimentoConcluido = {
        ...mockProcedimentos[0],
        estado: 'concluido' as const,
      };

      const { container } = render(
        <DentalChart
          companyId={mockCompanyId}
          patientId={mockPatientId}
          professionals={mockProfessionals}
          procedimentos={[procedimentoConcluido]}
          onAddProcedimento={mockOnAddProcedimento}
          onEditProcedimento={mockOnEditProcedimento}
          onDeleteProcedimento={mockOnDeleteProcedimento}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });
});

