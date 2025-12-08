'use client';

import React, { useMemo, useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, setHours, setMinutes, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Edit, Clock, User, Calendar, CheckCircle2, Trash2, Phone, Mail, MapPin, DollarSign, Check, UserX, X, Sparkles, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Appointment, Professional, Service, Patient } from '@/types';
import { BirthdayMessageModal } from '@/components/BirthdayMessageModal';

interface CalendarEvent {
  id: string;
  startDate: Date;
  endDate: Date;
  name: string;
  appointment: Appointment;
  professionalColor: string;
  status: string;
  statusColor: string;
  professional?: Professional;
  service?: Service;
  patient?: Patient;
  color: string;
}

type CalendarView = 'day' | 'week' | 'month';

interface ProfessionalCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  view?: CalendarView;
  onDateClick?: (date: Date) => void;
  onDateChange?: (date: Date) => void; // Para mudar a data sem abrir o modal
  onEventClick?: (event: CalendarEvent) => void;
  onEventComplete?: (event: CalendarEvent) => void;
  onEventConfirm?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void; // Nova prop para reagendar
  onViewChange?: (view: CalendarView) => void;
  className?: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 até 22:00

// Função para gerar horas dinamicamente baseado nos eventos
const getDynamicHours = (dayEvents: CalendarEvent[]): number[] => {
  const baseHours = new Set(HOURS); // Sempre incluir 08:00-22:00
  
  // Extrair todas as horas dos eventos
  // Usar métodos nativos do Date para garantir valores locais
  dayEvents.forEach((event) => {
    const startHour = event.startDate.getHours();
    const endHour = event.endDate.getHours();
    
    // Adicionar todas as horas que o evento cobre
    // Se o evento cruza a meia-noite (endHour < startHour), tratar separadamente
    if (endHour < startHour) {
      // Evento cruza a meia-noite: de startHour até 23, depois de 0 até endHour
      for (let h = startHour; h <= 23; h++) {
        baseHours.add(h);
      }
      for (let h = 0; h <= endHour; h++) {
        baseHours.add(h);
      }
    } else {
      // Evento normal: de startHour até endHour
      for (let h = startHour; h <= endHour; h++) {
        baseHours.add(h);
      }
    }
  });
  
  // Converter para array e ordenar
  // Ordem: 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ..., 22
  const hoursArray = Array.from(baseHours);
  const lateNight = hoursArray.filter(h => h >= 23).sort((a, b) => a - b);
  const earlyMorning = hoursArray.filter(h => h < 8).sort((a, b) => a - b);
  const dayHours = hoursArray.filter(h => h >= 8 && h <= 22).sort((a, b) => a - b);
  
  const result = [...lateNight, ...earlyMorning, ...dayHours];
  
  return result;
};

// Função para calcular sobreposição de eventos e dividir em colunas
const calculateEventLayout = (events: CalendarEvent[], hour: number): Array<CalendarEvent & { column: number; totalColumns: number }> => {
  // Filtrar eventos que estão neste horário
  // Usar métodos nativos do Date para garantir valores locais
  const hourEvents = events.filter((event) => {
    const eventHour = event.startDate.getHours();
    return eventHour === hour || (eventHour < hour && event.endDate.getHours() > hour);
  });

  if (hourEvents.length === 0) return [];

  // Ordenar por horário de início
  hourEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Agrupar eventos sobrepostos em colunas
  const columns: CalendarEvent[][] = [];
  
  hourEvents.forEach((event) => {
    let placed = false;
    
    // Tentar colocar em uma coluna existente
    for (let i = 0; i < columns.length; i++) {
      const canPlace = columns[i].every((existingEvent) => {
        // Verificar se não há sobreposição
        return (
          event.endDate <= existingEvent.startDate ||
          event.startDate >= existingEvent.endDate
        );
      });
      
      if (canPlace) {
        columns[i].push(event);
        placed = true;
        break;
      }
    }
    
    // Se não coube em nenhuma coluna, criar nova
    if (!placed) {
      columns.push([event]);
    }
  });

  // Retornar eventos com informações de coluna
  return hourEvents.map((event) => {
    const columnIndex = columns.findIndex((col) => col.includes(event));
    return {
      ...event,
      column: columnIndex,
      totalColumns: columns.length,
    };
  });
};

// Função para clarear uma cor hex e adicionar transparência
const lightenColor = (hex: string, percent: number = 30, opacity: number = 0.85): string => {
  // Remove o # se existir
  const color = hex.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Clareia a cor
  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  
  // Retorna com opacidade usando rgba
  return `rgba(${newR}, ${newG}, ${newB}, ${opacity})`;
};

