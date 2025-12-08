'use client';

import { useState, useMemo, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addDays, subDays, startOfDay, endOfDay, getHours, getMinutes, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AccessGuard } from '@/components/AccessGuard';
import { useAuth } from '@/lib/auth-context';
import { canViewAllAgendas, canEditAppointments } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, Filter, Users, Clock, DollarSign, Grid3X3, List, BarChart3, Settings, Eye, EyeOff, X, ChevronLeft, ChevronRight, Table, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileAppointmentForm } from '@/components/MobileAppointmentForm';
import { CalendarEvent } from '@/components/CalendarEvent';
import { AppointmentList } from '@/components/AppointmentList';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { CompleteAppointmentModal } from '@/components/CompleteAppointmentModal';
import { ConfirmAppointmentModal } from '@/components/ConfirmAppointmentModal';
import { useAppointments, useProfessionals, useServices, usePatients, useCompany } from '@/hooks/useFirestore';
import { Appointment } from '@/types';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { LoadingSpinner } from '@/components/ui/loading';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn, getGradientColors, getGradientStyle, fetchHolidays, type Holiday } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { ProfessionalCalendar } from '@/components/ProfessionalCalendar';
import { ReturnSuggestions } from '@/components/ReturnSuggestions';
import { showSuccess, showError } from '@/components/ui/toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VIEW_STORAGE_KEY = 'smartdoctor:agenda:lastView';
type View = 'month' | 'week' | 'day';
const ALLOWED_VIEWS: View[] = ['month', 'week', 'day'];

type EventStyle = CSSProperties & Record<string, string>;

const normalizeHexColor = (color?: string | null): string | null => {
  if (!color) return null;
  let hex = color.trim();
  if (!hex) return null;
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (hex.length === 9) {
    hex = hex.slice(0, 7);
  }
  if (hex.length !== 7) {
    return null;
  }
  return hex.toLowerCase();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const int = parseInt(value, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const hexToRgba = (hex: string, alpha = 1): string | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
};

const getReadableTextColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1f2937';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#1f2937' : '#ffffff';
};

const createGradient = (hex: string, startAlpha = 0.95, endAlpha = 0.82): string => {
  const start = hexToRgba(hex, startAlpha) ?? hex;
  const end = hexToRgba(hex, endAlpha) ?? hex;
  return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
};

const getStoredView = (): View | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY) as View | null;
  return storedView && ALLOWED_VIEWS.includes(storedView) ? storedView : null;
};

const storeView = (nextView: View) => {
  if (typeof window === 'undefined' || !ALLOWED_VIEWS.includes(nextView)) {
    return;
  }
  window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
};

