'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Send, Loader2, Bot, User, X, Sparkles, RotateCcw, History, Download, Lightbulb, Calendar, BarChart3, MessageSquare, Briefcase, Trash2, Mic, MicOff } from 'lucide-react';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { AppointmentCard, StatisticsCard, ListCard } from './AIAssistantComponents';

// Comandos rápidos
const QUICK_COMMANDS = {
  '/hoje': 'Quais agendamentos temos hoje?',
  '/amanha': 'Quais agendamentos temos amanhã?',
  '/estatisticas': 'Mostrar estatísticas deste mês',
  '/pacientes': 'Listar todos os pacientes',
  '/profissionais': 'Listar todos os profissionais',
  '/servicos': 'Listar todos os serviços',
};

// Sugestões iniciais
const INITIAL_SUGGESTIONS = [
  { icon: Calendar, text: 'Quais agendamentos temos hoje?', category: 'Agendamentos' },
  { icon: Calendar, text: 'Quais agendamentos temos amanhã?', category: 'Agendamentos' },
  { icon: BarChart3, text: 'Mostrar estatísticas deste mês', category: 'Estatísticas' },
  { icon: MessageSquare, text: 'Criar novo agendamento', category: 'Ações' },
  { icon: User, text: 'Listar todos os pacientes', category: 'Busca' },
  { icon: Briefcase, text: 'Listar todos os profissionais', category: 'Busca' },
];

function processQuickCommand(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith('/')) {
    const command = trimmed.split(' ')[0];
    return QUICK_COMMANDS[command as keyof typeof QUICK_COMMANDS] || null;
  }
  return null;
}

function parseAssistantResponse(content: string, functionCalls?: any[]): {
  appointments?: any[];
  statistics?: any;
  patients?: any[];
  professionals?: any[];
  services?: any[];
  suggestions?: string[];
} {
  const parsed: any = {};
  if (functionCalls) {
    functionCalls.forEach((fc) => {
      if (fc.result) {
        if (fc.name === 'searchAppointments' && fc.result.appointments) {
          parsed.appointments = fc.result.appointments;
        }
        if (fc.name === 'getStatistics') {
          parsed.statistics = fc.result;
        }
        if (fc.name === 'searchPatients') {
          parsed.patients = Array.isArray(fc.result) ? fc.result : [];
        }
        if (fc.name === 'searchProfessionals') {
          parsed.professionals = Array.isArray(fc.result) ? fc.result : [];
        }
        if (fc.name === 'searchServices') {
          parsed.services = Array.isArray(fc.result) ? fc.result : [];
        }
      }
    });
  }
  return parsed;
}

function formatMessage(text: string): string {
  let formatted = text;
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  formatted = formatted.replace(/\s{3,}/g, ' ');
  formatted = formatted.replace(/([.!?])\s*(Paciente|Profissional|Serviço|Data|Horário|Status):/gi, '$1\n\n$2:');
  formatted = formatted.replace(/([^\n])(Paciente|Profissional|Serviço|Data|Horário|Status):/gi, '$1\n$2:');
  formatted = formatted.replace(/Status:\s*([^\n]+)\s*(Paciente:)/gi, 'Status: $1\n\n$2');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.split('\n\n').map(paragraph => {
    if (paragraph.trim()) {
      return `<p class="mb-3">${paragraph.trim().replace(/\n/g, '<br>')}</p>`;
    }
    return '';
  }).join('');
  return formatted;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: Array<{ name: string; args: any; result: any }>;
  parsedData?: {
    appointments?: any[];
    statistics?: any;
    patients?: any[];
    professionals?: any[];
    services?: any[];
  };
  suggestions?: string[];
}

interface SavedConversation {
  id: string;
  messages: Message[];
  createdAt: string;
  title: string;
  deleted?: boolean;
}

function saveConversation(messages: Message[], companyId: string): SavedConversation | null {
  try {
    const conversations: SavedConversation[] = JSON.parse(
      localStorage.getItem(`ai-conversations-${companyId}`) || '[]'
    );
    const newConversation: SavedConversation = {
      id: Date.now().toString(),
      messages,
      createdAt: new Date().toISOString(),
      title: messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'Nova conversa',
      deleted: false,
    };
    conversations.unshift(newConversation);
    const limited = conversations.filter(c => !c.deleted).slice(0, 10);
    localStorage.setItem(`ai-conversations-${companyId}`, JSON.stringify(limited));
    return newConversation;
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    return null;
  }
}

