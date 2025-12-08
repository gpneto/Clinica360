# ⚡ Verificação Rápida do GCP

Links diretos para verificar rapidamente todas as configurações necessárias.

## 🔗 Links Diretos - Clique para Verificar

### 1. 🔑 Credenciais (API Keys e OAuth)
**CRÍTICO**: Verifique aqui as configurações de chave de API e cliente OAuth 2.0

👉 https://console.cloud.google.com/apis/credentials?project=agendamentointeligente-4405f

**O que verificar:**
- ✅ Chave de API tem restrições corretas ou nenhuma restrição
- ✅ Cliente OAuth 2.0 existe e tem URIs de redirecionamento:
  ```
  https://webagendamentos.web.app/__/auth/handler
  https://webagendamentos.firebaseapp.com/__/auth/handler
  https://agendamentointeligente-4405f.firebaseapp.com/__/auth/handler
  ```

---

### 2. 🔐 Identity Toolkit API
**CRÍTICO**: API obrigatória para Firebase Authentication

👉 https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=agendamentointeligente-4405f

**O que verificar:**
- ✅ Status: **Habilitada** (se não estiver, clique em "Ativar")

---

### 3. 🔥 Firebase - Autenticação - Domínios Autorizados
**CRÍTICO**: Domínios onde a autenticação pode ocorrer

👉 https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/settings

**O que verificar:**
- Role até "Domínios autorizados"
- ✅ Deve conter:
  - `webagendamentos.web.app`
  - `webagendamentos.firebaseapp.com`
  - `agendamentointeligente-4405f.firebaseapp.com`
  - `localhost`

---

### 4. 🔥 Firebase - Autenticação - Provedores
**CRÍTICO**: Verificar se Google está habilitado

👉 https://console.firebase.google.com/project/agendamentointeligente-4405f/authentication/providers

**O que verificar:**
- ✅ Google deve estar **habilitado**
- ✅ Project support email configurado

---

### 5. 🌐 Firebase - Hosting
**IMPORTANTE**: Verificar configuração do site

👉 https://console.firebase.google.com/project/agendamentointeligente-4405f/hosting

**O que verificar:**
- ✅ Site `webagendamentos` configurado
- ✅ Domínio `webagendamentos.web.app` ativo

---

## ✅ Checklist Rápido

Marque conforme verificar:

- [ ] **API Identity Toolkit** está habilitada
- [ ] **Chave de API** tem restrições corretas ou nenhuma
- [ ] **Cliente OAuth 2.0** tem URIs de redirecionamento corretas
- [ ] **Domínios autorizados** no Firebase Authentication
- [ ] **Provedor Google** habilitado no Firebase
- [ ] **Firebase Hosting** configurado corretamente

---

## 🚨 Se Encontrar Problemas

### Erro: "requests-from-referer-are-blocked"
→ Verifique a **Chave de API** (link #1) e remova restrições ou adicione o domínio

### Erro: "The requested action is invalid"
→ Verifique o **Cliente OAuth 2.0** (link #1) e adicione as URIs de redirecionamento

### Erro: "unauthorized-domain"
→ Verifique **Domínios autorizados** no Firebase (link #3)

---

## 📚 Documentação Completa

Para instruções detalhadas, consulte:
- `VERIFICACAO_GCP.md` - Guia completo de verificação
- `SOLUCAO_ERRO_API_KEY.md` - Solução para erros de API Key
- `SOLUCAO_ERRO_OAUTH_POPUP.md` - Solução para erros OAuth

---

## 🔧 Script Automatizado

Execute o script de verificação (requer gcloud CLI):

```bash
./scripts/verificar-gcp.sh
```

---

**💡 Dica**: Abra todos os links em abas diferentes e verifique cada um rapidamente!


