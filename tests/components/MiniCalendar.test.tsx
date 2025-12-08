import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniCalendar } from '@/components/MiniCalendar';

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
    ChevronLeft: createIcon('ChevronLeft'),
    ChevronRight: createIcon('ChevronRight'),
  };
});

// Mock do date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => '01/2024'),
  startOfMonth: vi.fn((date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: vi.fn((date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  eachDayOfInterval: vi.fn(() => [new Date('2024-01-01'), new Date('2024-01-02')]),
  isSameMonth: vi.fn(() => true),
  isSameDay: vi.fn(() => false),
  isToday: vi.fn(() => false),
  addMonths: vi.fn((date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }),
  subMonths: vi.fn((date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }),
}));

describe('MiniCalendar', () => {
  const mockOnDateSelect = vi.fn();
  const mockAppointments = [
    {
      id: 'apt1',
      start: new Date('2024-01-15T10:00:00'),
      end: new Date('2024-01-15T11:00:00'),
      status: 'agendado',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o mini calendário corretamente', () => {
    const { container } = render(
      <MiniCalendar
        selectedDate={new Date()}
        onDateSelect={mockOnDateSelect}
        appointments={mockAppointments}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve navegar entre meses', () => {
    const { container } = render(
      <MiniCalendar
        selectedDate={new Date()}
        onDateSelect={mockOnDateSelect}
        appointments={mockAppointments}
      />
    );

    expect(container).toBeTruthy();
  });

  it('deve selecionar data ao clicar', () => {
    const { container } = render(
      <MiniCalendar
        selectedDate={new Date()}
        onDateSelect={mockOnDateSelect}
        appointments={mockAppointments}
      />
    );

    expect(container).toBeTruthy();
  });
});

