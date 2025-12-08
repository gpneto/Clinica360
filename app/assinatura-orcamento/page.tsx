'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Loader2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { generateOrcamentoPDF } from '@/components/DentalChart';
import type { Orcamento, Company, Patient, FaceDente } from '@/types';

const formatCurrency = (centavos: number): string => {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
};

function AssinaturaOrcamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';
  const companyIdFromUrl = searchParams?.get('companyId') || null;
  const patientIdFromUrl = searchParams?.get('patientId') || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    // Evitar chamadas duplicadas para o mesmo token (especialmente em StrictMode)
    if (hasLoadedRef.current === token) {
      return;
    }
    hasLoadedRef.current = token;

    const loadOrcamento = async () => {
      try {
        // Buscar orçamento pelo token usando uma Cloud Function
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        
        const getOrcamentoByToken = httpsCallable(functions, 'getOrcamentoByToken');
        const result = await getOrcamentoByToken({ 
          token, 
          companyId: companyIdFromUrl,
          patientId: patientIdFromUrl 
        });
        
        const data = result.data as { orcamento: any; company: any; patient: any };
        
        if (!data || !data.orcamento) {
          throw new Error('Orçamento não encontrado');
        }

        // Log para depuração
        console.log('Dados recebidos da Cloud Function:', {
          signedAt: data.orcamento.signedAt,
          signedAtType: typeof data.orcamento.signedAt,
          signatureImageUrl: data.orcamento.signatureImageUrl,
          signedBy: data.orcamento.signedBy,
        });

        // Converter timestamps ISO string para Date
        let createdAt: Date;
        if (data.orcamento.createdAt) {
          const date = new Date(data.orcamento.createdAt);
          createdAt = !isNaN(date.getTime()) ? date : new Date();
        } else {
          createdAt = new Date();
        }

        let updatedAt: Date;
        if (data.orcamento.updatedAt) {
          const date = new Date(data.orcamento.updatedAt);
          updatedAt = !isNaN(date.getTime()) ? date : new Date();
        } else {
          updatedAt = new Date();
        }

        let signedAt: Date | undefined;
        // Verificar se signedAt existe e converter para Date (suporta diferentes formatos)
        if (data.orcamento.signedAt) {
          try {
            // Se for um Timestamp do Firestore
            if (data.orcamento.signedAt.toDate && typeof data.orcamento.signedAt.toDate === 'function') {
              signedAt = data.orcamento.signedAt.toDate();
            }
            // Se for um objeto com seconds (Timestamp convertido)
            else if (data.orcamento.signedAt.seconds && typeof data.orcamento.signedAt.seconds === 'number') {
              signedAt = new Date(data.orcamento.signedAt.seconds * 1000);
            }
            // Se já for uma Date
            else if (data.orcamento.signedAt instanceof Date) {
              signedAt = data.orcamento.signedAt;
            }
            // Se for uma string ISO
            else if (typeof data.orcamento.signedAt === 'string' && data.orcamento.signedAt !== 'null' && data.orcamento.signedAt !== '') {
              const date = new Date(data.orcamento.signedAt);
              if (!isNaN(date.getTime())) {
                signedAt = date;
              }
            }
            // Se for um número (timestamp em milissegundos ou segundos)
            else if (typeof data.orcamento.signedAt === 'number') {
              // Se for muito grande (provavelmente em milissegundos), usar direto
              // Se for pequeno (provavelmente em segundos), multiplicar por 1000
              const timestamp = data.orcamento.signedAt > 1000000000000 
                ? data.orcamento.signedAt 
                : data.orcamento.signedAt * 1000;
              signedAt = new Date(timestamp);
            }
          } catch (e) {
            console.warn('Erro ao converter signedAt:', e, data.orcamento.signedAt);
          }
        }

        // Extrair companyId e patientId da URL (query parameter), resposta ou do orçamento
        // Priorizar valores da URL, depois da resposta, depois do orçamento
        let extractedCompanyId: string | null = companyIdFromUrl || null;
        let extractedPatientId: string | null = patientIdFromUrl || null;
        
        // Se não tiver na URL, obter dos dados retornados pela Cloud Function
        if (!extractedCompanyId) {
          if ((data as any).companyId) {
            extractedCompanyId = (data as any).companyId;
          }
        }
        if (!extractedPatientId) {
          if ((data as any).patientId) {
            extractedPatientId = (data as any).patientId;
          }
        }

        const orcamentoData: Orcamento = {
          ...data.orcamento,
          createdAt,
          updatedAt,
          signedAt,
          signatureImageUrl: data.orcamento.signatureImageUrl || undefined,
          // Garantir que companyId e patientId estejam no orcamento
          companyId: extractedCompanyId || data.orcamento.companyId || '',
          patientId: extractedPatientId || data.orcamento.patientId || '',
        };

        // Se não tiver nos dados retornados, tentar do orcamento
        if (!extractedCompanyId && orcamentoData.companyId) {
          extractedCompanyId = orcamentoData.companyId;
        }
        if (!extractedPatientId && orcamentoData.patientId) {
          extractedPatientId = orcamentoData.patientId;
        }
        
        console.log('IDs extraídos:', {
          companyId: extractedCompanyId,
          patientId: extractedPatientId,
          fromUrl: {
            companyId: companyIdFromUrl,
            patientId: patientIdFromUrl
          },
          fromData: {
            companyId: (data as any).companyId,
            patientId: (data as any).patientId
          },
          fromOrcamento: {
            companyId: orcamentoData.companyId,
            patientId: orcamentoData.patientId
          }
        });
        
        setCompanyId(extractedCompanyId);
        setPatientId(extractedPatientId);

        // Verificar se já está assinado
        // Verificar tanto signedAt quanto signatureImageUrl para garantir
        const isAlreadySigned = orcamentoData.signedAt !== undefined && 
                                orcamentoData.signedAt !== null && 
                                !isNaN(orcamentoData.signedAt.getTime());
        
        console.log('Orçamento carregado:', {
          hasSignedAt: !!orcamentoData.signedAt,
          signedAt: orcamentoData.signedAt,
          signatureImageUrl: orcamentoData.signatureImageUrl,
          signatureImageUrlRaw: data.orcamento.signatureImageUrl,
          isAlreadySigned,
          fullOrcamento: orcamentoData
        });

        if (isAlreadySigned) {
          setSigned(true);
          setOrcamento(orcamentoData);
          setCompany(data.company);
          setPatient(data.patient);
          setHasSignature(!!orcamentoData.signatureImageUrl);
          setLoading(false);
          return;
        }

        setOrcamento(orcamentoData);
        setCompany(data.company);
        setPatient(data.patient);
        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao carregar orçamento:', err);
        setError(err.message || 'Erro ao carregar orçamento');
        setLoading(false);
      }
    };

    loadOrcamento();
  }, [token, companyIdFromUrl, patientIdFromUrl]);

  // Inicializar canvas
  useEffect(() => {
    if (canvasRef.current && !signed) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Obter tamanho visual do canvas
        const rect = canvas.getBoundingClientRect();
        
        // Usar escala muito maior para eliminar completamente a pixelização
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.max(6, dpr * 3); // Mínimo de 6x para qualidade máxima sem pixels visíveis
        
        // Ajustar tamanho interno do canvas (alta resolução)
        canvas.width = rect.width * scale;
        canvas.height = 200 * scale;
        
        // Ajustar tamanho CSS para manter tamanho visual
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = '200px';
        
        // NÃO escalar o contexto - vamos trabalhar diretamente com coordenadas de alta resolução
        // ctx.scale(scale, scale); // REMOVIDO
        
        // Configurar estilo da assinatura (cor azul caneta esferográfica)
        ctx.strokeStyle = '#0066CC'; // Azul médio como caneta esferográfica
        ctx.lineWidth = 2.2 * scale; // Linha fina como caneta, ajustada para escala (aumentada um pouco para suavizar)
        ctx.lineCap = 'round'; // Pontas redondas como caneta
        ctx.lineJoin = 'round'; // Junções arredondadas
        ctx.miterLimit = 10; // Limite maior para melhor suavização
        
        // Habilitar suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Configurar composição global para suavização extra
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        
        // Sem sombra para manter traço fino e natural
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        // Configurar fundo transparente
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [signed]);

  // Funções para desenhar no canvas
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calcular escala do canvas (tamanho interno / tamanho CSS)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Converter coordenadas do mouse/touch para coordenadas do canvas de alta resolução
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    setIsDrawing(true);
    
    // Obter escala atual do canvas
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    
    // Garantir configurações de alta qualidade (traço fino como caneta)
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2.2 * scale; // Linha fina como caneta (um pouco mais grossa para suavizar bordas)
    ctx.lineCap = 'round'; // Pontas redondas
    ctx.lineJoin = 'round'; // Junções arredondadas
    ctx.miterLimit = 10; // Limite maior para melhor suavização
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0; // Sem sombra para traço fino
    ctx.shadowColor = 'transparent';
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
    // Obter escala atual do canvas
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    
    // Garantir configurações de alta qualidade (traço fino como caneta)
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2.2 * scale; // Linha fina como caneta (um pouco mais grossa para suavizar bordas)
    ctx.lineCap = 'round'; // Pontas redondas
    ctx.lineJoin = 'round'; // Junções arredondadas
    ctx.miterLimit = 10; // Limite maior para melhor suavização
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0; // Sem sombra para traço fino
    ctx.shadowColor = 'transparent';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Reconfigurar estilo após limpar com escala correta (traço fino como caneta)
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      ctx.strokeStyle = '#0066CC';
      ctx.lineWidth = 2 * scale; // Linha fina como caneta (um pouco mais grossa para suavizar)
      ctx.lineCap = 'round'; // Pontas redondas
      ctx.lineJoin = 'round'; // Junções arredondadas
      ctx.miterLimit = 10; // Limite maior para melhor suavização
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0; // Sem sombra
      ctx.shadowColor = 'transparent';
      
      setHasSignature(false);
    }
  };

  // Converter canvas para blob e fazer upload
  const uploadSignature = async (): Promise<string | null> => {
    if (!canvasRef.current || !orcamento) {
      console.error('uploadSignature: canvas ou orcamento não disponível', {
        hasCanvas: !!canvasRef.current,
        hasOrcamento: !!orcamento,
        orcamento: orcamento
      });
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob>((resolve) => {
        // Usar qualidade máxima (1.0) e tipo PNG para melhor qualidade
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob());
        }, 'image/png', 1.0); // Qualidade máxima
      });

      if (!blob || blob.size === 0) {
        console.error('uploadSignature: blob vazio ou inválido', { blobSize: blob?.size });
        return null;
      }

      // Obter companyId e patientId do estado ou do orcamento
      let finalCompanyId = companyId || (orcamento as any).companyId;
      let finalPatientId = patientId || (orcamento as any).patientId;
      
      // Se ainda não tiver, tentar buscar através do token usando uma Cloud Function
      if (!finalCompanyId || !finalPatientId) {
        console.warn('uploadSignature: companyId ou patientId não encontrado, buscando via token', {
          companyId: finalCompanyId,
          patientId: finalPatientId,
          orcamentoId: orcamento.id,
          token
        });
        
        // Buscar IDs através do token
        try {
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('@/lib/firebase');
          const getOrcamentoIds = httpsCallable(functions, 'getOrcamentoIdsByToken');
          const idsResult = await getOrcamentoIds({ token });
          const idsData = idsResult.data as { companyId: string; patientId: string };
          
          if (idsData && idsData.companyId && idsData.patientId) {
            finalCompanyId = idsData.companyId;
            finalPatientId = idsData.patientId;
            setCompanyId(finalCompanyId);
            setPatientId(finalPatientId);
          } else {
            throw new Error('Não foi possível obter companyId e patientId');
          }
        } catch (idsError) {
          console.error('Erro ao buscar IDs:', idsError);
          throw new Error('companyId ou patientId não encontrado. Por favor, recarregue a página.');
        }
      }

      // Criar path no Storage usando os IDs finais
      const storagePath = `companies/${finalCompanyId}/patients/${finalPatientId}/orcamentos/${orcamento.id}/signature.png`;
      console.log('uploadSignature: fazendo upload para', storagePath);
      const storageRef = ref(storage, storagePath);

      // Fazer upload
      await uploadBytes(storageRef, blob);
      console.log('uploadSignature: upload concluído');

      // Obter URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('uploadSignature: URL obtida', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      return null;
    }
  };

  const handleSign = async () => {
    if (!signatureName.trim()) {
      setError('Por favor, informe seu nome para assinar');
      return;
    }

    if (!hasSignature) {
      setError('Por favor, faça sua assinatura no campo abaixo');
      return;
    }

    if (!orcamento || !token) {
      setError('Dados do orçamento não encontrados');
      return;
    }

    try {
      setSigning(true);
      setError(null);

      // Fazer upload da assinatura
      const signatureImageUrl = await uploadSignature();
      if (!signatureImageUrl) {
        throw new Error('Erro ao salvar assinatura. Por favor, tente novamente.');
      }

      // Obter IP do cliente (simplificado)
      let clientIP = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIP = ipData.ip || 'unknown';
      } catch (ipError) {
        console.warn('Erro ao obter IP:', ipError);
      }

      // Atualizar orçamento com assinatura usando Cloud Function
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      
      const signOrcamento = httpsCallable(functions, 'signOrcamento');
      await signOrcamento({
        companyId: companyId,
        patientId: patientId,
        token,
        signedBy: signatureName.trim(),
        signatureIP: clientIP,
        signatureImageUrl,
      });

      // Atualizar estado local
      setOrcamento({
        ...orcamento,
        signedAt: new Date(),
        signedBy: signatureName.trim(),
        signatureIP: clientIP,
        signatureImageUrl,
        status: 'aprovado',
      });
      setSigned(true);
      setSigning(false);
    } catch (err: any) {
      console.error('Erro ao assinar orçamento:', err);
      setError(err.message || 'Erro ao assinar orçamento');
      setSigning(false);
    }
  };

  // Função para fazer download do PDF
  const handleDownloadPDF = async () => {
    if (!orcamento || !company || !patient) {
      setError('Dados do orçamento não encontrados');
      return;
    }

    try {
      // Converter procedimentos do orçamento para o formato esperado pela função
      const procedimentos = orcamento.procedimentos.map((proc) => ({
        id: proc.id || '',
        companyId: orcamento.companyId,
        patientId: orcamento.patientId,
        procedimento: proc.procedimento,
        valorCentavos: proc.valorCentavos,
        valorCentavosEditado: proc.valorCentavosEditado,
        dentes: (proc.dentes || []).map(d => ({
          numero: d.numero,
          faces: d.faces as FaceDente[],
        })),
        selectionTypes: proc.selectionTypes || [],
        profissionalId: '', // Não disponível no orçamento
        estado: 'a_realizar' as const,
        gerarPagamentoFinanceiro: false,
        createdAt: orcamento.createdAt,
        updatedAt: orcamento.updatedAt,
      }));

      // Converter desconto
      const desconto = orcamento.descontoCentavos 
        ? (orcamento.descontoCentavos / 100).toFixed(2).replace('.', ',')
        : '0,00';

      // Se houver imagem da assinatura, obter via Cloud Function (evita CORS)
      let signatureBase64: string | null = null;
      if (orcamento.signatureImageUrl) {
        try {
          // Extrair o caminho do Storage da URL
          const urlObj = new URL(orcamento.signatureImageUrl);
          let pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            console.log('Obtendo imagem via Cloud Function, caminho:', storagePath);
            
            // Chamar Cloud Function para obter a imagem como base64
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('@/lib/firebase');
            const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
            const result = await getSignatureImageBase64({ storagePath });
            const data = result.data as { base64: string };
            
            if (data && data.base64) {
              signatureBase64 = data.base64;
              console.log('Imagem obtida via Cloud Function, tamanho:', signatureBase64.length);
            }
          }
        } catch (cloudFunctionError) {
          console.warn('Erro ao obter imagem via Cloud Function:', cloudFunctionError);
          // Se falhar, tentar usar canvas (pode não funcionar devido a CORS)
          try {
            const imgElement = document.querySelector(`img[src="${orcamento.signatureImageUrl}"]`) as HTMLImageElement;
            if (imgElement && imgElement.complete) {
              const canvas = document.createElement('canvas');
              canvas.width = imgElement.naturalWidth || imgElement.width;
              canvas.height = imgElement.naturalHeight || imgElement.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(imgElement, 0, 0);
                signatureBase64 = canvas.toDataURL('image/png');
                console.log('Imagem convertida via canvas (fallback)');
              }
            }
          } catch (canvasError) {
            console.warn('Erro ao converter imagem via canvas:', canvasError);
          }
        }
      }

      // Gerar PDF com a função existente
      await generateOrcamentoPDF(
        company,
        patient,
        procedimentos,
        desconto,
        orcamento.observacoes || '',
        signatureBase64 || orcamento.signatureImageUrl, // Passar base64 se disponível, senão URL
        orcamento.signedBy, // Adicionar nome de quem assinou
        orcamento.signedAt // Adicionar data da assinatura
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (error && !orcamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  if (!orcamento || !company || !patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Orçamento não encontrado</h1>
          <p className="text-gray-600 mb-6">O link de assinatura é inválido ou expirou.</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Orçamento Assinado!</h1>
          <p className="text-gray-600 mb-4">
            O orçamento foi assinado com sucesso por <strong>{orcamento.signedBy}</strong>.
          </p>
          {orcamento.signedAt && !isNaN(orcamento.signedAt.getTime()) && (
            <p className="text-sm text-gray-500 mb-6">
              Assinado em {format(orcamento.signedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          {orcamento.signatureImageUrl ? (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Assinatura Digital:</p>
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-white inline-block max-w-full">
                <img 
                  src={orcamento.signatureImageUrl} 
                  alt="Assinatura" 
                  className="max-w-full h-auto max-h-40 mx-auto"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem da assinatura:', {
                      url: orcamento.signatureImageUrl,
                      error: e
                    });
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    // Mostrar mensagem de erro
                    const container = img.parentElement;
                    if (container) {
                      container.innerHTML = '<p className="text-sm text-red-600">Erro ao carregar imagem da assinatura</p>';
                    }
                  }}
                  onLoad={() => {
                    console.log('Imagem da assinatura carregada com sucesso:', orcamento.signatureImageUrl);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 mb-2">Assinatura não disponível</p>
              <p className="text-xs text-yellow-600">
                URL: {orcamento.signatureImageUrl || 'não definida'}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Verifique o console para mais detalhes.
              </p>
            </div>
          )}
          
          {/* Botão de Download do PDF */}
          <div className="mt-6">
            <Button
              onClick={handleDownloadPDF}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar PDF do Orçamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Assinatura de Orçamento</h1>
            <p className="text-green-100">
              {company.nome} - {patient.nome}
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Informações do Orçamento */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600">Data do Orçamento</p>
                  <p className="font-semibold text-gray-900">
                    {format(orcamento.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(orcamento.valorTotalCentavos)}
                  </p>
                </div>
              </div>
            </div>

            {/* Procedimentos */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Procedimentos</h2>
              <div className="space-y-2">
                {orcamento.procedimentos.map((proc, idx) => (
                  <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{proc.procedimento}</p>
                      {proc.dentes && proc.dentes.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dentes: {proc.dentes.map((d: any) => d.numero).join(', ')}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 ml-4">
                      {formatCurrency(proc.valorCentavosEditado !== undefined ? proc.valorCentavosEditado : proc.valorCentavos)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Desconto */}
            {orcamento.descontoCentavos > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Desconto</span>
                  <span className="text-red-600 font-semibold">
                    - {formatCurrency(orcamento.descontoCentavos)}
                  </span>
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            {orcamento.formaPagamento && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-1">Forma de Pagamento</p>
                <p className="font-medium text-gray-900">
                  {orcamento.formaPagamento === 'avista' ? 'À vista' :
                   orcamento.formaPagamento === 'parcelado' ? `Parcelado${orcamento.parcelado ? ` (${orcamento.parcelado.numeroParcelas}x)` : ''}` :
                   orcamento.formaPagamento === 'multiplas' ? `Múltiplas formas${orcamento.pagamentos ? ` (${orcamento.pagamentos.length} parcela${orcamento.pagamentos.length !== 1 ? 's' : ''})` : ''}` : ''}
                </p>
              </div>
            )}

            {/* Observações */}
            {orcamento.observacoes && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-1">Observações</p>
                <p className="text-gray-900">{orcamento.observacoes}</p>
              </div>
            )}

            {/* Formulário de Assinatura */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Assinar Orçamento</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="w-full"
                    disabled={signing}
                  />
                </div>
                
                {/* Campo de Assinatura Digital */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assinatura Digital <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-gray-300 rounded-lg bg-white relative overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-48 cursor-crosshair touch-none block"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ touchAction: 'none' }}
                    />
                    {hasSignature && (
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        disabled={signing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Desenhe sua assinatura no campo acima usando o mouse ou o dedo
                  </p>
                </div>

                <Button
                  onClick={handleSign}
                  disabled={signing || !signatureName.trim() || !hasSignature}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3"
                >
                  {signing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Assinando...
                    </>
                  ) : (
                    'Assinar Orçamento'
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Ao assinar, você concorda com os termos e valores apresentados neste orçamento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssinaturaOrcamentoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AssinaturaOrcamentoContent />
    </Suspense>
  );
}

