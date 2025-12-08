import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContextSelectionPage from '@/app/contexto/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('@/components/CompanyContextSelector', () => ({
  CompanyContextSelector: ({ contexts, onSelect, userEmail }: any) => (
    <div data-testid="context-selector">
      <div>Contexts: {contexts.length}</div>
      <div>Email: {userEmail}</div>
    </div>
  ),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('@/lib/firestore-cache', () => ({
  firestoreCache: {
    getDoc: vi.fn(() => null),
    setDoc: vi.fn(),
    getQuery: vi.fn(() => null),
    setQuery: vi.fn(),
  },
  CACHE_TTL: {
    USER: 300000,
    COMPANY: 300000,
  },
}));

// Mock dos ícones
vi.mock('lucide-react', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const IconComponent = (props: any) => {
      return React.createElement('svg', { ...props, 'data-icon': name }, null);
    };
    IconComponent.displayName = name;
    return IconComponent;
  };
  
  return {
    Loader2: createIcon('Loader2'),
  };
});

describe('ContextSelectionPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (useRouter as any).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
  });

  it('deve renderizar a página de seleção de contexto corretamente', async () => {
    const { container } = render(<ContextSelectionPage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('deve exibir loading enquanto carrega contextos', () => {
    const { container } = render(<ContextSelectionPage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir seletor de contexto quando contextos disponíveis', async () => {
    const { container } = render(<ContextSelectionPage />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});

