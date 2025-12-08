/**
 * Tipos compartilhados para os componentes de abas
 */

import type { Company, Patient } from '@/types';
import type { UserWithPermissions } from '@/lib/permissions';

export interface TabProps {
  companyId: string | null | undefined;
  patientId: string | null | undefined;
  patient: Patient | null;
  company?: Company | null;
  user?: UserWithPermissions | null;
  userData?: any;
  themePreference?: string;
  customColor?: string | null;
  isDentist?: boolean;
  hasGradient?: boolean;
  isCustom?: boolean;
  gradientColors?: { start: string; middle: string; end: string } | null;
  isVibrant?: boolean;
  gradientStyleHorizontal?: React.CSSProperties | null;
  singularLabel?: string;
  singularTitle?: string;
  pluralTitle?: string;
  updatePatient?: (data: Partial<Patient>) => Promise<void>;
  setActiveTab?: React.Dispatch<React.SetStateAction<string>>;
}

