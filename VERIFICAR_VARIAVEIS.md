# ✅ Verificar e Configurar Variáveis de Ambiente

## 🔍 Como Verificar se Está Configurado

### Método 1: Firebase Console (Recomendado)

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Clique no ícone **⚙️ Configurações** (canto superior direito)
3. Vá na aba **"Variáveis de ambiente"**
4. Verifique se aparecem estas duas variáveis:

   ✅ `EVOLUTION_API_URL` = `http://34.123.27.105:8080`
   ✅ `EVOLUTION_API_KEY` = `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

### Método 2: Google Cloud Console

1. Acesse: https://console.cloud.google.com/functions?project=agendamentointeligente-4405f
2. Selecione uma função (ex: `startEvolutionSession`)
3. Clique em **"Editar"**
4. Vá em **"Variáveis e secrets"** > **"Variáveis de ambiente"**
5. Verifique se as variáveis estão listadas

## 🔧 Como Configurar (Passo a Passo)

### Passo 1: Acessar Firebase Console

```
https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
```

### Passo 2: Abrir Configurações

1. Clique no ícone de **⚙️ Configurações** (engrenagem) no canto superior direito
2. Se não aparecer, procure por "Configurações do projeto" ou "Project settings"

### Passo 3: Ir para Variáveis de Ambiente

1. Na página de configurações, procure pela aba **"Variáveis de ambiente"**
2. Ou procure por **"Environment variables"** se estiver em inglês

### Passo 4: Adicionar Variáveis

#### Variável 1: EVOLUTION_API_URL

1. Clique em **"Adicionar variável"** ou **"Add variable"**
2. **Nome**: `EVOLUTION_API_URL`
3. **Valor**: `http://34.123.27.105:8080`
4. Clique em **"Salvar"** ou **"Save"**

#### Variável 2: EVOLUTION_API_KEY

1. Clique em **"Adicionar variável"** novamente
2. **Nome**: `EVOLUTION_API_KEY`
3. **Valor**: `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`
4. Clique em **"Salvar"** ou **"Save"**

### Passo 5: Aguardar Aplicação

- ⏱️ Aguarde **2-3 minutos** para as variáveis serem aplicadas
- Não é necessário fazer redeploy
- As funções usarão automaticamente as novas variáveis

## 🧪 Testar se Está Funcionando

### Teste 1: Via Frontend

1. Acesse **Configurações** no sistema
2. Selecione **"Evolution API"** como provedor WhatsApp
3. Clique em **"Gerar/Atualizar QR Code"**
4. Se aparecer o QR code, está funcionando! ✅
5. Se ainda aparecer erro, aguarde mais 1-2 minutos e tente novamente

### Teste 2: Via Logs

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions/logs
2. Procure por logs da função `startEvolutionSession`
3. Se aparecer `[Evolution] ⚠️ EVOLUTION_API_KEY não configurada!`, as variáveis ainda não foram aplicadas
4. Se não aparecer esse aviso, está funcionando! ✅

## 🆘 Problemas Comuns

### Erro persiste após configurar

**Solução 1: Aguardar mais tempo**
- As variáveis podem levar até 5 minutos para serem aplicadas
- Aguarde e tente novamente

**Solução 2: Verificar se não há espaços**
- Certifique-se de que não há espaços antes ou depois dos valores
- Copie e cole os valores exatamente como mostrado

**Solução 3: Verificar se o nome está correto**
- O nome deve ser exatamente: `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`
- É case-sensitive (maiúsculas/minúsculas importam)

**Solução 4: Verificar se salvou**
- Certifique-se de clicar em **"Salvar"** após adicionar cada variável
- Verifique se as variáveis aparecem na lista

### Não consigo encontrar "Variáveis de ambiente"

**Solução:**
1. Certifique-se de estar na página correta: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Procure por "Configurações" ou "Settings"
3. Se ainda não encontrar, tente via Google Cloud Console:
   - https://console.cloud.google.com/functions?project=agendamentointeligente-4405f
   - Selecione uma função > Editar > Variáveis e secrets

### Variáveis aparecem mas ainda dá erro

**Solução:**
1. Verifique se os valores estão corretos (sem espaços extras)
2. Aguarde mais 2-3 minutos
3. Tente fazer um redeploy (opcional):
   ```bash
   cd functions
   npm run deploy
   ```

## 📝 Valores Corretos

Certifique-se de usar exatamente estes valores:

```
EVOLUTION_API_URL=http://34.123.27.105:8080
EVOLUTION_API_KEY=ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec
```

## 🔗 Links Úteis

- Firebase Console: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
- Google Cloud Console: https://console.cloud.google.com/functions?project=agendamentointeligente-4405f
- Logs das Functions: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions/logs

