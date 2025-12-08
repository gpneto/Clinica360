# Configuração de Custom Claims - Firebase Auth

## O que são Custom Claims?

Custom Claims são dados adicionados ao token JWT do Firebase Auth que permitem verificar permissões **sem consultar o Firestore**, tornando a verificação de permissões **muito mais rápida** (0ms vs 1400ms).

## Como Funciona

### 1. Setar Claims no Login (RECOMENDADO - Mais Rápido!) ⚡

**`setUserCustomClaimsOnLogin`** - Chamada automaticamente após o login:
- Quando o usuário faz login (Google, email/password)
- Busca os dados do usuário na collection `companies/{companyId}/users`
- Se o usuário tem contexto salvo (empresa selecionada), usa esse contexto
- Se não, busca em todas as empresas e usa o primeiro encontrado
- Seta os custom claims imediatamente
- O token é atualizado automaticamente

**IMPORTANTE - Múltiplas Empresas:**
- Um usuário pode estar em múltiplas empresas com roles diferentes
- Os claims refletem o contexto ATUAL (empresa ativa) do usuário
- Quando o usuário troca de empresa via `switchContext`, os claims são atualizados automaticamente

**Vantagens:**
- ✅ Claims setados no momento do login (sem delay)
- ✅ Suporta múltiplas empresas (usa contexto atual)
- ✅ Não depende de triggers do Firestore
- ✅ Mais rápido e confiável

### 1.1. Atualizar Claims ao Trocar de Contexto

**`updateUserCustomClaimsForContext`** - Chamada automaticamente quando o usuário troca de empresa:
- Quando `switchContext` é chamado no frontend
- Atualiza os custom claims para o novo contexto (empresa + role)
- O token é atualizado automaticamente

### 2. Função Automática (`updateUserCustomClaims`) - Backup

Esta função monitora a collection `users/{userId}` e atualiza automaticamente os custom claims quando:
- Um usuário é criado
- Um usuário é atualizado (role, companyId, ativo)
- Um usuário é deletado

**Útil como backup** caso o usuário não tenha feito login recentemente.

**Claims armazenados:**
- `role`: Papel do usuário (owner, admin, pro, atendente)
- `companyId`: ID da empresa do usuário
- `ativo`: Status ativo/inativo do usuário

### 3. Verificação Otimizada (`checkUserPermission`)

A função `checkUserPermission` agora:
1. **Primeiro**: Tenta usar custom claims do token (0ms - instantâneo!)
2. **Fallback**: Se não tiver claims, consulta Firestore (1400ms - mais lento)

## Como Usar

### Passo 1: Deploy das Funções

```bash
cd functions
npm run build
firebase deploy --only functions:setUserCustomClaimsOnLogin,functions:updateUserCustomClaims,functions:syncUserCustomClaims,functions:aiAssistant
```

**Importante:** A função `setUserCustomClaimsOnLogin` já está integrada nas funções de login (`loginWithGoogle`, `loginWithEmail`, `registerWithEmail`), então os claims serão setados automaticamente após cada login!

### Passo 2: Migrar Usuários Existentes

**Opção A: Automático (Recomendado)**
Os usuários existentes terão os claims setados automaticamente quando fizerem login novamente! A função `setUserCustomClaimsOnLogin` será chamada automaticamente.

**Opção B: Manual (Para migração imediata)**
Se quiser migrar todos os usuários imediatamente sem esperar o próximo login:

**Opção A: Via Console do Firebase**
```javascript
// No console do Firebase, execute:
const admin = require('firebase-admin');
admin.initializeApp();

const users = await admin.firestore().collection('users').get();
for (const userDoc of users.docs) {
  const userData = userDoc.data();
  await admin.auth().setCustomUserClaims(userDoc.id, {
    role: userData.role || 'atendente',
    companyId: userData.companyId || null,
    ativo: userData.ativo !== false,
  });
  console.log(`Claims atualizados para ${userDoc.id}`);
}
```

**Opção B: Via Função Cloud Function**
```javascript
// Chamar a função syncUserCustomClaims para cada usuário
// (requer autenticação como admin/owner)
```

### Passo 3: Frontend Já Configurado! ✅

O frontend já está configurado! As funções de login (`loginWithGoogle`, `loginWithEmail`, `registerWithEmail`) já chamam automaticamente `setUserCustomClaimsOnLogin` e fazem refresh do token.

**Não é necessário fazer nada no frontend!** 🎉

## Estrutura de Dados

### Firestore: `users/{userId}`
```typescript
{
  role: 'owner' | 'admin' | 'pro' | 'atendente',
  companyId: string | null,
  ativo: boolean,
  // ... outros campos
}
```

### Custom Claims (no token JWT)
```typescript
{
  role: 'owner' | 'admin' | 'pro' | 'atendente',
  companyId: string | null,
  ativo: boolean
}
```

## Benefícios

1. **Performance**: Verificação de permissões passa de ~1400ms para ~0ms
2. **Redução de custos**: Menos consultas ao Firestore
3. **Escalabilidade**: Funciona bem mesmo com muitos usuários
4. **Segurança**: Claims são assinados pelo Firebase, não podem ser falsificados

## Notas Importantes

1. **Refresh do Token**: Quando os claims são atualizados, o usuário precisa fazer refresh do token para receber os novos claims. Isso acontece automaticamente quando o token expira (1 hora), ou pode ser forçado com `getIdToken(true)`.

2. **Estrutura de Usuários**: Esta implementação assume que os usuários estão em `users/{userId}` na raiz do Firestore. Se seus usuários estão em `companies/{companyId}/users/{userId}`, você precisará adaptar o path na função `updateUserCustomClaims`.

3. **Limite de Claims**: Firebase limita custom claims a 1000 bytes. Os claims atuais (role, companyId, ativo) usam muito menos que isso.

## Troubleshooting

### Claims não estão sendo atualizados?

1. Verifique os logs da função `updateUserCustomClaims` no Firebase Console
2. Verifique se o usuário existe no Firebase Auth (não apenas no Firestore)
3. Verifique se o path da collection está correto (`users/{userId}`)

### Verificação de permissões ainda está lenta?

1. Verifique se o token está sendo passado corretamente na requisição
2. Verifique os logs para ver se está usando claims ou fallback
3. Certifique-se de que os claims foram atualizados para o usuário

### Como verificar os claims de um usuário?

```javascript
// No console do Firebase ou em uma função admin
const admin = require('firebase-admin');
const user = await admin.auth().getUser('USER_ID');
console.log(user.customClaims);
```

## Próximos Passos

1. Fazer deploy das funções
2. Migrar usuários existentes (sincronizar claims)
3. Testar a função `aiAssistant` e verificar se a verificação de permissões está mais rápida
4. Monitorar os logs para confirmar que está usando claims (não fallback)

