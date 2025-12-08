import { vi } from 'vitest';
import { ReactNode } from 'react';

export const mockAuthContext = {
  user: {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  userData: {
    uid: 'test-user-id',
    nome: 'Test User',
    email: 'test@example.com',
    role: 'owner' as const,
    ativo: true,
    companyId: 'test-company-id',
  },
  loading: false,
  role: 'owner',
  professionalId: null,
  companyId: 'test-company-id',
  needsContextSelection: false,
  needsCompanySetup: false,
  contextCount: 1,
  themePreference: 'neutral' as const,
  customColor: null,
  customColor2: null,
  setThemePreference: vi.fn(),
  switchContext: vi.fn(),
};

export const createMockAuthProvider = (overrides = {}) => {
  const mockContext = { ...mockAuthContext, ...overrides };
  
  return ({ children }: { children: ReactNode }) => {
    const { useAuth } = require('@/lib/auth-context');
    vi.mocked(useAuth).mockReturnValue(mockContext);
    return <>{children}</>;
  };
};

