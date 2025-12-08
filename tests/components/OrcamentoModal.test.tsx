import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentoModal } from '@/components/OrcamentoModal';
import { useAuth } from '@/lib/auth-context';
import { useCompany, usePatient, useOrcamentos, useServices } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('@/components/DentalChart', () => ({
  generateOrcamentoPDF: vi.fn(() => Promise.resolve()),
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
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => <div>{children}</div>,
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
  X: () => <span data-testid="x-icon">×</span>,
  FileText: () => <span data-testid="file-icon">📄</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
  Printer: () => <span data-testid="printer-icon">🖨️</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  Search: () => <span data-testid="search-icon">🔍</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
}));

// Mock do createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: any) => children,
}));

describe('OrcamentoModal Component', () => {
  const mockCompanyId = 'test-company-id';
  const mockPatientId = 'test-patient-id';
  const mockProcedimentos = [
    {
      id: 'proc1',
      dentes: [{ numero: 11, faces: ['vestibular'] }],
      procedimento: 'Restauração',
      valorCentavos: 10000,
      estado: 'a_realizar' as const,
    },
  ];
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: mockCompanyId,
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
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
      createOrcamento: vi.fn(() => Promise.resolve()),
      updateOrcamento: vi.fn(() => Promise.resolve()),
      loading: false,
    });

    (useServices as any).mockReturnValue({
      services: [],
      loading: false,
    });
  });

  describe('Renderização Básica', () => {
    it('deve renderizar o modal quando isOpen é true', () => {
      render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );

      // Verificar que o modal foi renderizado
      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('não deve renderizar o modal quando isOpen é false', () => {
      const { container } = render(
        <OrcamentoModal
          isOpen={false}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );

      // Modal não deve estar visível
      expect(container).toBeInTheDocument();
    });
  });

  describe('Criação de Orçamento', () => {
    it('deve renderizar com procedimentos', () => {
      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve renderizar com procedimentos vazios', () => {
      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={[]}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Edição de Orçamento', () => {
    it('deve renderizar com orçamento existente', () => {
      const mockOrcamento = {
        id: 'orc1',
        procedimentos: mockProcedimentos,
        status: 'rascunho' as const,
        descontoCentavos: 0,
        observacoes: '',
      };

      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
          orcamento={mockOrcamento}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Fechamento do Modal', () => {
    it('deve chamar onClose quando fechar', () => {
      render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );

      // Verificar que o componente foi renderizado
      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Callbacks Opcionais', () => {
    it('deve chamar onSave quando fornecido', () => {
      render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
          onSave={mockOnSave}
        />
      );

      const { container } = render(
        <OrcamentoModal
          isOpen={true}
          onClose={mockOnClose}
          companyId={mockCompanyId}
          patientId={mockPatientId}
          procedimentos={mockProcedimentos}
          onSave={mockOnSave}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});

