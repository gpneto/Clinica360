# ⚡ Configurar Evolution API no Firebase Functions

## 📋 Informações da VM no GCP

- **IP**: `34.123.27.105`
- **URL**: `http://34.123.27.105:8080`
- **Chave da API**: `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

## 🚀 Configuração no Firebase Console

### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions

### Passo 2: Configurar Variáveis de Ambiente

1. Clique em **"Configurações"** (ícone de engrenagem no canto superior direito)
2. Vá na aba **"Variáveis de ambiente"**
3. Clique em **"Adicionar variável"** e adicione:

   **Variável 1:**
   - Nome: `EVOLUTION_API_URL`
   - Valor: `http://34.123.27.105:8080`

   **Variável 2:**
   - Nome: `EVOLUTION_API_KEY`
   - Valor: `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

4. Clique em **"Salvar"**

### Passo 3: Fazer Redeploy (Opcional mas Recomendado)

Após adicionar as variáveis, é recomendado fazer um redeploy para garantir que as funções usem as novas variáveis:

```bash
cd functions
npm run deploy
```

## 🧪 Testar

### 1. Testar Health Check da API

```bash
curl http://34.123.27.105:8080/health
```

### 2. Testar Listagem de Instâncias

```bash
curl -X GET http://34.123.27.105:8080/instance/fetchInstances \
  -H "apikey: ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec"
```

### 3. Testar pelo Frontend

1. Acesse **Configurações** no sistema
2. Selecione **"Evolution API"** como provedor WhatsApp
3. Clique em **"Gerar/Atualizar QR Code"**
4. O QR code deve aparecer na tela

## 🔍 Verificar se está Configurado

### Ver logs das Cloud Functions

```bash
firebase functions:log --only evolutionWebhook
```

Ou no Firebase Console:
- Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions/logs
- Filtre por `evolutionWebhook` ou `startEvolutionSession`

### Verificar variáveis configuradas

No Firebase Console, vá em **Configurações** > **Variáveis de ambiente** e verifique se as variáveis aparecem na lista.

## 🆘 Troubleshooting

### Erro: "Cannot connect to Evolution API"

- Verifique se a VM está rodando: `gcloud compute instances list`
- Verifique se o firewall permite conexões: `./setup-firewall.sh`
- Teste conectividade: `curl http://34.123.27.105:8080/health`

### QR Code não aparece

- Verifique os logs das Cloud Functions
- Verifique se `EVOLUTION_API_URL` está correto
- Verifique se a Evolution API está acessível

### Erro: "Invalid API key"

- Verifique se a chave nas Cloud Functions corresponde à chave na VM
- Verifique se não há espaços extras na configuração

## 📝 Notas

- As variáveis de ambiente são aplicadas a **todas** as Cloud Functions do projeto
- Após adicionar variáveis, pode levar alguns minutos para serem aplicadas
- Recomenda-se fazer redeploy após adicionar variáveis novas

