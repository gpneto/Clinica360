'use client';

import { Plus, ClipboardList, Stethoscope, FileText, Eye, Edit, Download, Send, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TabProps } from './types';
import type { Professional, Company, Patient } from '@/types';
import { useAnamnese } from './useAnamnese';
import { AnamneseModals } from './AnamneseModals';

export interface AnamneseTabProps extends TabProps {
  professionals: Professional[];
  company: Company | null;
  patient: Patient | null;
}

export function AnamneseTab({
  professionals = [],
  company,
  patient,
  companyId,
  patientId,
  singularTitle,
}: AnamneseTabProps) {
  const anamnese = useAnamnese(companyId, patientId, company, patient);

  // Handler para quando o dentista é selecionado - preenche automaticamente CRO e Estado
  const handleDentistaChange = (dentistaId: string) => {
    anamnese.setSelectedDentistaId(dentistaId);
    
    // Buscar o profissional selecionado
    const profissional = professionals.find((p) => p.id === dentistaId);
    
    // Preencher automaticamente CRO e Estado se o profissional tiver esses dados
    if (profissional) {
      if (profissional.cro) {
        anamnese.setNumeroCRO(profissional.cro);
      }
      if (profissional.croEstado) {
        anamnese.setEstadoCRO(profissional.croEstado);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold text-gray-900">Anamneses</CardTitle>
              {anamnese.totalAlertas > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => anamnese.setShowAlertasModal(true)}
                  className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {anamnese.totalAlertas} Alerta{anamnese.totalAlertas !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
            <Button onClick={() => anamnese.setShowAnamneseModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Anamnese
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {anamnese.loadingAnamneses ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : anamnese.anamneses.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Nenhuma anamnese cadastrada ainda</p>
              <Button onClick={() => anamnese.setShowAnamneseModal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Anamnese
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {anamnese.anamneses.map((item) => {
                const dentista = professionals.find((p) => p.id === item.dentistaId);
                return (
                  <Card key={item.id} className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-900">
                            {item.modeloNome || 'Anamnese'}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Stethoscope className="w-4 h-4" />
                              Responsável: {dentista?.apelido || 'Não encontrado'}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              CRO: {item.numeroCRO} - {item.estadoCRO}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              item.status === 'pendente'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                : item.status === 'assinada'
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : 'bg-gray-50 text-gray-700 border-gray-300'
                            }
                          >
                            {item.status === 'pendente'
                              ? 'Pendente'
                              : item.status === 'assinada'
                              ? 'Assinada'
                              : 'Rascunho'}
                          </Badge>
                          {item.enviarParaPaciente && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              Enviada ao paciente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          Criada em {(() => {
                            if (!item.createdAt) return 'Data não disponível';
                            const date = item.createdAt instanceof Date 
                              ? item.createdAt 
                              : item.createdAt?.toDate 
                                ? item.createdAt.toDate() 
                                : new Date(item.createdAt);
                            return isNaN(date.getTime()) ? 'Data inválida' : format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                          })()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => anamnese.handleVerAnamnese(item)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => anamnese.handleEditarAnamnese(item)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Preencher
                          </Button>
                          {item.status === 'assinada' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => anamnese.handleDownloadAnamnesePDF(item)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Baixar PDF assinado"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => anamnese.handleSendAnamnese(item)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Enviar para assinatura"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Enviar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => anamnese.handleDeleteAnamnese(item)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir anamnese"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AnamneseModals
        viewingAnamnese={anamnese.viewingAnamnese}
        editingAnamnese={anamnese.editingAnamnese}
        showAnamneseModal={anamnese.showAnamneseModal}
        sendAnamneseModal={anamnese.sendAnamneseModal}
        showAlertasModal={anamnese.showAlertasModal}
        modeloCompleto={anamnese.modeloCompleto}
        anamneseModelos={anamnese.anamneseModelos}
        selectedModeloId={anamnese.selectedModeloId}
        selectedDentistaId={anamnese.selectedDentistaId}
        numeroCRO={anamnese.numeroCRO}
        estadoCRO={anamnese.estadoCRO}
        enviarParaPaciente={anamnese.enviarParaPaciente}
        copiedAnamneseLink={anamnese.copiedAnamneseLink}
        alertasAnamnese={anamnese.alertasAnamnese}
        totalAlertas={anamnese.totalAlertas}
        professionals={professionals}
        patient={patient}
        companyId={companyId}
        patientId={patientId}
        singularTitle={singularTitle}
        onCloseViewing={() => {
          anamnese.setViewingAnamnese(null);
          anamnese.setModeloCompleto(null);
        }}
        onCloseEditing={() => {
          anamnese.setEditingAnamnese(null);
          anamnese.setModeloCompleto(null);
        }}
        onCloseCreate={() => {
          anamnese.setShowAnamneseModal(false);
          anamnese.setSelectedModeloId('');
          anamnese.setSelectedDentistaId('');
          anamnese.setNumeroCRO('');
          anamnese.setEstadoCRO('');
          anamnese.setEnviarParaPaciente(false);
        }}
        onCloseSend={() => anamnese.setSendAnamneseModal(null)}
        onCloseAlertas={() => anamnese.setShowAlertasModal(false)}
        onModeloChange={anamnese.setSelectedModeloId}
        onDentistaChange={handleDentistaChange}
        onNumeroCROChange={anamnese.setNumeroCRO}
        onEstadoCROChange={anamnese.setEstadoCRO}
        onEnviarParaPacienteChange={anamnese.setEnviarParaPaciente}
        onAtualizarResposta={anamnese.atualizarResposta}
        onSalvarRespostas={anamnese.handleSalvarRespostasAnamnese}
        onCriarAnamnese={anamnese.handleCriarAnamnese}
        onCopyLink={anamnese.handleCopyAnamneseLink}
        onSendViaSystem={anamnese.handleSendAnamneseViaSystem}
      />
    </div>
  );
}

