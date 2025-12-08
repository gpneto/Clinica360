# 🏥 SmartDoctor / Clínica360

Sistema completo de gestão para clínicas, consultórios e estabelecimentos de saúde. Plataforma moderna e escalável desenvolvida com Next.js 15, React 19, TypeScript e Firebase, oferecendo uma solução robusta para gerenciamento de agendamentos, pacientes, prontuário eletrônico, finanças e comunicação automatizada.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.0-orange)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
- [Integrações](#integrações)
- [Papéis e Permissões](#papéis-e-permissões)
- [Testes](#testes)
- [Deploy](#deploy)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## 🎯 Visão Geral

O **SmartDoctor** é uma plataforma web completa desenvolvida especificamente para clínicas, consultórios odontológicos, salões de beleza e estabelecimentos com múltiplos profissionais. O sistema oferece:

- ✅ **Agendamento Inteligente** com múltiplas visualizações e validação automática
- ✅ **Prontuário Eletrônico Completo** com anamneses, evoluções e histórico
- ✅ **Gestão Multi-Profissional** com controle de permissões granular
- ✅ **Assistente de IA** para auxiliar em tarefas e geração de conteúdo
- ✅ **Comunicação Automatizada** via WhatsApp, SMS e E-mail
- ✅ **Gestão Financeira Completa** com relatórios e cálculos automáticos
- ✅ **Multi-Empresa** com temas personalizados
- ✅ **Interface Mobile-First** totalmente responsiva

---

## ✨ Funcionalidades Principais

### 📅 **Agendamento Inteligente**

- **Visualizações Flexíveis**: Mês, semana, dia ou lista de agendamentos
- **Drag & Drop**: Arraste agendamentos para alterar horários
- **Validação Automática**: Prevenção de conflitos de horário
- **Recorrência**: Criação de agendamentos recorrentes
- **Bloqueios de Agenda**: Marcação de indisponibilidades e eventos
- **Aniversários**: Exibição automática de aniversários de pacientes
- **Filtros Avançados**: Por profissional, status, período e cliente

### 👥 **Gestão de Pacientes**

- **Cadastro Completo**: Dados pessoais, contatos, preferências e histórico
- **Prontuário Eletrônico**: 
  - Anamneses configuráveis com modelos personalizados
  - Evoluções clínicas com histórico completo
  - Ficha odontológica com odontograma interativo
  - Consultas e procedimentos realizados
  - Documentos e arquivos anexados
- **Orçamentos**: Criação, envio e assinatura digital de orçamentos
- **Financeiro do Paciente**: Controle de débitos, pagamentos e histórico
- **Interações**: Histórico completo de mensagens e comunicações

### 🦷 **Ficha Odontológica (Específico para Dentistas)**

- **Odontograma Interativo**: Visualização completa da arcada dentária
- **Procedimentos Odontológicos**: Registro detalhado por dente
- **Dentição Permanente e Decídua**: Suporte para ambas
- **Estados dos Dentes**: Saudável, cariado, restaurado, ausente, etc.
- **Faces Dentárias**: Vestibular, lingual, oclusal, mesial, distal
- **Exportação**: Geração de PDFs profissionais

### 🤖 **Assistente de IA**

- **Geração de Conteúdo**: Criação de mensagens personalizadas
- **Análise de Dados**: Insights sobre pacientes e agendamentos
- **Sugestões Inteligentes**: Recomendações baseadas em contexto
- **Mensagens de Aniversário**: Geração automática com IA (OpenAI)
- **Suporte Contextual**: Ajuda em tempo real nas tarefas

### 💰 **Gestão Financeira**

- **Controle de Valores**: Preços e comissões por serviço
- **Cálculo Automático**: Repasses e comissões calculados automaticamente
- **Relatórios Financeiros**: Dashboard com visão semanal e mensal
- **Filtros Avançados**: Por período, profissional, status e serviço
- **Exportação**: Dados prontos para análise externa
- **Débitos de Pacientes**: Controle individual de valores devidos

### 📢 **Comunicação Automatizada**

- **Confirmação Automática**: Envio imediato ao criar ou alterar agendamento
- **Lembretes Automáticos**: Notificação 24 horas antes do atendimento
- **Múltiplos Canais**: WhatsApp, SMS e E-mail
- **Templates Configuráveis**: Mensagens personalizadas por tipo
- **Histórico Completo**: Registro de todas as mensagens enviadas
- **Preferências por Cliente**: Cada paciente escolhe seu canal preferido

### 📊 **Relatórios e Analytics**

- **Dashboard Completo**: Visão geral do dia com estatísticas
- **Relatórios Financeiros**: Análises detalhadas de receita e comissões
- **Relatórios de Agendamentos**: Estatísticas de atendimentos
- **Aniversariantes**: Lista de pacientes que fazem aniversário
- **Exportação**: Dados em múltiplos formatos

### 🏢 **Multi-Empresa**

- **Múltiplas Empresas**: Suporte para vários estabelecimentos
- **Temas Personalizados**: Cores e identidade visual por empresa
- **Isolamento de Dados**: Dados completamente separados por empresa
- **Configurações Independentes**: Cada empresa com suas próprias configurações

### ⚙️ **Configurações**

- **Modelos de Anamnese**: Criação e personalização de formulários
- **Serviços**: Cadastro de procedimentos com preços e comissões
- **Profissionais**: Gestão de equipe com horários e permissões
- **Integrações**: Configuração de WhatsApp, SMS e E-mail
- **Empresas**: Gestão de estabelecimentos e temas

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Next.js 15**: Framework React com SSR e SSG
- **React 19**: Biblioteca UI com hooks modernos
- **TypeScript**: Tipagem estática para maior segurança
- **Tailwind CSS**: Framework CSS utility-first
- **shadcn/ui**: Componentes UI modernos e acessíveis
- **Framer Motion**: Animações suaves e interativas
- **React Big Calendar**: Componente de calendário avançado
- **React Hook Form**: Gerenciamento de formulários
- **Zod**: Validação de schemas
- **date-fns**: Manipulação de datas
- **jsPDF**: Geração de PDFs

### Backend
- **Firebase Authentication**: Autenticação com Google OAuth
- **Firebase Firestore**: Banco de dados NoSQL em tempo real
- **Firebase Cloud Functions**: Backend serverless
- **Firebase Storage**: Armazenamento de arquivos
- **Firebase Hosting**: Hospedagem estática

### Integrações
- **OpenAI API**: Assistente de IA e geração de conteúdo
- **WhatsApp**: Meta Cloud API, Evolution API e Baileys
- **Twilio**: Envio de SMS
- **Resend**: Envio de e-mails

### Testes
- **Vitest**: Framework de testes unitários
- **Testing Library**: Testes de componentes React
- **Playwright**: Testes end-to-end

### DevOps
- **Git**: Controle de versão
- **Docker**: Containerização (para worker Evolution API)
- **Google Cloud Platform**: Infraestrutura e secrets

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** ou **yarn** (vem com Node.js)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** ([Download](https://git-scm.com/))
- **Conta Google** (para Firebase e GCP)
- **Conta OpenAI** (opcional, para assistente de IA)
- **Conta Twilio** (opcional, para SMS)
- **Conta Resend** (opcional, para e-mails)
- **Conta Meta Developer** (opcional, para WhatsApp)

---

## 🚀 Instalação e Configuração

### 1. Clone o Repositório

```bash
git clone https://github.com/gpneto/Clinica360.git
cd Clinica360
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure o Firebase

#### 3.1 Crie um Projeto no Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga as instruções para criar o projeto
4. Anote o **Project ID**

#### 3.2 Configure a Autenticação

1. No Firebase Console, vá para **Authentication** > **Sign-in method**
2. Habilite **Google** como provedor
3. Configure os domínios autorizados (localhost para desenvolvimento)

#### 3.3 Configure o Firestore

1. Vá para **Firestore Database**
2. Crie um banco de dados em modo **produção** ou **teste**
3. As regras de segurança estão em `firestore.rules`
4. Os índices estão em `firestore.indexes.json`

#### 3.4 Configure as Cloud Functions

```bash
# Instale o Firebase CLI globalmente (se ainda não tiver)
npm install -g firebase-tools

# Faça login
firebase login

# Inicialize o projeto
firebase init

# Selecione:
# - Functions
# - Firestore
# - Use existing project (selecione o projeto criado)
```

### 4. Configure as Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# OpenAI (Opcional - para Assistente de IA)
OPENAI_API_KEY=sua_openai_api_key

# WhatsApp - Meta Cloud API (Opcional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=seu_token_whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id

# WhatsApp - Evolution API (Opcional)
EVOLUTION_API_URL=http://seu-servidor:8080
EVOLUTION_API_KEY=sua_evolution_api_key

# SMS - Twilio (Opcional)
TWILIO_ACCOUNT_SID=seu_twilio_sid
TWILIO_AUTH_TOKEN=seu_twilio_token
TWILIO_PHONE_NUMBER=seu_twilio_phone

# Email - Resend (Opcional)
RESEND_API_KEY=sua_resend_api_key
RESEND_FROM_EMAIL=noreply@seudominio.com
```

### 5. Configure as Cloud Functions

Entre na pasta `functions` e configure:

```bash
cd functions
npm install

# Configure as variáveis de ambiente das functions
# Edite functions/.env ou use Firebase Secrets
```

Para usar Firebase Secrets (recomendado):

```bash
# Configure os secrets no Secret Manager
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set EVOLUTION_API_KEY
firebase functions:secrets:set EVOLUTION_API_URL
```

### 6. Configure a Allowlist de Usuários

No Firestore, crie uma coleção chamada `allowlist` com documentos para cada usuário autorizado:

```javascript
// Documento: allowlist/email@exemplo.com
{
  role: "owner", // ou "admin", "pro", "atendente"
  professionalId: "pro_123" // opcional, apenas para profissionais
}
```

### 7. Execute o Projeto

#### Desenvolvimento

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Cloud Functions (emulador)
cd functions
npm run serve
```

Acesse: `http://localhost:3000`

#### Produção

```bash
# Build
npm run build

# Start
npm start
```

#### Deploy das Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 📁 Estrutura do Projeto

```
SmartDoctor/
├── app/                          # Next.js App Router
│   ├── agenda/                   # Página de agendamentos
│   ├── pacientes/                # Gestão de pacientes
│   │   └── detalhe/              # Detalhes do paciente
│   │       ├── AnamneseTab.tsx   # Aba de anamneses
│   │       ├── EvolucoesTab.tsx  # Aba de evoluções
│   │       ├── DentalChart.tsx   # Odontograma
│   │       ├── OrcamentosTab.tsx # Aba de orçamentos
│   │       └── ...
│   ├── assistente-ia/            # Assistente de IA
│   ├── configuracoes/            # Configurações do sistema
│   ├── relatorios/               # Relatórios e analytics
│   └── ...
├── components/                   # Componentes React
│   ├── ui/                       # Componentes UI base (shadcn)
│   ├── AIAssistant.tsx          # Assistente de IA
│   ├── Dashboard.tsx             # Dashboard principal
│   ├── ModernCalendar.tsx        # Calendário moderno
│   └── ...
├── hooks/                        # Custom React Hooks
│   ├── useFirestore.ts           # Hook principal do Firestore
│   ├── useCustomerLabels.ts     # Labels de clientes
│   └── useWhatsappMessages.ts    # Mensagens WhatsApp
├── lib/                          # Bibliotecas e utilitários
│   ├── firebase.ts               # Configuração Firebase
│   ├── auth-context.tsx          # Context de autenticação
│   ├── permissions.ts            # Sistema de permissões
│   └── utils.ts                  # Funções utilitárias
├── types/                        # TypeScript types
│   └── index.ts                  # Definições de tipos
├── functions/                    # Firebase Cloud Functions
│   ├── src/                      # Código TypeScript
│   │   ├── index.ts              # Entry point
│   │   ├── aiAssistant.ts        # Funções de IA
│   │   └── whatsapp/             # Integrações WhatsApp
│   └── lib/                      # Código compilado
├── tests/                        # Testes
│   ├── components/               # Testes de componentes
│   ├── hooks/                    # Testes de hooks
│   ├── integration/              # Testes de integração
│   └── ...
├── worker/                       # Worker Evolution API
│   └── evolution-api-gcp/        # Configuração Docker
├── public/                       # Arquivos estáticos
└── firestore.rules               # Regras de segurança Firestore
```

---

## 📖 Funcionalidades Detalhadas

### 📅 Agenda

#### Visualizações

- **Dia**: Visualização detalhada de um único dia
- **Semana**: Visualização semanal com todos os profissionais
- **Mês**: Visão mensal do calendário
- **Lista**: Lista de agendamentos do dia atual

#### Criar Agendamento

1. Clique no botão "Novo agendamento" ou clique diretamente em um horário
2. Selecione o profissional responsável
3. Escolha o paciente (ou crie um novo)
4. Selecione um ou múltiplos serviços
5. Defina data, horário e duração
6. Configure preço e comissão (se aplicável)
7. Adicione observações
8. Marque se deseja enviar notificação
9. Clique em "Salvar"

#### Recorrência

- Agendamentos recorrentes diários, semanais ou mensais
- Configuração de data final ou número de ocorrências
- Edição individual ou em lote

### 👤 Gestão de Pacientes

#### Cadastro

- Dados pessoais completos
- Múltiplos telefones e e-mails
- Data de nascimento (para aniversários)
- Preferências de comunicação
- Observações e anotações

#### Prontuário Eletrônico

**Anamneses:**
- Modelos personalizáveis
- Múltiplas seções e perguntas
- Tipos de resposta variados (texto, múltipla escolha, etc.)
- Assinatura digital
- Exportação em PDF

**Evoluções:**
- Registro de evoluções clínicas
- Histórico completo com timestamps
- Anexos de imagens e documentos
- Filtros por data e tipo

**Ficha Odontológica:**
- Odontograma interativo completo
- Registro de procedimentos por dente
- Estados dos dentes (saudável, cariado, etc.)
- Faces dentárias (vestibular, lingual, etc.)
- Suporte para dentição permanente e decídua

**Consultas:**
- Histórico de consultas realizadas
- Vinculação com agendamentos
- Procedimentos realizados
- Valores e pagamentos

**Orçamentos:**
- Criação de orçamentos detalhados
- Múltiplos procedimentos
- Parcelamento
- Envio por WhatsApp, e-mail ou link
- Assinatura digital
- Conversão em consulta

**Documentos:**
- Upload de arquivos
- Organização por categorias
- Visualização de imagens e PDFs
- Download e compartilhamento

**Financeiro:**
- Controle de débitos
- Histórico de pagamentos
- Geração de débitos automáticos
- Relatórios financeiros por paciente

### 🤖 Assistente de IA

- **Geração de Mensagens**: Criação de mensagens personalizadas
- **Análise de Dados**: Insights sobre pacientes e agendamentos
- **Sugestões**: Recomendações baseadas em contexto
- **Mensagens de Aniversário**: Geração automática com IA
- **Suporte Contextual**: Ajuda em tempo real

### 💰 Gestão Financeira

#### Relatórios

- **Dashboard Financeiro**: Visão geral com estatísticas
- **Relatórios por Período**: Semanal, mensal, anual
- **Relatórios por Profissional**: Análise individual
- **Cálculo de Comissões**: Automático por serviço
- **Repasses**: Cálculo do valor a repassar ao salão

#### Controle de Valores

- Preços por serviço
- Comissões configuráveis
- Percentual do salão
- Cálculo automático de repasses

### ⚙️ Configurações

#### Modelos de Anamnese

- Criação de formulários personalizados
- Múltiplas seções
- Diferentes tipos de perguntas
- Ordenação customizável

#### Serviços

- Cadastro de procedimentos
- Preços e comissões
- Duração estimada
- Categorização

#### Profissionais

- Cadastro completo
- Horários de atendimento
- Cores personalizadas
- Permissões individuais

#### Integrações

- Configuração de WhatsApp (Meta, Evolution, Baileys)
- Configuração de SMS (Twilio)
- Configuração de E-mail (Resend)
- Templates de mensagens

---

## 🔌 Integrações

### WhatsApp

O sistema suporta três provedores de WhatsApp:

1. **Meta Cloud API**: API oficial do Meta/Facebook
2. **Evolution API**: API open-source alternativa
3. **Baileys**: Biblioteca Node.js para WhatsApp Web

Configuração em **Configurações > Integrações > WhatsApp**

### SMS (Twilio)

- Envio de SMS para confirmações e lembretes
- Configuração de templates
- Histórico de mensagens

### E-mail (Resend)

- Envio de e-mails transacionais
- Templates HTML
- Histórico completo

### OpenAI

- Geração de mensagens personalizadas
- Mensagens de aniversário com IA
- Assistente contextual

---

## 👥 Papéis e Permissões

### Owner

- Acesso total ao sistema
- Gerenciamento de configurações
- Acesso a billing e pagamentos
- Gestão de usuários e empresas

### Admin

- Acesso total, exceto billing do provedor
- Gerenciamento de configurações
- Gestão de usuários
- Acesso a todos os relatórios

### Profissional

- Acesso apenas à própria agenda
- Cadastro de pacientes próprios
- Visualização apenas de seus números
- Sem acesso às agendas de owner/admin

### Atendente

- Pode criar agendamentos para qualquer profissional
- Cadastro de pacientes
- Sem acesso a relatórios financeiros
- Visualização limitada

---

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
npm run test

# Com interface visual
npm run test:ui

# Com cobertura
npm run test:coverage

# Modo watch
npm run test:watch
```

### Estrutura de Testes

- **Unitários**: Componentes e hooks isolados
- **Integração**: Fluxos completos
- **E2E**: Testes end-to-end com Playwright
- **Regras de Negócio**: Validação de lógica de negócio

---

## 🚀 Deploy

### Vercel (Recomendado para Frontend)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Worker Evolution API (Docker)

```bash
cd worker/evolution-api-gcp
docker-compose up -d
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga estes passos:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use TypeScript para tipagem
- Siga os padrões do ESLint configurado
- Escreva testes para novas funcionalidades
- Documente código complexo
- Use commits semânticos

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 📞 Suporte

Para suporte, entre em contato através de:
- **Issues do GitHub**: [Abrir uma issue](https://github.com/gpneto/Clinica360/issues)
- **Email**: [Seu email de contato]

---

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) - Framework React
- [Firebase](https://firebase.google.com/) - Backend e infraestrutura
- [shadcn/ui](https://ui.shadcn.com/) - Componentes UI
- [OpenAI](https://openai.com/) - Assistente de IA
- Todos os contribuidores e usuários do projeto

---

**Desenvolvido com ❤️ para profissionais de saúde e bem-estar.**

---

## 📚 Documentação Adicional

- [Documentação Completa](./DOCUMENTACAO_COMPLETA.md)
- [Especificação Técnica](./Especificação%20Técnica.md)
- [Como Testar](./COMO_TESTAR.md)
- [Configuração Firebase](./CONFIGURACAO_FIREBASE.md)
- [Configuração OpenAI](./CONFIGURAR_OPENAI.md)
- [Alternativas WhatsApp](./ALTERNATIVAS_WHATSAPP.md)
