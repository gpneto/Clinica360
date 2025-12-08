'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { hasFullFinancialAccess } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Filter,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAppointments, useProfessionals, usePatients, useServices, useCompanySettings } from '@/hooks/useFirestore';
import { Appointment, Professional, Patient, Service } from '@/types';
import moment from 'moment';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { DashboardCharts } from '@/components/DashboardCharts';

interface FinancialData {
  professionalId: string;
  professionalName: string;
  totalAtendimentos: number;
  valorBruto: number;
  comissaoSalao: number;
  repasseProfissional: number;
}

interface PatientRevenueData {
  patientId: string;
  patientName: string;
  totalAtendimentos: number;
  valorTotalPago: number;
  ultimoAtendimento: Date;
}

interface ServiceRevenueData {
  serviceId: string;
  serviceName: string;
  totalAtendimentos: number;
  valorTotalPago: number;
  valorMedioPorAtendimento: number;
}

export default function FinancialReportsPage() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const { appointments, loading: appointmentsLoading } = useAppointments(companyId);
  const { professionals, loading: professionalsLoading } = useProfessionals(companyId);
  const { patients, loading: patientsLoading } = usePatients(companyId);
  const { services, loading: servicesLoading } = useServices(companyId);
  const { settings: companySettings, loading: companySettingsLoading } = useCompanySettings(companyId);
  const showCommission = companySettings?.showCommission ?? true;
  const customerLabels = useCustomerLabels();
  const singularTitle = customerLabels.singularTitle;
  const pluralTitle = customerLabels.pluralTitle;
  
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [reportType, setReportType] = useState<'dashboards' | 'professionals' | 'patients' | 'services'>('dashboards');
  const [showMonthlyForecast, setShowMonthlyForecast] = useState(false);

  // Filtrar agendamentos pelo período
  const filteredAppointments = useMemo(() => {
    const now = moment();
    let startDate: moment.Moment;
    let endDate: moment.Moment;
    
    if (period === 'week') {
      startDate = moment(selectedWeek).startOf('isoWeek');
      endDate = moment(selectedWeek).endOf('isoWeek');
    } else {
      startDate = moment(selectedMonth).startOf('month');
      endDate = moment(selectedMonth).endOf('month');
    }
    
    return appointments.filter(appointment => {
      const appointmentDate = moment(appointment.inicio);
      return appointmentDate.isBetween(startDate, endDate, 'day', '[]') &&
             appointment.status === 'concluido';
    });
  }, [appointments, period, selectedWeek, selectedMonth]);

  // Calcular dados financeiros por profissional
  const financialData: FinancialData[] = useMemo(() => {
    const dataMap = new Map<string, {
      professionalId: string;
      professionalName: string;
      totalAtendimentos: number;
      valorBruto: number;
      comissaoSalao: number;
      repasseProfissional: number;
    }>();

    // Inicializar com todos os profissionais
    professionals.forEach(prof => {
      dataMap.set(prof.id, {
        professionalId: prof.id,
        professionalName: prof.apelido,
        totalAtendimentos: 0,
        valorBruto: 0,
        comissaoSalao: 0,
        repasseProfissional: 0,
      });
    });

    // Calcular valores dos agendamentos (apenas onde cliente compareceu)
    filteredAppointments.forEach(appointment => {
      // Só considerar se clientePresente for true ou undefined (para agendamentos antigos)
      if (appointment.clientePresente !== false) {
        const data = dataMap.get(appointment.professionalId);
        if (data) {
          data.totalAtendimentos++;
          
          // Usar valorPagoCentavos se existir, senão usar precoCentavos
          const valorPago = appointment.valorPagoCentavos || appointment.precoCentavos;
          data.valorBruto += valorPago;
          
          const commissionPercent = showCommission ? (appointment.comissaoPercent ?? 0) : 0;
          const comissaoCentavos = Math.round(valorPago * commissionPercent / 100);
          data.comissaoSalao += showCommission ? comissaoCentavos : 0;
          data.repasseProfissional += showCommission ? (valorPago - comissaoCentavos) : valorPago;
        }
      }
    });

    // Retornar apenas profissionais com atendimentos
    return Array.from(dataMap.values()).filter(data => data.totalAtendimentos > 0);
  }, [professionals, filteredAppointments, showCommission]);

  const totals = useMemo(() => {
    return financialData.reduce(
      (acc, data) => ({
        totalAtendimentos: acc.totalAtendimentos + data.totalAtendimentos,
        valorBruto: acc.valorBruto + data.valorBruto,
        comissaoSalao: acc.comissaoSalao + data.comissaoSalao,
        repasseProfissional: acc.repasseProfissional + data.repasseProfissional,
      }),
      {
        totalAtendimentos: 0,
        valorBruto: 0,
        comissaoSalao: 0,
        repasseProfissional: 0,
      }
    );
  }, [financialData]);

  const monthlyForecastTotals = useMemo(() => {
    const startOfMonth = moment(selectedMonth).startOf('month');
    const endOfMonth = moment(selectedMonth).endOf('month');

    const concludedAppointments = appointments.filter((appointment) => {
      if (appointment.isBlock) return false;

      const appointmentDate = moment(appointment.inicio);
      const status = appointment.status ?? 'agendado';

      const isWithinMonth = appointmentDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
      const isConcluded = status === 'concluido' && appointment.clientePresente !== false;

      return isWithinMonth && isConcluded;
    });

    const pendingAppointments = appointments.filter((appointment) => {
      if (appointment.isBlock) return false;

      const appointmentDate = moment(appointment.inicio);
      const status = appointment.status ?? 'agendado';

      const isWithinMonth = appointmentDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
      const isPendingStatus = status !== 'cancelado' && status !== 'concluido';

      return isWithinMonth && isPendingStatus;
    });

    const totalsConcluded = concludedAppointments.reduce(
      (acc, appointment) => {
        const valorRecebido = appointment.valorPagoCentavos || appointment.precoCentavos || 0;
        const commissionPercent = showCommission ? (appointment.comissaoPercent ?? 0) : 0;
        const comissaoRecebida = Math.round(valorRecebido * commissionPercent / 100);
        const repasse = showCommission ? (valorRecebido - comissaoRecebida) : valorRecebido;

        return {
          totalAtendimentos: acc.totalAtendimentos + 1,
          valorBruto: acc.valorBruto + valorRecebido,
          comissao: acc.comissao + (showCommission ? comissaoRecebida : 0),
          repasse: acc.repasse + repasse,
        };
      },
      {
        totalAtendimentos: 0,
        valorBruto: 0,
        comissao: 0,
        repasse: 0,
      }
    );

    const totalsPending = pendingAppointments.reduce(
      (acc, appointment) => {
        const valorPrevisto = appointment.precoCentavos ?? 0;
        const commissionPercent = showCommission ? (appointment.comissaoPercent ?? 0) : 0;
        const comissaoPrevista = Math.round(valorPrevisto * commissionPercent / 100);
        const repassePrevisto = showCommission ? (valorPrevisto - comissaoPrevista) : valorPrevisto;

        return {
          totalAtendimentos: acc.totalAtendimentos + 1,
          valorPrevisto: acc.valorPrevisto + valorPrevisto,
          comissaoPrevista: acc.comissaoPrevista + (showCommission ? comissaoPrevista : 0),
          repassePrevisto: acc.repassePrevisto + repassePrevisto,
        };
      },
      {
        totalAtendimentos: 0,
        valorPrevisto: 0,
        comissaoPrevista: 0,
        repassePrevisto: 0,
      }
    );

    return {
      totalRealizado: totalsConcluded.totalAtendimentos,
      valorRealizado: totalsConcluded.valorBruto,
      comissaoRealizada: showCommission ? totalsConcluded.comissao : 0,
      repasseRealizado: showCommission ? totalsConcluded.repasse : totalsConcluded.valorBruto,
      totalPrevisto: totalsPending.totalAtendimentos,
      valorPrevisto: totalsPending.valorPrevisto,
      comissaoPrevista: showCommission ? totalsPending.comissaoPrevista : 0,
      repassePrevisto: showCommission ? totalsPending.repassePrevisto : totalsPending.valorPrevisto,
      totalGeral: totalsConcluded.totalAtendimentos + totalsPending.totalAtendimentos,
      valorBrutoGeral: totalsConcluded.valorBruto + totalsPending.valorPrevisto,
      comissaoGeral: showCommission ? (totalsConcluded.comissao + totalsPending.comissaoPrevista) : 0,
      repasseGeral: showCommission
        ? totalsConcluded.repasse + totalsPending.repassePrevisto
        : totalsConcluded.valorBruto + totalsPending.valorPrevisto,
    };
  }, [appointments, selectedMonth, showCommission]);

  // Relatório por Paciente
  const patientRevenueData: PatientRevenueData[] = useMemo(() => {
    const dataMap = new Map<string, {
      patientId: string;
      patientName: string;
      totalAtendimentos: number;
      valorTotalPago: number;
      ultimoAtendimento: Date;
    }>();

    // Inicializar com todos os pacientes
    patients.forEach(patient => {
      dataMap.set(patient.id, {
        patientId: patient.id,
        patientName: patient.nome,
        totalAtendimentos: 0,
        valorTotalPago: 0,
        ultimoAtendimento: new Date(0), // Data inicial
      });
    });

    // Calcular valores dos agendamentos (apenas onde paciente compareceu)
    filteredAppointments.forEach(appointment => {
      // Só considerar se clientePresente for true ou undefined (para agendamentos antigos)
      if (appointment.clientePresente !== false) {
        const data = dataMap.get(appointment.clientId);
        if (data) {
          data.totalAtendimentos++;
          
          // Usar valorPagoCentavos se existir, senão usar precoCentavos
          const valorPago = appointment.valorPagoCentavos || appointment.precoCentavos;
          data.valorTotalPago += valorPago;
          
          // Atualizar último atendimento
          if (appointment.inicio > data.ultimoAtendimento) {
            data.ultimoAtendimento = appointment.inicio;
          }
        }
      }
    });

    // Retornar apenas pacientes com atendimentos, ordenados por valor total
    return Array.from(dataMap.values())
      .filter(data => data.totalAtendimentos > 0)
      .sort((a, b) => b.valorTotalPago - a.valorTotalPago);
  }, [patients, filteredAppointments]);

  // Relatório por Serviço
  const serviceRevenueData: ServiceRevenueData[] = useMemo(() => {
    const dataMap = new Map<string, {
      serviceId: string;
      serviceName: string;
      totalAtendimentos: number;
      valorTotalPago: number;
      valorMedioPorAtendimento: number;
    }>();

    // Inicializar com todos os serviços
    services.forEach(service => {
      dataMap.set(service.id, {
        serviceId: service.id,
        serviceName: service.nome,
        totalAtendimentos: 0,
        valorTotalPago: 0,
        valorMedioPorAtendimento: 0,
      });
    });

    // Calcular valores dos agendamentos (apenas onde cliente compareceu)
    filteredAppointments.forEach(appointment => {
      // Só considerar se clientePresente for true ou undefined (para agendamentos antigos)
      if (appointment.clientePresente !== false) {
        // Processar todos os serviços do agendamento
        const appointmentServiceIds = appointment.serviceIds && appointment.serviceIds.length > 0
          ? appointment.serviceIds
          : [appointment.serviceId];
        
        // Distribuir o valor entre os serviços (dividir igualmente)
        const valorPorServico = appointment.valorPagoCentavos 
          ? Math.round(appointment.valorPagoCentavos / appointmentServiceIds.length)
          : Math.round((appointment.precoCentavos || 0) / appointmentServiceIds.length);
        
        appointmentServiceIds.forEach(serviceId => {
          const data = dataMap.get(serviceId);
        if (data) {
          data.totalAtendimentos++;
            // Adicionar valor proporcional do serviço
            data.valorTotalPago += valorPorServico;
        }
        });
      }
    });

    // Calcular valor médio por atendimento
    dataMap.forEach(data => {
      if (data.totalAtendimentos > 0) {
        data.valorMedioPorAtendimento = data.valorTotalPago / data.totalAtendimentos;
      }
    });

    // Retornar apenas serviços com atendimentos, ordenados por valor total
    return Array.from(dataMap.values())
      .filter(data => data.totalAtendimentos > 0)
      .sort((a, b) => b.valorTotalPago - a.valorTotalPago);
  }, [services, filteredAppointments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (date: Date, type: 'week' | 'month') => {
    if (type === 'week') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('pt-BR')} - ${endOfWeek.toLocaleDateString('pt-BR')}`;
    }
    
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const exportToCSV = () => {
    const header = showCommission
      ? ['Profissional', 'Atendimentos', 'Valor Bruto', 'Comissão Empresa', 'Repasse Profissional']
      : ['Profissional', 'Atendimentos', 'Valor Bruto'];

    const rows = financialData.map(data =>
      showCommission
        ? [
            data.professionalName,
            data.totalAtendimentos.toString(),
            formatCurrency(data.valorBruto),
            formatCurrency(data.comissaoSalao),
            formatCurrency(data.repasseProfissional),
          ]
        : [
            data.professionalName,
            data.totalAtendimentos.toString(),
            formatCurrency(data.valorBruto),
          ]
    );

    const totalsRow = showCommission
      ? [
          'TOTAL',
          totals.totalAtendimentos.toString(),
          formatCurrency(totals.valorBruto),
          formatCurrency(totals.comissaoSalao),
          formatCurrency(totals.repasseProfissional),
        ]
      : [
          'TOTAL',
          totals.totalAtendimentos.toString(),
          formatCurrency(totals.valorBruto),
        ];

    const csvContent = [header, ...rows, totalsRow].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (appointmentsLoading || professionalsLoading || patientsLoading || servicesLoading || companySettingsLoading) {
    return (
      <AccessGuard 
        allowed={['owner', 'admin', 'outro']}
        checkPermission={(user) => hasFullFinancialAccess(user)}
      >
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AccessGuard>
    );
  }

  return (
    <AccessGuard allowed={['owner', 'admin']}>
      <div className="app-page min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'rounded-2xl p-6 transition-all',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-16 sm:pl-20 lg:pl-0">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientColors
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : 'bg-slate-900'
                      : isNeutral
                      ? 'bg-slate-900'
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
                  {reportType === 'dashboards' ? (
                    <BarChart3 className="w-6 h-6 text-white" />
                  ) : (
                    <DollarSign className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h1
                    className={cn(
                      'text-3xl sm:text-4xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-clip-text text-transparent drop-shadow'
                          : isVibrant
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-slate-900'
                        : isNeutral
                        ? 'text-slate-900'
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
                    {reportType === 'dashboards' ? 'Dashboards e Relatórios' : 'Relatórios Financeiros'}
                  </h1>
                  {reportType !== 'dashboards' && (
                    <p className={cn('text-sm mt-0.5 flex items-center gap-2', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(period === 'week' ? selectedWeek : selectedMonth, period)}
                    </p>
                  )}
                </div>
              </div>
              
              {reportType !== 'dashboards' && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className={cn(
                      'shadow-sm hover:shadow-md transition-shadow',
                      hasGradient ? 'border-white/30 text-slate-700 hover:bg-white/40' : ''
                    )}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant={showMonthlyForecast ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowMonthlyForecast((prev) => !prev)}
                    className={cn(
                      'shadow-sm hover:shadow-md transition-shadow',
                      showMonthlyForecast
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'hover:opacity-90'
                            : isVibrant
                            ? 'bg-indigo-500 text-white border-white/30 hover:bg-indigo-600'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          : isNeutral
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        : hasGradient
                          ? 'border-white/30 text-slate-700 hover:bg-white/40'
                          : ''
                    )}
                    style={showMonthlyForecast && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    Previsão mensal
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Period Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn(
              'rounded-2xl p-6 transition-all',
              hasGradient
                ? 'bg-white/80 backdrop-blur-lg border border-white/25 shadow-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {reportType !== 'dashboards' && (
                <>
                  <div className="flex items-center gap-4">
                    <span className={cn('text-sm font-medium', hasGradient ? 'text-slate-600/90' : 'text-slate-600')}>Período:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPeriod('week')}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                          period === 'week'
                            ? isVibrant
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-md'
                              : 'bg-slate-900 text-white shadow-md'
                            : isVibrant
                              ? 'bg-white/40 border border-white/30 text-slate-700 hover:bg-white/60'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        Semanal
                      </button>
                      <button
                        onClick={() => setPeriod('month')}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                          period === 'month'
                            ? isVibrant
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-md'
                              : 'bg-slate-900 text-white shadow-md'
                            : isVibrant
                              ? 'bg-white/40 border border-white/30 text-slate-700 hover:bg-white/60'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        Mensal
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', hasGradient ? 'text-slate-600/90' : 'text-slate-600')}>
                      {period === 'week' ? 'Semana:' : 'Mês:'}
                    </span>
                    <input
                      type={period === 'week' ? 'week' : 'month'}
                      value={period === 'week' 
                        ? (() => {
                            const weekMoment = moment(selectedWeek);
                            const weekNumber = weekMoment.isoWeek();
                            const year = weekMoment.isoWeekYear();
                            return `${year}-W${String(weekNumber).padStart(2, '0')}`;
                          })()
                        : `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (period === 'week') {
                          // Formato: YYYY-Www
                          const match = value.match(/^(\d{4})-W(\d{2})$/);
                          if (match) {
                            const year = parseInt(match[1], 10);
                            const week = parseInt(match[2], 10);
                            const weekStart = moment().isoWeekYear(year).isoWeek(week).startOf('isoWeek');
                            setSelectedWeek(weekStart.toDate());
                          }
                        } else {
                          // Formato: YYYY-MM
                          const match = value.match(/^(\d{4})-(\d{2})$/);
                          if (match) {
                            const year = parseInt(match[1], 10);
                            const month = parseInt(match[2], 10) - 1; // month é 0-indexed
                            setSelectedMonth(new Date(year, month, 1));
                          }
                        }
                      }}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm focus:outline-none transition-all duration-200',
                        hasGradient
                          ? 'bg-white/60 border border-white/25 text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300'
                          : 'border border-gray-300 focus:ring-2 focus:ring-slate-800 focus:border-slate-800/50'
                      )}
                    />
                  </div>
                </>
              )}
              
              {/* Controles de Tipo de Relatório */}
              <div className={cn('flex items-center gap-4', reportType === 'dashboards' && 'w-full justify-center')}>
                <span className={cn('text-sm font-medium', hasGradient ? 'text-slate-600/90' : 'text-slate-600')}>Relatório:</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
                    { id: 'professionals', label: 'Profissionais', icon: Users },
                    { id: 'patients', label: pluralTitle, icon: Users },
                    { id: 'services', label: 'Serviços', icon: DollarSign }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setReportType(id as typeof reportType)}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
                        reportType === id
                          ? hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? 'text-white shadow-md'
                              : isVibrant
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-md'
                              : 'bg-slate-900 text-white shadow-md'
                            : isNeutral
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-slate-900 text-white shadow-md'
                          : hasGradient
                            ? 'bg-white/40 border border-white/30 text-slate-700 hover:bg-white/60'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                      style={reportType === id && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {reportType === 'dashboards' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DashboardCharts />
            </motion.div>
          ) : (
            <>
              {showMonthlyForecast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={cn(
                    'rounded-2xl p-6 transition-all border',
                    hasGradient
                      ? 'bg-white/80 backdrop-blur-lg border-white/25 shadow-xl'
                      : 'bg-white border-slate-200 shadow-xl'
                  )}
                >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className={cn('text-xl font-semibold', hasGradient ? 'text-slate-900' : 'text-slate-800')}>
                      Previsão de Recebimento do Mês
                    </h2>
                    <p className={cn('text-sm flex items-center gap-2', hasGradient ? 'text-slate-600/80' : 'text-slate-500')}>
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} ·
                      Considera agendamentos criados com status aguardando execução (agendado, confirmado, pendente)
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    'grid grid-cols-1 gap-4',
                    showCommission ? 'md:grid-cols-5' : 'md:grid-cols-3'
                  )}
                >
                  <div className={cn('rounded-xl p-5 shadow-sm', hasGradient ? 'bg-indigo-500/10 text-indigo-900 border border-indigo-200' : 'bg-slate-50 border border-slate-200')}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2">Atendimentos previstos</p>
                    <p className="text-2xl font-bold">{monthlyForecastTotals.totalPrevisto}</p>
                  </div>
                  <div className={cn('rounded-xl p-5 shadow-sm', hasGradient ? 'bg-emerald-500/10 text-emerald-900 border border-emerald-200' : 'bg-slate-50 border border-slate-200')}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2">Valor previsto (à receber)</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthlyForecastTotals.valorPrevisto)}</p>
                  </div>
                  {showCommission && (
                    <div className={cn('rounded-xl p-5 shadow-sm', hasGradient ? 'bg-amber-500/10 text-amber-900 border border-amber-200' : 'bg-slate-50 border border-slate-200')}>
                      <p className="text-xs font-medium uppercase tracking-wide mb-2">Comissão prevista</p>
                      <p className="text-2xl font-bold">{formatCurrency(monthlyForecastTotals.comissaoPrevista)}</p>
                    </div>
                  )}
                  {showCommission && (
                    <div className={cn('rounded-xl p-5 shadow-sm', hasGradient ? 'bg-purple-500/10 text-purple-900 border border-purple-200' : 'bg-slate-50 border border-slate-200')}>
                      <p className="text-xs font-medium uppercase tracking-wide mb-2">Repasse previsto</p>
                      <p className="text-2xl font-bold">{formatCurrency(monthlyForecastTotals.repassePrevisto)}</p>
                    </div>
                  )}
                  <div className={cn('rounded-xl p-5 shadow-sm', 'bg-slate-900 text-white')}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2">Valor bruto total (real + previsto)</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthlyForecastTotals.valorBrutoGeral)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

              {/* Summary Cards */}
              <div
            className={cn(
              'grid grid-cols-1 gap-4 mb-6',
              showCommission ? 'md:grid-cols-2 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-3'
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-blue-600')}>Total Atendimentos</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{totals.totalAtendimentos}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-emerald-600')}>Valor Bruto</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{formatCurrency(totals.valorBruto)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            {showCommission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div
                  className={cn(
                  'rounded-xl p-6 shadow-xl transition-all duration-300',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'text-white'
                        : isVibrant
                        ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white'
                        : 'app-card text-slate-900'
                      : isNeutral
                      ? 'app-card text-slate-900'
                      : 'app-card text-slate-900'
                  )}
                  style={
                    isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-amber-600')}>Comissão Empresa</p>
                      <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{formatCurrency(totals.comissaoSalao)}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {showCommission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div
                  className={cn(
                  'rounded-xl p-6 shadow-xl transition-all duration-300',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'text-white'
                        : isVibrant
                        ? 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-white'
                        : 'app-card text-slate-900'
                      : isNeutral
                      ? 'app-card text-slate-900'
                      : 'app-card text-slate-900'
                  )}
                  style={
                    isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-purple-600')}>Repasse Profissionais</p>
                      <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{formatCurrency(totals.repasseProfissional)}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-blue-600')}>Valor Bruto Previsto</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{formatCurrency(monthlyForecastTotals.valorPrevisto)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Detailed Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'overflow-hidden rounded-2xl border shadow-xl',
              hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-xl' : 'bg-white/80 border-white/20 backdrop-blur-lg'
            )}
          >
            <div
              className={cn(
                'px-6 py-4 border-b',
                hasGradient ? 'bg-white/40 border-white/25' : 'bg-gradient-to-r from-blue-50 to-purple-50'
              )}
            >
              <h3 className={cn('text-lg font-bold', hasGradient ? 'text-slate-900' : 'text-gray-900')}>
                {reportType === 'professionals' && 'Detalhamento por Profissional'}
                {reportType === 'patients' && `Detalhamento por ${singularTitle}`}
                {reportType === 'services' && 'Detalhamento por Serviço'}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {/* Tabela por Profissionais */}
              {reportType === 'professionals' && (
                <table className="w-full">
                  <thead className={cn('bg-gray-50', hasGradient ? 'bg-white/40 text-slate-600' : 'bg-gray-50')}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profissional
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atendimentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Bruto
                      </th>
                      {showCommission && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comissão Empresa
                        </th>
                      )}
                      {showCommission && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Repasse Profissional
                        </th>
                      )}
                      {showCommission && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          %
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className={cn('divide-y', hasGradient ? 'bg-white/70 divide-white/20' : 'bg-white divide-gray-200')}>
                    {financialData.length === 0 ? (
                      <tr>
                        <td colSpan={showCommission ? 6 : 3} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Nenhum dado encontrado</p>
                            <p className="text-sm">Não há atendimentos concluídos no período selecionado.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      financialData.map((data, index) => (
                        <motion.tr
                          key={data.professionalId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className={cn('transition-colors', hasGradient ? 'hover:bg-white/40' : 'hover:bg-gray-50')}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {data.professionalName.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {data.professionalName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.totalAtendimentos}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(data.valorBruto)}
                          </td>
                          {showCommission && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(data.comissaoSalao)}
                            </td>
                          )}
                          {showCommission && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(data.repasseProfissional)}
                            </td>
                          )}
                          {showCommission && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {data.valorBruto > 0 ? ((data.comissaoSalao / data.valorBruto) * 100).toFixed(1) : '0.0'}%
                            </td>
                          )}
                        </motion.tr>
                      ))
                    )}
                    
                    {/* Total Row */}
                    {financialData.length > 0 && (
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className={cn('font-semibold', hasGradient ? 'bg-white/40' : 'bg-gray-50')}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          TOTAL
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {totals.totalAtendimentos}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(totals.valorBruto)}
                        </td>
                        {showCommission && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(totals.comissaoSalao)}
                          </td>
                        )}
                        {showCommission && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(totals.repasseProfissional)}
                          </td>
                        )}
                        {showCommission && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {totals.valorBruto > 0 ? ((totals.comissaoSalao / totals.valorBruto) * 100).toFixed(1) : '0.0'}%
                          </td>
                        )}
                      </motion.tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Tabela por Pacientes */}
              {reportType === 'patients' && (
                <table className="w-full">
                  <thead className={cn('bg-gray-50', hasGradient ? 'bg-white/40 text-slate-600' : 'bg-gray-50')}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {singularTitle}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atendimentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Total Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Atendimento
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn('divide-y', hasGradient ? 'bg-white/70 divide-white/20' : 'bg-white divide-gray-200')}>
                    {patientRevenueData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Nenhum dado encontrado</p>
                            <p className="text-sm">Não há atendimentos concluídos no período selecionado.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      patientRevenueData.map((data, index) => (
                        <motion.tr
                          key={data.patientId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className={cn('transition-colors', hasGradient ? 'hover:bg-white/40' : 'hover:bg-gray-50')}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {data.patientName.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {data.patientName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.totalAtendimentos}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(data.valorTotalPago)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {moment(data.ultimoAtendimento).format('DD/MM/YYYY HH:mm')}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Tabela por Serviços */}
              {reportType === 'services' && (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atendimentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Total Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Médio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceRevenueData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Nenhum dado encontrado</p>
                            <p className="text-sm">Não há atendimentos concluídos no período selecionado.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      serviceRevenueData.map((data, index) => (
                        <motion.tr
                          key={data.serviceId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {data.serviceName.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {data.serviceName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.totalAtendimentos}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(data.valorTotalPago)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {formatCurrency(data.valorMedioPorAtendimento)}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
            </>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}
