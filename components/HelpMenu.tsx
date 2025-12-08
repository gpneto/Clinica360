'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  X,
  Calendar,
  Users,
  MessageCircle,
  Sparkles,
  BarChart3,
  Settings,
  UserCheck,
  Package,
  FileText,
  CreditCard,
  Building2,
  HeartPulse,
  Clock,
  DollarSign,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Gift,
  Phone,
  Mail,
  MapPin,
  Repeat,
  Shield,
  RefreshCw,
  Image as ImageIcon,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  features: HelpFeature[];
}

interface HelpFeature {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  access?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard (Página Inicial)',
    icon: LayoutDashboard,
    description: 'Visão geral do dia com agendamentos, estatísticas e aniversariantes',
    features: [
      {
        title: 'Resumo do Dia',
        description: 'Visualize todos os agendamentos do dia atual, estatísticas e informações importantes',
        steps: [
          'Acesse a página inicial clicando em "Inicial" no menu lateral',
          'Veja os agendamentos do dia organizados por horário',
          'Acompanhe estatísticas: total de agendamentos, concluídos, receita do dia',
          'Visualize aniversariantes do dia com idade calculada automaticamente',
        ],
        tips: [
          'Use o botão de olho para mostrar/ocultar valores monetários',
          'Clique em um agendamento para ver detalhes completos',
          'Acesse a agenda completa clicando em "Ver todos"',
        ],
        access: ['owner', 'admin', 'pro', 'atendente', 'outro'],
      },
      {
        title: 'Estatísticas Gerais',
        description: 'Acompanhe receita dos últimos 30 dias, total de atendimentos e pacientes',
        steps: [
          'Visualize receita total dos últimos 30 dias',
          'Veja quantidade de atendimentos concluídos',
          'Acompanhe total de pacientes cadastrados',
        ],
      },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda',
    icon: Calendar,
    description: 'Sistema completo de agendamento com múltiplas visualizações e filtros avançados',
    features: [
      {
        title: 'Visualizações do Calendário',
        description: 'Visualize sua agenda em diferentes formatos: dia, semana ou mês',
        steps: [
          'Use os botões "Dia", "Semana" ou "Mês" no topo da agenda',
          'Navegue entre períodos usando as setas ou clicando diretamente nas datas',
          'Alterne entre visualização em grade (calendário) ou lista',
        ],
        tips: [
          'A visualização escolhida é salva automaticamente',
          'No modo lista, veja apenas os agendamentos do dia atual',
          'Use o scroll para navegar entre semanas/meses',
        ],
      },
      {
        title: 'Criar Agendamento',
        description: 'Crie novos agendamentos de forma rápida e intuitiva',
        steps: [
          'Clique no botão "Novo agendamento" ou clique diretamente em um horário no calendário',
          'Selecione o profissional responsável',
          'Escolha o paciente (ou crie um novo)',
          'Selecione um ou múltiplos serviços',
          'Defina data, horário e duração',
          'Configure preço e comissão (se aplicável)',
          'Adicione observações se necessário',
          'Marque se deseja enviar notificação ao paciente',
          'Clique em "Salvar"',
        ],
        tips: [
          'O sistema valida automaticamente conflitos de horário',
          'Você pode criar agendamentos recorrentes usando a opção de recorrência',
          'Aniversários de pacientes aparecem automaticamente no calendário',
        ],
      },
      {
        title: 'Editar Agendamento',
        description: 'Modifique agendamentos existentes',
        steps: [
          'Clique em um agendamento no calendário',
          'Faça as alterações necessárias',
          'Escolha se deseja enviar notificação sobre a mudança',
          'Salve as alterações',
        ],
      },
      {
        title: 'Bloquear Horários',
        description: 'Bloqueie horários para férias, eventos ou indisponibilidade',
        steps: [
          'Crie um novo agendamento',
          'Marque como "Bloqueio de agenda"',
          'Escolha se o bloqueio é para um profissional específico ou todos',
          'Defina data, horário e descrição',
          'Salve o bloqueio',
        ],
        tips: [
          'Bloqueios aparecem em roxo no calendário',
          'Use bloqueios para marcar feriados ou eventos especiais',
        ],
      },
      {
        title: 'Filtros Avançados',
        description: 'Use filtros para encontrar agendamentos específicos',
        steps: [
          'Clique no botão de filtros (ícone de funil)',
          'Selecione profissionais, serviços, pacientes ou status',
          'Defina intervalo de datas',
          'Configure faixa de preço',
          'Aplique os filtros',
        ],
        tips: [
          'Você pode combinar múltiplos filtros',
          'Use "Limpar filtros" para resetar',
        ],
      },
      {
        title: 'Status de Agendamentos',
        description: 'Gerencie o status dos agendamentos',
        steps: [
          'Agendado: agendamento criado, aguardando confirmação',
          'Confirmado: paciente confirmou presença',
          'Concluído: atendimento realizado com sucesso',
          'Cancelado: agendamento cancelado',
          'Não Compareceu: paciente faltou ao atendimento',
        ],
        tips: [
          'Ao concluir um agendamento, informe valor pago e forma de pagamento',
          'Marque se o cliente compareceu ou não',
        ],
      },
      {
        title: 'Agendamentos Recorrentes',
        description: 'Crie agendamentos que se repetem automaticamente',
        steps: [
          'Ao criar um agendamento, ative a opção de recorrência',
          'Escolha a frequência: diária, semanal, quinzenal ou mensal',
          'Defina data de término da recorrência',
          'Salve o agendamento',
        ],
        tips: [
          'Você pode editar ou cancelar toda a série de agendamentos',
          'Cada agendamento da série pode ser modificado individualmente',
        ],
      },
    ],
  },
  {
    id: 'pacientes',
    title: 'Pacientes',
    icon: HeartPulse,
    description: 'Gestão completa da base de pacientes com histórico e documentos',
    features: [
      {
        title: 'Cadastrar Paciente',
        description: 'Adicione novos pacientes ao sistema',
        steps: [
          'Clique em "Pacientes" no menu lateral',
          'Clique no botão "Novo Paciente"',
          'Preencha nome completo (obrigatório)',
          'Informe telefone (obrigatório)',
          'Adicione e-mail (opcional)',
          'Informe CPF (opcional)',
          'Defina data de nascimento (opcional - aparece no calendário como aniversário)',
          'Escolha preferência de notificação: WhatsApp, SMS ou E-mail',
          'Adicione anamnese inicial se necessário',
          'Salve o paciente',
        ],
        tips: [
          'O telefone deve estar no formato E.164 (ex: +5511999999999)',
          'A data de nascimento faz o aniversário aparecer automaticamente no calendário',
          'A preferência de notificação é usada para envio automático de lembretes',
        ],
      },
      {
        title: 'Buscar Paciente',
        description: 'Encontre pacientes rapidamente',
        steps: [
          'Use a barra de busca no topo da lista de pacientes',
          'Digite nome, telefone ou e-mail',
          'Os resultados são filtrados em tempo real',
        ],
      },
      {
        title: 'Ficha Completa do Paciente',
        description: 'Acesse todas as informações e histórico do paciente',
        steps: [
          'Clique em um paciente na lista ou clique em "Ver ficha"',
          'Visualize todas as abas disponíveis',
        ],
        access: ['owner', 'admin', 'atendente', 'outro'],
      },
      {
        title: 'Abas da Ficha do Paciente',
        description: 'Organize todas as informações do paciente em abas',
        steps: [
          'Dados do Paciente: Informações pessoais e de contato',
          'Anamnese: Visualize anamneses existentes, crie novas usando modelos pré-configurados, edite ou exclua anamneses, assine anamneses digitalmente',
          'Evoluções: Adicione novas evoluções com data e descrição, visualize histórico completo de evoluções, edite ou exclua evoluções',
          'Consultas: Veja todas as consultas do paciente, acesse detalhes de cada consulta, visualize status e valores',
          'Orçamentos: Crie novos orçamentos, adicione procedimentos e valores, envie orçamento por WhatsApp ou e-mail, gere link compartilhável, assine orçamentos digitalmente',
          'Financeiro: Visualize débitos pendentes, registre novos débitos, registre pagamentos, acompanhe histórico financeiro',
          'Documentos: Faça upload de documentos, organize por categorias, visualize e baixe documentos, exclua documentos quando necessário',
          'Interações: Veja todas as mensagens enviadas, acompanhe interações via WhatsApp, visualize histórico de comunicações',
        ],
      },
    ],
  },
  {
    id: 'mensagens',
    title: 'Mensagens',
    icon: MessageCircle,
    description: 'Central de mensagens WhatsApp com histórico completo',
    features: [
      {
        title: 'Visualizar Conversas',
        description: 'Acesse todas as conversas do WhatsApp',
        steps: [
          'Clique em "Mensagens" no menu lateral',
          'Veja lista de contatos com mensagens',
          'Clique em um contato para ver a conversa',
        ],
        tips: [
          'As conversas são sincronizadas automaticamente',
          'Mensagens automáticas são marcadas com ícone de bot',
        ],
      },
      {
        title: 'Enviar Mensagem',
        description: 'Envie mensagens diretamente pelo sistema',
        steps: [
          'Selecione um contato',
          'Digite sua mensagem no campo inferior',
          'Pressione Enter ou clique no botão de enviar',
        ],
        tips: [
          'Você pode enviar texto, imagens, vídeos e documentos',
          'Mensagens enviadas manualmente são marcadas como "Manual"',
        ],
      },
      {
        title: 'Sincronizar Contatos',
        description: 'Atualize lista de contatos e fotos',
        steps: [
          'Clique no botão "Sincronizar" no topo da lista',
          'Aguarde a sincronização completar',
          'Fotos e nomes serão atualizados',
        ],
      },
      {
        title: 'Filtrar Mensagens Automáticas',
        description: 'Veja apenas mensagens enviadas automaticamente pelo sistema',
        steps: [
          'Marque a opção "Apenas mensagens automáticas"',
          'A lista será filtrada automaticamente',
        ],
      },
    ],
  },
  {
    id: 'assistente-ia',
    title: 'Assistente IA',
    icon: Sparkles,
    description: 'Assistente inteligente para ajudar com tarefas do sistema',
    features: [
      {
        title: 'Usar Assistente IA',
        description: 'Converse com o assistente para criar agendamentos, consultar informações e mais',
        steps: [
          'Clique no botão flutuante do assistente (ícone de estrelas)',
          'Digite sua pergunta ou solicitação',
          'O assistente responderá e pode executar ações',
        ],
        tips: [
          'Você pode pedir para criar agendamentos',
          'Pergunte sobre pacientes, serviços ou profissionais',
          'Peça estatísticas e relatórios',
          'O assistente está disponível em todas as páginas',
        ],
      },
      {
        title: 'Exemplos de Uso',
        description: 'Veja o que você pode fazer com o assistente',
        steps: [
          '"Criar agendamento para João Silva amanhã às 14h"',
          '"Quantos pacientes temos cadastrados?"',
          '"Mostrar agendamentos de hoje"',
          '"Qual a receita do mês?"',
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    title: 'Relatórios Financeiros',
    icon: BarChart3,
    description: 'Relatórios detalhados de receita, comissões e repasses',
    features: [
      {
        title: 'Relatórios por Período',
        description: 'Visualize relatórios semanais ou mensais',
        steps: [
          'Clique em "Relatórios" no menu lateral',
          'Escolha entre "Semanal" ou "Mensal"',
          'Selecione a semana ou mês desejado',
          'Visualize os dados',
        ],
        access: ['owner', 'admin'],
      },
      {
        title: 'Relatório por Profissionais',
        description: 'Veja desempenho financeiro de cada profissional',
        steps: [
          'Selecione "Profissionais" no tipo de relatório',
          'Visualize atendimentos, valor bruto, comissão e repasse',
          'Veja totais consolidados',
        ],
      },
      {
        title: 'Relatório por Pacientes',
        description: 'Acompanhe receita por paciente',
        steps: [
          'Selecione "Pacientes" no tipo de relatório',
          'Veja total de atendimentos e valor pago por paciente',
          'Identifique últimos atendimentos',
        ],
      },
      {
        title: 'Relatório por Serviços',
        description: 'Analise desempenho de cada serviço',
        steps: [
          'Selecione "Serviços" no tipo de relatório',
          'Veja quantidade de atendimentos por serviço',
          'Acompanhe valor total e médio por atendimento',
        ],
      },
      {
        title: 'Previsão Mensal',
        description: 'Veja projeção de recebimentos do mês',
        steps: [
          'Ative a opção "Previsão mensal"',
          'Visualize valores realizados e previstos',
          'Acompanhe comissões e repasses estimados',
        ],
        tips: [
          'A previsão considera agendamentos com status agendado, confirmado ou pendente',
          'Valores realizados são de atendimentos concluídos',
        ],
      },
      {
        title: 'Exportar Relatórios',
        description: 'Exporte relatórios em formato CSV',
        steps: [
          'Configure o período e tipo de relatório desejado',
          'Clique no botão "Exportar CSV"',
          'O arquivo será baixado automaticamente',
        ],
      },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    description: 'Configure o sistema conforme suas necessidades',
    features: [
      {
        title: 'Informações da Empresa',
        description: 'Configure dados básicos da empresa',
        steps: [
          'Acesse "Configurações" > "Geral"',
          'Preencha nome, telefone, e-mail e endereço',
          'Selecione tipo de estabelecimento',
          'Escolha como chamar clientes (Pacientes ou Clientes)',
          'Faça upload do logo da empresa',
          'Salve as alterações',
        ],
        access: ['owner', 'admin'],
      },
      {
        title: 'Horário de Funcionamento',
        description: 'Defina horários e dias de atendimento',
        steps: [
          'Configure horário de abertura e fechamento',
          'Selecione os dias da semana em que atende',
          'Salve as configurações',
        ],
      },
      {
        title: 'Configurações Financeiras',
        description: 'Defina regras de comissão e cancelamento',
        steps: [
          'Configure comissão padrão (%)',
          'Defina taxa de cancelamento (%)',
          'Configure dias de antecedência para cancelamento',
          'Ative/desative exibição de informações de comissão',
        ],
      },
      {
        title: 'Notificações Automáticas',
        description: 'Configure lembretes e confirmações',
        steps: [
          'Ative/desative lembrete 24h antes',
          'Ative/desative lembrete 1h antes',
          'Configure confirmação automática ao criar agendamento',
        ],
      },
      {
        title: 'Integração WhatsApp',
        description: 'Configure envio de mensagens via WhatsApp',
        steps: [
          'Escolha o provedor: Meta (API oficial) ou Evolution API',
          'Para Evolution API, escaneie o QR Code',
          'Aguarde conexão ser estabelecida',
          'Monitore status da conexão',
        ],
        tips: [
          'Evolution API permite usar seu próprio número WhatsApp',
          'As primeiras 200 mensagens do mês são gratuitas',
          'Mensagens excedentes têm custo adicional',
        ],
      },
      {
        title: 'Profissionais',
        description: 'Gerencie profissionais do sistema',
        steps: [
          'Acesse "Configurações" > "Profissionais"',
          'Adicione novos profissionais',
          'Configure apelido, cor e horários de atendimento',
          'Ative/desative profissionais',
        ],
        access: ['owner', 'admin', 'outro'],
      },
      {
        title: 'Serviços',
        description: 'Gerencie serviços oferecidos',
        steps: [
          'Acesse "Configurações" > "Serviços"',
          'Crie novos serviços',
          'Configure nome, duração, preço e comissão',
          'Ative/desative serviços',
        ],
        access: ['owner', 'admin', 'outro'],
      },
      {
        title: 'Usuários',
        description: 'Gerencie usuários e permissões',
        steps: [
          'Acesse "Configurações" > "Usuários"',
          'Veja lista de usuários',
          'Configure permissões granulares',
          'Ative/desative usuários',
        ],
        access: ['owner', 'admin'],
      },
      {
        title: 'Modelos de Anamnese',
        description: 'Crie e gerencie modelos de anamnese',
        steps: [
          'Acesse "Configurações" > "Modelos de anamnese"',
          'Crie novos modelos',
          'Edite modelos existentes',
          'Use modelos ao criar anamneses para pacientes',
        ],
        access: ['owner', 'admin'],
      },
      {
        title: 'Plano e Assinatura',
        description: 'Gerencie plano e assinatura do sistema',
        steps: [
          'Acesse "Configurações" > "Plano"',
          'Veja informações do plano atual',
          'Gerencie renovação e pagamento',
        ],
        access: ['owner', 'admin'],
      },
    ],
  },
];

// Context para controlar abertura do HelpMenu externamente
const HelpMenuContext = React.createContext<{
  openHelp: () => void;
}>({ openHelp: () => console.warn('HelpMenu context not initialized') });

export function useHelpMenu() {
  return React.useContext(HelpMenuContext);
}

// Provider separado para garantir que o contexto esteja sempre disponível
export function HelpMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const contextValue = React.useMemo(() => ({ openHelp }), [openHelp]);

  return (
    <HelpMenuContext.Provider value={contextValue}>
      {children}
      <HelpMenuContent isOpen={isOpen} setIsOpen={setIsOpen} />
    </HelpMenuContext.Provider>
  );
}

// Componente separado para o conteúdo do HelpMenu
function HelpMenuContent({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { themePreference, customColor, customColor2, role } = useAuth();
  const customerLabels = useCustomerLabels();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;

  const filteredSections = helpSections.filter((section) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.features.some((f) =>
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
      )
    );
  });

  const selectedSectionData = helpSections.find((s) => s.id === selectedSection);

  return (
    <>
      {/* Botão Flutuante - Posicionado ao lado do botão da IA */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all',
          hasGradient
            ? isCustom && gradientStyleHorizontal
              ? ''
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
            : 'bg-slate-900 hover:bg-slate-800'
        )}
        style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
        title="Ajuda e Documentação"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* Modal de Ajuda */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50',
                'md:w-[90vw] md:max-w-6xl md:h-[85vh]',
                'flex flex-col rounded-2xl shadow-2xl border overflow-hidden',
                hasGradient
                  ? 'bg-white/90 border-white/30 backdrop-blur-xl'
                  : 'bg-white border-slate-200'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={cn(
                  'flex items-center justify-between p-6 border-b',
                  hasGradient ? 'border-white/20 bg-white/40' : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                      isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-900'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2
                      className={cn(
                        'text-2xl font-bold',
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent drop-shadow'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-slate-900'
                      )}
                      style={
                        isCustom && gradientColors
                          ? {
                              background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }
                          : undefined
                      }
                    >
                      Central de Ajuda
                    </h2>
                    <p className={cn('text-sm', hasGradient ? 'text-slate-600/80' : 'text-slate-500')}>
                      Guia completo de todas as funcionalidades do sistema
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedSection(null);
                    setSearchTerm('');
                  }}
                  className={cn(
                    'h-10 w-10',
                    hasGradient ? 'hover:bg-white/60' : 'hover:bg-slate-100'
                  )}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div
                  className={cn(
                    'w-80 border-r overflow-y-auto',
                    hasGradient ? 'border-white/20 bg-white/30' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  {/* Search */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar funcionalidades..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="p-2">
                    {filteredSections.map((section) => {
                      const Icon = section.icon;
                      const isSelected = selectedSection === section.id;
                      return (
                        <motion.button
                          key={section.id}
                          onClick={() => setSelectedSection(section.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg mb-2 text-left transition-all',
                            isSelected
                              ? hasGradient
                                ? isCustom && gradientStyleHorizontal
                                  ? 'text-white shadow-lg'
                                  : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                                : 'bg-slate-900 text-white'
                              : hasGradient
                              ? 'hover:bg-white/60 text-slate-700'
                              : 'hover:bg-slate-100 text-slate-700'
                          )}
                          style={
                            isSelected && isCustom && gradientStyleHorizontal
                              ? gradientStyleHorizontal
                              : undefined
                          }
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{section.title}</p>
                            <p
                              className={cn(
                                'text-xs truncate',
                                isSelected ? 'text-white/80' : 'text-slate-500'
                              )}
                            >
                              {section.description}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              'w-4 h-4 flex-shrink-0',
                              isSelected ? 'text-white' : 'text-slate-400'
                            )}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedSectionData ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                          {selectedSectionData.title}
                        </h3>
                        <p className="text-slate-600">{selectedSectionData.description}</p>
                      </div>

                      <div className="space-y-6">
                        {selectedSectionData.features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                              'rounded-xl p-6 border',
                              hasGradient
                                ? 'border-white/25 bg-white/50'
                                : 'border-slate-200 bg-white'
                            )}
                          >
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                              {feature.title}
                            </h4>
                            <p className="text-slate-600 mb-4">{feature.description}</p>

                            {feature.steps && feature.steps.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-semibold text-slate-700 mb-2">
                                  Como usar:
                                </p>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                                  {feature.steps.map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {feature.tips && feature.tips.length > 0 && (
                              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Dicas:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                  {feature.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {feature.access && (
                              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                <Shield className="w-4 h-4" />
                                <span>
                                  Acesso: {feature.access.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">
                          Selecione uma seção
                        </h3>
                        <p className="text-slate-500">
                          Escolha uma funcionalidade no menu lateral para ver instruções detalhadas
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Componente principal - deve ser usado dentro do Provider
export function HelpMenu() {
  const { openHelp } = useHelpMenu();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { themePreference, customColor, customColor2, role } = useAuth();
  const customerLabels = useCustomerLabels();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;

  // Sincronizar estado interno com o contexto
  React.useEffect(() => {
    // Criar uma referência para o openHelp do contexto
    const originalOpenHelp = openHelp;
    // Substituir temporariamente para capturar chamadas
    (window as any).__helpMenuOpen = () => setIsOpen(true);
  }, [openHelp]);

  // Interceptar chamadas do contexto
  React.useEffect(() => {
    const handleOpenHelp = () => setIsOpen(true);
    // Substituir a função openHelp do contexto
    const context = (HelpMenuContext as any)._currentValue;
    if (context) {
      context.openHelp = handleOpenHelp;
    }
  }, []);

  const filteredSections = helpSections.filter((section) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.features.some((f) =>
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
      )
    );
  });

  const selectedSectionData = helpSections.find((s) => s.id === selectedSection);

  return (
    <>
      {/* Botão Flutuante - Posicionado ao lado do botão da IA */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all',
          hasGradient
            ? isCustom && gradientStyleHorizontal
              ? ''
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
            : 'bg-slate-900 hover:bg-slate-800'
        )}
        style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
        title="Ajuda e Documentação"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* Modal de Ajuda */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50',
                'md:w-[90vw] md:max-w-6xl md:h-[85vh]',
                'flex flex-col rounded-2xl shadow-2xl border overflow-hidden',
                hasGradient
                  ? 'bg-white/90 border-white/30 backdrop-blur-xl'
                  : 'bg-white border-slate-200'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={cn(
                  'flex items-center justify-between p-6 border-b',
                  hasGradient ? 'border-white/20 bg-white/40' : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                      isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-900'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2
                      className={cn(
                        'text-2xl font-bold',
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent drop-shadow'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-slate-900'
                      )}
                      style={
                        isCustom && gradientColors
                          ? {
                              background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }
                          : undefined
                      }
                    >
                      Central de Ajuda
                    </h2>
                    <p className={cn('text-sm', hasGradient ? 'text-slate-600/80' : 'text-slate-500')}>
                      Guia completo de todas as funcionalidades do sistema
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedSection(null);
                    setSearchTerm('');
                  }}
                  className={cn(
                    'h-10 w-10',
                    hasGradient ? 'hover:bg-white/60' : 'hover:bg-slate-100'
                  )}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div
                  className={cn(
                    'w-80 border-r overflow-y-auto',
                    hasGradient ? 'border-white/20 bg-white/30' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  {/* Search */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar funcionalidades..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="p-2">
                    {filteredSections.map((section) => {
                      const Icon = section.icon;
                      const isSelected = selectedSection === section.id;
                      return (
                        <motion.button
                          key={section.id}
                          onClick={() => setSelectedSection(section.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg mb-2 text-left transition-all',
                            isSelected
                              ? hasGradient
                                ? isCustom && gradientStyleHorizontal
                                  ? 'text-white shadow-lg'
                                  : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                                : 'bg-slate-900 text-white'
                              : hasGradient
                              ? 'hover:bg-white/60 text-slate-700'
                              : 'hover:bg-slate-100 text-slate-700'
                          )}
                          style={
                            isSelected && isCustom && gradientStyleHorizontal
                              ? gradientStyleHorizontal
                              : undefined
                          }
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{section.title}</p>
                            <p
                              className={cn(
                                'text-xs truncate',
                                isSelected ? 'text-white/80' : 'text-slate-500'
                              )}
                            >
                              {section.description}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              'w-4 h-4 flex-shrink-0',
                              isSelected ? 'text-white' : 'text-slate-400'
                            )}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedSectionData ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                          {selectedSectionData.title}
                        </h3>
                        <p className="text-slate-600">{selectedSectionData.description}</p>
                      </div>

                      <div className="space-y-6">
                        {selectedSectionData.features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                              'rounded-xl p-6 border',
                              hasGradient
                                ? 'border-white/25 bg-white/50'
                                : 'border-slate-200 bg-white'
                            )}
                          >
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                              {feature.title}
                            </h4>
                            <p className="text-slate-600 mb-4">{feature.description}</p>

                            {feature.steps && feature.steps.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-semibold text-slate-700 mb-2">
                                  Como usar:
                                </p>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                                  {feature.steps.map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {feature.tips && feature.tips.length > 0 && (
                              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Dicas:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                  {feature.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {feature.access && (
                              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                <Shield className="w-4 h-4" />
                                <span>
                                  Acesso: {feature.access.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">
                          Selecione uma seção
                        </h3>
                        <p className="text-slate-500">
                          Escolha uma funcionalidade no menu lateral para ver instruções detalhadas
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

