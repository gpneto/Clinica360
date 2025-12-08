'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useCompany, useCompanyInvoices } from '@/hooks/useFirestore';
import { CheckCircle2, XCircle, Clock, CreditCard, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { collection, query, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';

function formatCurrency(amount: number, currency: string = 'brl') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'brl' ? 'BRL' : 'USD',
  }).format(amount / 100);
}

function getStatusBadge(status: string) {
  const badges = {
    active: { label: 'Ativa', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    open: { label: 'Aberto', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    past_due: { label: 'Atrasado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    canceled: { label: 'Cancelado', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle },
    inativo: { label: 'Inativo', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle },
  };
  return badges[status as keyof typeof badges] || badges.inativo;
}

const MONTHLY_WHATSAPP_FREE_LIMIT = 200;
const WHATSAPP_MESSAGE_UNIT_PRICE = 0.3;

export default function PlanoPage() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const { company, loading: companyLoading } = useCompany(companyId);
  const { invoices, loading: invoicesLoading } = useCompanyInvoices(companyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usage, setUsage] = useState<{
    monthCount: number;
    extraCount: number;
    estimatedCost: number;
  } | null>(null);

  // Detectar tema e gerar estilos dinâmicos
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom' && !!customColor;
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;

  const status = useMemo(() => {
    if (!company) return null;
    const periodEnd = company.subscriptionCurrentPeriodEnd;
    return {
      active: Boolean(company.subscriptionActive),
      status: company.subscriptionStatus || (company.subscriptionActive ? 'active' : 'inativo'),
      currentPeriodEnd: periodEnd instanceof Date ? periodEnd : (periodEnd ? new Date(periodEnd) : null),
      provider: company.subscriptionProvider || null,
    };
  }, [company]);

  const loadUsage = async () => {
    if (!companyId) return;
    setUsageLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Usar a collection correta: companies/{companyId}/whatsappMessages
      // Filtrar apenas mensagens automáticas (messageSource: 'automatic')
      const monthQuery = query(
        collection(db, `companies/${companyId}/whatsappMessages`),
        where('messageSource', '==', 'automatic'),
        where('createdAt', '>=', Timestamp.fromDate(monthStart)),
        where('createdAt', '<=', Timestamp.fromDate(monthEnd))
      );

      const snapshot = await getCountFromServer(monthQuery);
      const monthCount = snapshot.data().count || 0;
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
      const estimatedCost = extraCount * WHATSAPP_MESSAGE_UNIT_PRICE;

      setUsage({ monthCount, extraCount, estimatedCost });
    } catch (err) {
      console.error('Erro ao carregar uso:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const iniciarPagamento = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, 'createStripeCheckoutSession');
      const result = await callable({ companyId });
      const url = (result.data as any)?.url;
      if (url) {
        window.location.href = url;
      } else {
        setError('Não foi possível criar a sessão de pagamento.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const iniciarPagamentoAvulso = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, 'createUsageBasedCheckout');
      const result = await callable({ companyId });
      const url = (result.data as any)?.url;
      if (url) {
        window.location.href = url;
      } else {
        setError('Não foi possível criar a sessão de pagamento.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar pagamento avulso');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = status ? getStatusBadge(status.status) : null;
  const StatusIcon = statusBadge?.icon || CheckCircle2;

  if (companyLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn('app-page min-h-screen p-2 sm:p-4 md:p-6 lg:p-8')}>
      <div className="max-w-6xl mx-auto space-y-6">
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
          <div className="flex items-center gap-3">
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
              <CreditCard className="w-6 h-6 text-white" />
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
                Plano
              </h1>
              <p className={cn('text-sm mt-0.5', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                Gerencie seu plano e visualize o histórico de pagamentos
              </p>
            </div>
          </div>
        </motion.div>

        {/* Card de Status do Plano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(
            'rounded-2xl p-6',
            hasGradient
              ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
              : 'app-card border border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Status do Plano</h2>
              {statusBadge && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBadge.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{statusBadge.label}</span>
                </div>
              )}
            </div>
            {status?.active && status?.status === 'active' && (
              <div className="text-right">
                <div className="text-sm text-slate-500 mb-1">Próximo vencimento</div>
                <div className="text-lg font-semibold text-slate-900">
                  {status.currentPeriodEnd ? status.currentPeriodEnd.toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={cn(
              'p-4 rounded-xl border',
              hasGradient
                ? 'bg-white/60 border-white/40'
                : 'bg-slate-50 border-slate-200'
            )}>
              <div className={cn('flex items-center gap-2 mb-2', hasGradient ? 'text-slate-600' : 'text-slate-500')}>
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Provedor</span>
              </div>
              <div className={cn('font-semibold capitalize', hasGradient ? 'text-slate-900' : 'text-slate-900')}>{status?.provider || 'Não configurado'}</div>
            </div>
            {status?.currentPeriodEnd && (
              <div className={cn(
                'p-4 rounded-xl border',
                hasGradient
                  ? 'bg-white/60 border-white/40'
                  : 'bg-slate-50 border-slate-200'
              )}>
                <div className={cn('flex items-center gap-2 mb-2', hasGradient ? 'text-slate-600' : 'text-slate-500')}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Próximo vencimento</span>
                </div>
                <div className={cn('font-semibold', hasGradient ? 'text-slate-900' : 'text-slate-900')}>
                  {status.currentPeriodEnd.toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
            {invoices.length > 0 && (
              <div className={cn(
                'p-4 rounded-xl border',
                hasGradient
                  ? 'bg-white/60 border-white/40'
                  : 'bg-slate-50 border-slate-200'
              )}>
                <div className={cn('flex items-center gap-2 mb-2', hasGradient ? 'text-slate-600' : 'text-slate-500')}>
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Total pago</span>
                </div>
                <div className={cn('font-semibold', hasGradient ? 'text-slate-900' : 'text-slate-900')}>
                  {formatCurrency(
                    invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
                    'brl'
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {(!status?.active || status?.status !== 'active') && (
            <button
              onClick={iniciarPagamento}
              disabled={loading || !companyId}
              className={cn(
                'inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm',
                hasGradient
                  ? isCustom && gradientStyleHorizontal
                    ? 'hover:opacity-90'
                    : isVibrant
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  : isNeutral
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
              )}
              style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
            >
              {loading ? 'Redirecionando...' : 'Assinar / Regularizar pagamento'}
            </button>
          )}
          {status?.active && status?.status === 'active' && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">Sua assinatura está ativa e em dia</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Pagamento Avulso por Uso */}
        {company?.subscriptionType !== 'monthly' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
              'rounded-2xl p-6',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare 
                className={cn(
                  'w-5 h-5',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-transparent bg-clip-text'
                      : isVibrant
                      ? 'text-indigo-600'
                      : 'text-slate-700'
                    : isNeutral
                    ? 'text-slate-700'
                    : 'text-slate-700'
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
              />
              <h2 className={cn('text-xl font-semibold', hasGradient ? 'text-slate-900' : 'text-slate-900')}>Pagamento Avulso por Uso</h2>
            </div>
            <p className="text-slate-600 mb-6 text-sm">
              Pague apenas pelo que usar. As primeiras {MONTHLY_WHATSAPP_FREE_LIMIT} mensagens do mês são gratuitas. 
              Cada mensagem adicional custa {formatCurrency(WHATSAPP_MESSAGE_UNIT_PRICE * 100, 'brl')}.
            </p>

            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : usage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={cn(
                    'p-4 rounded-xl border',
                    hasGradient
                      ? 'bg-white/60 border-white/40'
                      : 'bg-slate-50 border-slate-200'
                  )}>
                    <div className={cn('text-sm mb-1', hasGradient ? 'text-slate-600' : 'text-slate-500')}>Mensagens este mês</div>
                    <div className={cn('text-2xl font-bold', hasGradient ? 'text-slate-900' : 'text-slate-900')}>{usage.monthCount}</div>
                  </div>
                  <div className={cn(
                    'p-4 rounded-xl border',
                    hasGradient
                      ? 'bg-white/60 border-white/40'
                      : 'bg-slate-50 border-slate-200'
                  )}>
                    <div className={cn('text-sm mb-1', hasGradient ? 'text-slate-600' : 'text-slate-500')}>Excedentes</div>
                    <div className={cn('text-2xl font-bold', hasGradient ? 'text-slate-900' : 'text-slate-900')}>{usage.extraCount}</div>
                    <div className={cn('text-xs mt-1', hasGradient ? 'text-slate-400' : 'text-slate-400')}>
                      {MONTHLY_WHATSAPP_FREE_LIMIT} gratuitas incluídas
                    </div>
                  </div>
                  <div 
                    className={cn(
                      'p-4 rounded-xl border',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-white/60 border-white/40'
                          : isVibrant
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-slate-50 border-slate-200'
                        : isNeutral
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div 
                      className={cn(
                        'text-sm mb-1',
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent'
                            : isVibrant
                            ? 'text-indigo-600'
                            : 'text-slate-600'
                          : isNeutral
                          ? 'text-slate-600'
                          : 'text-slate-600'
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
                      Valor a pagar
                    </div>
                    <div className={cn(
                      'text-2xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-clip-text text-transparent'
                          : isVibrant
                          ? 'text-indigo-900'
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
                    }>
                      {formatCurrency(usage.estimatedCost * 100, 'brl')}
                    </div>
                  </div>
                </div>

                {usage.extraCount > 0 ? (
                  <button
                    onClick={iniciarPagamentoAvulso}
                    disabled={loading || !companyId}
                    className={cn(
                      'w-full inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm',
                      hasGradient
                        ? isCustom && gradientStyleHorizontal
                          ? 'hover:opacity-90'
                          : isVibrant
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        : isNeutral
                        ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                    )}
                    style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    {loading ? 'Redirecionando...' : `Pagar ${formatCurrency(usage.estimatedCost * 100, 'brl')} pelo uso do mês`}
                  </button>
                ) : (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                    <p className="text-emerald-800 font-medium">
                      ✓ Você está dentro do limite gratuito. Nenhum pagamento necessário.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Não foi possível carregar o uso de mensagens.</p>
                <button
                  onClick={loadUsage}
                  className={cn(
                    'mt-4 text-sm font-medium',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'bg-clip-text text-transparent'
                        : isVibrant
                        ? 'text-indigo-600 hover:text-indigo-700'
                        : 'text-slate-600 hover:text-slate-700'
                      : isNeutral
                      ? 'text-slate-600 hover:text-slate-700'
                      : 'text-slate-600 hover:text-slate-700'
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
                  Tentar novamente
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Histórico de Pagamentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={cn(
            'rounded-2xl p-6',
            hasGradient
              ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
              : 'app-card border border-slate-200 shadow-sm'
          )}
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Histórico de Pagamentos</h2>
          
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>Nenhum pagamento registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const badge = getStatusBadge(invoice.status);
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </div>
                        <span className="text-sm text-slate-500">
                          {invoice.createdAt.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 mb-1">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </div>
                      {invoice.periodStart && invoice.periodEnd && (
                        <div className="text-sm text-slate-500">
                          Período: {invoice.periodStart.toLocaleDateString('pt-BR')} até{' '}
                          {invoice.periodEnd.toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {invoice.paymentMethod && invoice.paymentMethod !== 'unknown' && (
                        <div className="text-xs text-slate-400 mt-1">
                          Método: {invoice.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


