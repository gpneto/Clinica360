import {
  LayoutDashboard,
  Calendar,
  HeartPulse,
  MessageCircle,
  Sparkles,
  BarChart3,
  Settings,
  UserCheck,
  Package,
  FileText,
  CreditCard,
  Users,
} from 'lucide-react';

export interface HelpSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  features: HelpFeature[];
}

export interface HelpFeature {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  access?: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  sections: HelpSection[];
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'funcionalidades',
    title: 'Funcionalidades',
    icon: LayoutDashboard,
    description: 'Guia completo das funcionalidades principais do sistema',
    sections: [
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
        ],
      },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    description: 'Configure o sistema conforme suas necessidades',
    sections: [
      {
        id: 'geral',
        title: 'Geral',
        icon: Settings,
        description: 'Configurações gerais da empresa',
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
        ],
      },
      {
        id: 'profissionais',
        title: 'Profissionais',
        icon: UserCheck,
        description: 'Gerencie profissionais e suas comissões',
        features: [
          {
            title: 'Cadastrar Profissional',
            description: 'Adicione novos profissionais ao sistema',
            steps: [
              'Acesse "Configurações" > "Profissionais"',
              'Clique em "Novo Profissional"',
              'Preencha nome, telefone e e-mail',
              'Configure comissão (percentual ou valor fixo)',
              'Salve o profissional',
            ],
          },
        ],
      },
      {
        id: 'servicos',
        title: 'Serviços',
        icon: Package,
        description: 'Gerencie serviços oferecidos',
        features: [
          {
            title: 'Cadastrar Serviço',
            description: 'Adicione novos serviços ao sistema',
            steps: [
              'Acesse "Configurações" > "Serviços"',
              'Clique em "Novo Serviço"',
              'Preencha nome e descrição',
              'Defina preço padrão',
              'Salve o serviço',
            ],
          },
        ],
      },
      {
        id: 'usuarios',
        title: 'Usuários',
        icon: Users,
        description: 'Gerencie usuários e permissões',
        features: [
          {
            title: 'Cadastrar Usuário',
            description: 'Adicione novos usuários ao sistema',
            steps: [
              'Acesse "Configurações" > "Usuários"',
              'Clique em "Novo Usuário"',
              'Preencha e-mail e senha',
              'Selecione perfil (role)',
              'Salve o usuário',
            ],
            access: ['owner', 'admin'],
          },
        ],
      },
      {
        id: 'modelos-anamnese',
        title: 'Modelos de Anamnese',
        icon: FileText,
        description: 'Crie e gerencie modelos de anamnese',
        features: [
          {
            title: 'Criar Modelo de Anamnese',
            description: 'Crie modelos personalizados de anamnese',
            steps: [
              'Acesse "Configurações" > "Modelos de Anamnese"',
              'Clique em "Novo Modelo"',
              'Adicione seções e perguntas',
              'Salve o modelo',
            ],
            access: ['owner', 'admin'],
          },
        ],
      },
      {
        id: 'plano',
        title: 'Plano',
        icon: CreditCard,
        description: 'Gerencie seu plano de assinatura',
        features: [
          {
            title: 'Visualizar Plano',
            description: 'Veja informações do seu plano atual',
            steps: [
              'Acesse "Configurações" > "Plano"',
              'Visualize informações do plano',
              'Veja limite de uso e recursos disponíveis',
            ],
            access: ['owner', 'admin'],
          },
        ],
      },
    ],
  },
];



