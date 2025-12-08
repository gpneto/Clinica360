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
  Sparkles as SparklesIcon
} from 'lucide-react';
import { showError, showSuccess } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export default function SignIn() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, needsCompanySetup, companyId } = useAuth();
  const isRedirectingRef = useRef(false);


  // Redirecionar se já estiver autenticado ao carregar a página
  useEffect(() => {
    const normalizedPathname = pathname?.replace(/\/$/, '') || '';
    const isSignInPage = normalizedPathname === '/signin';

    // Só processar se estivermos na página signin e não estiver redirecionando
    if (!isSignInPage || isRedirectingRef.current) {
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
    { icon: HeartPulse, name: 'Fisioterapia', color: 'text-emerald-600' },
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
      title: 'Clínica 360',
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Clínica 360</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  router.push('/login');
                }}
                className="text-slate-700 hover:text-slate-900"
              >
                Entrar
              </Button>
              <Button
                onClick={() => {
                  router.push('/login');
                }}
                className="bg-slate-900 text-white hover:bg-slate-800"
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-700 mb-6"
              >
                <Zap className="w-4 h-4 text-slate-600" />
                Sistema completo de gestão de agendamentos
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight"
              >
                Organize sua clínica ou{' '}
                <span className="text-slate-600">consultório</span> de forma inteligente
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-xl text-slate-600 mb-8 max-w-xl mx-auto leading-relaxed"
              >
                Plataforma completa para gestão de agendamentos, pacientes e finanças. Ideal para profissionais de saúde, beleza e demais profissionais.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              >
                <Button
                  onClick={() => {
                    router.push('/login');
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 h-12 px-8 text-lg font-semibold shadow-lg"
                >
                  Começar agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section');
                    featuresSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 text-lg font-semibold"
                >
                  Saiba mais
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap items-center gap-6 justify-center text-sm text-slate-600"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Comece seu teste</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Sem necessidade de cartão</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
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
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-1"
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6 backdrop-blur-sm"
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
                    <span className="text-yellow-300">Inteligência Artificial</span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl text-blue-50 mb-8 leading-relaxed"
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
                      <div className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Crie agendamentos por voz ou texto</p>
                        <p className="text-blue-50 text-sm">"Criar agendamento para João às 14h de amanhã"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Consulte informações rapidamente</p>
                        <p className="text-blue-50 text-sm">"Quantos agendamentos temos hoje?" ou "Quanto recebi este mês?"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Disponível em todas as páginas</p>
                        <p className="text-blue-50 text-sm">Botão flutuante sempre acessível, onde você estiver no sistema</p>
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
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                      <Zap className="w-5 h-5 text-yellow-300" />
                      <span className="font-medium">Respostas instantâneas</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                      <Shield className="w-5 h-5 text-yellow-300" />
                      <span className="font-medium">100% seguro</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                      <MessageSquare className="w-5 h-5 text-yellow-300" />
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
                          <p className="text-sm text-slate-700">
                            Olá! Sou seu assistente inteligente. Posso ajudar você a criar agendamentos, 
                            buscar informações, consultar estatísticas e muito mais. Como posso ajudar?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-blue-500 rounded-lg p-4 max-w-[80%]">
                          <p className="text-sm text-white">
                            Criar agendamento para Maria às 15h de amanhã
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-slate-600" />
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white/90 rounded-lg p-4 flex-1">
                          <p className="text-sm text-slate-700 mb-2">
                            ✅ Agendamento criado com sucesso!
                          </p>
                          <div className="text-xs text-slate-600 space-y-1">
                            <p><strong>Paciente:</strong> Maria Silva</p>
                            <p><strong>Data:</strong> Amanhã às 15:00</p>
                            <p><strong>Status:</strong> Agendado</p>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/20 pt-4">
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                          <input
                            type="text"
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
                            disabled
                          />
                          <button className="w-8 h-8 bg-yellow-300 rounded-lg flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-300/20 rounded-full blur-2xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl"></div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Professionals Section */}
        <section className="py-20 bg-slate-50 rounded-3xl mb-20">
          <div className="px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Ideal para diversos profissionais
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Sistema completo adaptado para diferentes áreas de saúde e beleza
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              {professionals.map((professional, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 text-center border border-slate-200 hover:shadow-lg transition-all cursor-default"
                >
                  <professional.icon className={`w-8 h-8 ${professional.color} mx-auto mb-3`} />
                  <p className="text-sm font-medium text-slate-700">{professional.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-20 mb-20 bg-gradient-to-b from-slate-50 to-white">
          <div className="px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Conheça o sistema
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Veja na prática como o Clínica 360 pode transformar a gestão do seu negócio
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-agenda.svg" alt="Agenda Inteligente" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Agenda Inteligente</h3>
                    <p className="text-sm text-slate-600">Visualize agendamentos em diferentes formatos: dia, semana ou mês</p>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-pacientes.png" alt="Gestão de Pacientes" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Gestão de Pacientes</h3>
                    <p className="text-sm text-slate-600">Prontuários digitais completos com histórico de atendimentos</p>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-financeiro.svg" alt="Controle Financeiro" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Controle Financeiro</h3>
                    <p className="text-sm text-slate-600">Acompanhe receitas, débitos e gere relatórios completos</p>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-profissionais.svg" alt="Multi-profissionais" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Multi-profissionais</h3>
                    <p className="text-sm text-slate-600">Agendas individuais para cada profissional da sua clínica</p>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-lembretes.svg" alt="Lembretes Automáticos" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Lembretes Automáticos</h3>
                    <p className="text-sm text-slate-600">Reduza faltas com lembretes automáticos via WhatsApp</p>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <img src="/images/screenshot-mobile.svg" alt="100% Responsivo" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-2">100% Responsivo</h3>
                    <p className="text-sm text-slate-600">Use no celular, tablet ou computador com a mesma qualidade</p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
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
                  "rounded-xl p-8 border transition-all relative overflow-hidden",
                  feature.highlight
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-500 shadow-2xl hover:shadow-blue-500/50"
                    : "bg-white border-slate-200 hover:shadow-xl"
                )}
              >
                {feature.highlight && (
                  <div className="absolute top-0 right-0 bg-yellow-300 text-blue-600 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    NOVO
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
                  feature.highlight
                    ? "bg-white/20 backdrop-blur-sm"
                    : "bg-slate-100"
                )}>
                  <feature.icon className={cn(
                    "w-6 h-6",
                    feature.highlight ? "text-yellow-300" : "text-slate-700"
                  )} />
                </div>
                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  feature.highlight ? "text-white" : "text-slate-900"
                )}>
                  {feature.title}
                </h3>
                <p className={cn(
                  "leading-relaxed",
                  feature.highlight ? "text-blue-50" : "text-slate-600"
                )}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-slate-900 rounded-3xl mb-20 text-white">
          <div className="px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
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
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{step.description}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Resultados que fazem a diferença
              </h2>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Veja os benefícios que profissionais como você estão alcançando com o Clínica 360
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
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <span className="text-lg text-slate-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 lg:p-12"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">40%</p>
                    <p className="text-slate-600">Redução de faltas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">50%</p>
                    <p className="text-slate-600">Mais tempo livre</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">100%</p>
                    <p className="text-slate-600">Clientes organizados</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 mb-20 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl text-white">
          <div className="text-center px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto para transformar sua gestão?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Comece seu teste hoje mesmo e experimente todas as funcionalidades
              </p>
              <Button
                onClick={() => {
                  const loginSection = document.getElementById('login-section');
                  loginSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg font-semibold shadow-lg"
              >
                Começar seu teste
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">Clínica 360</span>
            </div>
            <p className="text-sm text-slate-600 text-center">
              © {new Date().getFullYear()} Clínica 360. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
