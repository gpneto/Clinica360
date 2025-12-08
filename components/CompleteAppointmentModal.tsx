'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, DollarSign, CreditCard, Wallet, Banknote, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Appointment } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface CompleteAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onComplete: (appointmentId: string, data: { valorPagoCentavos: number; formaPagamento: string; clientePresente: boolean }) => void;
}

export function CompleteAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment, 
  onComplete 
}: CompleteAppointmentModalProps) {
  const [valorPago, setValorPago] = useState('0.00');
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'outros'>('dinheiro');
  const [clientePresente, setClientePresente] = useState(true);
  const [clientePrecisouPagar, setClientePrecisouPagar] = useState(true);
  const { themePreference } = useAuth();
  const isVibrant = themePreference === 'vibrant';

  // Atualizar o valor quando o appointment mudar
  useEffect(() => {
    if (appointment) {
      setValorPago((appointment.precoCentavos / 100).toFixed(2));
      setClientePresente(true);
      setClientePrecisouPagar(true);
      setFormaPagamento('dinheiro');
    }
  }, [appointment]);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleComplete = () => {
    if (!appointment) return;
    
    // Se o cliente não precisou pagar, zera o valor
    const valorFinal = clientePrecisouPagar ? valorPago : '0.00';
    const parsedValue = parseFloat(valorFinal || '0');
    const valorPagoCentavos = Number.isNaN(parsedValue)
      ? 0
      : Math.max(0, Math.round(parsedValue * 100));

    if (clientePresente && clientePrecisouPagar && valorPagoCentavos <= 0) {
      toast.error('Informe o valor pago');
      return;
    }
    
    onComplete(appointment.id, {
      valorPagoCentavos,
      formaPagamento,
      clientePresente
    });
    
    onClose();
    toast.success('Atendimento concluído com sucesso!');
  };

  if (!appointment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm',
            isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/60'
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'mx-4 w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-colors',
              isVibrant
                ? 'bg-white/80 border-white/20 backdrop-blur-xl shadow-indigo-500/20'
                : 'bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                    isVibrant
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  )}
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3
                    className={cn(
                      'text-2xl font-bold',
                      isVibrant ? 'text-slate-900' : 'text-gray-900'
                    )}
                  >
                    Concluir Atendimento
                  </h3>
                  <p
                    className={cn(
                      'text-sm',
                      isVibrant ? 'text-slate-600/80' : 'text-gray-500'
                    )}
                  >
                    Confirme os dados do pagamento
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className={cn(
                  'rounded-full',
                  isVibrant ? 'hover:bg-white/50 text-slate-600' : 'hover:bg-gray-100'
                )}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Cliente Presente */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'rounded-xl p-4 border-2 transition-colors',
                  isVibrant
                    ? 'bg-white/50 border-white/25'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="clientePresente"
                    checked={clientePresente}
                    onChange={(e) => setClientePresente(e.target.checked)}
                    className={cn(
                      'w-5 h-5 rounded border-2',
                      isVibrant ? 'text-indigo-500 border-white/30 bg-white/40' : 'text-blue-600 border-gray-300'
                    )}
                  />
                  <Label
                    htmlFor="clientePresente"
                    className={cn(
                      'cursor-pointer text-base font-semibold',
                      isVibrant ? 'text-slate-800' : 'text-gray-800'
                    )}
                  >
                    Cliente compareceu ao atendimento
                  </Label>
                </div>
              </motion.div>

              {/* Cliente Precisou Pagar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={cn(
                  'rounded-xl p-4 border-2 transition-colors',
                  isVibrant
                    ? 'bg-white/50 border-white/25'
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="clientePrecisouPagar"
                    checked={clientePrecisouPagar}
                    onChange={(e) => {
                      setClientePrecisouPagar(e.target.checked);
                      if (!e.target.checked) {
                        setValorPago('0.00');
                      } else if (appointment) {
                        setValorPago((appointment.precoCentavos / 100).toFixed(2));
                      }
                    }}
                    className={cn(
                      'w-5 h-5 rounded border-2',
                      isVibrant ? 'text-indigo-500 border-white/30 bg-white/40' : 'text-emerald-600 border-gray-300'
                    )}
                  />
                  <Label
                    htmlFor="clientePrecisouPagar"
                    className={cn(
                      'cursor-pointer text-base font-semibold',
                      isVibrant ? 'text-slate-800' : 'text-gray-800'
                    )}
                  >
                    Cliente precisou pagar o agendamento
                  </Label>
                </div>
              </motion.div>

              {/* Valor Pago */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label
                  className={cn(
                    'flex items-center gap-2 text-sm font-semibold',
                    isVibrant ? 'text-slate-700' : 'text-gray-700'
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  Valor Pago
                </Label>
                <div className="relative">
                  <span
                    className={cn(
                      'absolute left-4 top-1/2 -translate-y-1/2 font-semibold',
                      isVibrant ? 'text-slate-500' : 'text-gray-500'
                    )}
                  >
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    placeholder="0.00"
                    disabled={!clientePrecisouPagar}
                    className={cn(
                      'w-full rounded-xl border-2 pl-10 pr-4 py-3 text-lg font-semibold transition focus:ring-2',
                      !clientePrecisouPagar && 'opacity-50 cursor-not-allowed',
                      isVibrant
                        ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                        : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200'
                    )}
                  />
                </div>
                {!clientePrecisouPagar && (
                  <p className={cn(
                    'text-xs',
                    isVibrant ? 'text-slate-500' : 'text-gray-500'
                  )}>
                    O valor será salvo como R$ 0,00
                  </p>
                )}
              </motion.div>

              {/* Forma de Pagamento */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label
                  className={cn(
                    'flex items-center gap-2 text-sm font-semibold',
                    isVibrant ? 'text-slate-700' : 'text-gray-700'
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  Forma de Pagamento
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                    { value: 'pix', label: 'PIX', icon: Smartphone },
                    { value: 'cartao_debito', label: 'Débito', icon: CreditCard },
                    { value: 'cartao_credito', label: 'Crédito', icon: Wallet },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setFormaPagamento(value as any)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200',
                        formaPagamento === value
                          ? isVibrant
                            ? 'border-indigo-400 bg-white/60 text-slate-900 shadow-lg'
                            : 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                          : isVibrant
                            ? 'border-white/25 text-slate-600 hover:bg-white/50'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={onClose}
                className={cn(
                  'flex-1 border-2',
                  isVibrant ? 'border-white/25 text-slate-700 hover:bg-white/40' : 'hover:bg-gray-100'
                )}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleComplete}
                className={cn(
                  'flex-1 text-white shadow-lg',
                  isVibrant
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                )}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmar Conclusão
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
