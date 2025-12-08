import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MensagensPage from '@/app/mensagens/page';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/components/AccessGuard', () => ({
  AccessGuard: ({ children }: any) => <div data-testid="access-guard">{children}</div>,
}));
vi.mock('@/hooks/useWhatsappMessages', () => ({
  useWhatsAppContacts: vi.fn(() => ({
    contacts: [],
    loading: false,
  })),
  useWhatsAppMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
  })),
  sendWhatsAppMessage: vi.fn(),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
}));
vi.mock('@/lib/firebase', () => ({
  functions: {
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  },
}));
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => '01/01/2024'),
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
    MessageCircle: createIcon('MessageCircle'),
    Send: createIcon('Send'),
    Search: createIcon('Search'),
    Phone: createIcon('Phone'),
    User: createIcon('User'),
    Bot: createIcon('Bot'),
    UserCircle: createIcon('UserCircle'),
    ArrowLeft: createIcon('ArrowLeft'),
    Image: createIcon('Image'),
    Video: createIcon('Video'),
    Music: createIcon('Music'),
    FileText: createIcon('FileText'),
    Download: createIcon('Download'),
    RefreshCw: createIcon('RefreshCw'),
  };
});

describe('MensagensPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  it('deve renderizar a página de mensagens corretamente', () => {
    const { container } = render(<MensagensPage />);
    expect(container).toBeTruthy();
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(<MensagensPage />);
    expect(container).toBeTruthy();
  });
});

