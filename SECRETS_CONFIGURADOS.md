# ✅ Secrets Configurados para Evolution API

## 🎉 O que foi feito

As Cloud Functions foram atualizadas para usar **secrets** do Secret Manager, seguindo o mesmo padrão do `OPENAI_API_KEY`.

## 📋 Funções Atualizadas

As seguintes funções agora usam os secrets `evolution-api-key` e `evolution-api-url`:

1. ✅ `startEvolutionSession` - Para criar/obter instâncias e QR codes
2. ✅ `sendWhatsappMessage` - Para enviar mensagens via Evolution
3. ✅ `sendBirthdayMessage` - Para enviar mensagens de aniversário via Evolution
4. ✅ `evolutionWebhook` - Para receber webhooks da Evolution API

## 🔐 Secrets Configurados

Os seguintes secrets estão no Secret Manager e foram vinculados às funções:

- `evolution-api-key` = `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`
- `evolution-api-url` = `http://34.123.27.105:8080`

## ✅ Permissões Concedidas

O Firebase automaticamente concedeu acesso aos secrets:
- `roles/secretmanager.secretAccessor` para `evolution-api-key`
- `roles/secretmanager.secretAccessor` para `evolution-api-url`

## 🔧 Como Funciona

Quando você declara `secrets: ['evolution-api-key']` em uma função, o Firebase:
1. Busca o secret no Secret Manager
2. Disponibiliza como variável de ambiente
3. A função pode acessar via `process.env['evolution-api-key']`

## 🧪 Testar

Agora você pode testar:

1. Acesse **Configurações** no sistema
2. Selecione **"Evolution API"** como provedor
3. Clique em **"Gerar/Atualizar QR Code"**
4. O QR code deve aparecer sem erros! ✅

## 📝 Notas

- Os secrets são mais seguros que variáveis de ambiente (não aparecem em logs)
- Seguem o mesmo padrão do `OPENAI_API_KEY`
- Não é mais necessário configurar variáveis de ambiente manualmente
- Os secrets já existiam no Secret Manager, apenas foram vinculados às funções

## 🔍 Verificar Secrets

Para ver os secrets:

```bash
gcloud secrets list --project=agendamentointeligente-4405f
```

Para ver o valor de um secret:

```bash
gcloud secrets versions access latest --secret=evolution-api-key --project=agendamentointeligente-4405f
gcloud secrets versions access latest --secret=evolution-api-url --project=agendamentointeligente-4405f
```

