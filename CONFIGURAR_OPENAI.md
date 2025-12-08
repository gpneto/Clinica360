# Configuração do Assistente IA com OpenAI

Este documento explica como configurar o Assistente IA integrado ao sistema.

## Pré-requisitos

1. Conta na OpenAI (https://platform.openai.com/)
2. API Key da OpenAI
3. Acesso ao Firebase Console para configurar secrets

## Passo 1: Obter API Key da OpenAI

1. Acesse https://platform.openai.com/
2. Faça login na sua conta
3. Vá em **API Keys** no menu lateral
4. Clique em **Create new secret key**
5. Copie a chave gerada (ela só será mostrada uma vez!)

## Passo 2: Configurar Secret no Firebase

### ⚠️ IMPORTANTE: Configuração Correta da API Key

A API key deve ser configurada **SEM espaços, quebras de linha ou caracteres especiais** no início ou fim. Apenas o valor da chave, sem o prefixo "Bearer" ou qualquer outro texto.

### Opção 1: Via Firebase Console (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Functions** > **Secrets**
4. Clique em **Add secret**
5. Nome do secret: `OPENAI_API_KEY` (exatamente assim, sem espaços)
6. Valor: Cole **APENAS** a API Key da OpenAI (sem espaços antes ou depois)
   - ✅ Correto: `sk-proj-abc123...`
   - ❌ Errado: `Bearer sk-proj-abc123...`
   - ❌ Errado: ` sk-proj-abc123... ` (com espaços)
   - ❌ Errado: `sk-proj-abc123...\n` (com quebra de linha)
7. Clique em **Save**

### Opção 2: Via Firebase CLI

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Quando solicitado:
- Cole **APENAS** a API Key (sem espaços ou quebras de linha)
- Pressione Enter
- Confirme a configuração

### Verificar se está configurado corretamente

Após configurar, você pode verificar se o secret está correto:

```bash
firebase functions:secrets:access OPENAI_API_KEY
```

O resultado deve mostrar apenas a chave, sem espaços ou caracteres extras.

## Passo 3: Fazer Deploy da Function

Após configurar o secret, faça o deploy da função:

```bash
cd functions
npm run build
firebase deploy --only functions:aiAssistant
```

Ou para fazer deploy de todas as functions:

```bash
firebase deploy --only functions
```

## Passo 4: Verificar Configuração

1. Acesse o sistema
2. Vá em **Assistente IA** no menu lateral
3. Teste fazendo uma pergunta simples, como: "Quantos agendamentos temos hoje?"

## Funcionalidades do Assistente IA

O assistente pode:

- ✅ **Criar agendamentos**: "Criar agendamento para João Silva amanhã às 14h"
- ✅ **Buscar agendamentos**: "Mostrar agendamentos do Dr. Pedro esta semana"
- ✅ **Consultar estatísticas**: "Quantos agendamentos temos hoje?"
- ✅ **Buscar pacientes**: "Encontrar paciente João Silva"
- ✅ **Buscar profissionais**: "Listar profissionais disponíveis"
- ✅ **Buscar serviços**: "Quais serviços temos disponíveis?"

## Exemplos de Uso

### Criar Agendamento
```
Usuário: "Criar agendamento para Maria Santos com o Dr. Pedro amanhã às 15h para limpeza"
```

### Buscar Agendamentos
```
Usuário: "Mostrar todos os agendamentos de hoje"
Usuário: "Quais agendamentos o Dr. Pedro tem esta semana?"
```

### Consultar Estatísticas
```
Usuário: "Quantos agendamentos temos este mês?"
Usuário: "Qual o valor total recebido hoje?"
```

### Buscar Informações
```
Usuário: "Encontrar paciente João Silva"
Usuário: "Listar todos os profissionais"
```

## Troubleshooting

### Erro: "Bearer ... is not a legal HTTP header value"
**Este é o erro mais comum!** Significa que a API key tem caracteres inválidos.

**Solução:**
1. Acesse o Firebase Console > Functions > Secrets
2. Edite o secret `OPENAI_API_KEY`
3. Remova **TODOS** os espaços, quebras de linha e caracteres especiais
4. Cole apenas a chave pura (ex: `sk-proj-abc123...`)
5. Salve e faça o deploy novamente:
   ```bash
   firebase deploy --only functions:aiAssistant
   ```

### Erro: "OPENAI_API_KEY não encontrado"
- Verifique se o secret foi configurado corretamente no Firebase
- Certifique-se de que o nome do secret é exatamente `OPENAI_API_KEY` (case-sensitive)
- Faça o deploy novamente da function após configurar o secret:
  ```bash
  firebase deploy --only functions:aiAssistant
  ```

### Erro: "Connection error" ou "ECONNREFUSED"
- Verifique sua conexão com a internet
- Verifique se a API da OpenAI está funcionando: https://status.openai.com/
- Aguarde alguns minutos e tente novamente

### Erro: "Erro ao processar solicitação da IA"
- Verifique se a API Key está válida e ativa na OpenAI
- Verifique se há créditos disponíveis na sua conta OpenAI: https://platform.openai.com/usage
- Verifique os logs da function no Firebase Console para mais detalhes

### A IA não consegue criar agendamentos
- Certifique-se de fornecer todas as informações necessárias:
  - Nome do paciente (ou ID)
  - Nome do profissional (ou ID)
  - Nome do serviço (ou ID)
  - Data e hora
- A IA tentará buscar IDs automaticamente se você fornecer nomes

## Custos

O assistente usa o modelo `gpt-4o-mini` da OpenAI, que é mais econômico. Os custos são baseados no uso:
- Aproximadamente $0.15 por 1M tokens de entrada
- Aproximadamente $0.60 por 1M tokens de saída

Para monitorar os custos, acesse: https://platform.openai.com/usage

## Segurança

- A API Key é armazenada como secret no Firebase (não aparece no código)
- Apenas usuários autenticados podem usar o assistente
- O assistente só acessa dados da empresa do usuário logado
- Todas as operações são registradas nos logs do Firebase

## Suporte

Em caso de problemas, verifique:
1. Logs da function no Firebase Console
2. Status da API da OpenAI em https://status.openai.com/
3. Documentação da OpenAI: https://platform.openai.com/docs