export function ProfessionalCalendar({
  events,
  currentDate,
  view = 'week',
  onDateClick,
  onDateChange,
  onEventClick,
  onEventComplete,
  onEventConfirm,
  onEventDelete,
  onEventReschedule,
  onViewChange,
  className,
}: ProfessionalCalendarProps) {
  const [currentViewDate, setCurrentViewDate] = useState(currentDate);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [selectedBirthdayEvent, setSelectedBirthdayEvent] = useState<CalendarEvent | null>(null);
  const [hourCellHeight, setHourCellHeight] = useState<number>(64); // Altura padrão de h-16 (4rem) em desktop
  const touchTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pendingDateRef = useRef<Date | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchMovedRef = useRef<boolean>(false);

  const isTouchDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return ('ontouchstart' in window) || (navigator as any)?.maxTouchPoints > 0 || (navigator as any)?.msMaxTouchPoints > 0;
  }, []);

  const clearTouchTimer = useCallback(() => {
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const getTouchHandlersForDate = useCallback((date: Date) => {
    // Em mobile + view semana, desativa long-press para não interferir no scroll;
    // abertura de novo agendamento será feita via FAB no pai.
    if (isTouchDevice() && view === 'week') {
      return {};
    }
    return {
      onTouchStart: (e: React.TouchEvent) => {
        if (!isTouchDevice()) return;
        // Ignorar multi-touch para não iniciar long-press e não atrapalhar scroll/zoom
        if (e.touches && e.touches.length > 1) return;
        longPressTriggeredRef.current = false;
        pendingDateRef.current = date;
        clearTouchTimer();
        // registrar posição inicial para detectar movimento
        const t = e.touches && e.touches[0];
        if (t) {
          touchStartYRef.current = t.clientY;
          touchStartXRef.current = t.clientX;
        }
        touchMovedRef.current = false;
        // Pressionar por ~500ms para abrir modal (tempo ligeiramente menor para reduzir conflito com scroll)
        touchTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          onDateClick?.(date);
        }, 500);
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (!isTouchDevice()) return;
        // Não evitar o default no touchend para preservar a inércia do scroll no mobile.
        // janela curta para evitar ghost click
        lastTouchTimeRef.current = Date.now();
        clearTouchTimer();
        pendingDateRef.current = null;
        touchMovedRef.current = false;
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (!isTouchDevice()) return;
        const t = e.touches && e.touches[0];
        if (t) {
          const dy = Math.abs(t.clientY - touchStartYRef.current);
          const dx = Math.abs(t.clientX - touchStartXRef.current);
          if (dy > 1 || dx > 1) {
            touchMovedRef.current = true;
            // cancelamos o long-press ao detectar arrasto
            clearTouchTimer();
          }
        }
      },
      onTouchCancel: () => {
        clearTouchTimer();
        longPressTriggeredRef.current = false;
        pendingDateRef.current = null;
        touchMovedRef.current = false;
      }
    };
  }, [clearTouchTimer, isTouchDevice, onDateClick]);

  // Função para normalizar datas para horário local
  // Garante que datas sejam sempre interpretadas como local time, não UTC
  const normalizeToLocalDate = useCallback((date: Date): Date => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return date;
    }
    // Criar nova data usando componentes locais para garantir interpretação local
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    );
  }, []);

  // Normalizar todos os eventos ao recebê-los para garantir timezone local correto
  const normalizedEvents = useMemo(() => {
    return events.map(event => {
      const normalizedStart = normalizeToLocalDate(event.startDate);
      const normalizedEnd = normalizeToLocalDate(event.endDate);
      
      return {
        ...event,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      };
    });
  }, [events, normalizeToLocalDate]);

  // Sincronizar currentViewDate com currentDate quando mudar
  // Usar useLayoutEffect para evitar atualizações durante o render
  // e useRef para rastrear o valor anterior e evitar atualizações desnecessárias
  const prevCurrentDateRef = useRef<Date>(currentDate);
  
  useLayoutEffect(() => {
    // Só atualizar se realmente mudou (comparando timestamps)
    const prevTime = prevCurrentDateRef.current.getTime();
    const currentTime = currentDate.getTime();
    
    if (prevTime !== currentTime) {
      prevCurrentDateRef.current = currentDate;
      setCurrentViewDate(new Date(currentDate));
    }
  }, [currentDate]);

  // Calcular dateRange primeiro
  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: currentViewDate,
          end: currentViewDate,
          days: [currentViewDate],
        };
      case 'week':
        const weekStart = startOfWeek(currentViewDate, { locale: ptBR, weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentViewDate, { locale: ptBR, weekStartsOn: 0 });
        return {
          start: weekStart,
          end: weekEnd,
          days: eachDayOfInterval({ start: weekStart, end: weekEnd }),
        };
      case 'month':
        const monthStart = startOfMonth(currentViewDate);
        const monthEnd = endOfMonth(currentViewDate);
        // Incluir semanas anteriores e seguintes que aparecem no grid do calendário
        const startCalendar = startOfWeek(monthStart, { locale: ptBR, weekStartsOn: 0 });
        const endCalendar = endOfWeek(monthEnd, { locale: ptBR, weekStartsOn: 0 });
        return {
          start: startCalendar,
          end: endCalendar,
          days: eachDayOfInterval({ start: startCalendar, end: endCalendar }),
          monthStart,
          monthEnd,
        };
      default:
        return {
          start: currentViewDate,
          end: currentViewDate,
          days: [currentViewDate],
        };
    }
  }, [view, currentViewDate]);

  // Log quando a visualização muda
  useEffect(() => {
    // View changed
  }, [view, currentViewDate, dateRange]);

  // Medir altura real da célula de hora no mobile (font-size pode ser diferente)
  useEffect(() => {
    // Criar elemento temporário para medir a altura real do h-16
    const measureHourHeight = () => {
      const tempEl = document.createElement('div');
      tempEl.className = 'h-16';
      tempEl.style.position = 'absolute';
      tempEl.style.visibility = 'hidden';
      tempEl.style.pointerEvents = 'none';
      document.body.appendChild(tempEl);
      
      const height = tempEl.getBoundingClientRect().height;
      document.body.removeChild(tempEl);
      
      
      setHourCellHeight(height || 64); // Fallback para 64px se não conseguir medir
    };

    measureHourHeight();
    
    // Recalcular ao redimensionar
    const handleResize = () => {
      measureHourHeight();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atualizar hora atual a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualizar a cada minuto

    // Atualizar imediatamente ao montar
    setCurrentTime(new Date());

    return () => clearInterval(interval);
  }, []);

  // Função para calcular a posição da linha de hora atual
  const getCurrentTimePosition = useCallback((dynamicHours: number[]): number | null => {
    // Normalizar currentTime da mesma forma que os eventos para garantir horário local
    const normalizedNow = normalizeToLocalDate(currentTime);
    // Usar métodos nativos do Date para garantir valores locais
    const currentHour = normalizedNow.getHours();
    const currentMinute = normalizedNow.getMinutes();
    
    // Verificar se a hora atual está no array de horas dinâmicas
    const hourIndex = dynamicHours.findIndex(h => h === currentHour);
    if (hourIndex === -1) {
      return null;
    }
    
    // Calcular posição baseada na hora e minutos usando altura real medida
    const hourPosition = hourIndex * hourCellHeight;
    const minuteOffset = (currentMinute / 60) * hourCellHeight;
    const totalPosition = hourPosition + minuteOffset;
    
    return totalPosition;
  }, [currentTime, normalizeToLocalDate, hourCellHeight]);

  // Rastrear mudanças em currentViewDate para notificar o componente pai
  const prevViewDateRef = useRef<Date>(currentViewDate);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    // Só notificar se a mudança foi interna (não veio do prop currentDate)
    if (isInternalChangeRef.current) {
      const prevTime = prevViewDateRef.current.getTime();
      const currentTime = currentViewDate.getTime();
      
      if (prevTime !== currentTime && onDateChange) {
        // Usar setTimeout para garantir que a atualização aconteça após o render
        setTimeout(() => {
          onDateChange(new Date(currentViewDate));
        }, 0);
      }
      
      isInternalChangeRef.current = false;
    }
    prevViewDateRef.current = currentViewDate;
  }, [currentViewDate, onDateChange]);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentViewDate((prev) => {
      let newDate: Date;
      switch (view) {
        case 'day':
          newDate = direction === 'next' ? addDays(prev, 1) : subDays(prev, 1);
          break;
        case 'week':
          newDate = direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
          break;
        case 'month':
          newDate = direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
          break;
        default:
          return prev;
      }
      
      // Marcar como mudança interna para notificar o componente pai após o render
      isInternalChangeRef.current = true;
      
      return newDate;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    const today = new Date();
    // Marcar como mudança interna para notificar o componente pai após o render
    isInternalChangeRef.current = true;
    setCurrentViewDate(today);
  }, []);

  // Filtrar eventos para o range atual
  const visibleEvents = useMemo(() => {
    const birthdayEventsReceived = normalizedEvents.filter(e => e.id.startsWith('birthday-') || e.appointment?.id?.startsWith('birthday-'));
    
    const filtered = normalizedEvents.filter((event) => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate;
      const isBirthday = event.id.startsWith('birthday-') || event.appointment?.id?.startsWith('birthday-');
      
      let shouldInclude = false;
      
      if (view === 'month') {
        // Para mês, mostrar eventos que aparecem no grid do calendário (inclui semanas adjacentes)
        shouldInclude = eventStart >= dateRange.start && eventStart <= dateRange.end;
        
      } else if (view === 'day') {
        // Para dia, comparar apenas as datas (sem horas)
        const eventStartDate = format(eventStart, 'yyyy-MM-dd');
        const rangeStartDate = format(dateRange.start, 'yyyy-MM-dd');
        shouldInclude = eventStartDate === rangeStartDate;
      } else {
        // Para semana, mostrar eventos que se sobrepõem ao range
        // Mas para eventos de aniversário, mostrar apenas no dia específico
        if (isBirthday) {
          // Para aniversários, verificar se o dia do evento está dentro do range
          const eventStartDate = format(eventStart, 'yyyy-MM-dd');
          const rangeStartDate = format(dateRange.start, 'yyyy-MM-dd');
          const rangeEndDate = format(dateRange.end, 'yyyy-MM-dd');
          shouldInclude = eventStartDate >= rangeStartDate && eventStartDate <= rangeEndDate;
        } else {
          // Para eventos normais, mostrar eventos que se sobrepõem ao range
          shouldInclude = eventStart <= dateRange.end && eventEnd >= dateRange.start;
        }
      }
      
      return shouldInclude;
    });
    
    const birthdayEventsFiltered = filtered.filter(e => e.id.startsWith('birthday-') || e.appointment?.id?.startsWith('birthday-'));
    
    // Remover duplicatas de bloqueios para todos os profissionais
    // Usar uma chave única baseada no appointment.id + data para identificar duplicatas
    const seenBlockKeys = new Set<string>();
    const finalFiltered = filtered.filter((event) => {
      const isBlock = event.appointment?.isBlock || event.status === 'bloqueio';
      const isBlockForAll = isBlock && (event.appointment?.blockScope === 'all' || event.appointment?.professionalId === '__all__');
      
      if (isBlockForAll && event.appointment) {
        // Criar chave única: appointment.id + data do evento
        const eventDate = format(event.startDate, 'yyyy-MM-dd');
        const blockKey = `${event.appointment.id}-${eventDate}`;
        
        if (seenBlockKeys.has(blockKey)) {
          return false;
        }
        seenBlockKeys.add(blockKey);
      }
      return true;
    });
    
    return finalFiltered;
  }, [normalizedEvents, dateRange, view]);

  // Agrupar eventos por dia
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    const seenBlockKeys = new Set<string>();
    const seenBirthdayKeys = new Set<string>();
    
    visibleEvents.forEach((event) => {
      const isBlock = event.appointment?.isBlock || event.status === 'bloqueio';
      const isBlockForAll = isBlock && (event.appointment?.blockScope === 'all' || event.appointment?.professionalId === '__all__');
      const isBirthday = event.id.startsWith('birthday-') || event.appointment?.id?.startsWith('birthday-');
      
      // Se é um bloqueio para todos, verificar se já foi adicionado neste dia
      if (isBlockForAll && event.appointment) {
        const dayKey = format(event.startDate, 'yyyy-MM-dd');
        const blockKey = `${event.appointment.id}-${dayKey}`;
        
        if (seenBlockKeys.has(blockKey)) {
          return; // Pular se já foi adicionado neste dia
        }
        seenBlockKeys.add(blockKey);
      }
      
      // Para eventos de aniversário, garantir que apareçam apenas no dia de início
      if (isBirthday) {
        const dayKey = format(event.startDate, 'yyyy-MM-dd');
        const birthdayKey = `${event.id}-${dayKey}`;
        
        if (seenBirthdayKeys.has(birthdayKey)) {
          return; // Pular se já foi adicionado neste dia
        }
        seenBirthdayKeys.add(birthdayKey);
      }
      
      // Usar sempre a data de início para agrupar eventos
      const dayKey = format(event.startDate, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });

    // Ordenar eventos por horário em cada dia
    Object.keys(grouped).forEach((dayKey) => {
      grouped[dayKey].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    });

    return grouped;
  }, [visibleEvents]);

  // Função para detectar eventos de "dia todo"
  // Usar métodos nativos do Date para garantir valores locais
  const isAllDayEvent = (event: CalendarEvent): boolean => {
    const startHour = event.startDate.getHours();
    const startMinute = event.startDate.getMinutes();
    const endHour = event.endDate.getHours();
    const endMinute = event.endDate.getMinutes();
    
    // Evento de dia todo: começa às 00:00 e termina às 23:59 (ou próximo, ou 00:00 do dia seguinte)
    // Verificar se começa exatamente à meia-noite
    if (startHour !== 0 || startMinute !== 0) {
      return false;
    }
    
    // Verificar se termina às 23:59 ou próximo (permitir até 23:59:59)
    // Ou se termina à meia-noite do dia seguinte (que seria 00:00)
    if (endHour === 23 && endMinute >= 59) {
      return true;
    }
    
    // Se termina à meia-noite (00:00), verificar se é do dia seguinte
    if (endHour === 0 && endMinute === 0) {
      const startDay = format(event.startDate, 'yyyy-MM-dd');
      const endDay = format(event.endDate, 'yyyy-MM-dd');
      // Se o dia de término é diferente do dia de início, é um evento de dia todo
      return startDay !== endDay;
    }
    
    return false;
  };

  // Função helper para renderizar o popover com informações do evento
  const renderEventPopover = (event: CalendarEvent, children: React.ReactNode) => {
    const statusLabels: Record<string, string> = {
      'agendado': 'Agendado',
      'confirmado': 'Confirmado',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado',
      'no_show': 'Faltou',
      'pendente': 'Pendente',
      'bloqueio': 'Bloqueio'
    };

    // Identificar se é um evento de aniversário
    const isBirthday = event.id.startsWith('birthday-') || event.appointment?.id?.startsWith('birthday-');
    const isBlock = event.status === 'bloqueio' || event.appointment?.isBlock;
    const isCompleted = event.status === 'concluido';
    const isConfirmed = event.status === 'confirmado';
    const isCancelled = event.status === 'cancelado';
    const showCompleteButton = !isCompleted && !isBlock && !isCancelled && !isBirthday && !!onEventComplete;
    const showConfirmButton = !isConfirmed && !isCompleted && !isBlock && !isCancelled && !isBirthday && !!onEventConfirm;
    const showDeleteButton = !isBirthday && !!onEventDelete; // Permitir excluir bloqueios
    const showEditButton = !isBirthday && !!onEventClick;

    return (
      <Popover open={openPopoverId === event.id} onOpenChange={(open) => setOpenPopoverId(open ? event.id : null)} modal={false}>
        <PopoverTrigger asChild>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (openPopoverId !== event.id) {
                setOpenPopoverId(event.id);
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          >
            {children}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 max-w-[calc(100vw-2rem)]" 
          align="start"
          side="top"
          sideOffset={8}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {/* Header com status badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.statusColor }}
                  />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {statusLabels[event.status] || event.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{event.name}</h3>
                <p className="text-sm text-slate-600">
                  {format(event.startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                {!isBirthday && (event.service || (event.appointment?.serviceIds && event.appointment.serviceIds.length > 0)) && (
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {event.service 
                      ? event.service.nome 
                      : (event.appointment?.serviceIds && event.appointment.serviceIds.length > 1
                          ? `${event.appointment.serviceIds.length} serviços`
                          : 'Serviço')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {showEditButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 hover:bg-slate-100"
                  onClick={() => {
                    onEventClick?.(event);
                    setOpenPopoverId(null);
                  }}
                >
                  <Edit className="h-4 w-4 text-slate-600" />
                </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenPopoverId(null);
                  }}
                >
                  <X className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Informações principais em grid */}
            <div className="grid grid-cols-2 gap-3">
              {isBirthday ? (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 col-span-2">
                  <Clock className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Tipo de evento</p>
                    <p className="text-sm font-semibold text-slate-900">Dia todo</p>
                  </div>
                </div>
              ) : (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">Horário</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(event.startDate, 'HH:mm', { locale: ptBR })} - {format(event.endDate, 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
              )}

              {!isBirthday && event.professional && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Profissional</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{event.professional.apelido}</p>
                  </div>
                </div>
              )}

              {!isBirthday && event.service && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Serviço</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{event.service.nome}</p>
                  </div>
                </div>
              )}

              {event.patient && (
                <>
                  {event.patient.telefoneE164 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                      <Phone className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Telefone</p>
                        <p className="text-sm font-semibold text-slate-900">{event.patient.telefoneE164}</p>
                      </div>
                    </div>
                  )}
                  {event.patient.email && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                      <Mail className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Email</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{event.patient.email}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isBirthday && event.appointment?.precoCentavos && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  <DollarSign className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Valor</p>
                    <p className="text-sm font-semibold text-slate-900">
                      R$ {(event.appointment.precoCentavos / 100).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              )}

              {/* Informação de presença do cliente - apenas para eventos normais */}
              {!isBirthday && event.appointment && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  {event.appointment.clientePresente === false || event.status === 'no_show' ? (
                    <>
                      <UserX className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Presença</p>
                        <p className="text-sm font-semibold text-red-600">Cliente não compareceu</p>
                      </div>
                    </>
                  ) : event.appointment.clientePresente === true ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Presença</p>
                        <p className="text-sm font-semibold text-green-600">Cliente compareceu</p>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* Descrição do bloqueio */}
            {isBlock && event.appointment?.blockDescription && (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-violet-700 uppercase tracking-wide mb-1">Descrição do Bloqueio</p>
                    <p className="text-sm text-violet-900 leading-relaxed">{event.appointment.blockDescription}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação para aniversários */}
            {isBirthday && event.patient && (
              <div className="pt-3 border-t border-slate-200">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedBirthdayEvent(event);
                    setBirthdayModalOpen(true);
                    setOpenPopoverId(null);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Mensagem de Aniversário
                </Button>
              </div>
            )}

            {/* Botões de ação - apenas para eventos normais, não aniversários */}
            {!isBirthday && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
                {showEditButton && (
              <Button
                variant="default"
                size="sm"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                  onEventClick?.(event);
                  setOpenPopoverId(null);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Evento
              </Button>
                )}
              
                {/* Botão Reagendar - apenas para agendamentos normais (não bloqueios) */}
                {!isBlock && onEventReschedule && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onEventReschedule(event);
                      setOpenPopoverId(null);
                    }}
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Reagendar
                  </Button>
                )}
              
              <div className="grid grid-cols-2 gap-2">
                {showConfirmButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onEventConfirm?.(event);
                      setOpenPopoverId(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Confirmar
                  </Button>
                )}
                
                {showCompleteButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onEventComplete?.(event);
                      setOpenPopoverId(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Concluir
                  </Button>
                )}
                
                {showDeleteButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onEventDelete?.(event);
                      setOpenPopoverId(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderWeekView = () => {
    // Coletar todos os eventos da semana e separar eventos de dia todo
    const allWeekEvents: CalendarEvent[] = [];
    const allDayEventsByDay: Record<string, CalendarEvent[]> = {};
    
    dateRange.days.forEach((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEvents = eventsByDay[dayKey] || [];
      
      // Separar eventos de dia todo
      const allDayEvents = dayEvents.filter((event) => isAllDayEvent(event));
      const regularEvents = dayEvents.filter((event) => !isAllDayEvent(event));
      
      if (allDayEvents.length > 0) {
        allDayEventsByDay[dayKey] = allDayEvents;
      }
      
      allWeekEvents.push(...regularEvents);
    });
    
    // Gerar horas dinamicamente baseado apenas nos eventos regulares
    const dynamicHours = getDynamicHours(allWeekEvents);
    
    // Calcular altura máxima necessária para os eventos da semana
    let maxEventEnd = 0;
    if (allWeekEvents.length > 0) {
      maxEventEnd = allWeekEvents.reduce((max, event) => {
        const eventEnd = event.endDate.getTime();
        return eventEnd > max ? eventEnd : max;
      }, 0);
    }
    
    let weekContainerHeight = dynamicHours.length * hourCellHeight;
    if (maxEventEnd > 0) {
      const maxEventEndDate = new Date(maxEventEnd);
      const maxEventEndHour = maxEventEndDate.getHours();
      const maxEventEndMinute = maxEventEndDate.getMinutes();
      const maxEventEndIndex = dynamicHours.indexOf(maxEventEndHour);
      if (maxEventEndIndex >= 0) {
        const maxEventEndOffset = maxEventEndIndex * hourCellHeight + (maxEventEndMinute / 60) * hourCellHeight;
        weekContainerHeight = Math.max(weekContainerHeight, maxEventEndOffset + hourCellHeight);
      }
    }
    
    // Verificar se há eventos de dia todo em algum dia
    const hasAllDayEvents = Object.keys(allDayEventsByDay).length > 0;

    return (
    
        <div className="flex flex-col">
        {/* Header com dias da semana */}
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 flex-shrink-0 select-none md:select-auto" style={{ WebkitUserSelect: 'none', touchAction: 'pan-y' }}>
          <div className="p-2 border-r border-slate-200 select-none md:select-auto" style={{ WebkitUserSelect: 'none', touchAction: 'pan-y' }}>
            <div className="text-xs font-medium text-slate-500">Hora</div>
          </div>
          {dateRange.days.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                'p-2 border-r border-slate-200 last:border-r-0 text-center select-none md:select-auto',
                isSameDay(day, new Date()) && 'bg-blue-50'
              )}
            >
              <div className="text-xs font-medium text-slate-500">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                'text-lg font-semibold mt-1',
                isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-900'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Seção de eventos de dia todo */}
        {hasAllDayEvents && (
          <div
            className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/50 flex-shrink-0 select-none md:select-auto"
            style={{ 
              WebkitUserSelect: 'none',
              minHeight: 'auto',
              maxHeight: 'none',
            }}
          >
            <div className="p-2 border-r border-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 uppercase">Dia Todo</span>
            </div>
            {dateRange.days.map((day, idx) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const allDayEvents = allDayEventsByDay[dayKey] || [];
              
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-1.5 border-r border-slate-200 last:border-r-0',
                    isSameDay(day, new Date()) && 'bg-blue-50/50'
                  )}
                  style={{ minHeight: 'auto', maxHeight: 'none' }}
                >
                  <div className="flex flex-col gap-1" style={{ minHeight: 0 }}>
                    {allDayEvents.map((event) => (
                      <div key={event.id} className="flex items-center min-h-0">
                        {renderEventPopover(event, (
                          <div
                            className={cn(
                              'w-full rounded-lg p-1 cursor-pointer group relative overflow-hidden',
                              'shadow-sm hover:shadow-md transition-all duration-200 ease-in-out',
                              'border border-slate-200/50 hover:border-slate-300'
                            )}
                            style={{
                              backgroundColor: lightenColor(event.professionalColor || event.color, 35, 0.9),
                              borderLeft: `3px solid ${event.statusColor}`,
                              minHeight: '24px',
                              maxHeight: hoveredEventId === event.id ? 'none' : '24px',
                              height: hoveredEventId === event.id ? 'auto' : '24px',
                              pointerEvents: 'auto',
                              overflow: hoveredEventId === event.id ? 'visible' : 'hidden',
                            }}
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                          >
                            <div className="absolute inset-0 bg-white/40 pointer-events-none" />
                            <div className="relative z-10 flex items-center" style={{ minHeight: '24px' }}>
                              {(() => {
                                const isHovered = hoveredEventId === event.id;
                                return (
                                  <div className={cn(
                                    'font-semibold leading-tight w-full transition-all duration-300',
                                    isHovered ? 'text-sm break-words' : 'text-[10px] truncate',
                                    'text-slate-800'
                                  )}>
                                    {event.name}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Corpo com horários */}
        <div className="relative" style={{ 
          minHeight: `${weekContainerHeight}px`, 
          height: `${weekContainerHeight}px`,
          overflow: 'visible',
          position: 'relative',
        }}>
          <div
            className="grid grid-cols-8 select-none md:select-auto"
            style={{ 
              WebkitUserSelect: 'none', 
              touchAction: 'pan-y', 
              overflow: 'visible',
              position: 'relative',
              minHeight: `${weekContainerHeight}px`,
              height: `${weekContainerHeight}px`,
              ...(isTouchDevice() && view === 'week' ? { pointerEvents: 'none' as const } : {}) 
            }}
          >
            {/* Coluna de horários */}
            <div className="border-r border-slate-200 select-none md:select-auto" style={{ WebkitUserSelect: 'none' }}>
              {dynamicHours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-slate-500">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas de dias */}
            {dateRange.days.map((day, dayIdx) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[dayKey] || [];
              // Filtrar apenas eventos regulares (não de dia todo)
              const regularDayEvents = dayEvents.filter(event => !isAllDayEvent(event));
              const isToday = isSameDay(day, currentTime);
              const currentTimePos = isToday ? getCurrentTimePosition(dynamicHours) : null;

              // Calcular altura máxima necessária para os eventos deste dia
              let containerHeight = dynamicHours.length * hourCellHeight;
              if (regularDayEvents.length > 0) {
                const maxEventEnd = regularDayEvents.reduce((max, event) => {
                  const eventEnd = event.endDate.getTime();
                  return eventEnd > max ? eventEnd : max;
                }, 0);
                
                if (maxEventEnd > 0) {
                  const maxEventEndDate = new Date(maxEventEnd);
                  const maxEventEndHour = maxEventEndDate.getHours();
                  const maxEventEndMinute = maxEventEndDate.getMinutes();
                  const maxEventEndIndex = dynamicHours.indexOf(maxEventEndHour);
                  if (maxEventEndIndex >= 0) {
                    const maxEventEndOffset = maxEventEndIndex * hourCellHeight + (maxEventEndMinute / 60) * hourCellHeight;
                    containerHeight = Math.max(containerHeight, maxEventEndOffset + hourCellHeight);
                  }
                }
              }

              return (
                <div
                  key={dayIdx}
                  className="border-r border-slate-200 last:border-r-0 relative"
                  style={{
                    touchAction: 'pan-y',
                    WebkitOverflowScrolling: 'touch',
                    minHeight: `${containerHeight}px`,
                    height: `${containerHeight}px`,
                    overflow: 'visible',
                    position: 'relative',
                  }}
                >
                  {/* Linha de hora atual */}
                  {currentTimePos !== null && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{
                        top: `${currentTimePos}px`,
                      }}
                    >
                      <div className="w-full h-0.5 bg-red-500" />
                    </div>
                  )}
                  
                  {/* Renderizar todos os eventos da coluna (posicionados absolutamente) */}
                      {(() => {
                    // Renderizar apenas eventos que começam em alguma das horas visíveis
                    // Usar métodos nativos do Date para garantir valores locais
                    const visibleEvents = regularDayEvents.filter((event) => {
                          const eventHour = event.startDate.getHours();
                      return dynamicHours.includes(eventHour);
                    });
                    
                    if (visibleEvents.length === 0) return null;
                    
                    // Ordenar por horário de início
                    visibleEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
                    
                    // Agrupar eventos sobrepostos em colunas
                    const columns: CalendarEvent[][] = [];
                    
                    visibleEvents.forEach((event) => {
                      let placed = false;
                      
                      // Tentar colocar em uma coluna existente
                      for (let i = 0; i < columns.length; i++) {
                        const canPlace = columns[i].every((existingEvent) => {
                          // Verificar se não há sobreposição
                          return (
                            event.endDate <= existingEvent.startDate ||
                            event.startDate >= existingEvent.endDate
                          );
                        });
                        
                        if (canPlace) {
                          columns[i].push(event);
                          placed = true;
                          break;
                        }
                      }
                      
                      // Se não coube em nenhuma coluna, criar nova
                      if (!placed) {
                        columns.push([event]);
                      }
                    });
                    
                    const totalColumns = columns.length;
                    
                    return visibleEvents.map((event) => {
                      const columnIndex = columns.findIndex((col) => col.includes(event));
                      
                      // Garantir que estamos usando métodos locais do Date object
                      // getHours() e getMinutes() do Date retornam valores locais, não UTC
                      // Antes da normalização, verificar o que temos
                      const rawStartHour = event.startDate.getHours();
                      const rawStartMinute = event.startDate.getMinutes();
                      const rawEndHour = event.endDate.getHours();
                      const rawEndMinute = event.endDate.getMinutes();
                      
                      // Normalizar a data novamente para garantir que não há problema de timezone
                      const normalizedStartDate = new Date(
                        event.startDate.getFullYear(),
                        event.startDate.getMonth(),
                        event.startDate.getDate(),
                        event.startDate.getHours(),
                        event.startDate.getMinutes(),
                        event.startDate.getSeconds(),
                        event.startDate.getMilliseconds()
                      );
                      const normalizedEndDate = new Date(
                        event.endDate.getFullYear(),
                        event.endDate.getMonth(),
                        event.endDate.getDate(),
                        event.endDate.getHours(),
                        event.endDate.getMinutes(),
                        event.endDate.getSeconds(),
                        event.endDate.getMilliseconds()
                      );
                      
                      const startHour = normalizedStartDate.getHours();
                      const startMinute = normalizedStartDate.getMinutes();
                      const endHour = normalizedEndDate.getHours();
                      const endMinute = normalizedEndDate.getMinutes();
                      
                      // Calcular posição top absoluta baseada no índice da hora
                      const startHourIndex = dynamicHours.indexOf(startHour);
                      const topOffset = startHourIndex >= 0 
                        ? startHourIndex * hourCellHeight + (startMinute / 60) * hourCellHeight 
                        : 0;
                      
                      // Calcular altura total baseado no horário de término
                      // Usar a diferença real entre as datas para calcular a duração
                      const startTime = normalizedStartDate.getTime();
                      const endTime = normalizedEndDate.getTime();
                      const durationMs = endTime - startTime;
                      const durationMinutes = durationMs / (1000 * 60);
                      
                      // Calcular altura baseada na duração real em minutos
                      const totalHeight = (durationMinutes / 60) * hourCellHeight;
                      
                      const height = Math.max(totalHeight, 32);
                      
                      // Debug: verificar altura calculada
                      if (event.id === 'nQF3ksroK4SxJZuYPcLF') {
                        console.log('DEBUG altura evento:', {
                          durationMinutes,
                          hourCellHeight,
                          totalHeight,
                          height,
                          topOffset,
                          containerHeight,
                        });
                      }
                          
                          // Calcular largura e posição baseado na coluna
                      const widthPercent = 100 / totalColumns;
                      const leftPercent = (columnIndex * widthPercent);

                          const isHovered = hoveredEventId === event.id;
                      const isLastColumn = columnIndex === totalColumns - 1;
                      const isFirstColumn = columnIndex === 0;
                          
                          // Ajustar margens para evitar overflow
                          const finalWidth = isHovered 
                            ? 'calc(100% - 8px)' 
                            : `calc(${widthPercent}% - ${isFirstColumn ? '4px' : '2px'} - ${isLastColumn ? '4px' : '2px'})`;
                          const finalLeft = isHovered ? '4px' : `calc(${leftPercent}% + ${isFirstColumn ? '4px' : '2px'})`;

                          return (
                            <div 
                              key={event.id} 
                              className="absolute" 
                              style={{
                                position: 'absolute',
                                top: `${topOffset}px`,
                                left: finalLeft,
                                width: finalWidth,
                                height: isHovered ? 'auto' : `${height}px`,
                                minHeight: `${height}px`,
                                maxHeight: 'none',
                                boxSizing: 'border-box',
                                zIndex: isHovered ? 20 : 10,
                                pointerEvents: 'auto',
                                overflow: 'visible',
                                '--event-height': `${height}px`,
                              } as React.CSSProperties} 
                              data-event-height={height} 
                              data-duration-minutes={durationMinutes}
                            >
                              {renderEventPopover(event, (
                                <div
                                  className={cn(
                                    'rounded-lg p-1.5 cursor-pointer group relative',
                                    'shadow-sm hover:shadow-lg transition-all duration-200 ease-in-out',
                                    'border border-slate-200/50 hover:border-slate-300'
                                  )}
                                  style={{
                                    backgroundColor: lightenColor(event.professionalColor || event.color, 35, 0.9),
                                    borderLeft: `6px solid ${event.statusColor}`,
                                    pointerEvents: 'auto',
                                    position: 'relative',
                                    width: '100%',
                                    height: isHovered ? 'auto' : `${height}px`,
                                    minHeight: `${height}px`,
                                    maxHeight: 'none',
                                    overflow: isHovered ? 'visible' : 'hidden',
                                    boxSizing: 'border-box',
                                  }}
                                  onMouseEnter={() => setHoveredEventId(event.id)}
                                  onMouseLeave={() => setHoveredEventId(null)}
                                >
                                  {/* Overlay branco semi-transparente */}
                                  <div className="absolute inset-0 bg-white/40 pointer-events-none" />
                                  <div className="relative z-10 flex items-start justify-between gap-1">
                                    <div className="flex-1 min-w-0">
                                      <div className={cn(
                                        'font-bold leading-tight mb-0.5 transition-all duration-300',
                                        isHovered ? 'text-sm break-words' : 'text-[10px] truncate',
                                        'text-slate-800'
                                      )}>
                                        {event.name}
                                      </div>
                                      {(isHovered || (durationMinutes >= 60 && height >= 50)) && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className={isHovered ? '' : 'truncate'}>
                                            {format(event.startDate, 'HH:mm', { locale: ptBR })} - {format(event.endDate, 'HH:mm', { locale: ptBR })}
                                          </span>
                                        </div>
                                      )}
                                      {event.professional && (isHovered || (durationMinutes >= 60 && height >= 50)) && (
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                          <User className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className={isHovered ? '' : 'truncate'}>{event.professional.apelido}</span>
                                        </div>
                                      )}
                                    </div>
                                    {(() => {
                                      const clienteNaoVeio = event.appointment?.clientePresente === false || event.status === 'no_show';
                                  const eventoConcluido = event.status === 'concluido' || event.appointment?.clientePresente === true;
                                  const eventoConfirmado = event.status === 'confirmado';
                                  
                                  if (clienteNaoVeio) {
                                    return (
                                        <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <UserX className="h-5 w-5 text-red-600" />
                                        </div>
                                    );
                                  }
                                  
                                  if (eventoConcluido) {
                                    return (
                                        <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <Check className="h-5 w-5 text-green-600" />
                                        </div>
                                      );
                                  }
                                  
                                  if (eventoConfirmado) {
                                    return (
                                      <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        });
                      })()}
                  
                  {dynamicHours.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-slate-100 relative"
                      style={{ pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const clickedDate = setHours(setMinutes(day, 0), hour);
                        // Ignorar apenas "ghost click" após touch (delay curto)
                        if (isTouchDevice() && (Date.now() - lastTouchTimeRef.current) < 300) {
                          return;
                        }
                        onDateClick?.(clickedDate);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const touch = e.touches[0];
                        if (touch) {
                          touchStartYRef.current = touch.clientY;
                          touchStartXRef.current = touch.clientX;
                          lastTouchTimeRef.current = Date.now();
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        const touch = e.changedTouches[0];
                        if (!touch) return;
                        
                        const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
                        const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
                        const deltaTime = Date.now() - lastTouchTimeRef.current;
                        
                        // Se o movimento foi pequeno (< 10px) e rápido (< 300ms), é um clique
                        if (deltaY < 10 && deltaX < 10 && deltaTime < 300) {
                          const clickedDate = setHours(setMinutes(day, 0), hour);
                          onDateClick?.(clickedDate);
                        }
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const day = dateRange.start;
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDay[dayKey] || [];
    
    // Separar eventos de dia todo dos eventos normais
    const allDayEvents = dayEvents.filter(isAllDayEvent);
    const regularEvents = dayEvents.filter(event => !isAllDayEvent(event));
    
    // Gerar horas dinamicamente baseado apenas nos eventos regulares
    const dynamicHours = getDynamicHours(regularEvents);
    
    // Calcular altura máxima necessária para os eventos
    let maxEventEnd = 0;
    if (regularEvents.length > 0) {
      maxEventEnd = regularEvents.reduce((max, event) => {
        const eventEnd = event.endDate.getTime();
        return eventEnd > max ? eventEnd : max;
      }, 0);
    }
    
    let containerHeight = dynamicHours.length * hourCellHeight;
    if (maxEventEnd > 0) {
      const maxEventEndDate = new Date(maxEventEnd);
      const maxEventEndHour = maxEventEndDate.getHours();
      const maxEventEndMinute = maxEventEndDate.getMinutes();
      const maxEventEndIndex = dynamicHours.indexOf(maxEventEndHour);
      if (maxEventEndIndex >= 0) {
        const maxEventEndOffset = maxEventEndIndex * hourCellHeight + (maxEventEndMinute / 60) * hourCellHeight;
        containerHeight = Math.max(containerHeight, maxEventEndOffset + hourCellHeight);
      }
    }

    return (
      <div className="flex flex-col">
        {/* Header do dia */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex-shrink-0">
          <div className="text-lg font-semibold text-slate-900">
            {format(day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Seção de eventos de dia todo */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 uppercase">Dia Todo</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {allDayEvents.map((event) => (
                <div key={event.id} className="flex items-center">
                  {renderEventPopover(event, (
                    <div
                      className={cn(
                        'w-full rounded-lg p-2 cursor-pointer group relative overflow-hidden',
                        'shadow-sm hover:shadow-md transition-all duration-200 ease-in-out',
                        'border border-slate-200/50 hover:border-slate-300'
                      )}
                      style={{
                        backgroundColor: lightenColor(event.professionalColor || event.color, 35, 0.9),
                        borderLeft: `4px solid ${event.statusColor}`,
                        pointerEvents: 'auto',
                        overflow: hoveredEventId === event.id ? 'visible' : 'hidden',
                      }}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <div className="absolute inset-0 bg-white/40 pointer-events-none" />
                      <div className={cn(
                        'relative z-10 transition-all duration-300',
                        hoveredEventId === event.id ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-2'
                      )}>
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const isHovered = hoveredEventId === event.id;
                            return (
                              <div className={cn(
                                'font-semibold transition-all duration-300',
                                isHovered ? 'text-sm break-words' : 'text-[10px] truncate',
                                'text-slate-800'
                              )}>
                                {event.name}
                              </div>
                            );
                          })()}
                          {event.professional && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className={hoveredEventId === event.id ? '' : 'truncate'}>{event.professional.apelido}</span>
                            </div>
                          )}
                        </div>
                        {(() => {
                          const clienteNaoVeio = event.appointment?.clientePresente === false || event.status === 'no_show';
                          const eventoConcluido = event.status === 'concluido' || event.appointment?.clientePresente === true;
                          const eventoConfirmado = event.status === 'confirmado';
                          
                          if (clienteNaoVeio) {
                            return (
                              <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <UserX className="h-4 w-4 text-red-600" />
                              </div>
                            );
                          }
                          
                          if (eventoConcluido) {
                            return (
                              <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                            );
                          }
                          
                          if (eventoConfirmado) {
                            return (
                              <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corpo com horários */}
        <div className="relative" style={{ 
          minHeight: `${containerHeight}px`, 
          height: `${containerHeight}px`,
          overflow: 'visible',
          position: 'relative',
        }}>
          <div className="grid grid-cols-[80px_1fr] select-none md:select-auto" style={{ 
            WebkitUserSelect: 'none', 
            touchAction: 'pan-y', 
            overflow: 'visible',
            minHeight: `${containerHeight}px`,
            height: `${containerHeight}px`,
          }}>
            {/* Coluna de horários */}
            <div className="border-r border-slate-200 select-none md:select-auto" style={{ WebkitUserSelect: 'none' }}>
              {dynamicHours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-slate-500">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Coluna de eventos */}
            <div className="relative select-none md:select-auto" style={{ 
              WebkitUserSelect: 'none', 
              touchAction: 'pan-y',
              minHeight: `${containerHeight}px`,
              height: `${containerHeight}px`,
              overflow: 'visible',
              position: 'relative',
            }}>
              {/* Linha de hora atual */}
              {(() => {
                const isToday = isSameDay(day, currentTime);
                const currentTimePos = isToday ? getCurrentTimePosition(dynamicHours) : null;
                
                if (currentTimePos === null) return null;
                
                return (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{
                      top: `${currentTimePos}px`,
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 z-30" style={{ boxShadow: '0 0 0 2px white' }} />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                );
              })()}
              
              {/* Renderizar todos os eventos da coluna (posicionados absolutamente) */}
                  {(() => {
                // Renderizar apenas eventos que começam em alguma das horas visíveis
                // Usar métodos nativos do Date para garantir valores locais
                const visibleEvents = regularEvents.filter((event) => {
                      const eventHour = event.startDate.getHours();
                  return dynamicHours.includes(eventHour);
                    });
                    
                if (visibleEvents.length === 0) return null;
                    
                    // Ordenar por horário de início
                visibleEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
                    
                    // Agrupar eventos sobrepostos em colunas
                    const columns: CalendarEvent[][] = [];
                    
                visibleEvents.forEach((event) => {
                      let placed = false;
                      
                      // Tentar colocar em uma coluna existente
                      for (let i = 0; i < columns.length; i++) {
                        const canPlace = columns[i].every((existingEvent) => {
                          // Verificar se não há sobreposição
                          return (
                            event.endDate <= existingEvent.startDate ||
                            event.startDate >= existingEvent.endDate
                          );
                        });
                        
                        if (canPlace) {
                          columns[i].push(event);
                          placed = true;
                          break;
                        }
                      }
                      
                      // Se não coube em nenhuma coluna, criar nova
                      if (!placed) {
                        columns.push([event]);
                      }
                    });
                    
                    const totalColumns = columns.length;
                    
                return visibleEvents.map((event) => {
                      const columnIndex = columns.findIndex((col) => col.includes(event));
                      
                      // Garantir que estamos usando métodos locais do Date object
                      // getHours() e getMinutes() do Date retornam valores locais, não UTC
                      // Antes da normalização, verificar o que temos
                      const rawStartHour = event.startDate.getHours();
                      const rawStartMinute = event.startDate.getMinutes();
                      const rawEndHour = event.endDate.getHours();
                      const rawEndMinute = event.endDate.getMinutes();
                      
                      // Normalizar a data novamente para garantir que não há problema de timezone
                      const normalizedStartDate = new Date(
                        event.startDate.getFullYear(),
                        event.startDate.getMonth(),
                        event.startDate.getDate(),
                        event.startDate.getHours(),
                        event.startDate.getMinutes(),
                        event.startDate.getSeconds(),
                        event.startDate.getMilliseconds()
                      );
                      const normalizedEndDate = new Date(
                        event.endDate.getFullYear(),
                        event.endDate.getMonth(),
                        event.endDate.getDate(),
                        event.endDate.getHours(),
                        event.endDate.getMinutes(),
                        event.endDate.getSeconds(),
                        event.endDate.getMilliseconds()
                      );
                      
                      const startHour = normalizedStartDate.getHours();
                      const startMinute = normalizedStartDate.getMinutes();
                      const endHour = normalizedEndDate.getHours();
                      const endMinute = normalizedEndDate.getMinutes();
                      
                  // Calcular posição top absoluta baseada no índice da hora
                  const startHourIndex = dynamicHours.indexOf(startHour);
                  const topOffset = startHourIndex >= 0 
                    ? startHourIndex * hourCellHeight + (startMinute / 60) * hourCellHeight 
                    : 0;
                  
                  // Calcular altura total baseado no horário de término
                  // Usar a diferença real entre as datas para calcular a duração
                  const startTime = normalizedStartDate.getTime();
                  const endTime = normalizedEndDate.getTime();
                  const durationMs = endTime - startTime;
                  const durationMinutes = durationMs / (1000 * 60);
                  
                  // Calcular altura baseada na duração real em minutos
                  const totalHeight = (durationMinutes / 60) * hourCellHeight;
                  
                  const height = Math.max(totalHeight, 32);
                      
                      // Calcular largura e posição baseado na coluna
                      const widthPercent = 100 / totalColumns;
                      const leftPercent = (columnIndex * widthPercent);
                      
                      const isHovered = hoveredEventId === event.id;
                      const isLastColumn = columnIndex === totalColumns - 1;
                      const isFirstColumn = columnIndex === 0;
                      
                      // Ajustar margens para evitar overflow
                      const finalWidth = isHovered 
                        ? 'calc(100% - 16px)' 
                        : `calc(${widthPercent}% - ${isFirstColumn ? '8px' : '4px'} - ${isLastColumn ? '8px' : '4px'})`;
                      const finalLeft = isHovered ? '8px' : `calc(${leftPercent}% + ${isFirstColumn ? '8px' : '4px'})`;

                      return (
                        <div 
                          key={event.id} 
                          className="absolute" 
                          style={{
                            position: 'absolute',
                            top: `${topOffset}px`,
                            left: finalLeft,
                            width: finalWidth,
                            height: isHovered ? 'auto' : `${height}px`,
                            minHeight: `${height}px`,
                            maxHeight: 'none',
                            boxSizing: 'border-box',
                            zIndex: isHovered ? 20 : 10,
                            pointerEvents: 'auto',
                            overflow: 'visible',
                            '--event-height': `${height}px`,
                          } as React.CSSProperties}
                          data-event-height={height}
                          data-duration-minutes={durationMinutes}
                        >
                          {renderEventPopover(event, (
                            <div
                              className={cn(
                                'rounded-lg cursor-pointer group relative',
                                'shadow-sm hover:shadow-lg transition-all duration-200 ease-in-out',
                                'border border-slate-200/50 hover:border-slate-300',
                                'px-2.5 pt-1 pb-2.5'
                              )}
                              style={{
                                backgroundColor: lightenColor(event.professionalColor || event.color, 35, 0.9),
                                borderLeft: `7px solid ${event.statusColor}`,
                                pointerEvents: 'auto',
                                position: 'relative',
                                width: '100%',
                                height: isHovered ? 'auto' : `${height}px`,
                                minHeight: `${height}px`,
                                maxHeight: 'none',
                                overflow: isHovered ? 'visible' : 'hidden',
                                boxSizing: 'border-box',
                              }}
                              onMouseEnter={() => setHoveredEventId(event.id)}
                              onMouseLeave={() => setHoveredEventId(null)}
                            >
                              {/* Overlay branco semi-transparente */}
                              <div className="absolute inset-0 bg-white/40 pointer-events-none" />
                              <div className={cn(
                                'relative z-10 flex items-start justify-between gap-2 transition-all duration-300',
                                isHovered ? 'flex-col' : 'h-full'
                              )}>
                                <div className={cn(
                                  'flex-1 min-w-0 transition-all duration-300',
                                  isHovered ? '' : 'flex flex-col justify-between'
                                )}>
                                  <div>
                                    <div className={cn(
                                      'font-bold leading-tight mb-1.5 transition-all duration-300',
                                      isHovered ? 'text-sm break-words' : 'text-[10px] line-clamp-2',
                                      'text-slate-800'
                                    )}>
                                      {event.name}
                                    </div>
                                    {(isHovered || (durationMinutes >= 60 && height >= 50)) && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                                        <Clock className="h-3 w-3 flex-shrink-0" />
                                        <span>
                                          {format(event.startDate, 'HH:mm', { locale: ptBR })} - {format(event.endDate, 'HH:mm', { locale: ptBR })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {event.professional && (isHovered || (durationMinutes >= 60 && height >= 50)) && (
                                    <div className={cn(
                                      'flex items-center gap-1.5 text-xs text-slate-500',
                                      isHovered ? 'mt-1' : 'mt-auto'
                                    )}>
                                      <User className="h-3 w-3 flex-shrink-0" />
                                      <span className={isHovered ? '' : 'truncate'}>{event.professional.apelido}</span>
                                    </div>
                                  )}
                                </div>
                                {(() => {
                                  const clienteNaoVeio = event.appointment?.clientePresente === false || event.status === 'no_show';
                              const eventoConcluido = event.status === 'concluido' || event.appointment?.clientePresente === true;
                              const eventoConfirmado = event.status === 'confirmado';
                              
                              if (clienteNaoVeio) {
                                return (
                                    <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <UserX className="h-5 w-5 text-red-600" />
                                    </div>
                                );
                              }
                              
                              if (eventoConcluido) {
                                return (
                                    <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                  );
                              }
                              
                              if (eventoConfirmado) {
                                return (
                                  <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                  </div>
                                );
                              }
                              
                              return null;
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
              
                  {dynamicHours.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-slate-100 relative"
                      style={{ pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const clickedDate = setHours(setMinutes(day, 0), hour);
                        // Ignorar apenas "ghost click" após touch (delay curto)
                        if (isTouchDevice() && (Date.now() - lastTouchTimeRef.current) < 300) {
                          return;
                        }
                        onDateClick?.(clickedDate);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const touch = e.touches[0];
                        if (touch) {
                          touchStartYRef.current = touch.clientY;
                          touchStartXRef.current = touch.clientX;
                          lastTouchTimeRef.current = Date.now();
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        const touch = e.changedTouches[0];
                        if (!touch) return;
                        
                        const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
                        const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
                        const deltaTime = Date.now() - lastTouchTimeRef.current;
                        
                        // Se o movimento foi pequeno (< 10px) e rápido (< 300ms), é um clique
                        if (deltaY < 10 && deltaX < 10 && deltaTime < 300) {
                          const clickedDate = setHours(setMinutes(day, 0), hour);
                          onDateClick?.(clickedDate);
                        }
                      }}
                    />
                  ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    // Agrupar eventos por dia para o mês
    const monthEventsByDay: Record<string, CalendarEvent[]> = {};
    
    const birthdayEventsCount = visibleEvents.filter(e => e.id.startsWith('birthday-') || e.appointment?.id?.startsWith('birthday-')).length;
    
    visibleEvents.forEach((event) => {
      const dayKey = format(event.startDate, 'yyyy-MM-dd');
      if (!monthEventsByDay[dayKey]) {
        monthEventsByDay[dayKey] = [];
      }
      monthEventsByDay[dayKey].push(event);
    });

    // Criar grid de calendário mensal
    const firstDayOfMonth = dateRange.monthStart || startOfMonth(currentViewDate);
    const lastDayOfMonth = dateRange.monthEnd || endOfMonth(currentViewDate);
    const startCalendar = startOfWeek(firstDayOfMonth, { locale: ptBR, weekStartsOn: 0 });
    const endCalendar = endOfWeek(lastDayOfMonth, { locale: ptBR, weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: startCalendar, end: endCalendar });

    const weeksCount = Math.ceil(calendarDays.length / 7);

    return (
      <div className="flex flex-col" style={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header com dias da semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => (
            <div key={idx} className="p-2 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs font-medium text-slate-500">{dayName}</div>
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div 
          className="grid grid-cols-7" 
          style={{ gridAutoRows: 'minmax(120px, auto)' }}
          ref={(el) => {
            // Month grid ref
          }}
        >
          {calendarDays.map((day, idx) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = monthEventsByDay[dayKey] || [];
            const isCurrentMonth = day >= firstDayOfMonth && day <= lastDayOfMonth;
            const isToday = isSameDay(day, new Date());
            

            return (
              <div
                key={idx}
                className={cn(
                  'border-r border-b border-slate-200 p-1 min-h-[120px] relative overflow-visible flex flex-col',
                  !isCurrentMonth && 'bg-slate-50',
                  isToday && 'bg-blue-50'
                )}
                style={{ minHeight: '120px' }}
                onClick={(e) => {
                  if ((isTouchDevice() && view === 'week') || (isTouchDevice() && (Date.now() - lastTouchTimeRef.current) < 300)) {
                    // No mobile: só abre via long-press, ignore tap (sem bloquear o scroll)
                    return;
                  }
                  onDateClick?.(day);
                }}
                {...getTouchHandlersForDate(day)}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isToday ? 'text-blue-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {(() => {
                    // Ordenar eventos: aniversários primeiro, depois eventos normais por horário
                    const sortedDayEvents = [...dayEvents].sort((a, b) => {
                      const aIsBirthday = a.id.startsWith('birthday-') || a.appointment?.id?.startsWith('birthday-');
                      const bIsBirthday = b.id.startsWith('birthday-') || b.appointment?.id?.startsWith('birthday-');
                      
                      // Se um é aniversário e o outro não, aniversário vem primeiro
                      if (aIsBirthday && !bIsBirthday) return -1;
                      if (!aIsBirthday && bIsBirthday) return 1;
                      
                      // Se ambos são aniversários ou ambos são normais, ordenar por horário
                      return a.startDate.getTime() - b.startDate.getTime();
                    });
                    
                    return (
                      <>
                        {sortedDayEvents.slice(0, 3).map((event) => {
                      const isHovered = hoveredEventId === event.id;
                      const isEventFromOtherMonth = !isCurrentMonth;
                      
                      return (
                        <div key={event.id} className="overflow-visible">
                      {renderEventPopover(event, (
                        <div
                          className={cn(
                                'text-xs rounded cursor-pointer group relative overflow-visible',
                                'hover:shadow-xl transition-all duration-300 ease-in-out',
                            'border border-slate-200/50 hover:border-slate-300',
                                'p-1 py-0.5',
                                isEventFromOtherMonth && 'opacity-50'
                          )}
                          style={{
                                backgroundColor: lightenColor(event.professionalColor || event.color, 35, isEventFromOtherMonth ? 0.6 : 0.9),
                                borderLeft: `3px solid ${isEventFromOtherMonth ? `${event.statusColor}80` : event.statusColor}`,
                                transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                zIndex: isHovered ? 50 : 'auto',
                                minWidth: isHovered ? '160px' : 'auto',
                                maxWidth: isHovered ? '240px' : '100%',
                                whiteSpace: isHovered ? 'normal' : 'nowrap',
                                wordWrap: isHovered ? 'break-word' : 'normal',
                                pointerEvents: 'auto',
                              }}
                              onMouseEnter={() => setHoveredEventId(event.id)}
                              onMouseLeave={() => setHoveredEventId(null)}
                        >
                          {/* Overlay branco semi-transparente */}
                              <div className={cn(
                                'absolute inset-0 pointer-events-none rounded',
                                isEventFromOtherMonth ? 'bg-white/60' : 'bg-white/40'
                              )} />
                          <div className="relative z-10 flex items-center justify-between gap-1.5">
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                  {(() => {
                                    const isBirthday = event.id.startsWith('birthday-') || event.appointment?.id?.startsWith('birthday-');
                                    if (isBirthday) {
                                      return (
                                        <span className={cn(
                                          'font-bold leading-tight transition-all duration-300',
                                          isHovered ? 'text-sm break-words' : 'text-[10px] truncate',
                                          isEventFromOtherMonth ? 'text-slate-500' : 'text-slate-800'
                                        )}>
                                          {event.name}
                                        </span>
                                      );
                                    }
                                    return (
                                      <>
                                        <span className={cn(
                                          'font-semibold flex-shrink-0 transition-all duration-300',
                                          isHovered ? 'text-xs' : 'text-[9px]',
                                          isEventFromOtherMonth ? 'text-slate-400' : 'text-slate-600'
                                        )}>
                                {format(event.startDate, 'HH:mm')}
                              </span>
                                        <span className={cn(
                                          'font-bold leading-tight transition-all duration-300',
                                          isHovered ? 'text-sm break-words' : 'text-[10px] truncate',
                                          isEventFromOtherMonth ? 'text-slate-500' : 'text-slate-800'
                                        )}>
                                {event.name}
                              </span>
                                      </>
                                    );
                                  })()}
                            </div>
                            {(() => {
                                  const isBirthday = event.id.startsWith('birthday-') || event.appointment?.id?.startsWith('birthday-');
                                  
                                  // Para aniversários, não mostrar ícones de status
                                  if (isBirthday) {
                                    return null;
                                  }
                                  
                              const clienteNaoVeio = event.appointment?.clientePresente === false || event.status === 'no_show';
                                  const eventoConcluido = event.status === 'concluido' || event.appointment?.clientePresente === true;
                                  const eventoConfirmado = event.status === 'confirmado';
                                  
                                  if (clienteNaoVeio) {
                                    return (
                                      <div className={cn(
                                        'flex-shrink-0 opacity-80 group-hover:opacity-100 transition-all duration-300',
                                        isHovered && 'opacity-100'
                                      )}>
                                        <UserX className={cn(
                                          'text-red-600 transition-all duration-300',
                                          isHovered ? 'h-5 w-5' : 'h-4 w-4'
                                        )} />
                                </div>
                                    );
                                  }
                                  
                                  if (eventoConcluido) {
                                    return (
                                      <div className={cn(
                                        'flex-shrink-0 opacity-80 group-hover:opacity-100 transition-all duration-300',
                                        isHovered && 'opacity-100'
                                      )}>
                                        <Check className={cn(
                                          'text-green-600 transition-all duration-300',
                                          isHovered ? 'h-5 w-5' : 'h-4 w-4'
                                        )} />
                                </div>
                              );
                                  }
                                  
                                  if (eventoConfirmado) {
                                    return (
                                      <div className={cn(
                                        'flex-shrink-0 opacity-80 group-hover:opacity-100 transition-all duration-300',
                                        isHovered && 'opacity-100'
                                      )}>
                                        <CheckCircle2 className={cn(
                                          'text-blue-600 transition-all duration-300',
                                          isHovered ? 'h-5 w-5' : 'h-4 w-4'
                                        )} />
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                      );
                    })}
                        {sortedDayEvents.length > 3 && (
                    <div 
                      className="text-xs text-slate-500 px-1 cursor-pointer hover:text-slate-700 hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Normalizar a data para meia-noite para garantir que seja o dia correto
                        const normalizedDay = startOfDay(day);
                        // Marcar como mudança interna para notificar o componente pai após o render
                        isInternalChangeRef.current = true;
                        // Atualizar a data no componente local primeiro
                        setCurrentViewDate(normalizedDay);
                        // Mudar a visualização
                        onViewChange?.('day');
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      +{sortedDayEvents.length - 3} mais
                    </div>
                  )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (view) {
      case 'day':
        return format(currentViewDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week':
        const weekStart = startOfWeek(currentViewDate, { locale: ptBR, weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentViewDate, { locale: ptBR, weekStartsOn: 0 });
        return `${format(weekStart, 'd', { locale: ptBR })} - ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
      case 'month':
        return format(currentViewDate, "MMMM 'de' yyyy", { locale: ptBR });
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex flex-col bg-white rounded-lg border border-slate-200', className)} style={{ minHeight: 0, flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header com controles */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 landscape:p-2 landscape:py-1">
        <div className="flex items-center gap-2 landscape:gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('prev')}
            className="h-8 w-8 landscape:h-6 landscape:w-6"
          >
            <ChevronLeft className="h-4 w-4 landscape:h-3 landscape:w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
            className="h-8 w-8 landscape:h-6 landscape:w-6"
          >
            <ChevronRight className="h-4 w-4 landscape:h-3 landscape:w-3" />
          </Button>
          <Button
            variant="outline"
            onClick={goToToday}
            className="h-8 px-3 text-sm landscape:h-6 landscape:px-2 landscape:text-xs"
          >
            Hoje
          </Button>
        </div>

        <div className="text-lg font-semibold text-slate-900 capitalize landscape:text-sm landscape:truncate px-2">
          {getViewTitle()}
        </div>

        <div className="w-20 landscape:w-12"></div>
      </div>

      {/* Corpo do calendário */}
      <div 
        className="flex-1 overflow-x-hidden overflow-visible sm:overflow-y-auto" 
        style={{ 
          width: '100%', 
          minHeight: 0, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column'
        }}
        ref={(el) => {
          if (el) {
            // Usar setTimeout para garantir que o conteúdo foi renderizado
            setTimeout(() => {
              const dayView = el.querySelector('[data-view="day"]');
              const weekView = el.querySelector('[data-view="week"]');
              const monthView = el.querySelector('[data-view="month"]');
            }, 300);
          }
        }}
      >
        {view === 'day' && <div data-view="day">{renderDayView()}</div>}
        {view === 'week' && <div data-view="week">{renderWeekView()}</div>}
        {view === 'month' && <div data-view="month">{renderMonthView()}</div>}
      </div>

      {/* Modal de mensagem de aniversário */}
      {selectedBirthdayEvent && selectedBirthdayEvent.patient && (
        <BirthdayMessageModal
          isOpen={birthdayModalOpen}
          onClose={() => {
            setBirthdayModalOpen(false);
            setSelectedBirthdayEvent(null);
          }}
          patientId={selectedBirthdayEvent.patient.id}
          patientFirstName={selectedBirthdayEvent.patient.nome.split(' ')[0]}
          patientPhone={selectedBirthdayEvent.patient.telefoneE164}
          birthdayDate={selectedBirthdayEvent.startDate}
        />
      )}
    </div>
  );
}

