'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, MessageSquare, Calendar, BarChart3, ArrowRight, Bot } from 'lucide-react';
import { createPortal } from 'react-dom';

export function AIAssistantWelcomeModal() {
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Verificar se já mostrou o aviso da IA
    const hasSeenWelcome = localStorage.getItem('ai-assistant-welcome-seen');
    if (!hasSeenWelcome) {
      // Pequeno delay para garantir que a página está renderizada
      setTimeout(() => {
        setShowModal(true);
      }, 1500);
    }
  }, []);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showModal) {
      // Salvar o valor atual do overflow e a posição do scroll
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Desabilitar scroll do body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Cleanup: restaurar o overflow quando o modal fechar ou componente desmontar
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showModal]);

  const handleClose = (dontShowAgain: boolean = false) => {
    setShowModal(false);
    if (dontShowAgain) {
      localStorage.setItem('ai-assistant-welcome-seen', 'true');
    }
  };

  const handleTryNow = () => {
    handleClose(false);
    
    // Pequeno delay para garantir que o modal fechou
    setTimeout(() => {
      // Scroll para o botão da IA (canto inferior direito)
      const aiButton = document.querySelector('[data-ai-button]') as HTMLElement;
      if (aiButton) {
        // Scroll suave para o botão
        aiButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Adicionar múltiplas animações para destacar
        aiButton.style.transition = 'all 0.3s ease';
        aiButton.style.transform = 'scale(1.3)';
        aiButton.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(99, 102, 241, 0.6)';
        aiButton.style.zIndex = '10001';
        
        // Adicionar classe de animação pulsante
        aiButton.classList.add('animate-pulse');
        
        // Criar um efeito de brilho ao redor
        const glowEffect = document.createElement('div');
        glowEffect.style.position = 'fixed';
        glowEffect.style.width = '80px';
        glowEffect.style.height = '80px';
        glowEffect.style.borderRadius = '50%';
        glowEffect.style.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)';
        glowEffect.style.pointerEvents = 'none';
        glowEffect.style.zIndex = '10000';
        glowEffect.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
        
        const rect = aiButton.getBoundingClientRect();
        glowEffect.style.left = `${rect.left - 10}px`;
        glowEffect.style.top = `${rect.top - 10}px`;
        document.body.appendChild(glowEffect);
        
        // Remover efeitos após 4 segundos
        setTimeout(() => {
          aiButton.style.transform = '';
          aiButton.style.boxShadow = '';
          aiButton.style.zIndex = '';
          aiButton.classList.remove('animate-pulse');
          if (glowEffect.parentNode) {
            glowEffect.parentNode.removeChild(glowEffect);
          }
        }, 4000);
        
        // Adicionar um segundo destaque após 2 segundos
        setTimeout(() => {
          aiButton.style.transform = 'scale(1.2)';
          setTimeout(() => {
            aiButton.style.transform = '';
          }, 500);
        }, 2000);
      }
    }, 300);
  };

  if (!isMounted || !showModal) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          onClick={() => handleClose(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com gradiente */}
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-6 md:p-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Assistente IA</h2>
                      <p className="text-blue-100 text-xs sm:text-sm">Nova funcionalidade disponível!</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClose(false)}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                
                <p className="text-sm sm:text-base md:text-lg text-blue-50 leading-relaxed">
                  Agora você pode criar agendamentos, consultar informações e muito mais através de uma conversa natural com nossa Inteligência Artificial!
                </p>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 md:space-y-6">
              {/* Funcionalidades */}
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">Criar Agendamentos</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      "Criar agendamento para João às 14h de amanhã"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-indigo-50 rounded-lg sm:rounded-xl border border-indigo-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">Consultar Estatísticas</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      "Quanto recebi este mês?" ou "Quantos agendamentos temos hoje?"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-purple-50 rounded-lg sm:rounded-xl border border-purple-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">Buscar Informações</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      "Próximo agendamento da Maria" ou "Agendamentos de quarta-feira"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-yellow-50 rounded-lg sm:rounded-xl border border-yellow-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">Respostas Instantâneas</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Interface conversacional intuitiva e rápida
                    </p>
                  </div>
                </div>
              </div>

              {/* Como usar */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  Como usar
                </h3>
                <ol className="space-y-2 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
                    <span>Procure o botão flutuante com o ícone de estrelas (✨) no canto inferior direito da tela</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
                    <span>Clique nele para abrir o assistente IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
                    <span>Digite sua pergunta ou solicitação de forma natural e a IA entenderá automaticamente</span>
                  </li>
                </ol>
              </div>

              {/* Destaque do botão */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 text-white">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg mb-1">Experimente agora!</h3>
                    <p className="text-blue-50 text-xs sm:text-sm">
                      O botão está sempre disponível no canto inferior direito de todas as páginas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => handleClose(true)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 text-slate-700 rounded-lg sm:rounded-xl font-semibold hover:bg-slate-200 transition-colors text-sm sm:text-base"
              >
                Não mostrar novamente
              </button>
              <button
                onClick={handleTryNow}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse hover:animate-none text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Mostrar onde está</span>
                <span className="sm:hidden">Mostrar</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

