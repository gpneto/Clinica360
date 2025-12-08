# Sistema de Agendamento Inteligente

Sistema de agendamento multi-profissionais com finanças e lembretes automáticos, desenvolvido em React moderno com efeitos suaves.

## 🚀 Características

- **Autenticação**: Firebase Auth com Google
- **Banco de Dados**: Firebase Firestore
- **Backend**: Firebase Cloud Functions
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Notificações**: WhatsApp, SMS e Email automáticos
- **Calendário**: React Big Calendar com drag & drop
- **Relatórios**: Dashboard financeiro completo

## 📋 Pré-requisitos

- Node.js 18+
- Firebase CLI
- Conta Google Cloud Platform
- Conta Firebase

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd agendamento-inteligente
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Firebase

#### 3.1 Crie um projeto no Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga as instruções para criar o projeto

#### 3.2 Configure a autenticação
1. No Firebase Console, vá para "Authentication" > "Sign-in method"
2. Habilite "Google" como provedor
3. Configure os domínios autorizados

#### 3.3 Configure o Firestore
1. Vá para "Firestore Database"
2. Crie um banco de dados
3. Configure as regras de segurança (já incluídas no projeto)

#### 3.4 Configure as Cloud Functions
1. Instale o Firebase CLI: `npm install -g firebase-tools`
2. Faça login: `firebase login`
3. Inicialize o projeto: `firebase init`
4. Selecione Functions e Firestore

### 4. Configure as variáveis de ambiente

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

# WhatsApp API (Meta Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=seu_token_whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id

# SMS API (Twilio)
TWILIO_ACCOUNT_SID=seu_twilio_sid
TWILIO_AUTH_TOKEN=seu_twilio_token
TWILIO_PHONE_NUMBER=seu_twilio_phone

# Email API (Resend)
RESEND_API_KEY=sua_resend_api_key
RESEND_FROM_EMAIL=noreply@seudominio.com
```

### 5. Configure a allowlist de usuários

No Firestore, crie uma coleção chamada `allowlist` com documentos para cada usuário autorizado:

```javascript
// Documento: allowlist/email@exemplo.com
{
  role: "owner", // ou "admin", "pro", "atendente"
  professionalId: "pro_123" // opcional, apenas para profissionais
}
```

### 6. Execute o projeto

#### Desenvolvimento
```bash
npm run dev
```

#### Produção
```bash
npm run build
npm start
```

#### Cloud Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 📱 Uso do Sistema

### Papéis de Usuário

- **Owner**: Acesso total ao sistema
- **Admin**: Acesso total, exceto billing do provedor
- **Profissional**: Acesso apenas à própria agenda
- **Atendente**: Pode criar agendamentos para qualquer profissional

### Funcionalidades Principais

1. **Agenda**: Visualização em mês, semana, dia ou lista
2. **Agendamentos**: Criação com validação de conflitos
3. **Notificações**: Confirmação automática e lembretes T-24h
4. **Relatórios**: Dashboard financeiro semanal/mensal
5. **Clientes**: Cadastro e preferências de notificação
6. **Serviços**: Configuração de preços e comissões

## 🔧 Configuração de Notificações

### WhatsApp (Meta Cloud API)
1. Crie uma conta de desenvolvedor no Meta
2. Configure um número de telefone comercial
3. Obtenha o token de acesso
4. Configure os templates de mensagem

### SMS (Twilio)
1. Crie uma conta no Twilio
2. Obtenha as credenciais da conta
3. Configure um número de telefone

### Email (Resend)
1. Crie uma conta no Resend
2. Configure um domínio
3. Obtenha a API key

## 📊 Estrutura do Banco de Dados

### Coleções Principais

- `users`: Usuários do sistema
- `professionals`: Profissionais cadastrados
- `services`: Serviços oferecidos
- `clients`: Clientes cadastrados
- `appointments`: Agendamentos
- `messages`: Histórico de mensagens
- `auditLogs`: Logs de auditoria
- `settings`: Configurações do sistema
- `allowlist`: Lista de usuários autorizados

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e
```

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte, entre em contato através dos issues do GitHub ou email.

---

Desenvolvido com ❤️ para salões de beleza e profissionais autônomos.