export default function AgendaPage() {
  const { role, professionalId, companyId, themePreference, customColor, customColor2, userData, user } = useAuth();
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const customerLabels = useCustomerLabels();
  const singularTitle = customerLabels.singularTitle;
  const [view, setView] = useState<View>(() => getStoredView() ?? 'month');
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [startedFromButton, setStartedFromButton] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingAppointment, setConfirmingAppointment] = useState<Appointment | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const [enviarNotificacaoDelete, setEnviarNotificacaoDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [filterPriceRange, setFilterPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 10000,
  });
  const [showReturnSuggestions, setShowReturnSuggestions] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [companySettings, setCompanySettings] = useState<{ estado?: string } | null>(null);

  // Carregar configurações da empresa
  useEffect(() => {
    if (!companyId) return;
    
    const loadCompanySettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, `companies/${companyId}/settings`, 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setCompanySettings({ estado: data.estado || '' });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações da empresa:', error);
      }
    };
    
    loadCompanySettings();
  }, [companyId]);

  // Buscar feriados quando necessário
  useEffect(() => {
    if (!showHolidays || !companySettings?.estado) {
      setHolidays([]);
      return;
    }

    const loadHolidays = async () => {
      const year = date.getFullYear();
      try {
        const fetchedHolidays = await fetchHolidays(year, companySettings.estado);
        setHolidays(fetchedHolidays);
      } catch (error) {
        console.error('Erro ao buscar feriados:', error);
        setHolidays([]);
      }
    };

    loadHolidays();
  }, [showHolidays, companySettings?.estado, date]);

  const monthRange = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const start = startOfDay(subDays(monthStart, 7));
    const end = endOfDay(addDays(monthEnd, 7));
    return { start, end };
  }, [date]);

  const {
    appointments,
    loading: appointmentsLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deleteRecurringAppointments,
  } = useAppointments(companyId, undefined, monthRange);
  const { professionals, loading: professionalsLoading } = useProfessionals(companyId);
  const { services } = useServices(companyId);
  const { patients } = usePatients(companyId);
  const { company } = useCompany(companyId);

  const professionalColorMap = useMemo(() => {
    const map = new Map<string, string>();
    professionals.forEach((professional) => {
      const normalized = normalizeHexColor(professional.corHex);
      if (normalized) {
        map.set(professional.id, normalized);
      }
    });
    return map;
  }, [professionals]);

  const availableProfessionals = useMemo(() => {
    if (role === 'pro' && professionalId) {
      return professionals.filter(p => p.id === professionalId);
    }
    return professionals;
  }, [professionals, role, professionalId]);

  const filteredEvents = useMemo(() => {
    let filtered = appointments;

    // Filtrar por profissional se necessário
    if (role === 'pro' && professionalId) {
      filtered = filtered.filter((appointment) =>
        appointment.professionalId === professionalId ||
        (appointment.isBlock && (appointment.blockScope === 'all' || appointment.professionalId === '__all__'))
      );
    }

    if (selectedProfessionals.length > 0) {
      filtered = filtered.filter((appointment) => {
        if (appointment.isBlock && (appointment.blockScope === 'all' || appointment.professionalId === '__all__')) {
          return true;
        }
        return selectedProfessionals.includes(appointment.professionalId);
      });
    }
    
    // Remover duplicatas de bloqueios para todos os profissionais
    const seenBlockIds = new Set<string>();
    filtered = filtered.filter((appointment) => {
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      if (isBlock && (appointment.blockScope === 'all' || appointment.professionalId === '__all__')) {
        if (seenBlockIds.has(appointment.id)) {
          return false;
        }
        seenBlockIds.add(appointment.id);
      }
      return true;
    });

    if (selectedServices.length > 0) {
      filtered = filtered.filter(appointment => {
        if (appointment.isBlock) return true;
        // Verificar se algum dos serviços do agendamento está na lista selecionada
        const appointmentServiceIds = appointment.serviceIds && appointment.serviceIds.length > 0
          ? appointment.serviceIds
          : [appointment.serviceId];
        return appointmentServiceIds.some(serviceId => selectedServices.includes(serviceId));
      });
    }

    if (selectedPatients.length > 0) {
      filtered = filtered.filter(appointment =>
        appointment.isBlock ? true : selectedPatients.includes(appointment.clientId)
      );
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter(appointment => {
        const matchesExplicitStatus = selectedStatus.includes(appointment.status);
        const matchesNoShow =
          selectedStatus.includes('no_show') &&
          appointment.status === 'concluido' &&
          appointment.clientePresente === false;
        return matchesExplicitStatus || matchesNoShow;
      });
    }

    if (filterDateRange.start) {
      const start = new Date(filterDateRange.start);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(appointment => appointment.inicio >= start);
    }

    if (filterDateRange.end) {
      const end = new Date(filterDateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(appointment => appointment.inicio <= end);
    }

    if (filterPriceRange.min > 0 || filterPriceRange.max < 10000) {
      filtered = filtered.filter(appointment => {
        const price = (appointment.precoCentavos || 0) / 100;
        return price >= filterPriceRange.min && price <= filterPriceRange.max;
      });
    }

    // Para modo lista e tabela, filtrar baseado na visualização selecionada (day, week, month)
    if (layoutMode === 'list' || layoutMode === 'table') {
      let rangeStart: Date;
      let rangeEnd: Date;
      
      const currentDate = new Date(date);
      
      if (view === 'day') {
        // Visualização de dia: mostrar apenas o dia selecionado
        rangeStart = startOfDay(currentDate);
        rangeEnd = endOfDay(currentDate);
      } else if (view === 'week') {
        // Visualização de semana: mostrar a semana do dia selecionado
        rangeStart = startOfDay(startOfWeek(currentDate, { locale: ptBR }));
        rangeEnd = endOfDay(endOfWeek(currentDate, { locale: ptBR }));
      } else {
        // Visualização de mês: mostrar o mês inteiro do dia selecionado
        rangeStart = startOfDay(startOfMonth(currentDate));
        rangeEnd = endOfDay(endOfMonth(currentDate));
      }
      
      filtered = filtered.filter(appointment => {
        // Garantir que appointment.inicio seja um Date
        const appointmentStart = appointment.inicio instanceof Date 
          ? appointment.inicio 
          : new Date(appointment.inicio);
        
        // Verificar se o início do agendamento está dentro do range
        // Um agendamento é incluído se seu início estiver dentro do range
        return appointmentStart >= rangeStart && appointmentStart <= rangeEnd;
      });
      
      // Ordenar por data/hora
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.inicio instanceof Date ? a.inicio : new Date(a.inicio);
        const dateB = b.inicio instanceof Date ? b.inicio : new Date(b.inicio);
        return dateA.getTime() - dateB.getTime();
      });
    }

    const events: {
      id: string;
      title: string;
      start: Date;
      end: Date;
      resourceId: string;
      appointment: Appointment;
      className: string;
      color: string;
      style: EventStyle;
      professionalColor?: string;
      professionalGradient?: string;
      professionalTextColor?: string;
      professionalBoxShadow?: string;
    }[] = [];

    const blockColor = '#7c3aed';

    const createEvent = (
      appointment: Appointment,
      resourceId: string,
      title: string,
      statusClass: string,
      statusColor: string,
      suffix = ''
    ) => {
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      const isNoShow =
        !isBlock &&
        (appointment.clientePresente === false ||
          appointment.status === 'no_show');
      const fallbackColor = normalizeHexColor(statusColor) ?? '#2563eb';
      const professionalColor =
        (!isBlock && (professionalColorMap.get(resourceId) ?? professionalColorMap.get(appointment.professionalId))) ||
        fallbackColor;
      const baseColor = normalizeHexColor(professionalColor) ?? fallbackColor;
      const borderOutline = hexToRgba(baseColor, hasGradient ? 0.35 : 0.22) ?? `${baseColor}33`;
      const borderLeftColor = baseColor;
      const computedTextColor = getReadableTextColor(baseColor);
      const textColor = isBlock
        ? (hasGradient ? '#ffffff' : '#1f2937')
        : computedTextColor;
      const backgroundGradient = createGradient(baseColor, hasGradient ? 0.94 : 0.9, hasGradient ? 0.82 : 0.78);
      const backgroundHoverGradient = createGradient(baseColor, hasGradient ? 0.98 : 0.94, hasGradient ? 0.86 : 0.82);
      const boxShadowColor = hexToRgba(baseColor, hasGradient ? 0.10 : 0.16) ?? 'rgba(15, 23, 42, 0.14)';
      const boxShadowHoverColor = hexToRgba(baseColor, hasGradient ? 0.34 : 0.24) ?? 'rgba(15, 23, 42, 0.18)';

      const eventStyle: EventStyle = {
        borderRadius: '16px',
      };

      if (isBlock) {
        const blockGradient = hasGradient
          ? `linear-gradient(135deg, ${statusColor}ee, ${statusColor}cc)`
          : '#f4f4ff';
        const blockHover = hasGradient
          ? `linear-gradient(135deg, ${statusColor}fa, ${statusColor}dd)`
          : '#ebe9ff';

        eventStyle['--event-bg'] = blockGradient;
        eventStyle['--event-bg-hover'] = blockHover;
        eventStyle['--event-text'] = hasGradient ? '#ffffff' : '#1f2937';
        eventStyle['--event-border'] = `${statusColor}33`;
        eventStyle['--event-border-left'] = statusColor;
        eventStyle['--event-shadow'] = '0 14px 24px rgba(124, 58, 237, 0.15)';
        eventStyle['--event-shadow-hover'] = '0 16px 28px rgba(124, 58, 237, 0.22)';
      } else {
        eventStyle['--event-bg'] = backgroundGradient;
        eventStyle['--event-bg-solid'] = baseColor;
        eventStyle['--event-bg-hover'] = backgroundHoverGradient;
        eventStyle['--event-text'] = textColor;
        eventStyle['--event-border'] = borderOutline;
        eventStyle['--event-border-left'] = borderLeftColor;
        eventStyle['--event-shadow'] = `0 18px 32px ${boxShadowColor}`;
        eventStyle['--event-shadow-hover'] = `0 22px 38px ${boxShadowHoverColor}`;
        eventStyle['--event-indicator'] = baseColor;
      }

      events.push({
        id: suffix ? `${appointment.id}-${suffix}` : appointment.id,
        title,
        start: appointment.inicio,
        end: appointment.fim,
        resourceId,
        appointment,
        className: statusClass,
        color: statusColor,
        style: eventStyle,
        professionalColor: isBlock ? undefined : baseColor,
        professionalGradient: isBlock ? undefined : backgroundGradient,
        professionalTextColor: isBlock ? undefined : textColor,
        professionalBoxShadow: isBlock ? undefined : `0 18px 32px ${boxShadowColor}`,
      });
    };

    filtered.forEach((appointment) => {
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      const patient = patients.find(c => c.id === appointment.clientId);
      // Buscar o primeiro serviço (para compatibilidade)
      const appointmentServiceId = appointment.serviceIds && appointment.serviceIds.length > 0
        ? appointment.serviceIds[0]
        : appointment.serviceId;
      const service = services.find(s => s.id === appointmentServiceId);

      let statusClass = '';
      let statusColor = '#2563eb';

      if (isBlock) {
        statusClass = 'status-block';
        statusColor = blockColor;
      } else if (appointment.clientePresente === false || appointment.status === 'no_show') {
        statusClass = 'status-no-show';
        statusColor = '#ef4444';
      } else if (appointment.status === 'concluido') {
        statusClass = 'status-concluido';
        statusColor = '#16a34a';
      } else if (appointment.status === 'pendente') {
        statusClass = 'status-pendente';
        statusColor = '#f59e0b';
      } else if (appointment.status === 'cancelado') {
        statusClass = 'status-cancelado';
        statusColor = '#6b7280';
      } else {
        statusClass = 'status-agendado';
      }

      const title = isBlock
        ? (appointment.blockDescription || 'Bloqueio de agenda')
        : (patient?.nome || singularTitle);

      if (isBlock) {
        if (appointment.blockScope === 'all' || appointment.professionalId === '__all__') {
          // Para bloqueios de todos os profissionais, criar apenas um evento
          createEvent(appointment, '__all__', title, statusClass, statusColor);
        } else {
          // Para bloqueios de um profissional específico, criar evento para aquele profissional
          createEvent(appointment, appointment.professionalId, title, statusClass, statusColor);
        }
      } else {
        // Para agendamentos normais
        createEvent(appointment, appointment.professionalId, title, statusClass, statusColor);
      }
    });

    return events;
  }, [
    appointments,
    view,
    date,
    layoutMode,
    role,
    professionalId,
    patients,
    services,
    professionals,
    professionalColorMap,
    hasGradient,
    selectedProfessionals,
    selectedServices,
    selectedPatients,
    selectedStatus,
    filterDateRange,
    filterPriceRange,
    singularTitle,
  ]);

  // Preparar dados para o React Lightweight Calendar
  // Formato: { events: [...] }
  const calendarEvents = useMemo(() => {
    // Remover duplicatas de bloqueios para todos os profissionais
    // Usar chave única: appointment.id + data para identificar duplicatas
    const seenBlockKeys = new Set<string>();
    const uniqueEvents = filteredEvents.filter((event) => {
      const appointment = event.appointment;
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      
      // Se é um bloqueio para todos os profissionais
      if (isBlock && (appointment.blockScope === 'all' || appointment.professionalId === '__all__')) {
        // Criar chave única baseada no appointment.id + data
        const eventDate = format(event.start, 'yyyy-MM-dd');
        const blockKey = `${appointment.id}-${eventDate}`;
        
        // Se já vimos este bloqueio nesta data, não incluir novamente
        if (seenBlockKeys.has(blockKey)) {
          return false;
        }
        seenBlockKeys.add(blockKey);
      }
      return true;
    });
    
    const mappedEvents = uniqueEvents.map((event, index) => {
      const appointment = event.appointment;
      const patient = patients.find(c => c.id === appointment.clientId);
      const professional = professionals.find(p => p.id === appointment.professionalId);
      // Buscar o primeiro serviço (para compatibilidade)
      const appointmentServiceId = appointment.serviceIds && appointment.serviceIds.length > 0
        ? appointment.serviceIds[0]
        : appointment.serviceId;
      const service = services.find(s => s.id === appointmentServiceId);
      const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
      
      // Encontrar o profissional para obter a cor
      let eventColor = '#3B82F6'; // Cor padrão
      if (appointment.professionalId && appointment.professionalId !== '__all__') {
        eventColor = professional?.corHex || '#3B82F6';
      } else if (isBlock) {
        // Cor para bloqueios (cinza)
        eventColor = '#6B7280';
      }
      
      // Formatar data/hora
      const formatDateTime = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      };
      
      // Mapear status para português
      const statusMap: Record<string, string> = {
        'agendado': 'Agendado',
        'confirmado': 'Confirmado',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado',
        'no_show': 'Não Compareceu',
        'pendente': 'Pendente',
        'bloqueio': 'Bloqueio'
      };
      
      // Mapear forma de pagamento para português
      const paymentMap: Record<string, string> = {
        'dinheiro': 'Dinheiro',
        'cartao_debito': 'Cartão de Débito',
        'cartao_credito': 'Cartão de Crédito',
        'pix': 'PIX',
        'outros': 'Outros'
      };
      
      // Criar descrição completa com todas as informações
      const descriptionParts = [];
      
      // Informações do Cliente
      if (patient) {
        descriptionParts.push(`👤 CLIENTE`);
        descriptionParts.push(`Nome: ${patient.nome}`);
        if (patient.telefoneE164) descriptionParts.push(`Telefone: ${patient.telefoneE164}`);
        if (patient.email) descriptionParts.push(`Email: ${patient.email}`);
        descriptionParts.push('');
      }
      
      // Informações do Profissional
      if (professional) {
        descriptionParts.push(`👨‍⚕️ PROFISSIONAL`);
        descriptionParts.push(`Nome: ${professional.apelido}`);
        descriptionParts.push('');
      }
      
      // Informações do Serviço
      if (service) {
        descriptionParts.push(`💼 SERVIÇO`);
        descriptionParts.push(`Nome: ${service.nome}`);
        if (service.duracaoMin) {
          descriptionParts.push(`Duração: ${service.duracaoMin} minutos`);
        }
        descriptionParts.push('');
      }
      
      // Informações do Agendamento
      descriptionParts.push(`📅 AGENDAMENTO`);
      descriptionParts.push(`Início: ${formatDateTime(appointment.inicio)}`);
      descriptionParts.push(`Fim: ${formatDateTime(appointment.fim)}`);
      
      if (appointment.status) {
        descriptionParts.push(`Status: ${statusMap[appointment.status] || appointment.status}`);
      }
      
      // Valor
      const valor = appointment.precoCentavos ? (appointment.precoCentavos / 100) : 0;
      if (valor > 0) {
        descriptionParts.push(`Valor: R$ ${valor.toFixed(2)}`);
      }
      
      // Valor pago
      if (appointment.valorPagoCentavos) {
        const valorPago = appointment.valorPagoCentavos / 100;
        descriptionParts.push(`Valor Pago: R$ ${valorPago.toFixed(2)}`);
      }
      
      // Forma de pagamento
      if (appointment.formaPagamento) {
        descriptionParts.push(`Forma de Pagamento: ${paymentMap[appointment.formaPagamento] || appointment.formaPagamento}`);
      }
      
      // Comissão
      if (appointment.comissaoPercent) {
        descriptionParts.push(`Comissão: ${appointment.comissaoPercent}%`);
      }
      
      // Cliente presente
      if (appointment.clientePresente !== undefined) {
        descriptionParts.push(`Cliente Presente: ${appointment.clientePresente ? 'Sim' : 'Não'}`);
      }
      
      // Bloqueio
      if (appointment.isBlock) {
        descriptionParts.push('');
        descriptionParts.push(`🚫 BLOQUEIO`);
        if (appointment.blockDescription) {
          descriptionParts.push(`Descrição: ${appointment.blockDescription}`);
        }
        if (appointment.blockScope) {
          descriptionParts.push(`Escopo: ${appointment.blockScope === 'all' ? 'Todos os profissionais' : 'Profissional específico'}`);
        }
      }
      
      // Observações
      if (appointment.observacoes) {
        descriptionParts.push('');
        descriptionParts.push(`📝 OBSERVAÇÕES`);
        descriptionParts.push(appointment.observacoes);
      }
      
      const fullDescription = descriptionParts.join('\n');
      
      // Garantir que as datas estejam no formato correto para o Bryntum Calendar
      // O Bryntum espera objetos Date válidos
      const normalizeDate = (date: Date | string): Date => {
        if (date instanceof Date) {
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            console.warn('Data inválida encontrada:', date);
            return new Date();
          }
          // Criar uma nova instância para evitar problemas de referência
          return new Date(date.getTime());
        }
        if (typeof date === 'string') {
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            console.warn('Erro ao fazer parse da data:', date);
            return new Date();
          }
          return parsedDate;
        }
        console.warn('Tipo de data desconhecido:', typeof date, date);
        return new Date();
      };
      
      // Formato para react-lightweight-calendar
      // O componente espera campos startDate e endDate no formato ISO string
          const statusConfig: Record<string, string> = {
            'agendado': '#3b82f6',
            'confirmado': '#10b981',
            'concluido': '#16a34a',
            'cancelado': '#6b7280',
            'no_show': '#ef4444',
            'pendente': '#f59e0b',
            'bloqueio': '#8b5cf6'
          };
          const status = appointment.status || 'agendado';
          const isNoShow = !appointment.isBlock && (appointment.clientePresente === false || status === 'no_show');
      const statusColor = isNoShow ? '#ef4444' : (statusConfig[status] || '#3b82f6');
      
      // Garantir que as datas sejam objetos Date válidos
      // Quando um Date vem do Firestore via toDate(), ele já está no timezone local
      // Se vem como string ISO, pode estar sendo interpretado como UTC
      // Normalizar para garantir que seja tratado como horário local
      const normalizeToLocalDate = (date: Date | string): Date => {
        if (date instanceof Date) {
          // Se já é um Date, verificar se foi criado a partir de uma string ISO
          // Se sim, pode estar em UTC, então converter para local
          // Criar um novo Date usando os métodos get* que retornam valores locais
          // Isso garante que o horário exibido seja o horário local correto
          const localDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
          );
          return localDate;
        }
        // Se é string ISO, pode estar em UTC
        // Criar Date e normalizar para local usando get* methods
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Data inválida encontrada:', date);
          return new Date();
        }
        // Normalizar para timezone local usando get* methods que retornam valores locais
        const localDate = new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          parsedDate.getHours(),
          parsedDate.getMinutes(),
          parsedDate.getSeconds(),
          parsedDate.getMilliseconds()
        );
        return localDate;
      };
      
      const startDate = normalizeToLocalDate(event.start);
      const endDate = normalizeToLocalDate(event.end);

      return {
        id: event.id,
        startDate: startDate,
        endDate: endDate,
        name: isBlock 
          ? (appointment.blockDescription || 'Bloqueio de agenda')
          : (patient?.nome || singularTitle),
        appointment: appointment,
        professionalColor: eventColor,
        status: status,
        statusColor: statusColor,
        professional: professional,
        service: service,
        patient: patient,
        color: eventColor, // Cor do profissional para o calendário
      };
    });

    // Criar eventos de aniversário baseados nas datas de nascimento dos pacientes
    const birthdayEvents: typeof mappedEvents = [];
    
    // Obter o ano da data que está sendo visualizada no calendário
    const viewYear = date.getFullYear();
    const viewMonth = date.getMonth();
    
    // Calcular o range completo que o calendário mostra (incluindo semanas adjacentes)
    // Isso garante que aniversários de meses adjacentes também apareçam
    // O range deve corresponder ao range usado para buscar os appointments
    const calendarMonthStart = startOfMonth(date);
    const calendarMonthEnd = endOfMonth(date);
    // Adicionar 7 dias antes e depois, como no monthRange
    const calendarRangeStart = startOfDay(subDays(calendarMonthStart, 7));
    const calendarRangeEnd = endOfDay(addDays(calendarMonthEnd, 7));
    
    // Normalizar as datas para comparação (sem horas)
    const rangeStartNormalized = startOfDay(calendarRangeStart);
    const rangeEndNormalized = endOfDay(calendarRangeEnd);
    
    let pacientesComDataNascimento = 0;
    let aniversariosCriados = 0;
    let aniversariosForaDoRange = 0;
    let errosNaConversao = 0;
    
    patients.forEach((patient, index) => {
      if (patient.dataNascimento) {
        pacientesComDataNascimento++;
        
        let birthDate: Date;
        try {
          if (patient.dataNascimento instanceof Date) {
            birthDate = patient.dataNascimento;
          } else if (patient.dataNascimento && typeof patient.dataNascimento === 'object' && 'toDate' in patient.dataNascimento) {
            // Firestore Timestamp
            birthDate = (patient.dataNascimento as any).toDate();
          } else {
            birthDate = new Date(patient.dataNascimento);
          }
          
          if (!isNaN(birthDate.getTime())) {
            // Quando a data vem do Firestore, ela está em UTC
            // Precisamos usar getUTCDate() e getUTCMonth() para pegar o dia e mês corretos
            // Isso garante que mesmo que a data tenha sido salva com timezone diferente,
            // vamos pegar o dia e mês corretos baseados em UTC
            const birthMonth = birthDate.getUTCMonth();
            const birthDay = birthDate.getUTCDate();
            const birthYear = birthDate.getUTCFullYear();
            
            // Criar evento de aniversário para o ano da data visualizada
            // O aniversário sempre será no mesmo dia e mês, mas no ano visualizado
            const birthdayDate = new Date(viewYear, birthMonth, birthDay);
            const birthdayDateNormalized = startOfDay(birthdayDate);
            
            // Verificar se o aniversário está dentro do range do calendário (incluindo semanas adjacentes)
            // Usar comparação normalizada (apenas datas, sem horas)
            if (birthdayDateNormalized >= rangeStartNormalized && birthdayDateNormalized <= rangeEndNormalized) {
              // Calcular idade baseada no ano visualizado
              const age = viewYear - birthDate.getFullYear();
              
              aniversariosCriados++;
              
              // Criar evento de dia todo (00:00 até 23:59)
              const startDate = startOfDay(birthdayDate);
              const endDate = new Date(birthdayDate);
              endDate.setHours(23, 59, 59, 999);
              
              const birthdayEvent = {
                id: `birthday-${patient.id}-${viewYear}`,
                startDate: startDate,
                endDate: endDate,
                name: `🎂 Aniversário de ${patient.nome}${age > 0 ? ` (${age} anos)` : ''}`,
                appointment: {
                  id: `birthday-${patient.id}-${viewYear}`,
                  companyId: patient.companyId,
                  clientId: patient.id,
                  professionalId: '__all__',
                  serviceId: '',
                  inicio: startDate,
                  fim: endDate,
                  precoCentavos: 0,
                  comissaoPercent: 0,
                  status: 'agendado' as const,
                  isBlock: false,
                  enviarNotificacao: false,
                  createdByUid: patient.ownerUid,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as Appointment,
                professionalColor: '#FF6B9D', // Cor rosa para aniversários
                status: 'agendado' as const,
                statusColor: '#FF6B9D',
                professional: undefined,
                service: undefined,
                patient: patient,
                color: '#FF6B9D',
              };
              
              birthdayEvents.push(birthdayEvent);
            } else {
              aniversariosForaDoRange++;
            }
          } else {
            errosNaConversao++;
          }
        } catch (error) {
          console.error(`[Aniversários] ❌ Erro ao processar ${patient.nome}:`, error);
          errosNaConversao++;
        }
      }
    });
    
    // Criar eventos de feriados
    const holidayEvents: typeof mappedEvents = [];
    
    if (showHolidays && holidays.length > 0) {
      holidays.forEach((holiday) => {
        // Criar data no timezone local para evitar problemas de conversão UTC
        // holiday.date está no formato "YYYY-MM-DD"
        const [year, month, day] = holiday.date.split('-').map(Number);
        const holidayDate = new Date(year, month - 1, day); // month é 0-indexed no JavaScript
        const holidayDateNormalized = startOfDay(holidayDate);
        
        // Verificar se o feriado está dentro do range do calendário
        if (holidayDateNormalized >= rangeStartNormalized && holidayDateNormalized <= rangeEndNormalized) {
          const startDate = startOfDay(holidayDate);
          const endDate = new Date(holidayDate);
          endDate.setHours(23, 59, 59, 999);
          
          const holidayEvent = {
            id: `holiday-${holiday.date}`,
            startDate: startDate,
            endDate: endDate,
            name: `🎉 ${holiday.name}${holiday.type === 'state' ? ' (Estadual)' : ' (Nacional)'}`,
            appointment: {
              id: `holiday-${holiday.date}`,
              companyId: companyId || '',
              clientId: '',
              professionalId: '__all__',
              serviceId: '',
              inicio: startDate,
              fim: endDate,
              precoCentavos: 0,
              comissaoPercent: 0,
              status: 'agendado' as const,
              isBlock: false,
              enviarNotificacao: false,
              createdByUid: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Appointment,
            professionalColor: holiday.type === 'national' ? '#FF6B6B' : '#4ECDC4', // Vermelho para nacional, verde-água para estadual
            status: 'agendado' as const,
            statusColor: holiday.type === 'national' ? '#FF6B6B' : '#4ECDC4',
            professional: undefined,
            service: undefined,
            patient: undefined,
            color: holiday.type === 'national' ? '#FF6B6B' : '#4ECDC4',
          };
          
          holidayEvents.push(holidayEvent);
        }
      });
    }

    // Combinar eventos de agendamento com eventos de aniversário e feriados
    const allEvents = [...mappedEvents, ...birthdayEvents, ...holidayEvents];
    
    return allEvents;
  }, [filteredEvents, patients, professionals, services, singularTitle, date, showHolidays, holidays, companyId]);

  // Refs para os containers do calendário (mobile e desktop)
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const calendarContainerDesktopRef = useRef<HTMLDivElement>(null);

  const handleViewChange = useCallback((nextView: View) => {
    setView(prev => {
      if (prev !== nextView) {
        storeView(nextView);
      }
      return nextView;
    });
  }, []);

  // Criar objeto user completo para verificação de permissões
  const userWithPermissions = userData && user ? {
    uid: user.uid,
    role: userData.role,
    nome: userData.nome || user.displayName || '',
    email: userData.email || user.email || '',
    ativo: userData.ativo,
    companyId: userData.companyId || companyId || '',
    professionalId: userData.professionalId,
    permissions: userData.permissions,
  } : null;

  const handleEventEdit = useCallback((appointment: Appointment) => {
    // Verificar se o usuário pode editar agendamentos
    if (!canEditAppointments(userWithPermissions as any)) {
      showError('Você não tem permissão para editar agendamentos');
      return;
    }
    
    setEditingAppointment(appointment);
    setSelectedDate(appointment.inicio);
    setStartedFromButton(false); // Editando, não iniciado pelo botão
    setIsDrawerOpen(true);
  }, [userWithPermissions]);

  const handleEventReschedule = useCallback((event: any) => {
    const appointment = event.appointment || event;
    // Verificar se o usuário pode editar agendamentos
    if (!canEditAppointments(userWithPermissions as any)) {
      showError('Você não tem permissão para reagendar agendamentos');
      return;
    }
    
    // Não permitir reagendar bloqueios
    if (appointment.isBlock) {
      showError('Não é possível reagendar bloqueios');
      return;
    }
    
    setEditingAppointment(appointment);
    setSelectedDate(appointment.inicio);
    setStartedFromButton(false);
    setRescheduleMode(true); // Flag para indicar modo reagendar
    setIsDrawerOpen(true);
  }, [userWithPermissions]);
  
  // Refs para evitar recriação do calendário quando essas dependências mudarem
  const appointmentsRef = useRef(appointments);
  const handleEventEditRef = useRef(handleEventEdit);
  
  // Atualizar refs quando mudarem
  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);
  
  useEffect(() => {
    handleEventEditRef.current = handleEventEdit;
  }, [handleEventEdit]);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingAppointment(null);
    setSelectedDate(null);
    setStartedFromButton(false);
    setRescheduleMode(false);
  };

  const handleEventDelete = (appointment: Appointment) => {
    const canNotify = Boolean(appointment.clientId) && !appointment.isBlock;
    setDeletingAppointment(appointment);
    setEnviarNotificacaoDelete(canNotify);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingAppointment(null);
  };

  const confirmDelete = async () => {
    if (!deletingAppointment || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deletingAppointment.recurrenceGroupId) {
        await deleteRecurringAppointments(
          deletingAppointment.id,
          enviarNotificacaoDelete
        );
      } else {
        await deleteAppointment(
          deletingAppointment.id,
          enviarNotificacaoDelete
        );
      }
      setEnviarNotificacaoDelete(true);
      closeDeleteModal();
    } catch (error: any) {
      console.error('Erro ao cancelar agendamento:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao excluir agendamento';
      console.error('Detalhes do erro:', {
        message: errorMessage,
        code: error?.code,
        stack: error?.stack
      });
      alert(`Erro ao excluir agendamento: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEventComplete = async (
    appointmentId: string,
    data: { valorPagoCentavos: number; formaPagamento: string; clientePresente: boolean }
  ) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        console.error('Agendamento não encontrado');
        return;
      }

      await updateAppointment(appointmentId, {
        status: 'concluido' as const,
        valorPagoCentavos: data.valorPagoCentavos,
        formaPagamento: data.formaPagamento as any,
        clientePresente: data.clientePresente,
      });
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error);
    }
  };

  const handleCompleteClick = (appointment: Appointment) => {
    setCompletingAppointment(appointment);
    setShowCompleteModal(true);
  };

  const handleSlotSelect = useCallback((selectedDate: Date | string) => {
    // Verificar se o usuário pode criar agendamentos
    if (!canEditAppointments(userWithPermissions as any)) {
      showError('Você não tem permissão para criar agendamentos');
      return;
    }
    
    const dateObj = typeof selectedDate === 'string' ? new Date(selectedDate) : selectedDate;
    setSelectedDate(dateObj);
    setStartedFromButton(false); // Iniciado pelo calendário, não pelo botão
    setIsDrawerOpen(true);
  }, [userWithPermissions]);

  const handleEventSelect = (event: any) => {
    if (event?.appointment) {
      handleEventEdit(event.appointment);
    } else if (event?.event?.appointment) {
      handleEventEdit(event.event.appointment);
    }
  };

  const handleDateChange = (newDate: Date | string) => {
    const dateObj = typeof newDate === 'string' ? new Date(newDate) : newDate;
    setDate(dateObj);
  };

  // Handler para clique em data no calendário
  const handleCalendarDateClick = useCallback((clickedDate: Date | string) => {
    handleSlotSelect(clickedDate);
  }, [handleSlotSelect]);

  // Handler para clique em evento no calendário
  const handleCalendarEventClick = useCallback((event: any) => {
    if (event?.appointment) {
      handleEventEdit(event.appointment);
    }
  }, [handleEventEdit]);

  // Handler para completar evento
  const handleCalendarEventComplete = useCallback((event: any) => {
    if (event?.appointment) {
      handleCompleteClick(event.appointment);
    }
  }, [handleCompleteClick]);

  // Handler para confirmar evento
  const handleCalendarEventConfirm = useCallback((event: any) => {
    if (event?.appointment) {
      setConfirmingAppointment(event.appointment);
      setShowConfirmModal(true);
    }
  }, []);

  // Handler para executar a confirmação após o modal
  const handleConfirmAppointment = useCallback(async (appointmentId: string) => {
    try {
      await updateAppointment(appointmentId, {
        status: 'confirmado' as const,
      });
      showSuccess('Agendamento confirmado com sucesso!');
      setShowConfirmModal(false);
      setConfirmingAppointment(null);
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      showError('Erro ao confirmar agendamento. Tente novamente.');
    }
  }, [updateAppointment]);

  // Handler para deletar evento
  const handleCalendarEventDelete = useCallback((event: any) => {
    if (event?.appointment) {
      handleEventDelete(event.appointment);
    }
  }, [handleEventDelete]);

  // FAB para mobile na visão Semana: abre novo agendamento sem long-press
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const handleMobileQuickAdd = useCallback(() => {
    if (!canEditAppointments(userWithPermissions as any)) {
      showError('Você não tem permissão para criar agendamentos');
      return;
    }
    const base = new Date(date);
    const now = new Date();
    const weekStart = startOfWeek(base, { locale: ptBR, weekStartsOn: 0 });
    const weekEnd = endOfWeek(base, { locale: ptBR, weekStartsOn: 0 });
    const target = new Date(base);
    if (now >= weekStart && now <= weekEnd) {
      target.setHours(now.getHours(), now.getMinutes(), 0, 0);
      target.setFullYear(base.getFullYear(), base.getMonth(), base.getDate());
    } else {
      const d = startOfDay(base);
      target.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      target.setHours(9, 0, 0, 0);
    }
    handleSlotSelect(target);
  }, [date, userWithPermissions, handleSlotSelect]);

  if (appointmentsLoading || professionalsLoading) {
    return (
      <AccessGuard 
        allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}
        checkPermission={(user) => {
          // Para role 'outro', verificar se tem permissão de visualização ou edição
          if (user?.role === 'outro') {
            return canViewAllAgendas(user) || canEditAppointments(user);
          }
          return true;
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </AccessGuard>
    );
  }

      return (
        <AccessGuard 
        allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}
        checkPermission={(user) => {
          // Para role 'outro', verificar se tem permissão de visualização ou edição
          if (user?.role === 'outro') {
            return canViewAllAgendas(user) || canEditAppointments(user);
          }
          return true;
        }}
      >
          <TooltipProvider>
        {/* Mobile Layout - Full Screen */}
        <div 
          className={cn('flex flex-col sm:hidden app-page')} 
          style={{ 
            minHeight: '100vh',
            height: '100vh',
            overflowY: 'auto', 
            overflowX: 'hidden', 
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            maxWidth: '100vw',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Mobile Header */}
          <div
            className={cn(
              'sticky top-0 z-10 pr-2 pl-16 sm:pl-20 lg:pl-2 landscape:pr-1 landscape:pl-16 lg:landscape:pl-2 py-2.5 landscape:py-0.5 shadow-sm border-b backdrop-blur-md flex-shrink-0',
              hasGradient ? 'bg-white/60 border-white/20' : 'bg-white border-slate-200'
            )}
            style={{
              maxWidth: '100vw',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 landscape:hidden">Agenda</p>
                <h1 className="text-lg font-semibold text-slate-900 landscape:text-xs landscape:leading-tight landscape:truncate">
                  {company?.nome || 'Visão geral'}
                </h1>
              </div>
              <div className="flex items-center gap-1 landscape:gap-0.5 flex-shrink-0 flex-wrap">
                {/* View Controls Mobile */}
                <div
                  className={cn(
                    'inline-flex items-center gap-0.5 landscape:gap-0 rounded-full border px-1.5 landscape:px-1 py-1 landscape:py-0.5 backdrop-blur',
                    hasGradient ? 'border-white/30 bg-white/40' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <Button
                    variant={view === 'day' ? 'default' : 'ghost'}
                    onClick={() => handleViewChange('day')}
                    size="sm"
                    className={cn(
                      'h-7 landscape:h-6 px-2 landscape:px-1.5 text-xs landscape:text-[10px] font-medium',
                      view === 'day'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                    )}
                    style={view === 'day' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    Dia
                  </Button>
                  <Button
                    variant={view === 'week' ? 'default' : 'ghost'}
                    onClick={() => handleViewChange('week')}
                    size="sm"
                    className={cn(
                      'h-7 landscape:h-6 px-2 landscape:px-1.5 text-xs landscape:text-[10px] font-medium',
                      view === 'week'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                    )}
                    style={view === 'week' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    Sem
                  </Button>
                  <Button
                    variant={view === 'month' ? 'default' : 'ghost'}
                    onClick={() => handleViewChange('month')}
                    size="sm"
                    className={cn(
                      'h-7 landscape:h-6 px-2 landscape:px-1.5 text-xs landscape:text-[10px] font-medium',
                      view === 'month'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                    )}
                    style={view === 'month' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    Mês
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    if (!canEditAppointments(userWithPermissions as any)) {
                      showError('Você não tem permissão para criar agendamentos');
                      return;
                    }
                    setStartedFromButton(true);
                    setSelectedDate(null);
                    setIsDrawerOpen(true);
                  }}
                  className={cn(
                    'text-white h-7 landscape:h-6 px-2 landscape:px-1.5 text-xs landscape:text-[10px]',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? ''
                        : 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                      : 'bg-slate-900 hover:bg-slate-800'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  size="sm"
                >
                  <Plus className="w-3 h-3 landscape:w-2.5 landscape:h-2.5 mr-1 landscape:mr-0.5" />
                  <span className="landscape:hidden">Novo</span>
                </Button>
                <div
                  className={cn(
                    'flex items-center gap-0.5 landscape:gap-0 rounded-full px-1.5 landscape:px-1 py-1 landscape:py-0.5 border backdrop-blur',
                    hasGradient ? 'bg-white/40 border-white/30' : 'bg-slate-100 border-slate-200'
                  )}
                >
                  <Button
                    variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                    onClick={() => setLayoutMode('grid')}
                    size="icon"
                    className={cn(
                      'h-8 w-8 landscape:h-6 landscape:w-6',
                      layoutMode === 'grid'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                    )}
                    style={layoutMode === 'grid' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={layoutMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setLayoutMode('list')}
                    size="icon"
                    className={cn(
                      'h-8 w-8 landscape:h-6 landscape:w-6',
                      layoutMode === 'list'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                    )}
                    style={layoutMode === 'list' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={layoutMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setLayoutMode('table')}
                    size="icon"
                    className={cn(
                      'h-8 w-8 landscape:h-6 landscape:w-6',
                      layoutMode === 'table'
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                    )}
                    style={layoutMode === 'table' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <Table className="w-4 h-4" />
                  </Button>
                </div>
                {/* Checkbox Feriados Mobile */}
                <label className="flex items-center gap-1.5 landscape:gap-1 rounded-full px-2 landscape:px-1.5 py-1 landscape:py-0.5 border backdrop-blur text-xs landscape:text-[10px] cursor-pointer hover:border-primary transition"
                  style={hasGradient ? { borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.4)' } : {}}
                >
                  <input
                    type="checkbox"
                    checked={showHolidays}
                    onChange={(e) => setShowHolidays(e.target.checked)}
                    disabled={!companySettings?.estado}
                    className="h-3 w-3 landscape:h-2.5 landscape:w-2.5 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={cn('font-medium landscape:hidden', !companySettings?.estado ? 'text-muted-foreground' : 'text-foreground')}>
                    Feriados
                  </span>
                </label>
                {/* Botão Sugerir Retornos Mobile */}
                <Button
                  variant={showReturnSuggestions ? 'default' : 'outline'}
                  onClick={() => setShowReturnSuggestions(!showReturnSuggestions)}
                  size="sm"
                  className={cn(
                    'h-7 landscape:h-6 px-2 landscape:px-1.5 text-xs landscape:text-[10px]',
                    showReturnSuggestions
                      ? hasGradient
                        ? isCustom && gradientStyleHorizontal
                          ? 'text-white'
                          : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                      : ''
                  )}
                  style={showReturnSuggestions && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  <Users className="w-3 h-3 landscape:w-2.5 landscape:h-2.5 mr-1 landscape:mr-0.5" />
                  <span className="landscape:hidden">Retornos</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div 
            className="flex flex-col px-2 landscape:px-1 py-1 landscape:py-0 pb-4 w-full flex-1" 
            style={{ 
              minHeight: 0, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              maxWidth: '100vw',
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 'min(0.5rem, 2vw)',
              paddingRight: 'min(0.5rem, 2vw)'
            }}
          >
            {/* Sugestões de Retorno Mobile */}
            <AnimatePresence>
              {showReturnSuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 flex-shrink-0 w-full"
                  style={{ overflow: 'hidden' }}
                >
                  <ReturnSuggestions isOpen={showReturnSuggestions} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {layoutMode === 'list' ? (
              <AppointmentList 
                appointments={filteredEvents.map(e => e.appointment)}
                professionals={professionals}
                services={services}
                patients={patients}
                onEdit={handleEventEdit}
                onDelete={handleEventDelete}
              />
            ) : layoutMode === 'table' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn(
                  'rounded-xl border overflow-hidden',
                  hasGradient 
                    ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl' 
                    : 'bg-white border-slate-200 shadow-lg'
                )}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={cn(
                        'border-b',
                        hasGradient ? 'bg-white/50 border-white/25' : 'bg-slate-50 border-slate-200'
                      )}>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Data/Hora
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Paciente
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Profissional
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Serviço
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Status
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Valor
                        </th>
                        <th className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className={cn(
                      hasGradient ? 'bg-white/30' : 'bg-white divide-y divide-slate-200'
                    )}>
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className={cn(
                              hasGradient ? 'text-slate-500' : 'text-gray-500'
                            )}>
                              Nenhum agendamento encontrado
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map((event, index) => {
                          const appointment = event.appointment;
                          const patient = patients.find(p => p.id === appointment.clientId);
                          const professional = professionals.find(p => p.id === appointment.professionalId);
                          const service = services.find(s => s.id === appointment.serviceId);
                          const statusColors: Record<string, string> = {
                            agendado: 'bg-blue-100 text-blue-700',
                            confirmado: 'bg-green-100 text-green-700',
                            concluido: 'bg-purple-100 text-purple-700',
                            cancelado: 'bg-red-100 text-red-700',
                            no_show: 'bg-orange-100 text-orange-700',
                            pendente: 'bg-yellow-100 text-yellow-700',
                            bloqueio: 'bg-gray-100 text-gray-700'
                          };
                          const statusLabels: Record<string, string> = {
                            agendado: 'Agendado',
                            confirmado: 'Confirmado',
                            concluido: 'Concluído',
                            cancelado: 'Cancelado',
                            no_show: 'Não compareceu',
                            pendente: 'Pendente',
                            bloqueio: 'Bloqueio'
                          };
                          return (
                            <motion.tr
                              key={appointment.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                'transition-colors',
                                hasGradient
                                  ? 'hover:bg-white/50 border-b border-white/25'
                                  : 'hover:bg-slate-50 border-b border-slate-200'
                              )}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm',
                                  hasGradient ? 'text-slate-700' : 'text-gray-700'
                                )}>
                                  <div className="font-medium">{format(appointment.inicio, 'dd/MM/yyyy', { locale: ptBR })}</div>
                                  <div className="text-xs text-slate-500">
                                    {format(appointment.inicio, 'HH:mm')} - {format(appointment.fim, 'HH:mm')}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm font-medium',
                                  hasGradient ? 'text-slate-900' : 'text-gray-900'
                                )}>
                                  {patient?.nome || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm',
                                  hasGradient ? 'text-slate-700' : 'text-gray-700'
                                )}>
                                  {professional?.apelido || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm',
                                  hasGradient ? 'text-slate-700' : 'text-gray-700'
                                )}>
                                  {service?.nome || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColors[appointment.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {statusLabels[appointment.status] || appointment.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm font-semibold',
                                  hasGradient ? 'text-green-600' : 'text-green-600'
                                )}>
                                  R$ {(appointment.precoCentavos / 100).toFixed(2).replace('.', ',')}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEventEdit(appointment)}
                                    className={cn(
                                      hasGradient
                                        ? 'border-white/30 text-slate-700 hover:bg-white/40'
                                        : isNeutral
                                        ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                        : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                                    )}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEventDelete(appointment)}
                                    className={cn(
                                      hasGradient
                                        ? 'border-white/30 text-rose-600 hover:bg-white/40'
                                        : isNeutral
                                        ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                                        : 'hover:bg-red-50 text-red-600 border-red-200 hover:border-red-400'
                                    )}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <div 
                className="relative calendar-container w-full flex-1"
                style={{ position: 'relative', zIndex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                ref={(el) => {
                  // Container ref
                }}
              >
                <div 
                  className="w-full flex-1" 
                  style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
                  ref={(el) => {
                    if (el && calendarContainerRef) {
                      (calendarContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                    }
                  }}
                >
                  <ProfessionalCalendar
                    events={calendarEvents}
                    currentDate={date}
                    view={view}
                    onDateClick={(date) => handleCalendarDateClick(date)}
                    onDateChange={(date) => handleDateChange(date)}
                    onEventClick={handleCalendarEventClick}
                    onEventComplete={handleCalendarEventComplete}
                    onEventConfirm={handleCalendarEventConfirm}
                    onEventReschedule={handleEventReschedule}
                    onEventDelete={handleCalendarEventDelete}
                    onViewChange={(newView) => handleViewChange(newView)}
                  />
                </div>
              </div>
                        )}
                      </div>
                    </div>

        {/* Desktop Layout */}
        <div className={cn('hidden sm:flex app-page p-0 sm:p-2 md:p-3 min-h-screen flex-col')}>
          <div className="flex flex-col gap-2 md:gap-3">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl p-3 sm:p-4 transition-all flex-shrink-0 pl-16 sm:pl-20 lg:pl-3',
                hasGradient
                  ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                  : 'app-card border border-slate-200 shadow-sm'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-lg',
                      isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-900'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-medium uppercase tracking-wide',
                        hasGradient ? 'text-slate-500/80' : 'text-slate-400'
                      )}
                    >
                      Agenda
                    </p>
                    <h1
                      className={cn(
                        'text-lg sm:text-xl md:text-2xl font-semibold',
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent drop-shadow'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-slate-900'
                      )}
                      style={
                        isCustom && gradientColors
                          ? {
                              background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }
                          : undefined
                      }
                    >
                      Planejamento semanal
                    </h1>
                    <p
                      className={cn(
                        'text-xs',
                        hasGradient ? 'text-slate-600/80' : 'text-slate-500'
                      )}
                    >
                      {filteredEvents.length} agendamentos neste período
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      if (!canEditAppointments(userWithPermissions)) {
                        showError('Você não tem permissão para criar agendamentos');
                        return;
                      }
                      setStartedFromButton(true);
                    setSelectedDate(null);
                    setIsDrawerOpen(true);
                    }}
                    className={cn(
                      'text-white',
                      hasGradient
                        ? isCustom && gradientStyleHorizontal
                          ? ''
                          : 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                        : 'bg-slate-900 hover:bg-slate-800'
                    )}
                    style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo agendamento
                  </Button>
                </div>
              </div>

              {/* Desktop Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* View Controls (Day, Week, Month) */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 backdrop-blur',
                    hasGradient ? 'border-white/30 bg-white/40' : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    <Button
                      variant={view === 'day' ? 'default' : 'ghost'}
                      onClick={() => handleViewChange('day')}
                      size="sm"
                      className={cn(
                        'h-8 px-3 text-xs font-medium',
                        view === 'day'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={view === 'day' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      Dia
                    </Button>
                    <Button
                      variant={view === 'week' ? 'default' : 'ghost'}
                      onClick={() => handleViewChange('week')}
                      size="sm"
                      className={cn(
                        'h-8 px-3 text-xs font-medium',
                        view === 'week'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={view === 'week' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      Semana
                    </Button>
                    <Button
                      variant={view === 'month' ? 'default' : 'ghost'}
                      onClick={() => handleViewChange('month')}
                      size="sm"
                      className={cn(
                        'h-8 px-3 text-xs font-medium',
                        view === 'month'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={view === 'month' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      Mês
                    </Button>
                  </div>
                  
                  {/* Layout Mode Controls (Grid/List) */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 backdrop-blur',
                    hasGradient ? 'border-white/30 bg-white/40' : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    <Button
                      variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                      onClick={() => setLayoutMode('grid')}
                      size="icon"
                      className={cn(
                        'h-9 w-9',
                        layoutMode === 'grid'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={layoutMode === 'grid' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={layoutMode === 'list' ? 'default' : 'ghost'}
                      onClick={() => setLayoutMode('list')}
                      size="icon"
                      className={cn(
                        'h-9 w-9',
                        layoutMode === 'list'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={layoutMode === 'list' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={layoutMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setLayoutMode('table')}
                      size="icon"
                      className={cn(
                        'h-9 w-9',
                        layoutMode === 'table'
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white'
                              : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : hasGradient
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                      )}
                      style={layoutMode === 'table' && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      <Table className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-input/60 bg-muted/20 px-3 py-2 text-sm cursor-pointer hover:border-primary transition">
                    <input
                      type="checkbox"
                      checked={showHolidays}
                      onChange={(e) => setShowHolidays(e.target.checked)}
                      disabled={!companySettings?.estado}
                      className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={cn('text-sm font-medium', !companySettings?.estado ? 'text-muted-foreground' : 'text-foreground')}>
                      Feriados
                    </span>
                  </label>
                  <Button
                    variant={showReturnSuggestions ? 'default' : 'outline'}
                    onClick={() => setShowReturnSuggestions(!showReturnSuggestions)}
                    size="sm"
                    className={cn(
                      showReturnSuggestions
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : ''
                    )}
                    style={showReturnSuggestions && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Sugerir Retornos
                  </Button>
                  <AdvancedFilters
                    professionals={availableProfessionals}
                    services={services}
                    patients={patients}
                    selectedProfessionals={selectedProfessionals}
                    selectedServices={selectedServices}
                    selectedPatients={selectedPatients}
                    selectedStatus={selectedStatus}
                    dateRange={filterDateRange}
                    priceRange={filterPriceRange}
                    onProfessionalsChange={setSelectedProfessionals}
                    onServicesChange={setSelectedServices}
                    onPatientsChange={setSelectedPatients}
                    onStatusChange={setSelectedStatus}
                    onDateRangeChange={(range) => setFilterDateRange(range)}
                    onPriceRangeChange={(range) => setFilterPriceRange(range)}
                    onClearFilters={() => {
                      setSelectedProfessionals([]);
                      setSelectedServices([]);
                      setSelectedPatients([]);
                      setSelectedStatus([]);
                      setFilterDateRange({ start: null, end: null });
                      setFilterPriceRange({ min: 0, max: 10000 });
                    }}
                  />
                </div>
              </div>
            </motion.div>

                {/* Calendar or List */}
                {layoutMode === 'grid' ? (
                  <>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div
                      className={cn(
                        'rounded-2xl border shadow-sm p-4 flex flex-col',
                        hasGradient ? 'border-white/25 bg-white/60 backdrop-blur-lg' : 'border-slate-200 bg-white'
                      )}
                    >
                      <div 
                        className="relative calendar-container w-full" 
                        style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}
                        ref={calendarContainerDesktopRef} 
                      >
                        <div 
                          className="w-full" 
                          style={{ display: 'flex', flexDirection: 'column' }}
                        >
                          <ProfessionalCalendar
                            onEventReschedule={handleEventReschedule}
                            events={calendarEvents}
                            currentDate={date}
                            view={view}
                            onDateClick={(date) => handleCalendarDateClick(date)}
                            onDateChange={(date) => handleDateChange(date)}
                            onEventClick={handleCalendarEventClick}
                            onEventComplete={handleCalendarEventComplete}
                            onEventConfirm={handleCalendarEventConfirm}
                            onEventDelete={handleCalendarEventDelete}
                            onViewChange={(newView) => handleViewChange(newView)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sugestões de Retorno */}
                  {showReturnSuggestions && (
                    <div style={{ width: '350px', flexShrink: 0 }}>
                      <ReturnSuggestions isOpen={showReturnSuggestions} />
                    </div>
                  )}
                </div>
                  </>
                ) : layoutMode === 'table' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={cn(
                      'rounded-xl border overflow-hidden',
                      hasGradient 
                        ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl' 
                        : 'bg-white border-slate-200 shadow-lg'
                    )}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={cn(
                            'border-b',
                            hasGradient ? 'bg-white/50 border-white/25' : 'bg-slate-50 border-slate-200'
                          )}>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Data/Hora
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Paciente
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Profissional
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Serviço
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Status
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Valor
                            </th>
                            <th className={cn(
                              'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                              hasGradient ? 'text-slate-700' : 'text-slate-600'
                            )}>
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className={cn(
                          hasGradient ? 'bg-white/30' : 'bg-white divide-y divide-slate-200'
                        )}>
                          {filteredEvents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center">
                                <div className={cn(
                                  hasGradient ? 'text-slate-500' : 'text-gray-500'
                                )}>
                                  Nenhum agendamento encontrado
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredEvents.map((event, index) => {
                              const appointment = event.appointment;
                              const patient = patients.find(p => p.id === appointment.clientId);
                              const professional = professionals.find(p => p.id === appointment.professionalId);
                              const service = services.find(s => s.id === appointment.serviceId);
                              const statusColors: Record<string, string> = {
                                agendado: 'bg-blue-100 text-blue-700',
                                confirmado: 'bg-green-100 text-green-700',
                                concluido: 'bg-purple-100 text-purple-700',
                                cancelado: 'bg-red-100 text-red-700',
                                no_show: 'bg-orange-100 text-orange-700',
                                pendente: 'bg-yellow-100 text-yellow-700',
                                bloqueio: 'bg-gray-100 text-gray-700'
                              };
                              const statusLabels: Record<string, string> = {
                                agendado: 'Agendado',
                                confirmado: 'Confirmado',
                                concluido: 'Concluído',
                                cancelado: 'Cancelado',
                                no_show: 'Não compareceu',
                                pendente: 'Pendente',
                                bloqueio: 'Bloqueio'
                              };
                              return (
                                <motion.tr
                                  key={appointment.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className={cn(
                                    'transition-colors',
                                    hasGradient
                                      ? 'hover:bg-white/50 border-b border-white/25'
                                      : 'hover:bg-slate-50 border-b border-slate-200'
                                  )}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={cn(
                                      'text-sm',
                                      hasGradient ? 'text-slate-700' : 'text-gray-700'
                                    )}>
                                      <div className="font-medium">{format(appointment.inicio, 'dd/MM/yyyy', { locale: ptBR })}</div>
                                      <div className="text-xs text-slate-500">
                                        {format(appointment.inicio, 'HH:mm')} - {format(appointment.fim, 'HH:mm')}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={cn(
                                      'text-sm font-medium',
                                      hasGradient ? 'text-slate-900' : 'text-gray-900'
                                    )}>
                                      {patient?.nome || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={cn(
                                      'text-sm',
                                      hasGradient ? 'text-slate-700' : 'text-gray-700'
                                    )}>
                                      {professional?.apelido || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={cn(
                                      'text-sm',
                                      hasGradient ? 'text-slate-700' : 'text-gray-700'
                                    )}>
                                      {service?.nome || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColors[appointment.status] || 'bg-gray-100 text-gray-700'}`}>
                                      {statusLabels[appointment.status] || appointment.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={cn(
                                      'text-sm font-semibold',
                                      hasGradient ? 'text-green-600' : 'text-green-600'
                                    )}>
                                      R$ {(appointment.precoCentavos / 100).toFixed(2).replace('.', ',')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEventEdit(appointment)}
                                        className={cn(
                                          hasGradient
                                            ? 'border-white/30 text-slate-700 hover:bg-white/40'
                                            : isNeutral
                                            ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                            : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                                        )}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                    onClick={() => handleEventDelete(appointment)}
                                        className={cn(
                                          hasGradient
                                            ? 'border-white/30 text-rose-600 hover:bg-white/40'
                                            : isNeutral
                                            ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                                            : 'hover:bg-red-50 text-red-600 border-red-200 hover:border-red-400'
                                        )}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                    <AppointmentList
                      appointments={filteredEvents.map(e => e.appointment)}
                      professionals={professionals}
                      services={services}
                      patients={patients}
                      onEdit={handleEventEdit}
                      onDelete={handleEventDelete}
                    />
                )}
          </div>
        </div>

        {/* Appointment Drawer */}
        <AnimatePresence>
          {isDrawerOpen && (
            <MobileAppointmentForm
              initialStep={rescheduleMode ? 4 : 1}
              isOpen={isDrawerOpen}
              onClose={handleCloseDrawer}
              selectedDate={selectedDate || undefined}
              editingAppointment={editingAppointment}
              startedFromButton={startedFromButton}
              rescheduleMode={rescheduleMode}
            />
          )}
        </AnimatePresence>

        {/* Complete Appointment Modal */}
        <CompleteAppointmentModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setCompletingAppointment(null);
          }}
          appointment={completingAppointment}
          onComplete={handleEventComplete}
        />

        <ConfirmAppointmentModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmingAppointment(null);
          }}
          appointment={confirmingAppointment}
          onConfirm={handleConfirmAppointment}
        />

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closeDeleteModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  'w-full max-w-md rounded-2xl p-6 shadow-2xl border',
                  hasGradient ? 'bg-white/70 border-white/25 backdrop-blur-xl' : 'bg-white border-slate-200'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Confirmar Exclusão</h3>
                  <Button variant="ghost" size="icon" onClick={closeDeleteModal}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <p className="text-slate-700 mb-6">
                  {deletingAppointment?.recurrenceGroupId
                    ? 'Este agendamento faz parte de uma recorrência. Ao confirmar, este agendamento e todos os futuros da série serão cancelados. Esta ação não pode ser desfeita.'
                    : 'Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.'}
                </p>

                {deletingAppointment && !deletingAppointment.isBlock && deletingAppointment.clientId && (
                  <div
                    className={cn(
                      'mb-6 flex items-center gap-3 rounded-lg border p-3',
                      hasGradient ? 'bg-white/60 border-white/25' : 'bg-blue-50 border-blue-200'
                    )}
                  >
                    <input
                      type="checkbox"
                      id="enviarNotificacaoDelete"
                      checked={enviarNotificacaoDelete}
                      onChange={(e) => setEnviarNotificacaoDelete(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <label
                      htmlFor="enviarNotificacaoDelete"
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      Enviar notificação para o cliente
                    </label>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                     onClick={confirmDelete}
                     disabled={isDeleting}
                    className={cn(
                      'flex-1 text-white disabled:opacity-50 disabled:cursor-not-allowed',
                      hasGradient ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700' : 'bg-red-600 hover:bg-red-700'
                    )}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Excluindo...
                      </>
                    ) : (
                      'Confirmar Exclusão'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    </AccessGuard>
  );
}
