'use client';

import { motion } from 'framer-motion';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TabProps } from './types';
import { OrcamentosList } from './OrcamentosList';

export interface OrcamentosTabProps extends TabProps {
  orcamentos: any[];
  orcamentosLoading: boolean;
  expandedOrcamentos: Set<string>;
  canAccessPatientDebits: boolean;
  onToggleExpand: (id: string) => void;
  onNewOrcamento: () => void;
  onEditOrcamento: (id: string) => void;
  onDeleteOrcamento: (id: string) => Promise<void>;
  onSendOrcamento: (orcamento: any) => Promise<void>;
  onPrintOrcamento: (orcamento: any) => Promise<void>;
  children?: React.ReactNode; // Para modais e outros componentes relacionados
  company?: any; // Company type
}

export function OrcamentosTab({
  orcamentos = [],
  orcamentosLoading,
  expandedOrcamentos,
  canAccessPatientDebits,
  onToggleExpand,
  onNewOrcamento,
  onEditOrcamento,
  onDeleteOrcamento,
  onSendOrcamento,
  onPrintOrcamento,
  children,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
  gradientStyleHorizontal,
}: OrcamentosTabProps) {
  if (!canAccessPatientDebits) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(
          'shadow-lg border-0 transition-all',
          hasGradient
            ? 'bg-white/80 border border-white/25 backdrop-blur-xl'
            : 'bg-white'
        )}>
          <CardContent className="p-6 text-center">
            <div className={cn(
              'inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 border shadow-sm',
              hasGradient
                ? isCustom && gradientColors
                  ? 'bg-white/70 border-white/40'
                  : isVibrant
                  ? 'bg-gradient-to-br from-indigo-100/50 via-purple-100/50 to-pink-100/50 border-white/30'
                  : 'bg-slate-100/50 border-white/30'
                : 'bg-gray-100 border-gray-200/50'
            )}
            style={
              hasGradient && isCustom && gradientColors
                ? {
                    backgroundColor: `${gradientColors.start}15`,
                    borderColor: `${gradientColors.start}30`,
                  }
                : undefined
            }
            >
              <Wallet className={cn(
                'w-8 h-8',
                hasGradient 
                  ? isCustom && gradientColors
                    ? 'text-slate-500'
                    : 'text-slate-400'
                  : 'text-gray-400'
              )} />
            </div>
            <p className={cn(
              'text-sm font-medium',
              hasGradient 
                ? isCustom && gradientColors
                  ? 'text-slate-700'
                  : 'text-slate-600'
                : 'text-gray-600'
            )}>
              Você não tem permissão para acessar a aba de Débitos.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Moderno */}
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
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
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
              <h2
                className={cn(
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
                Orçamentos
              </h2>
              <p
                className={cn(
                  'text-sm mt-1 font-medium',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-slate-600'
                      : 'text-slate-600'
                    : 'text-gray-600'
                )}
              >
                {orcamentos.length} {orcamentos.length === 1 ? 'orçamento cadastrado' : 'orçamentos cadastrados'}
              </p>
            </div>
          </div>
          <Button
            onClick={onNewOrcamento}
            className={cn(
              'gap-2 shadow-lg hover:shadow-xl transition-all text-white font-semibold h-12 px-6 rounded-xl',
              hasGradient
                ? isCustom && gradientColors
                  ? ''
                  : isVibrant
                  ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
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
            Novo Orçamento
          </Button>
        </div>
      </motion.div>

      {/* Lista de Orçamentos */}
      <div className="space-y-4">
        <OrcamentosList
          orcamentos={orcamentos}
          orcamentosLoading={orcamentosLoading}
          expandedOrcamentos={expandedOrcamentos}
          hasGradient={hasGradient}
          isCustom={isCustom}
          gradientColors={gradientColors}
          isVibrant={isVibrant}
          onToggleExpand={onToggleExpand}
          onEdit={onEditOrcamento}
          onSend={onSendOrcamento}
          onPrint={onPrintOrcamento}
          onDelete={onDeleteOrcamento}
        />
      </div>

      {/* Modais e outros componentes relacionados */}
      {children}
    </div>
  );
}

