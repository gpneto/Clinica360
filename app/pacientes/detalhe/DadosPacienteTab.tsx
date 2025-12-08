'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePatient } from '@/hooks/useFirestore';
import { showError, showSuccess } from '@/components/ui/toast';
import { startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TabProps } from './types';

export function DadosPacienteTab({
  companyId,
  patientId,
  patient: patientProp,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
  gradientStyleHorizontal,
  singularLabel = 'paciente',
  singularTitle = 'Paciente',
}: TabProps) {
  const { patient, updatePatient } = usePatient(companyId, patientId || null);
  const currentPatient = patientProp || patient;
  
  const [fichaData, setFichaData] = useState({
    nome: '',
    telefoneE164: '',
    email: '',
    cpf: '',
    dataNascimento: '' as string,
  });
  const [savingFicha, setSavingFicha] = useState(false);

  // Carregar dados do paciente quando disponível
  useEffect(() => {
    if (currentPatient) {
      setFichaData({
        nome: currentPatient.nome || '',
        telefoneE164: currentPatient.telefoneE164 || '',
        email: currentPatient.email || '',
        cpf: currentPatient.cpf || '',
        dataNascimento: currentPatient.dataNascimento
          ? new Date(currentPatient.dataNascimento).toISOString().split('T')[0]
          : '',
      });
    }
  }, [currentPatient]);

  const handleSaveFicha = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !patientId) return;
    try {
      setSavingFicha(true);
      const patientData = {
        nome: fichaData.nome,
        telefoneE164: fichaData.telefoneE164,
        email: fichaData.email,
        cpf: fichaData.cpf || undefined,
        dataNascimento: fichaData.dataNascimento
          ? startOfDay(new Date(fichaData.dataNascimento + 'T00:00:00'))
          : undefined,
      };
      await updatePatient(patientData);
      showSuccess('Ficha clínica atualizada com sucesso.');
    } catch (err) {
      console.error(err);
      showError('Erro ao atualizar ficha clínica.');
    } finally {
      setSavingFicha(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'shadow-lg border-0 transition-all',
          hasGradient
            ? 'bg-white/80 border border-white/25 backdrop-blur-xl'
            : 'bg-white'
        )}
      >
        <CardHeader
          className={cn('border-b', hasGradient ? 'border-white/20' : 'border-slate-200')}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md',
                isVibrant
                  ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                  : isCustom && gradientColors
                  ? ''
                  : 'bg-slate-700'
              )}
              style={
                isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className={cn('text-xl font-semibold', hasGradient ? 'text-slate-900' : 'text-gray-900')}>
                Dados do {singularTitle}
              </CardTitle>
              <p className={cn('text-xs mt-1', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                Informações pessoais e de contato
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSaveFicha} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label className={cn('text-sm font-semibold mb-2 block', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                  Nome completo
                </Label>
                <Input
                  value={fichaData.nome}
                  onChange={(event) => setFichaData((prev) => ({ ...prev, nome: event.target.value }))}
                  placeholder={`Nome do ${singularLabel}`}
                  required
                  className={cn(
                    'transition-all focus:ring-2',
                    hasGradient
                      ? 'bg-white/60 border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                      : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Label className={cn('text-sm font-semibold mb-2 block', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                  Telefone
                </Label>
                <Input
                  value={fichaData.telefoneE164}
                  onChange={(event) => setFichaData((prev) => ({ ...prev, telefoneE164: event.target.value }))}
                  placeholder="+55 11 99999-9999"
                  className={cn(
                    'transition-all focus:ring-2',
                    hasGradient
                      ? 'bg-white/60 border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                      : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label className={cn('text-sm font-semibold mb-2 block', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={fichaData.email}
                  onChange={(event) => setFichaData((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder={`${singularLabel}@email.com`}
                  className={cn(
                    'transition-all focus:ring-2',
                    hasGradient
                      ? 'bg-white/60 border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                      : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Label className={cn('text-sm font-semibold mb-2 block', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                  CPF <span className="text-xs font-normal text-gray-500">(opcional)</span>
                </Label>
                <Input
                  type="text"
                  value={fichaData.cpf}
                  onChange={(event) => {
                    let value = event.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                      setFichaData((prev) => ({ ...prev, cpf: value }));
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={cn(
                    'transition-all focus:ring-2',
                    hasGradient
                      ? 'bg-white/60 border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                      : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className={cn('text-sm font-semibold mb-2 block', hasGradient ? 'text-slate-700' : 'text-gray-700')}>
                  Data de Nascimento <span className="text-xs font-normal text-gray-500">(opcional)</span>
                </Label>
                <Input
                  type="date"
                  value={fichaData.dataNascimento}
                  onChange={(event) => setFichaData((prev) => ({ ...prev, dataNascimento: event.target.value }))}
                  className={cn(
                    'transition-all focus:ring-2',
                    hasGradient
                      ? 'bg-white/60 border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                      : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
                <p className={cn('text-xs mt-2', hasGradient ? 'text-slate-500/80' : 'text-gray-500')}>
                  O aniversário aparecerá no calendário como evento de dia todo
                </p>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-end pt-4 border-t border-slate-200"
            >
              <Button
                type="submit"
                disabled={savingFicha}
                className={cn(
                  'min-w-[140px] text-white shadow-md hover:shadow-lg transition-all',
                  hasGradient
                    ? isCustom && gradientStyleHorizontal
                      ? ''
                      : 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                    : 'bg-slate-900 hover:bg-slate-800'
                )}
                style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
              >
                {savingFicha ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

