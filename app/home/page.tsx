'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { handleGoogleRedirect } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Shield,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  User as UserIcon,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  FileText,
  BarChart3,
  Smartphone,
  Cloud,
  Zap,
  HeartPulse,
  Stethoscope,
  Scissors,
  Syringe,
  Briefcase,
  Palette,
  Sparkles as SparklesIcon,
  MessageCircle
} from 'lucide-react';
import { showError, showSuccess } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
// Usando img ao invés de Image para compatibilidade com output: 'export'

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, needsCompanySetup, companyId } = useAuth();
  const isRedirectingRef = useRef(false);

  // Função helper para redirecionamento baseado no ambiente
  const handleLoginRedirect = () => {
    if (process.env.NODE_ENV === 'production') {
      window.location.href = 'https://texai.online/';
    } else {
      router.push('/login');
    }
  };


  // Redirecionar se já estiver autenticado ao carregar a página
  useEffect(() => {
    const normalizedPathname = pathname?.replace(/\/$/, '') || '';
    const isHomePage = normalizedPathname === '/home';

    // Só processar se estivermos na página home e não estiver redirecionando
    if (!isHomePage || isRedirectingRef.current) {
      return;
    }

    // Se já está autenticado e o contexto está pronto, redirecionar
    if (!authLoading && user && companyId) {
      if (needsCompanySetup) {
        isRedirectingRef.current = true;
        window.location.href = '/setup';
      } else {
        isRedirectingRef.current = true;
        window.location.href = '/';
      }
    }
  }, [user, authLoading, needsCompanySetup, companyId, pathname]);

  const professionals = [
    { icon: Stethoscope, name: 'Clinicas Odontológicas', color: 'text-blue-600' },
    { icon: HeartPulse, name: 'Clínicas Médicas', color: 'text-red-600' },
    { icon: Scissors, name: 'Salões de Beleza', color: 'text-pink-600' },
    { icon: Syringe, name: 'Clínicas Estéticas', color: 'text-purple-600' },
    { icon: Palette, name: 'Barbearias', color: 'text-indigo-600' },
    { icon: Briefcase, name: 'Profissionais Autônomos', color: 'text-cyan-600' },
    { icon: SparklesIcon, name: 'Estúdios de Tatuagem', color: 'text-rose-600' },
    { icon: HeartPulse, name: 'Fisioterapia', color: '#89bf47' },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'Assistente IA Inteligente',
      description: 'Converse naturalmente com nosso assistente IA para criar agendamentos, consultar informações e muito mais. Disponível em todas as páginas.',
      highlight: true,
    },
    {
      icon: Calendar,
      title: 'AllOne',
      description: 'Sistema de agenda completo com múltiplos profissionais e visualizações personalizadas.',
    },
    {
      icon: Users,
      title: 'Gestão Multi-profissionais',
      description: 'Gerencie diversos profissionais em uma única plataforma com agendas individuais.',
    },
    {
      icon: MessageSquare,
      title: 'Lembretes Automáticos',
      description: 'Notificações via WhatsApp para confirmar e lembrar agendamentos automaticamente.',
    },
    {
      icon: BarChart3,
      title: 'Controle Financeiro',
      description: 'Acompanhe receitas, débitos de pacientes e relatórios financeiros completos.',
    },
    {
      icon: FileText,
      title: 'Prontuários Digitais',
      description: 'Registre anamneses, evoluções e histórico completo de cada paciente.',
    },
    {
      icon: Smartphone,
      title: '100% Responsivo',
      description: 'Acesse de qualquer dispositivo, desktop, tablet ou smartphone.',
    },
  ];

  const benefits = [
    'Redução de faltas em até 40%',
    'Aumento na organização e produtividade',
    'Gestão financeira integrada',
    'Histórico completo do paciente',
    'Interface intuitiva e fácil de usar',
    'Suporte e atualizações contínuas',
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Crie sua conta',
      description: 'Comece seu teste e configure sua empresa em poucos minutos.',
    },
    {
      step: '2',
      title: 'Configure profissionais e serviços',
      description: 'Adicione seus profissionais, serviços e horários de funcionamento.',
    },
    {
      step: '3',
      title: 'Comece a agendar',
      description: 'Inicie os agendamentos e aproveite todas as funcionalidades do sistema.',
    },
  ];

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: '#f0f9f0',
        backgroundImage: 'radial-gradient(circle, rgba(137, 191, 71, 0.1) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#89bf47' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: '#f0f9f0',
      backgroundImage: 'radial-gradient(circle, rgba(137, 191, 71, 0.12) 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }}>
      {/* Navigation Bar */}
      <nav className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#89bf47' }}>
                <img 
                  src="/logo-texai.png" 
                  alt="TexAi Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold" style={{ color: '#89bf47' }}>TexAi Brasil - AllOne</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleLoginRedirect}
                style={{ color: '#89bf47' }}
                className="hover:bg-opacity-10"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 191, 71, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Entrar
              </Button>
              <Button
                onClick={handleLoginRedirect}
                className="text-white border"
                style={{ 
                  background: '#89bf47',
                  borderColor: '#89bf47'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7aad3f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#89bf47'}
              >
                Começar teste
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="max-w-4xl mx-auto">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border"
                style={{ 
                  background: 'rgba(137, 191, 71, 0.1)',
                  color: '#89bf47',
                  borderColor: 'rgba(137, 191, 71, 0.3)'
                }}
              >
                <Zap className="w-4 h-4" style={{ color: '#89bf47' }} />
                Sistema completo de gestão de agendamentos
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-6 leading-tight"
              >
                Simplifique seu dia.{' '}
                <span style={{ color: '#89bf47' }}>Agende aqui!</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-xl text-gray-700 mb-8 max-w-xl mx-auto leading-relaxed"
              >
                Plataforma completa para{' '}
                <span className="font-semibold" style={{ color: '#89bf47' }}>gestão de agendamentos,</span>{' '}
                pacientes e finanças.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              >
                <Button
                  onClick={handleLoginRedirect}
                  className="text-white h-12 px-8 text-lg font-semibold shadow-lg border"
                  style={{ 
                    background: '#89bf47',
                    borderColor: '#89bf47'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7aad3f'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#89bf47'}
                >
                  Experimente agora!
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section');
                    featuresSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-2 h-12 px-8 text-lg font-semibold bg-white"
                  style={{ 
                    borderColor: 'rgba(137, 191, 71, 0.5)',
                    color: '#89bf47'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 191, 71, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Saiba mais
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap items-center gap-6 justify-center text-sm text-gray-600"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#89bf47' }} />
                  <span>Comece seu teste</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#89bf47' }} />
                  <span>Sem necessidade de cartão</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#89bf47' }} />
                  <span>Setup em minutos</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* AI Assistant Feature - Destaque */}
        <section className="py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl p-1"
            style={{ background: 'linear-gradient(to bottom right, #a8d470, #89bf47, #7aad3f)' }}
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Side - Content */}
                <div className="text-white">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white/30"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>NOVO: Assistente Inteligente com IA</span>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
                  >
                    Agende, consulte e gerencie tudo com{' '}
                    <span className="text-yellow-200">Inteligência Artificial</span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl mb-8 leading-relaxed"
                    style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                  >
                    Converse naturalmente com nosso assistente IA. Crie agendamentos, busque informações, 
                    consulte estatísticas e muito mais - tudo através de uma conversa simples e intuitiva.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="space-y-4 mb-8"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#89bf47' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Crie agendamentos por voz ou texto</p>
                        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>"Criar agendamento para João às 14h de amanhã"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#89bf47' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Consulte informações rapidamente</p>
                        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>"Quantos agendamentos temos hoje?" ou "Quanto recebi este mês?"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#89bf47' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Disponível em todas as páginas</p>
                        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Botão flutuante sempre acessível, onde você estiver no sistema</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-wrap items-center gap-4"
                  >
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                      <Zap className="w-5 h-5 text-yellow-200" />
                      <span className="font-medium">Respostas instantâneas</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                      <Shield className="w-5 h-5 text-yellow-200" />
                      <span className="font-medium">100% seguro</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                      <MessageSquare className="w-5 h-5 text-yellow-200" />
                      <span className="font-medium">Interface conversacional</span>
                    </div>
                  </motion.div>
                </div>

                {/* Right Side - Visual */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="relative"
                >
                  <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
                    {/* Simulação de chat da IA */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white/90 rounded-lg p-4 flex-1">
                          <p className="text-sm text-gray-700">
                            Olá! Sou seu assistente inteligente. Posso ajudar você a criar agendamentos, 
                            buscar informações, consultar estatísticas e muito mais. Como posso ajudar?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 justify-end">
                        <div className="rounded-lg p-4 max-w-[80%]" style={{ background: '#89bf47' }}>
                          <p className="text-sm text-white">
                            Criar agendamento para Maria às 15h de amanhã
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #a8d470, #89bf47)' }}>
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white/90 rounded-lg p-4 flex-1">
                          <p className="text-sm text-gray-700 mb-2">
                            ✅ Agendamento criado com sucesso!
                          </p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>Paciente:</strong> Maria Silva</p>
                            <p><strong>Data:</strong> Amanhã às 15:00</p>
                            <p><strong>Status:</strong> Agendado</p>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/20 pt-4">
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3 border border-white/30">
                          <input
                            type="text"
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
                            disabled
                          />
                          <button className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center">
                            <ArrowRight className="w-4 h-4" style={{ color: '#89bf47' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-200/20 rounded-full blur-2xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-3xl" style={{ background: 'rgba(137, 191, 71, 0.2)' }}></div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Professionals Section */}
        <section className="py-20 bg-white/60 rounded-3xl mb-20 border" style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}>
          <div className="px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Nosso software é ideal para diversos profissionais!
              </h2>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Sistema completo adaptado para diferentes áreas de saúde e beleza!
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {professionals.map((professional, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 text-center border-2 hover:shadow-lg transition-all cursor-default"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}
                >
                  <professional.icon className="w-8 h-8 mx-auto mb-3" style={{ color: '#89bf47' }} />
                  <p className="text-sm font-medium text-gray-700">{professional.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-20 mb-20 bg-white/40">
          <div className="px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Conheça o sistema
              </h2>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Veja na prática como o AllOne pode transformar a gestão do seu negócio
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Screenshot 1 - Agenda */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-agenda.svg" alt="Agenda Inteligente" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Agenda Inteligente</h3>
                    <p className="text-sm text-gray-600">Visualize agendamentos em diferentes formatos: dia, semana ou mês</p>
                  </div>
                </div>
              </motion.div>

              {/* Screenshot 2 - Gestão de Pacientes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-pacientes.png" alt="Gestão de Pacientes" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Gestão de Pacientes</h3>
                    <p className="text-sm text-gray-600">Prontuários digitais completos com histórico de atendimentos</p>
                  </div>
                </div>
              </motion.div>

              {/* Screenshot 3 - Controle Financeiro */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-financeiro.svg" alt="Controle Financeiro" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Controle Financeiro</h3>
                    <p className="text-sm text-gray-600">Acompanhe receitas, débitos e gere relatórios completos</p>
                  </div>
                </div>
              </motion.div>

              {/* Screenshot 4 - Multi-profissionais */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-profissionais.svg" alt="Multi-profissionais" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Multi-profissionais</h3>
                    <p className="text-sm text-gray-600">Agendas individuais para cada profissional da sua clínica</p>
                  </div>
                </div>
              </motion.div>

              {/* Screenshot 5 - Lembretes Automáticos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-lembretes.svg" alt="Lembretes Automáticos" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Lembretes Automáticos</h3>
                    <p className="text-sm text-gray-600">Reduza faltas com lembretes automáticos via WhatsApp</p>
                  </div>
                </div>
              </motion.div>

              {/* Screenshot 6 - Mobile Responsivo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all"
                  style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)'}>
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-mobile.svg" alt="100% Responsivo" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-2">100% Responsivo</h3>
                    <p className="text-sm text-gray-600">Use no celular, tablet ou computador com a mesma qualidade</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Funcionalidades completas para gestão eficiente do seu negócio
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={cn(
                  "rounded-xl p-8 border-2 transition-all relative overflow-hidden",
                  feature.highlight ? "text-white shadow-2xl" : "bg-white hover:shadow-xl"
                )}
                style={feature.highlight ? {
                  background: 'linear-gradient(to bottom right, #89bf47, #7aad3f)',
                  borderColor: 'rgba(137, 191, 71, 0.5)'
                } : {
                  borderColor: 'rgba(137, 191, 71, 0.3)'
                }}
                onMouseEnter={!feature.highlight ? (e) => {
                  e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)';
                } : undefined}
                onMouseLeave={!feature.highlight ? (e) => {
                  e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)';
                } : undefined}
              >
                {feature.highlight && (
                  <div className="absolute top-0 right-0 bg-yellow-200 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ color: '#5a8a2f' }}>
                    NOVO
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
                  feature.highlight ? "bg-white/20 backdrop-blur-sm" : ""
                )}
                style={!feature.highlight ? { background: 'rgba(137, 191, 71, 0.1)' } : {}}
                >
                  <feature.icon className={cn("w-6 h-6")}
                    style={feature.highlight ? { color: '#fef08a' } : { color: '#89bf47' }}
                  />
                </div>
                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  feature.highlight ? "text-white" : "text-gray-800"
                )}>
                  {feature.title}
                </h3>
                <p className="leading-relaxed"
                  style={feature.highlight ? { color: 'rgba(255, 255, 255, 0.95)' } : { color: '#4b5563' }}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 rounded-3xl mb-20 text-white" style={{ background: 'linear-gradient(to bottom right, #89bf47, #7aad3f)' }}>
          <div className="px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
              <p className="text-xl max-w-2xl mx-auto" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                Configure sua conta e comece a usar em minutos
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold border border-white/30">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                Resultados que fazem a diferença
              </h2>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Veja os benefícios que profissionais como você estão alcançando com o AllOne
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: '#89bf47' }} />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl p-8 lg:p-12 border-2"
              style={{ 
                background: 'linear-gradient(to bottom right, rgba(137, 191, 71, 0.1), rgba(137, 191, 71, 0.15))',
                borderColor: 'rgba(137, 191, 71, 0.3)'
              }}
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#89bf47' }}>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-800">40%</p>
                    <p className="text-gray-600">Redução de faltas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#89bf47' }}>
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-800">50%</p>
                    <p className="text-gray-600">Mais tempo livre</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#89bf47' }}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-800">100%</p>
                    <p className="text-gray-600">Clientes organizados</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho da sua equipe
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano 1 - 1 a 3 usuários */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl p-8 border-2 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full"
              style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)';
              }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(137, 191, 71, 0.1)' }}>
                  <Users className="w-8 h-8" style={{ color: '#89bf47' }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Plano Básico</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold" style={{ color: '#89bf47' }}>R$ 97</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-sm">1 a 3 usuários</p>
              </div>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Até 3 usuários</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Todas as funcionalidades</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Suporte completo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Atualizações gratuitas</span>
                </li>
              </ul>

              <Button
                onClick={handleLoginRedirect}
                className="w-full h-12 font-semibold mt-auto"
                style={{ 
                  background: '#89bf47',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7aad3f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#89bf47'}
              >
                Começar agora
              </Button>
            </motion.div>

            {/* Plano 2 - 4 a 7 usuários */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl p-8 border-2 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden flex flex-col h-full"
              style={{ 
                borderColor: '#89bf47',
                borderWidth: '3px'
              }}
            >
              {/* Badge de destaque */}
              <div className="absolute top-0 right-0 bg-yellow-200 text-xs font-bold px-4 py-1 rounded-bl-lg" style={{ color: '#5a8a2f' }}>
                MAIS POPULAR
              </div>
              
              <div className="text-center mb-6 mt-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: '#89bf47' }}>
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Plano Profissional</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold" style={{ color: '#89bf47' }}>R$ 297</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-sm">4 a 7 usuários</p>
              </div>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Até 7 usuários</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Todas as funcionalidades</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Suporte prioritário</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Atualizações gratuitas</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Treinamento personalizado</span>
                </li>
              </ul>

              <Button
                onClick={handleLoginRedirect}
                className="w-full h-12 font-semibold text-white mt-auto"
                style={{ 
                  background: '#89bf47',
                  borderColor: '#89bf47'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7aad3f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#89bf47'}
              >
                Começar agora
              </Button>
            </motion.div>

            {/* Plano 3 - Acima de 7 usuários */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl p-8 border-2 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full"
              style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(137, 191, 71, 0.3)';
              }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(137, 191, 71, 0.1)' }}>
                  <MessageCircle className="w-8 h-8" style={{ color: '#89bf47' }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Plano Enterprise</h3>
              
                <p className="text-gray-600 text-sm mb-1">Acima de 7 usuários</p>
                <p className="text-gray-500 text-xs">consulta</p>
              </div>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Usuários ilimitados</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Todas as funcionalidades</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Suporte dedicado</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Customizações</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#89bf47' }} />
                  <span className="text-gray-700 text-sm">Preço personalizado</span>
                </li>
              </ul>

              <Button
                onClick={() => {
                  // Abrir WhatsApp ou link de contato
                  window.open('https://wa.me/5551995279117?text=Olá! Gostaria de saber mais sobre o plano Enterprise para mais de 7 usuários.', '_blank');
                }}
                className="w-full h-12 font-semibold border-2 mt-auto"
                style={{ 
                  background: 'white',
                  color: '#89bf47',
                  borderColor: '#89bf47'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(137, 191, 71, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <MessageCircle className="w-5 h-5 mr-2 inline" />
                Falar no WhatsApp
              </Button>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 mb-20 rounded-3xl text-white relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #89bf47, #7aad3f)' }}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          <div className="text-center px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto para transformar sua gestão?
              </h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                Comece seu teste hoje mesmo e experimente todas as funcionalidades
              </p>
              <Button
                onClick={handleLoginRedirect}
                className="bg-white h-14 px-8 text-lg font-semibold shadow-lg border"
                style={{ 
                  color: '#89bf47',
                  borderColor: 'rgba(137, 191, 71, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 191, 71, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Entre, agende e surpreenda-se!
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/90 py-12" style={{ borderColor: 'rgba(137, 191, 71, 0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #89bf47, #7aad3f)' }}>
                <img 
                  src="/logo-texai.png" 
                  alt="TexAi Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold" style={{ color: '#89bf47' }}>AllOne</span>
            </div>
            <p className="text-sm text-gray-600 text-center">
              © {new Date().getFullYear()} AllOne. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

