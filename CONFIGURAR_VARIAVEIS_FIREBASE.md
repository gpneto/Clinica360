# 🔧 Configurar Variáveis de Ambiente no Firebase

## ⚠️ Erro Atual

Se você está vendo o erro:
```
Erro ao buscar instâncias: 400 {"error":{"message":"Bad Request","status":"INVALID_ARGUMENT"}}
```

Isso significa que as variáveis de ambiente **não estão configuradas** nas Cloud Functions.

## ✅ Solução: Configurar no Firebase Console

### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions

### Passo 2: Configurar Variáveis de Ambiente

1. Clique no ícone de **⚙️ Configurações** (canto superior direito)
2. Vá na aba **"Variáveis de ambiente"**
3. Clique em **"Adicionar variável"**

#### Variável 1: EVOLUTION_API_URL
- **Nome**: `EVOLUTION_API_URL`
- **Valor**: `http://34.123.27.105:8080`

#### Variável 2: EVOLUTION_API_KEY
- **Nome**: `EVOLUTION_API_KEY`
- **Valor**: `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

4. Clique em **"Salvar"**

### Passo 3: Aguardar Aplicação

- As variáveis são aplicadas automaticamente
- Pode levar 1-2 minutos para serem aplicadas
- **Não é necessário fazer redeploy**

### Passo 4: Testar

1. Acesse **Configurações** no sistema
2. Selecione **"Evolution API"** como provedor
3. Clique em **"Gerar/Atualizar QR Code"**
4. O erro deve desaparecer e o QR code deve aparecer

## 🔍 Verificar se Está Configurado

### No Firebase Console

1. Vá em **Configurações** > **Variáveis de ambiente**
2. Verifique se aparecem:
   - `EVOLUTION_API_URL` = `http://34.123.27.105:8080`
   - `EVOLUTION_API_KEY` = `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

### Via Logs

Os logs das Cloud Functions mostrarão avisos se as variáveis não estiverem configuradas:
```
[Evolution] ⚠️ EVOLUTION_API_KEY não configurada!
```

## 🆘 Troubleshooting

### Erro persiste após configurar

1. **Aguarde 2-3 minutos** - As variáveis podem levar tempo para serem aplicadas
2. **Verifique se não há espaços** nos valores das variáveis
3. **Verifique se a chave está correta** - Compare com a chave na VM
4. **Verifique os logs** das Cloud Functions no Firebase Console

### Como verificar a chave na VM

```bash
gcloud compute ssh evolution-api --zone=us-central1-a --command="sudo docker compose exec evolution-api env | grep AUTHENTICATION_API_KEY"
```

### Testar API diretamente

```bash
curl -X GET http://34.123.27.105:8080/instance/fetchInstances \
  -H "apikey: ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec"
```

Deve retornar `[]` (array vazio) se estiver funcionando.

## 📝 Notas Importantes

- As variáveis são aplicadas a **todas** as Cloud Functions do projeto
- Não é necessário fazer redeploy após adicionar variáveis
- A chave da API deve ser a **mesma** configurada na VM
- A URL deve apontar para o IP da VM no GCP

