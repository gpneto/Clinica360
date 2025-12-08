# 🔧 Solução: Erro de API Key Bloqueada

## ⚠️ Erro

```
Firebase: Error (auth/requests-from-referer-https://webagendamentos.web.app-are-blocked.)
Requests from referer https://agendamentointeligente-4405f.firebaseapp.com/ are blocked.
```

## 🔍 Causa

Este erro ocorre quando a **chave de API do Firebase** está configurada com **restrições de HTTP referrer** no Google Cloud Platform, mas os domínios onde sua aplicação está hospedada **não estão autorizados** na lista.

## ✅ Solução: Configurar Domínios Autorizados

### Passo 1: Acessar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **agendamentointeligente-4405f**

### Passo 2: Localizar a Chave de API

1. No menu lateral, vá em **APIs e Serviços** > **Credenciais**
2. Procure pela chave de API que está sendo usada (a mesma do arquivo `.env.local`)
3. Clique no **nome da chave** para editá-la

### Passo 3: Configurar Restrições de Aplicação

Na página de edição da chave de API:

1. Em **Restrições de aplicação**, você verá:
   - **Nenhuma restrição** (recomendado para desenvolvimento)
   - **Referenciadores HTTP (websites)**
   - **Aplicativos Android**
   - **Aplicativos iOS**

### Passo 4: Adicionar Domínios Autorizados

#### Opção A: Remover Restrições (Recomendado para Desenvolvimento)

1. Selecione **"Nenhuma restrição"**
2. Clique em **"Salvar"**
3. Aguarde 5 minutos para as mudanças serem aplicadas

**⚠️ Nota:** Esta opção permite que a chave seja usada de qualquer domínio. Para produção, use a Opção B.

#### Opção B: Adicionar Domínios Específicos (Recomendado para Produção)

1. Selecione **"Referenciadores HTTP (websites)"**
2. Clique em **"Adicionar um item"**
3. Adicione os seguintes domínios (um por linha):

```
https://webagendamentos.web.app/*
https://webagendamentos.web.app
https://agendamentointeligente-4405f.firebaseapp.com/*
https://agendamentointeligente-4405f.firebaseapp.com
http://localhost:3000/*
http://localhost:3000
http://127.0.0.1:3000/*
http://127.0.0.1:3000
```

**Formatos aceitos:**
- `https://example.com/*` - Permite todas as páginas do domínio
- `https://example.com` - Permite apenas a página inicial
- `http://localhost:3000/*` - Permite desenvolvimento local

4. Clique em **"Salvar"**
5. Aguarde 5 minutos para as mudanças serem aplicadas

### Passo 5: Verificar Restrições da API

Também é importante verificar se as **APIs necessárias estão habilitadas**:

1. No menu lateral, vá em **APIs e Serviços** > **Biblioteca**
2. Certifique-se de que estas APIs estão habilitadas:
   - ✅ **Identity Toolkit API** (obrigatória para Firebase Auth)
   - ✅ **Cloud Firestore API**
   - ✅ **Cloud Functions API**
   - ✅ **Cloud Storage API**

## 🔄 Passos Adicionais no Firebase Console

### Configurar Domínios Autorizados na Autenticação

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings
2. Role até a seção **"Domínios autorizados"**
3. Verifique se os seguintes domínios estão listados:
   - `webagendamentos.web.app`
   - `agendamentointeligente-4405f.firebaseapp.com`
   - `localhost` (para desenvolvimento)

4. Se algum domínio não estiver listado:
   - Clique em **"Adicionar domínio"**
   - Digite o domínio (ex: `webagendamentos.web.app`)
   - Clique em **"Adicionar"**

## 🧪 Testar a Solução

1. **Aguarde 5 minutos** após salvar as mudanças
2. Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
3. Tente fazer login novamente
4. Verifique o console do navegador - o erro não deve mais aparecer

## 🔍 Como Encontrar a Chave de API Correta

Para verificar qual chave de API está sendo usada:

1. Abra o arquivo `.env.local` na raiz do projeto
2. Procure por `NEXT_PUBLIC_FIREBASE_API_KEY`
3. Use essa chave no Google Cloud Console

Ou verifique no código:
```typescript
// lib/firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  // ...
};
```

## 📋 Checklist de Verificação

Após configurar, verifique:

- [ ] Chave de API configurada no Google Cloud Console
- [ ] Domínios adicionados nas restrições (ou restrições removidas)
- [ ] Mudanças salvas e aguardadas (5 minutos)
- [ ] Domínios autorizados no Firebase Authentication
- [ ] APIs necessárias habilitadas no Google Cloud Console
- [ ] Cache do navegador limpo
- [ ] Erro desapareceu do console

## 🆘 Problemas Persistem?

### Erro continua aparecendo:

1. **Aguarde mais tempo** - Pode levar até 15 minutos para propagar
2. **Verifique se está usando a chave correta** - Confirme que a chave no `.env.local` é a mesma configurada
3. **Verifique se há múltiplas chaves** - Pode haver uma chave diferente sendo usada
4. **Limpe completamente o cache** - Use modo anônimo/privado do navegador

### Não consigo encontrar a chave de API:

1. Vá em **Firebase Console** > **Project Settings** > **General**
2. Role até **"Your apps"**
3. Clique no app web configurado
4. A chave de API está em `apiKey` na configuração

### Chave de API diferente em produção:

Se você tem diferentes ambientes (dev/staging/prod), você pode precisar:
1. Criar chaves de API separadas para cada ambiente
2. Configurar restrições específicas para cada uma
3. Usar variáveis de ambiente diferentes por ambiente

## 📚 Referências

- [Documentação do Firebase sobre domínios autorizados](https://firebase.google.com/docs/auth/web/custom-domain)
- [Documentação do Google Cloud sobre restrições de API Key](https://cloud.google.com/docs/authentication/api-keys#restricting_apis)
- [Identity Toolkit API](https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com)



