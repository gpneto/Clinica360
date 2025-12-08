import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlanoPage from '@/app/plano/page';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({
    where: vi.fn(() => ({
      getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    })),
  })),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  getCountFromServer: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
vi.mock('@/hooks/useFirestore', () => ({
  useCompany: vi.fn(() => ({
    company: {
      subscriptionActive: false,
    },
    loading: false,
  })),
  useCompanyInvoices: vi.fn(() => ({
    invoices: [],
    loading: false,
  })),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
}));
vi.mock('@/lib/firebase', () => ({
  db: {},
  functions: {
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  },
}));

// Mock do framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionElement = (tag: string) => {
    return React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, whileInView, initial, animate, exit, viewport, transition, delay, duration, onClick, ...restProps } = props;
      return React.createElement(tag, { ref, onClick, ...restProps }, children);
    });
  };
  
  return {
    motion: {
      div: createMotionElement('div'),
      button: createMotionElement('button'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('PlanoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  it('deve renderizar a página de plano corretamente', () => {
    const { container } = render(<PlanoPage />);
    expect(container).toBeTruthy();
  });
});

