'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Edit, Send, Printer, Trash2, ChevronDown, FileText, Stethoscope, CheckCircle2, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/components/ui/toast';

interface OrcamentosListProps {
  orcamentos: any[];
  orcamentosLoading: boolean;
  expandedOrcamentos: Set<string>;
  hasGradient?: boolean;
  isCustom?: boolean;
  gradientColors: { start: string; middle: string; end: string } | null | undefined;
  isVibrant?: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (id: string) => void;
  onSend: (orcamento: any) => Promise<void>;
  onPrint: (orcamento: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function OrcamentosList({
  orcamentos,
  orcamentosLoading,
  expandedOrcamentos,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
  onToggleExpand,
  onEdit,
  onSend,
  onPrint,
  onDelete,
}: OrcamentosListProps) {
  if (orcamentosLoading) {
    return (
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
                : isVibrant
                ? 'border-indigo-500'
                : 'border-indigo-500'
              : 'border-blue-500'
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
            Carregando orçamentos...
          </p>
        </div>
      </div>
    );
  }

  if (orcamentos.length === 0) {
    return (
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
              : isVibrant
              ? 'bg-gradient-to-br from-indigo-100/60 via-purple-100/60 to-pink-100/60 border-white/40'
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
          Nenhum orçamento encontrado
        </h3>
        <p className={cn(
          'text-sm',
          hasGradient 
            ? isCustom && gradientColors
              ? 'text-slate-600'
              : 'text-slate-500'
            : 'text-gray-500'
        )}>
          Os orçamentos criados na Ficha Clínica Odontológica aparecerão aqui
        </p>
      </motion.div>
    );
  }

  const statusColors: Record<string, string> = {
    rascunho: 'bg-gray-100 text-gray-700 border-gray-300',
    aguardando_assinatura: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    finalizado: 'bg-slate-100 text-slate-700 border-slate-300',
    aprovado: 'bg-blue-100 text-blue-700 border-blue-300',
    recusado: 'bg-red-100 text-red-700 border-red-300',
  };
  
  const statusLabels: Record<string, string> = {
    rascunho: 'Rascunho',
    aguardando_assinatura: 'Aguardando Assinatura',
    finalizado: 'Finalizado',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {orcamentos.map((orcamento, index) => {
        const isExpanded = expandedOrcamentos.has(orcamento.id);
        const isSigned = !!orcamento.signedAt;
        
        return (
          <motion.div
            id={`orcamento-${orcamento.id}`}
            key={orcamento.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'group rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer',
              hasGradient
                ? 'bg-white/95 border-2 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:scale-[1.02]'
                : 'bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl hover:scale-[1.01]'
            )}
            style={
              hasGradient
                ? isCustom && gradientColors
                  ? {
                      borderColor: `${gradientColors.start}40`,
                    }
                  : isVibrant
                  ? {
                      borderColor: 'rgba(139, 92, 246, 0.4)',
                    }
                  : {
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                    }
                : undefined
            }
          >
            {/* Header do card com gradiente impactante */}
            <div
              className={cn(
                'px-6 py-6 border-b relative overflow-hidden',
                hasGradient
                  ? isCustom && gradientColors
                    ? 'border-white/40'
                    : isVibrant
                    ? 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-white/40'
                    : 'bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-white/40'
                  : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-gray-200'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start}15 0%, ${gradientColors.middle}15 50%, ${gradientColors.end}15 100%)`,
                      borderColor: `${gradientColors.start}40`,
                    }
                  : undefined
              }
            >
              {/* Decorative elements */}
              <div 
                className={cn(
                  'absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 -mr-20 -mt-20 transition-opacity group-hover:opacity-40',
                  hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-400 to-pink-400'
                      : 'bg-gradient-to-br from-blue-400 to-indigo-400'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-400'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `radial-gradient(circle, ${gradientColors.start} 0%, transparent 70%)`,
                      }
                    : undefined
                }
              />
              <div 
                className={cn(
                  'absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-20 -ml-12 -mb-12',
                  hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-br from-purple-300 to-pink-300'
                      : 'bg-gradient-to-br from-indigo-300 to-purple-300'
                    : 'bg-gradient-to-br from-indigo-300 to-purple-300'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `radial-gradient(circle, ${gradientColors.middle} 0%, transparent 70%)`,
                      }
                    : undefined
                }
              />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Badge className={cn(
                      'text-xs font-bold px-3 py-1.5 shadow-lg border-2',
                      statusColors[orcamento.status] || statusColors.rascunho
                    )}>
                      {statusLabels[orcamento.status] || 'Rascunho'}
                    </Badge>
                    {isSigned && (
                      <Badge 
                        className={cn(
                          'text-white border-0 text-xs font-bold px-3 py-1.5 shadow-lg',
                          hasGradient && isCustom && gradientColors
                            ? ''
                            : 'bg-gradient-to-r from-slate-500 to-blue-500'
                        )}
                        style={
                          hasGradient && isCustom && gradientColors
                            ? {
                                background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" />
                        Assinado
                      </Badge>
                    )}
                  </div>
                  <div className="mb-4">
                    <p className={cn(
                      'text-lg font-bold mb-1',
                      hasGradient ? 'text-slate-900' : 'text-gray-900'
                    )}>
                      {orcamento.procedimentos.length} procedimento{orcamento.procedimentos.length !== 1 ? 's' : ''}
                    </p>
                    {orcamento.observacoes && (
                      <p className={cn(
                        'text-sm line-clamp-2',
                        hasGradient ? 'text-slate-600' : 'text-gray-600'
                      )}>
                        {orcamento.observacoes}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border shadow-sm',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'bg-white/80 border-white/50'
                        : 'bg-white/70 border-white/40'
                      : 'bg-white/90 border-gray-200/60'
                  )}>
                    <Clock3 className={cn(
                      'w-4 h-4',
                      hasGradient 
                        ? isCustom && gradientColors
                          ? 'text-slate-600'
                          : 'text-slate-500'
                        : 'text-gray-600'
                    )} />
                    <span className={cn(
                      'text-xs font-semibold',
                      hasGradient 
                        ? isCustom && gradientColors
                          ? 'text-slate-700'
                          : 'text-slate-600'
                        : 'text-gray-700'
                    )}>
                      {format(orcamento.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative z-10">
                  <div className={cn(
                    'text-right p-6 rounded-2xl shadow-2xl min-w-[150px]',
                    hasGradient
                      ? isCustom && gradientColors
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  )}
                  style={
                    hasGradient && isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                  >
                    <p className="text-xs font-bold text-white/90 mb-2 uppercase tracking-wider">
                      Valor Total
                    </p>
                    <p className="text-3xl font-extrabold text-white mb-2">
                      R$ {(orcamento.valorTotalCentavos / 100).toFixed(2).replace('.', ',')}
                    </p>
                    {orcamento.descontoCentavos > 0 && (
                      <p className="text-xs text-white/90 font-semibold mt-2 pt-2 border-t border-white/30">
                        Desconto: - R$ {(orcamento.descontoCentavos / 100).toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo do card */}
            <div className="p-6 space-y-4 bg-white/30">
              {/* Botões de ação */}
              <div className={cn(
                'flex items-center justify-end gap-2 pb-4 border-b',
                hasGradient 
                  ? isCustom && gradientColors
                    ? 'border-white/30'
                    : 'border-white/25'
                  : 'border-gray-200'
              )}>
                {!isSigned && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(orcamento.id);
                    }}
                    className={cn(
                      'h-9 px-3 rounded-lg transition-all shadow-sm font-semibold text-xs',
                      hasGradient
                        ? 'text-slate-600 hover:text-slate-700 hover:bg-slate-50/90 border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'
                    )}
                    title="Editar orçamento"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onSend(orcamento);
                  }}
                  className={cn(
                    'h-9 px-3 rounded-lg transition-all shadow-sm font-semibold text-xs',
                    hasGradient
                      ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50/90 border border-blue-200/60'
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200'
                  )}
                  title="Enviar link de assinatura"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onPrint(orcamento);
                  }}
                  className={cn(
                    'h-9 px-3 rounded-lg transition-all shadow-sm font-semibold text-xs',
                    hasGradient
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 border border-slate-200/60'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                  )}
                  title="Imprimir/Download PDF"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  PDF
                </Button>
                {!isSigned && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                        try {
                          await onDelete(orcamento.id);
                          showSuccess('Orçamento excluído com sucesso!');
                        } catch (error) {
                          showError('Erro ao excluir orçamento. Por favor, tente novamente.');
                        }
                      }
                    }}
                    className={cn(
                      'h-9 px-3 rounded-lg transition-all shadow-sm font-semibold text-xs',
                      hasGradient
                        ? 'text-red-500 hover:text-red-600 hover:bg-red-50/90 border border-red-200/60'
                        : 'text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-200'
                    )}
                    title="Excluir orçamento"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
              
              {/* Botão para expandir/colapsar procedimentos */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(orcamento.id);
                }}
                className={cn(
                  'w-full flex items-center justify-between text-sm font-bold transition-all rounded-lg px-4 py-2.5 shadow-sm',
                  hasGradient
                    ? isExpanded
                      ? isCustom && gradientColors
                        ? 'text-white border border-white/50'
                        : 'text-indigo-700 bg-indigo-50/70 border border-indigo-200/60'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-white/40'
                    : isExpanded
                      ? 'text-blue-700 bg-blue-50 border border-blue-200'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                )}
                style={
                  hasGradient && isExpanded && isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg shadow-sm border',
                    hasGradient
                      ? isExpanded
                        ? isCustom && gradientColors
                          ? 'bg-white/30 border-white/40'
                          : 'bg-indigo-500/20 border-indigo-200/50'
                        : 'bg-slate-100/50 border-white/30'
                      : isExpanded
                        ? 'bg-blue-100 border-blue-200/50'
                        : 'bg-gray-100 border-gray-200/50'
                  )}
                  style={
                    hasGradient && isExpanded && isCustom && gradientColors
                      ? {
                          backgroundColor: `${gradientColors.start}30`,
                          borderColor: `${gradientColors.start}40`,
                        }
                      : undefined
                  }
                  >
                    <FileText className={cn(
                      'w-4 h-4',
                      hasGradient
                        ? isExpanded
                          ? isCustom && gradientColors
                            ? 'text-white'
                            : 'text-indigo-600'
                          : 'text-slate-500'
                        : isExpanded
                          ? 'text-blue-600'
                          : 'text-gray-500'
                    )} />
                  </div>
                  <span>
                    Ver {orcamento.procedimentos.length} procedimento{orcamento.procedimentos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className={cn(
                    'w-5 h-5 transition-transform',
                    hasGradient
                      ? isExpanded
                        ? isCustom && gradientColors
                          ? 'text-white'
                          : 'text-indigo-600'
                        : 'text-slate-500'
                      : isExpanded
                        ? 'text-blue-600'
                        : 'text-gray-500'
                  )} />
                </motion.div>
              </button>
              
              {/* Lista de procedimentos (colapsável) */}
              <AnimatePresence>
                {isExpanded && orcamento.procedimentos.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'overflow-hidden border-t pt-4',
                      hasGradient ? 'border-white/20' : 'border-gray-100'
                    )}
                  >
                    <div className={cn(
                      'space-y-3 py-4',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-indigo-50/30 via-purple-50/30 to-pink-50/30'
                          : 'bg-gradient-to-br from-slate-50/50 to-gray-50/50'
                        : 'bg-gray-50/50'
                    )}
                    style={
                      hasGradient && isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start}08 0%, ${gradientColors.middle}08 50%, ${gradientColors.end}08 100%)`,
                          }
                        : undefined
                    }
                    >
                      <h4 className={cn(
                        'text-sm font-bold mb-3 flex items-center gap-2 px-6',
                        hasGradient ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        <FileText className={cn(
                          'w-4 h-4',
                          hasGradient ? 'text-slate-600' : 'text-gray-600'
                        )} />
                        Procedimentos do Orçamento
                      </h4>
                      {orcamento.procedimentos.map((proc: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            'flex items-start justify-between p-5 mx-6 rounded-xl border-2 shadow-md hover:shadow-lg transition-all',
                            hasGradient
                              ? 'bg-white/90 border-white/60 hover:bg-white hover:border-white/80'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'font-bold text-base mb-2',
                              hasGradient ? 'text-slate-900' : 'text-gray-900'
                            )}>
                              {proc.procedimento}
                            </p>
                            <div className="space-y-1.5">
                              {proc.dentes && proc.dentes.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Stethoscope className={cn(
                                    'w-4 h-4 flex-shrink-0',
                                    hasGradient ? 'text-slate-500' : 'text-gray-500'
                                  )} />
                                  <p className={cn(
                                    'text-sm font-medium',
                                    hasGradient ? 'text-slate-600' : 'text-gray-600'
                                  )}>
                                    Dentes: {proc.dentes.map((d: any) => d.numero).join(', ')}
                                  </p>
                                </div>
                              )}
                              {proc.selectionTypes && proc.selectionTypes.length > 0 && (
                                <p className={cn(
                                  'text-sm font-medium',
                                  hasGradient ? 'text-slate-600' : 'text-gray-600'
                                )}>
                                  {proc.selectionTypes.includes('ALL') ? 'Todos os dentes' : 
                                   proc.selectionTypes.includes('UPPER') && proc.selectionTypes.includes('LOWER') ? 'Superiores + Inferiores' :
                                   proc.selectionTypes.includes('UPPER') ? 'Superiores' :
                                   proc.selectionTypes.includes('LOWER') ? 'Inferiores' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={cn(
                            'ml-4 px-5 py-3 rounded-xl shadow-lg min-w-[120px] text-center',
                            hasGradient
                              ? isCustom && gradientColors
                                ? ''
                                : isVibrant
                                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          )}
                          style={
                            hasGradient && isCustom && gradientColors
                              ? {
                                  background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                }
                              : undefined
                          }
                          >
                            <p className="text-xl font-bold text-white">
                              R$ {((proc.valorCentavosEditado !== undefined ? proc.valorCentavosEditado : proc.valorCentavos) / 100).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Informações de pagamento */}
              {orcamento.formaPagamento && (
                <div className={cn(
                  'border-t pt-4',
                  hasGradient ? 'border-white/20' : 'border-gray-100'
                )}>
                  <div className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'bg-white/70 border-white/40'
                        : 'bg-white/60 border-white/40'
                      : 'bg-white border-gray-200'
                  )}>
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-xl shadow-md',
                      hasGradient && isCustom && gradientColors
                        ? ''
                        : 'bg-gradient-to-br from-slate-500 to-blue-500'
                    )}
                    style={
                      hasGradient && isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                    >
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-xs font-bold uppercase tracking-wide mb-1',
                        hasGradient ? 'text-slate-600' : 'text-gray-600'
                      )}>
                        Forma de pagamento
                      </p>
                      <p className={cn(
                        'text-sm font-semibold',
                        hasGradient ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        {orcamento.formaPagamento === 'avista' ? 'À vista' :
                         orcamento.formaPagamento === 'parcelado' ? `Parcelado${orcamento.parcelado ? ` (${orcamento.parcelado.numeroParcelas}x)` : ''}` :
                         orcamento.formaPagamento === 'multiplas' ? `Múltiplas formas${orcamento.pagamentos ? ` (${orcamento.pagamentos.length} parcela${orcamento.pagamentos.length !== 1 ? 's' : ''})` : ''}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

