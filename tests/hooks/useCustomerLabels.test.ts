import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { useAuth } from '@/lib/auth-context';
import { useCompanySettings } from '@/hooks/useFirestore';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('@/hooks/useFirestore');

describe('Hook - useCustomerLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar labels padrão quando customerLabel é paciente', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'company1',
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        customerLabel: 'paciente',
      },
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useCustomerLabels());

    expect(result.current.singular).toBe('paciente');
    expect(result.current.plural).toBe('pacientes');
    expect(result.current.singularCapitalized).toBe('Paciente');
    expect(result.current.pluralCapitalized).toBe('Pacientes');
  });

  it('deve retornar labels quando customerLabel é cliente', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'company1',
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        customerLabel: 'cliente',
      },
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useCustomerLabels());

    expect(result.current.singular).toBe('cliente');
    expect(result.current.plural).toBe('clientes');
    expect(result.current.singularCapitalized).toBe('Cliente');
    expect(result.current.pluralCapitalized).toBe('Clientes');
  });

  it('deve usar paciente como padrão quando customerLabel não está definido', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'company1',
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {},
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useCustomerLabels());

    expect(result.current.singular).toBe('paciente');
    expect(result.current.plural).toBe('pacientes');
  });

  it('deve retornar todas as variações de labels', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'company1',
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        customerLabel: 'paciente',
      },
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useCustomerLabels());

    expect(result.current.option).toBe('paciente');
    expect(result.current.singular).toBe('paciente');
    expect(result.current.plural).toBe('pacientes');
    expect(result.current.singularCapitalized).toBe('Paciente');
    expect(result.current.pluralCapitalized).toBe('Pacientes');
    expect(result.current.singularUpper).toBe('PACIENTE');
    expect(result.current.pluralUpper).toBe('PACIENTES');
    expect(result.current.singularTitle).toBe('Paciente');
    expect(result.current.pluralTitle).toBe('Pacientes');
    expect(result.current.possessiveSingular).toBe('do paciente');
    expect(result.current.possessivePlural).toBe('dos pacientes');
  });

  it('deve retornar possessive correto para cliente', () => {
    (useAuth as any).mockReturnValue({
      companyId: 'company1',
    });

    (useCompanySettings as any).mockReturnValue({
      settings: {
        customerLabel: 'cliente',
      },
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useCustomerLabels());

    expect(result.current.possessiveSingular).toBe('do cliente');
    expect(result.current.possessivePlural).toBe('dos clientes');
  });
});

