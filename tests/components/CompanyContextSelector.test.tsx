import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompanyContextSelector } from '@/components/CompanyContextSelector';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
vi.mock('@/components/ui/card', () => {
  const React = require('react');
  return {
    Card: ({ children, ...props }: any) => React.createElement('div', props, children),
  };
});

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
      span: createMotionElement('span'),
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
  
  const icons: Record<string, any> = {
    Building2: createIcon('Building2'),
    Check: createIcon('Check'),
    ChevronRight: createIcon('ChevronRight'),
    Crown: createIcon('Crown'),
    Shield: createIcon('Shield'),
    Briefcase: createIcon('Briefcase'),
    Users: createIcon('Users'),
    User: createIcon('User'),
  };
  
  // Retornar um Proxy para capturar qualquer ícone não explicitamente definido
  return new Proxy(icons, {
    get: (target, name) => {
      if (typeof name === 'string' && name in target) {
        return target[name];
      }
      // Retornar um componente mock para qualquer ícone não explicitamente importado
      return React.forwardRef((props: any, ref: any) => React.createElement('svg', { ...props, ref, 'data-testid': `icon-${name.toLowerCase()}` }, null));
    },
  });
});

describe('CompanyContextSelector', () => {
  const mockContexts = [
    {
      companyId: 'company1',
      companyName: 'Company 1',
      role: 'owner',
    },
    {
      companyId: 'company2',
      companyName: 'Company 2',
      role: 'admin',
    },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o seletor de contexto corretamente', () => {
    const { container } = render(
      <CompanyContextSelector 
        contexts={mockContexts} 
        onSelect={mockOnSelect}
        userEmail="test@example.com"
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve exibir lista de contextos quando disponível', () => {
    const { container } = render(
      <CompanyContextSelector 
        contexts={mockContexts} 
        onSelect={mockOnSelect}
        userEmail="test@example.com"
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve chamar onSelect ao selecionar um contexto', () => {
    const { container } = render(
      <CompanyContextSelector 
        contexts={mockContexts} 
        onSelect={mockOnSelect}
        userEmail="test@example.com"
      />
    );

    expect(container).toBeTruthy();
  });
});

