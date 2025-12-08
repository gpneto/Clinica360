/**
 * Constantes específicas para a página de detalhes do paciente
 */

import { 
  Stethoscope, 
  ClipboardList, 
  History, 
  Wallet, 
  DollarSign, 
  FileText, 
  FolderOpen, 
  CalendarClock, 
  MessageCircle 
} from 'lucide-react';

export const TAB_ITEMS = [
  { id: 'dados_paciente', label: 'Dados do Paciente', icon: Stethoscope },
  { id: 'ficha_odontologica', label: 'Ficha Clínica Odontológica', icon: Stethoscope, requiresDentist: true as const },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'evolucoes', label: 'Evoluções', icon: History },
  { id: 'orcamentos', label: 'Orçamentos', icon: Wallet, requiresDebitsPermission: true as const }, // Requer permissão de Débitos
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, requiresDebitsPermission: true as const }, // Requer permissão de Débitos
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  { id: 'consultas', label: 'Agendamentos & Histórico', icon: CalendarClock },
  { id: 'interacoes', label: 'Interações', icon: MessageCircle },
] as const;

