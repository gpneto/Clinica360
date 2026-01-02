import { useState, useMemo, type CSSProperties, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, DollarSign, MapPin, Phone, CheckCircle, X, UserX, Repeat, MessageSquare } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Appointment, Professional, Service, Patient } from '@/types';
import { useServices } from '@/hooks/useFirestore';
import moment from 'moment';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface CalendarEventProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resourceId: string;
    color: string;
    appointment: Appointment;
    professionalColor?: string;
    professionalGradient?: string;
    professionalTextColor?: string;
    professionalBoxShadow?: string;
  };
  professional?: Professional;
  service?: Service;
  patient?: Patient;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
}

const STATUS_STYLES: Record<
  string,
  {
    label: string;
    color: string;
    gradient: string;
    neutralBadgeBg: string;
    neutralBadgeText: string;
    vibrantShadow: string;
    dotShadow: string;
  }
> = {
  agendado: {
    label: 'Agendado',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, rgba(37,99,235,0.9), rgba(129,140,248,0.65))',
    neutralBadgeBg: 'rgba(37,99,235,0.12)',
    neutralBadgeText: '#1d4ed8',
    vibrantShadow: '0 16px 30px rgba(79,70,229,0.25)',
    dotShadow: '0 0 0 4px rgba(37,99,235,0.15)',
  },
  confirmado: {
    label: 'Confirmado',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.9), rgba(59,130,246,0.6))',
    neutralBadgeBg: 'rgba(14,165,233,0.12)',
    neutralBadgeText: '#075985',
    vibrantShadow: '0 16px 30px rgba(59,130,246,0.25)',
    dotShadow: '0 0 0 4px rgba(59,130,246,0.15)',
  },
  pendente: {
    label: 'Pendente',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(251,191,36,0.65))',
    neutralBadgeBg: 'rgba(245,158,11,0.15)',
    neutralBadgeText: '#92400e',
    vibrantShadow: '0 16px 30px rgba(251,191,36,0.28)',
    dotShadow: '0 0 0 4px rgba(245,158,11,0.18)',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.92), rgba(148,163,184,0.6))',
    neutralBadgeBg: 'rgba(107,114,128,0.18)',
    neutralBadgeText: '#374151',
    vibrantShadow: '0 16px 30px rgba(107,114,128,0.28)',
    dotShadow: '0 0 0 4px rgba(107,114,128,0.18)',
  },
  concluido: {
    label: 'Concluído',
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.6))',
    neutralBadgeBg: 'rgba(34,197,94,0.12)',
    neutralBadgeText: '#166534',
    vibrantShadow: '0 16px 30px rgba(34,197,94,0.28)',
    dotShadow: '0 0 0 4px rgba(34,197,94,0.18)',
  },
  no_show: {
    label: 'Faltou',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(244,114,182,0.6))',
    neutralBadgeBg: 'rgba(239,68,68,0.16)',
    neutralBadgeText: '#b91c1c',
    vibrantShadow: '0 16px 30px rgba(239,68,68,0.28)',
    dotShadow: '0 0 0 4px rgba(239,68,68,0.18)',
  },
};

const DEFAULT_STATUS_STYLE = STATUS_STYLES.agendado;

