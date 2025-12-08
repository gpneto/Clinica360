'use client';

import { Send, Bot, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { TabProps } from './types';
import { getMessageText, getMediaInfo, renderMedia, formatMessageDate } from './whatsappUtils';
import { useInteractions } from './useInteractions';
import { useWhatsAppMessages } from '@/hooks/useWhatsappMessages';
import { useMemo } from 'react';
import { normalizePhone } from './utils';

export interface InteracoesTabProps extends TabProps {
  patientPhone: string | null;
}

export function InteracoesTab({
  companyId,
  patient,
  patientPhone: patientPhoneProp,
  singularLabel = 'paciente',
  singularTitle = 'Paciente',
}: InteracoesTabProps) {
  // Obter o número de telefone do paciente para usar como chat_id
  const patientPhone = useMemo(() => {
    if (!patient?.telefoneE164) return null;
    return normalizePhone(patient.telefoneE164);
  }, [patient?.telefoneE164]);

  // Usar o hook de mensagens do WhatsApp
  const { messages: interactionMessages, loading: interactionLoading, loadingMore, hasMore, loadMore } = useWhatsAppMessages(
    companyId,
    patientPhone || null
  );

  const {
    newInteractionMessage,
    setNewInteractionMessage,
    sendingInteraction,
    interactionContainerRef,
    messagesEndRef,
    handleSendInteractionMessage,
  } = useInteractions(companyId, patient, patientPhone, singularTitle);
  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">Interações via WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!patientPhone ? (
          <div className="bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-xl p-4 text-sm">
            {singularTitle} sem telefone cadastrado. Adicione um telefone nas informações do {singularLabel} para visualizar as mensagens.
          </div>
        ) : (
          <>
            <div
              ref={interactionContainerRef}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-3 md:p-4 max-h-[500px] overflow-y-auto space-y-4"
              onScroll={(e) => {
                const target = e.currentTarget;
                const threshold = 100;
                const isNearTop = target.scrollTop <= threshold;

                if (isNearTop && hasMore && !loadingMore) {
                  loadMore();
                }
              }}
            >
              {interactionLoading && interactionMessages.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  Carregando mensagens...
                </div>
              ) : interactionMessages.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  Nenhuma mensagem ainda. Envie a primeira mensagem!
                </div>
              ) : (
                <>
                  {loadingMore && (
                    <div className="text-center text-slate-500 py-2 text-sm">
                      Carregando mensagens anteriores...
                    </div>
                  )}
                  {interactionMessages.map((message, index) => {
                    const isInbound = message.direction === 'inbound';
                    const messageText = getMessageText(message);
                    const messageDate = message.messageTimestamp || message.createdAt;
                    const isAutomatic = message.messageSource === 'automatic';
                    const isManual = message.messageSource === 'manual';
                    const mediaInfo = getMediaInfo(message);
                    const hasMedia = !!mediaInfo;
                    const hasText = messageText && messageText !== '[Mensagem não suportada]';

                    // Usar uma key única combinando id e wam_id para evitar duplicatas
                    const uniqueKey = message.wam_id ? `${message.id}-${message.wam_id}` : `${message.id}-${index}`;

                    return (
                      <div key={uniqueKey} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`
                            max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm
                            ${isInbound ? 'bg-white text-slate-900 rounded-tl-none' : 'bg-blue-500 text-white rounded-tr-none'}
                          `}
                        >
                          {hasMedia && renderMedia(mediaInfo!, message, isInbound)}
                          {hasText && (
                            <p className={`text-sm md:text-base whitespace-pre-wrap break-words ${hasMedia ? 'mt-2' : ''}`}>
                              {messageText}
                            </p>
                          )}
                          <div className={`flex items-center justify-between ${hasText || hasMedia ? 'mt-1' : ''} gap-2`}>
                            <p className={`text-xs ${isInbound ? 'text-slate-500' : 'text-blue-100'}`}>
                              {formatMessageDate(messageDate)}
                              {isInbound && message.read && <span className="ml-1">✓✓</span>}
                            </p>
                            {!isInbound && (
                              <div className="flex items-center gap-1">
                                {isAutomatic && (
                                  <span
                                    className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                    title="Mensagem automática do sistema"
                                  >
                                    <Bot className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">Automática</span>
                                  </span>
                                )}
                                {isManual && (
                                  <span
                                    className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                    title="Mensagem enviada manualmente"
                                  >
                                    <UserCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">Manual</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form
              onSubmit={handleSendInteractionMessage}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={`Digite uma mensagem para o ${singularLabel}...`}
                  value={newInteractionMessage}
                  onChange={(e) => setNewInteractionMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendInteractionMessage();
                    }
                  }}
                  className="flex-1 text-sm md:text-base"
                  disabled={sendingInteraction}
                />
                <Button
                  type="submit"
                  disabled={!newInteractionMessage.trim() || sendingInteraction}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 md:p-3 flex-shrink-0"
                  size="sm"
                >
                  {sendingInteraction ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>
              </div>
            </form>

            <p className="text-xs text-gray-500">
              As mensagens são enviadas utilizando o número configurado nas integrações. As respostas dos botões são registradas automaticamente no agendamento.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

