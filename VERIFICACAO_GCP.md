# ✅ Verificação Completa das Configurações no GCP

Este guia lista todas as verificações necessárias no Google Cloud Platform para garantir que a autenticação OAuth funcione corretamente.

## 📋 Checklist de Verificação

### 1. ✅ Verificar APIs Habilitadas

#### Identity Toolkit API (OBRIGATÓRIA)
- **Link direto**: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=agendamentointeligente-4405f
- **Status esperado**: ✅ Habilitada
- **Ação**: Se não estiver habilitada, clique em **"Ativar"**

#### Outras APIs Necessárias:
1. **Cloud Firestore API**
   - Link: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=agendamentointeligente-4405f
   - Status: ✅ Deve estar habilitada

2. **Cloud Functions API**
   - Link: https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=agendamentointeligente-4405f
   - Status: ✅ Deve estar habilitada

3. **Cloud Storage API**
   - Link: https://console.cloud.google.com/apis/library/storage-component.googleapis.com?project=agendamentointeligente-4405f
   - Status: ✅ Deve estar habilitada

---

### 2. ✅ Verificar Chave de API (API Key)

#### Localização
- **Link direto**: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f

#### Verificações:
1. **Encontrar a chave de API** usada no projeto:
   - A chave está em: `.env.local` > `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Procure pela chave na lista de "Chaves de API"

2. **Verificar Restrições de Aplicação**:
   
   **Opção A: Sem Restrições (Recomendado para Desenvolvimento)**
   - ✅ "Nenhuma restrição" deve estar selecionado
   
   **Opção B: Com Restrições (Produção)**
   - Se "Referenciadores HTTP (websites)" estiver selecionado, verificar se contém:
     ```
     https://webagendamentos.web.app/*
     https://webagendamentos.web.app
     https://agendamentointeligente-4405f.firebaseapp.com/*
     https://agendamentointeligente-4405f.firebaseapp.com
     http://localhost:3000/*
     http://localhost:3000
     ```

3. **Verificar Restrições de API**:
   - Deve incluir pelo menos:
     - ✅ Identity Toolkit API
     - ✅ Cloud Firestore API

---

### 3. ✅ Verificar Cliente OAuth 2.0

#### Localização
- **Link direto**: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f
- Procure na seção **"IDs de cliente OAuth 2.0"**

#### Verificações:

1. **Existência do Cliente**:
   - ✅ Deve existir um cliente OAuth criado automaticamente pelo Firebase
   - Nome geralmente: "Web client (auto created by Google Service)"

2. **Tipo de Aplicativo**:
   - ✅ Tipo: **"Aplicativo da Web"**

3. **URIs de Redirecionamento Autorizadas**:
   
   **CRÍTICO**: Deve conter exatamente estas URIs:
   ```
   https://webagendamentos.web.app/__/auth/handler
   https://webagendamentos.firebaseapp.com/__/auth/handler
   https://agendamentointeligente-4405f.firebaseapp.com/__/auth/handler
   https://agendamentointeligente-4405f.web.app/__/auth/handler
   http://localhost:3000/__/auth/handler
   http://127.0.0.1:3000/__/auth/handler
   ```
   
   **Formato**: `https://DOMINIO/__/auth/handler`

4. **Origens JavaScript Autorizadas** (se disponível):
   ```
   https://webagendamentos.web.app
   https://webagendamentos.firebaseapp.com
   https://agendamentointeligente-4405f.firebaseapp.com
   https://agendamentointeligente-4405f.web.app
   http://localhost:3000
   ```

---

### 4. ✅ Verificar Firebase Console - Autenticação

#### Localização
- **Link direto**: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings

#### Verificações:

1. **Provedor Google**:
   - Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/providers
   - ✅ Google deve estar **habilitado**
   - ✅ Project support email deve estar configurado

2. **Domínios Autorizados**:
   - Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings
   - Role até "Domínios autorizados"
   - ✅ Deve conter:
     ```
     webagendamentos.web.app
     webagendamentos.firebaseapp.com
     agendamentointeligente-4405f.firebaseapp.com
     agendamentointeligente-4405f.web.app
     localhost
     ```

---

