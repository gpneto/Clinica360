import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentosTab } from '@/components/DocumentosTab';
import { useCompany } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/hooks/useFirestore');
vi.mock('@/components/DocumentModal', () => ({
  DocumentModal: ({ isOpen, onClose, type }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="document-modal" data-type={type}>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock('@/components/DocumentPDFGenerator', () => ({
  generateReceitaPDF: vi.fn(() => Promise.resolve()),
  generateAtestadoPDF: vi.fn(() => Promise.resolve()),
}));

// Mock do Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((query, onNext, onError) => {
    onNext({
      forEach: (callback: any) => {
        // Simular documentos vazios
      },
    });
    return vi.fn(); // unsubscribe
  }),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock dos componentes UI
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@/components/ui/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

// Mock dos ícones
vi.mock('lucide-react', () => ({
  FileText: () => <span data-testid="file-icon">📄</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  Pill: () => <span data-testid="pill-icon">💊</span>,
  FileCheck: () => <span data-testid="filecheck-icon">📋</span>,
  Download: () => <span data-testid="download-icon">⬇️</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  Eye: () => <span data-testid="eye-icon">👁️</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
}));

describe('DocumentosTab Component', () => {
  const mockCompanyId = 'test-company-id';
  const mockPatientId = 'test-patient-id';
  const mockCompany = {
    id: mockCompanyId,
    nome: 'Clínica Teste',
  };
  const mockPatient = {
    id: mockPatientId,
    nome: 'Paciente Teste',
  };
  const mockProfessionals = [
    {
      id: 'prof1',
      apelido: 'Dr. João',
      cro: '12345',
      croEstado: 'SP',
      signatureImageUrl: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useCompany as any).mockReturnValue({
      company: mockCompany,
      loading: false,
    });

    // Mock window.confirm
    window.confirm = vi.fn(() => true);
  });

  describe('Renderização Básica', () => {
    it('deve renderizar o componente DocumentosTab', () => {
      const { container } = render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve exibir título de Documentos', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const documentosText = screen.queryAllByText(/Documentos/i);
      expect(documentosText.length).toBeGreaterThan(0);
    });
  });

  describe('Botões de Ação', () => {
    it('deve renderizar botão de Nova Receita', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      expect(screen.getByText(/Nova Receita/i)).toBeInTheDocument();
    });

    it('deve renderizar botão de Novo Atestado', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      expect(screen.getByText(/Novo Atestado/i)).toBeInTheDocument();
    });

    it('deve abrir modal de receita quando clicar em Nova Receita', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const novaReceitaButton = screen.getByText(/Nova Receita/i);
      fireEvent.click(novaReceitaButton);

      expect(screen.getByTestId('document-modal')).toBeInTheDocument();
      expect(screen.getByTestId('document-modal')).toHaveAttribute('data-type', 'receita');
    });

    it('deve abrir modal de atestado quando clicar em Novo Atestado', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const novoAtestadoButton = screen.getByText(/Novo Atestado/i);
      fireEvent.click(novoAtestadoButton);

      expect(screen.getByTestId('document-modal')).toBeInTheDocument();
      expect(screen.getByTestId('document-modal')).toHaveAttribute('data-type', 'atestado');
    });
  });

  describe('Lista de Documentos', () => {
    it('deve exibir seção de Receitas', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const receitasText = screen.queryAllByText(/Receitas/i);
      expect(receitasText.length).toBeGreaterThan(0);
    });

    it('deve exibir seção de Atestados', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const atestadosText = screen.queryAllByText(/Atestados/i);
      expect(atestadosText.length).toBeGreaterThan(0);
    });

    it('deve exibir mensagem quando não há receitas', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const receitasText = screen.queryAllByText(/Nenhuma receita cadastrada/i);
      expect(receitasText.length).toBeGreaterThan(0);
    });

    it('deve exibir mensagem quando não há atestados', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const atestadosText = screen.queryAllByText(/Nenhum atestado cadastrado/i);
      expect(atestadosText.length).toBeGreaterThan(0);
    });
  });

  describe('Fechamento do Modal', () => {
    it('deve fechar modal quando clicar em Close', () => {
      render(
        <DocumentosTab
          companyId={mockCompanyId}
          patientId={mockPatientId}
          company={mockCompany}
          patient={mockPatient}
          professionals={mockProfessionals}
        />
      );

      const novaReceitaButton = screen.getByText(/Nova Receita/i);
      fireEvent.click(novaReceitaButton);

      expect(screen.getByTestId('document-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('document-modal')).not.toBeInTheDocument();
    });
  });
});

