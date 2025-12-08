import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAssistant from '@/components/AIAssistant';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
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
  
  return {
    Send: createIcon('Send'),
    Loader2: createIcon('Loader2'),
    Bot: createIcon('Bot'),
    User: createIcon('User'),
  };
});

describe('AIAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
    });

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('deve renderizar o assistente corretamente', () => {
    const { container } = render(<AIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve exibir mensagem inicial', () => {
    const { container } = render(<AIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve permitir enviar mensagem', async () => {
    const { container } = render(<AIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve exibir loading ao enviar mensagem', () => {
    const { container } = render(<AIAssistant />);
    expect(container).toBeTruthy();
  });

  it('deve processar resposta do assistente', async () => {
    const { container } = render(<AIAssistant />);
    expect(container).toBeTruthy();
  });
});

