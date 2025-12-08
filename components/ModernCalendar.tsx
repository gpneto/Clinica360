'use client';

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactLightweightCalendar from 'react-lightweight-calendar';
import { Appointment, Professional, Service, Patient } from '@/types';
import { cn } from '@/lib/utils';

// Configuração de locale pt-BR para o calendário
const calendarLocale = ptBR;

interface CalendarEvent {
  id: string;
  startDate: string;
  endDate: string;
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

type CalendarView = 'MONTH' | 'WEEK' | 'WEEK_TIME' | 'DAY';

interface ModernCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  view?: CalendarView;
  onDateClick?: (date: Date | string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onViewChange?: (view: CalendarView) => void;
  className?: string;
}

export function ModernCalendar({
  events,
  currentDate,
  view = 'WEEK_TIME',
  onDateClick,
  onEventClick,
  onViewChange,
  className,
}: ModernCalendarProps) {
  const handleDateClick = useCallback(
    (day: string | Date) => {
      if (onDateClick) {
        onDateClick(day);
      }
    },
    [onDateClick]
  );

  const handleItemClick = useCallback(
    (item: Record<string, any>) => {
      if (onEventClick && item.appointment) {
        onEventClick(item as CalendarEvent);
      }
    },
    [onEventClick]
  );

  const calendarData = useMemo(() => {
    const mappedData = events.map((event, index) => {
      // Garantir que as datas estejam no formato ISO correto (já são strings)
      let startDate = event.startDate;
      let endDate = event.endDate;

      // Manter as datas como estão (sem timezone)
      // O react-lightweight-calendar deve interpretar datas sem timezone como local


      return {
        id: event.id,
        startDate: startDate,
        endDate: endDate,
        name: event.name,
        appointment: event.appointment,
        professionalColor: event.professionalColor,
        status: event.status,
        statusColor: event.statusColor,
        professional: event.professional,
        service: event.service,
        patient: event.patient,
        color: event.color,
      };
    });

    return mappedData;
  }, [events]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Efeito para ocultar horas fora do range 08:00 - 20:00 (apenas para visualizações com tempo)
  useEffect(() => {
    // Só aplicar para visualizações que mostram horas
    if (view !== 'WEEK_TIME' && view !== 'DAY' && view !== 'WEEK') {
      return;
    }

    const hideHoursOutsideRange = () => {
      if (!containerRef.current) return;

      // Horas a ocultar: 0-7 (00:00-07:59) e 21-23 (21:00-23:59)
      const hoursToHide = [0, 1, 2, 3, 4, 5, 6, 7, 21, 22, 23];

      hoursToHide.forEach((hour) => {
        const hourStr = hour.toString().padStart(2, '0');
        
        // Múltiplos seletores para encontrar elementos de hora
        const selectors = [
          `[data-hour="${hour}"]`,
          `[data-hour="${hourStr}"]`,
          `tr[data-hour="${hour}"]`,
          `tr[data-hour="${hourStr}"]`,
          `td[data-hour="${hour}"]`,
          `td[data-hour="${hourStr}"]`,
          `th[data-hour="${hour}"]`,
          `th[data-hour="${hourStr}"]`,
          `[class*="hour-${hour}"]`,
          `[class*="hour-${hourStr}"]`,
          `[class*="hour_${hour}"]`,
          `[class*="hour_${hourStr}"]`,
        ];

        selectors.forEach((selector) => {
          try {
            const elements = containerRef.current!.querySelectorAll(selector);
            elements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.display = 'none';
              htmlEl.style.visibility = 'hidden';
              htmlEl.style.height = '0';
              htmlEl.style.overflow = 'hidden';
              htmlEl.style.padding = '0';
              htmlEl.style.margin = '0';
            });
          } catch (e) {
            // Ignorar seletores inválidos
          }
        });

        // Procurar por linhas da tabela que contenham a hora no texto
        const allRows = containerRef.current!.querySelectorAll('tr');
        allRows.forEach((row) => {
          const htmlRow = row as HTMLElement;
          const text = htmlRow.textContent || '';
          
          // Procurar por padrões de hora (ex: "00:00", "01:00", "21:00", etc.)
          const hourPatterns = [
            new RegExp(`\\b${hourStr}:\\d{2}\\b`),
            new RegExp(`\\b${hour}:\\d{2}\\b`),
            new RegExp(`^${hourStr}:`),
            new RegExp(`^${hour}:`),
          ];
          
          const hasHour = hourPatterns.some(pattern => pattern.test(text));
          
          if (hasHour) {
            htmlRow.style.display = 'none';
            htmlRow.style.visibility = 'hidden';
            htmlRow.style.height = '0';
            htmlRow.style.overflow = 'hidden';
            
            // Também ocultar células dentro da linha
            const cells = htmlRow.querySelectorAll('td, th');
            cells.forEach((cell) => {
              const htmlCell = cell as HTMLElement;
              htmlCell.style.display = 'none';
              htmlCell.style.visibility = 'hidden';
              htmlCell.style.height = '0';
              htmlCell.style.overflow = 'hidden';
            });
          }
        });

        // Procurar por células individuais que contenham a hora
        const allCells = containerRef.current!.querySelectorAll('td, th');
        allCells.forEach((cell) => {
          const htmlCell = cell as HTMLElement;
          const text = htmlCell.textContent?.trim() || '';
          
          // Verificar se o texto é exatamente uma hora (ex: "00:00", "01:00")
          const hourMatch = text.match(/^(\d{1,2}):\d{2}$/);
          if (hourMatch) {
            const hourInText = parseInt(hourMatch[1], 10);
            if (hoursToHide.includes(hourInText)) {
              htmlCell.style.display = 'none';
              htmlCell.style.visibility = 'hidden';
              htmlCell.style.height = '0';
              htmlCell.style.overflow = 'hidden';
              
              // Ocultar a linha pai se todas as células estiverem ocultas
              const parentRow = htmlCell.closest('tr');
              if (parentRow) {
                const visibleCells = Array.from(parentRow.querySelectorAll('td, th')).filter(
                  (c) => (c as HTMLElement).style.display !== 'none'
                );
                if (visibleCells.length === 0) {
                  (parentRow as HTMLElement).style.display = 'none';
                }
              }
            }
          }
        });
      });
    };

    // Executar imediatamente
    hideHoursOutsideRange();

    // Usar MutationObserver para detectar quando o calendário renderiza
    const observer = new MutationObserver(() => {
      hideHoursOutsideRange();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-hour'],
      });
    }

    // Executar múltiplas vezes para garantir
    const timeouts = [
      setTimeout(hideHoursOutsideRange, 100),
      setTimeout(hideHoursOutsideRange, 300),
      setTimeout(hideHoursOutsideRange, 500),
      setTimeout(hideHoursOutsideRange, 1000),
    ];

    // Intervalo para verificar periodicamente
    const interval = setInterval(hideHoursOutsideRange, 2000);

    return () => {
      observer.disconnect();
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [calendarData, view]);

  return (
    <>
      <style jsx global>{`
        /* Limitar horários visíveis das 08:00 às 20:00 no react-lightweight-calendar */
        .modern-calendar-container table tbody tr[data-hour="0"],
        .modern-calendar-container table tbody tr[data-hour="1"],
        .modern-calendar-container table tbody tr[data-hour="2"],
        .modern-calendar-container table tbody tr[data-hour="3"],
        .modern-calendar-container table tbody tr[data-hour="4"],
        .modern-calendar-container table tbody tr[data-hour="5"],
        .modern-calendar-container table tbody tr[data-hour="6"],
        .modern-calendar-container table tbody tr[data-hour="7"],
        .modern-calendar-container table tbody tr[data-hour="21"],
        .modern-calendar-container table tbody tr[data-hour="22"],
        .modern-calendar-container table tbody tr[data-hour="23"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Ocultar células de hora fora do range */
        .modern-calendar-container [data-hour="0"],
        .modern-calendar-container [data-hour="1"],
        .modern-calendar-container [data-hour="2"],
        .modern-calendar-container [data-hour="3"],
        .modern-calendar-container [data-hour="4"],
        .modern-calendar-container [data-hour="5"],
        .modern-calendar-container [data-hour="6"],
        .modern-calendar-container [data-hour="7"],
        .modern-calendar-container [data-hour="21"],
        .modern-calendar-container [data-hour="22"],
        .modern-calendar-container [data-hour="23"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }

      `}</style>
      <div ref={containerRef} className={cn('w-full h-full modern-calendar-container', className)}>
      <ReactLightweightCalendar
        data={calendarData}
        onItemClick={handleItemClick}
        onDayStringClick={handleDateClick}
        currentDate={format(currentDate, 'yyyy-MM-dd', { locale: calendarLocale })}
        currentView={view}
        locale={calendarLocale}
        weekStartsOn={0}
        activeTimeDateField={view === 'WEEK_TIME' || view === 'DAY' ? "startDate" : undefined}
        renderItem={(data, isHovered) => {
          const event = data as CalendarEvent;
          const bgColor = event.professionalColor || event.color || '#3b82f6';
          const statusColor = event.statusColor || '#3b82f6';
          const isMonthView = view === 'MONTH';
          const showTime = !isMonthView && (view === 'WEEK_TIME' || view === 'DAY' || view === 'WEEK');

          return (
            <div
              className={cn(
                'relative rounded-lg p-2 text-white text-sm font-medium shadow-md transition-all duration-300 ease-in-out cursor-pointer',
                isHovered && 'shadow-2xl z-50',
                isMonthView && 'p-1 text-xs'
              )}
              style={{
                backgroundColor: bgColor,
                borderLeft: `4px solid ${statusColor}`,
                borderRight: `4px solid ${statusColor}`,
                transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(isHovered && isMonthView && {
                  minWidth: '180px',
                  maxWidth: '250px',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                }),
              }}
            >
              <div className={cn(
                'flex items-center gap-1',
                isMonthView && 'flex-col items-start gap-0',
                isHovered && isMonthView && 'gap-1'
              )}>
                {showTime && (
                  <span className={cn(
                    'text-xs',
                    isMonthView && 'text-[10px]',
                    isHovered && isMonthView && 'text-sm font-semibold'
                  )}>
                    {format(new Date(event.startDate), 'HH:mm', { locale: calendarLocale })}
                  </span>
                )}
                <span className={cn(
                  'truncate',
                  isMonthView && 'text-[10px] leading-tight',
                  isHovered && isMonthView && 'text-sm font-semibold leading-snug break-words'
                )}>
                  {event.name}
                </span>
              </div>
            </div>
          );
        }}
      />
      </div>
    </>
  );
}

