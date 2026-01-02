'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Send, RotateCcw, MessageCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { showSuccess, showError } from '@/components/ui/toast';
import { format, isSameDay } from 'date-fns';

interface BirthdayMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientFirstName: string;
  patientPhone?: string;
  birthdayDate: Date;
}

export function BirthdayMessageModal({
  isOpen,
  onClose,
  patientId,
  patientFirstName,
  patientPhone,
  birthdayDate,
}: BirthdayMessageModalProps) {
  const { companyId } = useAuth();
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Verificar se é aniversário hoje
  const isTodayBirthday = isSameDay(birthdayDate, new Date());

  // Garantir que o componente está montado no cliente antes de renderizar o portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isTodayBirthday && companyId && patientId) {
      checkIfAlreadySent();
    }
  }, [isOpen, isTodayBirthday, companyId, patientId]);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const checkIfAlreadySent = async () => {
    if (!companyId || !patientId) return;

    setChecking(true);
    try {
      const functions = getFunctions();
      const checkBirthdayMessageSent = httpsCallable(functions, 'checkBirthdayMessageSent');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await checkBirthdayMessageSent({
        patientId,
        companyId,
        birthdayDate: today.toISOString(), // Enviar como string ISO
      }) as { data: { success: boolean; alreadySent: boolean; sentAt: any } };

      if (result.data.success) {
        setAlreadySent(result.data.alreadySent);
        if (result.data.alreadySent && result.data.sentAt) {
          // Se sentAt for uma string ISO, converter para Date
          const sentAtDate = typeof result.data.sentAt === 'string' 
            ? new Date(result.data.sentAt)
            : result.data.sentAt?.toDate ? result.data.sentAt.toDate() : new Date(result.data.sentAt);
          setSentAt(sentAtDate);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar mensagem enviada:', error);
    } finally {
      setChecking(false);
    }
  };

  // Função para formatar a mensagem completa com o template
  const formatCompleteMessage = (aiMessage: string): string => {
    const template = `🎉 *Feliz Aniversário, ${patientFirstName}!* 🎉

${aiMessage}

Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de saúde, alegria e realizações! 🎂✨

Parabéns pelo seu dia especial! 🎈`;
    return template;
  };

  const generateMessage = async () => {
    if (!companyId || !patientId || !patientFirstName) return;

    setGenerating(true);
    try {
      const functions = getFunctions();
      const generateBirthdayMessage = httpsCallable(functions, 'generateBirthdayMessage');

      const result = await generateBirthdayMessage({
        patientId,
        patientFirstName,
        companyId,
      }) as { data: { success: boolean; message: string } };

      if (result.data.success) {
        // Formatar mensagem completa com template antes de definir no estado
        const completeMessage = formatCompleteMessage(result.data.message);
        setMessage(completeMessage);
      }
    } catch (error: any) {
      console.error('Erro ao gerar mensagem:', error);
      showError(error.message || 'Erro ao gerar mensagem de aniversário');
    } finally {
      setGenerating(false);
    }
  };

  // Função para extrair apenas a mensagem da IA da mensagem completa
  const extractAiMessage = (completeMessage: string): string => {
    if (!completeMessage || !completeMessage.trim()) {
      return '';
    }

    const lines = completeMessage.split('\n');
    
    // Encontrar onde começa o cabeçalho do template (linha com "Feliz Aniversário" e nome)
    const headerStartIndex = lines.findIndex(line => 
      line.includes('Feliz Aniversário') || line.includes('*Feliz Aniversário')
    );
    
    // Se não encontrar o cabeçalho, pode ser que a mensagem já esteja no formato correto
    if (headerStartIndex === -1) {
      // Remover qualquer "Feliz Aniversário" que possa estar na mensagem da IA
      const cleaned = completeMessage
        .replace(/🎉\s*\*?Feliz\s+Aniversário[^*]*\*?\s*🎉/gi, '')
        .trim();
      return cleaned || '';
    }

    // Pular a linha do cabeçalho e qualquer linha em branco após ela
    let aiStartIndex = headerStartIndex + 1;
    while (aiStartIndex < lines.length && lines[aiStartIndex].trim() === '') {
      aiStartIndex++;
    }

    // Se chegou ao final do array, não há mensagem
    if (aiStartIndex >= lines.length) {
      return '';
    }

    // Encontrar onde termina a mensagem da IA (antes do fechamento do template)
    const closingPhrases = [
      'Agradecemos sua confiança',
      'Parabéns pelo seu dia especial',
    ];
    
    let aiEndIndex = lines.length;
    for (let i = aiStartIndex; i < lines.length; i++) {
      if (closingPhrases.some(phrase => lines[i].includes(phrase))) {
        aiEndIndex = i;
        break;
      }
    }

    // Extrair apenas a mensagem da IA
    const aiLines = lines.slice(aiStartIndex, aiEndIndex);
    let extracted = aiLines.join('\n').trim();
    
    // Remover qualquer cabeçalho "Feliz Aniversário" que possa estar na mensagem extraída
    // (caso a IA tenha incluído na resposta)
    extracted = extracted
      .replace(/🎉\s*\*?Feliz\s+Aniversário[^*]*\*?\s*🎉/gi, '')
      .replace(/^\*?Feliz\s+Aniversário[^*]*\*?/gi, '')
      .trim();
    
    // Se a extração resultou em string vazia, retornar string vazia
    return extracted;
  };

  const sendMessage = async () => {
    if (!message.trim() || !patientPhone || !companyId || !patientId) {
      showError('Telefone é obrigatório para enviar mensagem');
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions();
      const sendBirthdayMessage = httpsCallable(functions, 'sendBirthdayMessage');

      // Extrair apenas a mensagem da IA da mensagem completa
      const aiMessage = extractAiMessage(message.trim());
      
      // Validar que a mensagem extraída não está vazia
      if (!aiMessage || !aiMessage.trim()) {
        console.error('[sendMessage] Mensagem extraída está vazia:', {
          originalMessage: message,
          extractedMessage: aiMessage
        });
        showError('Erro ao processar mensagem. Por favor, gere uma nova mensagem.');
        setLoading(false);
        return;
      }

      // Validar todos os parâmetros antes de enviar
      const params = {
        patientId: patientId?.trim(),
        companyId: companyId?.trim(),
        message: aiMessage.trim(),
        phone: patientPhone?.trim(),
        patientFirstName: patientFirstName?.trim(),
      };

      console.log('[sendMessage] Enviando mensagem com parâmetros:', {
        patientId: params.patientId,
        companyId: params.companyId,
        messageLength: params.message.length,
        phone: params.phone,
        patientFirstName: params.patientFirstName,
        allFieldsPresent: Object.values(params).every(v => v && v.length > 0)
      });

      // Verificar se todos os campos estão presentes
      if (!params.patientId || !params.companyId || !params.message || !params.phone || !params.patientFirstName) {
        console.error('[sendMessage] Parâmetros faltando:', {
          hasPatientId: !!params.patientId,
          hasCompanyId: !!params.companyId,
          hasMessage: !!params.message,
          hasPhone: !!params.phone,
          hasPatientFirstName: !!params.patientFirstName,
        });
        showError('Dados incompletos. Por favor, verifique os dados do paciente.');
        setLoading(false);
        return;
      }

      const result = await sendBirthdayMessage(params) as { data: { success: boolean; wamId: string; sentAutomatically?: boolean; message?: string; error?: string } };

      if (result.data.success) {
        // Mostrar mensagem apropriada baseada no resultado
        const messageText = result.data.message || 'Mensagem de aniversário enviada com sucesso!';
        
        if (result.data.sentAutomatically) {
          showSuccess(messageText);
          setAlreadySent(true);
          setSentAt(new Date());
          onClose();
        } else {
          // Se não foi enviado automaticamente, mostrar mensagem de erro ou aviso
          if (result.data.error) {
            // Se há erro, mostrar como erro
            showError(messageText);
          } else {
            // Se não há erro mas não foi enviado, mostrar como aviso
            showSuccess(messageText);
          }
          setAlreadySent(true);
          setSentAt(new Date());
          // Não fechar o modal para que o usuário possa copiar a mensagem
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      showError(error.message || 'Erro ao enviar mensagem de aniversário');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!message.trim()) return;

    try {
      // Usar a API moderna de clipboard se disponível
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message.trim());
      } else {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = message.trim();
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      showSuccess('Mensagem copiada para a área de transferência!');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar mensagem:', error);
      showError('Erro ao copiar mensagem');
    }
  };

  const removeEmojis = (text: string): string => {
    // Remover emojis usando uma regex mais simples compatível com ES5
    // Remove caracteres que são comumente usados em emojis
    return text
      .replace(/[\u2600-\u26FF]/g, '') // Miscellaneous Symbols
      .replace(/[\u2700-\u27BF]/g, '') // Dingbats
      .replace(/[\uFE00-\uFE0F]/g, '') // Variation Selectors
      .replace(/\u200D/g, '') // Zero Width Joiner
      .replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '') // Emojis básicos (surrogate pairs)
      .replace(/\s+/g, ' ') // Limpar espaços múltiplos
      .trim();
  };

  const openWhatsApp = async () => {
    if (!patientPhone) {
      showError('Telefone não disponível');
      return;
    }

    const phoneNumber = patientPhone.replace(/\D/g, '');
    const messageText = message.trim();
    
    // Remover emojis da mensagem para o WhatsApp
    const messageWithoutEmojis = removeEmojis(messageText);
    
    // Codificar a mensagem sem emojis para URL
    const encodedMessage = encodeURIComponent(messageWithoutEmojis);
    
    // Criar a URL do WhatsApp Web
    const whatsappUrl = `https://wa.me/${phoneNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
    
    // Abrir em nova aba
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen || !mounted) return null;

  const modalContent = !isTodayBirthday ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Mensagem de Aniversário</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-slate-600 mb-4">
          A mensagem de aniversário só pode ser enviada no dia do aniversário.
        </p>
        <Button onClick={onClose} className="w-full">
          Fechar
        </Button>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Mensagem de Aniversário - {patientFirstName}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {checking ? (
          <div className="py-8 text-center">
            <p className="text-slate-600">Verificando...</p>
          </div>
        ) : alreadySent ? (
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium mb-1">
                ✓ Mensagem já foi enviada anteriormente
              </p>
              {sentAt && (
                <p className="text-green-600 text-sm">
                  Enviada em {format(sentAt, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>
            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mensagem de Aniversário
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Clique em 'Gerar Mensagem' para criar uma mensagem personalizada..."
                className={cn(
                  'w-full min-h-[150px] px-3 py-2 border border-slate-300 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent',
                  'resize-none text-sm'
                )}
              />
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                onClick={generateMessage}
                disabled={generating || loading}
                variant="outline"
                className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50"
              >
                {generating ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Mensagem
                  </>
                )}
              </Button>
              {message.trim() && (
                <Button
                  onClick={() => setMessage('')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                >
                  Limpar
                </Button>
              )}
            </div>

            {message.trim() && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {patientPhone ? (
                    <>
                      <Button
                        onClick={sendMessage}
                        disabled={loading || !message.trim()}
                        className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        {loading ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar via Sistema
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={openWhatsApp}
                        disabled={loading || !message.trim()}
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={copyToClipboard}
                        disabled={loading || !message.trim()}
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Copiar mensagem"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800 text-sm">
                          Telefone não disponível. Use o botão copiar para copiar a mensagem.
                        </p>
                      </div>
                      <Button
                        onClick={copyToClipboard}
                        disabled={loading || !message.trim()}
                        variant="outline"
                        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Copiar mensagem"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                            Mensagem copiada!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Mensagem
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {patientPhone && message.trim() && /[\u2600-\u27BF\uD83C-\uD83E][\uDC00-\uDFFF]/g.test(message.trim()) && (
                  <p className="text-xs text-slate-500 text-center">
                    💡 Dica: Os emojis serão removidos ao abrir o WhatsApp. Use o botão copiar para manter os emojis.
                  </p>
                )}
              </div>
            )}

            {!message.trim() && !patientPhone && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-slate-600 text-sm">
                  ⚠️ Telefone não cadastrado. Você precisará copiar a mensagem manualmente.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

