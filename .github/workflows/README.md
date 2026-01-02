# GitHub Actions - Deploy Automático

Este workflow automaticamente faz build e deploy para o Firebase Hosting sempre que houver um push para a branch `main`.

## Configuração Necessária

Para que o workflow funcione, você precisa configurar os seguintes secrets no GitHub:

### 1. Secrets do Firebase

1. Acesse o [GitHub Settings](https://github.com/gpneto/Clinica360/settings/secrets/actions) do seu repositório
2. Clique em "New repository secret"
3. Adicione os seguintes secrets:

#### `FIREBASE_SERVICE_ACCOUNT`
- **Como obter:**
  1. Acesse o [Firebase Console](https://console.firebase.google.com/)
  2. Vá em "Project Settings" > "Service Accounts"
  3. Clique em "Generate new private key"
  4. Baixe o arquivo JSON
  5. Copie todo o conteúdo do JSON e cole como o valor do secret

#### `FIREBASE_PROJECT_ID`
- O ID do seu projeto Firebase (ex: `seu-projeto-id`)

### 2. Secrets do Next.js (Variáveis de Ambiente Públicas)

Adicione os seguintes secrets se você usar variáveis de ambiente públicas no Next.js:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Nota:** Se você não usa variáveis de ambiente públicas no build, pode remover essas linhas do workflow.

## Como Funciona

1. **Trigger:** O workflow é executado automaticamente quando:
   - Há um push para a branch `main`
   - Você executa manualmente via "Actions" > "Run workflow"

2. **Processo:**
   - Instala as dependências (`npm ci`)
   - Faz o build do Next.js (`npm run build`)
   - Faz deploy para o Firebase Hosting

3. **Resultado:** O site é atualizado automaticamente no Firebase Hosting

## Verificar o Deploy

Após o push, você pode verificar o status do deploy em:
- **GitHub:** Aba "Actions" do repositório
- **Firebase:** Console do Firebase > Hosting

## Troubleshooting

Se o deploy falhar:

1. Verifique se todos os secrets estão configurados corretamente
2. Verifique os logs na aba "Actions" do GitHub
3. Certifique-se de que o `firebase.json` está configurado corretamente
4. Verifique se o build local funciona: `npm run build`