function loadSavedConversations(companyId: string): SavedConversation[] {
  try {
    const conversations: SavedConversation[] = JSON.parse(
      localStorage.getItem(`ai-conversations-${companyId}`) || '[]'
    );
    return conversations.filter(c => !c.deleted);
  } catch (error) {
    console.error('Erro ao carregar conversas:', error);
    return [];
  }
}

function deleteConversation(id: string, companyId: string): boolean {
  try {
    const conversations: SavedConversation[] = JSON.parse(
      localStorage.getItem(`ai-conversations-${companyId}`) || '[]'
    );
    const updated = conversations.map(conv =>
      conv.id === id ? { ...conv, deleted: true } : conv
    );
    const toSave = updated.filter(c => !c.deleted);
    localStorage.setItem(`ai-conversations-${companyId}`, JSON.stringify(toSave));
    return true;
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    return false;
  }
}

function exportConversation(messages: Message[]): void {
  const text = messages
    .map(msg => `${msg.role === 'user' ? 'Você' : 'Assistente'}: ${msg.content}`)
    .join('\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversa-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function FloatingAIAssistant() {
  const { companyId, user, themePreference, customColor, customColor2 } = useAuth();
  const pathname = usePathname();
  const isMessagesPage = pathname?.startsWith('/mensagens');
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente inteligente. Posso ajudar você a criar agendamentos, buscar informações, consultar estatísticas e muito mais. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Verificar se há modal aberto (como MobileAppointmentForm)
  useEffect(() => {
    const checkModalOpen = () => {
      const hasModalOpen = document.body.hasAttribute('data-modal-open');
      setIsModalOpen(hasModalOpen);
    };
    
    // Verificar inicialmente
    checkModalOpen();
    
    // Observar mudanças no atributo
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-modal-open']
    });
    
    return () => observer.disconnect();
  }, []);

  // Tema
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom' && !!customColor;
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleDiagonal = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;

  useEffect(() => {
    setIsMounted(true);
    if (companyId) {
      setSavedConversations(loadSavedConversations(companyId));
    }
    
    // Inicializar Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true; // Manter ativo continuamente
        recognitionInstance.interimResults = true; // Mostrar resultados intermediários
        recognitionInstance.lang = 'pt-BR';
        
        recognitionInstance.onresult = (event: any) => {
          // Pegar apenas resultados finais (não intermediários)
          const results = Array.from(event.results);
          const finalResults = results.filter((result: any) => result.isFinal);
          
          if (finalResults.length > 0) {
            const transcript = finalResults
              .map((result: any) => result[0].transcript)
              .join('');
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            // Não parar automaticamente - deixar o usuário decidir quando parar
          }
        };
        
        recognitionInstance.onerror = (event: any) => {
          console.error('Erro no reconhecimento de voz:', event.error);
          
          // Não mostrar alerta para alguns erros comuns
          if (event.error === 'no-speech') {
            // Silenciosamente continuar se não detectar fala (não parar)
            console.log('Nenhuma fala detectada, continuando...');
            return; // Não parar o reconhecimento
          } else if (event.error === 'not-allowed') {
            setIsListening(false);
            alert('Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador e tente novamente.');
          } else if (event.error === 'aborted') {
            // Ignorar quando é abortado manualmente
            console.log('Reconhecimento abortado');
            setIsListening(false);
          } else if (event.error === 'network') {
            setIsListening(false);
            alert('Erro de rede. Verifique sua conexão e tente novamente.');
          } else if (event.error === 'service-not-allowed') {
            setIsListening(false);
            alert('Serviço de reconhecimento de voz não permitido. Verifique as configurações do navegador.');
          } else {
            console.error('Erro no reconhecimento:', event.error);
            setIsListening(false);
          }
        };
        
        recognitionInstance.onend = () => {
          // Usar uma função de callback para acessar o estado atual
          setIsListening((current) => {
            // Se ainda está marcado como listening, reiniciar automaticamente
            // Isso mantém o reconhecimento ativo até o usuário parar manualmente
            if (current) {
              setTimeout(() => {
                try {
                  recognitionInstance.start();
                } catch (error) {
                  // Se não conseguir reiniciar, retornar false para parar
                  return false;
                }
              }, 100);
            }
            return current;
          });
        };
        
        recognitionInstance.onstart = () => {
          console.log('Reconhecimento de voz iniciado');
          setIsListening(true);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, [companyId]);

  // Scroll para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focar input quando modal abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const html = document.documentElement;
      const body = document.body;
      
      // Salvar estilos originais
      const originalBodyOverflow = body.style.overflow;
      const originalBodyPosition = body.style.position;
      const originalBodyTop = body.style.top;
      const originalBodyWidth = body.style.width;
      const originalHtmlOverflow = html.style.overflow;
      
      // Bloquear scroll completamente (sem height fixo para não interferir com safe-area)
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      
      // Prevenir scroll em touch devices
      const preventScroll = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const modal = modalRef.current;
        // Permitir scroll apenas dentro do modal
        if (!modal || !modal.contains(target)) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('touchstart', preventScroll, { passive: false });
      
      return () => {
        // Restaurar estilos originais
        body.style.overflow = originalBodyOverflow;
        body.style.position = originalBodyPosition;
        body.style.top = originalBodyTop;
        body.style.width = originalBodyWidth;
        html.style.overflow = originalHtmlOverflow;
        
        // Restaurar scroll position
        window.scrollTo(0, scrollY);
        
        // Remover listeners
        document.removeEventListener('touchmove', preventScroll);
        document.removeEventListener('touchstart', preventScroll);
      };
    }
  }, [isOpen]);

  const handleSend = async () => {
    const command = processQuickCommand(input);
    const finalInput = command || input.trim();
    
    if (!finalInput || loading || !companyId) return;

    const userMessage: Message = {
      role: 'user',
      content: finalInput,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const aiAssistantFunction = httpsCallable<
        { messages: Array<{ role: string; content: string }>; companyId: string },
        { message: string; functionCalls?: any }
      >(functions, 'aiAssistant');

      const chatMessages = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await aiAssistantFunction({
        messages: chatMessages,
        companyId,
      });

      const parsedData = parseAssistantResponse(
        result.data.message || '',
        result.data.functionCalls
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.data.message || 'Desculpe, não consegui processar sua solicitação.',
        functionCalls: result.data.functionCalls,
        parsedData,
        suggestions: parsedData.suggestions,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (companyId) {
        saveConversation(finalMessages, companyId);
        setSavedConversations(loadSavedConversations(companyId));
      }
    } catch (error: any) {
      console.error('Erro ao chamar IA:', error);
      
      // Extrair mensagem de erro do Firebase Functions
      let errorMessageText = 'Erro desconhecido';
      
      if (error.code === 'permission-denied') {
        // Erro de permissão - usar a mensagem específica
        errorMessageText = error.message || 'Você não tem permissão para executar esta ação.';
      } else if (error.message) {
        // Outros erros - usar a mensagem do erro
        errorMessageText = error.message;
      } else if (error.details) {
        // Tentar extrair de details se disponível
        errorMessageText = typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: errorMessageText,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Filtrar comandos baseado no input
  const filteredCommands = React.useMemo(() => {
    if (!input.trim().startsWith('/')) return [];
    const query = input.trim().substring(1).toLowerCase();
    return Object.entries(QUICK_COMMANDS)
      .filter(([cmd]) => cmd.substring(1).toLowerCase().startsWith(query))
      .map(([cmd, text]) => ({ command: cmd, text }));
  }, [input]);
  
  const handleQuickAction = async (text: string) => {
    setInput(text);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userMessage: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const aiAssistantFunction = httpsCallable<
        { messages: Array<{ role: string; content: string }>; companyId: string },
        { message: string; functionCalls?: any }
      >(functions, 'aiAssistant');
      const result = await aiAssistantFunction({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        companyId: companyId || '',
      });

      const parsedData = parseAssistantResponse(result.data.message || '', result.data.functionCalls);
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.data.message || '',
        functionCalls: result.data.functionCalls,
        parsedData,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (companyId) {
        saveConversation(finalMessages, companyId);
        setSavedConversations(loadSavedConversations(companyId));
      }
    } catch (error: any) {
      console.error('Erro ao chamar IA:', error);
      
      // Extrair mensagem de erro do Firebase Functions
      let errorMessageText = 'Erro desconhecido';
      
      if (error.code === 'permission-denied') {
        // Erro de permissão - usar a mensagem específica
        errorMessageText = error.message || 'Você não tem permissão para executar esta ação.';
      } else if (error.message) {
        // Outros erros - usar a mensagem do erro
        errorMessageText = error.message;
      } else if (error.details) {
        // Tentar extrair de details se disponível
        errorMessageText = typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: errorMessageText,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Mostrar/ocultar dicas quando digita "/"
  useEffect(() => {
    setShowCommandSuggestions(input.trim().startsWith('/') && filteredCommands.length > 0);
    setSelectedCommandIndex(0);
  }, [input, filteredCommands.length]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandSuggestions && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const selected = filteredCommands[selectedCommandIndex];
        if (selected) {
          setInput(selected.command);
          setShowCommandSuggestions(false);
          // Enviar automaticamente após um pequeno delay
          setTimeout(() => {
            const quickCommand = processQuickCommand(selected.command);
            if (quickCommand) {
              handleQuickAction(quickCommand);
            }
          }, 100);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandSuggestions(false);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showCommandSuggestions) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      // Verificar suporte de diferentes formas (Safari pode usar versões antigas da API)
      const getUserMedia = 
        navigator.mediaDevices?.getUserMedia ||
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (!getUserMedia) {
        // Se não tem getUserMedia, tentar iniciar o reconhecimento direto (pode funcionar no Safari)
        console.log('getUserMedia não disponível, tentando iniciar reconhecimento direto');
        return true; // Retornar true para tentar mesmo assim
      }

      // Solicitar permissão do microfone explicitamente
      let stream: MediaStream;
      
      if (navigator.mediaDevices?.getUserMedia) {
        // API moderna
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // API legada (para Safari mais antigo) - usar Promise wrapper
        stream = await new Promise<MediaStream>((resolve, reject) => {
          const legacyGetUserMedia = getUserMedia as any;
          legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
      }
      
      // Parar o stream imediatamente, só precisamos da permissão
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Erro ao solicitar permissão do microfone:', error);
      
      // Se for erro de permissão negada, ainda podemos tentar o reconhecimento
      // pois o Speech Recognition pode ter sua própria solicitação de permissão
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.log('Permissão negada via getUserMedia, mas tentando reconhecimento mesmo assim');
        // Retornar true para tentar o reconhecimento (ele pode solicitar permissão)
        return true;
      } else if (error.name === 'NotFoundError') {
        alert('Nenhum microfone encontrado. Verifique se há um microfone conectado.');
        return false;
      } else {
        // Para outros erros, tentar mesmo assim (pode funcionar)
        console.log('Erro ao acessar getUserMedia, mas tentando reconhecimento mesmo assim:', error);
        return true;
      }
    }
  };

  const toggleListening = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!recognition) {
      alert('Reconhecimento de voz não está disponível no seu navegador.');
      return;
    }

    if (isListening) {
      try {
        recognition.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Erro ao parar reconhecimento:', error);
        setIsListening(false);
      }
    } else {
      // Solicitar permissão primeiro (especialmente importante no mobile)
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      // Iniciar reconhecimento com pequeno delay para evitar múltiplos cliques
      setTimeout(() => {
        try {
          if (recognition) {
            recognition.start();
            // O estado será atualizado pelo onstart
          }
        } catch (error: any) {
          console.error('Erro ao iniciar reconhecimento:', error);
          setIsListening(false);
          
          // Tratar erros específicos
          if (error.name === 'NotAllowedError' || error.error === 'not-allowed') {
            alert('Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.');
          } else if (error.name === 'AbortError' || error.message?.includes('already started')) {
            // Se já está rodando, apenas atualizar o estado
            setIsListening(true);
          } else {
            alert('Erro ao iniciar o reconhecimento de voz. Tente novamente.');
          }
        }
      }, 300);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Deseja limpar o chat e iniciar uma nova conversa?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Olá! Sou seu assistente inteligente. Posso ajudar você a criar agendamentos, buscar informações, consultar estatísticas e muito mais. Como posso ajudar?',
        },
      ]);
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleLoadConversation = (conversation: SavedConversation) => {
    if (window.confirm('Deseja carregar esta conversa? A conversa atual será substituída.')) {
      setMessages(conversation.messages);
      setShowHistory(false);
      inputRef.current?.focus();
    }
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir esta conversa do histórico?')) {
      if (deleteConversation(id, companyId || '')) {
        setSavedConversations(loadSavedConversations(companyId || ''));
      }
    }
  };

  const showInitialSuggestions = messages.length === 1 && messages[0].role === 'assistant';

  if (!user || !companyId || !isMounted) return null;
  if (
    pathname === '/signin' ||
    pathname === '/contexto' ||
    pathname === '/setup' ||
    pathname?.startsWith('/assinatura-orcamento') ||
    pathname?.startsWith('/assinatura-anamnese')
  ) {
    return null;
  }

  return (
    <>
      {/* Botão Flutuante */}
      {!isMessagesPage && !isModalOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white',
            hasGradient
              ? isCustom && gradientStyleDiagonal
                ? 'hover:opacity-90'
                : isVibrant
                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              : isNeutral
              ? 'bg-gradient-to-br from-slate-700 to-slate-800'
              : 'bg-blue-500'
          )}
          style={isCustom && gradientStyleDiagonal ? gradientStyleDiagonal : undefined}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: isModalOpen ? 0 : 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        >
          <Sparkles className="w-6 h-6" />
        </motion.button>
      )}

      {/* Modal */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Overlay - Tela escura */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'fixed z-[9998]',
                    hasGradient ? 'bg-slate-900/80 backdrop-blur-xl' : 'bg-black/70'
                  )}
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100dvh', // Usar dvh para considerar safe-area
                    position: 'fixed',
                    // Safe area insets
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    paddingLeft: 'env(safe-area-inset-left)',
                    paddingRight: 'env(safe-area-inset-right)',
                  }}
                  onClick={() => setIsOpen(false)}
                  onTouchMove={(e) => {
                    // Prevenir qualquer scroll no overlay
                    e.preventDefault();
                  }}
                  onTouchStart={(e) => {
                    // Prevenir qualquer scroll no overlay
                    e.preventDefault();
                  }}
                />

                {/* Modal Content */}
                <motion.div
                  ref={modalRef}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className={cn(
                    'fixed z-[9999] flex flex-col bg-white',
                    // Mobile: tela cheia
                    'inset-0',
                    // Desktop: tamanho fixo
                    'sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:left-auto sm:h-[700px] sm:w-[420px] sm:rounded-2xl',
                    'rounded-t-3xl sm:rounded-t-2xl',
                    hasGradient
                      ? 'border-t-2 border-white/30 sm:border-2 sm:shadow-2xl'
                      : 'border-t-2 border-gray-200 sm:border-2 sm:shadow-2xl'
                  )}
                  style={{
                    // Mobile: garantir que ocupa toda a tela respeitando safe-area
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100dvh', // Usar dvh para considerar safe-area
                    maxHeight: '100dvh',
                    position: 'fixed',
                    // Safe area insets para mobile
                    paddingTop: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'env(safe-area-inset-top)' 
                      : 0,
                    paddingBottom: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'env(safe-area-inset-bottom)' 
                      : 0,
                    paddingLeft: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'env(safe-area-inset-left)' 
                      : 0,
                    paddingRight: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'env(safe-area-inset-right)' 
                      : 0,
                    // Desktop: resetar para tamanho fixo
                    ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? {
                      width: '420px',
                      height: '700px',
                      maxHeight: '700px',
                      top: 'auto',
                      left: 'auto',
                      right: '24px',
                      bottom: '24px',
                      paddingTop: 0,
                      paddingBottom: 0,
                      paddingLeft: 0,
                      paddingRight: 0,
                    } : {}),
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className={cn(
                    'flex items-center justify-between p-4 border-b flex-shrink-0',
                    hasGradient ? 'border-white/20 bg-white/40' : 'border-gray-200 bg-gray-50'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        hasGradient
                          ? isCustom && gradientColors
                            ? ''
                            : isVibrant
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : isNeutral
                          ? 'bg-gradient-to-br from-slate-700 to-slate-800'
                          : 'bg-blue-500'
                      )}
                      style={
                        isCustom && gradientColors
                          ? {
                              background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                            }
                          : undefined
                      }>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Assistente Inteligente</h3>
                        <p className="text-xs text-gray-600">Como posso ajudar?</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          hasGradient ? 'hover:bg-white/60' : 'hover:bg-gray-100'
                        )}
                        title="Histórico"
                      >
                        <History className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={handleClearChat}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          hasGradient ? 'hover:bg-white/60' : 'hover:bg-gray-100'
                        )}
                        title="Limpar chat"
                      >
                        <RotateCcw className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          hasGradient ? 'hover:bg-white/60' : 'hover:bg-gray-100'
                        )}
                        title="Fechar"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Histórico */}
                  {showHistory && (
                    <div className="absolute inset-0 bg-white z-10 flex flex-col">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Histórico</h3>
                        <button
                          onClick={() => setShowHistory(false)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {savedConversations.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">Nenhuma conversa salva</p>
                        ) : (
                          savedConversations.map((conv) => (
                            <div
                              key={conv.id}
                              className="group relative p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleLoadConversation(conv)}
                            >
                              <div className="font-medium text-gray-900 truncate">{conv.title}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(conv.createdAt).toLocaleString('pt-BR')}
                              </div>
                              <button
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-red-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {/* Sugestões Iniciais */}
                    {showInitialSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                      >
                        <div className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          <span>Sugestões para começar:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {INITIAL_SUGGESTIONS.map((suggestion, idx) => {
                            const Icon = suggestion.icon;
                            return (
                              <motion.button
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 + idx * 0.05 }}
                                onClick={() => handleQuickAction(suggestion.text)}
                                className="p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:border-blue-300 transition-all text-left group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                    <Icon className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 mb-0.5">{suggestion.category}</div>
                                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {suggestion.text}
                                    </div>
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                      <div key={index} className="flex flex-col gap-2">
                        {message.role === 'user' ? (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-500 text-white p-3 text-sm">
                              {message.content}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Bot className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="rounded-2xl rounded-tl-sm bg-gray-100 p-3 text-sm text-gray-900">
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                              </div>
                              
                              {/* Parsed Data */}
                              {message.parsedData && (
                                <div className="space-y-3">
                                  {message.parsedData.appointments?.map((apt: any, aptIdx: number) => (
                                    <AppointmentCard key={aptIdx} appointment={apt} />
                                  ))}
                                  {message.parsedData.statistics && (
                                    <StatisticsCard stats={message.parsedData.statistics} />
                                  )}
                                  {message.parsedData.patients && message.parsedData.patients.length > 0 && (
                                    <ListCard items={message.parsedData.patients} title="Pacientes" />
                                  )}
                                  {message.parsedData.professionals && message.parsedData.professionals.length > 0 && (
                                    <ListCard items={message.parsedData.professionals} title="Profissionais" />
                                  )}
                                  {message.parsedData.services && message.parsedData.services.length > 0 && (
                                    <ListCard items={message.parsedData.services} title="Serviços" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 p-3">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-gray-200 flex-shrink-0 relative">
                    {/* Indicador de gravação */}
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-4 right-4 mb-2 bg-red-500 text-white rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg z-20"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
                          </div>
                          <span className="text-sm font-medium">Ouvindo...</span>
                        </div>
                        <div className="flex-1 flex items-center gap-1 justify-center">
                          <div className="w-1 h-6 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-4 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-8 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          <div className="w-1 h-5 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                          <div className="w-1 h-7 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                        </div>
                        <button
                          onClick={toggleListening}
                          className="text-white hover:text-red-100 transition-colors"
                          title="Parar gravação"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                    
                    {/* Command Suggestions */}
                    {showCommandSuggestions && filteredCommands.length > 0 && !isListening && (
                      <div className="absolute bottom-full left-4 right-16 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                        {filteredCommands.map((cmd, index) => (
                          <button
                            key={cmd.command}
                            onClick={() => {
                              setInput(cmd.command);
                              setShowCommandSuggestions(false);
                              setTimeout(() => {
                                const quickCommand = processQuickCommand(cmd.command);
                                if (quickCommand) {
                                  handleQuickAction(quickCommand);
                                }
                              }, 100);
                            }}
                            className={cn(
                              'w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2',
                              index === selectedCommandIndex && 'bg-blue-50'
                            )}
                            onMouseEnter={() => setSelectedCommandIndex(index)}
                          >
                            <span className="font-mono text-sm text-blue-600">{cmd.command}</span>
                            <span className="text-sm text-gray-600 flex-1 truncate">{cmd.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Digite sua mensagem, use / para comandos ou clique no microfone para falar..."
                        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={1}
                        style={{
                          maxHeight: '120px',
                          minHeight: '40px',
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                        }}
                      />
                      <button
                        onClick={(e) => toggleListening(e)}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled={loading}
                        className={cn(
                          'p-2 rounded-lg transition-colors flex-shrink-0',
                          isListening
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 active:bg-gray-400'
                        )}
                        title={isListening ? 'Parar gravação' : 'Falar com a IA'}
                        type="button"
                      >
                        {isListening ? (
                          <MicOff className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className={cn(
                          'p-2 rounded-lg transition-colors flex-shrink-0',
                          input.trim() && !loading
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        )}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
