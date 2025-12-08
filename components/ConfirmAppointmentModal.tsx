'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Clock, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface ConfirmAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (appointmentId: string) => void;
}

export function ConfirmAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment, 
  onConfirm 
}: ConfirmAppointmentModalProps) {
  const { themePreference } = useAuth();
  const isVibrant = themePreference === 'vibrant';

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

  const handleConfirm = () => {
    if (!appointment) return;
    
    onConfirm(appointment.id);
    onClose();
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
                      ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  )}
                >
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3
                    className={cn(
                      'text-2xl font-bold',
                      isVibrant ? 'text-slate-900' : 'text-gray-900'
                    )}
                  >
                    Confirmar Agendamento
                  </h3>
                  <p
                    className={cn(
                      'text-sm',
                      isVibrant ? 'text-slate-600/80' : 'text-gray-500'
                    )}
                  >
                    Confirme os dados do agendamento
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
            
            <div className="space-y-4">
              {/* Informações do agendamento */}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isVibrant ? 'bg-blue-500/20 text-blue-600' : 'bg-blue-100 text-blue-600'
                    )}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-xs font-medium',
                        isVibrant ? 'text-slate-500' : 'text-gray-500'
                      )}>
                        Data
                      </p>
                      <p className={cn(
                        'text-base font-semibold',
                        isVibrant ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        {format(appointment.inicio, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isVibrant ? 'bg-blue-500/20 text-blue-600' : 'bg-blue-100 text-blue-600'
                    )}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-xs font-medium',
                        isVibrant ? 'text-slate-500' : 'text-gray-500'
                      )}>
                        Horário
                      </p>
                      <p className={cn(
                        'text-base font-semibold',
                        isVibrant ? 'text-slate-900' : 'text-gray-900'
                      )}>
                        {format(appointment.inicio, 'HH:mm', { locale: ptBR })} - {format(appointment.fim, 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Aviso */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'rounded-xl p-4 border-2',
                  isVibrant
                    ? 'bg-blue-50/50 border-blue-200/50'
                    : 'bg-blue-50 border-blue-200'
                )}
              >
                <p className={cn(
                  'text-sm leading-relaxed',
                  isVibrant ? 'text-blue-900/80' : 'text-blue-800'
                )}>
                  <strong>Deseja confirmar este agendamento?</strong>
                  <br />
                  O status do agendamento será alterado para "Confirmado" e o cliente pode receber uma notificação de confirmação.
                </p>
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
                onClick={handleConfirm}
                className={cn(
                  'flex-1 text-white shadow-lg',
                  isVibrant
                    ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                )}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirmar Agendamento
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

