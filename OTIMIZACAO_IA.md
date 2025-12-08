# Otimização de Prompts para IA - SmartDoctor

## 📊 Problema Identificado

O sistema estava enviando um prompt de **~150 linhas** a cada interação com a IA, aumentando:
- **Custo**: Mais tokens = mais dinheiro
- **Latência**: Mais dados para processar = resposta mais lenta
- **Limites**: Maior chance de exceder limites de contexto

## ✅ Solução Implementada: Otimização do Prompt

### Redução Aplicada
- **Antes**: ~150 linhas de instruções detalhadas
- **Depois**: ~15 linhas de instruções essenciais
- **Redução**: ~70% do tamanho do prompt

### Estratégia
1. **Consolidação**: Removidas redundâncias e repetições
2. **Movimentação**: Instruções detalhadas movidas para as `descriptions` das funções
3. **Simplificação**: Mantidas apenas regras críticas no system message

## 🚀 Outras Estratégias Disponíveis

### 1. Fine-Tuning (Treinar Modelo Customizado)

#### O que é?
Treinar um modelo com suas instruções e exemplos de conversas, criando um modelo especializado.

#### Vantagens
- ✅ Prompt mínimo (apenas contexto dinâmico)
- ✅ Comportamento mais consistente
- ✅ Menor custo por token após treinamento
- ✅ Respostas mais rápidas

#### Desvantagens
- ❌ Custo inicial de treinamento (~$8-50 por 1M tokens)
- ❌ Tempo de treinamento (algumas horas)
- ❌ Atualizações requerem retreino
- ❌ Precisa de dataset de exemplos

#### Quando Usar
- Comportamento do assistente é estável
- Você tem muitas conversas de exemplo
- Quer reduzir custos a longo prazo
- Precisa de comportamento muito específico

#### Como Implementar

```typescript
// 1. Preparar dataset de treinamento (formato JSONL)
const trainingData = [
  {
    messages: [
      { role: "system", content: "Você é um assistente..." },
      { role: "user", content: "O que tem pra hoje?" },
      { role: "assistant", content: "Hoje você tem..." }
    ]
  },
  // ... mais exemplos
];

// 2. Upload para OpenAI
const file = await openai.files.create({
  file: fs.createReadStream("training_data.jsonl"),
  purpose: "fine-tune"
});

// 3. Criar job de fine-tuning
const fineTune = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: "gpt-4o-mini" // ou gpt-3.5-turbo
});

// 4. Usar modelo fine-tuned
const response = await openai.chat.completions.create({
  model: "ft:gpt-4o-mini:org:custom-name:abc123", // ID do modelo treinado
  messages: [
    { role: "system", content: "Data atual: 2025-11-26" }, // Apenas contexto dinâmico
    ...userMessages
  ]
});
```

#### Custo Estimado
- **Treinamento**: ~$8-50 por 1M tokens
- **Uso**: Mesmo custo do modelo base
- **ROI**: Economia após ~10k-50k mensagens

---

### 2. Embeddings + RAG (Retrieval Augmented Generation)

#### O que é?
Armazenar instruções como embeddings e buscar apenas o contexto relevante por consulta.

#### Vantagens
- ✅ Prompt dinâmico baseado na pergunta
- ✅ Escalável para muitas instruções
- ✅ Pode incluir documentação completa
- ✅ Não requer treinamento

#### Desvantagens
- ❌ Complexidade adicional
- ❌ Custo de embeddings
- ❌ Pode perder contexto se busca falhar

#### Quando Usar
- Muitas regras/instruções diferentes
- Instruções mudam frequentemente
- Quer incluir documentação completa

#### Como Implementar

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { VectorStore } from "langchain/vectorstores";

// 1. Criar embeddings das instruções
const embeddings = new OpenAIEmbeddings();
const instructionChunks = [
  "Regra sobre datas: Use hoje para...",
  "Regra sobre agendamentos: Formato...",
  // ... todas as instruções
];

// 2. Armazenar em vector store
const vectorStore = await VectorStore.fromTexts(
  instructionChunks,
  [{ type: "instruction" }],
  embeddings
);

