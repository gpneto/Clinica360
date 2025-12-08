'use client';

import { useState, useEffect } from 'react';
import { X, Eye, Edit, Plus, AlertTriangle, CheckCircle2, Clock3, FileText, Send, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { Professional } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { cn, getGradientColors } from '@/lib/utils';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface AnamneseModalsProps {
  // Estados dos modais
  viewingAnamnese: any | null;
  editingAnamnese: any | null;
  showAnamneseModal: boolean;
  sendAnamneseModal: { anamnese: any; link: string } | null;
  showAlertasModal: boolean;
  modeloCompleto: any | null;
  
  // Estados do formulário
  anamneseModelos: any[];
  selectedModeloId: string;
  selectedDentistaId: string;
  numeroCRO: string;
  estadoCRO: string;
  enviarParaPaciente: boolean;
  copiedAnamneseLink: boolean;
  alertasAnamnese: Array<{ anamnese: any; alertas: Array<{ secao: string; pergunta: string; resposta: string }> }>;
  totalAlertas: number;
  
  // Dados
  professionals: Professional[];
  patient: any;
  companyId: string | null | undefined;
  patientId: string | null | undefined;
  singularTitle: string | undefined;
  
  // Handlers
  onCloseViewing: () => void;
  onCloseEditing: () => void;
  onCloseCreate: () => void;
  onCloseSend: () => void;
  onCloseAlertas: () => void;
  onModeloChange: (id: string) => void;
  onDentistaChange: (id: string) => void;
  onNumeroCROChange: (value: string) => void;
  onEstadoCROChange: (value: string) => void;
  onEnviarParaPacienteChange: (value: boolean) => void;
  onAtualizarResposta: (secaoId: string, perguntaId: string, resposta: any) => void;
  onSalvarRespostas: () => void;
  onCriarAnamnese: () => void;
  onCopyLink: () => void;
  onSendViaSystem: () => void;
}

export function AnamneseModals({
  viewingAnamnese,
  editingAnamnese,
  showAnamneseModal,
  sendAnamneseModal,
  showAlertasModal,
  modeloCompleto,
  anamneseModelos,
  selectedModeloId,
  selectedDentistaId,
  numeroCRO,
  estadoCRO,
  enviarParaPaciente,
  copiedAnamneseLink,
  alertasAnamnese,
  totalAlertas,
  professionals,
  patient,
  companyId,
  patientId,
  singularTitle,
  onCloseViewing,
  onCloseEditing,
  onCloseCreate,
  onCloseSend,
  onCloseAlertas,
  onModeloChange,
  onDentistaChange,
  onNumeroCROChange,
  onEstadoCROChange,
  onEnviarParaPacienteChange,
  onAtualizarResposta,
  onSalvarRespostas,
  onCriarAnamnese,
  onCopyLink,
  onSendViaSystem,
}: AnamneseModalsProps) {
  const { themePreference, customColor, customColor2 } = useAuth();
  
  // Variáveis de tema
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom' && customColor;
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

  return (
    <>
      {/* Modal de Visualizar Anamnese */}
      {viewingAnamnese && modeloCompleto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-blue-600" />
                    Visualizar Anamnese
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{viewingAnamnese.modeloNome}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onCloseViewing}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações da Anamnese */}
              <Card className="border-2">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-lg">Informações da Anamnese</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Responsável:</span>
                      <p className="text-sm text-gray-900">
                        {professionals.find((p) => p.id === viewingAnamnese.dentistaId)?.apelido || 'Não encontrado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-700">CRO:</span>
                      <p className="text-sm text-gray-900">
                        {viewingAnamnese.numeroCRO} - {viewingAnamnese.estadoCRO}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          viewingAnamnese.status === 'pendente'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                            : viewingAnamnese.status === 'assinada'
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-50 text-gray-700 border-gray-300'
                        }
                      >
                        {viewingAnamnese.status === 'pendente'
                          ? 'Pendente'
                          : viewingAnamnese.status === 'assinada'
                          ? 'Assinada'
                          : 'Rascunho'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Criada em:</span>
                      <p className="text-sm text-gray-900">
                        {format(viewingAnamnese.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seções do Modelo */}
              {modeloCompleto.secoes && modeloCompleto.secoes.length > 0 && (
                <div className="space-y-4">
                  {modeloCompleto.secoes
                    .sort((a: any, b: any) => a.ordem - b.ordem)
                    .map((secao: any) => (
                      <Card key={secao.id} className="border-2">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {secao.nome}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          {secao.perguntas && secao.perguntas.length > 0 ? (
                            secao.perguntas
                              .sort((a: any, b: any) => a.ordem - b.ordem)
                              .map((pergunta: any, index: number) => {
                                const respostaKey = `${secao.id}-${pergunta.id}`;
                                const resposta = viewingAnamnese.respostas?.[respostaKey] || null;

                                return (
                                  <div key={pergunta.id} className="p-4 border rounded-lg bg-white space-y-3">
                                    <div className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 space-y-3">
                                        <div>
                                          <p className="font-semibold text-gray-900 mb-2">
                                            {pergunta.pergunta}
                                            {pergunta.geraAlerta && (
                                              <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-300">
                                                <span className="mr-1">⚠️</span>
                                                Gera Alerta
                                              </Badge>
                                            )}
                                          </p>
                                        </div>

                                        {/* Exibir Resposta */}
                                        {resposta ? (
                                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            {pergunta.tipoResposta === 'sim_nao' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">Resposta:</span>
                                                <Badge
                                                  variant="outline"
                                                  className={
                                                    resposta.resposta === 'sim'
                                                      ? 'bg-green-50 text-green-700 border-green-300'
                                                      : 'bg-red-50 text-red-700 border-red-300'
                                                  }
                                                >
                                                  {resposta.resposta === 'sim' ? 'Sim' : 'Não'}
                                                </Badge>
                                              </div>
                                            )}

                                            {pergunta.tipoResposta === 'texto' && (
                                              <div>
                                                <span className="text-sm font-medium text-gray-700 block mb-1">Resposta:</span>
                                                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                                  {resposta.texto || 'Não respondido'}
                                                </p>
                                              </div>
                                            )}

                                            {pergunta.tipoResposta === 'sim_nao_texto' && (
                                              <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-gray-700">Resposta:</span>
                                                  <Badge
                                                    variant="outline"
                                                    className={
                                                      resposta.resposta === 'sim'
                                                        ? 'bg-green-50 text-green-700 border-green-300'
                                                        : resposta.resposta === 'nao'
                                                        ? 'bg-red-50 text-red-700 border-red-300'
                                                        : 'bg-gray-50 text-gray-700 border-gray-300'
                                                    }
                                                  >
                                                    {resposta.resposta === 'sim' ? 'Sim' : resposta.resposta === 'nao' ? 'Não' : 'Não respondido'}
                                                  </Badge>
                                                </div>
                                                {resposta.texto && (
                                                  <div>
                                                    <span className="text-sm font-medium text-gray-700 block mb-1">Observações:</span>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{resposta.texto}</p>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <p className="text-sm text-gray-500 italic">Não respondido</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <p className="text-sm text-gray-500 italic">Nenhuma pergunta nesta seção</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={onCloseViewing}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preencher Anamnese */}
      {editingAnamnese && modeloCompleto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Edit className="w-6 h-6 text-blue-600" />
                    Preencher Anamnese
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{editingAnamnese.modeloNome}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onCloseEditing}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações da Anamnese */}
              <Card className="border-2">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-lg">Informações</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Responsável:</span>
                      <p className="text-gray-900">
                        {professionals.find((p) => p.id === editingAnamnese.dentistaId)?.apelido || 'Não encontrado'}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">CRO:</span>
                      <p className="text-gray-900">
                        {editingAnamnese.numeroCRO} - {editingAnamnese.estadoCRO}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          editingAnamnese.status === 'pendente'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                            : editingAnamnese.status === 'assinada'
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : editingAnamnese.status === 'preenchida'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-700 border-gray-300'
                        }
                      >
                        {editingAnamnese.status === 'pendente'
                          ? 'Pendente'
                          : editingAnamnese.status === 'assinada'
                          ? 'Assinada'
                          : editingAnamnese.status === 'preenchida'
                          ? 'Preenchida'
                          : 'Rascunho'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seções com Perguntas para Preencher */}
              {modeloCompleto.secoes && modeloCompleto.secoes.length > 0 && (
                <div className="space-y-4">
                  {modeloCompleto.secoes
                    .sort((a: any, b: any) => a.ordem - b.ordem)
                    .map((secao: any) => (
                      <Card key={secao.id} className="border-2">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {secao.nome}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          {secao.perguntas && secao.perguntas.length > 0 ? (
                            secao.perguntas
                              .sort((a: any, b: any) => a.ordem - b.ordem)
                              .map((pergunta: any, index: number) => {
                                const respostaKey = `${secao.id}-${pergunta.id}`;
                                const respostaAtual = editingAnamnese.respostas?.[respostaKey] || {};

                                return (
                                  <div key={pergunta.id} className="p-4 border rounded-lg bg-white space-y-3">
                                    <div className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 space-y-3">
                                        <div>
                                          <p className="font-semibold text-gray-900 mb-2">
                                            {pergunta.pergunta}
                                            {pergunta.geraAlerta && (
                                              <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-300">
                                                <span className="mr-1">⚠️</span>
                                                Gera Alerta
                                              </Badge>
                                            )}
                                          </p>
                                        </div>

                                        {/* Campo de Resposta baseado no tipo */}
                                        {pergunta.tipoResposta === 'sim_nao' && (
                                          <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="radio"
                                                name={`resposta-${respostaKey}`}
                                                checked={respostaAtual.resposta === 'sim'}
                                                onChange={() => onAtualizarResposta(secao.id, pergunta.id, { resposta: 'sim' })}
                                                className="w-4 h-4 text-blue-600"
                                              />
                                              <span className="text-sm font-medium">Sim</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="radio"
                                                name={`resposta-${respostaKey}`}
                                                checked={respostaAtual.resposta === 'nao'}
                                                onChange={() => onAtualizarResposta(secao.id, pergunta.id, { resposta: 'nao' })}
                                                className="w-4 h-4 text-blue-600"
                                              />
                                              <span className="text-sm font-medium">Não</span>
                                            </label>
                                          </div>
                                        )}

                                        {pergunta.tipoResposta === 'texto' && (
                                          <Textarea
                                            value={respostaAtual.texto || ''}
                                            onChange={(e) => onAtualizarResposta(secao.id, pergunta.id, { texto: e.target.value })}
                                            placeholder="Digite sua resposta..."
                                            className="w-full min-h-[100px]"
                                          />
                                        )}

                                        {pergunta.tipoResposta === 'sim_nao_texto' && (
                                          <div className="space-y-3">
                                            <div className="flex items-center gap-4">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`resposta-${respostaKey}`}
                                                  checked={respostaAtual.resposta === 'sim'}
                                                  onChange={() => onAtualizarResposta(secao.id, pergunta.id, { ...respostaAtual, resposta: 'sim' })}
                                                  className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-sm font-medium">Sim</span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`resposta-${respostaKey}`}
                                                  checked={respostaAtual.resposta === 'nao'}
                                                  onChange={() => onAtualizarResposta(secao.id, pergunta.id, { ...respostaAtual, resposta: 'nao' })}
                                                  className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-sm font-medium">Não</span>
                                              </label>
                                            </div>
                                            <Textarea
                                              value={respostaAtual.texto || ''}
                                              onChange={(e) => onAtualizarResposta(secao.id, pergunta.id, { ...respostaAtual, texto: e.target.value })}
                                              placeholder="Adicione observações (opcional)..."
                                              className="w-full min-h-[100px]"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <p className="text-sm text-gray-500 italic">Nenhuma pergunta nesta seção</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={onCloseEditing}>
                Cancelar
              </Button>
              <Button onClick={onSalvarRespostas}>
                <span className="w-4 h-4 mr-2">💾</span>
                Salvar Respostas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envio de Link de Assinatura de Anamnese */}
      {sendAnamneseModal && (
        <div className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Enviar Link de Assinatura</h2>
              <button
                type="button"
                onClick={onCloseSend}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link de Assinatura</label>
                <div className="flex gap-2">
                  <Input type="text" value={sendAnamneseModal.link} readOnly className="flex-1 font-mono text-sm" />
                  <Button type="button" onClick={onCopyLink} variant="outline" className="flex-shrink-0">
                    {copiedAnamneseLink ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={onSendViaSystem}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  disabled={!patient?.telefoneE164}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar pelo Sistema
                </Button>
                <Button type="button" onClick={onCloseSend} variant="outline" className="flex-1">
                  Fechar
                </Button>
              </div>

              {!patient?.telefoneE164 && (
                <p className="text-xs text-gray-500 text-center">
                  {singularTitle} sem telefone cadastrado. Use a opção de copiar o link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alertas da Anamnese */}
      {showAlertasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                      Alertas da Anamnese
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <p className="text-sm font-semibold text-white">
                          {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} encontrado{totalAlertas !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseAlertas}
                  className="text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-gradient-to-b from-gray-50 to-white">
              {alertasAnamnese.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum alerta encontrado</h3>
                  <p className="text-gray-600">Todas as anamneses estão sem alertas.</p>
                </div>
              ) : (
                alertasAnamnese.map((item, index) => (
                  <Card
                    key={index}
                    className="border-2 border-orange-200/50 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-white overflow-hidden"
                  >
                    <CardHeader className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border-b border-orange-200/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                              {item.anamnese.modeloNome || 'Anamnese'}
                            </CardTitle>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-white/80 text-orange-700 border-orange-300 font-semibold shadow-sm"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {item.alertas.length} alerta{item.alertas.length !== 1 ? 's' : ''}
                              </Badge>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                Criada em {format(item.anamnese.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {item.alertas.map((alerta, alertaIndex) => (
                        <div
                          key={alertaIndex}
                          className="group relative p-5 bg-gradient-to-r from-orange-50/50 to-red-50/50 border-l-4 border-orange-500 rounded-r-xl hover:shadow-md transition-all duration-300 hover:from-orange-50 hover:to-red-50"
                        >
                          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="inline-block px-2.5 py-1 bg-orange-500/10 rounded-md mb-2">
                                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                                    {alerta.secao}
                                  </p>
                                </div>
                                <p className="font-bold text-gray-900 text-base leading-relaxed">{alerta.pergunta}</p>
                              </div>
                              <div className="bg-white rounded-xl p-4 border-2 border-orange-200/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Resposta</p>
                                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                      {alerta.resposta}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="p-6 sm:p-8 border-t bg-gradient-to-r from-gray-50 to-white flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCloseAlertas}
                className="px-6 rounded-xl border-2 hover:bg-gray-50 transition-all"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Anamnese */}
      {showAnamneseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-w-2xl w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-2 duration-300 overflow-hidden">
            {/* Header fixo com gradiente moderno */}
            <div 
              className={cn(
                "flex items-center justify-between px-6 py-6 md:p-7 md:pt-7 border-b flex-shrink-0 relative overflow-hidden",
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
                  "absolute inset-0",
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
                    "p-3 rounded-2xl shadow-lg transform transition-transform duration-300 hover:scale-105",
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
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 
                    className={cn(
                      "text-2xl md:text-3xl font-bold",
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
                    Adicionar Anamnese
                  </h2>
                  <p className="text-sm text-gray-600 mt-1.5 font-medium">
                    Preencha os dados da anamnese
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseCreate}
                className="p-2.5 rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md relative z-10"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-gray-50/80 to-white">
              <div className="space-y-6">
                {/* Modelo da Anamnese */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                    <span className="text-blue-600">📋</span>
                    Selecione o modelo da anamnese <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedModeloId}
                    onChange={(e) => onModeloChange(e.target.value)}
                    className={cn(
                      "w-full rounded-2xl border-2 p-4 text-base font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-white",
                      selectedModeloId
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900 shadow-lg shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-200/50"
                        : "border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md focus:border-blue-500 focus:ring-blue-500/20"
                    )}
                  >
                    <option value="">Selecione um modelo</option>
                    {anamneseModelos.length === 0 ? (
                      <option value="" disabled>
                        Nenhum modelo disponível
                      </option>
                    ) : (
                      anamneseModelos.map((modelo: any) => (
                        <option key={modelo.id} value={modelo.id}>
                          {modelo.nome} {!modelo.ativo && '(Inativo)'}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedModeloId && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <Check className="w-3 h-3" />
                      Modelo selecionado
                    </p>
                  )}
                  {anamneseModelos.length === 0 && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 font-medium">
                        Nenhum modelo de anamnese encontrado. Crie modelos em{' '}
                        <Link href="/configuracoes/modelos-anamnese" className="text-blue-600 hover:underline font-bold">
                          Configurações → Modelos de anamnese
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Responsável */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                    <span className="text-indigo-600">👤</span>
                    Responsável <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDentistaId}
                    onChange={(e) => onDentistaChange(e.target.value)}
                    className={cn(
                      "w-full rounded-2xl border-2 p-4 text-base font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-white",
                      selectedDentistaId
                        ? "border-indigo-500 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-900 shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/50"
                        : "border-gray-300 text-gray-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-md focus:border-indigo-500 focus:ring-indigo-500/20"
                    )}
                  >
                    <option value="">Selecione o responsável</option>
                    {professionals
                      .filter((p) => p.ativo)
                      .map((prof) => (
                        <option key={prof.id} value={prof.id}>
                          {prof.apelido}
                        </option>
                      ))}
                  </select>
                  {selectedDentistaId && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <Check className="w-3 h-3" />
                      Responsável selecionado
                    </p>
                  )}
                </div>

                {/* Grid para CRO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Número do CRO */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                      <span className="text-purple-600">🔢</span>
                      Número do CRO <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={numeroCRO}
                      onChange={(e) => onNumeroCROChange(e.target.value)}
                      placeholder="Ex: 12345"
                      className={cn(
                        "w-full rounded-2xl border-2 p-4 text-base font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2",
                        numeroCRO
                          ? "border-purple-500 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 text-gray-900 shadow-lg shadow-purple-100/50 hover:shadow-xl hover:shadow-purple-200/50 focus:border-purple-500 focus:ring-purple-500/20"
                          : "border-gray-300 text-gray-500 hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-md focus:border-purple-500 focus:ring-purple-500/20"
                      )}
                    />
                    {numeroCRO && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                        <Check className="w-3 h-3" />
                        CRO preenchido
                      </p>
                    )}
                  </div>

                  {/* Estado do CRO */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                      <span className="text-pink-600">📍</span>
                      Estado do CRO <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={estadoCRO}
                      onChange={(e) => onEstadoCROChange(e.target.value)}
                      className={cn(
                        "w-full rounded-2xl border-2 p-4 text-base font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-white",
                        estadoCRO
                          ? "border-pink-500 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 text-gray-900 shadow-lg shadow-pink-100/50 hover:shadow-xl hover:shadow-pink-200/50 focus:border-pink-500 focus:ring-pink-500/20"
                          : "border-gray-300 text-gray-500 hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-md focus:border-pink-500 focus:ring-pink-500/20"
                      )}
                    >
                      <option value="">Selecione o Estado</option>
                      {ESTADOS_BRASIL.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                    {estadoCRO && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                        <Check className="w-3 h-3" />
                        Estado selecionado
                      </p>
                    )}
                  </div>
                </div>

                {/* Checkbox de Envio */}
                <div className={cn(
                  "flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.01]",
                  enviarParaPaciente
                    ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-400 shadow-lg shadow-green-100/50"
                    : "bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50 border-gray-300 hover:border-green-300 hover:shadow-md"
                )}>
                  <input
                    type="checkbox"
                    id="enviarPaciente"
                    checked={enviarParaPaciente}
                    onChange={(e) => onEnviarParaPacienteChange(e.target.checked)}
                    className={cn(
                      "mt-1 w-5 h-5 rounded-lg focus:ring-2 focus:ring-offset-2 cursor-pointer transition-all duration-200 flex-shrink-0",
                      enviarParaPaciente
                        ? "text-green-600 border-green-500 focus:ring-green-500"
                        : "text-gray-300 border-gray-300 focus:ring-gray-400"
                    )}
                  />
                  <label htmlFor="enviarPaciente" className="text-sm text-gray-900 cursor-pointer flex-1">
                    <span className={cn(
                      "font-bold flex items-center gap-2",
                      enviarParaPaciente ? "text-green-700" : "text-gray-700"
                    )}>
                      <span className="text-lg">📤</span>
                      Enviar para o paciente preencher e assinar
                    </span>
                    {enviarParaPaciente && (
                      <p className="text-xs text-green-600 mt-1.5 font-medium">
                        O paciente receberá um link para preencher e assinar a anamnese digitalmente
                      </p>
                    )}
                  </label>
                </div>

                {/* Indicador de Progresso */}
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                      Progresso do Formulário
                    </span>
                    <span className="text-sm font-bold text-blue-900">
                      {[
                        selectedModeloId,
                        selectedDentistaId,
                        numeroCRO,
                        estadoCRO
                      ].filter(Boolean).length}/4 campos preenchidos
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        hasGradient && isCustom && gradientColors
                          ? ''
                          : hasGradient && isVibrant
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      )}
                      style={
                        hasGradient && isCustom && gradientColors
                          ? {
                              background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                              width: `${([selectedModeloId, selectedDentistaId, numeroCRO, estadoCRO].filter(Boolean).length / 4) * 100}%`,
                            }
                          : {
                              width: `${([selectedModeloId, selectedDentistaId, numeroCRO, estadoCRO].filter(Boolean).length / 4) * 100}%`,
                            }
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botões fixos no bottom */}
            <div className="flex gap-4 p-6 md:p-7 border-t-2 border-gray-100 bg-gradient-to-b from-white to-gray-50/50 flex-shrink-0 shadow-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={onCloseCreate}
                className="flex-1 h-14 md:h-12 text-base md:text-sm font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Cancelar
              </Button>
              <Button 
                type="button"
                onClick={onCriarAnamnese}
                className={cn(
                  "flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform flex items-center justify-center gap-2",
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'shadow-xl hover:shadow-2xl'
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                      : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                    : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                )}
                style={hasGradient && isCustom && gradientColors ? {
                  background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                  boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                } : undefined}
              >
                <Plus className="w-4 h-4" />
                Criar Anamnese
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

