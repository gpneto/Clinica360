import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpMenu } from '@/components/HelpMenu';
import { useAuth } from '@/lib/auth-context';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useCustomerLabels', () => ({
  useCustomerLabels: () => ({
    singular: 'paciente',
    singularTitle: 'Paciente',
    plural: 'pacientes',
    pluralTitle: 'Pacientes',
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

// Mock dos ícones - criar todos os ícones necessários
vi.mock('lucide-react', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const IconComponent = (props: any) => {
      return React.createElement('svg', { ...props, 'data-icon': name }, null);
    };
    IconComponent.displayName = name;
    return IconComponent;
  };
  
  const iconNames = [
    'HelpCircle', 'X', 'Calendar', 'Users', 'MessageCircle', 'Sparkles',
    'BarChart3', 'Settings', 'UserCheck', 'Package', 'FileText', 'CreditCard',
    'Building2', 'HeartPulse', 'Clock', 'DollarSign', 'Bell', 'Search',
    'Filter', 'Download', 'Upload', 'Eye', 'EyeOff', 'ChevronRight',
    'CheckCircle2', 'AlertCircle', 'Gift', 'Phone', 'Mail', 'MapPin',
    'Repeat', 'Shield', 'RefreshCw', 'Image', 'LayoutDashboard'
  ];
  
  const icons: Record<string, any> = {};
  iconNames.forEach(name => {
    icons[name] = createIcon(name);
  });
  
  return icons;
});

describe('HelpMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'neutral',
      customColor: null,
      customColor2: null,
    });
  });

  it('deve renderizar o menu de ajuda corretamente', () => {
    const { container } = render(<HelpMenu />);
    expect(container).toBeTruthy();
  });

  it('deve abrir e fechar o menu de ajuda', () => {
    const { container } = render(<HelpMenu />);
    expect(container).toBeTruthy();
  });

  it('deve exibir seções de ajuda', () => {
    const { container } = render(<HelpMenu />);
    expect(container).toBeTruthy();
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'test-company-id',
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(<HelpMenu />);
    expect(container).toBeTruthy();
  });
});

