# Especificação Técnica

Sistema de agendamento multi‑profissionais com finanças e lembretes automáticos, feito em React moderno com efeitos suaves.

## 1. Visão geral
- Objetivo: permitir que 5 a 6 profissionais gerenciem agendas individuais, com duas administradoras que veem tudo. Profissionais veem apenas a própria agenda. Sistema calcula repasse do salão por atendimento e envia confirmações e lembretes automáticos.
- Público: administradoras Guilherme e Vitória como owner e admin, profissionais como usuários restritos, clientes como destinatários de mensagens.
- Idioma e moeda: pt‑BR, BRL. Fuso: America/Sao_Paulo.

## 2. Papéis e acessos
- Owner: tudo. Gerencia configs, finanças, usuários, serviços, relatórios.
- Admin: igual ao owner, sem acesso a billing do provedor externo.
- Profissional: agenda própria, cadastro de clientes próprios, vê apenas seus números. Sem acesso às agendas de owner e admin.
- Atendente opcional: pode criar agendamentos para qualquer profissional, sem acesso a relatórios financeiros.

Regra chave: agendas de owner e admin não são visíveis para profissionais comuns.

## 2.1 Autenticação e identidade
- Provedor: **Firebase Auth com Google**.
- Fluxo padrão: `Sign in with Google` via popup no cliente. Opcionalmente via redirect em mobile.
- Vinculação de conta: impedir múltiplos provedores. Usar apenas Google.
- Atribuição de papéis: **Custom Claims** no token do usuário, definidos por Cloud Function após o primeiro login.
- Allowlist: coleção `allowlist` com os e-mails autorizados e papel desejado. Quem não estiver na lista recebe papel `pro` por padrão ou é bloqueado.
- Renovação de token: após setar claims, forçar `currentUser.getIdToken(true)`.

### Fluxo de onboarding
1) Usuário faz login com Google.
2) Function `onAuthUserCreate` consulta `allowlist/{email}`. Se existir, grava `claims.role` conforme registro e cria doc em `users/{uid}`.
3) Se não existir, opcionalmente bloqueia o acesso removendo o doc `users/{uid}` e marcando `disabled` via Admin SDK, ou atribui papel `pro` básico.
4) Front atualiza sessão e redireciona para `/agenda`.

### Exemplo de telas
- `/signin`: botão Google gigante e mini termos de consentimento LGPD.
- `/perfil`: mostra nome, e-mail Google, telefone, papel. Botão de sair.

## 3. Requisitos funcionais Requisitos funcionais
1. Cadastro de profissionais, serviços, clientes.
2. Agenda com visualizações: dia, semana, mês, e por recurso profissional.
3. Criação de agendamentos com escolher profissional, serviço, data, hora, duração, preço, percentual do salão, observações.
4. Bloqueio de conflito: sem duplo agendamento no mesmo recurso e faixa.
5. Confirmação automática ao criar ou mover um agendamento.
6. Lembrete automático T‑24h para a cliente. Opcional T‑1h.
7. Dashboard financeiro por semana e mês: total por profissional, comissão do salão, repasse líquido.
8. Permissões por papel e por proprietário do registro.
9. Logs de auditoria.
10. Histórico de mensagens enviadas.
11. Preferências de notificação por cliente: WhatsApp, SMS, e‑mail.
12. Política de no‑show com marcação e campo de multa opcional.

## 4. Fluxos principais
- Criar agendamento: seleciona profissional, cliente, serviço, horário. Validação de conflito. Salvar. Dispara confirmação.
- Editar mover cancelar: atualiza status e logs. O cliente é avisado com texto adequado.
- Fechamento semanal: soma atendimentos por profissional, calcula percentuais do salão, mostra valor a repassar.

## 5. Modelagem de dados
Banco: Firebase Firestore (modo nativo, não datastores). Granularidade por documento, coleções e subcoleções. Todos os timestamps em UTC salvos como `Timestamp`, exibidos em America/Sao_Paulo no frontend.

### Coleções
- users (doc id = uid do Firebase Auth)
  - role: "owner" | "admin" | "pro" | "atendente"
  - nome, telefoneE164, email, ativo, professionalId opcional
  - claims são espelhadas via Custom Claims

- professionals
  - id (auto) | userUid
  - apelido, corHex, ativo, janelaAtendimento: { diasSemana, inicio, fim }

- services
  - id (auto) | nome | duracaoMin | precoCentavos | comissaoPercent | ativo

- clients
  - id (auto) | nome | telefoneE164 | email | preferenciaNotificacao: "whatsapp" | "sms" | "email"
  - ownerUid (quem cadastrou)

- appointments
  - id (auto)
  - professionalId, clientId, serviceId
  - inicio: Timestamp, fim: Timestamp
  - precoCentavos, comissaoPercent
  - status: "agendado" | "confirmado" | "concluido" | "cancelado" | "no_show"
  - createdByUid, createdAt: Timestamp, updatedAt: Timestamp

- messages
  - id (auto) | appointmentId | tipo: "confirmacao" | "lembrete" | "cancelamento"
  - canal: "whatsapp" | "sms" | "email"
  - status: "enviado" | "falhou"
  - payload: map | response: map | createdAt

