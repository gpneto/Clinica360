'use client';

import { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Send, Loader2, Bot, User } from 'lucide-react';

// Função helper para renderizar markdown básico e formatar respostas
function renderMarkdown(text: string): string {
  if (!text) return '';

  let formatted = text;

  // Converter **texto** para <strong>texto</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Detectar padrões de agendamentos e formatar melhor
  // Padrão 1: "Paciente: X   Profissional: Y" (múltiplos espaços)
  // Padrão 2: "Paciente: X.  Profissional: Y." (ponto seguido de espaços)
  // Padrão 3: "Paciente: X. Profissional: Y." (ponto seguido de espaço)
  
  // Primeiro, normalizar múltiplos espaços em um único espaço
  formatted = formatted.replace(/\s{3,}/g, ' ');
  
  // Adicionar quebra de linha antes de cada campo de agendamento (Paciente, Profissional, etc.)
  // Detectar padrões como "Paciente:", "Profissional:", "Serviço:", "Data:", "Horário:", "Status:"
  formatted = formatted.replace(/([.!?])\s*(Paciente|Profissional|Serviço|Data|Horário|Status):/gi, '$1\n\n$2:');
  
  // Adicionar quebra de linha antes de campos que não têm ponto antes (primeiro campo de um agendamento)
  formatted = formatted.replace(/(\s|^)(Paciente|Profissional|Serviço|Data|Horário|Status):/gi, (match, prefix, field) => {
    // Se não é início de linha e não tem quebra antes, adicionar
    if (prefix === ' ' && !formatted.substring(0, formatted.indexOf(match)).endsWith('\n')) {
      return '\n\n' + field + ':';
    }
    return match;
  });
  
  // Garantir quebra de linha antes de cada campo (se não tiver já)
  formatted = formatted.replace(/([^\n])(Paciente|Profissional|Serviço|Data|Horário|Status):/gi, '$1\n$2:');
  
  // Separar agendamentos diferentes (quando há "Paciente:" após "Status:")
  formatted = formatted.replace(/Status:\s*([^\n]+)\s*(Paciente:)/gi, 'Status: $1\n\n$2');
  
  // Converter múltiplas quebras de linha consecutivas em uma única quebra dupla
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Converter quebras de linha em <br> e parágrafos
  formatted = formatted.split('\n\n').map(paragraph => {
    if (paragraph.trim()) {
      return `<p class="mb-3">${paragraph.trim().replace(/\n/g, '<br>')}</p>`;
    }
    return '';
  }).join('');

  return formatted;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
}

export default function AIAssistant() {
  const { companyId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-' + Date.now(),
      role: 'assistant',
      content: 'Olá! Sou seu assistente inteligente. Posso ajudar você a criar agendamentos, buscar informações, consultar estatísticas e muito mais. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    // Proteção contra chamadas duplicadas simultâneas
    if (isSendingRef.current) {
      console.warn('[AIAssistant] handleSend já está em execução, ignorando chamada duplicada');
      return;
    }
    
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || !companyId) return;

    // Marcar como enviando
    isSendingRef.current = true;
    
    // Limpar o input imediatamente para evitar leitura duplicada
    setInput('');
    
    const messageId = 'user-' + Date.now() + '-' + Math.random();
    
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: trimmedInput,
    };

    // Usar função de atualização para garantir que pegamos o estado mais recente
    // e evitar duplicações verificando se a mensagem já existe
    let updatedMessages: Message[] = [];
    setMessages((prev) => {
      // Verificar se já existe uma mensagem idêntica recente (últimos 5 segundos)
      const now = Date.now();
      const recentDuplicate = prev.some(
        (msg) => 
          msg.role === 'user' && 
          msg.content === trimmedInput && 
          msg.id && 
          parseInt(msg.id.split('-')[1]) > now - 5000
      );
      
      if (recentDuplicate) {
        console.warn('[AIAssistant] Mensagem duplicada detectada, ignorando:', trimmedInput);
        updatedMessages = prev;
        return prev;
      }
      
      updatedMessages = [...prev, userMessage];
      return updatedMessages;
    });
    
    setLoading(true);

    try {
      const aiAssistantFunction = httpsCallable<
        { messages: Array<{ role: string; content: string }>; companyId: string },
        { message: string; functionCalls?: any }
      >(functions, 'aiAssistant');

      // Usar o array atualizado em vez de messages (que pode estar desatualizado)
      // Filtrar mensagens duplicadas por conteúdo antes de enviar
      const seenContents = new Set<string>();
      const chatMessages = updatedMessages
        .filter((msg) => {
          const contentKey = `${msg.role}:${msg.content}`;
          if (seenContents.has(contentKey)) {
            console.warn('[AIAssistant] Removendo mensagem duplicada do array:', contentKey);
            return false;
          }
          seenContents.add(contentKey);
          return true;
        })
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const result = await aiAssistantFunction({
        messages: chatMessages,
        companyId,
      });

      const assistantMessage: Message = {
        id: 'assistant-' + Date.now() + '-' + Math.random(),
        role: 'assistant',
        content: result.data.message || 'Desculpe, não consegui processar sua solicitação.',
        functionCalls: result.data.functionCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
        id: 'error-' + Date.now() + '-' + Math.random(),
        role: 'assistant',
        content: errorMessageText,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Verificar se já está enviando antes de chamar handleSend
      if (!isSendingRef.current && !loading) {
        handleSend();
      }
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-gray-500">Por favor, selecione uma empresa para usar o assistente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assistente Inteligente</h2>
            <p className="text-sm text-gray-600">Crie agendamentos, busque informações e consulte estatísticas</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id || `msg-${message.role}-${message.content.substring(0, 20)}`}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div 
                className="break-words"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              ></div>
              {message.functionCalls && message.functionCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-75">
                  <details className="cursor-pointer">
                    <summary className="font-semibold">Ações executadas ({message.functionCalls.length})</summary>
                    <div className="mt-2 space-y-1">
                      {message.functionCalls.map((fc, idx) => (
                        <div key={idx} className="pl-2">
                          <span className="font-mono text-xs">{fc.name}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-gray-600">Pensando...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Exemplos: "Criar agendamento para João Silva amanhã às 14h", "Quantos agendamentos temos hoje?", "Buscar agendamentos do Dr. Pedro"
        </p>
      </div>
    </div>
  );
}

