'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Loader2, Trash2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateAnamnesePDF } from '@/components/DentalChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function AssinaturaAnamneseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';
  const companyIdFromUrl = searchParams?.get('companyId') || null;
  const patientIdFromUrl = searchParams?.get('patientId') || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anamnese, setAnamnese] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [patient, setPatient] = useState<any | null>(null);
  const [modeloCompleto, setModeloCompleto] = useState<any | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    if (hasLoadedRef.current === token) {
      return;
    }
    hasLoadedRef.current = token;

    const loadAnamnese = async () => {
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        
        if (!companyIdFromUrl || !patientIdFromUrl) {
          throw new Error('CompanyId ou PatientId não fornecidos');
        }

        // Buscar anamnese pelo token usando Cloud Function
        const getAnamneseByToken = httpsCallable(functions, 'getAnamneseByToken');
        const result = await getAnamneseByToken({ 
          token, 
          companyId: companyIdFromUrl,
          patientId: patientIdFromUrl 
        });
        
        const data = result.data as { anamnese: any; company: any; patient: any; modelo: any };
        
        if (!data || !data.anamnese) {
          throw new Error('Anamnese não encontrada');
        }

        // Converter timestamps do Firestore para formato serializável
        let signedAt: Date | undefined;
        if (data.anamnese.signedAt) {
          if (typeof data.anamnese.signedAt === 'string') {
            const date = new Date(data.anamnese.signedAt);
            signedAt = !isNaN(date.getTime()) ? date : undefined;
          } else if (data.anamnese.signedAt.toDate) {
            signedAt = data.anamnese.signedAt.toDate();
          } else if (data.anamnese.signedAt.seconds) {
            signedAt = new Date(data.anamnese.signedAt.seconds * 1000);
          }
        }

        const anamneseData = {
          ...data.anamnese,
          signedAt,
        };

        // Verificar se já está assinada
        const isAlreadySigned = anamneseData.signedAt !== undefined && 
                                anamneseData.signedAt !== null && 
                                !isNaN(anamneseData.signedAt.getTime());
        
        console.log('Anamnese carregada:', {
          hasSignedAt: !!anamneseData.signedAt,
          signedAt: anamneseData.signedAt,
          signatureImageUrl: anamneseData.signatureImageUrl,
          isAlreadySigned,
        });

        if (isAlreadySigned) {
          setSigned(true);
          setAnamnese(anamneseData);
          setCompany(data.company);
          setPatient(data.patient);
          setModeloCompleto(data.modelo);
          setCompanyId(companyIdFromUrl);
          setPatientId(patientIdFromUrl);
          setHasSignature(!!anamneseData.signatureImageUrl);
          setLoading(false);
          return;
        }

        setAnamnese(anamneseData);
        setCompany(data.company);
        setPatient(data.patient);
        setModeloCompleto(data.modelo);
        setCompanyId(companyIdFromUrl);
        setPatientId(patientIdFromUrl);
        // Inicializar respostas com as existentes ou vazias
        setRespostas(anamneseData.respostas || {});
        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao carregar anamnese:', err);
        setError(err.message || 'Erro ao carregar anamnese');
        setLoading(false);
      }
    };

    loadAnamnese();
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

  const uploadSignature = async (): Promise<string | null> => {
    if (!canvasRef.current || !anamnese) return null;

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob>((resolve) => {
        // Usar qualidade máxima (1.0) e tipo PNG para melhor qualidade
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else throw new Error('Erro ao converter canvas para blob');
        }, 'image/png', 1.0); // Qualidade máxima
      });

      if (!companyId || !patientId) {
        throw new Error('companyId ou patientId não encontrado');
      }

      const storagePath = `companies/${companyId}/patients/${patientId}/anamneses/${anamnese.id}/signature.png`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      return null;
    }
  };

  const atualizarResposta = (secaoId: string, perguntaId: string, resposta: any) => {
    const key = `${secaoId}-${perguntaId}`;
    setRespostas(prev => ({
      ...prev,
      [key]: resposta
    }));
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

    if (!anamnese || !token) {
      setError('Dados da anamnese não encontrados');
      return;
    }

    try {
      setSigning(true);
      setError(null);

      const signatureImageUrl = await uploadSignature();
      if (!signatureImageUrl) {
        throw new Error('Erro ao salvar assinatura. Por favor, tente novamente.');
      }

      let clientIP = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIP = ipData.ip || 'unknown';
      } catch (ipError) {
        console.warn('Erro ao obter IP:', ipError);
      }

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      
      const signAnamnese = httpsCallable(functions, 'signAnamnese');
      await signAnamnese({
        companyId: companyId,
        patientId: patientId,
        token,
        signedBy: signatureName.trim(),
        signatureIP: clientIP,
        signatureImageUrl,
        respostas: respostas, // Incluir respostas preenchidas
      });

      setAnamnese({
        ...anamnese,
        signedAt: new Date(),
        signedBy: signatureName.trim(),
        signatureIP: clientIP,
        signatureImageUrl,
        status: 'assinada',
        respostas: respostas,
      });
      setSigned(true);
      setSigning(false);
    } catch (err: any) {
      console.error('Erro ao assinar anamnese:', err);
      setError(err.message || 'Erro ao assinar anamnese');
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando anamnese...</p>
        </div>
      </div>
    );
  }

  if (error && !anamnese) {
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

  if (!anamnese || !company || !patient || !modeloCompleto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Anamnese não encontrada</h1>
          <p className="text-gray-600 mb-6">O link de assinatura é inválido ou expirou.</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    if (!anamnese || !company || !patient || !modeloCompleto) {
      setError('Dados da anamnese não encontrados');
      return;
    }

    try {
      // Obter imagem da assinatura em base64 se disponível
      let signatureBase64: string | null = null;
      if (anamnese.signatureImageUrl) {
        try {
          const urlObj = new URL(anamnese.signatureImageUrl);
          let pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('@/lib/firebase');
            const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
            const result = await getSignatureImageBase64({ storagePath });
            const data = result.data as { base64: string };
            
            if (data && data.base64) {
              signatureBase64 = data.base64;
            }
          }
        } catch (cloudFunctionError) {
          console.warn('Erro ao obter imagem via Cloud Function:', cloudFunctionError);
          // Se falhar, tentar usar canvas
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

      // Gerar PDF
      await generateAnamnesePDF(
        company,
        patient,
        modeloCompleto,
        anamnese.respostas || {},
        signatureBase64 || anamnese.signatureImageUrl,
        anamnese.signedBy,
        anamnese.signedAt ? new Date(anamnese.signedAt) : null
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Anamnese Assinada!</h1>
          <p className="text-gray-600 mb-4">
            A anamnese foi assinada com sucesso por <strong>{anamnese.signedBy}</strong>.
          </p>
          {anamnese.signedAt && (
            <p className="text-sm text-gray-500 mb-6">
              Assinada em {format(new Date(anamnese.signedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          {anamnese.signatureImageUrl && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Assinatura Digital:</p>
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-white inline-block max-w-full">
                <img 
                  src={anamnese.signatureImageUrl} 
                  alt="Assinatura" 
                  className="max-w-full h-auto max-h-40 mx-auto"
                />
              </div>
            </div>
          )}
          
          {/* Botão de Download do PDF */}
          <div className="mt-6">
            <Button
              onClick={handleDownloadPDF}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar PDF da Anamnese
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
            <h1 className="text-2xl font-bold mb-2">Assinatura de Anamnese</h1>
            <p className="text-green-100">
              {company.nome} - {patient.nome}
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Informações da Anamnese */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600">Modelo de Anamnese</p>
                  <p className="font-semibold text-gray-900">{anamnese.modeloNome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Data</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(anamnese.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Seções com Perguntas e Respostas */}
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
                              const respostaAtual = respostas[respostaKey] || anamnese.respostas?.[respostaKey] || null;
                              
                              return (
                                <div
                                  key={pergunta.id}
                                  className="p-4 border rounded-lg bg-white space-y-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <div className="flex-1 space-y-3">
                                      <div>
                                        <div className="font-semibold text-gray-900 mb-2 flex items-center flex-wrap gap-2">
                                          <span>{pergunta.pergunta}</span>
                                          {pergunta.geraAlerta && (
                                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                              <span className="mr-1">⚠️</span>
                                              Gera Alerta
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Campos de Preenchimento (se não estiver assinada) */}
                                      {!signed ? (
                                        <div className="mt-3 space-y-3">
                                          {pergunta.tipoResposta === 'sim_nao' && (
                                            <div className="flex gap-3">
                                              <Button
                                                type="button"
                                                variant={respostaAtual?.resposta === 'sim' ? 'default' : 'outline'}
                                                onClick={() => atualizarResposta(secao.id, pergunta.id, { resposta: 'sim' })}
                                                className={respostaAtual?.resposta === 'sim' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                              >
                                                Sim
                                              </Button>
                                              <Button
                                                type="button"
                                                variant={respostaAtual?.resposta === 'nao' ? 'default' : 'outline'}
                                                onClick={() => atualizarResposta(secao.id, pergunta.id, { resposta: 'nao' })}
                                                className={respostaAtual?.resposta === 'nao' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                                              >
                                                Não
                                              </Button>
                                            </div>
                                          )}
                                          
                                          {pergunta.tipoResposta === 'texto' && (
                                            <Textarea
                                              value={respostaAtual?.texto || ''}
                                              onChange={(e) => atualizarResposta(secao.id, pergunta.id, { texto: e.target.value })}
                                              placeholder="Digite sua resposta aqui..."
                                              rows={3}
                                              className="w-full"
                                            />
                                          )}
                                          
                                          {pergunta.tipoResposta === 'sim_nao_texto' && (
                                            <div className="space-y-3">
                                              <div className="flex gap-3">
                                                <Button
                                                  type="button"
                                                  variant={respostaAtual?.resposta === 'sim' ? 'default' : 'outline'}
                                                  onClick={() => atualizarResposta(secao.id, pergunta.id, { 
                                                    resposta: 'sim', 
                                                    texto: respostaAtual?.texto || '' 
                                                  })}
                                                  className={respostaAtual?.resposta === 'sim' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                                >
                                                  Sim
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant={respostaAtual?.resposta === 'nao' ? 'default' : 'outline'}
                                                  onClick={() => atualizarResposta(secao.id, pergunta.id, { 
                                                    resposta: 'nao', 
                                                    texto: respostaAtual?.texto || '' 
                                                  })}
                                                  className={respostaAtual?.resposta === 'nao' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                                                >
                                                  Não
                                                </Button>
                                              </div>
                                              {(respostaAtual?.resposta === 'sim' || respostaAtual?.resposta === 'nao') && (
                                                <div>
                                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                                    {pergunta.pergunta.includes('Qual') || pergunta.pergunta.includes('qual') 
                                                      ? 'Qual?' 
                                                      : 'Observações'}
                                                  </Label>
                                                  <Textarea
                                                    value={respostaAtual?.texto || ''}
                                                    onChange={(e) => atualizarResposta(secao.id, pergunta.id, { 
                                                      resposta: respostaAtual?.resposta || 'sim',
                                                      texto: e.target.value 
                                                    })}
                                                    placeholder="Digite aqui..."
                                                    rows={2}
                                                    className="w-full"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        /* Exibir Resposta (se já estiver assinada) */
                                        respostaAtual ? (
                                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            {pergunta.tipoResposta === 'sim_nao' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">Resposta:</span>
                                                <Badge 
                                                  variant="outline" 
                                                  className={
                                                    respostaAtual.resposta === 'sim'
                                                      ? 'bg-green-50 text-green-700 border-green-300'
                                                      : 'bg-red-50 text-red-700 border-red-300'
                                                  }
                                                >
                                                  {respostaAtual.resposta === 'sim' ? 'Sim' : 'Não'}
                                                </Badge>
                                              </div>
                                            )}
                                            
                                            {pergunta.tipoResposta === 'texto' && (
                                              <div>
                                                <span className="text-sm font-medium text-gray-700 block mb-1">Resposta:</span>
                                                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                                  {respostaAtual.texto || 'Não respondido'}
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
                                                      respostaAtual.resposta === 'sim'
                                                        ? 'bg-green-50 text-green-700 border-green-300'
                                                        : respostaAtual.resposta === 'nao'
                                                        ? 'bg-red-50 text-red-700 border-red-300'
                                                        : 'bg-gray-50 text-gray-700 border-gray-300'
                                                    }
                                                  >
                                                    {respostaAtual.resposta === 'sim' ? 'Sim' : respostaAtual.resposta === 'nao' ? 'Não' : 'Não respondido'}
                                                  </Badge>
                                                </div>
                                                {respostaAtual.texto && (
                                                  <div>
                                                    <span className="text-sm font-medium text-gray-700 block mb-1">Observações:</span>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                                      {respostaAtual.texto}
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <p className="text-sm text-gray-500 italic">Não respondido</p>
                                          </div>
                                        )
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

            {/* Formulário de Assinatura */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Assinar Anamnese</h2>
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
                    'Assinar Anamnese'
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Ao assinar, você confirma que as informações preenchidas estão corretas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssinaturaAnamnesePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    }>
      <AssinaturaAnamneseContent />
    </Suspense>
  );
}
