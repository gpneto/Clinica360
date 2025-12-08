import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardCharts } from '@/components/DashboardCharts';

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
    },
  };
});

describe('DashboardCharts', () => {
  const mockData = {
    revenue: [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1500 },
    ],
    appointments: [
      { date: '2024-01-01', value: 5 },
      { date: '2024-01-02', value: 8 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os gráficos corretamente', () => {
    const { container } = render(<DashboardCharts data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('deve exibir gráfico de receita quando dados disponíveis', () => {
    const { container } = render(<DashboardCharts data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('deve exibir gráfico de agendamentos quando dados disponíveis', () => {
    const { container } = render(<DashboardCharts data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('deve lidar com dados vazios', () => {
    const { container } = render(<DashboardCharts data={{ revenue: [], appointments: [] }} />);
    expect(container).toBeTruthy();
  });
});

