# Configurar Evolution API no GCP

Este guia explica como configurar as Cloud Functions para usar a Evolution API que está rodando na VM do Google Cloud.

## 📋 Pré-requisitos

1. VM `evolution-api` criada e rodando no GCP
2. Evolution API deployada na VM
3. Acesso ao projeto Firebase/GCP

## 🚀 Configuração Rápida

### Opção 1: Script Automatizado

```bash
cd worker
chmod +x configure-gcp-api.sh
./configure-gcp-api.sh
```

Este script irá:
- Obter o IP da VM automaticamente
- Gerar chaves se necessário
- Configurar variáveis de ambiente
- Criar secrets no Secret Manager

### Opção 2: Configuração Manual

#### 1. Obter IP da VM

```bash
gcloud compute instances describe evolution-api \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

#### 2. Obter Chave da API

A chave foi gerada durante o deploy. Você pode:
- Verificar no script `deploy-to-vm.sh` que foi executado
- Ou gerar uma nova: `openssl rand -hex 32`

#### 3. Configurar Variáveis de Ambiente

##### Via Firebase Console (Recomendado)

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Vá em "Configurações" > "Variáveis de ambiente"
3. Adicione:
   - `EVOLUTION_API_URL`: `http://SEU_IP:8080`
   - `EVOLUTION_API_KEY`: `sua-chave-gerada`

##### Via Firebase CLI

```bash
cd functions

# Configurar variáveis
firebase functions:config:set \
  evolution.api_url="http://SEU_IP:8080" \
  evolution.api_key="sua-chave-gerada"

# Fazer redeploy
npm run deploy
```

##### Via Google Cloud Console

1. Acesse: https://console.cloud.google.com/functions
2. Selecione a função (ex: `evolutionWebhook`)
3. Vá em "Editar" > "Variáveis e secrets"
4. Adicione as variáveis:
   - `EVOLUTION_API_URL`: `http://SEU_IP:8080`
   - `EVOLUTION_API_KEY`: `sua-chave-gerada`
5. Clique em "Implantar"

## 🔐 Usando Secret Manager (Recomendado para Produção)

Para maior segurança, use Secret Manager:

```bash
# Criar secrets
echo -n "http://SEU_IP:8080" | gcloud secrets create evolution-api-url \
  --data-file=- \
  --project=agendamentointeligente-4405f \
  --replication-policy="automatic"

echo -n "sua-chave-gerada" | gcloud secrets create evolution-api-key \
  --data-file=- \
  --project=agendamentointeligente-4405f \
  --replication-policy="automatic"

# Dar permissão às Cloud Functions
gcloud secrets add-iam-policy-binding evolution-api-url \
  --member="serviceAccount:agendamentointeligente-4405f@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=agendamentointeligente-4405f

gcloud secrets add-iam-policy-binding evolution-api-key \
  --member="serviceAccount:agendamentointeligente-4405f@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=agendamentointeligente-4405f
```

Depois, atualize o código das Cloud Functions para ler dos secrets.

## 🧪 Testar Configuração

### 1. Testar Health Check

```bash
curl http://SEU_IP:8080/health
```

Deve retornar: `{"status":"ok"}` ou similar

### 2. Testar Listagem de Instâncias

```bash
curl -X GET http://SEU_IP:8080/instance/fetchInstances \
  -H "apikey: sua-chave-gerada"
```

Deve retornar um array (vazio inicialmente)

### 3. Testar via Cloud Function

Após configurar as variáveis, teste criar uma instância pelo frontend:
1. Acesse Configurações
2. Selecione "Evolution API" como provider
3. Clique em "Gerar/Atualizar QR Code"
4. Verifique se o QR code aparece

## 📝 Variáveis Necessárias

As seguintes variáveis devem estar configuradas nas Cloud Functions:

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `EVOLUTION_API_URL` | `http://34.123.27.105:8080` | URL da Evolution API na VM |
| `EVOLUTION_API_KEY` | `abc123...` | Chave de autenticação da API |

## 🔄 Atualizar URL (se o IP mudar)

Se a VM for recriada e o IP mudar:

1. Obter novo IP:
```bash
gcloud compute instances describe evolution-api \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

2. Atualizar variável de ambiente:
```bash
# Via Firebase CLI
firebase functions:config:set evolution.api_url="http://NOVO_IP:8080"

# Ou via Google Cloud Console
# Editar função > Variáveis > Atualizar EVOLUTION_API_URL
```

3. Fazer redeploy:
```bash
cd functions && npm run deploy
```

## 🆘 Troubleshooting

### Erro: "Connection refused"

- Verifique se a VM está rodando: `gcloud compute instances list`
- Verifique se o firewall permite conexões na porta 8080: `./setup-firewall.sh`
- Teste conectividade: `curl http://IP:8080/health`

### Erro: "Invalid API key"

- Verifique se a chave está correta
- Verifique se a chave na VM corresponde à chave nas Cloud Functions
- Verifique logs da VM: `gcloud compute ssh evolution-api --zone=us-central1-a --command="sudo docker compose logs evolution-api"`

### QR Code não aparece

- Verifique logs das Cloud Functions no Firebase Console
- Verifique se `EVOLUTION_API_URL` está correto
- Verifique se a Evolution API está acessível da internet

## 📚 Referências

- [Firebase Functions Environment Variables](https://firebase.google.com/docs/functions/config-env)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)