export function CalendarEvent({
  event,
  professional,
  service,
  patient,
  onEdit,
  onDelete,
  onComplete
}: CalendarEventProps) {
  const { appointment } = event;
  const { services } = useServices(appointment.companyId);
  
  // Obter todos os serviços do agendamento
  const appointmentServices = useMemo(() => {
    if (appointment.serviceIds && appointment.serviceIds.length > 0) {
      const found = services.filter(s => appointment.serviceIds!.includes(s.id));
      return found;
    } else if (service) {
      return [service];
    }
    return [];
  }, [appointment.serviceIds, services, service]);
  const router = useRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isBlock = appointment.isBlock || appointment.status === 'bloqueio';
  const isRecurring = Boolean(appointment.recurrenceGroupId);
  const blockScopeLabel =
    appointment.blockScope === 'all' || appointment.professionalId === '__all__'
      ? 'Todos os profissionais'
      : 'Profissional específico';
  const { themePreference } = useAuth();
  const isVibrant = themePreference === 'vibrant';
  const derivedStatus = appointment.clientePresente === false ? 'no_show' : (appointment.status ?? 'agendado');
  const statusStyles = STATUS_STYLES[derivedStatus] ?? DEFAULT_STATUS_STYLE;
  const statusColor = statusStyles.color;
  const eventColor = event.professionalColor ?? statusColor;
  const eventGradient = event.professionalGradient ?? statusStyles.gradient;
  const isNoShow = appointment.clientePresente === false;
  const eventTextColor =
    event.professionalTextColor ??
    (isNoShow ? '#b91c1c' : isVibrant ? '#000000' : '#1f2937');
  const showProfessionalIndicator = !isBlock && Boolean(event.professionalGradient || event.professionalColor);

  const topIndicatorStyle: CSSProperties = {
    background: isVibrant ? statusStyles.gradient : statusColor,
    opacity: isVibrant ? 0.95 : 1,
  };
  const leftIndicatorStyle: CSSProperties = {
    background: statusColor,
    opacity: isVibrant ? 0.85 : 1,
  };
  const rightIndicatorStyle: CSSProperties | undefined = showProfessionalIndicator
    ? {
        background: event.professionalGradient ?? event.professionalColor ?? statusColor,
        opacity: isVibrant ? 0.9 : 1,
      }
    : undefined;
  const containerStyle: CSSProperties = {
    color: eventTextColor,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  };

  const getPatientInitials = (name?: string | null) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      case 'agendado': return 'bg-yellow-500';
      case 'concluido': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      case 'agendado': return 'Agendado';
      case 'concluido': return 'Concluído';
      case 'pendente': return 'Pendente';
      case 'no_show': return 'Faltou';
      default: return 'Desconhecido';
    }
  };

  const handlePatientClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!patient?.id) return;
    router.push(`/pacientes/detalhe?patientId=${patient.id}`);
    setIsPopoverOpen(false);
  };

  if (isBlock) {
    const description = appointment.blockDescription || appointment.observacoes || 'Bloqueio de agenda';
    const blockIndicatorColor = '#111827';
    const blockContainerClass = isVibrant
      ? 'border border-white/25 bg-white/85 text-slate-800 shadow-lg hover:shadow-xl backdrop-blur'
      : 'border border-slate-200 bg-white text-slate-800 shadow-md hover:shadow-lg';
    const blockAvatarClass = isVibrant
      ? 'border border-violet-300 bg-violet-100 text-violet-700'
      : 'border border-slate-300 bg-slate-200 text-slate-600';
    const blockTitleClass = isVibrant ? 'text-violet-800' : 'text-slate-800';
    const blockMetaClass = isVibrant ? 'text-violet-600' : 'text-slate-500';

    const blockTopIndicatorStyle: CSSProperties = {
      background: isVibrant
        ? `linear-gradient(135deg, ${blockIndicatorColor}ee, ${blockIndicatorColor}cc)`
        : blockIndicatorColor,
      opacity: isVibrant ? 0.95 : 1,
    };
    const blockLeftIndicatorStyle: CSSProperties = {
      background: blockIndicatorColor,
      opacity: isVibrant ? 0.85 : 1,
    };
    const blockContainerStyle: CSSProperties = {
      borderLeft: `4px solid ${blockIndicatorColor}`,
      boxShadow: isVibrant ? '0 18px 32px rgba(124,58,237,0.22)' : undefined,
    };

    return (
      <TooltipProvider>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`calendar-event relative overflow-hidden cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all duration-150 ${blockContainerClass}`}
              style={blockContainerStyle}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={blockTopIndicatorStyle} />
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={blockLeftIndicatorStyle} />

              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-[10px] font-semibold uppercase flex items-center justify-center ${blockAvatarClass}`}>
                  B
                  </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold leading-tight truncate ${blockTitleClass}`}>
                    Bloqueado
                  </p>
                  <div className={`flex items-center gap-1 text-[11px] leading-tight -mt-1 ${blockMetaClass}`}>
                    <span className="font-medium">
                      {moment(appointment.inicio).format('HH:mm')} - {moment(appointment.fim).format('HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </PopoverTrigger>

          <PopoverContent
            side={isPopoverOpen ? "top" : undefined}
            align="center"
            sideOffset={12}
            avoidCollisions={true}
            collisionPadding={{ top: 24, bottom: 24, left: 24, right: 24 }}
            className="w-[min(24rem,calc(100vw-48px))] max-h-[min(600px,calc(100vh-48px))] overflow-y-auto p-0"
            style={{
              maxWidth: 'var(--radix-popover-content-available-width, min(24rem, calc(100vw - 48px)))',
              maxHeight: 'var(--radix-popover-content-available-height, min(600px, calc(100vh - 48px)))',
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-violet-100"
            >
              <div className="relative">
                <div 
                  className="h-2 w-full"
                  style={{ backgroundColor: event.color }}
                />
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/30" />
              </div>

              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center shadow-sm">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Bloqueio de agenda</h3>
                      <p className="text-xs text-gray-500">{moment(appointment.inicio).format('DD/MM/YYYY')}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPopoverOpen(false)}
                    className="h-6 w-6 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </Button>
                </div>

                <div className="rounded-lg p-3 border border-violet-100 bg-violet-50 text-violet-800">
                  <p className="text-xs font-semibold uppercase tracking-wide">Descrição</p>
                  <p className="text-sm leading-relaxed mt-1">{description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-1">Horário</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {moment(appointment.inicio).format('HH:mm')} - {moment(appointment.fim).format('HH:mm')}
                    </p>
                  </div>
                  <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-1">Escopo</p>
                    <p className="text-sm font-semibold text-slate-900">{blockScopeLabel}</p>
                  </div>
                </div>

                {appointment.blockScope === 'single' && professional && (
                  <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-1">Profissional</p>
                    <p className="text-sm font-semibold text-slate-900">{professional.apelido}</p>
                  </div>
                )}

                <div className="sticky bottom-0 left-0 right-0 flex gap-2 pt-2 border-t border-gray-200 bg-white">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onEdit?.(appointment);
                      setIsPopoverOpen(false);
                    }}
                    className="flex-1 border-2 hover:bg-violet-50 hover:border-violet-300 transition-all duration-200"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete?.(appointment);
                      setIsPopoverOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>
            </motion.div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'calendar-event relative overflow-hidden cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all duration-150',
                isNoShow ? 'text-red-900' : '',
                isVibrant ? 'backdrop-blur' : ''
              )}
              style={containerStyle}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={topIndicatorStyle} />
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={leftIndicatorStyle} />
              {showProfessionalIndicator && (
                <div className="absolute right-0 top-0 bottom-0 w-1.5" style={rightIndicatorStyle} />
              )}

              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full border text-[10px] font-semibold uppercase flex items-center justify-center ${
                  appointment.clientePresente === false 
                    ? 'bg-red-100 border-red-200 text-red-700' 
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  {getPatientInitials(patient?.nome)}
                </div>
                {appointment.criadoViaWhatsapp && (
                  <div title="Criado via WhatsApp">
                    <MessageSquare className="w-3 h-3 text-green-600 flex-shrink-0" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-0">
                  <p className="text-[13px] font-semibold leading-tight truncate pr-1 text-slate-900">
                    {patient?.nome || 'Paciente'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 leading-tight -mt-0.5">
                    <span className="truncate">
                      {appointmentServices.length > 0
                        ? appointmentServices.length === 1
                          ? appointmentServices[0].nome
                          : `${appointmentServices.length} serviços`
                        : service?.nome || 'Serviço'}
                    </span>
                    <span
                      className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: eventColor }}
                    />
                    <span className="font-medium">
                      {moment(appointment.inicio).format('HH:mm')} - {moment(appointment.fim).format('HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </PopoverTrigger>
        
        <PopoverContent
          side={isPopoverOpen ? "top" : undefined}
          align="center"
          sideOffset={12}
          avoidCollisions={true}
          collisionPadding={{ top: 24, bottom: 24, left: 24, right: 24 }}
          className="w-[min(24rem,calc(100vw-48px))] max-h-[min(600px,calc(100vh-48px))] overflow-y-auto p-0"
          style={{
            maxWidth: 'var(--radix-popover-content-available-width, min(24rem, calc(100vw - 48px)))',
            maxHeight: 'var(--radix-popover-content-available-height, min(600px, calc(100vh - 48px)))',
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200"
          >
            {/* Header com gradiente */}
            <div className="relative">
              <div 
                className="h-2 w-full"
                style={{ background: eventGradient }}
              />
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/30" />
            </div>
            
            <div className="p-3">
              {/* Header com data e status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-sm">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Detalhes do Agendamento</h3>
                    <p className="text-xs text-gray-500">{moment(appointment.inicio).format('DD/MM/YYYY')}</p>
                    {appointmentServices.length > 0 && (
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {appointmentServices.length === 1
                          ? appointmentServices[0].nome
                          : `${appointmentServices.length} serviços`}
                      </p>
                    )}
                    {appointmentServices.length === 0 && service && (
                      <p className="text-sm font-semibold text-gray-700 mt-1">{service.nome}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                {isRecurring && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-xs px-3 py-1 font-semibold border-indigo-200 text-indigo-600 bg-indigo-50"
                  >
                    <Repeat className="w-3 h-3" />
                    Recorrente
                  </Badge>
                )}
                {appointment.criadoViaWhatsapp && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-xs px-3 py-1 font-semibold border-green-200 text-green-700 bg-green-50"
                    title="Agendamento criado pelo cliente via WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp
                  </Badge>
                )}
                  <Badge 
                    variant={appointment.status === 'confirmado' ? 'success' : 
                            appointment.status === 'cancelado' ? 'destructive' : 
                            appointment.status === 'concluido' ? 'default' : 'secondary'}
                    className="text-xs px-3 py-1 font-semibold"
                  >
                    {getStatusText(appointment.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPopoverOpen(false)}
                    className="h-6 w-6 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </Button>
                </div>
              </div>

              {/* Informações principais */}
              <div className="space-y-3">
                {/* Serviço e Horário */}
                <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-900 text-white text-xs font-semibold">
                      <Clock className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      {appointmentServices.length > 0 ? (
                        <>
                          {appointmentServices.length === 1 ? (
                            <h4 className="font-semibold text-slate-900 text-sm">{appointmentServices[0].nome}</h4>
                          ) : (
                            <div className="space-y-1">
                              <h4 className="font-semibold text-slate-900 text-sm">
                                {appointmentServices.length} Serviços
                              </h4>
                              <div className="space-y-0.5">
                                {appointmentServices.map((svc, idx) => (
                                  <p key={svc.id} className="text-xs text-slate-600">
                                    • {svc.nome}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <h4 className="font-semibold text-slate-900 text-sm">{service?.nome || 'Serviço'}</h4>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        <p className="text-sm font-semibold">
                          {moment(appointment.inicio).format('HH:mm')} - {moment(appointment.fim).format('HH:mm')}
                        </p>
                        <span className="text-xs text-slate-500">
                          ({Math.round((appointment.fim.getTime() - appointment.inicio.getTime()) / (1000 * 60))} min)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {isRecurring && (
                  <div className="rounded-lg p-3 border border-indigo-200 bg-indigo-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-indigo-500 text-white text-xs font-semibold shadow-sm">
                        <Repeat className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-indigo-900 text-sm">Recorrência ativa</h4>
                        <p className="text-xs text-indigo-600 uppercase tracking-wide font-semibold mt-0.5">
                          {(() => {
                            switch (appointment.recurrenceFrequency) {
                              case 'daily':
                                return 'Diariamente';
                              case 'biweekly':
                                return 'A cada 15 dias';
                              case 'monthly':
                                return 'Mensalmente';
                              case 'weekly':
                              default:
                                return 'Semanalmente';
                            }
                          })()}
                        </p>
                        {appointment.recurrenceEndsAt && (
                          <p className="text-xs text-indigo-700 mt-1">
                            Até {moment(appointment.recurrenceEndsAt).format('DD/MM/YYYY')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cliente */}
                <div
                  className={`rounded-lg p-3 border ${
                    appointment.clientePresente === false
                      ? 'border-red-200 bg-red-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-sm ${
                      appointment.clientePresente === false ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                      {appointment.clientePresente === false ? (
                        <UserX className="w-3 h-3 text-white" />
                      ) : (
                        <User className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePatientClick}
                          disabled={!patient?.id}
                          className="font-semibold text-slate-900 text-sm hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded disabled:cursor-default disabled:text-slate-400"
                        >
                          {patient?.nome || 'Paciente'}
                        </button>
                        {appointment.clientePresente === false && (
                          <Badge variant="destructive" className="text-xs px-2 py-0.5">
                            Não Compareceu
                          </Badge>
                        )}
                      </div>
                      {patient?.telefoneE164 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className={`w-3 h-3 ${
                            appointment.clientePresente === false ? 'text-red-600' : 'text-emerald-600'
                          }`} />
                          <p className="text-sm font-semibold text-slate-700">{patient.telefoneE164}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profissional */}
                {professional && (
                  <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: professional.corHex }}
                      >
                        {professional.apelido.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm">{professional.apelido}</h4>
                        <p className="text-sm text-slate-500">Profissional responsável</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preço e Comissão */}
                <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-900 text-white text-xs font-semibold">
                      <DollarSign className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900 text-sm">
                          R$ {(appointment.precoCentavos / 100).toFixed(2)}
                        </h4>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                          {appointment.comissaoPercent}% comissão
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Valor total do serviço
                      </p>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {appointment.observacoes && (
                  <div className="rounded-lg p-3 border border-slate-200 bg-white">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-200 text-slate-600">
                        <MapPin className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Observações</h4>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                          {appointment.observacoes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="sticky bottom-0 left-0 right-0 mt-3 flex gap-2 border-t border-gray-200 bg-white pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onEdit?.(appointment);
                    setIsPopoverOpen(false);
                  }}
                  className="flex-1 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  <User className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                {appointment.status !== 'concluido' && appointment.status !== 'cancelado' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onComplete?.(appointment);
                      setIsPopoverOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Concluir
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete?.(appointment);
                    setIsPopoverOpen(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
    </>
  );
}
