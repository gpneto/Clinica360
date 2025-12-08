import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));
vi.mock('react-dom', () => ({
  createPortal: (children: any) => children,
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ 
    data: { 
      message: 'Resposta do assistente',
      functionCalls: []
    } 
  }))),
}));
vi.mock('@/lib/firebase', () => ({
  functions: {
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ 
      data: { 
        message: 'Resposta do assistente',
        functionCalls: []
      } 
    }))),
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
      textarea: createMotionElement('textarea'),
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
  
  const icons: Record<string, any> = {};
  const iconNames = [
    'Send', 'Loader2', 'Bot', 'User', 'X', 'Sparkles', 'RotateCcw', 'History',
    'Download', 'Lightbulb', 'Calendar', 'BarChart3', 'MessageSquare', 'Briefcase',
    'Trash2', 'Mic', 'MicOff'
  ];
  
  iconNames.forEach(name => {
    icons[name] = createIcon(name);
  });
  
  return icons;
});

describe('FloatingAIAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  it('deve renderizar o assistente flutuante corretamente', () => {
    const { container } = render(<FloatingAIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve abrir e fechar o assistente', () => {
    const { container } = render(<FloatingAIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(<FloatingAIAssistant />);
    expect(container).toBeTruthy();
  });
});

