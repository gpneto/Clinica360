'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompanySettings } from '@/hooks/useFirestore';

type CustomerLabelOption = 'paciente' | 'cliente';

const PLURAL_MAP: Record<CustomerLabelOption, string> = {
  paciente: 'pacientes',
  cliente: 'clientes',
};

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function useCustomerLabels() {
  const { companyId } = useAuth();
  const { settings } = useCompanySettings(companyId);

  const option = (settings?.customerLabel as CustomerLabelOption) ?? 'paciente';

  return useMemo(() => {
    const singular = option;
    const plural = PLURAL_MAP[option];

    const singularCapitalized = capitalize(singular);
    const pluralCapitalized = capitalize(plural);

    return {
      option,
      singular,
      plural,
      singularCapitalized,
      pluralCapitalized,
      singularUpper: singular.toUpperCase(),
      pluralUpper: plural.toUpperCase(),
      singularTitle: singularCapitalized,
      pluralTitle: pluralCapitalized,
      possessiveSingular: `${option === 'cliente' ? 'do' : 'do'} ${singular}`,
      possessivePlural: `${option === 'cliente' ? 'dos' : 'dos'} ${plural}`,
    };
  }, [option]);
}

