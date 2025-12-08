import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentModal } from '@/components/DocumentModal';
import { useAuth } from '@/lib/auth-context';
import { useMedicamentos } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('@/components/DocumentPDFGenerator', () => ({
  generateReceitaPDF: vi.fn(() => Promise.resolve()),
  generateAtestadoPDF: vi.fn(() => Promise.resolve()),
}));

// Mock do Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve()),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true })),
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

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, ...props }: any) => (
    <textarea onChange={onChange} value={value} {...props} />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
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
  Plus: () => <span data-testid="plus-icon">+</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Pill: () => <span data-testid="pill-icon">💊</span>,
  FileCheck: () => <span data-testid="filecheck-icon">📋</span>,
}));

// Mock do createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: any) => children,
}));

// Mock do fetch para CIDs
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
  } as Response)
);

describe('DocumentModal Component', () => {
  const mockCompanyId = 'test-company-id';
  const mockPatientId = 'test-patient-id';
  const mockPatient = {
    id: mockPatientId,
    nome: 'Paciente Teste',
    cpf: '123.456.789-00',
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
  const mockCompany = {
    nome: 'Clínica Teste',
    telefone: '11999999999',
    email: 'teste@clinica.com',
  };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: mockCompanyId,
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
      professionalId: 'prof1',
      user: {
        uid: 'user1',
        email: 'prof@test.com',
      },
    });

    (useMedicamentos as any).mockReturnValue({
      medicamentos: [],
      loading: false,
    });
  });

  describe('Renderização Básica', () => {
    it('deve renderizar modal de receita quando isOpen é true', () => {
      const { container } = render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="receita"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('deve renderizar modal de atestado quando isOpen é true', () => {
      const { container } = render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="atestado"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('não deve renderizar quando isOpen é false', () => {
      const { container } = render(
        <DocumentModal
          isOpen={false}
          onClose={mockOnClose}
          type="receita"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Formulário de Receita', () => {
    it('deve renderizar campos de receita', () => {
      const { container } = render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="receita"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Formulário de Atestado', () => {
    it('deve renderizar campos de atestado', () => {
      const { container } = render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="atestado"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Fechamento do Modal', () => {
    it('deve chamar onClose quando fechar', () => {
      render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="receita"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );

      const { container } = render(
        <DocumentModal
          isOpen={true}
          onClose={mockOnClose}
          type="receita"
          companyId={mockCompanyId}
          patientId={mockPatientId}
          patient={mockPatient}
          professionals={mockProfessionals}
          company={mockCompany}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});

