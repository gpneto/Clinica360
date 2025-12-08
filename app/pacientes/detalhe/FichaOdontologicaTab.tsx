'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DentalChart } from './DentalChart';
import { showError, showSuccess } from '@/components/ui/toast';
import type { TabProps } from './types';
import type { Professional } from '@/types';

export interface FichaOdontologicaTabProps extends TabProps {
  professionals: Professional[];
  dentalProcedures: any[];
  orcamentos: any[];
  dentalProceduresLoading: boolean;
  user: any;
  onNavigateToOrcamentos?: (orcamentoId?: string) => void;
  onAddProcedimento?: (procedimento: any) => Promise<void>;
  onEditProcedimento?: (id: string, procedimento: any) => Promise<void>;
  onDeleteProcedimento?: (id: string) => Promise<void>;
  createDebito?: (data: any) => Promise<string>;
  updateDentalProcedure?: (id: string, data: any) => Promise<void>;
}

export function FichaOdontologicaTab({
  companyId,
  patientId,
  professionals = [],
  dentalProcedures = [],
  orcamentos = [],
  dentalProceduresLoading = false,
  user,
  onNavigateToOrcamentos,
  onAddProcedimento,
  onEditProcedimento,
  onDeleteProcedimento,
  createDebito,
  updateDentalProcedure,
}: FichaOdontologicaTabProps) {
  return (
    <Card className="bg-white shadow-lg border-0 overflow-visible">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl font-semibold text-gray-900">
          Prontuário
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-6 overflow-visible">
        {dentalProceduresLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <DentalChart
            companyId={companyId || ''}
            patientId={patientId}
            professionals={professionals}
            procedimentos={dentalProcedures || []}
            orcamentos={orcamentos}
            onNavigateToOrcamentos={(orcamentoId) => {
              if (onNavigateToOrcamentos) {
                onNavigateToOrcamentos(orcamentoId);
              }
            }}
            onDeleteProcedimento={async (id) => {
              if (onDeleteProcedimento) {
                try {
                  await onDeleteProcedimento(id);
                } catch (error) {
                  console.error('Erro ao excluir procedimento:', error);
                  showError('Erro ao excluir procedimento. Por favor, tente novamente.');
                }
              }
            }}
            onAddProcedimento={async (procedimento) => {
              if (onAddProcedimento) {
                try {
                  await onAddProcedimento(procedimento);
                  showSuccess('Procedimento adicionado com sucesso!');
                } catch (error) {
                  console.error('Erro ao adicionar procedimento:', error);
                  showError('Erro ao adicionar procedimento. Tente novamente.');
                  throw error;
                }
              }
            }}
            onEditProcedimento={async (id, procedimento) => {
              if (onEditProcedimento) {
                try {
                  await onEditProcedimento(id, procedimento);
                  showSuccess('Procedimento atualizado com sucesso!');
                } catch (error) {
                  console.error('Erro ao atualizar procedimento:', error);
                  showError('Erro ao atualizar procedimento. Tente novamente.');
                  throw error;
                }
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

