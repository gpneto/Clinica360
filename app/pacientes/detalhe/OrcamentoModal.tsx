'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Save, Printer, Plus, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Check, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CurrencyInput from 'react-currency-input-field';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany, usePatient, useOrcamentos, useServices } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';
import jsPDF from 'jspdf';
import { cn, generateGradientColors, getGradientColors, getGradientStyle } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Orcamento, ProcedimentoOdontologico, OrcamentoPagamento } from '@/types';
import { generateOrcamentoPDF } from './DentalChart';

// DatePicker component
function DatePicker({ value, onChange, placeholder = 'DD/MM/AAAA', className = '', hasGradient = false, isCustom = false, isVibrant = false, gradientColors = null }: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  className?: string;
  hasGradient?: boolean;
  isCustom?: boolean;
  isVibrant?: boolean;
  gradientColors?: { start: string; middle: string; end: string } | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          return new Date(year, month, 1);
        }
      }
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          setCurrentMonth(new Date(year, month, 1));
        }
      }
    }
  }, [value]);

  const selectedDate = value ? (() => {
    const parts = value.split('/');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
        return new Date(year, month, day);
      }
    }
    return null;
  })() : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleDateSelect = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    onChange(`${day}/${month}/${year}`);
    setIsOpen(false);
  };

  const today = new Date();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 cursor-pointer text-left transition-colors',
              hasGradient
                ? isCustom && gradientColors
                  ? 'border-white/60 focus:border-white/80 focus:ring-white/30 bg-white/90 hover:border-white/70'
                  : isVibrant
                  ? 'border-white/60 focus:border-indigo-500 focus:ring-indigo-500/20 bg-white/90 hover:border-indigo-400'
                  : 'border-white/60 focus:border-blue-500 focus:ring-blue-500/20 bg-white/90 hover:border-blue-400'
                : 'border-gray-300 focus:border-slate-500 focus:ring-slate-500 bg-white hover:border-slate-400'
            )}
          >
            <div className="flex items-center justify-between">
              <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                {value || placeholder}
              </span>
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0 z-[1003]" align="start" side="bottom" sideOffset={4}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="text-sm font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isSameDay(day, today);

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !isTodayDate && 'text-gray-700 hover:bg-gray-100',
                    isTodayDate && !isSelected && hasGradient
                      ? isCustom && gradientColors
                        ? 'bg-white/60 text-slate-700 border border-white/50'
                        : isVibrant
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                        : 'bg-blue-50 text-blue-700 border border-blue-300'
                      : 'bg-blue-50 text-blue-700 border border-blue-300',
                    isSelected && hasGradient
                      ? isCustom && gradientColors
                        ? 'text-white shadow-md'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-md'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-600 text-white shadow-md'
                  )}
                  style={
                    isSelected && hasGradient && isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleDateSelect(today)}
              className={cn(
                'w-full px-3 py-1.5 text-sm rounded-lg transition-colors font-medium',
                hasGradient
                  ? isCustom && gradientColors
                    ? 'text-slate-700 hover:bg-white/60'
                    : isVibrant
                    ? 'text-indigo-600 hover:bg-indigo-50'
                    : 'text-blue-600 hover:bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              Hoje
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const formatCurrency = (centavos: number): string => {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
};

interface OrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  patientId: string | null | undefined;
  procedimentos: ProcedimentoOdontologico[];
  orcamento?: Orcamento | null;
  onSave?: () => void;
  procedimentosSelecionadosIds?: Set<string>; // IDs dos procedimentos que foram explicitamente selecionados
}

export function OrcamentoModal({
  isOpen,
  onClose,
  companyId,
  patientId,
  procedimentos,
  orcamento = null,
  onSave,
  procedimentosSelecionadosIds = new Set(),
}: OrcamentoModalProps) {
  const { company } = useCompany(companyId);
  const { patient } = usePatient(companyId, patientId);
  const { createOrcamento, updateOrcamento } = useOrcamentos(companyId, patientId);
  const { services } = useServices(companyId);
  const { themePreference, customColor, customColor2 } = useAuth();
  
  const isSigned = !!orcamento?.signedAt;
  
  // Detectar tema e gerar estilos dinâmicos
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom' && !!customColor;
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  
  // Detectar se é mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [showProcedimentoModal, setShowProcedimentoModal] = useState(false);
  const [procedimentoQuery, setProcedimentoQuery] = useState('');

  const [orcamentoEtapa, setOrcamentoEtapa] = useState<1 | 2>(1);
  const [orcamentoProcedimentos, setOrcamentoProcedimentos] = useState<Array<ProcedimentoOdontologico & { valorCentavosEditado?: number; comissaoPercentEditado?: number }>>([]);
  const [orcamentoDesconto, setOrcamentoDesconto] = useState<string>('0,00');
  const [orcamentoObservacoes, setOrcamentoObservacoes] = useState<string>('');
  const [orcamentoFormaPagamento, setOrcamentoFormaPagamento] = useState<'avista' | 'parcelado' | 'multiplas'>('avista');
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<Set<string>>(new Set());
  const [orcamentoPagamentos, setOrcamentoPagamentos] = useState<Array<{
    parcela: number;
    valorCentavos: number;
    meioPagamento: 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro';
    dataVencimento: string;
  }>>([]);
  const [novoPagamento, setNovoPagamento] = useState<{
    parcela: number;
    valor: string;
    meioPagamento: 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro' | '';
    dataVencimento: string;
  }>({
    parcela: 1,
    valor: '',
    meioPagamento: '',
    dataVencimento: '',
  });
  const [orcamentoEntrada, setOrcamentoEntrada] = useState<{
    valor: string;
    meioPagamento: string;
    dataVencimento: string;
  } | null>(null);
  const [orcamentoParcelado, setOrcamentoParcelado] = useState({
    numeroParcelas: 1,
    meioPagamento: '',
    dataPrimeiroPagamento: '',
  });

  // Ref para evitar re-inicialização quando modal já está aberto
  const initializedRef = useRef(false);
  const lastOrcamentoIdRef = useRef<string | null>(null);

  // Bloquear scroll do body quando o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      // Salvar a posição atual do scroll
      const scrollY = window.scrollY;
      // Bloquear o scroll do body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar o scroll quando o modal fechar
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Inicializar apenas quando modal abrir ou orcamento mudar
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      lastOrcamentoIdRef.current = null;
      return;
    }

    const currentOrcamentoId = orcamento?.id || null;
    const shouldInitialize = !initializedRef.current || lastOrcamentoIdRef.current !== currentOrcamentoId;

    if (!shouldInitialize) {
      return;
    }

    if (orcamento) {
      setOrcamentoProcedimentos(orcamento.procedimentos.map(p => ({
        ...procedimentos.find(proc => proc.id === p.id)!,
        valorCentavosEditado: p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : p.valorCentavos,
        comissaoPercentEditado: p.comissaoPercentEditado !== undefined ? p.comissaoPercentEditado : (p.comissaoPercent || 0),
      })).filter(Boolean));
      setProcedimentosSelecionados(new Set(orcamento.procedimentos.map(p => p.id)));
      setOrcamentoDesconto((orcamento.descontoCentavos / 100).toFixed(2).replace('.', ','));
      setOrcamentoObservacoes(orcamento.observacoes || '');
      setOrcamentoFormaPagamento(orcamento.formaPagamento);
      setOrcamentoPagamentos(orcamento.pagamentos || []);
      setOrcamentoEntrada(orcamento.entrada ? {
        valor: (orcamento.entrada.valorCentavos / 100).toFixed(2).replace('.', ','),
        meioPagamento: orcamento.entrada.meioPagamento,
        dataVencimento: orcamento.entrada.dataVencimento,
      } : null);
      setOrcamentoParcelado(orcamento.parcelado || {
        numeroParcelas: 1,
        meioPagamento: '',
        dataPrimeiroPagamento: '',
      });
      setOrcamentoEtapa(2);
      initializedRef.current = true;
      lastOrcamentoIdRef.current = currentOrcamentoId;
    } else {
      // Inicializar apenas com procedimentos que foram explicitamente selecionados (clicados no botão "Orçar")
      // Usar os IDs passados via prop para identificar quais foram selecionados
      const procedimentosIniciais = procedimentos.filter(p => {
        // Verificar se este procedimento foi explicitamente selecionado (está no Set de IDs)
        return procedimentosSelecionadosIds.has(p.id);
      });
      
      if (procedimentosIniciais.length > 0) {
        setOrcamentoProcedimentos(procedimentosIniciais.map(p => ({
          ...p,
          valorCentavosEditado: (p as any).valorCentavosEditado !== undefined ? (p as any).valorCentavosEditado : p.valorCentavos,
          comissaoPercentEditado: (p as any).comissaoPercentEditado !== undefined ? (p as any).comissaoPercentEditado : ((p as any).comissaoPercent || 0),
        })));
        setProcedimentosSelecionados(new Set(procedimentosIniciais.map(p => p.id)));
      } else {
        setOrcamentoProcedimentos([]);
        setProcedimentosSelecionados(new Set());
      }
      
      setOrcamentoDesconto('0,00');
      setOrcamentoObservacoes('');
      setOrcamentoFormaPagamento('avista');
      setOrcamentoPagamentos([]);
      setNovoPagamento({ parcela: 1, valor: '', meioPagamento: '', dataVencimento: '' });
      setOrcamentoEntrada(null);
      setOrcamentoParcelado({ numeroParcelas: 1, meioPagamento: '', dataPrimeiroPagamento: '' });
      setOrcamentoEtapa(1);
      initializedRef.current = true;
      lastOrcamentoIdRef.current = null;
    }
  }, [isOpen, orcamento?.id, procedimentos, procedimentosSelecionadosIds]);

  const handleSave = async (status: 'rascunho' | 'aguardando_assinatura' | 'finalizado') => {
    try {
      if (!companyId || !patientId) {
        alert('Erro: dados do paciente não encontrados.');
        return;
      }
      
      const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
        const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
        return sum + valor;
      }, 0);
      const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
      const valorTotalFinal = Math.max(0, valorTotal - descontoCentavos);
      
      const orcamentoData = {
        companyId,
        patientId,
        procedimentos: orcamentoProcedimentos.map(p => ({
          id: p.id,
          procedimento: p.procedimento || '',
          valorCentavos: p.valorCentavos || 0,
          valorCentavosEditado: p.valorCentavosEditado,
          comissaoPercentEditado: p.comissaoPercentEditado,
          dentes: p.dentes,
          selectionTypes: p.selectionTypes,
        })),
        descontoCentavos,
        valorTotalCentavos: valorTotalFinal,
        observacoes: orcamentoObservacoes,
        formaPagamento: orcamentoFormaPagamento,
        pagamentos: orcamentoFormaPagamento === 'multiplas' ? orcamentoPagamentos : undefined,
        entrada: orcamentoFormaPagamento === 'parcelado' && orcamentoEntrada ? {
          valorCentavos: Math.round(parseFloat(orcamentoEntrada.valor.replace(',', '.')) * 100) || 0,
          meioPagamento: orcamentoEntrada.meioPagamento as any,
          dataVencimento: orcamentoEntrada.dataVencimento,
        } : undefined,
        parcelado: orcamentoFormaPagamento === 'parcelado' ? {
          numeroParcelas: orcamentoParcelado.numeroParcelas,
          meioPagamento: orcamentoParcelado.meioPagamento as any,
          dataPrimeiroPagamento: orcamentoParcelado.dataPrimeiroPagamento,
        } : undefined,
        status: status === 'finalizado' ? 'aguardando_assinatura' : status,
        createdByUid: undefined,
      };

      if (orcamento) {
        // Verificar se o orçamento está assinado
        if (orcamento.signedAt) {
          alert('Não é possível editar um orçamento que já foi assinado pelo cliente.');
          return;
        }
        await updateOrcamento(orcamento.id, orcamentoData);
        alert('Orçamento atualizado com sucesso!');
      } else {
        await createOrcamento(orcamentoData);
        alert(status === 'rascunho' ? 'Orçamento salvo como rascunho!' : 'Orçamento salvo com sucesso!');
      }
      
      onClose();
      if (onSave) onSave();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      alert(`Erro ao salvar orçamento. Por favor, tente novamente.`);
    }
  };

  const handlePrint = async () => {
    if (company && patient) {
      await generateOrcamentoPDF(
        company,
        patient,
        orcamentoProcedimentos,
        orcamentoDesconto,
        orcamentoObservacoes
      );
    }
  };

  const procedimentosARealizar = procedimentos.filter(p => p.estado === 'a_realizar');
  
  // Filtrar serviços baseado na busca
  const filteredServices = services.filter(service =>
    service.nome.toLowerCase().includes(procedimentoQuery.toLowerCase())
  );
  
  // Função para adicionar procedimentos selecionados ao orçamento
  const handleConfirmarProcedimentos = (selectedServiceIds: string[]) => {
    const novosProcedimentos = selectedServiceIds.map(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return null;
      
      // Verificar se já existe no orçamento
      const jaExiste = orcamentoProcedimentos.some(p => p.id === serviceId);
      if (jaExiste) return null;
      
      return {
        id: serviceId,
        procedimento: service.nome,
        valorCentavos: service.precoCentavos || 0,
        valorCentavosEditado: service.precoCentavos || 0,
        comissaoPercentEditado: service.comissaoPercent || 0,
        dentes: [],
        selectionTypes: [],
        profissionalId: '',
        estado: 'a_realizar' as const,
        gerarPagamentoFinanceiro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId,
        patientId,
      };
    }).filter(Boolean) as Array<ProcedimentoOdontologico & { valorCentavosEditado?: number; comissaoPercentEditado?: number }>;
    
    setOrcamentoProcedimentos(prev => [...prev, ...novosProcedimentos]);
    setProcedimentosSelecionados(prev => {
      const newSet = new Set(prev);
      novosProcedimentos.forEach(p => newSet.add(p.id));
      return newSet;
    });
    setShowProcedimentoModal(false);
    setProcedimentoQuery('');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1002] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        className={cn(
          'rounded-t-2xl md:rounded-2xl shadow-2xl max-w-5xl w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden',
          hasGradient
            ? 'bg-white/95 backdrop-blur-xl border-2'
            : 'bg-white border-2 border-gray-200'
        )}
        style={
          hasGradient && isCustom && gradientColors
            ? {
                borderColor: `${gradientColors.start}40`,
              }
            : isVibrant
            ? {
                borderColor: 'rgba(139, 92, 246, 0.4)',
              }
            : undefined
        }
      >
        {/* Header fixo com gradiente moderno */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-6 md:p-7 md:pt-7 border-b flex-shrink-0 relative overflow-hidden',
            hasGradient
              ? isCustom && gradientColors
                ? 'bg-white/90 border-white/40'
                : isVibrant
                ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
                : 'bg-white/90 border-white/40'
              : 'border-gray-200 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50'
          )}
          style={isMobile ? { 
            paddingTop: 'max(7rem, env(safe-area-inset-top, 0px) + 1.5rem)',
            ...(hasGradient && isCustom && gradientColors ? {
              borderColor: `${gradientColors.start}40`,
              background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
            } : undefined)
          } : (hasGradient && isCustom && gradientColors ? {
            borderColor: `${gradientColors.start}40`,
            background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
          } : undefined)}
        >
          <div 
            className={cn(
              'absolute inset-0',
              hasGradient
                ? isCustom && gradientColors
                  ? ''
                  : isVibrant
                  ? 'bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5'
                  : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
                : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
            )}
            style={hasGradient && isCustom && gradientColors ? {
              background: `linear-gradient(90deg, ${gradientColors.start}05 0%, ${gradientColors.middle}05 50%, ${gradientColors.end}05 100%)`,
            } : undefined}
          ></div>
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={cn(
                'p-3 rounded-2xl shadow-lg transform transition-transform duration-300 hover:scale-105',
                hasGradient
                  ? isCustom && gradientColors
                    ? ''
                    : isVibrant
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/30'
                    : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
                  : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
              )}
              style={hasGradient && isCustom && gradientColors ? {
                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                boxShadow: `0 10px 15px -3px ${gradientColors.start}30, 0 4px 6px -2px ${gradientColors.start}20`,
              } : undefined}
            >
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 
                className={cn(
                  'text-2xl md:text-3xl font-bold',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'bg-clip-text text-transparent'
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                      : 'text-slate-900'
                    : 'text-slate-900'
                )}
                style={hasGradient && isCustom && gradientColors ? {
                  background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : undefined}
              >
                {orcamento ? 'Visualizar/Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <p className="text-sm text-gray-600 mt-1.5 font-medium">
                Etapa {orcamentoEtapa} de 2 {orcamentoEtapa === 1 ? '| Procedimentos' : '| Pagamento (opcional)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md relative z-10"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Indicador de etapas */}
        <div className={cn(
          'px-5 md:px-6 py-4 border-b flex-shrink-0',
          hasGradient
            ? isCustom && gradientColors
              ? 'bg-white/50 border-white/30'
              : 'bg-white/60 border-white/30'
            : 'bg-gray-50 border-gray-200'
        )}>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex-1 h-2.5 rounded-full transition-all',
                orcamentoEtapa >= 1
                  ? hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gray-300'
              )}
              style={
                orcamentoEtapa >= 1 && hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            />
            <div
              className={cn(
                'flex-1 h-2.5 rounded-full transition-all',
                orcamentoEtapa >= 2
                  ? hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gray-300'
              )}
              style={
                orcamentoEtapa >= 2 && hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            />
          </div>
          <div className={cn(
            'flex items-center justify-between mt-3 text-xs font-semibold',
            hasGradient ? 'text-slate-600' : 'text-gray-600'
          )}>
            <span className={cn(
              orcamentoEtapa === 1 ? 'font-bold' : '',
              hasGradient
                ? isCustom && gradientColors
                  ? orcamentoEtapa === 1 ? 'text-slate-900' : ''
                  : isVibrant
                  ? orcamentoEtapa === 1 ? 'text-indigo-700' : ''
                  : orcamentoEtapa === 1 ? 'text-blue-700' : ''
                : orcamentoEtapa === 1 ? 'text-slate-700' : ''
            )}>
              Etapa 1: Procedimentos
            </span>
            <span className={cn(
              orcamentoEtapa === 2 ? 'font-bold' : '',
              hasGradient
                ? isCustom && gradientColors
                  ? orcamentoEtapa === 2 ? 'text-slate-900' : ''
                  : isVibrant
                  ? orcamentoEtapa === 2 ? 'text-indigo-700' : ''
                  : orcamentoEtapa === 2 ? 'text-blue-700' : ''
                : orcamentoEtapa === 2 ? 'text-slate-700' : ''
            )}>
              Etapa 2: Pagamento
            </span>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-gray-50/80 to-white"
        style={
          hasGradient && isCustom && gradientColors
            ? {
                background: `linear-gradient(135deg, ${gradientColors.start}05 0%, ${gradientColors.middle}05 50%, ${gradientColors.end}05 100%)`,
              }
            : undefined
        }
        >
          {orcamentoEtapa === 1 ? (
            <div className="space-y-6">
              {/* Cabeçalho da Etapa 1 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                      hasGradient && isCustom && gradientColors
                        ? ''
                        : hasGradient && isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    )}
                    style={hasGradient && isCustom && gradientColors ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    } : undefined}
                    >
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Etapa 1 | Procedimentos</h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {orcamento ? 'Visualize ou edite os procedimentos do orçamento.' : 'Adicione os procedimentos que devem ser incluídos no orçamento.'}
                      </p>
                    </div>
                  </div>
                </div>
                {!orcamento && (
                  <Button
                    type="button"
                    onClick={() => setShowProcedimentoModal(true)}
                    className={cn(
                      'gap-2 text-white shadow-lg hover:shadow-xl transition-all font-bold rounded-xl px-5 py-2.5',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                          : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800'
                        : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800'
                    )}
                    style={
                      hasGradient && isCustom && gradientColors
                        ? {
                            background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Procedimento
                  </Button>
                )}
              </div>

              <div className="space-y-4">

                {/* Lista de procedimentos da Ficha Geral para selecionar */}
                {!orcamento && (
                  <div className={cn(
                    'rounded-xl border-2 shadow-md p-5 md:p-6',
                    hasGradient
                      ? 'bg-white/90 border-white/60'
                      : 'bg-white border-gray-200'
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <CheckSquare className={cn(
                        'w-5 h-5',
                        hasGradient && isCustom && gradientColors
                          ? ''
                          : hasGradient && isVibrant
                          ? 'text-indigo-600'
                          : 'text-blue-600'
                      )}
                      style={hasGradient && isCustom && gradientColors ? {
                        color: gradientColors.start,
                      } : undefined}
                      />
                      <h4 className={cn(
                        'text-base font-bold',
                        hasGradient ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        Procedimentos da Ficha Geral
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecione os procedimentos que deseja incluir no orçamento:
                    </p>
                    {procedimentos.filter(p => {
                      // Filtrar apenas procedimentos da Ficha Geral (têm dentes ou selectionTypes)
                      const temDentes = p.dentes && p.dentes.length > 0;
                      const temSelectionTypes = (p as any).selectionTypes && (p as any).selectionTypes.length > 0;
                      const temSelectionType = (p as any).selectionType;
                      return temDentes || temSelectionTypes || temSelectionType;
                    }).length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        Nenhum procedimento da Ficha Geral disponível
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {procedimentos.filter(p => {
                          // Filtrar apenas procedimentos da Ficha Geral
                          const temDentes = p.dentes && p.dentes.length > 0;
                          const temSelectionTypes = (p as any).selectionTypes && (p as any).selectionTypes.length > 0;
                          const temSelectionType = (p as any).selectionType;
                          return temDentes || temSelectionTypes || temSelectionType;
                        }).map((proc) => {
                          const isSelected = procedimentosSelecionados.has(proc.id);
                          const dentesResumo = proc.dentes?.map(d => `${d.numero}`).join(', ') || '';
                          const selecaoLabel = proc.selectionTypes?.length
                            ? proc.selectionTypes
                                .map((t: 'ALL' | 'UPPER' | 'LOWER') => (t === 'ALL' ? 'Todos' : t === 'UPPER' ? 'Arcada Superior' : 'Arcada Inferior'))
                                .join(' + ')
                            : null;
                          
                          return (
                            <label
                              key={proc.id}
                              className={cn(
                                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                                isSelected
                                  ? hasGradient && isCustom && gradientColors
                                    ? 'border-white/80 bg-white/60'
                                    : hasGradient && isVibrant
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-blue-500 bg-blue-50'
                                  : hasGradient
                                  ? 'border-white/40 hover:border-white/60 hover:bg-white/30'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              )}
                              style={
                                isSelected && hasGradient && isCustom && gradientColors
                                  ? {
                                      borderColor: gradientColors.start,
                                      backgroundColor: `${gradientColors.start}15`,
                                    }
                                  : undefined
                              }
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Adicionar procedimento ao orçamento
                                    const procCompleto = {
                                      ...proc,
                                      valorCentavosEditado: proc.valorCentavos,
                                      comissaoPercentEditado: (proc as any).comissaoPercent || 0,
                                    };
                                    setOrcamentoProcedimentos(prev => {
                                      // Verificar se já existe
                                      if (prev.some(p => p.id === proc.id)) {
                                        return prev;
                                      }
                                      return [...prev, procCompleto];
                                    });
                                    setProcedimentosSelecionados(prev => new Set(prev).add(proc.id));
                                  } else {
                                    // Remover procedimento do orçamento
                                    setOrcamentoProcedimentos(prev => prev.filter(p => p.id !== proc.id));
                                    setProcedimentosSelecionados(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(proc.id);
                                      return newSet;
                                    });
                                  }
                                }}
                                className={cn(
                                  'w-5 h-5 mt-0.5 rounded border-2 focus:ring-2 focus:ring-offset-1',
                                  isSelected
                                    ? hasGradient && isCustom && gradientColors
                                      ? 'border-white/80 bg-white/90 text-white'
                                      : hasGradient && isVibrant
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-300'
                                )}
                                style={
                                  isSelected && hasGradient && isCustom && gradientColors
                                    ? {
                                        borderColor: gradientColors.start,
                                        backgroundColor: gradientColors.start,
                                      }
                                    : undefined
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h5 className={cn(
                                    'font-semibold text-sm',
                                    isSelected
                                      ? hasGradient && isCustom && gradientColors
                                        ? 'text-slate-900'
                                        : 'text-gray-900'
                                      : 'text-gray-900'
                                  )}>
                                    {proc.procedimento}
                                  </h5>
                                  {!isSelected && (
                                    <span className={cn(
                                      'text-xs font-medium whitespace-nowrap',
                                      'text-gray-500'
                                    )}>
                                      {formatCurrency(proc.valorCentavos)}
                                    </span>
                                  )}
                                </div>
                                {(selecaoLabel || dentesResumo) && (
                                  <p className="text-xs text-gray-500 mb-2">
                                    Dentes: {selecaoLabel || dentesResumo || '-'}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={cn(
                                    'text-xs px-2 py-0.5 rounded-full font-semibold',
                                    proc.estado === 'a_realizar'
                                      ? 'bg-amber-100 text-amber-800'
                                      : proc.estado === 'realizado'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-slate-100 text-slate-800'
                                  )}>
                                    {proc.estado === 'a_realizar' ? 'A Realizar' : proc.estado === 'realizado' ? 'Realizado' : 'Pré-Existente'}
                                  </span>
                                </div>
                                {/* Campo de valor quando selecionado */}
                                {isSelected && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Valor do Orçamento (R$)
                                    </label>
                                    <div className="relative group">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold z-10 text-sm group-focus-within:text-blue-600 transition-colors">R$</div>
                                      <CurrencyInput
                                        value={(() => {
                                          const procNoOrcamento = orcamentoProcedimentos.find(p => p.id === proc.id);
                                          return procNoOrcamento?.valorCentavosEditado !== undefined 
                                            ? procNoOrcamento.valorCentavosEditado / 100
                                            : proc.valorCentavos / 100;
                                        })()}
                                        onKeyDown={(e) => {
                                          // Tratar Backspace e Delete
                                          if (e.key === 'Backspace' || e.key === 'Delete') {
                                            e.preventDefault();
                                            const procNoOrcamento = orcamentoProcedimentos.find(p => p.id === proc.id);
                                            const currentCentavos = procNoOrcamento?.valorCentavosEditado !== undefined 
                                              ? procNoOrcamento.valorCentavosEditado 
                                              : proc.valorCentavos || 0;
                                            
                                            // Dividir por 10 para remover o último dígito
                                            const newCentavos = Math.floor(currentCentavos / 10);
                                            
                                            setOrcamentoProcedimentos(prev => prev.map(p => 
                                              p.id === proc.id 
                                                ? { ...p, valorCentavosEditado: newCentavos }
                                                : p
                                            ));
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
                                          
                                          // Obter valor atual em centavos
                                          const procNoOrcamento = orcamentoProcedimentos.find(p => p.id === proc.id);
                                          const currentCentavos = procNoOrcamento?.valorCentavosEditado !== undefined 
                                            ? procNoOrcamento.valorCentavosEditado 
                                            : proc.valorCentavos || 0;
                                          
                                          // Multiplicar por 10 e adicionar o novo dígito
                                          const newCentavos = currentCentavos * 10 + parseInt(e.key);
                                          
                                          e.preventDefault();
                                          setOrcamentoProcedimentos(prev => prev.map(p => 
                                            p.id === proc.id 
                                              ? { ...p, valorCentavosEditado: newCentavos }
                                              : p
                                          ));
                                        }}
                                        onValueChange={(value, name, values) => {
                                          // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                                          if (!value || value.includes(',') || value.includes('.')) {
                                            const floatValue = values?.float ?? 0;
                                            const valorCentavos = Math.round(floatValue * 100);
                                            setOrcamentoProcedimentos(prev => prev.map(p => 
                                              p.id === proc.id 
                                                ? { ...p, valorCentavosEditado: valorCentavos }
                                                : p
                                            ));
                                          }
                                        }}
                                        decimalsLimit={2}
                                        decimalSeparator=","
                                        groupSeparator=""
                                        prefix=""
                                        className={cn(
                                          'w-full rounded-lg border-2 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white transition-all',
                                          hasGradient
                                            ? isCustom && gradientColors
                                              ? 'border-white/60 focus:border-white/80 focus:ring-white/30'
                                              : isVibrant
                                              ? 'border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500/20'
                                              : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500/20'
                                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                                        )}
                                        placeholder="0,00"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}


                {/* Mensagem quando não há procedimentos */}
                {orcamentoProcedimentos.length === 0 && !orcamento && (
                  <div className="text-center py-12 px-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-10 h-10 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Nenhum procedimento adicionado</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Clique no botão acima para adicionar procedimentos ao orçamento.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setShowProcedimentoModal(true)}
                      variant="outline"
                      className="border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Procedimento
                    </Button>
                  </div>
                )}

                {/* Lista de procedimentos do orçamento (quando editando/visualizando) */}
                {orcamento && orcamentoProcedimentos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Procedimentos do Orçamento:</h4>
                    {orcamentoProcedimentos.map((proc) => {
                      const dentesResumo = proc.dentes?.map(d => `${d.numero}`).join(', ') || '';
                      const selecaoLabel = proc.selectionTypes?.length
                        ? proc.selectionTypes
                            .map((t: 'ALL' | 'UPPER' | 'LOWER') => (t === 'ALL' ? 'Todos' : t === 'UPPER' ? 'Arcada Superior' : 'Arcada Inferior'))
                            .join(' + ')
                        : null;

                      return (
                        <div key={proc.id} className={cn(
                          'border-2 rounded-xl p-4 shadow-md hover:shadow-lg transition-all',
                          hasGradient
                            ? 'bg-white/90 border-white/60'
                            : 'bg-white border-gray-200'
                        )}>
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">{proc.procedimento}</h4>
                              {(selecaoLabel || dentesResumo) && (
                                <div className="text-sm text-gray-600">
                                  Dentes: {selecaoLabel || dentesResumo}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Valor (R$)
                                </label>
                                <div className="relative group">
                                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 font-bold z-10 text-lg group-focus-within:text-blue-600 transition-colors">R$</div>
                                  <CurrencyInput
                                    value={(proc.valorCentavosEditado !== undefined ? proc.valorCentavosEditado : proc.valorCentavos) / 100}
                                    onKeyDown={(e) => {
                                      if (isSigned) return;
                                      
                                      // Tratar Backspace e Delete
                                      if (e.key === 'Backspace' || e.key === 'Delete') {
                                        e.preventDefault();
                                        const currentCentavos = proc.valorCentavosEditado !== undefined 
                                          ? proc.valorCentavosEditado 
                                          : proc.valorCentavos || 0;
                                        
                                        // Dividir por 10 para remover o último dígito
                                        const newCentavos = Math.floor(currentCentavos / 10);
                                        
                                        setOrcamentoProcedimentos(prev => prev.map(p => 
                                          p.id === proc.id 
                                            ? { ...p, valorCentavosEditado: newCentavos }
                                            : p
                                        ));
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
                                      
                                      // Obter valor atual em centavos
                                      const currentCentavos = proc.valorCentavosEditado !== undefined 
                                        ? proc.valorCentavosEditado 
                                        : proc.valorCentavos || 0;
                                      
                                      // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                                      const newCentavos = currentCentavos * 10 + parseInt(e.key);
                                      
                                      e.preventDefault();
                                      setOrcamentoProcedimentos(prev => prev.map(p => 
                                        p.id === proc.id 
                                          ? { ...p, valorCentavosEditado: newCentavos }
                                          : p
                                      ));
                                    }}
                                    onValueChange={(value, name, values) => {
                                      if (isSigned) return;
                                      
                                      // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                                      if (!value || value.includes(',') || value.includes('.')) {
                                        const floatValue = values?.float ?? 0;
                                        const valorCentavos = Math.round(floatValue * 100);
                                        setOrcamentoProcedimentos(prev => prev.map(p => 
                                          p.id === proc.id 
                                            ? { ...p, valorCentavosEditado: valorCentavos }
                                            : p
                                        ));
                                      }
                                    }}
                                    decimalsLimit={2}
                                    decimalSeparator=","
                                    groupSeparator=""
                                    prefix=""
                                    className={cn(
                                    'w-full rounded-2xl border-2 pl-12 pr-5 py-4.5 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-offset-2 bg-white transition-all duration-300 hover:shadow-md min-h-[60px]',
                                    hasGradient
                                      ? isCustom && gradientColors
                                        ? 'border-white/60 focus:border-white/80 focus:ring-white/30 hover:border-white/70'
                                        : isVibrant
                                        ? 'border-white/60 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-indigo-400'
                                        : 'border-white/60 focus:border-blue-500 focus:ring-blue-500/20 hover:border-blue-400'
                                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 hover:border-blue-400'
                                  )}
                                    placeholder="0,00"
                                    disabled={isSigned}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Comissão (%)
                                </label>
                                <div className="relative">
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">%</div>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={proc.comissaoPercentEditado !== undefined 
                                      ? proc.comissaoPercentEditado
                                      : 0}
                                    onChange={(e) => {
                                      if (isSigned) return;
                                      
                                      const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                      setOrcamentoProcedimentos(prev => prev.map(p => 
                                        p.id === proc.id 
                                          ? { ...p, comissaoPercentEditado: value }
                                          : p
                                      ));
                                    }}
                                    className="w-full rounded-lg border-2 border-gray-300 px-3 pr-10 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="0"
                                    disabled={isSigned}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


                {/* Desconto */}
                <div className={cn(
                  'rounded-xl border shadow-sm p-5 md:p-6 space-y-3',
                  hasGradient
                    ? 'bg-white/90 border-white/60'
                    : 'bg-white border-gray-200'
                )}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Desconto
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm z-10">R$</div>
                    <CurrencyInput
                      value={parseFloat(orcamentoDesconto.replace(',', '.')) || 0}
                      onKeyDown={(e) => {
                        if (!!orcamento) return;
                        
                        // Tratar Backspace e Delete
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          e.preventDefault();
                          const currentCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                          
                          // Dividir por 10 para remover o último dígito
                          const newCentavos = Math.floor(currentCentavos / 10);
                          
                          setOrcamentoDesconto((newCentavos / 100).toFixed(2).replace('.', ','));
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
                        
                        // Obter valor atual em centavos
                        const currentCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                        
                        // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                        const newCentavos = currentCentavos * 10 + parseInt(e.key);
                        
                        e.preventDefault();
                        setOrcamentoDesconto((newCentavos / 100).toFixed(2).replace('.', ','));
                      }}
                      onValueChange={(value, name, values) => {
                        if (!!orcamento) return;
                        // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                        if (!value || value.includes(',') || value.includes('.')) {
                          const floatValue = values?.float ?? 0;
                          setOrcamentoDesconto(floatValue.toFixed(2).replace('.', ','));
                        }
                      }}
                      decimalsLimit={2}
                      decimalSeparator=","
                      groupSeparator=""
                      prefix=""
                      className="w-full rounded-lg border-2 border-gray-300 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0,00"
                      disabled={!!orcamento || isSigned}
                    />
                  </div>
                </div>

                {/* Saldo total */}
                <div className={cn(
                  'rounded-xl border-2 p-5 md:p-6',
                  hasGradient
                    ? 'bg-gradient-to-r from-slate-50/80 to-blue-50/80 border-white/40'
                    : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Saldo total</span>
                    <span className={cn(
                      'text-2xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'text-slate-900'
                          : isVibrant
                          ? 'text-indigo-700'
                          : 'text-blue-700'
                        : 'text-slate-700'
                    )}>
                      {(() => {
                        const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
                          const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
                          return sum + valor;
                        }, 0);
                        const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                        const saldoTotal = Math.max(0, valorTotal - descontoCentavos);
                        return formatCurrency(saldoTotal);
                      })()}
                    </span>
                  </div>
                </div>

                {/* Observações */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 space-y-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Observações
                    <span className="text-xs text-gray-500 font-normal ml-2">Opcional</span>
                  </label>
                  <textarea
                    value={orcamentoObservacoes}
                    onChange={e => setOrcamentoObservacoes(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 min-h-[100px] text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none transition-all',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-white/90 border-white/60 focus:border-white/80 focus:ring-white/50'
                          : isVibrant
                          ? 'bg-white/90 border-white/60 focus:border-indigo-500 focus:ring-indigo-200'
                          : 'bg-white/90 border-white/60 focus:border-blue-500 focus:ring-blue-200'
                        : 'bg-white border-gray-300 focus:border-green-500 focus:ring-green-500'
                    )}
                    placeholder="Observações sobre o orçamento..."
                    disabled={!!orcamento || isSigned}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Etapa 2 | Pagamento</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {orcamento ? 'Visualize as informações de pagamento do orçamento.' : 'Configure as formas de pagamento (opcional).'}
                </p>

                {/* Forma de pagamento */}
                {!orcamento && (
                  <div className={cn(
                    'rounded-xl border shadow-sm p-5 md:p-6 space-y-4',
                    hasGradient
                      ? 'bg-white/90 border-white/60'
                      : 'bg-white border-gray-200'
                  )}>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Forma de pagamento
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setOrcamentoFormaPagamento('avista')}
                            className={cn(
                          'p-4 rounded-xl border-2 transition-all font-semibold',
                          orcamentoFormaPagamento === 'avista'
                            ? hasGradient
                              ? isCustom && gradientColors
                                ? 'text-white border-white/50'
                                : isVibrant
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-600 bg-slate-50 text-slate-700'
                            : hasGradient
                            ? 'border-white/40 hover:border-white/60 text-slate-700 hover:bg-white/50'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        )}
                        style={
                          orcamentoFormaPagamento === 'avista' && hasGradient && isCustom && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        À vista
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrcamentoFormaPagamento('parcelado')}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all font-semibold',
                          orcamentoFormaPagamento === 'parcelado'
                            ? hasGradient
                              ? isCustom && gradientColors
                                ? 'text-white border-white/50'
                                : isVibrant
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-600 bg-slate-50 text-slate-700'
                            : hasGradient
                            ? 'border-white/40 hover:border-white/60 text-slate-700 hover:bg-white/50'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        )}
                        style={
                          orcamentoFormaPagamento === 'parcelado' && hasGradient && isCustom && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        Parcelado
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrcamentoFormaPagamento('multiplas')}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all font-semibold',
                          orcamentoFormaPagamento === 'multiplas'
                            ? hasGradient
                              ? isCustom && gradientColors
                                ? 'text-white border-white/50'
                                : isVibrant
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-600 bg-slate-50 text-slate-700'
                            : hasGradient
                            ? 'border-white/40 hover:border-white/60 text-slate-700 hover:bg-white/50'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        )}
                        style={
                          orcamentoFormaPagamento === 'multiplas' && hasGradient && isCustom && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        Múltiplas formas
                      </button>
                    </div>
                  </div>
                )}

                {/* À vista - apenas mostra o valor total */}
                {orcamentoFormaPagamento === 'avista' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
                    <p className="text-sm text-gray-600">
                      <strong>Forma de pagamento:</strong> À vista
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      {(() => {
                        const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
                          const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
                          return sum + valor;
                        }, 0);
                        const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                        const saldoTotal = Math.max(0, valorTotal - descontoCentavos);
                        return formatCurrency(saldoTotal);
                      })()}
                    </p>
                  </div>
                )}

                {/* Parcelado */}
                {orcamentoFormaPagamento === 'parcelado' && (
                  <div className="space-y-4">
                    {/* Entrada */}
                    <div className={cn(
                    'rounded-xl border shadow-sm p-5 md:p-6 space-y-4',
                    hasGradient
                      ? 'bg-white/90 border-white/60'
                      : 'bg-white border-gray-200'
                  )}>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-900">
                          Entrada
                        </label>
                        {orcamentoEntrada && !orcamento && (
                          <button
                            type="button"
                            onClick={() => setOrcamentoEntrada(null)}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold"
                          >
                            Excluir entrada
                          </button>
                        )}
                      </div>
                      {orcamentoEntrada ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Valor de entrada
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm z-10">R$</div>
                              <CurrencyInput
                                value={parseFloat(orcamentoEntrada.valor.replace(',', '.')) || 0}
                                onKeyDown={(e) => {
                                  if (!!orcamento) return;
                                  
                                  // Tratar Backspace e Delete
                                  if (e.key === 'Backspace' || e.key === 'Delete') {
                                    e.preventDefault();
                                    const currentCentavos = Math.round(parseFloat(orcamentoEntrada.valor.replace(',', '.')) * 100) || 0;
                                    
                                    // Dividir por 10 para remover o último dígito
                                    const newCentavos = Math.floor(currentCentavos / 10);
                                    
                                    setOrcamentoEntrada(prev => ({
                                      ...prev!,
                                      valor: (newCentavos / 100).toFixed(2).replace('.', ',')
                                    }));
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
                                  
                                  // Obter valor atual em centavos
                                  const currentCentavos = Math.round(parseFloat(orcamentoEntrada.valor.replace(',', '.')) * 100) || 0;
                                  
                                  // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                                  const newCentavos = currentCentavos * 10 + parseInt(e.key);
                                  
                                  e.preventDefault();
                                  setOrcamentoEntrada(prev => ({
                                    ...prev!,
                                    valor: (newCentavos / 100).toFixed(2).replace('.', ',')
                                  }));
                                }}
                                onValueChange={(value, name, values) => {
                                  if (!!orcamento) return;
                                  // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                                  if (!value || value.includes(',') || value.includes('.')) {
                                    const floatValue = values?.float ?? 0;
                                    setOrcamentoEntrada(prev => ({
                                      ...prev!,
                                      valor: floatValue.toFixed(2).replace('.', ',')
                                    }));
                                  }
                                }}
                                decimalsLimit={2}
                                decimalSeparator=","
                                groupSeparator=""
                                prefix=""
                                className="w-full rounded-lg border-2 border-gray-300 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="0,00"
                                disabled={!!orcamento || isSigned}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Meio de pagamento da entrada
                            </label>
                            <select
                              value={orcamentoEntrada.meioPagamento}
                              onChange={(e) => setOrcamentoEntrada(prev => ({ ...prev!, meioPagamento: e.target.value }))}
                              className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              disabled={!!orcamento || isSigned}
                            >
                              <option value="">Escolha uma opção</option>
                              <option value="cartao_credito">Cartão de crédito</option>
                              <option value="cartao_debito">Cartão de débito</option>
                              <option value="dinheiro">Dinheiro</option>
                              <option value="pix">PIX</option>
                              <option value="boleto">Boleto</option>
                              <option value="transferencia">Transferência</option>
                              <option value="outro">Outro</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Data do vencimento
                            </label>
                            <DatePicker
                              value={orcamentoEntrada.dataVencimento}
                              onChange={(value) => setOrcamentoEntrada(prev => ({ ...prev!, dataVencimento: value }))}
                              placeholder="DD/MM/AAAA"
                              hasGradient={hasGradient}
                              isCustom={!!isCustom}
                              isVibrant={isVibrant}
                              gradientColors={gradientColors}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ) : !orcamento && (
                        <button
                          type="button"
                          onClick={() => setOrcamentoEntrada({ valor: '0,00', meioPagamento: '', dataVencimento: '' })}
                          className={cn(
                            'w-full px-4 py-2 text-sm font-semibold border-2 rounded-lg transition-colors',
                            hasGradient
                              ? 'text-white border-white/80 hover:bg-white/20'
                              : 'text-slate-600 border-slate-600 hover:bg-slate-50'
                          )}
                        >
                          Adicionar entrada
                        </button>
                      )}
                    </div>

                    {/* Parcelas */}
                    <div className={cn(
                    'rounded-xl border shadow-sm p-5 md:p-6 space-y-4',
                    hasGradient
                      ? 'bg-white/90 border-white/60'
                      : 'bg-white border-gray-200'
                  )}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Forma de pagamento
                      </label>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <strong>Saldo restante:</strong> {(() => {
                            const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
                              const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
                              return sum + valor;
                            }, 0);
                            const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                            const valorTotalFinal = Math.max(0, valorTotal - descontoCentavos);
                            const entradaCentavos = orcamentoEntrada ? Math.round(parseFloat(orcamentoEntrada.valor.replace(',', '.')) * 100) : 0;
                            const saldoRestante = Math.max(0, valorTotalFinal - entradaCentavos);
                            return formatCurrency(saldoRestante);
                          })()}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Meio de pagamento
                          </label>
                          <select
                            value={orcamentoParcelado.meioPagamento}
                            onChange={(e) => setOrcamentoParcelado(prev => ({ ...prev, meioPagamento: e.target.value }))}
                            className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={!!orcamento || isSigned}
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="cartao_credito">Cartão de crédito</option>
                            <option value="cartao_debito">Cartão de débito</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="boleto">Boleto</option>
                            <option value="transferencia">Transferência</option>
                            <option value="outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Número de parcelas
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={orcamentoParcelado.numeroParcelas}
                            onChange={(e) => {
                              const num = Math.max(1, Math.min(60, parseInt(e.target.value) || 1));
                              setOrcamentoParcelado(prev => ({ ...prev, numeroParcelas: num }));
                            }}
                            className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={!!orcamento || isSigned}
                          />
                          {orcamentoParcelado.numeroParcelas > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                              {orcamentoParcelado.numeroParcelas}x de {(() => {
                                const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
                                  const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
                                  return sum + valor;
                                }, 0);
                                const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                                const valorTotalFinal = Math.max(0, valorTotal - descontoCentavos);
                                const entradaCentavos = orcamentoEntrada ? Math.round(parseFloat(orcamentoEntrada.valor.replace(',', '.')) * 100) : 0;
                                const saldoRestante = Math.max(0, valorTotalFinal - entradaCentavos);
                                const valorParcela = Math.round(saldoRestante / orcamentoParcelado.numeroParcelas);
                                return formatCurrency(valorParcela);
                              })()}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Data do primeiro pagamento
                          </label>
                          <DatePicker
                            value={orcamentoParcelado.dataPrimeiroPagamento}
                            onChange={(value) => setOrcamentoParcelado(prev => ({ ...prev, dataPrimeiroPagamento: value }))}
                            placeholder="DD/MM/AAAA"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Múltiplas formas */}
                {orcamentoFormaPagamento === 'multiplas' && (
                  <div className="space-y-4">
                    <div className={cn(
                    'rounded-xl border shadow-sm p-5 md:p-6 space-y-4',
                    hasGradient
                      ? 'bg-white/90 border-white/60'
                      : 'bg-white border-gray-200'
                  )}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">Múltiplas formas de pagamento</h4>
                        <div className="text-sm text-gray-600">
                          <strong>Saldo restante:</strong> {(() => {
                            const valorTotal = orcamentoProcedimentos.reduce((sum, p) => {
                              const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
                              return sum + valor;
                            }, 0);
                            const descontoCentavos = Math.round(parseFloat(orcamentoDesconto.replace(',', '.')) * 100) || 0;
                            const valorTotalFinal = Math.max(0, valorTotal - descontoCentavos);
                            const totalPagamentos = orcamentoPagamentos.reduce((sum, p) => sum + p.valorCentavos, 0);
                            const saldoRestante = Math.max(0, valorTotalFinal - totalPagamentos);
                            return formatCurrency(saldoRestante);
                          })()}
                        </div>
                      </div>

                      {/* Lista de pagamentos */}
                      {orcamentoPagamentos.length > 0 && (
                        <div className="space-y-3">
                          {orcamentoPagamentos.map((pagamento, idx) => (
                            <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  Parcela {pagamento.parcela}
                                </span>
                                {!orcamento && (
                                  <button
                                    type="button"
                                    onClick={() => setOrcamentoPagamentos(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parcela</label>
                                  <input
                                    type="number"
                                    value={pagamento.parcela}
                                    onChange={(e) => {
                                      const num = parseInt(e.target.value) || 1;
                                      setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                        i === idx ? { ...p, parcela: num } : p
                                      ));
                                    }}
                                    className={cn(
                                    'w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2',
                                    hasGradient
                                      ? isCustom && gradientColors
                                        ? 'border-white/60 focus:border-white/80 focus:ring-white/30 bg-white/90'
                                        : isVibrant
                                        ? 'border-white/60 focus:border-indigo-500 focus:ring-indigo-500/20 bg-white/90'
                                        : 'border-white/60 focus:border-blue-500 focus:ring-blue-500/20 bg-white/90'
                                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white'
                                  )}
                                    disabled={!!orcamento || isSigned}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor</label>
                                  <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm z-10">R$</div>
                                    <CurrencyInput
                                      value={pagamento.valorCentavos / 100}
                                      onKeyDown={(e) => {
                                        if (!!orcamento) return;
                                        
                                        // Tratar Backspace e Delete
                                        if (e.key === 'Backspace' || e.key === 'Delete') {
                                          e.preventDefault();
                                          const currentCentavos = pagamento.valorCentavos || 0;
                                          
                                          // Dividir por 10 para remover o último dígito
                                          const newCentavos = Math.floor(currentCentavos / 10);
                                          
                                          setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                            i === idx ? { ...p, valorCentavos: newCentavos } : p
                                          ));
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
                                        
                                        // Obter valor atual em centavos
                                        const currentCentavos = pagamento.valorCentavos || 0;
                                        
                                        // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                                        const newCentavos = currentCentavos * 10 + parseInt(e.key);
                                        
                                        e.preventDefault();
                                        setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                          i === idx ? { ...p, valorCentavos: newCentavos } : p
                                        ));
                                      }}
                                      onValueChange={(value, name, values) => {
                                        if (!!orcamento) return;
                                        // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                                        if (!value || value.includes(',') || value.includes('.')) {
                                          const floatValue = values?.float ?? 0;
                                          const valorCentavos = Math.round(floatValue * 100);
                                          setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                            i === idx ? { ...p, valorCentavos } : p
                                          ));
                                        }
                                      }}
                                      decimalsLimit={2}
                                      decimalSeparator=","
                                      groupSeparator=""
                                      prefix=""
                                      className="w-full rounded-lg border-2 border-gray-300 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      placeholder="0,00"
                                      disabled={!!orcamento || isSigned}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Meio de pagamento</label>
                                  <select
                                    value={pagamento.meioPagamento}
                                    onChange={(e) => {
                                      setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                        i === idx ? { ...p, meioPagamento: e.target.value as 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro' } : p
                                      ));
                                    }}
                                    className={cn(
                                    'w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2',
                                    hasGradient
                                      ? isCustom && gradientColors
                                        ? 'border-white/60 focus:border-white/80 focus:ring-white/30 bg-white/90'
                                        : isVibrant
                                        ? 'border-white/60 focus:border-indigo-500 focus:ring-indigo-500/20 bg-white/90'
                                        : 'border-white/60 focus:border-blue-500 focus:ring-blue-500/20 bg-white/90'
                                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white'
                                  )}
                                    disabled={!!orcamento || isSigned}
                                  >
                                    <option value="">Escolha uma opção</option>
                                    <option value="cartao_credito">Cartão de crédito</option>
                                    <option value="cartao_debito">Cartão de débito</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="boleto">Boleto</option>
                                    <option value="transferencia">Transferência</option>
                                    <option value="outro">Outro</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data do vencimento</label>
                                  <DatePicker
                                    value={pagamento.dataVencimento}
                                    onChange={(value) => {
                                      setOrcamentoPagamentos(prev => prev.map((p, i) => 
                                        i === idx ? { ...p, dataVencimento: value } : p
                                      ));
                                    }}
                                    placeholder="DD/MM/AAAA"
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Adicionar pagamento */}
                      {!orcamento && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                          <h5 className="text-sm font-semibold text-gray-900">Adicionar pagamento</h5>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Parcela</label>
                              <input
                                type="number"
                                min="1"
                                value={novoPagamento.parcela}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value) || 1;
                                  setNovoPagamento(prev => ({ ...prev, parcela: num }));
                                }}
                                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Valor</label>
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm z-10">R$</div>
                                <CurrencyInput
                                  value={parseFloat(novoPagamento.valor.replace(',', '.')) || 0}
                                  onKeyDown={(e) => {
                                    // Tratar Backspace e Delete
                                    if (e.key === 'Backspace' || e.key === 'Delete') {
                                      e.preventDefault();
                                      const currentCentavos = Math.round(parseFloat(novoPagamento.valor.replace(',', '.')) * 100) || 0;
                                      
                                      // Dividir por 10 para remover o último dígito
                                      const newCentavos = Math.floor(currentCentavos / 10);
                                      
                                      setNovoPagamento(prev => ({ ...prev, valor: (newCentavos / 100).toFixed(2).replace('.', ',') }));
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
                                    
                                    // Obter valor atual em centavos
                                    const currentCentavos = Math.round(parseFloat(novoPagamento.valor.replace(',', '.')) * 100) || 0;
                                    
                                    // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                                    const newCentavos = currentCentavos * 10 + parseInt(e.key);
                                    
                                    e.preventDefault();
                                    setNovoPagamento(prev => ({ ...prev, valor: (newCentavos / 100).toFixed(2).replace('.', ',') }));
                                  }}
                                  onValueChange={(value, name, values) => {
                                    // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                                    if (!value || value.includes(',') || value.includes('.')) {
                                      const floatValue = values?.float ?? 0;
                                      setNovoPagamento(prev => ({ ...prev, valor: floatValue.toFixed(2).replace('.', ',') }));
                                    }
                                  }}
                                  decimalsLimit={2}
                                  decimalSeparator=","
                                  groupSeparator=""
                                  prefix=""
                                  className="w-full rounded-lg border-2 border-gray-300 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Meio de pagamento</label>
                              <select
                                value={novoPagamento.meioPagamento}
                                onChange={(e) => setNovoPagamento(prev => ({ ...prev, meioPagamento: e.target.value as 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro' | '' }))}
                                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="">Escolha uma opção</option>
                                <option value="cartao_credito">Cartão de crédito</option>
                                <option value="cartao_debito">Cartão de débito</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="boleto">Boleto</option>
                                <option value="transferencia">Transferência</option>
                                <option value="outro">Outro</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Data do vencimento</label>
                              <DatePicker
                                value={novoPagamento.dataVencimento}
                                onChange={(value) => setNovoPagamento(prev => ({ ...prev, dataVencimento: value }))}
                                placeholder="DD/MM/AAAA"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!novoPagamento.valor || !novoPagamento.meioPagamento || !novoPagamento.dataVencimento) {
                                alert('Preencha todos os campos obrigatórios');
                                return;
                              }
                              const valorCentavos = Math.round(parseFloat(novoPagamento.valor.replace(',', '.')) * 100);
                              setOrcamentoPagamentos(prev => [...prev, {
                                parcela: novoPagamento.parcela,
                                valorCentavos,
                                meioPagamento: novoPagamento.meioPagamento as 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'outro',
                                dataVencimento: novoPagamento.dataVencimento,
                              }]);
                              // Calcular próxima parcela automaticamente
                              const proximaParcela = Math.max(...orcamentoPagamentos.map(p => p.parcela), 0) + 1;
                              setNovoPagamento({ parcela: proximaParcela, valor: '', meioPagamento: '', dataVencimento: '' });
                            }}
                            className={cn(
                              'w-full px-4 py-2 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md',
                              hasGradient
                                ? isCustom && gradientColors
                                  ? ''
                                  : isVibrant
                                  ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                : 'bg-green-600 hover:bg-green-700'
                            )}
                            style={
                              hasGradient && isCustom && gradientColors
                                ? {
                                    background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                  }
                                : undefined
                            }
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar pagamento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Visualização quando editando orçamento existente */}
                {orcamento && orcamento.formaPagamento && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 space-y-2">
                    <p className="text-sm"><strong>Forma de pagamento:</strong> {
                      orcamento.formaPagamento === 'avista' ? 'À vista' :
                      orcamento.formaPagamento === 'parcelado' ? 'Parcelado' :
                      'Múltiplas formas'
                    }</p>
                    {orcamento.parcelado && (
                      <p className="text-sm"><strong>Parcelas:</strong> {orcamento.parcelado.numeroParcelas}x</p>
                    )}
                    {orcamento.pagamentos && orcamento.pagamentos.length > 0 && (
                      <p className="text-sm"><strong>Número de pagamentos:</strong> {orcamento.pagamentos.length}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botões fixos no bottom */}
        <div className="flex gap-4 p-6 md:p-7 border-t-2 border-gray-100 bg-gradient-to-b from-white to-gray-50/50 flex-shrink-0 shadow-2xl">
          {orcamentoEtapa === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className={cn(
                  'flex-1 h-12 md:h-11 text-base md:text-sm font-semibold border-2 rounded-xl',
                  hasGradient
                    ? 'border-white/50 hover:border-white/70 text-slate-700 hover:bg-white/80'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                Cancelar
              </Button>
              {!orcamento && (
                <Button
                  type="button"
                  onClick={() => handleSave('rascunho')}
                  className={cn(
                    'flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform flex items-center justify-center gap-2',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'shadow-xl hover:shadow-2xl'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                      : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                  )}
                  style={
                    hasGradient && isCustom && gradientColors
                      ? {
                          background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                        }
                      : undefined
                  }
                >
                  <Save className="w-4 h-4" />
                  Salvar em Rascunho
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (orcamentoProcedimentos.length === 0 && !orcamento) {
                    alert('Adicione pelo menos um procedimento para continuar.');
                    return;
                  }
                  setOrcamentoEtapa(2);
                }}
                className={cn(
                  'flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'shadow-xl hover:shadow-2xl'
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                      : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                    : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                      }
                    : undefined
                }
              >
                Próxima Etapa →
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrcamentoEtapa(1)}
                className={cn(
                  'flex-1 h-12 md:h-11 text-base md:text-sm font-semibold border-2 rounded-xl',
                  hasGradient
                    ? 'border-white/50 hover:border-white/70 text-slate-700 hover:bg-white/80'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                ← Voltar
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                className={cn(
                  'flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform flex items-center justify-center gap-2',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'shadow-xl hover:shadow-2xl'
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                      : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                    : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                      }
                    : undefined
                }
              >
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </Button>
              {!orcamento ? (
                <Button
                  type="button"
                  onClick={() => handleSave('finalizado')}
                  className={cn(
                    'flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform flex items-center justify-center gap-2',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'shadow-xl hover:shadow-2xl'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                      : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                  )}
                  style={
                    hasGradient && isCustom && gradientColors
                      ? {
                          background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                        }
                      : undefined
                  }
                >
                  <Save className="w-4 h-4" />
                  Salvar Orçamento
                </Button>
              ) : !isSigned ? (
                <Button
                  type="button"
                  onClick={() => handleSave(orcamento.status === 'rascunho' ? 'rascunho' : 'aguardando_assinatura')}
                  className={cn(
                    'flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform flex items-center justify-center gap-2',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'shadow-xl hover:shadow-2xl'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                      : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                  )}
                  style={
                    hasGradient && isCustom && gradientColors
                      ? {
                          background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                        }
                      : undefined
                  }
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              ) : null}
            </>
          )}
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Procedimentos */}
      <AnimatePresence>
        {showProcedimentoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1003] flex items-start justify-center p-4 pt-8 sm:pt-16 backdrop-blur-sm overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowProcedimentoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-lg rounded-2xl border-2 shadow-2xl flex flex-col max-h-[85vh] mt-0',
                hasGradient
                  ? 'bg-white/95 backdrop-blur-xl border-white/40'
                  : 'bg-white border-gray-200'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      borderColor: `${gradientColors.start}40`,
                    }
                  : undefined
              }
            >
              <div className={cn(
                'flex items-center justify-between p-4 border-b',
                hasGradient
                  ? isCustom && gradientColors
                    ? 'border-white/40'
                    : 'border-white/40'
                  : 'border-gray-200'
              )}>
                <h3 className={cn(
                  'text-lg font-bold',
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
                  Selecionar Procedimento
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowProcedimentoModal(false)}
                  className={cn(
                    'hover:bg-gray-100',
                    hasGradient ? 'text-slate-600' : 'text-gray-600'
                  )}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className={cn(
                'p-4 border-b',
                hasGradient
                  ? 'border-white/40'
                  : 'border-gray-200'
              )}>
                <div className="relative">
                  <Search className={cn(
                    'absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5',
                    hasGradient ? 'text-slate-400' : 'text-gray-400'
                  )} />
                  <Input
                    type="text"
                    value={procedimentoQuery}
                    onChange={(e) => setProcedimentoQuery(e.target.value)}
                    placeholder="Buscar procedimento por nome"
                    className={cn(
                      'pl-10 pr-4 py-3 text-base',
                      hasGradient
                        ? 'bg-white/90 border-white/60 focus:border-white/80'
                        : 'bg-white border-gray-300'
                    )}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredServices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum procedimento encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredServices.map((service) => {
                      const isSelected = orcamentoProcedimentos.some(p => p.id === service.id);
                      return (
                        <label
                          key={service.id}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer',
                            'flex items-center gap-3',
                            isSelected
                              ? hasGradient
                                ? isCustom && gradientColors
                                  ? 'text-white border-2'
                                  : isVibrant
                                  ? 'bg-indigo-50 border-2 border-indigo-500'
                                  : 'bg-blue-50 border-2 border-blue-500'
                                : 'bg-green-50 border-2 border-green-500'
                              : hasGradient
                              ? 'hover:bg-white/50 border border-transparent hover:border-white/40'
                              : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                          )}
                          style={
                            isSelected && hasGradient && isCustom && gradientColors
                              ? {
                                  background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                  borderColor: `${gradientColors.start}`,
                                }
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Adicionar procedimento
                                const novoProcedimento = {
                                  id: service.id,
                                  procedimento: service.nome,
                                  valorCentavos: service.precoCentavos || 0,
                                  valorCentavosEditado: service.precoCentavos || 0,
                                  comissaoPercentEditado: service.comissaoPercent || 0,
                                  dentes: [],
                                  selectionTypes: [],
                                  profissionalId: '',
                                  estado: 'a_realizar' as const,
                                  gerarPagamentoFinanceiro: false,
                                  createdAt: new Date(),
                                  updatedAt: new Date(),
                                  companyId,
                                  patientId: patientId || '',
                                };
                                setOrcamentoProcedimentos(prev => [...prev, novoProcedimento]);
                                setProcedimentosSelecionados(prev => new Set(prev).add(service.id));
                              } else {
                                // Remover procedimento
                                setOrcamentoProcedimentos(prev => prev.filter(p => p.id !== service.id));
                                setProcedimentosSelecionados(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(service.id);
                                  return newSet;
                                });
                              }
                            }}
                            className={cn(
                              'w-5 h-5 rounded focus:ring-2',
                              hasGradient
                                ? isCustom && gradientColors
                                  ? 'border-white/60 text-white focus:ring-white/50'
                                  : isVibrant
                                  ? 'border-indigo-300 text-indigo-600 focus:ring-indigo-500'
                                  : 'border-blue-300 text-blue-600 focus:ring-blue-500'
                                : 'border-gray-300 text-slate-600 focus:ring-slate-500'
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-gray-900 truncate">{service.nome}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                R$ {(service.precoCentavos / 100).toFixed(2).replace('.', ',')}
                              </span>
                              {service.duracaoMin && (
                                <>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {service.duracaoMin} min
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className={cn(
                              'w-5 h-5 flex-shrink-0',
                              hasGradient
                                ? isCustom && gradientColors
                                  ? 'text-white'
                                  : isVibrant
                                  ? 'text-indigo-600'
                                  : 'text-blue-600'
                                : 'text-slate-600'
                            )} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={cn(
                'p-4 border-t',
                hasGradient
                  ? 'bg-white/60 border-white/40'
                  : 'bg-gray-50 border-gray-200'
              )}>
                {orcamentoProcedimentos.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        'text-sm font-medium',
                        hasGradient ? 'text-slate-700' : 'text-gray-700'
                      )}>
                        {orcamentoProcedimentos.length} procedimento{orcamentoProcedimentos.length !== 1 ? 's' : ''} selecionado{orcamentoProcedimentos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span className={cn(
                        hasGradient ? 'text-slate-600' : 'text-gray-600'
                      )}>Total:</span>
                      <span className={cn(
                        'font-semibold',
                        hasGradient ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        {(() => {
                          const totalPrice = orcamentoProcedimentos.reduce((sum, p) => {
                            const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : p.valorCentavos;
                            return sum + valor;
                          }, 0);
                          return `R$ ${(totalPrice / 100).toFixed(2).replace('.', ',')}`;
                        })()}
                      </span>
                    </div>
                    <Button
                      onClick={() => setShowProcedimentoModal(false)}
                      className={cn(
                        'w-full text-white font-semibold shadow-lg',
                        hasGradient
                          ? isCustom && gradientColors
                            ? ''
                            : isVibrant
                            ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : 'bg-green-600 hover:bg-green-700'
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
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className={cn(
                      'text-sm mb-3',
                      hasGradient ? 'text-slate-500' : 'text-gray-500'
                    )}>Selecione pelo menos um procedimento</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowProcedimentoModal(false)}
                      className={cn(
                        'w-full',
                        hasGradient
                          ? 'border-white/50 hover:border-white/70 text-slate-700 hover:bg-white/80'
                          : 'border-gray-300 hover:border-gray-400'
                      )}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