- auditLogs
  - id (auto) | actorUid | entity | entityId | acao | diff | at

- settings (coleção de docs chave/valor)
  - key: string | value: map

### Índices compostos sugeridos
- appointments: professionalId asc, inicio desc
- appointments: status asc, inicio asc
- messages: appointmentId asc, createdAt desc
- clients: ownerUid asc, nome asc

## 6. Segurança e regras do Firestore
Usar Firebase Auth com **Custom Claims** para papéis. Segurança por regras do Firestore em vez de RLS.

### Regras de leitura e escrita
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function role() { return request.auth.token.role; }
    function isOwnerOrAdmin() { return role() == 'owner' || role() == 'admin'; }
    function isPro() { return role() == 'pro'; }

    match /users/{uid} {
      allow read: if isOwnerOrAdmin() || request.auth.uid == uid;
      allow write: if isOwnerOrAdmin() || request.auth.uid == uid;
    }

    match /professionals/{pid} {
      allow read: if isOwnerOrAdmin() || isPro();
      allow write: if isOwnerOrAdmin();
    }

    match /appointments/{id} {
      allow read, write: if isOwnerOrAdmin();
      // Profissional enxerga e manipula apenas seus próprios atendimentos
      allow read, write: if isPro() && request.resource.data.professionalId == request.auth.token.professionalId;
    }

    match /clients/{id} {
      allow read, write: if isOwnerOrAdmin();
      // Profissional acessa clientes vinculados a atendimentos dele
      allow read: if isPro() && exists(/databases/$(database)/documents/appointments/$(id2))
        && get(/databases/$(database)/documents/appointments/$(id2)).data.clientId == id
        && get(/databases/$(database)/documents/appointments/$(id2)).data.professionalId == request.auth.token.professionalId;
      allow write: if false; // criação via Function para validar vínculo
    }

    match /messages/{id} {
      allow read: if isOwnerOrAdmin();
      allow write: if false; // só Cloud Functions
    }

    match /auditLogs/{id} { allow read, write: if isOwnerOrAdmin(); }
    match /settings/{id} { allow read: if true; allow write: if isOwnerOrAdmin(); }
  }
}
```
Observações
- As expressões com `exists/get` são ilustrativas. Para regras eficientes, gravar chaves de acesso simples no documento de `clients` como `ownerProfessionalIds: ["pro_abc", ...]` e checar com `in`.
- Campos importantes no token: `role`, `professionalId` quando aplicável.

### Restrições de Functions
- Escrita em `messages`, `auditLogs`, agregados financeiros e criação de `clients` preferir via Functions.

## 7. Backend / API
Substituir API própria por **Firebase Cloud Functions**.

### Functions principais
- `onAuthUserCreate` (Auth trigger): define claims com base na allowlist e cria `users/{uid}`.
- `createAppointment` (HTTP): valida janela de trabalho, conflito, grava `appointments`, enfileira confirmação.
- `updateAppointment` (HTTP): remarca, cancela, confirma, recalcula agregados.
- `sendNotification` (HTTP): envia WhatsApp/SMS/E-mail para um `appointmentId` e grava em `messages`.
- `reminderT24h` (HTTP + Scheduler): busca compromissos entre T+24h e T+25h, dispara lembretes.
- `reminderT1h` (opcional): mesmo critério para T+1h.
- `closeWeek` (HTTP): fecha semana, atualiza `financeWeekly`.

### Exemplo de `onAuthUserCreate`
```ts
import * as admin from 'firebase-admin';
import { auth } from 'firebase-functions';

export const onAuthUserCreate = auth.user().onCreate(async user => {
  const email = user.email?.toLowerCase();
  if (!email) return;
  const allow = await admin.firestore().collection('allowlist').doc(email).get();
  if (!allow.exists) {
    // default: bloquear ou setar pro
    await admin.auth().setCustomUserClaims(user.uid, { role: 'pro' });
    await admin.firestore().collection('users').doc(user.uid).set({
      nome: user.displayName || '', email, role: 'pro', ativo: true
    });
    return;
  }
  const data = allow.data() as { role: string, professionalId?: string };
  await admin.auth().setCustomUserClaims(user.uid, { role: data.role, professionalId: data.professionalId || null });
  await admin.firestore().collection('users').doc(user.uid).set({
    nome: user.displayName || '', email, role: data.role, professionalId: data.professionalId || null, ativo: true
  });
});
```

## 8. Frontend stack
- Next.js 15 + React 19 + TypeScript
- Firebase Web SDK: Auth, Firestore, Functions, Messaging
- Tailwind + shadcn ui + lucide
- TanStack Query + listeners Firestore
- React Hook Form + Zod
- Framer Motion
- React Big Calendar com date‑fns

### Auth no frontend com Google
```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onIdTokenChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  await signInWithPopup(auth, provider);
  // força refresh do token para trazer custom claims
  await auth.currentUser?.getIdToken(true);
}
export async function logout() { await signOut(auth); }
```

```tsx
// app/signin/page.tsx
'use client';
import { loginWithGoogle } from '@/lib/firebase';

