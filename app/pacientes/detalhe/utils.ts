/**
 * Funções utilitárias específicas para a página de detalhes do paciente
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const normalizePhone = (value?: string | null) => (value ?? '').replace(/\D/g, '');

export const generatePhoneVariants = (raw: string) => {
  const variants = new Set<string>();
  const digits = normalizePhone(raw);
  if (!digits) return [];
  variants.add(digits);
  if (digits.startsWith('55') && digits.length > 2) {
    const withoutCountry = digits.slice(2);
    variants.add(withoutCountry);
    if (withoutCountry.length >= 10) {
      const area = withoutCountry.slice(0, 2);
      const rest = withoutCountry.slice(2);
      variants.add(area + rest);
      variants.add('55' + area + rest);
      if (rest.length >= 8) {
        const restWithout9 = rest.startsWith('9') ? rest.slice(1) : rest;
        variants.add(area + restWithout9);
        variants.add('55' + area + restWithout9);
        if (!rest.startsWith('9')) {
          variants.add(area + '9' + rest);
          variants.add('55' + area + '9' + rest);
        }
      }
    }
  } else {
    variants.add('55' + digits);
    if (digits.length >= 10) {
      const area = digits.slice(0, 2);
      const rest = digits.slice(2);
      if (rest.startsWith('9')) {
        variants.add('55' + area + rest.slice(1));
        variants.add(area + rest.slice(1));
      } else {
        variants.add('55' + area + '9' + rest);
        variants.add(area + '9' + rest);
      }
    }
  }
  return Array.from(variants).filter((item) => item.length >= 10);
};

export const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const formatDateTime = (date: Date) => {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatEvolutionDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

