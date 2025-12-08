# 🔧 Solução: Erro "The requested action is invalid" no Popup OAuth

## ⚠️ Erro

```
The requested action is invalid.
```

Este erro ocorre durante o processo de autenticação com Google OAuth via popup.

## 🔍 Causa

Este erro geralmente ocorre quando:
1. **Domínios autorizados não estão configurados** no Firebase Authentication
2. **URI de redirecionamento não está autorizado** no Google Cloud Console
3. **authDomain não corresponde** ao domínio onde a aplicação está rodando
4. **Credenciais OAuth não estão configuradas** corretamente no Google Cloud Console

## ✅ Solução Passo a Passo

### Passo 1: Configurar Domínios Autorizados no Firebase

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings
2. Role até a seção **"Domínios autorizados"**
3. Verifique se os seguintes domínios estão listados. Se não estiverem, adicione:
   - `webagendamentos.web.app`
   - `webagendamentos.firebaseapp.com`
   - `agendamentointeligente-4405f.firebaseapp.com`
   - `agendamentointeligente-4405f.web.app`
   - `localhost` (para desenvolvimento)
   - Seu domínio customizado (se houver)

4. Para adicionar um domínio:
   - Clique em **"Adicionar domínio"**
   - Digite o domínio (ex: `webagendamentos.web.app`)
   - Clique em **"Adicionar"**

### Passo 2: Verificar Configuração do Provedor Google

1. No Firebase Console, vá em **Authentication** > **Sign-in method**
2. Clique em **"Google"**
3. Verifique se está **ativado**
4. Verifique o **Project support email** está configurado
5. Clique em **"Salvar"**

### Passo 3: Configurar OAuth no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f
2. No menu lateral, vá em **APIs e Serviços** > **Credenciais**
3. Procure pela seção **"IDs de cliente OAuth 2.0"**
4. Clique no cliente OAuth 2.0 (deve haver um criado automaticamente pelo Firebase)
5. Verifique as **"URIs de redirecionamento autorizados"**

#### Adicione os seguintes URIs de redirecionamento:

```
https://webagendamentos.web.app/__/auth/handler
https://webagendamentos.firebaseapp.com/__/auth/handler
https://agendamentointeligente-4405f.firebaseapp.com/__/auth/handler
https://agendamentointeligente-4405f.web.app/__/auth/handler
http://localhost:3000/__/auth/handler
http://127.0.0.1:3000/__/auth/handler
```

**Importante**: O formato é sempre `https://SEU_DOMINIO/__/auth/handler`

6. Se não houver um cliente OAuth 2.0 criado:
   - Clique em **"+ Criar credenciais"** > **"ID de cliente OAuth"**
   - Tipo de aplicativo: **"Aplicativo da Web"**
   - Nome: "Firebase Auth Web Client"
   - Adicione os URIs de redirecionamento acima
   - Clique em **"Criar"**

### Passo 4: Verificar authDomain no Código

Verifique se o `authDomain` no arquivo `.env.local` corresponde ao domínio configurado:

```env
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=agendamentointeligente-4405f.firebaseapp.com
```

Ou se você está usando um domínio customizado:

```env
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=webagendamentos.web.app
```

**Importante**: O `authDomain` deve corresponder ao domínio onde sua aplicação está hospedada.

### Passo 5: Verificar se a API Identity Toolkit está Habilitada

1. Acesse: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=agendamentointeligente-4405f
2. Verifique se a API está **habilitada**
3. Se não estiver, clique em **"Ativar"**

### Passo 6: Limpar Cache e Testar

1. **Aguarde 5-10 minutos** após fazer as alterações (para propagação)
2. **Limpe o cache do navegador** completamente:
   - Chrome/Edge: Ctrl+Shift+Delete (Windows) ou Cmd+Shift+Delete (Mac)
   - Ou use modo anônimo/privado
3. **Limpe cookies** do domínio `webagendamentos.web.app`
4. Tente fazer login novamente

## 🔄 Solução Alternativa: Usar Redirect em vez de Popup

Se o problema persistir, você pode usar `signInWithRedirect` em vez de `signInWithPopup`:

```typescript
import { signInWithRedirect } from 'firebase/auth';

export async function loginWithGoogle() {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
}
```

**Nota**: Com redirect, o usuário será redirecionado para a página do Google e depois voltará para sua aplicação.

## 🔍 Verificações Adicionais

### Verificar Configuração no Console do Navegador

Abra o console do navegador (F12) e verifique:
- Se há erros de CORS
- Se há erros de bloqueio de popup
- Se há erros relacionados ao authDomain

### Verificar Configuração do Firebase Hosting

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/hosting
2. Verifique qual site está configurado
3. Verifique se o domínio corresponde ao usado no `authDomain`

### Verificar Variáveis de Ambiente

Certifique-se de que todas as variáveis estão corretas no `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=agendamentointeligente-4405f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=agendamentointeligente-4405f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=agendamentointeligente-4405f.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

**Após alterar**, você precisará fazer rebuild e redeploy:

```bash
npm run build
firebase deploy --only hosting
```

## 📋 Checklist de Verificação

Após configurar, verifique:

- [ ] Domínios adicionados no Firebase Authentication > Domínios autorizados
- [ ] Provedor Google ativado no Firebase Authentication
- [ ] URIs de redirecionamento adicionadas no Google Cloud Console
- [ ] API Identity Toolkit habilitada no Google Cloud Console
- [ ] authDomain corresponde ao domínio de hospedagem
- [ ] Variáveis de ambiente estão corretas
- [ ] Aguardou 5-10 minutos para propagação
- [ ] Cache do navegador limpo
- [ ] Testado em modo anônimo/privado

## 🆘 Problemas Persistem?

### Erro continua aparecendo:

1. **Verifique os logs do navegador** para erros mais específicos
2. **Teste em outro navegador** para descartar extensões
3. **Verifique se não há bloqueadores de popup** ativos
4. **Verifique se o domínio está na lista negra** do Google

### Não encontro as configurações:

1. Certifique-se de estar no projeto correto: `agendamentointeligente-4405f`
2. Verifique se você tem permissões de administrador no projeto
3. Tente acessar diretamente pelos links fornecidos acima

### Preciso criar um novo cliente OAuth:

1. Vá em Google Cloud Console > APIs e Serviços > Credenciais
2. Clique em "+ Criar credenciais" > "ID de cliente OAuth"
3. Configure conforme o Passo 3 acima
4. Copie o Client ID e Client Secret
5. No Firebase Console, vá em Authentication > Sign-in method > Google
6. Cole o Client ID e Client Secret (se necessário)

## 📚 Referências

- [Firebase Authentication - Configurar domínios autorizados](https://firebase.google.com/docs/auth/web/custom-domain)
- [Google OAuth 2.0 - Configurar URIs de redirecionamento](https://support.google.com/cloud/answer/6158849)
- [Firebase Hosting - Domínios customizados](https://firebase.google.com/docs/hosting/custom-domain)



