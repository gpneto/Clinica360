# ⚡ Configuração Rápida - Evolution API no GCP

## 📋 Informações da VM

- **IP**: `34.123.27.105`
- **URL**: `http://34.123.27.105:8080`
- **Chave da API**: Verifique no arquivo `.env` da pasta `worker/` ou execute `./worker/generate-keys.sh`

## 🚀 Configuração nas Cloud Functions

### Opção 1: Firebase Console (Mais Fácil)

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Vá em **"Configurações"** > **"Variáveis de ambiente"**
3. Adicione/Atualize:
   - `EVOLUTION_API_URL` = `http://34.123.27.105:8080`
   - `EVOLUTION_API_KEY` = `sua-chave-gerada` (obtenha com `./worker/get-vm-info.sh`)
4. Clique em **"Salvar"**

### Opção 2: Firebase CLI

```bash
cd functions

# Configurar variáveis
firebase functions:config:set \
  evolution.api_url="http://34.123.27.105:8080" \
  evolution.api_key="sua-chave-gerada"

# Fazer redeploy
npm run deploy
```

### Opção 3: Google Cloud Console

1. Acesse: https://console.cloud.google.com/functions?project=agendamentointeligente-4405f
2. Selecione a função (ex: `evolutionWebhook`)
3. Clique em **"Editar"**
4. Vá em **"Variáveis e secrets"** > **"Variáveis de ambiente"**
5. Adicione:
   - `EVOLUTION_API_URL` = `http://34.123.27.105:8080`
   - `EVOLUTION_API_KEY` = `sua-chave-gerada`
6. Clique em **"Implantar"**

## 🧪 Testar

```bash
# Testar health check
curl http://34.123.27.105:8080/health

# Testar listagem de instâncias
curl -X GET http://34.123.27.105:8080/instance/fetchInstances \
  -H "apikey: sua-chave-gerada"
```

## 📝 Obter Informações da VM

Execute para ver todas as informações:

```bash
cd worker
./get-vm-info.sh
```

## ✅ Verificar se está funcionando

1. Acesse **Configurações** no sistema
2. Selecione **"Evolution API"** como provedor WhatsApp
3. Clique em **"Gerar/Atualizar QR Code"**
4. O QR code deve aparecer na tela

Se não aparecer, verifique os logs das Cloud Functions no Firebase Console.

