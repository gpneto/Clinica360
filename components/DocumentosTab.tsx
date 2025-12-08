'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Pill, FileCheck, Download, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';
import { DocumentModal } from './DocumentModal';
import { generateReceitaPDF, generateAtestadoPDF } from './DocumentPDFGenerator';
import type { Receita, Atestado, Professional, Company, Patient } from '@/types';
import { useCompany } from '@/hooks/useFirestore';

interface DocumentosTabProps {
  companyId: string;
  patientId: string;
  company: Company | null;
  patient: Patient | null;
  professionals: Professional[];
}

export function DocumentosTab({ companyId, patientId, company: companyProp, patient, professionals }: DocumentosTabProps) {
  const { company: companyFromHook } = useCompany(companyId);
  const company = companyProp || companyFromHook;
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentType, setDocumentType] = useState<'receita' | 'atestado' | null>(null);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [generatingReceitaId, setGeneratingReceitaId] = useState<string | null>(null);
  const [generatingAtestadoId, setGeneratingAtestadoId] = useState<string | null>(null);

  // Carregar receitas
  useEffect(() => {
    if (!companyId || !patientId) return;

    const receitasQuery = query(
      collection(db, `companies/${companyId}/patients/${patientId}/receitas`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeReceitas = onSnapshot(
      receitasQuery,
      (snapshot) => {
        const receitasData: Receita[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Converter createdAt de forma segura
          let createdAt: Date;
          if (data.createdAt) {
            // Verificar se é um Timestamp do Firestore
            if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAt = data.createdAt;
            } else if (typeof data.createdAt === 'number') {
              // Timestamp em milissegundos
              createdAt = new Date(data.createdAt);
            } else if (typeof data.createdAt === 'string') {
              const date = new Date(data.createdAt);
              createdAt = isNaN(date.getTime()) ? new Date() : date;
            } else if (data.createdAt.seconds) {
              // Timestamp com propriedade seconds
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else {
              createdAt = new Date();
            }
          } else {
            // Se não houver createdAt, usar updatedAt ou data atual
            if (data.updatedAt) {
              if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
                createdAt = data.updatedAt.toDate();
              } else if (data.updatedAt instanceof Timestamp) {
                createdAt = data.updatedAt.toDate();
              } else if (data.updatedAt instanceof Date) {
                createdAt = data.updatedAt;
              } else {
                createdAt = new Date();
              }
            } else {
              createdAt = new Date();
            }
          }
          
          // Converter updatedAt de forma segura
          let updatedAt: Date;
          if (data.updatedAt?.toDate) {
            updatedAt = data.updatedAt.toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedAt = data.updatedAt;
          } else if (data.updatedAt) {
            const date = new Date(data.updatedAt);
            updatedAt = isNaN(date.getTime()) ? createdAt : date;
          } else {
            updatedAt = createdAt;
          }
          
          receitasData.push({
            id: doc.id,
            ...data,
            createdAt,
            updatedAt,
          } as Receita);
        });
        setReceitas(receitasData);
      },
      (error) => {
        console.error('Erro ao carregar receitas:', error);
        showError('Erro ao carregar receitas');
      }
    );

    return () => unsubscribeReceitas();
  }, [companyId, patientId]);

  // Carregar atestados
  useEffect(() => {
    if (!companyId || !patientId) return;

    const atestadosQuery = query(
      collection(db, `companies/${companyId}/patients/${patientId}/atestados`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAtestados = onSnapshot(
      atestadosQuery,
      (snapshot) => {
        const atestadosData: Atestado[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Converter createdAt de forma segura
          let createdAt: Date;
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (data.createdAt) {
            const date = new Date(data.createdAt);
            createdAt = isNaN(date.getTime()) ? new Date() : date;
          } else {
            createdAt = new Date();
          }
          
          // Converter updatedAt de forma segura
          let updatedAt: Date;
          if (data.updatedAt?.toDate) {
            updatedAt = data.updatedAt.toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedAt = data.updatedAt;
          } else if (data.updatedAt) {
            const date = new Date(data.updatedAt);
            updatedAt = isNaN(date.getTime()) ? createdAt : date;
          } else {
            updatedAt = createdAt;
          }
          
          atestadosData.push({
            id: doc.id,
            ...data,
            createdAt,
            updatedAt,
          } as Atestado);
        });
        setAtestados(atestadosData);
      },
      (error) => {
        console.error('Erro ao carregar atestados:', error);
        showError('Erro ao carregar atestados');
      }
    );

    return () => unsubscribeAtestados();
  }, [companyId, patientId]);

  const handleOpenModal = (type: 'receita' | 'atestado') => {
    setDocumentType(type);
    setShowDocumentModal(true);
  };

  const handleCloseModal = () => {
    setShowDocumentModal(false);
    setDocumentType(null);
  };

  const handleGenerateReceitaPDF = async (receita: Receita) => {
    try {
      setGeneratingReceitaId(receita.id);
      const professional = professionals.find((p) => p.id === receita.professionalId);
      if (!professional) {
        showError('Profissional não encontrado');
        setGeneratingReceitaId(null);
        return;
      }

      await generateReceitaPDF(
        company || null,
        patient,
        {
          id: professional.id,
          apelido: professional.apelido,
          signatureImageUrl: professional.signatureImageUrl,
          cro: professional.cro,
          croEstado: professional.croEstado,
        },
        receita.medicamentos,
        receita.observacoes,
        companyId
      );
    } catch (error) {
      console.error('Erro ao gerar PDF da receita:', error);
      showError('Erro ao gerar PDF da receita');
    } finally {
      setGeneratingReceitaId(null);
    }
  };

  const handleGenerateAtestadoPDF = async (atestado: Atestado) => {
    try {
      setGeneratingAtestadoId(atestado.id);
      const professional = professionals.find((p) => p.id === atestado.professionalId);
      if (!professional) {
        showError('Profissional não encontrado');
        setGeneratingAtestadoId(null);
        return;
      }

      await generateAtestadoPDF(
        company || null,
        patient,
        {
          id: professional.id,
          apelido: professional.apelido,
          signatureImageUrl: professional.signatureImageUrl,
          cro: professional.cro,
          croEstado: professional.croEstado,
        },
        atestado.texto,
        atestado.diasAfastamento,
        atestado.horasAfastamento,
        atestado.tipoAfastamento,
        atestado.cid,
        atestado.horaInicio,
        atestado.horaFim,
        companyId
      );
    } catch (error) {
      console.error('Erro ao gerar PDF do atestado:', error);
      showError('Erro ao gerar PDF do atestado');
    } finally {
      setGeneratingAtestadoId(null);
    }
  };

  const handleDeleteReceita = async (receitaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;

    try {
      await deleteDoc(doc(db, `companies/${companyId}/patients/${patientId}/receitas`, receitaId));
      showSuccess('Receita excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir receita:', error);
      showError('Erro ao excluir receita');
    }
  };

  const handleDeleteAtestado = async (atestadoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este atestado?')) return;

    try {
      await deleteDoc(doc(db, `companies/${companyId}/patients/${patientId}/atestados`, atestadoId));
      showSuccess('Atestado excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir atestado:', error);
      showError('Erro ao excluir atestado');
    }
  };

  return (
    <>
      <Card className="bg-white shadow-lg border-0">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Documentos</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie receitas e atestados do paciente
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenModal('receita')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
            <Button
              onClick={() => handleOpenModal('atestado')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Atestado
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Receitas */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Pill className="w-5 h-5 text-green-600" />
              Receitas ({receitas.length})
            </h3>
            {receitas.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma receita cadastrada</p>
            ) : (
              <div className="space-y-3">
                {receitas.map((receita) => {
                  const professional = professionals.find((p) => p.id === receita.professionalId);
                  return (
                    <Card key={receita.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Receita
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {format(receita.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {receita.medicamentos.length} medicamento(s)
                            </p>
                            {professional && (
                              <p className="text-xs text-gray-500">
                                Prescrito por: {professional.apelido}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateReceitaPDF(receita)}
                              disabled={generatingReceitaId === receita.id}
                            >
                              {generatingReceitaId === receita.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReceita(receita.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Atestados */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Atestados ({atestados.length})
            </h3>
            {atestados.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum atestado cadastrado</p>
            ) : (
              <div className="space-y-3">
                {atestados.map((atestado) => {
                  const professional = professionals.find((p) => p.id === atestado.professionalId);
                  return (
                    <Card key={atestado.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Atestado
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {format(atestado.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mb-1 line-clamp-2">
                              {atestado.texto}
                            </p>
                            {professional && (
                              <p className="text-xs text-gray-500">
                                Emitido por: {professional.apelido}
                              </p>
                            )}
                            {atestado.diasAfastamento && (
                              <p className="text-xs text-gray-500">
                                Afastamento: {atestado.diasAfastamento} dia(s)
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateAtestadoPDF(atestado)}
                              disabled={generatingAtestadoId === atestado.id}
                            >
                              {generatingAtestadoId === atestado.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAtestado(atestado.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showDocumentModal && documentType && (
        <DocumentModal
          isOpen={showDocumentModal}
          onClose={handleCloseModal}
          type={documentType}
          companyId={companyId}
          patientId={patientId}
          patient={patient}
          professionals={professionals}
          company={company}
        />
      )}
    </>
  );
}

