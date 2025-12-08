# Importação de Procedimentos Odontológicos

Este script importa os procedimentos odontológicos da planilha Excel (`lista_procedimentos.xlsx`) para o Firestore como template.

## Como usar

### Pré-requisitos

1. Certifique-se de ter o arquivo `lista_procedimentos.xlsx` na raiz do projeto
2. Certifique-se de ter um arquivo `.env.local` na raiz do projeto com as variáveis de ambiente do Firebase:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

### Executar o script

```bash
npx ts-node scripts/import-dental-procedures.ts
```

O script irá:
1. Ler a planilha `lista_procedimentos.xlsx`
2. Verificar se já existem procedimentos no template
3. Importar todos os procedimentos para a collection `dental_procedures_templates` no Firestore

### Opção 2: Usando o Console do Firebase

1. Abra o Console do Firebase
2. Vá para Firestore Database
3. Crie uma collection chamada `dental_procedures_templates`
4. Importe os dados manualmente ou use a função de importação do Firebase

### Estrutura dos dados no Firestore

Cada documento na collection `dental_procedures_templates` deve ter a seguinte estrutura:

```typescript
{
  nome: string;              // Nome do procedimento
  duracaoMin: number;        // Duração em minutos
  precoCentavos: number;     // Preço em centavos (ex: 5000 = R$ 50,00)
  ativo: boolean;            // Se o procedimento está ativo no template
  createdAt: Date;           // Data de criação
}
```

### Estrutura esperada da planilha Excel

A planilha deve ter apenas uma coluna:
- **Nome**: `Nome` (primeira linha deve ser o cabeçalho "Nome")

**Nota**: Como a planilha contém apenas os nomes dos procedimentos, os valores padrão serão usados:
- Duração: 60 minutos
- Preço: R$ 0,00 (pode ser ajustado depois na interface)

### Após a importação

Após executar o script, os procedimentos estarão disponíveis no template e poderão ser importados pelos usuários através do botão "Importar Procedimentos" na página de serviços (apenas para estabelecimentos do tipo "dentista").

