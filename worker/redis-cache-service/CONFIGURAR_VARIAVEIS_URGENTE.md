# ⚠️ CONFIGURAR VARIÁVEIS DE AMBIENTE - URGENTE

## 🔍 Problema Identificado

Pelos logs, o serviço Python **NÃO está sendo usado**. Os logs mostram:
- `[Redis] Cache HIT` (conexão direta)
- **NÃO aparece** `[Redis HTTP]` ou `[Settings] Usando Redis Cache Service HTTP`

Isso significa que `REDIS_SERVICE_URL` **não está configurada** nas Cloud Functions.

## ✅ Solução Rápida

### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Clique no ícone **⚙️ Configurações** (canto superior direito)
3. Vá na aba **"Variáveis de ambiente"** ou **"Environment variables"**

### Passo 2: Adicionar Variáveis

Clique em **"Adicionar variável"** ou **"Add variable"** e adicione:

#### Variável 1: REDIS_SERVICE_URL
- **Nome**: `REDIS_SERVICE_URL`
- **Valor**: `http://34.42.180.145:8081`
- Clique em **"Salvar"**

#### Variável 2: REDIS_SERVICE_API_KEY
- **Nome**: `REDIS_SERVICE_API_KEY`
- **Valor**: `SmartDoctorRedisService2024!Secure`
- Clique em **"Salvar"**

### Passo 3: Aguardar Aplicação

- ⏱️ Aguarde **2-3 minutos** para as variáveis serem aplicadas
- **Não é necessário fazer redeploy** (mas pode ajudar)

### Passo 4: Verificar nos Logs

Após configurar, os logs devem mostrar:

```
[Settings] Usando Redis Cache Service HTTP: http://34.42.180.145:8081
[Redis HTTP] Cache HIT para "company:xxx:settings" (Xms)
```

## 🧪 Testar Rapidamente

Após configurar, envie uma mensagem no WhatsApp e verifique os logs:

```bash
firebase functions:log --only evolutionWebhook | grep -i "redis"
```

Você deve ver:
- ✅ `[Settings] Usando Redis Cache Service HTTP: ...`
- ✅ `[Redis HTTP] Cache HIT` ou `[Redis HTTP] Cache SET`

## 📸 Screenshot do Firebase Console

Se não encontrar a opção, procure por:
- **Functions** > **Configurações** > **Variáveis de ambiente**
- Ou: **Project Settings** > **Environment variables**

## ⚠️ Importante

- As variáveis são aplicadas **automaticamente** após salvar
- Pode levar **2-3 minutos** para serem aplicadas
- **Não precisa fazer redeploy**, mas pode ajudar a garantir

## 🔄 Alternativa: Via Google Cloud Console

Se não encontrar no Firebase Console:

1. Acesse: https://console.cloud.google.com/functions?project=agendamentointeligente-4405f
2. Selecione uma função (ex: `evolutionWebhook`)
3. Clique em **"Editar"**
4. Vá em **"Variáveis e secrets"** > **"Variáveis de ambiente"**
5. Adicione as variáveis acima
6. Clique em **"Implantar"**

## ✅ Após Configurar

Os logs devem mudar de:
```
[Settings] Usando conexão Redis direta
[Redis] Cache HIT para "company:xxx:settings" (2ms)
```

Para:
```
[Settings] Usando Redis Cache Service HTTP: http://34.42.180.145:8081
[Redis HTTP] Cache HIT para "company:xxx:settings" (45ms)
```

