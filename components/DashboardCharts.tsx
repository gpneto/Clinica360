'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, useServices, usePatients, useCompanySettings } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Award,
  Sparkles
} from 'lucide-react';
import moment from 'moment';

export function DashboardCharts() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyle = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  
  const { appointments, loading: appointmentsLoading } = useAppointments(companyId);
  const { professionals, loading: professionalsLoading } = useProfessionals(companyId);
  const { services, loading: servicesLoading } = useServices(companyId);
  const { patients, loading: patientsLoading } = usePatients(companyId);
  const { settings: companySettings, loading: companySettingsLoading } = useCompanySettings(companyId);
  const showCommission = companySettings?.showCommission ?? true;
  const customerLabels = useCustomerLabels();
  const singularTitle = customerLabels.singularTitle;
  const pluralTitle = customerLabels.pluralTitle;

  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Últimos 30 dias por padrão
    return date;
  });
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  // Cores para gráficos baseadas no tema
  const colors = useMemo(() => {
    if (isCustom && gradientColors) {
      // Gerar paleta baseada na cor custom
      return [
        gradientColors.start,
        gradientColors.middle,
        gradientColors.end,
        '#f59e0b',
        '#10b981',
        '#3b82f6',
        '#ef4444',
        '#14b8a6'
      ];
    } else if (isVibrant) {
      return ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
    } else {
      return ['#1e40af', '#7c3aed', '#be185d', '#d97706', '#059669', '#2563eb', '#dc2626', '#0d9488'];
    }
  }, [isVibrant, isCustom, gradientColors]);

  // Filtrar agendamentos concluídos dos últimos períodos
  const filteredAppointments = useMemo(() => {
    const now = moment();
    let startDate: moment.Moment;
    let endDate: moment.Moment = now;
    
    if (period === 'week') {
      startDate = moment().subtract(7, 'days');
    } else if (period === 'month') {
      startDate = moment().subtract(30, 'days');
    } else if (period === 'quarter') {
      startDate = moment().subtract(90, 'days');
    } else {
      // Período personalizado
      startDate = moment(customStartDate).startOf('day');
      endDate = moment(customEndDate).endOf('day');
    }
    
    return appointments.filter(appointment => {
      if (appointment.isBlock) return false;
      const appointmentDate = moment(appointment.inicio);
      return appointmentDate.isSameOrAfter(startDate) && 
             appointmentDate.isSameOrBefore(endDate) &&
             appointment.status === 'concluido' &&
             appointment.clientePresente !== false;
    });
  }, [appointments, period, customStartDate, customEndDate]);

  // 1. Gráfico de Linha - Receita ao longo do tempo (últimos 30 dias)
  const revenueOverTime = useMemo(() => {
    const days = [];
    const now = moment();
    
    for (let i = 29; i >= 0; i--) {
      const date = moment(now).subtract(i, 'days');
      const dayAppointments = filteredAppointments.filter(apt => {
        const aptDate = moment(apt.inicio);
        return aptDate.isSame(date, 'day');
      });
      
      const revenue = dayAppointments.reduce((sum, apt) => {
        return sum + (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
      }, 0);
      
      days.push({
        date: date.format('DD/MM'),
        receita: revenue
      });
    }
    
    return days;
  }, [filteredAppointments]);

  // 2. Gráfico de Barras - Atendimentos por Profissional
  const appointmentsByProfessional = useMemo(() => {
    const dataMap = new Map<string, { name: string; atendimentos: number; receita: number }>();
    
    professionals.forEach(prof => {
      dataMap.set(prof.id, {
        name: prof.apelido || 'Profissional',
        atendimentos: 0,
        receita: 0
      });
    });
    
    filteredAppointments.forEach(apt => {
      const data = dataMap.get(apt.professionalId);
      if (data) {
        data.atendimentos++;
        data.receita += (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
      }
    });
    
    return Array.from(dataMap.values())
      .filter(d => d.atendimentos > 0)
      .sort((a, b) => b.atendimentos - a.atendimentos)
      .slice(0, 10);
  }, [professionals, filteredAppointments]);

  // 3. Gráfico de Pizza - Distribuição de Receita por Serviço
  const revenueByService = useMemo(() => {
    const dataMap = new Map<string, { name: string; value: number; count: number }>();
    
    services.forEach(service => {
      dataMap.set(service.id, {
        name: service.nome,
        value: 0,
        count: 0
      });
    });
    
    filteredAppointments.forEach(apt => {
      const revenue = (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
      const serviceIds = apt.serviceIds && apt.serviceIds.length > 0 ? apt.serviceIds : [apt.serviceId];
      const revenuePerService = revenue / serviceIds.length;
      
      serviceIds.forEach(serviceId => {
        const data = dataMap.get(serviceId);
        if (data) {
          data.value += revenuePerService;
          data.count++;
        }
      });
    });
    
    return Array.from(dataMap.values())
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [services, filteredAppointments]);

  // 4. Gráfico de Área - Comparativo Semanal (últimas 4 semanas)
  const weeklyComparison = useMemo(() => {
    const weeks = [];
    const now = moment();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = moment(now).subtract(i, 'weeks').startOf('isoWeek');
      const weekEnd = moment(weekStart).endOf('isoWeek');
      
      const weekAppointments = filteredAppointments.filter(apt => {
        const aptDate = moment(apt.inicio);
        return aptDate.isSameOrAfter(weekStart) && aptDate.isSameOrBefore(weekEnd);
      });
      
      const revenue = weekAppointments.reduce((sum, apt) => {
        return sum + (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
      }, 0);
      
      const count = weekAppointments.length;
      
      weeks.push({
        semana: `Sem ${i + 1}`,
        receita: revenue,
        atendimentos: count
      });
    }
    
    return weeks;
  }, [filteredAppointments]);

  // 5. Gráfico de Barras Horizontais - Top 5 Pacientes por Receita
  const topPatientsByRevenue = useMemo(() => {
    const dataMap = new Map<string, { name: string; receita: number; atendimentos: number }>();
    
    patients.forEach(patient => {
      dataMap.set(patient.id, {
        name: patient.nome,
        receita: 0,
        atendimentos: 0
      });
    });
    
    filteredAppointments.forEach(apt => {
      const data = dataMap.get(apt.clientId);
      if (data) {
        data.receita += (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
        data.atendimentos++;
      }
    });
    
    return Array.from(dataMap.values())
      .filter(d => d.receita > 0)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [patients, filteredAppointments]);

  // Estatísticas resumidas
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredAppointments.reduce((sum, apt) => {
      return sum + (apt.valorPagoCentavos || apt.precoCentavos || 0) / 100;
    }, 0);
    
    const totalAppointments = filteredAppointments.length;
    const avgRevenue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    const uniquePatients = new Set(filteredAppointments.map(apt => apt.clientId)).size;
    
    return {
      totalRevenue,
      totalAppointments,
      avgRevenue,
      uniquePatients
    };
  }, [filteredAppointments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (appointmentsLoading || professionalsLoading || servicesLoading || patientsLoading || companySettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className={cn(
          "animate-spin rounded-full h-8 w-8 border-b-2",
          hasGradient && gradientStyle 
            ? "border-transparent" 
            : "border-slate-900"
        )}
        style={hasGradient && gradientStyle ? { borderImage: `${gradientStyle.background} 1` } : undefined}
        ></div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn(
          'bg-white p-3 rounded-lg shadow-lg border',
          isVibrant ? 'border-white/20' : 'border-gray-200'
        )}>
          <p className={cn('font-semibold mb-1', isVibrant ? 'text-slate-900' : 'text-gray-900')}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${typeof entry.value === 'number' && entry.name.includes('receita') ? formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl p-6 transition-all',
          isVibrant 
            ? 'bg-white/80 border border-white/20 backdrop-blur-xl shadow-xl' 
            : hasGradient && gradientStyle
              ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm shadow-xl'
              : 'app-card'
        )}
        style={hasGradient && gradientStyleHorizontal ? {
          borderTop: `3px solid transparent`,
          borderImage: `${gradientStyleHorizontal.background} 1`
        } : undefined}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-all',
                hasGradient && gradientStyle
                  ? ''
                  : isVibrant
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                    : 'bg-slate-900'
              )}
              style={hasGradient && gradientStyle ? gradientStyle : undefined}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className={cn(
                'text-2xl font-bold',
                isVibrant 
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent'
                  : hasGradient && gradientStyle
                    ? 'text-slate-900'
                    : 'text-slate-900'
              )}>
                Dashboards e Visualizações
              </h2>
              <p className={cn('text-sm mt-0.5', isVibrant ? 'text-slate-600/80' : 'text-gray-500')}>
                Análises visuais e métricas de performance
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap items-center">
            {(['week', 'month', 'quarter', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm',
                  period === p
                    ? hasGradient && gradientStyle
                      ? 'text-white shadow-md'
                      : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-md'
                        : 'bg-slate-900 text-white shadow-md'
                    : isVibrant
                      ? 'bg-white/40 border border-white/30 text-slate-700 hover:bg-white/60'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                )}
                style={period === p && hasGradient && gradientStyle ? gradientStyle : undefined}
              >
                {p === 'week' ? '7 dias' : p === 'month' ? '30 dias' : p === 'quarter' ? '90 dias' : 'Personalizado'}
              </button>
            ))}
            {period === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap ml-2">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                    De:
                  </span>
                  <input
                    type="date"
                    value={customStartDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setCustomStartDate(date);
                      if (date > customEndDate) {
                        setCustomEndDate(date);
                      }
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm focus:outline-none transition-all duration-200',
                      isVibrant
                        ? 'bg-white/60 border border-white/30 text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300'
                        : 'border border-gray-300 focus:ring-2 focus:ring-slate-800 focus:border-slate-800/50'
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                    Até:
                  </span>
                  <input
                    type="date"
                    value={customEndDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setCustomEndDate(date);
                      if (date < customStartDate) {
                        setCustomStartDate(date);
                      }
                    }}
                    min={customStartDate.toISOString().split('T')[0]}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm focus:outline-none transition-all duration-200',
                      isVibrant
                        ? 'bg-white/60 border border-white/30 text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300'
                        : 'border border-gray-300 focus:ring-2 focus:ring-slate-800 focus:border-slate-800/50'
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Cards de Estatísticas Resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white'
              : hasGradient && gradientStyle
                ? 'text-white'
                : 'bg-slate-900 text-white'
          )}
          style={hasGradient && gradientStyle && !isVibrant ? gradientStyle : undefined}
          >
            {hasGradient && !isVibrant && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            )}
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1 opacity-90">Receita Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white'
              : 'bg-white border border-slate-200'
          )}
          >
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('text-sm mb-1', isVibrant ? 'opacity-90' : 'text-gray-600')}>
                    Total Atendimentos
                  </p>
                  <p className={cn('text-2xl font-bold', isVibrant ? 'text-white' : 'text-slate-900')}>
                    {summaryStats.totalAppointments}
                  </p>
                </div>
                <div className={cn(
                  'p-3 rounded-lg',
                  isVibrant ? 'bg-white/20 backdrop-blur-sm' : 'bg-emerald-100'
                )}>
                  <Calendar className={cn('w-6 h-6', isVibrant ? 'text-white' : 'text-emerald-600')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white'
              : 'bg-white border border-slate-200'
          )}
          >
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('text-sm mb-1', isVibrant ? 'opacity-90' : 'text-gray-600')}>
                    Receita Média
                  </p>
                  <p className={cn('text-2xl font-bold', isVibrant ? 'text-white' : 'text-slate-900')}>
                    {formatCurrency(summaryStats.avgRevenue)}
                  </p>
                </div>
                <div className={cn(
                  'p-3 rounded-lg',
                  isVibrant ? 'bg-white/20 backdrop-blur-sm' : 'bg-amber-100'
                )}>
                  <Target className={cn('w-6 h-6', isVibrant ? 'text-white' : 'text-amber-600')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white'
              : 'bg-white border border-slate-200'
          )}
          >
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('text-sm mb-1', isVibrant ? 'opacity-90' : 'text-gray-600')}>
                    {pluralTitle} Atendidos
                  </p>
                  <p className={cn('text-2xl font-bold', isVibrant ? 'text-white' : 'text-slate-900')}>
                    {summaryStats.uniquePatients}
                  </p>
                </div>
                <div className={cn(
                  'p-3 rounded-lg',
                  isVibrant ? 'bg-white/20 backdrop-blur-sm' : 'bg-blue-100'
                )}>
                  <Users className={cn('w-6 h-6', isVibrant ? 'text-white' : 'text-blue-600')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Gráfico de Linha - Receita ao longo do tempo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-indigo-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <TrendingUp className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-indigo-600')} />
                </div>
                Receita ao Longo do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke={colors[0]} 
                    strokeWidth={2}
                    dot={{ fill: colors[0], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Gráfico de Barras - Atendimentos por Profissional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-purple-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <Users className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-purple-600')} />
                </div>
                Atendimentos por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentsByProfessional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="atendimentos" fill={colors[1]} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Gráfico de Pizza - Distribuição por Serviço */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-pink-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <PieChartIcon className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-pink-600')} />
                </div>
                Distribuição de Receita por Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={revenueByService}
                    cx="40%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByService.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomTooltip />}
                    formatter={(value: number) => {
                      const total = revenueByService.reduce((sum, item) => sum + item.value, 0);
                      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                      return [`${formatCurrency(value)} (${percent}%)`, ''];
                    }}
                  />
                  <Legend 
                    verticalAlign="middle" 
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    wrapperStyle={{ paddingLeft: '20px', fontSize: '12px', maxWidth: '50%' }}
                    formatter={(value: string) => {
                      const data = revenueByService.find(d => d.name === value);
                      if (!data) return value;
                      const total = revenueByService.reduce((sum, item) => sum + item.value, 0);
                      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
                      const displayName = value.length > 20 ? `${value.substring(0, 20)}...` : value;
                      return `${displayName} (${percent}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Gráfico de Área - Comparativo Semanal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-emerald-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <Calendar className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-emerald-600')} />
                </div>
                Comparativo Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="semana" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#6b7280" tickFormatter={(value) => `R$ ${value}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="receita" 
                    stroke={colors[4]} 
                    fill={colors[4]}
                    fillOpacity={0.6}
                    name="Receita (R$)"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="atendimentos" 
                    stroke={colors[5]} 
                    fill={colors[5]}
                    fillOpacity={0.4}
                    name="Atendimentos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. Gráfico de Barras Horizontais - Top 5 Pacientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-amber-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <DollarSign className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-amber-600')} />
                </div>
                Top 5 {pluralTitle} por Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPatientsByRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="receita" fill={colors[6]} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 6. Gráfico de Barras Agrupadas - Receita vs Atendimentos por Profissional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className={cn(
            'relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl',
            isVibrant 
              ? 'bg-white/80 border border-white/20 backdrop-blur-xl' 
              : hasGradient && gradientStyle
                ? 'bg-white/95 border border-slate-200/50 backdrop-blur-sm'
                : 'bg-white border border-slate-200'
          )}>
            {hasGradient && gradientStyleHorizontal && (
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={gradientStyleHorizontal}
              />
            )}
            <CardHeader className="relative z-10">
              <CardTitle className={cn('flex items-center gap-2', isVibrant ? 'text-slate-900' : 'text-slate-900')}>
                <div className={cn(
                  'p-2 rounded-lg',
                  hasGradient && gradientStyle
                    ? ''
                    : 'bg-blue-100'
                )}
                style={hasGradient && gradientStyle ? gradientStyle : undefined}
                >
                  <BarChart3 className={cn('w-5 h-5', hasGradient && gradientStyle ? 'text-white' : 'text-blue-600')} />
                </div>
                Receita vs Atendimentos por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentsByProfessional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="left" stroke="#6b7280" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="atendimentos" fill={colors[2]} radius={[8, 8, 0, 0]} name="Atendimentos" />
                  <Bar yAxisId="right" dataKey="receita" fill={colors[3]} radius={[8, 8, 0, 0]} name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

