'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  X,
  FileText,
  Eye,
  Trash2,
  Edit,
  RotateCcw,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import CurrencyInput from 'react-currency-input-field';
import { usePatientDebits, useServices } from '@/hooks/useFirestore';
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
  const router = useRouter();
  const { debitos, loading, createDebito, addLancamento, updateDebito, removeLancamento } = usePatientDebits(companyId, patientId);
  const { services } = useServices(companyId);
  
  const [showNovoDebito, setShowNovoDebito] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'parcial' | 'concluido' | 'atrasado'>('todos');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  
  // Estados para novo débito
  const [novoDebito, setNovoDebito] = useState({
    procedimento: '',
    valorTotalCentavos: 0,
    observacoes: '',
    dataVencimento: '',
  });
  const [salvando, setSalvando] = useState(false);
  
  // Estados para modais de ações
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [debitoSelecionado, setDebitoSelecionado] = useState<DebitoPaciente | null>(null);
  const [novoLancamento, setNovoLancamento] = useState({
    valorCentavos: 0,
    data: new Date(),
    formaPagamento: '' as 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'outros' | '',
    observacoes: '',
  });
  const [editarDebito, setEditarDebito] = useState({
    procedimento: '',
    valorTotalCentavos: 0,
    observacoes: '',
    dataVencimento: '',
  });
  const [selectedServiceIdsEditar, setSelectedServiceIdsEditar] = useState<string[]>([]);
  const [showServiceModalEditar, setShowServiceModalEditar] = useState(false);
  const [serviceQueryEditar, setServiceQueryEditar] = useState('');
  const [adicionandoPagamento, setAdicionandoPagamento] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [removendoLancamento, setRemovendoLancamento] = useState<string | null>(null);

  // Calcular totais
  const totais = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let totalAtrasado = 0;
    let totalAReceber = 0;
    let totalRecebido = 0;

    debitos.forEach((debito) => {
      // Verificar se está atrasado (vencimento passado e ainda tem saldo a receber)
      const vencimento = debito.dataVencimento 
        ? new Date(debito.dataVencimento)
        : (debito.updatedAt || debito.createdAt);
      vencimento.setHours(0, 0, 0, 0);
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

  // Filtrar serviços
  const filteredServices = useMemo(() => {
    // Filtrar apenas serviços ativos
    const activeServices = services.filter(s => s.ativo);
    
    const normalizeString = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const term = serviceQuery.trim();
    const normalizedTerm = normalizeString(term);
    if (!normalizedTerm) return activeServices;
    const result = activeServices.filter((service) => {
      const name = service.nome ? normalizeString(service.nome) : '';
      return name.includes(normalizedTerm);
    });
    return result;
  }, [serviceQuery, services]);

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
        const vencimento = debito.dataVencimento 
          ? new Date(debito.dataVencimento)
          : (debito.updatedAt || debito.createdAt);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento < hoje && debito.saldoReceberCentavos > 0;
      }
      return debito.status === filtroStatus;
    });
  }, [debitos, filtroTexto, filtroStatus]);

  // Quando serviços forem selecionados, preencher automaticamente
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const isSelected = prev.includes(serviceId);
      const newIds = isSelected 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      // Atualizar procedimento e valor total baseado nos serviços selecionados
      const selectedServices = services.filter(s => newIds.includes(s.id));
      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
      const procedimentoText = selectedServices.length > 0
        ? selectedServices.map(s => s.nome).join(', ')
        : '';
      
      setNovoDebito(prev => ({
        ...prev,
        procedimento: procedimentoText,
        valorTotalCentavos: totalPrice,
      }));
      
      return newIds;
    });
  };

  const handleConfirmServices = () => {
    setShowServiceModal(false);
    setServiceQuery('');
  };

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
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
        dataVencimento: novoDebito.dataVencimento ? new Date(novoDebito.dataVencimento) : undefined,
      } as any);

                  setNovoDebito({
                    procedimento: '',
                    valorTotalCentavos: 0,
                    observacoes: '',
                    dataVencimento: '',
                  });
                  setSelectedServiceIds([]);
                  setShowNovoDebito(false);
    } catch (error) {
      console.error('Erro ao criar débito:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirPagamento = (debito: DebitoPaciente) => {
    setDebitoSelecionado(debito);
    setNovoLancamento({
      valorCentavos: debito.saldoReceberCentavos,
      data: new Date(),
      formaPagamento: '',
      observacoes: '',
    });
    setShowPagamentoModal(true);
  };

  const handleAdicionarPagamento = async () => {
    if (!debitoSelecionado || !novoLancamento.formaPagamento || novoLancamento.valorCentavos <= 0) {
      return;
    }

    setAdicionandoPagamento(true);
    try {
      await addLancamento(debitoSelecionado.id, {
        valorCentavos: novoLancamento.valorCentavos,
        data: novoLancamento.data,
        formaPagamento: novoLancamento.formaPagamento,
        observacoes: novoLancamento.observacoes || undefined,
      });
      
      setShowPagamentoModal(false);
      setDebitoSelecionado(null);
      setNovoLancamento({
        valorCentavos: 0,
        data: new Date(),
        formaPagamento: '',
        observacoes: '',
      });
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
    } finally {
      setAdicionandoPagamento(false);
    }
  };

  const handleAbrirDetalhes = (debito: DebitoPaciente) => {
    setDebitoSelecionado(debito);
    setShowDetalhesModal(true);
  };

  const handleAbrirEditar = (debito: DebitoPaciente) => {
    setDebitoSelecionado(debito);
    setEditarDebito({
      procedimento: debito.procedimento,
      valorTotalCentavos: debito.valorTotalCentavos,
      observacoes: debito.observacoes || '',
      dataVencimento: debito.dataVencimento ? format(debito.dataVencimento, 'yyyy-MM-dd') : '',
    });
    setSelectedServiceIdsEditar(debito.serviceIds || []);
    setShowEditarModal(true);
  };

  const handleServiceToggleEditar = (serviceId: string) => {
    setSelectedServiceIdsEditar(prev => {
      const isSelected = prev.includes(serviceId);
      const newIds = isSelected 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      // Atualizar procedimento e valor total baseado nos serviços selecionados
      const selectedServices = services.filter(s => newIds.includes(s.id));
      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
      const procedimentoText = selectedServices.length > 0
        ? selectedServices.map(s => s.nome).join(', ')
        : '';
      
      setEditarDebito(prev => ({
        ...prev,
        procedimento: procedimentoText,
        valorTotalCentavos: totalPrice,
      }));
      
      return newIds;
    });
  };

  const handleConfirmServicesEditar = () => {
    setShowServiceModalEditar(false);
    setServiceQueryEditar('');
  };

  const handleReverterPagamento = async (debitoId: string, lancamentoId: string) => {
    if (!confirm('Tem certeza que deseja reverter este pagamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    setRemovendoLancamento(lancamentoId);
    try {
      await removeLancamento(debitoId, lancamentoId);
    } catch (error) {
      console.error('Erro ao reverter pagamento:', error);
      alert('Erro ao reverter pagamento. Tente novamente.');
    } finally {
      setRemovendoLancamento(null);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!debitoSelecionado || !editarDebito.procedimento || editarDebito.valorTotalCentavos <= 0) {
      return;
    }

    setSalvandoEdicao(true);
    try {
      await updateDebito(debitoSelecionado.id, {
        procedimento: editarDebito.procedimento,
        valorTotalCentavos: editarDebito.valorTotalCentavos,
        observacoes: editarDebito.observacoes || undefined,
        serviceIds: selectedServiceIdsEditar.length > 0 ? selectedServiceIdsEditar : undefined,
        dataVencimento: editarDebito.dataVencimento ? new Date(editarDebito.dataVencimento) : undefined,
      } as any);
      
      setShowEditarModal(false);
      setDebitoSelecionado(null);
      setEditarDebito({
        procedimento: '',
        valorTotalCentavos: 0,
        observacoes: '',
        dataVencimento: '',
      });
      setSelectedServiceIdsEditar([]);
    } catch (error) {
      console.error('Erro ao editar débito:', error);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const getStatusBadge = (debito: DebitoPaciente) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = debito.dataVencimento 
      ? new Date(debito.dataVencimento)
      : (debito.updatedAt || debito.createdAt);
    vencimento.setHours(0, 0, 0, 0);
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
            
            <div>
              <Label className="text-sm font-semibold mb-2 block text-gray-700">
                Serviço *
              </Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowServiceModal(true);
                    setServiceQuery('');
                  }}
                  className={cn(
                    'w-full rounded-lg border transition-all text-left px-4 py-3 text-base',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    selectedServiceIds.length > 0
                      ? 'border-green-500 bg-green-50 text-slate-800 focus:border-green-600 focus:ring-green-300'
                      : 'border-slate-300 bg-white text-slate-500 focus:border-green-500 focus:ring-green-200'
                  )}
                >
                  {selectedServiceIds.length > 0 ? (
                    (() => {
                      const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
                      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                      return (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {selectedServices.length === 1 
                              ? selectedServices[0].nome
                              : `${selectedServices.length} serviços selecionados`}
                          </span>
                          <span className="text-xs text-slate-500">
                            R$ {(totalPrice / 100).toFixed(2)}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <span>Selecione um ou mais serviços</span>
                  )}
                </button>
                {selectedServiceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceIds([]);
                      setNovoDebito(prev => ({
                        ...prev,
                        procedimento: '',
                        valorTotalCentavos: 0,
                      }));
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                  >
                    Limpar seleção
                  </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block text-gray-700">
                  Data de Vencimento
                </Label>
                <Input
                  type="date"
                  value={novoDebito.dataVencimento}
                  onChange={(e) => setNovoDebito(prev => ({ ...prev, dataVencimento: e.target.value }))}
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
                    dataVencimento: '',
                  });
                  setSelectedServiceIds([]);
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

      {/* Modal de Seleção de Serviços */}
      {showServiceModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[70] flex items-start justify-center p-4 pt-8 sm:pt-16 backdrop-blur-sm overflow-y-auto',
            hasGradient
              ? isVibrant
                ? 'bg-slate-900/60 backdrop-blur-xl'
                : 'bg-black/50'
              : 'bg-black/50'
          )}
          onClick={() => setShowServiceModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] mt-0',
              hasGradient
                ? isVibrant
                  ? 'bg-white/95 border-white/25 backdrop-blur-2xl'
                  : 'bg-white border-slate-200'
                : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900">Selecionar Serviço</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowServiceModal(false)}
                className={cn(hasGradient && isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  value={serviceQuery}
                  onChange={(e) => setServiceQuery(e.target.value)}
                  placeholder="Buscar serviço por nome"
                  className="pl-10 pr-4 py-3 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {services.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className={cn(
                    'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                    hasGradient && isVibrant
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-green-100 text-green-600'
                  )}>
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className={cn(
                    'text-lg font-semibold mb-2',
                    hasGradient && isVibrant ? 'text-slate-900' : 'text-gray-900'
                  )}>
                    Nenhum serviço cadastrado
                  </h3>
                  <p className={cn(
                    'text-sm mb-6',
                    hasGradient && isVibrant ? 'text-slate-600' : 'text-gray-600'
                  )}>
                    Você precisa cadastrar serviços antes de criar débitos.
                  </p>
                  <Button
                    onClick={() => {
                      setShowServiceModal(false);
                      router.push('/servicos');
                    }}
                    className={cn(
                      'w-full text-white',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-green-600 hover:bg-green-700'
                        : 'bg-green-600 hover:bg-green-700'
                    )}
                    style={hasGradient && isCustom && gradientColors ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    } : undefined}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Serviços
                  </Button>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">Nenhum serviço encontrado para "{serviceQuery}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer',
                          'flex items-center gap-3',
                          isSelected
                            ? hasGradient && isVibrant
                              ? 'bg-indigo-500/20 border-2 border-indigo-500'
                              : 'bg-green-50 border-2 border-green-500'
                            : hasGradient && isVibrant
                            ? 'hover:bg-white/60 border border-transparent hover:border-white/30'
                            : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleServiceToggle(service.id)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{service.nome}</div>
                          <div className="text-sm text-slate-500">
                            R$ {((service.precoCentavos || 0) / 100).toFixed(2)}
                            {service.duracaoMin && ` • ${service.duracaoMin} min`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {selectedServiceIds.length > 0 && (
                  <span>
                    {selectedServiceIds.length} {selectedServiceIds.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedServiceIds([]);
                    setNovoDebito(prev => ({
                      ...prev,
                      procedimento: '',
                      valorTotalCentavos: 0,
                    }));
                  }}
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleConfirmServices}
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
                  Confirmar
                </Button>
              </div>
            </div>
          </motion.div>
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
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded group"
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-600">
                                {formatarValor(lancamento.valorCentavos)}
                              </span>
                              <button
                                onClick={() => handleReverterPagamento(debito.id, lancamento.id)}
                                disabled={removendoLancamento === lancamento.id}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="Reverter pagamento"
                              >
                                {removendoLancamento === lancamento.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Criado em: {format(debito.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  
                  {/* Botões de ação */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                    {debito.saldoReceberCentavos > 0 && (
                      <Button
                        onClick={() => handleAbrirPagamento(debito)}
                        size="sm"
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
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pagar
                      </Button>
                    )}
                    <Button
                      onClick={() => handleAbrirEditar(debito)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleAbrirDetalhes(debito)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Modal de Pagamento */}
      {showPagamentoModal && debitoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'w-full max-w-md mx-4 rounded-2xl shadow-2xl border-2 backdrop-blur-xl',
              hasGradient
                ? 'bg-white/90 border-white/40'
                : 'bg-white border-gray-200'
            )}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Adicionar Pagamento</h2>
                <button
                  onClick={() => {
                    setShowPagamentoModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Débito
                  </Label>
                  <p className="text-sm text-gray-600">{debitoSelecionado.procedimento}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo a receber: {formatarValor(debitoSelecionado.saldoReceberCentavos)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Valor *
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 font-bold z-10 text-lg group-focus-within:text-green-600 transition-colors">R$</div>
                    <CurrencyInput
                      value={novoLancamento.valorCentavos / 100}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          e.preventDefault();
                          const newCentavos = Math.floor(novoLancamento.valorCentavos / 10);
                          setNovoLancamento(prev => ({ ...prev, valorCentavos: newCentavos }));
                          return;
                        }
                        if (e.key === 'Tab' || e.key === 'Enter' || 
                            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                            (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
                          return;
                        }
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                          return;
                        }
                        const newCentavos = novoLancamento.valorCentavos * 10 + parseInt(e.key);
                        e.preventDefault();
                        setNovoLancamento(prev => ({ ...prev, valorCentavos: newCentavos }));
                      }}
                      onValueChange={(value, name, values) => {
                        if (!value || value.includes(',') || value.includes('.')) {
                          const floatValue = values?.float ?? 0;
                          const valorCentavos = Math.round(floatValue * 100);
                          setNovoLancamento(prev => ({ ...prev, valorCentavos: valorCentavos }));
                        }
                      }}
                      decimalsLimit={2}
                      decimalSeparator=","
                      groupSeparator=""
                      prefix=""
                      className="w-full rounded-lg border-2 pl-12 pr-5 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white transition-all duration-200 hover:shadow-sm border-slate-300 focus:border-green-500 focus:ring-green-200"
                      placeholder="0,00"
                      max={debitoSelecionado.saldoReceberCentavos / 100}
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Data *
                  </Label>
                  <Input
                    type="date"
                    value={format(novoLancamento.data, 'yyyy-MM-dd')}
                    onChange={(e) => setNovoLancamento(prev => ({ ...prev, data: new Date(e.target.value) }))}
                    className="bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Forma de Pagamento *
                  </Label>
                  <select
                    value={novoLancamento.formaPagamento}
                    onChange={(e) => setNovoLancamento(prev => ({ ...prev, formaPagamento: e.target.value as any }))}
                    className={cn(
                      'w-full rounded-lg border-2 px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white transition-all duration-200 border-slate-300 focus:border-green-500 focus:ring-green-200'
                    )}
                  >
                    <option value="">Selecione...</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="pix">PIX</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Observações
                  </Label>
                  <Textarea
                    value={novoLancamento.observacoes}
                    onChange={(e) => setNovoLancamento(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações sobre o pagamento (opcional)"
                    className="bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPagamentoModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdicionarPagamento}
                  disabled={!novoLancamento.formaPagamento || novoLancamento.valorCentavos <= 0 || adicionandoPagamento}
                  className={cn(
                    'flex-1 text-white',
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
                  {adicionandoPagamento ? 'Adicionando...' : 'Adicionar Pagamento'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Modal de Detalhes */}
      {showDetalhesModal && debitoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border-2 backdrop-blur-xl max-h-[90vh] overflow-y-auto',
              hasGradient
                ? 'bg-white/90 border-white/40'
                : 'bg-white border-gray-200'
            )}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Débito</h2>
                <button
                  onClick={() => {
                    setShowDetalhesModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações Gerais</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Procedimento:</span>
                      <span className="text-sm font-semibold text-gray-900">{debitoSelecionado.procedimento}</span>
                    </div>
                    {debitoSelecionado.observacoes && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Observações:</span>
                        <span className="text-sm font-semibold text-gray-900">{debitoSelecionado.observacoes}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      {getStatusBadge(debitoSelecionado)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Criado em:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {format(debitoSelecionado.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Valores</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Valor Total:</span>
                      <span className="text-lg font-bold text-gray-900">{formatarValor(debitoSelecionado.valorTotalCentavos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Recebido:</span>
                      <span className="text-lg font-bold text-green-600">{formatarValor(debitoSelecionado.saldoRecebidoCentavos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">A Receber:</span>
                      <span className="text-lg font-bold text-blue-600">{formatarValor(debitoSelecionado.saldoReceberCentavos)}</span>
                    </div>
                  </div>
                </div>
                
                {debitoSelecionado.lancamentos && debitoSelecionado.lancamentos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico de Pagamentos</h3>
                    <div className="space-y-2">
                      {debitoSelecionado.lancamentos.map((lancamento) => (
                        <div
                          key={lancamento.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-900">
                                {format(lancamento.data, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600">
                                {formatarValor(lancamento.valorCentavos)}
                              </span>
                              <button
                                onClick={() => handleReverterPagamento(debitoSelecionado.id, lancamento.id)}
                                disabled={removendoLancamento === lancamento.id}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="Reverter pagamento"
                              >
                                {removendoLancamento === lancamento.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          {lancamento.formaPagamento && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">
                                {lancamento.formaPagamento}
                              </Badge>
                            </div>
                          )}
                          {lancamento.observacoes && (
                            <p className="text-xs text-gray-600 mt-2">{lancamento.observacoes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-2">
                {debitoSelecionado.saldoReceberCentavos > 0 && (
                  <Button
                    onClick={() => {
                      setShowDetalhesModal(false);
                      handleAbrirPagamento(debitoSelecionado);
                    }}
                    className={cn(
                      'flex-1 text-white',
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
                    <DollarSign className="w-4 h-4 mr-2" />
                    Adicionar Pagamento
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetalhesModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Modal de Edição */}
      {showEditarModal && debitoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'w-full max-w-md mx-4 rounded-2xl shadow-2xl border-2 backdrop-blur-xl',
              hasGradient
                ? 'bg-white/90 border-white/40'
                : 'bg-white border-gray-200'
            )}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Editar Débito</h2>
                <button
                  onClick={() => {
                    setShowEditarModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Serviço *
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceModalEditar(true);
                      setServiceQueryEditar('');
                    }}
                    className={cn(
                      'w-full rounded-lg border transition-all text-left px-4 py-3 text-base',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2',
                      selectedServiceIdsEditar.length > 0
                        ? 'border-green-500 bg-green-50 text-slate-800 focus:border-green-600 focus:ring-green-300'
                        : 'border-slate-300 bg-white text-slate-500 focus:border-green-500 focus:ring-green-200'
                    )}
                  >
                    {selectedServiceIdsEditar.length > 0 ? (
                      (() => {
                        const selectedServices = services.filter(s => selectedServiceIdsEditar.includes(s.id));
                        const totalPrice = selectedServices.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                        return (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">
                              {selectedServices.length === 1 
                                ? selectedServices[0].nome
                                : `${selectedServices.length} serviços selecionados`}
                            </span>
                            <span className="text-xs text-slate-500">
                              R$ {(totalPrice / 100).toFixed(2)}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <span>Selecione um ou mais serviços</span>
                    )}
                  </button>
                  {selectedServiceIdsEditar.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedServiceIdsEditar([]);
                        setEditarDebito(prev => ({
                          ...prev,
                          procedimento: '',
                          valorTotalCentavos: 0,
                        }));
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block text-gray-700">
                      Data de Vencimento
                    </Label>
                    <Input
                      type="date"
                      value={editarDebito.dataVencimento}
                      onChange={(e) => setEditarDebito(prev => ({ ...prev, dataVencimento: e.target.value }))}
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
                      value={editarDebito.valorTotalCentavos / 100}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          e.preventDefault();
                          const newCentavos = Math.floor(editarDebito.valorTotalCentavos / 10);
                          setEditarDebito(prev => ({ ...prev, valorTotalCentavos: newCentavos }));
                          return;
                        }
                        if (e.key === 'Tab' || e.key === 'Enter' || 
                            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                            (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
                          return;
                        }
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                          return;
                        }
                        const newCentavos = editarDebito.valorTotalCentavos * 10 + parseInt(e.key);
                        e.preventDefault();
                        setEditarDebito(prev => ({ ...prev, valorTotalCentavos: newCentavos }));
                      }}
                      onValueChange={(value, name, values) => {
                        if (!value || value.includes(',') || value.includes('.')) {
                          const floatValue = values?.float ?? 0;
                          const valorCentavos = Math.round(floatValue * 100);
                          setEditarDebito(prev => ({ ...prev, valorTotalCentavos: valorCentavos }));
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
                {debitoSelecionado.saldoRecebidoCentavos > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Atenção: Este débito já possui pagamentos registrados. O valor recebido será mantido e o saldo será recalculado.
                  </p>
                )}
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block text-gray-700">
                    Observações
                  </Label>
                  <Textarea
                    value={editarDebito.observacoes}
                    onChange={(e) => setEditarDebito(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações sobre o débito (opcional)"
                    className="bg-white border-slate-300 focus:border-green-500 focus:ring-green-200"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditarModal(false);
                    setDebitoSelecionado(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarEdicao}
                  disabled={!editarDebito.procedimento || editarDebito.valorTotalCentavos <= 0 || salvandoEdicao}
                  className={cn(
                    'flex-1 text-white',
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
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Modal de Seleção de Serviços para Edição */}
      {showServiceModalEditar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[70] flex items-start justify-center p-4 pt-8 sm:pt-16 backdrop-blur-sm overflow-y-auto',
            hasGradient
              ? isVibrant
                ? 'bg-slate-900/60 backdrop-blur-xl'
                : 'bg-black/50'
              : 'bg-black/50'
          )}
          onClick={() => setShowServiceModalEditar(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] mt-0',
              hasGradient
                ? isVibrant
                  ? 'bg-white/95 border-white/25 backdrop-blur-2xl'
                  : 'bg-white border-slate-200'
                : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900">Selecionar Serviço</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowServiceModalEditar(false)}
                className={cn(hasGradient && isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  value={serviceQueryEditar}
                  onChange={(e) => setServiceQueryEditar(e.target.value)}
                  placeholder="Buscar serviço por nome"
                  className="pl-10 pr-4 py-3 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                const normalizeString = (value: string) =>
                  value
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();
                
                const queryNormalized = normalizeString(serviceQueryEditar);
                // Filtrar apenas serviços ativos
                const activeServices = services.filter(s => s.ativo);
                const filtered = activeServices.filter((service) =>
                  normalizeString(service.nome).includes(queryNormalized)
                );
                
                return services.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className={cn(
                      'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                      hasGradient && isVibrant
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-green-100 text-green-600'
                    )}>
                      <Package className="w-8 h-8" />
                    </div>
                    <h3 className={cn(
                      'text-lg font-semibold mb-2',
                      hasGradient && isVibrant ? 'text-slate-900' : 'text-gray-900'
                    )}>
                      Nenhum serviço cadastrado
                    </h3>
                    <p className={cn(
                      'text-sm mb-6',
                      hasGradient && isVibrant ? 'text-slate-600' : 'text-gray-600'
                    )}>
                      Você precisa cadastrar serviços antes de criar débitos.
                    </p>
                    <Button
                      onClick={() => {
                        setShowServiceModalEditar(false);
                        router.push('/servicos');
                      }}
                      className={cn(
                        'w-full text-white',
                        hasGradient
                          ? isCustom && gradientColors
                            ? ''
                            : isVibrant
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-green-600 hover:bg-green-700'
                          : 'bg-green-600 hover:bg-green-700'
                      )}
                      style={hasGradient && isCustom && gradientColors ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      } : undefined}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Serviços
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Nenhum serviço encontrado para "{serviceQueryEditar}"</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((service) => {
                      const isSelected = selectedServiceIdsEditar.includes(service.id);
                      return (
                        <label
                          key={service.id}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer',
                            'flex items-center gap-3',
                            isSelected
                              ? hasGradient && isVibrant
                                ? 'bg-indigo-500/20 border-2 border-indigo-500'
                                : 'bg-green-50 border-2 border-green-500'
                              : hasGradient && isVibrant
                              ? 'hover:bg-white/60 border border-transparent hover:border-white/30'
                              : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleServiceToggleEditar(service.id)}
                            className="w-4 h-4 text-green-600 focus:ring-green-500 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{service.nome}</div>
                            <div className="text-sm text-slate-500">
                              R$ {((service.precoCentavos || 0) / 100).toFixed(2)}
                              {service.duracaoMin && ` • ${service.duracaoMin} min`}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {selectedServiceIdsEditar.length > 0 && (
                  <span>
                    {selectedServiceIdsEditar.length} {selectedServiceIdsEditar.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                    {(() => {
                      const selectedServices = services.filter(s => selectedServiceIdsEditar.includes(s.id));
                      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                      return totalPrice > 0 ? ` • R$ ${(totalPrice / 100).toFixed(2)}` : '';
                    })()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedServiceIdsEditar([]);
                    setEditarDebito(prev => ({
                      ...prev,
                      procedimento: '',
                      valorTotalCentavos: 0,
                    }));
                  }}
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleConfirmServicesEditar}
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
                  Confirmar
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