// 3. Buscar contexto relevante
async function getRelevantContext(userQuery: string) {
  const results = await vectorStore.similaritySearch(userQuery, 3);
  return results.map(r => r.pageContent).join("\n\n");
}

// 4. Usar no prompt
const context = await getRelevantContext(lastUserMessage);
const systemMessage = `Você é um assistente. Contexto relevante:\n${context}`;
```

---

### 3. Modelos Menores com Fine-Tuning

#### O que é?
Fine-tuning de modelos menores e mais baratos (GPT-3.5-turbo, GPT-4o-mini).

#### Vantagens
- ✅ Custo muito menor
- ✅ Respostas mais rápidas
- ✅ Mantém qualidade com fine-tuning

#### Desvantagens
- ❌ Capacidade limitada vs GPT-4
- ❌ Pode precisar de mais exemplos

#### Quando Usar
- Tarefas específicas e bem definidas
- Orçamento limitado
- Precisa de baixa latência

#### Custo Comparativo
- **GPT-4o**: $2.50/$10 por 1M tokens (input/output)
- **GPT-4o-mini**: $0.15/$0.60 por 1M tokens
- **GPT-3.5-turbo**: $0.50/$1.50 por 1M tokens

---

### 4. Estratégia Híbrida (Recomendada)

#### Combinação
1. **Prompt base mínimo** (já implementado)
2. **Fine-tuning** para comportamento específico
3. **Contexto dinâmico** apenas quando necessário

#### Implementação

```typescript
// Prompt base mínimo (sempre)
const baseSystemMessage = `Você é um assistente para agendamentos.`;

// Contexto dinâmico (apenas quando necessário)
function getDynamicContext(userQuery: string, today: string) {
  const context: string[] = [];
  
  // Adicionar apenas contexto relevante
  if (userQuery.includes("hoje") || userQuery.includes("amanhã")) {
    context.push(`Data atual: ${today}`);
  }
  
  if (userQuery.includes("valor") || userQuery.includes("recebi")) {
    context.push("Formato valores: R$ X.XXX,XX");
  }
  
  return context.join("\n");
}

const systemMessage = `${baseSystemMessage}\n${getDynamicContext(lastUserMessage, todayStr)}`;
```

---

## 📈 Comparação de Estratégias

| Estratégia | Redução de Tokens | Custo Inicial | Complexidade | Melhor Para |
|------------|-------------------|---------------|--------------|-------------|
| **Otimização de Prompt** | 70% | $0 | Baixa | ✅ Implementado |
| **Fine-Tuning** | 90% | $50-500 | Média | Longo prazo |
| **RAG** | 60-80% | $0-100 | Alta | Muitas regras |
| **Modelo Menor** | 70% + custo menor | $50-500 | Média | Orçamento limitado |
| **Híbrida** | 85% | $50-500 | Média-Alta | ⭐ Recomendado |

---

## 🎯 Próximos Passos Recomendados

### Fase 1: Monitorar (Atual)
- ✅ Otimização de prompt implementada
- 📊 Monitorar custos e latência
- 📝 Coletar exemplos de conversas

### Fase 2: Fine-Tuning (1-2 meses)
- Coletar 500-1000 exemplos de conversas
- Treinar modelo GPT-4o-mini
- Testar e comparar resultados

### Fase 3: Otimização Avançada (3-6 meses)
- Implementar contexto dinâmico
- Considerar RAG se necessário
- Ajustar baseado em métricas

---

## 📝 Notas Técnicas

### Tokens vs Linhas
- 1 linha ≈ 10-20 tokens
- Prompt antigo: ~2000-3000 tokens
- Prompt novo: ~200-400 tokens
- **Economia**: ~$0.004-0.006 por chamada (GPT-4o)

### Limites de Contexto
- GPT-4o: 128k tokens
- GPT-4o-mini: 128k tokens
- Com prompt otimizado, sobra mais espaço para histórico

### Custo Estimado
- **Antes**: ~$0.006-0.009 por chamada
- **Depois**: ~$0.001-0.002 por chamada
- **Economia**: ~70% por chamada

---

## 🔗 Referências

- [OpenAI Fine-Tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [LangChain RAG](https://js.langchain.com/docs/use_cases/question_answering/)