### 5. ✅ Verificar Firebase Hosting

#### Localização
- **Link direto**: https://console.firebase.google.com/project/agendamentointeligente-4405f/hosting

#### Verificações:

1. **Site Configurado**:
   - ✅ Site: `webagendamentos` deve estar configurado
   - ✅ Domínio: `webagendamentos.web.app` deve estar ativo

2. **Domínios Disponíveis**:
   - Verificar se aparecem os domínios esperados

---

### 6. ✅ Verificar Variáveis de Ambiente

#### Verificar no Código:
- Arquivo: `.env.local` (na raiz do projeto)
- ✅ Deve conter todas as variáveis necessárias

#### Verificar no Firebase Functions:
- **Link**: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
- Vá em **⚙️ Configurações** > **Variáveis de ambiente**
- ✅ Verificar se variáveis necessárias estão configuradas (se aplicável)

---

## 🔍 Como Verificar Cada Item

### Método 1: Verificação Manual

1. Abra cada link fornecido acima
2. Verifique se as configurações correspondem ao esperado
3. Anote qualquer diferença ou problema encontrado

### Método 2: Verificação via Console do Navegador

1. Abra o console do navegador (F12) na aplicação
2. Verifique erros relacionados a:
   - `auth/requests-from-referer-are-blocked`
   - `auth/invalid-action`
   - `auth/unauthorized-domain`

---

## 🚨 Problemas Comuns e Soluções

### Problema 1: "requests-from-referer-are-blocked"

**Causa**: Chave de API com restrições que não incluem o domínio

**Solução**:
1. Vá em: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f
2. Encontre a chave de API
3. Clique para editar
4. Em "Restrições de aplicação":
   - Opção A: Selecione "Nenhuma restrição"
   - Opção B: Adicione o domínio na lista de referenciadores HTTP
5. Salve e aguarde 5 minutos

---

### Problema 2: "The requested action is invalid"

**Causa**: URIs de redirecionamento não configuradas corretamente

**Solução**:
1. Vá em: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f
2. Encontre o "ID de cliente OAuth 2.0"
3. Clique para editar
4. Adicione todas as URIs listadas na seção 3 acima
5. Salve e aguarde 5-10 minutos

---

### Problema 3: "unauthorized-domain"

**Causa**: Domínio não autorizado no Firebase Authentication

**Solução**:
1. Vá em: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings
2. Role até "Domínios autorizados"
3. Adicione o domínio que está faltando
4. Aguarde alguns minutos

---

### Problema 4: API não habilitada

**Causa**: Identity Toolkit API não está habilitada

**Solução**:
1. Vá em: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=agendamentointeligente-4405f
2. Clique em **"Ativar"**
3. Aguarde alguns minutos para ativação

---

## 📝 Resumo das URLs Importantes

### Google Cloud Console

- **Credenciais (API Keys e OAuth)**: https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f
- **Identity Toolkit API**: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=agendamentointeligente-4405f
- **Biblioteca de APIs**: https://console.cloud.google.com/apis/library?project=agendamentointeligente-4405f

### Firebase Console

- **Autenticação - Settings**: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings
- **Autenticação - Provedores**: https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/providers
- **Hosting**: https://console.firebase.google.com/project/agendamentointeligente-4405f/hosting
- **Functions**: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions

---

## ✅ Checklist Final

Após verificar tudo, confirme:

- [ ] Identity Toolkit API está habilitada
- [ ] Chave de API tem restrições corretas (ou nenhuma)
- [ ] Cliente OAuth 2.0 existe e tem URIs de redirecionamento corretas
- [ ] Domínios estão autorizados no Firebase Authentication
- [ ] Provedor Google está habilitado no Firebase
- [ ] Firebase Hosting está configurado corretamente
- [ ] Variáveis de ambiente estão configuradas

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. Verifique os logs do console do navegador
2. Verifique os logs do Firebase Functions (se aplicável)
3. Consulte os arquivos:
   - `SOLUCAO_ERRO_API_KEY.md`
   - `SOLUCAO_ERRO_OAUTH_POPUP.md`

---

**Última atualização**: Baseado nas configurações do projeto `agendamentointeligente-4405f`


