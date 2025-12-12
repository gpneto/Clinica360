'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { format, startOfDay, endOfDay, isSameDay, getHours, getMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, useServices, usePatients, useCompany } from '@/hooks/useFirestore';
import { hasFullFinancialAccess } from '@/lib/permissions';
import { Appointment, Patient } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Gift,
  ArrowRight,
  CalendarDays,
  UserCheck,
  Sparkles,
  User,
  Phone,
  UserX,
  Repeat,
  MapPin,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import moment from 'moment';

interface DashboardProps {
  onViewAppointment?: (appointment: Appointment) => void;
  onCompleteClick?: (appointment: Appointment) => void;
}

interface AppointmentItemProps {
  appointment: Appointment;
  patientName: string;
  serviceNames: string;
  time: string;
  professional?: any;
  patient?: Patient | null;
  appointmentServices: any[];
  hasGradient: boolean;
  onViewAppointment?: (appointment: Appointment) => void;
  onCompleteClick?: (appointment: Appointment) => void;
  getStatusBadge: (appointment: Appointment) => React.JSX.Element;
}

function AppointmentItem({
  appointment,
  patientName,
  serviceNames,
  time,
  professional,
  patient,
  appointmentServices,
  hasGradient,
  onViewAppointment,
  onCompleteClick,
  getStatusBadge
}: AppointmentItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const getAppointmentDate = (date: Date | string | undefined | null): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') return parseISO(date);
    return new Date();
  };
  const isRecurring = Boolean(appointment.recurrenceGroupId);
  const derivedStatus = appointment.clientePresente === false ? 'no_show' : (appointment.status ?? 'agendado');
  const statusColor = derivedStatus === 'concluido' ? '#16a34a' : 
                    derivedStatus === 'cancelado' ? '#6b7280' :
                    derivedStatus === 'pendente' ? '#f59e0b' :
                    derivedStatus === 'no_show' ? '#ef4444' : '#2563eb';
  const statusGradient = `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-all hover:shadow-sm"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-slate-100">
              <Clock className="h-4 w-4 mb-1 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">
                {time}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-slate-900">
                {patientName}
              </p>
              <p className="text-sm truncate text-slate-600">
                {serviceNames}
              </p>
              {professional && (
                <p className="text-xs mt-1 text-slate-500">
                  {professional.apelido || professional.nome}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(appointment)}
            </div>
          </div>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent
        className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col bg-transparent border-0 shadow-none"
      >
        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-lg flex flex-col max-h-[85vh]">
          {/* Header com gradiente */}
          <div className="relative flex-shrink-0">
            <div 
              className="h-2 w-full"
              style={{ background: statusGradient }}
            />
            <div className="absolute top-0 left-0 right-0 h-2 bg-white/30" />
          </div>
          
          {/* Header fixo */}
          <div className="p-4 flex-shrink-0 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-sm">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Detalhes do Agendamento</h3>
                  <p className="text-xs text-gray-500">
                    {format(getAppointmentDate(appointment.inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
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
                <Badge 
                  variant={appointment.status === 'confirmado' ? 'default' : 
                          appointment.status === 'cancelado' ? 'destructive' : 
                          appointment.status === 'concluido' ? 'default' : 'secondary'}
                  className="text-xs px-3 py-1 font-semibold"
                >
                  {derivedStatus === 'concluido' ? 'Concluído' :
                   derivedStatus === 'cancelado' ? 'Cancelado' :
                   derivedStatus === 'pendente' ? 'Pendente' :
                   derivedStatus === 'no_show' ? 'Faltou' : 'Agendado'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Área de conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 space-y-3">
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
                              {appointmentServices.map((svc) => (
                                <p key={svc.id} className="text-xs text-slate-600">
                                  • {svc.nome}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <h4 className="font-semibold text-slate-900 text-sm">{serviceNames || 'Serviço'}</h4>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <p className="text-sm font-semibold">
                        {format(getAppointmentDate(appointment.inicio), 'HH:mm', { locale: ptBR })} - {format(getAppointmentDate(appointment.fim), 'HH:mm', { locale: ptBR })}
                      </p>
                      <span className="text-xs text-slate-500">
                        ({Math.round((new Date(appointment.fim).getTime() - new Date(appointment.inicio).getTime()) / (1000 * 60))} min)
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
                        {appointment.recurrenceFrequency === 'daily' ? 'Diariamente' :
                         appointment.recurrenceFrequency === 'biweekly' ? 'A cada 15 dias' :
                         appointment.recurrenceFrequency === 'monthly' ? 'Mensalmente' :
                         appointment.recurrenceFrequency === 'custom' ? 'Personalizada' :
                         'Semanalmente'}
                      </p>
                      {appointment.recurrenceEndsAt && (
                        <p className="text-xs text-indigo-700 mt-1">
                          Até {format(getAppointmentDate(appointment.recurrenceEndsAt), 'dd/MM/yyyy', { locale: ptBR })}
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
                      <span className="font-semibold text-slate-900 text-sm">
                        {patientName}
                      </span>
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
          </div>

          {/* Ações fixas */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onViewAppointment?.(appointment);
                  setIsDialogOpen(false);
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
                    setIsDialogOpen(false);
                    onCompleteClick?.(appointment);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Dashboard({ onViewAppointment, onCompleteClick }: DashboardProps) {
  const { companyId, themePreference, customColor, customColor2, professionalId, role, userData, user } = useAuth();
  const [showMonetaryValues, setShowMonetaryValues] = useState(false);
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyle = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const customerLabels = useCustomerLabels();
  const singularTitle = customerLabels.singularTitle;
  const pluralTitle = customerLabels.pluralTitle;

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  // Buscar agendamentos dos últimos 30 dias para estatísticas gerais
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const statsRange = {
    start: startOfDay(thirtyDaysAgo),
    end: endOfDay(today)
  };

  const { appointments, loading: appointmentsLoading } = useAppointments(companyId, undefined, statsRange);
  const { professionals, loading: professionalsLoading } = useProfessionals(companyId);
  const { services, loading: servicesLoading } = useServices(companyId);
  const { patients, loading: patientsLoading } = usePatients(companyId);
  const { company, loading: companyLoading } = useCompany(companyId);

  // Verificar se o usuário tem acesso financeiro
  const userWithPermissions = userData && user ? {
    uid: user.uid,
    role: userData.role,
    permissions: userData.permissions,
  } : null;
  const hasFinancialAccess = hasFullFinancialAccess(userWithPermissions) || role === 'owner' || role === 'admin';

  // Função auxiliar para converter datas
  const getAppointmentDate = (date: Date | string | undefined | null): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') return parseISO(date);
    return new Date();
  };

  // Agendamentos do dia
  const todayAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    return appointments.filter((apt) => {
      if (!apt.inicio) return false;
      const aptDate = getAppointmentDate(apt.inicio);
      return isSameDay(aptDate, today) && !apt.isBlock;
    }).sort((a, b) => {
      const dateA = getAppointmentDate(a.inicio);
      const dateB = getAppointmentDate(b.inicio);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments, today]);

  // Aniversariantes do dia
  const todayBirthdays = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    
    return patients.filter((patient) => {
      if (!patient.dataNascimento) return false;
      
      let birthDate: Date;
      try {
        if (patient.dataNascimento instanceof Date) {
          birthDate = patient.dataNascimento;
        } else if (patient.dataNascimento && typeof patient.dataNascimento === 'object' && 'toDate' in patient.dataNascimento) {
          birthDate = (patient.dataNascimento as any).toDate();
        } else {
          birthDate = new Date(patient.dataNascimento);
        }
        
        if (isNaN(birthDate.getTime())) return false;
        
        // Quando a data vem do Firestore, ela está em UTC
        // Precisamos usar getUTCDate() e getUTCMonth() para pegar o dia e mês corretos
        // Isso garante que mesmo que a data tenha sido salva com timezone diferente,
        // vamos pegar o dia e mês corretos baseados em UTC
        const birthMonth = birthDate.getUTCMonth();
        const birthDay = birthDate.getUTCDate();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        
        return birthMonth === todayMonth && birthDay === todayDay;
      } catch {
        return false;
      }
    });
  }, [patients, today]);

  // Estatísticas do dia
  const todayStats = useMemo(() => {
    const total = todayAppointments.length;
    const completed = todayAppointments.filter(a => a.status === 'concluido').length;
    const pending = todayAppointments.filter(a => a.status === 'pendente' || !a.status).length;
    const cancelled = todayAppointments.filter(a => a.status === 'cancelado').length;
    const noShow = todayAppointments.filter(a => a.status === 'no_show' || a.clientePresente === false).length;
    
    // Calcular receita do dia
    const revenue = todayAppointments
      .filter(a => a.status === 'concluido' && (a.valorPagoCentavos || a.precoCentavos))
      .reduce((sum, a) => {
        const value = a.valorPagoCentavos || a.precoCentavos || 0;
        return sum + value;
      }, 0) / 100;

    // Próximos agendamentos (próximas 3 horas)
    const now = new Date();
    const next3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const upcoming = todayAppointments.filter((apt) => {
      if (!apt.inicio) return false;
      const aptDate = getAppointmentDate(apt.inicio);
      return aptDate >= now && aptDate <= next3Hours;
    }).length;

    return {
      total,
      completed,
      pending,
      cancelled,
      noShow,
      revenue,
      upcoming
    };
  }, [todayAppointments]);

  // Estatísticas gerais (últimos 30 dias)
  const generalStats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAppointments = appointments?.filter((apt) => {
      if (!apt.inicio) return false;
      const aptDate = getAppointmentDate(apt.inicio);
      return aptDate >= thirtyDaysAgo && !apt.isBlock;
    }) || [];

    const totalRevenue = recentAppointments
      .filter(a => a.status === 'concluido' && (a.valorPagoCentavos || a.precoCentavos))
      .reduce((sum, a) => {
        const value = a.valorPagoCentavos || a.precoCentavos || 0;
        return sum + value;
      }, 0) / 100;

    const totalAppointments = recentAppointments.length;
    const completedAppointments = recentAppointments.filter(a => a.status === 'concluido').length;
    const avgRevenue = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;

    return {
      totalRevenue,
      totalAppointments,
      completedAppointments,
      avgRevenue
    };
  }, [appointments]);

  const getStatusBadge = (appointment: Appointment) => {
    if (appointment.status === 'concluido') {
      return <Badge className="bg-green-500 text-white">Concluído</Badge>;
    }
    if (appointment.status === 'cancelado') {
      return <Badge className="bg-gray-500 text-white">Cancelado</Badge>;
    }
    if (appointment.status === 'no_show' || appointment.clientePresente === false) {
      return <Badge className="bg-red-500 text-white">Não compareceu</Badge>;
    }
    if (appointment.status === 'pendente') {
      return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
    }
    return <Badge className="bg-blue-500 text-white">Agendado</Badge>;
  };

  const getAppointmentTime = (appointment: Appointment) => {
    if (!appointment.inicio) return '';
    const aptDate = getAppointmentDate(appointment.inicio);
    return format(aptDate, 'HH:mm', { locale: ptBR });
  };

  const getPatientName = (appointment: Appointment) => {
    const patient = patients?.find(p => p.id === appointment.clientId);
    return patient?.nome || singularTitle;
  };

  const getServiceNames = (appointment: Appointment) => {
    if (appointment.serviceIds && appointment.serviceIds.length > 0) {
      const serviceNames = appointment.serviceIds
        .map(id => services?.find(s => s.id === id))
        .filter(Boolean)
        .map(s => s?.nome || '')
        .join(', ');
      return serviceNames || 'Serviço';
    }
    const service = services?.find(s => s.id === appointment.serviceId);
    return service?.nome || 'Serviço';
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    className,
    style
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: string;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={cn(
          'relative overflow-hidden bg-white shadow-sm border-slate-200',
          className
        )}
        style={style}
      >
        {hasGradient && className?.includes('has-gradient') && gradientStyleHorizontal && (
          <div 
            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
            style={gradientStyleHorizontal}
          />
        )}
        {hasGradient && className?.includes('has-gradient') && isVibrant && (
          <div 
            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          />
        )}
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 text-slate-600">
                {title}
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {value}
              </p>
              {trend && (
                <p className="text-xs mt-1 text-slate-500">
                  {trend}
                </p>
              )}
            </div>
            <div 
              className={cn(
                'p-3 rounded-lg',
                hasGradient && className?.includes('border-2')
                  ? ''
                  : 'bg-slate-100'
              )}
              style={
                hasGradient && gradientStyleHorizontal && className?.includes('border-2')
                  ? gradientStyleHorizontal
                  : hasGradient && isVibrant && className?.includes('border-2')
                  ? { background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)' }
                  : undefined
              }
            >
              <Icon className={cn(
                'h-6 w-6',
                hasGradient && className?.includes('border-2')
                  ? 'text-white'
                  : 'text-slate-600'
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (appointmentsLoading || professionalsLoading || servicesLoading || patientsLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="pl-16 sm:pl-20 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h1>
            <p className="text-base sm:text-lg text-slate-600">
              Bem-vindo de volta! Aqui está o resumo do seu dia.
            </p>
          </div>
          {hasFinancialAccess && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMonetaryValues(!showMonetaryValues)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title={showMonetaryValues ? 'Ocultar valores monetários' : 'Mostrar valores monetários'}
            >
              {showMonetaryValues ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Cards de Estatísticas do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Agendamentos Hoje"
          value={todayStats.total}
          icon={Calendar}
          trend={`${todayStats.upcoming} próximos`}
          className={hasGradient ? 'has-gradient' : ''}
          style={undefined}
        />
        <StatCard
          title="Concluídos"
          value={todayStats.completed}
          icon={CheckCircle2}
          trend={`${todayStats.pending} pendentes`}
          className={hasGradient ? 'has-gradient' : ''}
          style={undefined}
        />
        {hasFinancialAccess && (
          <StatCard
            title="Receita do Dia"
            value={showMonetaryValues 
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayStats.revenue)
              : '•••'}
            icon={DollarSign}
            trend={showMonetaryValues 
              ? `Média: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(generalStats.avgRevenue)}`
              : '•••'}
            className={hasGradient ? 'has-gradient' : ''}
            style={undefined}
          />
        )}
        <StatCard
          title="Aniversariantes"
          value={todayBirthdays.length}
          icon={Gift}
          trend="Seu dia hoje!"
          className={hasGradient ? 'has-gradient' : ''}
          style={undefined}
        />
      </div>

      {/* Aniversariantes */}
      {todayBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden bg-white shadow-sm border-slate-200">
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Gift className="h-5 w-5 text-slate-600" />
                Seu dia hoje! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3">
                {todayBirthdays.map((patient) => {
                  let age = 0;
                  if (patient.dataNascimento) {
                    try {
                      let birthDate: Date;
                      if (patient.dataNascimento instanceof Date) {
                        birthDate = patient.dataNascimento;
                      } else if (patient.dataNascimento && typeof patient.dataNascimento === 'object' && 'toDate' in patient.dataNascimento) {
                        birthDate = (patient.dataNascimento as any).toDate();
                      } else {
                        birthDate = new Date(patient.dataNascimento);
                      }
                      if (!isNaN(birthDate.getTime())) {
                        age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                      }
                    } catch {}
                  }
                  
                  return (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-slate-100">
                          <Gift className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {patient.nome}
                          </p>
                          <p className="text-sm text-slate-600">
                            {age > 0 ? `${age} ${age === 1 ? 'ano' : 'anos'}` : 'Aniversário hoje!'}
                          </p>
                        </div>
                      </div>
                      <Link href={`/pacientes/detalhe?patientId=${patient.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          Ver
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Agendamentos do Dia */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="relative overflow-hidden bg-white shadow-sm border-slate-200">
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <CalendarDays className="h-5 w-5 text-slate-600" />
                Agendamentos de Hoje
              </CardTitle>
              <Link href="/agenda">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Ver todos
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 text-slate-400" />
                <p>Nenhum agendamento para hoje</p>
              </div>
            ) : (
              <TooltipProvider>
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => {
                    const patientName = getPatientName(appointment);
                    const serviceNames = getServiceNames(appointment);
                    const time = getAppointmentTime(appointment);
                    const professional = professionals?.find(p => p.id === appointment.professionalId);
                    const patient = patients?.find(p => p.id === appointment.clientId);
                    // Calcular appointmentServices diretamente sem useMemo (dentro do map)
                    let appointmentServices: any[] = [];
                    if (appointment.serviceIds && appointment.serviceIds.length > 0) {
                      appointmentServices = services?.filter(s => appointment.serviceIds!.includes(s.id)) || [];
                    } else if (appointment.serviceId) {
                      const service = services?.find(s => s.id === appointment.serviceId);
                      appointmentServices = service ? [service] : [];
                    }
                    
                    return (
                      <AppointmentItem
                        key={appointment.id}
                        appointment={appointment}
                        patientName={patientName}
                        serviceNames={serviceNames}
                        time={time}
                        professional={professional}
                        patient={patient}
                        appointmentServices={appointmentServices}
                        hasGradient={hasGradient}
                        onViewAppointment={onViewAppointment}
                        onCompleteClick={onCompleteClick}
                        getStatusBadge={getStatusBadge}
                      />
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Estatísticas Gerais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className={cn("grid gap-4", hasFinancialAccess ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
          {hasFinancialAccess && (
            <Card className="relative overflow-hidden bg-white shadow-sm border-slate-200">
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-1 text-slate-600">
                      Receita (30 dias)
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {showMonetaryValues 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(generalStats.totalRevenue)
                        : '•••'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="relative overflow-hidden bg-white shadow-sm border-slate-200">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1 text-slate-600">
                    Atendimentos (30 dias)
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {generalStats.completedAppointments}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white shadow-sm border-slate-200">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1 text-slate-600">
                    Total de {pluralTitle}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {patients?.length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

