import { useState, useRef, useEffect } from 'react';
import { sendWhatsAppMessage } from '@/hooks/useWhatsappMessages';
import { showError, showSuccess } from '@/components/ui/toast';
import { normalizePhone } from './utils';

export function useInteractions(
  companyId: string | null | undefined,
  patient: any,
  patientPhone: string | null,
  singularTitle: string
) {
  const [newInteractionMessage, setNewInteractionMessage] = useState('');
  const [sendingInteraction, setSendingInteraction] = useState(false);
  const interactionContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendInteractionMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!companyId) {
      showError('Empresa não identificada.');
      return;
    }
    if (!patient?.telefoneE164) {
      showError(`${singularTitle} sem telefone cadastrado.`);
      return;
    }
    if (!newInteractionMessage.trim()) {
      showError('Digite uma mensagem antes de enviar.');
      return;
    }

    if (!patientPhone || !companyId) {
      showError(`${singularTitle} sem telefone cadastrado.`);
      return;
    }

    try {
      setSendingInteraction(true);
      await sendWhatsAppMessage(companyId, patientPhone, newInteractionMessage.trim());
      setNewInteractionMessage('');
      showSuccess('Mensagem enviada com sucesso.');
    } catch (error: any) {
      console.error('[Paciente][Interações] Erro ao enviar mensagem:', error);
      const message =
        error?.message ||
        error?.data?.message ||
        'Não foi possível enviar a mensagem. Verifique a conexão e tente novamente.';
      showError(message);
    } finally {
      setSendingInteraction(false);
    }
  };

  return {
    newInteractionMessage,
    setNewInteractionMessage,
    sendingInteraction,
    interactionContainerRef,
    messagesEndRef,
    handleSendInteractionMessage,
  };
}

