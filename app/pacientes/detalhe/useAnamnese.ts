import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { showError, showSuccess } from '@/components/ui/toast';
import { generateAnamnesePDF } from './DentalChart';
import type { Company, Patient } from '@/types';

export function useAnamnese(companyId: string | null | undefined, patientId: string | null | undefined, company: Company | null, patient: Patient | null) {
  const [anamneseModelos, setAnamneseModelos] = useState<any[]>([]);
  const [anamneses, setAnamneses] = useState<any[]>([]);
  const [loadingAnamneses, setLoadingAnamneses] = useState(false);
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [selectedDentistaId, setSelectedDentistaId] = useState('');
  const [numeroCRO, setNumeroCRO] = useState('');
  const [estadoCRO, setEstadoCRO] = useState('');
  const [enviarParaPaciente, setEnviarParaPaciente] = useState(false);
  const [viewingAnamnese, setViewingAnamnese] = useState<any | null>(null);
  const [editingAnamnese, setEditingAnamnese] = useState<any | null>(null);
  const [modeloCompleto, setModeloCompleto] = useState<any | null>(null);
  const [showAnamneseModal, setShowAnamneseModal] = useState(false);
  const [sendAnamneseModal, setSendAnamneseModal] = useState<{ anamnese: any; link: string } | null>(null);
  const [copiedAnamneseLink, setCopiedAnamneseLink] = useState(false);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [alertasAnamnese, setAlertasAnamnese] = useState<Array<{ anamnese: any; alertas: Array<{ secao: string; pergunta: string; resposta: string }> }>>([]);
  const [totalAlertas, setTotalAlertas] = useState(0);

  // Carregar modelos de anamnese
  useEffect(() => {
    if (!companyId) return;
    
    const q = query(collection(db, `companies/${companyId}/anamneseModelos`), orderBy('nome'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const modelos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnamneseModelos(modelos);
    });
    
    return () => unsubscribe();
  }, [companyId]);

  // Carregar anamneses do paciente
  useEffect(() => {
    if (!companyId || !patientId) return;
    
    setLoadingAnamneses(true);
    const q = query(
      collection(db, `companies/${companyId}/patients/${patientId}/anamneses`),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const anamnesesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Converter Timestamps para Date
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt ? new Date(data.updatedAt) : null),
          signedAt: data.signedAt?.toDate ? data.signedAt.toDate() : (data.signedAt instanceof Date ? data.signedAt : data.signedAt ? new Date(data.signedAt) : null),
        };
      });
      setAnamneses(anamnesesData);
      setLoadingAnamneses(false);
    }, (error) => {
      console.error('Erro ao carregar anamneses:', error);
      setLoadingAnamneses(false);
    });
    
    return () => unsubscribe();
  }, [companyId, patientId]);

  // Calcular alertas
  useEffect(() => {
    if (!anamneses.length || !anamneseModelos.length) {
      setAlertasAnamnese([]);
      setTotalAlertas(0);
      return;
    }

    const alertas: Array<{ anamnese: any; alertas: Array<{ secao: string; pergunta: string; resposta: string }> }> = [];

    anamneses.forEach((anamnese) => {
      const modelo = anamneseModelos.find((m: any) => m.id === anamnese.modeloId);
      if (!modelo || !modelo.secoes) return;

      const alertasAnamnese: Array<{ secao: string; pergunta: string; resposta: string }> = [];

      modelo.secoes.forEach((secao: any) => {
        if (!secao.perguntas) return;

        secao.perguntas.forEach((pergunta: any) => {
          if (!pergunta.geraAlerta) return;

          const respostaKey = `${secao.id}-${pergunta.id}`;
          const resposta = anamnese.respostas?.[respostaKey];

          if (!resposta) return;

          let deveAlertar = false;
          let textoResposta = '';

          if (pergunta.tipoResposta === 'sim_nao' && resposta.resposta === 'sim') {
            deveAlertar = true;
            textoResposta = 'Sim';
          } else if (pergunta.tipoResposta === 'texto' && resposta.texto?.trim()) {
            deveAlertar = true;
            textoResposta = resposta.texto;
          } else if (pergunta.tipoResposta === 'sim_nao_texto') {
            if (resposta.resposta === 'sim') {
              deveAlertar = true;
              textoResposta = resposta.texto ? `Sim - ${resposta.texto}` : 'Sim';
            } else if (resposta.texto?.trim()) {
              deveAlertar = true;
              textoResposta = resposta.texto;
            }
          }

          if (deveAlertar) {
            alertasAnamnese.push({
              secao: secao.nome,
              pergunta: pergunta.pergunta,
              resposta: textoResposta,
            });
          }
        });
      });

      if (alertasAnamnese.length > 0) {
        alertas.push({ anamnese, alertas: alertasAnamnese });
      }
    });

    setAlertasAnamnese(alertas);
    setTotalAlertas(alertas.reduce((acc, item) => acc + item.alertas.length, 0));
  }, [anamneses, anamneseModelos]);

  const handleCriarAnamnese = useCallback(async () => {
    if (!companyId || !patientId) return;
    
    if (!selectedModeloId) {
      showError('Selecione um modelo de anamnese');
      return;
    }
    
    if (!selectedDentistaId) {
      showError('Selecione o responsável');
      return;
    }
    
    if (!numeroCRO.trim()) {
      showError('Digite o número do CRO');
      return;
    }
    
    if (!estadoCRO) {
      showError('Selecione o estado do CRO');
      return;
    }
    
    try {
      const modeloSelecionado = anamneseModelos.find((m: any) => m.id === selectedModeloId);
      
      let signatureToken = null;
      let signatureLink = null;
      
      if (enviarParaPaciente) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        signatureToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://webagendamentos.web.app';
        signatureLink = `${baseUrl}/assinatura-anamnese/?token=${signatureToken}&companyId=${companyId}&patientId=${patientId}`;
      }
      
      const anamneseData: any = {
        modeloId: selectedModeloId,
        modeloNome: modeloSelecionado?.nome || '',
        dentistaId: selectedDentistaId,
        numeroCRO: numeroCRO.trim(),
        estadoCRO: estadoCRO,
        enviarParaPaciente: enviarParaPaciente,
        status: enviarParaPaciente ? 'pendente' : 'rascunho',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      if (enviarParaPaciente && signatureToken && signatureLink) {
        anamneseData.signatureToken = signatureToken;
        anamneseData.signatureLink = signatureLink;
        anamneseData.respostas = {};
      }
      
      const docRef = await addDoc(collection(db, `companies/${companyId}/patients/${patientId}/anamneses`), anamneseData);
      
      if (enviarParaPaciente && signatureLink) {
        setSendAnamneseModal({ anamnese: { id: docRef.id, ...anamneseData }, link: signatureLink });
        setCopiedAnamneseLink(false);
      } else {
        showSuccess('Anamnese criada com sucesso!');
      }
      
      setShowAnamneseModal(false);
      setSelectedModeloId('');
      setSelectedDentistaId('');
      setNumeroCRO('');
      setEstadoCRO('');
      setEnviarParaPaciente(false);
    } catch (error) {
      console.error('Erro ao criar anamnese:', error);
      showError('Erro ao criar anamnese. Tente novamente.');
    }
  }, [companyId, patientId, selectedModeloId, selectedDentistaId, numeroCRO, estadoCRO, enviarParaPaciente, anamneseModelos]);

  const handleVerAnamnese = useCallback(async (anamnese: any) => {
    if (!companyId) return;
    
    try {
      const modeloDoc = doc(db, `companies/${companyId}/anamneseModelos/${anamnese.modeloId}`);
      const modeloSnap = await getDoc(modeloDoc);
      
      if (modeloSnap.exists()) {
        const modeloData = modeloSnap.data();
        setModeloCompleto({
          id: modeloSnap.id,
          ...modeloData,
          secoes: (modeloData.secoes || []).map((sec: any) => ({
            ...sec,
            perguntas: (sec.perguntas || []).map((p: any) => ({ ...p }))
          }))
        });
      }
      
      setViewingAnamnese(anamnese);
    } catch (error) {
      console.error('Erro ao carregar modelo:', error);
      showError('Erro ao carregar anamnese.');
    }
  }, [companyId]);

  const handleEditarAnamnese = useCallback(async (anamnese: any) => {
    if (!companyId) return;
    
    try {
      const modeloDoc = doc(db, `companies/${companyId}/anamneseModelos/${anamnese.modeloId}`);
      const modeloSnap = await getDoc(modeloDoc);
      
      if (modeloSnap.exists()) {
        const modeloData = modeloSnap.data();
        const modeloCompletoData = {
          id: modeloSnap.id,
          ...modeloData,
          secoes: (modeloData.secoes || []).map((sec: any) => ({
            ...sec,
            perguntas: (sec.perguntas || []).map((p: any) => ({ ...p }))
          }))
        };
        
        const respostas = anamnese.respostas || {};
        
        setModeloCompleto(modeloCompletoData);
        setEditingAnamnese({ ...anamnese, respostas });
      } else {
        showError('Modelo de anamnese não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar modelo:', error);
      showError('Erro ao carregar anamnese para edição.');
    }
  }, [companyId]);

  const atualizarResposta = useCallback((secaoId: string, perguntaId: string, resposta: any) => {
    if (!editingAnamnese) return;
    
    const respostas = editingAnamnese.respostas || {};
    const key = `${secaoId}-${perguntaId}`;
    
    setEditingAnamnese({
      ...editingAnamnese,
      respostas: {
        ...respostas,
        [key]: resposta
      }
    });
  }, [editingAnamnese]);

  const handleSalvarRespostasAnamnese = useCallback(async () => {
    if (!companyId || !patientId || !editingAnamnese) return;
    
    try {
      await updateDoc(doc(db, `companies/${companyId}/patients/${patientId}/anamneses/${editingAnamnese.id}`), {
        respostas: editingAnamnese.respostas || {},
        status: 'preenchida',
        updatedAt: Timestamp.now()
      });
      
      showSuccess('Respostas da anamnese salvas com sucesso!');
      setEditingAnamnese(null);
      setModeloCompleto(null);
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      showError('Erro ao salvar respostas. Tente novamente.');
    }
  }, [companyId, patientId, editingAnamnese]);

  const handleDownloadAnamnesePDF = useCallback(async (anamnese: any) => {
    if (!companyId || !patientId || !anamnese || !company || !patient) {
      showError('Dados da anamnese não encontrados');
      return;
    }

    try {
      const modeloDoc = doc(db, `companies/${companyId}/anamneseModelos/${anamnese.modeloId}`);
      const modeloSnap = await getDoc(modeloDoc);
      
      if (!modeloSnap.exists()) {
        showError('Modelo de anamnese não encontrado');
        return;
      }

      const modeloData = modeloSnap.data();
      const modeloCompletoData = {
        id: modeloSnap.id,
        nome: modeloData.nome || '',
        ...modeloData,
        secoes: (modeloData.secoes || []).map((sec: any) => ({
          ...sec,
          perguntas: (sec.perguntas || []).map((p: any) => ({ ...p }))
        }))
      };

      let signatureBase64: string | null = null;
      if (anamnese.signatureImageUrl) {
        try {
          const urlObj = new URL(anamnese.signatureImageUrl);
          let pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            
            const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
            const result = await getSignatureImageBase64({ storagePath });
            const data = result.data as { base64: string };
            
            if (data && data.base64) {
              signatureBase64 = data.base64;
            }
          }
        } catch (cloudFunctionError) {
          console.warn('Erro ao obter imagem via Cloud Function:', cloudFunctionError);
          try {
            const imgElement = document.querySelector(`img[src="${anamnese.signatureImageUrl}"]`) as HTMLImageElement;
            if (imgElement && imgElement.complete) {
              const canvas = document.createElement('canvas');
              canvas.width = imgElement.naturalWidth || imgElement.width;
              canvas.height = imgElement.naturalHeight || imgElement.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(imgElement, 0, 0);
                signatureBase64 = canvas.toDataURL('image/png');
              }
            }
          } catch (canvasError) {
            console.warn('Erro ao converter imagem via canvas:', canvasError);
          }
        }
      }

      let signedAtDate: Date | null = null;
      if (anamnese.signedAt) {
        if (anamnese.signedAt instanceof Date) {
          signedAtDate = anamnese.signedAt;
        } else if (typeof anamnese.signedAt === 'string') {
          const date = new Date(anamnese.signedAt);
          signedAtDate = !isNaN(date.getTime()) ? date : null;
        } else if (anamnese.signedAt.toDate) {
          signedAtDate = anamnese.signedAt.toDate();
        } else if (anamnese.signedAt.seconds) {
          signedAtDate = new Date(anamnese.signedAt.seconds * 1000);
        }
      }

      await generateAnamnesePDF(
        company,
        patient,
        modeloCompletoData,
        anamnese.respostas || {},
        signatureBase64 || anamnese.signatureImageUrl,
        anamnese.signedBy,
        signedAtDate
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  }, [companyId, patientId, company, patient]);

  const handleSendAnamnese = useCallback(async (anamnese: any) => {
    if (!companyId || !patientId || !anamnese) {
      showError('Dados da anamnese não encontrados');
      return;
    }

    try {
      let token = anamnese.signatureToken;
      if (!token) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://webagendamentos.web.app';
      const signatureLink = `${baseUrl}/assinatura-anamnese/?token=${token}&companyId=${companyId}&patientId=${patientId}`;
      
      if (!anamnese.signatureToken || anamnese.signatureLink !== signatureLink) {
        await updateDoc(doc(db, `companies/${companyId}/patients/${patientId}/anamneses/${anamnese.id}`), {
          signatureToken: token,
          signatureLink,
          updatedAt: Timestamp.now()
        });
      }
      
      setSendAnamneseModal({ anamnese: { ...anamnese, signatureToken: token, signatureLink }, link: signatureLink });
      setCopiedAnamneseLink(false);
    } catch (error: any) {
      console.error('Erro ao gerar link de assinatura:', error);
      showError('Erro ao gerar link de assinatura. Por favor, tente novamente.');
    }
  }, [companyId, patientId]);

  const handleCopyAnamneseLink = useCallback(async () => {
    if (!sendAnamneseModal) return;
    
    try {
      await navigator.clipboard.writeText(sendAnamneseModal.link);
      setCopiedAnamneseLink(true);
      showSuccess('Link copiado para a área de transferência!');
      setTimeout(() => setCopiedAnamneseLink(false), 2000);
    } catch (error) {
      showError('Erro ao copiar link. Por favor, tente novamente.');
    }
  }, [sendAnamneseModal]);

  const handleSendAnamneseViaSystem = useCallback(async () => {
    if (!sendAnamneseModal || !patient) return;

    try {
      const message = `Olá ${patient.nome}! Você recebeu uma anamnese para preenchimento e assinatura. Acesse o link: ${sendAnamneseModal.link}`;
      
      const callable = httpsCallable(functions, 'sendManualWhatsappMessage');
      await callable({
        companyId,
        patientId,
        phone: patient.telefoneE164,
        message,
      });
      
      showSuccess('Link enviado com sucesso!');
      setSendAnamneseModal(null);
    } catch (error: any) {
      console.error('Erro ao enviar link:', error);
      const message =
        error?.message ||
        error?.data?.message ||
        'Não foi possível enviar o link. Verifique a conexão e tente novamente.';
      showError(message);
    }
  }, [sendAnamneseModal, patient, companyId, patientId]);

  const handleDeleteAnamnese = useCallback(async (anamnese: any) => {
    if (!companyId || !patientId || !anamnese?.id) {
      showError('Dados da anamnese não encontrados');
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir a anamnese "${anamnese.modeloNome || 'Anamnese'}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, `companies/${companyId}/patients/${patientId}/anamneses/${anamnese.id}`));
      showSuccess('Anamnese excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir anamnese:', error);
      showError('Erro ao excluir anamnese. Tente novamente.');
    }
  }, [companyId, patientId]);

  return {
    // Estados
    anamneseModelos,
    anamneses,
    loadingAnamneses,
    selectedModeloId,
    selectedDentistaId,
    numeroCRO,
    estadoCRO,
    enviarParaPaciente,
    viewingAnamnese,
    editingAnamnese,
    modeloCompleto,
    showAnamneseModal,
    sendAnamneseModal,
    copiedAnamneseLink,
    showAlertasModal,
    alertasAnamnese,
    totalAlertas,
    
    // Setters
    setSelectedModeloId,
    setSelectedDentistaId,
    setNumeroCRO,
    setEstadoCRO,
    setEnviarParaPaciente,
    setViewingAnamnese,
    setEditingAnamnese,
    setModeloCompleto,
    setShowAnamneseModal,
    setSendAnamneseModal,
    setCopiedAnamneseLink,
    setShowAlertasModal,
    
    // Handlers
    handleCriarAnamnese,
    handleVerAnamnese,
    handleEditarAnamnese,
    atualizarResposta,
    handleSalvarRespostasAnamnese,
    handleDownloadAnamnesePDF,
    handleSendAnamnese,
    handleCopyAnamneseLink,
    handleSendAnamneseViaSystem,
    handleDeleteAnamnese,
  };
}

