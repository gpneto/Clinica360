'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  Filter, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import CurrencyInput from 'react-currency-input-field';
import { usePatientDebits } from '@/hooks/useFirestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DebitoPaciente } from '@/types';

interface FinanceiroTabProps {
  companyId: string | null | undefined;
  patientId: string | null | undefined;
  hasGradient?: boolean;
  isCustom?: boolean;
  gradientColors?: { start: string; middle: string; end: string };
  isVibrant?: boolean;
  gradientStyleHorizontal?: React.CSSProperties | null;
}

export function FinanceiroTab({
  companyId,
  patientId,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
  gradientStyleHorizontal,
}: FinanceiroTabProps) {
  const { debitos, loading, createDebito, addLancamento } = usePatientDebits(companyId, patientId);
  
  const [showNovoDebito, setShowNovoDebito] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'parcial' | 'concluido' | 'atrasado'>('todos');
  
  // Estados para novo débito
  const [novoDebito, setNovoDebito] = useState({
    procedimento: '',
    valorTotalCentavos: 0,
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);

  // Calcular totais
  const totais = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let totalAtrasado = 0;
    let totalAReceber = 0;
    let totalRecebido = 0;

    debitos.forEach((debito) => {
      // Verificar se está atrasado (vencimento passado e ainda tem saldo a receber)
      const vencimento = debito.updatedAt || debito.createdAt;
      const estaAtrasado = vencimento < hoje && debito.saldoReceberCentavos > 0;

      if (estaAtrasado) {
        totalAtrasado += debito.saldoReceberCentavos;
      }

      totalAReceber += debito.saldoReceberCentavos;
      totalRecebido += debito.saldoRecebidoCentavos;
    });

    return {
      atrasado: totalAtrasado,
      aReceber: totalAReceber,
      recebido: totalRecebido,
    };
  }, [debitos]);

  // Filtrar débitos
  const debitosFiltrados = useMemo(() => {
    return debitos.filter((debito) => {
      // Filtro por texto
      if (filtroTexto) {
        const textoLower = filtroTexto.toLowerCase();
        const matchProcedimento = debito.procedimento.toLowerCase().includes(textoLower);
        const matchObservacoes = debito.observacoes?.toLowerCase().includes(textoLower) || false;
        if (!matchProcedimento && !matchObservacoes) return false;
      }

      // Filtro por status
      if (filtroStatus === 'todos') return true;
      if (filtroStatus === 'atrasado') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = debito.updatedAt || debito.createdAt;
        return vencimento < hoje && debito.saldoReceberCentavos > 0;
      }
      return debito.status === filtroStatus;
    });
  }, [debitos, filtroTexto, filtroStatus]);

  const formatarValor = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const handleCriarDebito = async () => {
    if (!novoDebito.procedimento || !novoDebito.valorTotalCentavos || novoDebito.valorTotalCentavos === 0) {
      return;
    }

    setSalvando(true);
    try {
      await createDebito({
        companyId: companyId || '',
        patientId: patientId || '',
        procedimento: novoDebito.procedimento,
        valorTotalCentavos: novoDebito.valorTotalCentavos,
        saldoReceberCentavos: novoDebito.valorTotalCentavos,
        saldoRecebidoCentavos: 0,
        lancamentos: [],
        status: 'pendente',
        observacoes: novoDebito.observacoes || undefined,
      });

      setNovoDebito({
        procedimento: '',
        valorTotalCentavos: 0,
        observacoes: '',
      });
      setShowNovoDebito(false);
    } catch (error) {
      console.error('Erro ao criar débito:', error);
    } finally {
      setSalvando(false);
    }
  };

  const getStatusBadge = (debito: DebitoPaciente) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = debito.updatedAt || debito.createdAt;
    const estaAtrasado = vencimento < hoje && debito.saldoReceberCentavos > 0;

    if (estaAtrasado) {
      return (
        <Badge className="bg-red-500 text-white">
          <AlertCircle className="w-3 h-3 mr-1" />
          Atrasado
        </Badge>
      );
    }

    switch (debito.status) {
      case 'concluido':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'parcial':
        return (
          <Badge className="bg-yellow-500 text-white">
            Parcial
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500 text-white">
            Pendente
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            'border-2 shadow-lg',
            hasGradient
              ? 'bg-white/80 border-red-200/50 backdrop-blur-xl'
              : 'bg-white border-red-200'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Atrasado
                </CardTitle>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatarValor(totais.atrasado)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className={cn(
            'border-2 shadow-lg',
            hasGradient
              ? 'bg-white/80 border-blue-200/50 backdrop-blur-xl'
              : 'bg-white border-blue-200'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total a Receber
                </CardTitle>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatarValor(totais.aReceber)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className={cn(
            'border-2 shadow-lg',
            hasGradient
              ? 'bg-white/80 border-green-200/50 backdrop-blur-xl'
              : 'bg-white border-green-200'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Recebido
                </CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatarValor(totais.recebido)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Header com Botão Novo Débito */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'rounded-2xl p-6 shadow-xl border-2 backdrop-blur-xl',
          hasGradient
            ? isCustom && gradientColors
              ? 'bg-white/90 border-white/40'
              : isVibrant
              ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
              : 'bg-white/90 border-white/40'
            : 'bg-white border-gray-200'
        )}
        style={
          hasGradient && isCustom && gradientColors
            ? {
                borderColor: `${gradientColors.start}40`,
                background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
              }
            : undefined
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg',
                isVibrant
                  ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                  : isCustom && gradientColors
                  ? ''
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              )}
              style={
                isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            >
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h2 className={cn(
                'text-2xl font-bold',
                hasGradient 
                  ? isCustom && gradientColors
                    ? 'bg-clip-text text-transparent'
                    : isVibrant
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                    : 'text-slate-900'
                  : 'text-gray-900'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : undefined
              }
              >
                Financeiro
              </h2>
              <p className={cn(
                'text-sm mt-1 font-medium',
                hasGradient 
                  ? isCustom && gradientColors
                    ? 'text-slate-600'
                    : 'text-slate-600'
                  : 'text-gray-600'
              )}>
                {debitos.length} {debitos.length === 1 ? 'débito cadastrado' : 'débitos cadastrados'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowNovoDebito(!showNovoDebito)}
            className={cn(
              'gap-2 shadow-lg hover:shadow-xl transition-all text-white font-semibold h-12 px-6 rounded-xl',
              hasGradient
                ? isCustom && gradientColors
                  ? ''
                  : isVibrant
                  ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            )}
            style={
              hasGradient && isCustom && gradientColors
                ? {
                    background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                  }
                : undefined
            }
          >
            <Plus className="w-5 h-5" />
            Novo Débito
          </Button>
        </div>
      </motion.div>

      {/* Formulário Novo Débito */}
      {showNovoDebito && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn(
            'rounded-2xl p-6 shadow-xl border-2 backdrop-blur-xl overflow-hidden',
            hasGradient
              ? 'bg-white/90 border-white/40'
              : 'bg-white border-gray-200'
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Débito</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNovoDebito(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block text-gray-700">
                  Procedimento *
                </Label>
                <Input
                  value={novoDebito.procedimento}
                  onChange={(e) => setNovoDebito(prev => ({ ...prev, procedimento: e.target.value }))}
                  placeholder="Nome do procedimento"
                  className="bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block text-gray-700">
                  Valor Total *
                </Label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 font-bold z-10 text-lg group-focus-within:text-green-600 transition-colors">R$</div>
                  <CurrencyInput
                    value={novoDebito.valorTotalCentavos / 100}
                    onKeyDown={(e) => {
                      // Tratar Backspace e Delete
                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        e.preventDefault();
                        const newCentavos = Math.floor(novoDebito.valorTotalCentavos / 10);
                        setNovoDebito(prev => ({ ...prev, valorTotalCentavos: newCentavos }));
                        return;
                      }
                      
                      // Permitir outras teclas de controle
                      if (e.key === 'Tab' || e.key === 'Enter' || 
                          e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                          (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
                        return;
                      }
                      
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                        return;
                      }
                      
                      // Multiplicar por 10 e adicionar o novo dígito
                      const newCentavos = novoDebito.valorTotalCentavos * 10 + parseInt(e.key);
                      e.preventDefault();
                      setNovoDebito(prev => ({ ...prev, valorTotalCentavos: newCentavos }));
                    }}
                    onValueChange={(value, name, values) => {
                      // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                      if (!value || value.includes(',') || value.includes('.')) {
                        const floatValue = values?.float ?? 0;
                        const valorCentavos = Math.round(floatValue * 100);
                        setNovoDebito(prev => ({ ...prev, valorTotalCentavos: valorCentavos }));
                      }
                    }}
                    decimalsLimit={2}
                    decimalSeparator=","
                    groupSeparator=""
                    prefix=""
                    className="w-full rounded-lg border-2 pl-12 pr-5 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white transition-all duration-200 hover:shadow-sm border-slate-300 focus:border-green-500 focus:ring-green-200"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold mb-2 block text-gray-700">
                Observações
              </Label>
              <Textarea
                value={novoDebito.observacoes}
                onChange={(e) => setNovoDebito(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais (opcional)"
                rows={3}
                className="bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNovoDebito(false);
                  setNovoDebito({
                    procedimento: '',
                    valorTotalCentavos: 0,
                    observacoes: '',
                  });
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCriarDebito}
                disabled={salvando || !novoDebito.procedimento || !novoDebito.valorTotalCentavos || novoDebito.valorTotalCentavos === 0}
                className={cn(
                  'text-white',
                  hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                {salvando ? 'Salvando...' : 'Salvar Débito'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'rounded-xl p-4 shadow-lg border backdrop-blur-xl',
          hasGradient
            ? 'bg-white/60 border-white/40'
            : 'bg-white border-gray-200'
        )}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar por procedimento ou observações..."
                className="pl-10 bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className={filtroStatus === 'todos' ? 'bg-green-600 text-white' : ''}
            >
              Todos
            </Button>
            <Button
              variant={filtroStatus === 'pendente' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('pendente')}
              className={filtroStatus === 'pendente' ? 'bg-blue-600 text-white' : ''}
            >
              Pendente
            </Button>
            <Button
              variant={filtroStatus === 'parcial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('parcial')}
              className={filtroStatus === 'parcial' ? 'bg-yellow-600 text-white' : ''}
            >
              Parcial
            </Button>
            <Button
              variant={filtroStatus === 'concluido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('concluido')}
              className={filtroStatus === 'concluido' ? 'bg-green-600 text-white' : ''}
            >
              Concluído
            </Button>
            <Button
              variant={filtroStatus === 'atrasado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('atrasado')}
              className={filtroStatus === 'atrasado' ? 'bg-red-600 text-white' : ''}
            >
              Atrasado
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Lista de Débitos */}
      {loading ? (
        <div className={cn(
          'flex items-center justify-center py-20 rounded-2xl',
          hasGradient
            ? 'bg-white/60 backdrop-blur-xl border-2 border-white/40'
            : 'bg-white border-2 border-gray-200'
        )}>
          <div className="text-center">
            <div className={cn(
              'animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4',
              hasGradient
                ? isCustom && gradientColors
                  ? ''
                  : 'border-green-500'
                : 'border-green-500'
            )}
            style={
              hasGradient && isCustom && gradientColors
                ? {
                    borderColor: gradientColors.start,
                  }
                : undefined
            }
            />
            <p className={cn(
              'text-sm font-medium',
              hasGradient ? 'text-slate-600' : 'text-gray-600'
            )}>
              Carregando débitos...
            </p>
          </div>
        </div>
      ) : debitosFiltrados.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'py-16 text-center rounded-2xl',
            hasGradient
              ? 'bg-white/60 backdrop-blur-xl border-2 border-white/40'
              : 'bg-white border-2 border-gray-200'
          )}
        >
          <div className={cn(
            'inline-flex h-20 w-20 items-center justify-center rounded-2xl mb-6 border-2 shadow-lg',
            hasGradient
              ? isCustom && gradientColors
                ? 'bg-white/80 border-white/50'
                : 'bg-slate-100/60 border-white/40'
              : 'bg-gray-100 border-gray-200/60'
          )}
          style={
            hasGradient && isCustom && gradientColors
              ? {
                  backgroundColor: `${gradientColors.start}20`,
                  borderColor: `${gradientColors.start}50`,
                }
              : undefined
          }
          >
            <Wallet className={cn(
              'w-10 h-10',
              hasGradient 
                ? isCustom && gradientColors
                  ? 'text-slate-600'
                  : 'text-slate-500'
                : 'text-gray-500'
            )} />
          </div>
          <h3 className={cn(
            'text-lg font-bold mb-2',
            hasGradient 
              ? isCustom && gradientColors
                ? 'text-slate-800'
                : 'text-slate-700'
              : 'text-gray-700'
          )}>
            {filtroTexto || filtroStatus !== 'todos' 
              ? 'Nenhum débito encontrado' 
              : 'Nenhum débito cadastrado'}
          </h3>
          <p className={cn(
            'text-sm',
            hasGradient 
              ? isCustom && gradientColors
                ? 'text-slate-600'
                : 'text-slate-600'
              : 'text-gray-600'
          )}>
            {filtroTexto || filtroStatus !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando um novo débito'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {debitosFiltrados.map((debito) => (
            <motion.div
              key={debito.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl p-6 shadow-lg border-2 backdrop-blur-xl',
                hasGradient
                  ? 'bg-white/80 border-white/40'
                  : 'bg-white border-gray-200'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {debito.procedimento}
                      </h3>
                      {debito.observacoes && (
                        <p className="text-sm text-gray-600 mb-2">
                          {debito.observacoes}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(debito)}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatarValor(debito.valorTotalCentavos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">A Receber</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatarValor(debito.saldoReceberCentavos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Recebido</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatarValor(debito.saldoRecebidoCentavos)}
                      </p>
                    </div>
                  </div>
                  
                  {debito.lancamentos && debito.lancamentos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Lançamentos:</p>
                      <div className="space-y-2">
                        {debito.lancamentos.map((lancamento) => (
                          <div
                            key={lancamento.id}
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">
                                {format(lancamento.data, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {lancamento.formaPagamento && (
                                <Badge variant="outline" className="ml-2">
                                  {lancamento.formaPagamento}
                                </Badge>
                              )}
                            </div>
                            <span className="font-semibold text-green-600">
                              {formatarValor(lancamento.valorCentavos)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Criado em: {format(debito.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

