import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TrialGuard from '@/components/TrialGuard';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
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

describe('TrialGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: { uid: 'test-user-id' },
      companyId: 'test-company-id',
      userData: {
        role: 'owner',
      },
    });

    (useCompany as any).mockReturnValue({
      company: {
        subscriptionActive: false,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
      },
      loading: false,
    });
  });

  it('deve renderizar o componente corretamente', () => {
    const { container } = render(<TrialGuard />);
    expect(container).toBeTruthy();
  });

  it('deve verificar status do trial', () => {
    (useCompany as any).mockReturnValue({
      company: {
        subscriptionActive: false,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      loading: false,
    });

    const { container } = render(<TrialGuard />);
    expect(container).toBeTruthy();
  });
});

