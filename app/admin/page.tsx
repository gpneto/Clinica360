'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { useAIMetrics, AIMetric, AIUsageLog, AIMetricsDaily, AIMetricsStats } from '@/hooks/useAIMetrics';
import { useCompanies } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Clock,
  Database,
  Code,
  Building2,
  Calendar,
  MessageSquare,
  BarChart3,
  Filter,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

function formatDate(date: Date | any): string {
  if (!date) return 'N/A';
  
  try {
    // Se for Timestamp do Firestore
    if (date.toDate && typeof date.toDate === 'function') {
      return format(date.toDate(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    }
    // Se for Date
    if (date instanceof Date) {
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    }
    // Se for objeto com seconds
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    }
    return 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

type TabType = 'metrics' | 'daily' | 'logs';

interface Filters {
  companyId: string;
  functionName: string;
  status: 'all' | 'success' | 'error';
  model: string;
  dateStart: string;
  dateEnd: string;
}

export default function AdminPage() {
  const { metrics, dailyMetrics, usageLogs, stats, loading, error, hasMore, loadMore } = useAIMetrics(50);
  const { companies } = useCompanies();
  const [selectedMetric, setSelectedMetric] = useState<AIMetric | null>(null);
  const [selectedLog, setSelectedLog] = useState<AIUsageLog | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    companyId: '',
    functionName: '',
    status: 'all',
    model: '',
    dateStart: '',
    dateEnd: '',
  });

  // Criar mapeamento de companyId -> nome da empresa
  const companyMap = new Map<string, string>();
  companies.forEach(company => {
    companyMap.set(company.id, company.nome);
  });

  // Função para obter o nome da empresa ou retornar o ID se não encontrar
  const getCompanyDisplay = (companyId: string): string => {
    const companyName = companyMap.get(companyId);
    if (companyName) {
      return `${companyName} (${companyId})`;
    }
    return companyId;
  };

  // Obter funções únicas
  const uniqueFunctions = Array.from(new Set([
    ...metrics.map(m => m.functionName),
    ...usageLogs.map(l => 'aiAssistant') // Logs sempre são aiAssistant
  ])).filter(Boolean).sort();

  // Obter modelos únicos
  const uniqueModels = Array.from(new Set([
    ...metrics.map(m => m.model),
    ...usageLogs.map(l => l.model)
  ])).filter(Boolean).sort();

  // Função para verificar se uma data está no intervalo
  const isDateInRange = (date: Date | Timestamp | any, start?: string, end?: string): boolean => {
    if (!start && !end) return true;
    
    try {
      let dateObj: Date;
      if (date?.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (date?.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else {
        return true;
      }

      if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        if (dateObj < startDate) return false;
      }

      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        if (dateObj > endDate) return false;
      }

      return true;
    } catch {
      return true;
    }
  };

  // Aplicar filtros aos dados
  const filteredMetrics = metrics.filter(metric => {
    if (filters.companyId && metric.companyId !== filters.companyId) return false;
    if (filters.functionName && metric.functionName !== filters.functionName) return false;
    if (filters.status === 'success' && !metric.success) return false;
    if (filters.status === 'error' && metric.success) return false;
    if (filters.model && metric.model !== filters.model) return false;
    if (!isDateInRange(metric.createdAt, filters.dateStart, filters.dateEnd)) return false;
    return true;
  });

  const filteredDailyMetrics = dailyMetrics.filter(daily => {
    if (filters.companyId && daily.companyId !== filters.companyId) return false;
    if (filters.dateStart && daily.date < filters.dateStart) return false;
    if (filters.dateEnd && daily.date > filters.dateEnd) return false;
    return true;
  });

  const filteredUsageLogs = usageLogs.filter(log => {
    if (filters.companyId && log.companyId !== filters.companyId) return false;
    if (filters.status === 'success' && log.error) return false;
    if (filters.status === 'error' && !log.error) return false;
    if (filters.model && log.model !== filters.model) return false;
    if (!isDateInRange(log.createdAt, filters.dateStart, filters.dateEnd)) return false;
    return true;
  });

  // Recalcular estatísticas com dados filtrados
  const filteredStats: AIMetricsStats | null = stats ? {
    totalCalls: filteredMetrics.length,
    successfulCalls: filteredMetrics.filter(m => m.success).length,
    failedCalls: filteredMetrics.filter(m => !m.success).length,
    totalCost: filteredMetrics.reduce((sum, m) => sum + (m.cost?.totalUSD || 0), 0),
    totalTokens: filteredMetrics.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
    averageProcessingTime: filteredMetrics.length > 0
      ? filteredMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / filteredMetrics.length
      : 0,
    callsByFunction: filteredMetrics.reduce((acc, m) => {
      acc[m.functionName] = (acc[m.functionName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    callsByCompany: filteredMetrics.reduce((acc, m) => {
      acc[m.companyId] = (acc[m.companyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  } : null;

  const hasActiveFilters = 
    filters.companyId !== '' ||
    filters.functionName !== '' ||
    filters.status !== 'all' ||
    filters.model !== '' ||
    filters.dateStart !== '' ||
    filters.dateEnd !== '';

  const clearFilters = () => {
    setFilters({
      companyId: '',
      functionName: '',
      status: 'all',
      model: '',
      dateStart: '',
      dateEnd: '',
    });
  };

  return (
    <AccessGuard allowed={['super_admin']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  Painel Administrativo
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Métricas e estatísticas do sistema
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {[
                      filters.companyId,
                      filters.functionName,
                      filters.status !== 'all' ? filters.status : '',
                      filters.model,
                      filters.dateStart,
                      filters.dateEnd
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </Button>
              )}
            </div>
          </motion.div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Filtro por Empresa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <select
                    value={filters.companyId}
                    onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas as empresas</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Função */}
                {activeTab === 'metrics' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Função
                    </label>
                    <select
                      value={filters.functionName}
                      onChange={(e) => setFilters({ ...filters, functionName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todas as funções</option>
                      {uniqueFunctions.map(func => (
                        <option key={func} value={func}>
                          {func}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro por Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="success">Sucesso</option>
                    <option value="error">Erro</option>
                  </select>
                </div>

                {/* Filtro por Modelo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <select
                    value={filters.model}
                    onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os modelos</option>
                    {uniqueModels.map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Data Inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inicial
                  </label>
                  <Input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                    className="w-full"
                  />
                </div>

                {/* Filtro por Data Final */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Cards */}
          {filteredStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total de Chamadas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(filteredStats.totalCalls)}
                      </p>
                    </div>
                    <Database className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-green-600">
                        {filteredStats.totalCalls > 0
                          ? ((filteredStats.successfulCalls / filteredStats.totalCalls) * 100).toFixed(1)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {filteredStats.successfulCalls} sucessos / {filteredStats.failedCalls} falhas
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Custo Total</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(filteredStats.totalCost)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tempo Médio</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatTime(filteredStats.averageProcessingTime)}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Métricas
              </div>
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'daily'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Métricas Diárias
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Logs de Uso
              </div>
            </button>
          </div>

          {/* Charts Section - Apenas na aba metrics */}
          {activeTab === 'metrics' && filteredStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chamadas por Função */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Chamadas por Função
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(filteredStats.callsByFunction)
                      .sort(([, a], [, b]) => b - a)
                      .map(([functionName, count]) => (
                        <div key={functionName} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {functionName}
                          </span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    {Object.keys(filteredStats.callsByFunction).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma métrica disponível
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chamadas por Empresa */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Chamadas por Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(filteredStats.callsByCompany)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([companyId, count]) => (
                        <div key={companyId} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[300px]" title={getCompanyDisplay(companyId)}>
                            {getCompanyDisplay(companyId)}
                          </span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    {Object.keys(filteredStats.callsByCompany).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma métrica disponível
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Metrics Table - Apenas na aba metrics */}
          {activeTab === 'metrics' && (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Métricas Detalhadas
                </CardTitle>
              </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-2">Erro ao carregar métricas</p>
                  <p className="text-sm text-gray-500">{error}</p>
                </div>
              )}

              {!loading && !error && metrics.length === 0 && (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Nenhuma métrica encontrada</p>
                </div>
              )}

              {!loading && !error && metrics.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Data/Hora
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Função
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Tempo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Tokens
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Custo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Empresa
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics.map((metric) => (
                        <tr
                          key={metric.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(metric.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="font-mono text-xs">
                              {metric.functionName}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {metric.success ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatTime(metric.processingTimeMs)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatNumber(metric.tokens?.total || 0)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-purple-600">
                            {formatCurrency(metric.cost?.totalUSD || 0)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {getCompanyDisplay(metric.companyId)}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMetric(metric)}
                            >
                              Ver Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {hasMore && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" onClick={loadMore}>
                        Carregar Mais
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Daily Metrics Table */}
          {activeTab === 'daily' && (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Métricas Diárias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <p className="text-red-600 mb-2">Erro ao carregar métricas diárias</p>
                    <p className="text-sm text-gray-500">{error}</p>
                  </div>
                )}

                {!loading && !error && dailyMetrics.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhuma métrica diária encontrada</p>
                  </div>
                )}

                {!loading && !error && dailyMetrics.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Data
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Empresa
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Total de Chamadas
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Total de Tokens
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Custo Total
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Última Atualização
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDailyMetrics.map((daily) => {
                          // Extrair contadores por função (excluindo campos padrão)
                          const functionCounts = Object.entries(daily)
                            .filter(([key]) => 
                              !['id', 'companyId', 'date', 'totalCalls', 'totalCost', 'totalTokens', 'lastUpdated'].includes(key)
                            )
                            .filter(([, value]) => typeof value === 'number' && value > 0)
                            .map(([key, value]) => ({ functionName: key, count: value as number }));

                          return (
                            <tr
                              key={daily.id}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {daily.date ? format(new Date(daily.date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {getCompanyDisplay(daily.companyId)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatNumber(daily.totalCalls)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatNumber(daily.totalTokens)}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-purple-600">
                                {formatCurrency(daily.totalCost)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDate(daily.lastUpdated)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Usage Logs Table */}
          {activeTab === 'logs' && (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Logs de Uso da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <p className="text-red-600 mb-2">Erro ao carregar logs de uso</p>
                    <p className="text-sm text-gray-500">{error}</p>
                  </div>
                )}

                {!loading && !error && usageLogs.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhum log de uso encontrado</p>
                  </div>
                )}

                {!loading && !error && usageLogs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Data/Hora
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Tempo
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Tokens
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Custo
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Empresa
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsageLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              {log.error ? (
                                <Badge className="bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Erro
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Sucesso
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatTime(log.processingTimeMs)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatNumber(log.tokens?.total || 0)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-purple-600">
                              {formatCurrency(log.cost?.totalUSD || 0)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {getCompanyDisplay(log.companyId)}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                Ver Detalhes
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detail Modal - Metrics */}
          {selectedMetric && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedMetric(null)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Detalhes da Métrica
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedMetric(null)}
                    >
                      ×
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">ID</label>
                      <p className="text-sm text-gray-600 font-mono">{selectedMetric.id}</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Função</label>
                      <p className="text-sm text-gray-600">{selectedMetric.functionName}</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Status</label>
                      <div className="mt-1">
                        {selectedMetric.success ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </div>
                    </div>

                    {selectedMetric.error && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Erro</label>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                          {selectedMetric.error}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Tempo de Processamento</label>
                        <p className="text-sm text-gray-600">{formatTime(selectedMetric.processingTimeMs)}</p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700">Modelo</label>
                        <p className="text-sm text-gray-600">{selectedMetric.model}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Tokens</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          Prompt: {formatNumber(selectedMetric.tokens?.prompt || 0)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Completion: {formatNumber(selectedMetric.tokens?.completion || 0)}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          Total: {formatNumber(selectedMetric.tokens?.total || 0)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Custo</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          Input: {formatCurrency(selectedMetric.cost?.inputUSD || 0)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Output: {formatCurrency(selectedMetric.cost?.outputUSD || 0)}
                        </p>
                        <p className="text-sm font-medium text-purple-600">
                          Total: {formatCurrency(selectedMetric.cost?.totalUSD || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Empresa</label>
                        <p className="text-sm text-gray-600">{getCompanyDisplay(selectedMetric.companyId)}</p>
                      </div>

                      {selectedMetric.userId && (
                        <div>
                          <label className="text-sm font-semibold text-gray-700">Usuário ID</label>
                          <p className="text-sm text-gray-600 font-mono">{selectedMetric.userId}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Data/Hora</label>
                      <p className="text-sm text-gray-600">{formatDate(selectedMetric.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setSelectedMetric(null)}>Fechar</Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Detail Modal - Usage Logs */}
          {selectedLog && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedLog(null)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Detalhes do Log de Uso
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(null)}
                    >
                      ×
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">ID</label>
                      <p className="text-sm text-gray-600 font-mono">{selectedLog.id}</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Status</label>
                      <div className="mt-1">
                        {selectedLog.error ? (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Sucesso
                          </Badge>
                        )}
                      </div>
                    </div>

                    {selectedLog.error && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Erro</label>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                          {selectedLog.error}
                        </p>
                        {selectedLog.errorType && (
                          <p className="text-xs text-gray-500 mt-1">
                            Tipo: {selectedLog.errorType}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Tempo de Processamento</label>
                        <p className="text-sm text-gray-600">{formatTime(selectedLog.processingTimeMs)}</p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700">Modelo</label>
                        <p className="text-sm text-gray-600">{selectedLog.model}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Mensagem do Usuário</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedLog.userMessage || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedLog.assistantResponse && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Resposta do Assistente</label>
                        <div className="mt-1 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedLog.assistantResponse}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedLog.functionCalls && selectedLog.functionCalls.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Chamadas de Função</label>
                        <div className="mt-1 space-y-2">
                          {selectedLog.functionCalls.map((fc, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">{fc.name}</span>
                                {fc.success ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Sucesso
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Erro
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Tokens</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          Prompt: {formatNumber(selectedLog.tokens?.prompt || 0)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Completion: {formatNumber(selectedLog.tokens?.completion || 0)}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          Total: {formatNumber(selectedLog.tokens?.total || 0)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Custo</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          Input: {formatCurrency(selectedLog.cost?.inputUSD || 0)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Output: {formatCurrency(selectedLog.cost?.outputUSD || 0)}
                        </p>
                        <p className="text-sm font-medium text-purple-600">
                          Total: {formatCurrency(selectedLog.cost?.totalUSD || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Empresa</label>
                        <p className="text-sm text-gray-600">{getCompanyDisplay(selectedLog.companyId)}</p>
                      </div>

                      {selectedLog.userId && (
                        <div>
                          <label className="text-sm font-semibold text-gray-700">Usuário ID</label>
                          <p className="text-sm text-gray-600 font-mono">{selectedLog.userId}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Data/Hora</label>
                      <p className="text-sm text-gray-600">{formatDate(selectedLog.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setSelectedLog(null)}>Fechar</Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}