export default function SignIn() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <button onClick={loginWithGoogle} className="px-6 py-3 rounded-xl shadow">
        Entrar com Google
      </button>
    </div>
  );
}
```

### Proteção de rotas
```tsx
// components/AccessGuard.tsx
'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

export function AccessGuard({ allowed, children }: { allowed: ('owner'|'admin'|'pro'|'atendente')[], children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    return auth.onIdTokenChanged(async (u) => {
      if (!u) { setRole(null); return; }
      const token = await u.getIdTokenResult();
      setRole(token.claims.role as string);
    });
  }, []);
  if (!role) return <div>Carregando…</div>;
  return allowed.includes(role as any) ? <>{children}</> : <div>Acesso negado</div>;
}
```

Na agenda e nos relatórios, envolver páginas com `<AccessGuard allowed={["owner","admin"]} />` quando for conteúdo restrito.

## 9. Componentes de UI Componentes de UI
- TopBar com seleção de período e profissional.
- ResourceCalendar com drag and drop, resize, snap de 5 min.
- AppointmentDrawer para criar e editar com passos: cliente, serviço, horário, preço, confirmação.
- FinanceCard semanal por profissional e total do salão.
- NotificationsPanel com histórico e reenvio.
- AccessGuard para checar role e bloquear rotas.

## 10. Efeitos e UX
- Transições suaves ao abrir o drawer, fade ao soltar um evento no calendário.
- Tooltip com valor do serviço e percentual na célula do evento.
- Snackbar confirmando criação e indicando que a mensagem foi enviada.
- Skeletons enquanto carrega.

## 11. Notificações
- Canal WhatsApp via Meta Cloud API ou provedor compatível. Templates aprovados com variáveis: nome, data, hora, serviço.
- SMS fallback via Twilio. E‑mail via Resend.
- Webhook para status de entrega gravando em messages.
- Agendador de lembretes: Vercel Cron chamando endpoint diário que busca appointments com inicio entre 24h e 25h e envia lembrete. Segundo cron opcional para T‑1h.

Template de confirmação WhatsApp
"Oi, {{nome}}. Seu horário de {{servico}} foi agendado para {{data}} às {{hora}}. Qualquer mudança, responda por aqui."

Template de lembrete WhatsApp
"Só para lembrar do seu horário amanhã, {{data}} às {{hora}} com {{profissional}}. Até lá."

## 12. Relatórios financeiros
- Cálculo por atendimento: valor_bruto, comissao_salão = preco * comissao_percent, repasse_pro = preco − comissao.
- Visões
  - por semana e por mês
  - por profissional e consolidado
- Exportar CSV e PDF.

## 13. Configurações
- Percentual padrão do salão por serviço
- Janelas de atendimento de cada profissional
- Política de cancelamento e textos
- Templates de mensagem por canal

## 14. Auditoria e conformidade
- Logar quem criou, editou, cancelou cada atendimento e quando.
- Registrar cada mensagem enviada e status.
- LGPD: consentimento do cliente para mensagens, opt‑out simples. Minimizar dados sensíveis.

## 15. Testes
- Unitários com Vitest, e2e com Playwright.
- Casos
  - evitar conflito de agenda
  - RLS impedindo acesso a agenda do admin para um pro
  - cálculo financeiro correto
  - lembrete enviado T‑24h

## 16. Roadmap
MVP
- Cadastro básico, agenda por profissional, confirmação, lembrete T‑24h, relatório semanal simples.

V1.1
- T‑1h, exportações, bloqueios de férias, recorrência de horários.

V1.2
- App PWA, notificações push, pagamentos online opcionais.

## 17. Esboço de schema SQL
```sql
create table services (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_min int not null,
  preco_centavos int not null,
  comissao_percent int not null default 30,
  ativo boolean not null default true
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id),
  client_id uuid not null references clients(id),
  service_id uuid not null references services(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  preco_centavos int not null,
  comissao_percent int not null,
  status text not null default 'agendado',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
```

## 18. Endpoints de relatório
- GET /api/reports/weekly
  - params from to professional_id opcional
  - retorna por profissional: total_atendimentos, bruto, comissao, repasse

## 19. Regras de acesso em pseudocódigo
```
if role in [owner, admin]: allow all
if role == pro:
  allow appointments where appointments.professional_id == me.professional_id
  hide users with role in [owner, admin]
```

## 20. Detalhes de implementação
- Confirmações e lembretes disparados como jobs idempotentes com chave appointment_id e tipo. Evita duplicidade.
- Janela de agendamento respeita horário de trabalho do profissional e feriados nacionais. Habilitar calendário de feriados do Brasil como tabela auxiliar.

## 21. Design rápido
- Tema claro e escuro
- Cores por profissional no calendário
- Tipografia simples e limpa

Pronto. Com isso dá para iniciar o projeto com segurança e sem surpresas. Quando quiser, eu monto os primeiros componentes em React com os efeitos animadinhos e uma rota de API de exemplo.

