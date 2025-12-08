'use client';

import { motion } from 'framer-motion';
import { CalendarClock, History, Stethoscope, FileText, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TabProps } from './types';
import type { Appointment, Service } from '@/types';

export interface ConsultasTabProps extends TabProps {
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  appointmentsLoading: boolean;
  professionalsLoading: boolean;
  servicesLoading: boolean;
  services: Service[];
  getProfessionalLabel: (id: string) => string;
  getServiceLabel: (id: string) => string;
  formatDateTime: (date: Date) => string;
  company?: any; // Company type
}

export function ConsultasTab({
  upcomingAppointments = [],
  pastAppointments = [],
  appointmentsLoading,
  professionalsLoading,
  servicesLoading,
  services = [],
  getProfessionalLabel,
  getServiceLabel,
  formatDateTime,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
  gradientStyleHorizontal,
}: ConsultasTabProps) {
  // Função auxiliar para buscar nome do serviço diretamente
  const getServiceNameDirectly = (serviceId: string): string | null => {
    if (!serviceId || !services || !Array.isArray(services)) return null;
    const service = services.find((s) => s && s.id === serviceId);
    return service?.nome || null;
  };

  const renderServiceLabel = (appointment: Appointment) => {
    // Priorizar serviceIds (array) se existir
    if (appointment.serviceIds && Array.isArray(appointment.serviceIds) && appointment.serviceIds.length > 0) {
      const labels = appointment.serviceIds
        .map((id) => {
          // Tentar primeiro pela função getServiceLabel
          let label = getServiceLabel(id);
          // Se retornou o próprio ID, tentar buscar diretamente
          if (label === id) {
            const directName = getServiceNameDirectly(id);
            if (directName) {
              return directName;
            }
          }
          return label;
        })
        .filter((label) => label && label !== 'Não informado' && label !== 'Carregando...');

      if (labels.length > 0) {
        return labels.join(', ');
      }
      // Se não encontrou nenhum, mostrar mensagem
      return 'Nenhum serviço informado';
    }
    // Fallback para serviceId único
    else if (appointment.serviceId) {
      let label = getServiceLabel(appointment.serviceId);
      // Se retornou o próprio ID, tentar buscar diretamente
      if (label === appointment.serviceId) {
        const directName = getServiceNameDirectly(appointment.serviceId);
        if (directName) {
          return directName;
        }
      }
      return label !== 'Não informado' && label !== 'Carregando...' ? label : 'Nenhum serviço informado';
    }
    return 'Nenhum serviço informado';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Próximos Agendamentos */}
      <Card
        className={cn(
          'shadow-lg border-0 transition-all',
          hasGradient ? 'bg-white/80 border border-white/25 backdrop-blur-xl' : 'bg-white'
        )}
      >
        <CardHeader className={cn('border-b', hasGradient ? 'border-white/20' : 'border-slate-200')}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md',
                isVibrant
                  ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                  : isCustom && gradientColors
                  ? ''
                  : 'bg-slate-600'
              )}
              style={
                isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            >
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className={cn('text-xl font-semibold', hasGradient ? 'text-slate-900' : 'text-gray-900')}>
                Próximos agendamentos
              </CardTitle>
              <p className={cn('text-xs mt-1', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                {upcomingAppointments.length} {upcomingAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {(appointmentsLoading || professionalsLoading || servicesLoading) && (
            <div className="flex items-center justify-center py-12">
              <div
                className={cn(
                  'animate-spin rounded-full h-8 w-8 border-b-2',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'border-indigo-500'
                      : 'border-indigo-500'
                    : 'border-blue-500'
                )}
              />
            </div>
          )}
          {!appointmentsLoading && !professionalsLoading && !servicesLoading && upcomingAppointments.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
              <div className={cn('inline-flex h-16 w-16 items-center justify-center rounded-full mb-4', hasGradient ? 'bg-slate-100/50' : 'bg-gray-100')}>
                <CalendarClock className={cn('w-8 h-8', hasGradient ? 'text-slate-400' : 'text-gray-400')} />
              </div>
              <p className={cn('text-sm font-medium', hasGradient ? 'text-slate-600' : 'text-gray-600')}>
                Nenhum agendamento futuro
              </p>
              <p className={cn('text-xs mt-1', hasGradient ? 'text-slate-500/80' : 'text-gray-500')}>
                Os próximos agendamentos aparecerão aqui
              </p>
            </motion.div>
          )}
          {upcomingAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card
                className={cn(
                  'border transition-all hover:shadow-md',
                  hasGradient
                    ? 'bg-white/60 border-white/40 hover:bg-white/80'
                    : 'bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 hover:border-slate-300'
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={cn('text-sm font-bold mb-1', hasGradient ? 'text-slate-900' : 'text-green-700')}>
                        {formatDateTime(appointment.inicio)}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Stethoscope className={cn('w-3.5 h-3.5 flex-shrink-0', hasGradient ? 'text-slate-500' : 'text-gray-500')} />
                          <p className={cn('text-sm', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                            <span className="font-medium">{getProfessionalLabel(appointment.professionalId)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className={cn('w-3.5 h-3.5 flex-shrink-0', hasGradient ? 'text-slate-500' : 'text-gray-500')} />
                          <p className={cn('text-sm', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                            {renderServiceLabel(appointment)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'flex-shrink-0',
                        hasGradient ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-green-100 text-green-700 border-green-300'
                      )}
                    >
                      Agendada
                    </Badge>
                  </div>
                  <Link
                    href="/agenda"
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                      hasGradient ? 'text-indigo-600 hover:text-indigo-700' : 'text-blue-600 hover:text-blue-700'
                    )}
                    prefetch={false}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver na agenda
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Histórico de Agendamentos */}
      <Card className={cn('shadow-lg border-0 transition-all', hasGradient ? 'bg-white/80 border border-white/25 backdrop-blur-xl' : 'bg-white')}>
        <CardHeader className={cn('border-b', hasGradient ? 'border-white/20' : 'border-slate-200')}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md',
                isVibrant
                  ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                  : isCustom && gradientColors
                  ? ''
                  : 'bg-slate-600'
              )}
              style={
                isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            >
              <History className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className={cn('text-xl font-semibold', hasGradient ? 'text-slate-900' : 'text-gray-900')}>
                Histórico de agendamentos
              </CardTitle>
              <p className={cn('text-xs mt-1', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                {pastAppointments.length} {pastAppointments.length === 1 ? 'agendamento realizado' : 'agendamentos realizados'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {(appointmentsLoading || professionalsLoading || servicesLoading) && (
            <div className="flex items-center justify-center py-12">
              <div
                className={cn(
                  'animate-spin rounded-full h-8 w-8 border-b-2',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'border-indigo-500'
                      : 'border-indigo-500'
                    : 'border-blue-500'
                )}
              />
            </div>
          )}
          {!appointmentsLoading && !professionalsLoading && !servicesLoading && pastAppointments.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
              <div className={cn('inline-flex h-16 w-16 items-center justify-center rounded-full mb-4', hasGradient ? 'bg-slate-100/50' : 'bg-gray-100')}>
                <History className={cn('w-8 h-8', hasGradient ? 'text-slate-400' : 'text-gray-400')} />
              </div>
              <p className={cn('text-sm font-medium', hasGradient ? 'text-slate-600' : 'text-gray-600')}>
                Nenhum atendimento registrado
              </p>
              <p className={cn('text-xs mt-1', hasGradient ? 'text-slate-500/80' : 'text-gray-500')}>
                O histórico de agendamentos aparecerá aqui
              </p>
            </motion.div>
          )}
          {pastAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card
                className={cn(
                  'border transition-all hover:shadow-md',
                  hasGradient ? 'bg-white/60 border-white/40 hover:bg-white/80' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={cn('text-sm font-bold mb-1', hasGradient ? 'text-slate-900' : 'text-gray-800')}>
                        {formatDateTime(appointment.inicio)}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Stethoscope className={cn('w-3.5 h-3.5 flex-shrink-0', hasGradient ? 'text-slate-500' : 'text-gray-500')} />
                          <p className={cn('text-sm', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                            <span className="font-medium">{getProfessionalLabel(appointment.professionalId)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className={cn('w-3.5 h-3.5 flex-shrink-0', hasGradient ? 'text-slate-500' : 'text-gray-500')} />
                          <p className={cn('text-sm', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                            {renderServiceLabel(appointment)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {appointment.status === 'no_show' || (appointment.status === 'concluido' && appointment.clientePresente === false) ? (
                      <Badge
                        className={cn(
                          'flex-shrink-0',
                          hasGradient ? 'bg-red-100 text-red-700 border-red-300' : 'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        Não compareceu
                      </Badge>
                    ) : appointment.status === 'concluido' ? (
                      <Badge
                        className={cn(
                          'flex-shrink-0',
                          hasGradient ? 'bg-green-100 text-green-700 border-green-300' : 'bg-green-50 text-green-700 border-green-200'
                        )}
                      >
                        Realizada
                      </Badge>
                    ) : appointment.status === 'cancelado' ? (
                      <Badge
                        className={cn(
                          'flex-shrink-0',
                          hasGradient ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-orange-50 text-orange-700 border-orange-200'
                        )}
                      >
                        Cancelada
                      </Badge>
                    ) : (
                      <Badge
                        className={cn(
                          'flex-shrink-0',
                          hasGradient ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                        )}
                      >
                        Realizada
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

