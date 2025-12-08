import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';
import { generateOrcamentoPDF } from './DentalChart';
import type { Company, Patient } from '@/types';

export function useOrcamentosHandlers(
  companyId: string | null,
  patientId: string | null,
  company: Company | null,
  patient: Patient | null,
  updateOrcamento: (id: string, data: any) => Promise<void>
) {
  const [sendOrcamentoModal, setSendOrcamentoModal] = useState<{ orcamento: any; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSendOrcamento = async (orcamento: any) => {
    if (!companyId || !patientId || !orcamento) {
      showError('Dados do orçamento não encontrados');
      return;
    }

    try {
      // Gerar token único se ainda não existir
      let token = orcamento.signatureToken;
      if (!token) {
        // Gerar token único usando crypto
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }

      // Sempre gerar link no formato novo (com query parameters)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://webagendamentos.web.app';
      const signatureLink = `${baseUrl}/assinatura-orcamento/?token=${token}&companyId=${companyId}&patientId=${patientId}`;
      
      // Atualizar orçamento com token e link (se necessário)
      if (!orcamento.signatureToken || orcamento.signatureLink !== signatureLink) {
        await updateOrcamento(orcamento.id, {
          signatureToken: token,
          signatureLink,
        } as any);
      }
      
      setSendOrcamentoModal({ orcamento, link: signatureLink });
      setCopiedLink(false);
    } catch (error: any) {
      console.error('Erro ao gerar link de assinatura:', error);
      showError('Erro ao gerar link de assinatura. Por favor, tente novamente.');
    }
  };

  const handlePrintOrcamento = async (orcamento: any) => {
    if (!orcamento || !company || !patient) {
      showError('Dados do orçamento não encontrados');
      return;
    }

    try {
      // Converter procedimentos do orçamento para o formato esperado pela função
      const procedimentos = orcamento.procedimentos.map((proc: any) => ({
        id: proc.id || '',
        procedimento: proc.procedimento,
        valorCentavos: proc.valorCentavos,
        valorCentavosEditado: proc.valorCentavosEditado,
        dentes: proc.dentes || [],
        selectionTypes: proc.selectionTypes || [],
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
      
      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  const handleCopyLink = async () => {
    if (!sendOrcamentoModal) return;
    
    try {
      await navigator.clipboard.writeText(sendOrcamentoModal.link);
      setCopiedLink(true);
      showSuccess('Link copiado para a área de transferência!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      showError('Erro ao copiar link. Por favor, tente novamente.');
    }
  };

  const handleSendViaSystem = async () => {
    if (!sendOrcamentoModal || !patient) return;

    try {
      const message = `Olá ${patient.nome}! Você recebeu um orçamento para assinatura. Acesse o link: ${sendOrcamentoModal.link}`;
      
      const callable = httpsCallable(functions, 'sendManualWhatsappMessage');
      await callable({
        companyId,
        patientId,
        phone: patient.telefoneE164,
        message,
      });
      
      showSuccess('Link enviado com sucesso!');
      setSendOrcamentoModal(null);
    } catch (error: any) {
      console.error('Erro ao enviar link:', error);
      const message =
        error?.message ||
        error?.data?.message ||
        'Não foi possível enviar o link. Verifique a conexão e tente novamente.';
      showError(message);
    }
  };

  return {
    sendOrcamentoModal,
    setSendOrcamentoModal,
    copiedLink,
    handleSendOrcamento,
    handlePrintOrcamento,
    handleCopyLink,
    handleSendViaSystem,
  };
}

