# 🔥 Configuração do Firebase - Agendamento Inteligente

## 📋 Passos para Configurar o Firebase

### 1. **Configurar o Projeto Firebase**

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: `agendamentointeligente-4405f`
3. Vá para **Project Settings** (ícone de engrenagem)

### 2. **Configurar Autenticação**

1. No menu lateral, clique em **Authentication**
2. Vá para a aba **Sign-in method**
3. Habilite **Google** como provedor:
   - Clique em **Google**
   - Ative o toggle
   - Configure o **Project support email**
   - Salve as configurações

### 3. **Configurar Firestore Database**

1. No menu lateral, clique em **Firestore Database**
2. Clique em **Create database**
3. Escolha **Start in test mode** (por enquanto)
4. Selecione uma localização (recomendo `southamerica-east1`)

### 4. **Configurar Cloud Functions**

1. No menu lateral, clique em **Functions**
2. Se você ainda não tem, clique em **Get started**
3. Configure o Firebase CLI se necessário

### 5. **Obter as Credenciais**

1. Em **Project Settings** > **General**
2. Na seção **Your apps**, clique em **Web app** (ícone `</>`)
3. Registre o app com um nome (ex: "Agendamento Web")
4. Copie as credenciais do Firebase

### 6. **Configurar Variáveis de Ambiente**

Crie um arquivo `.env.local` na raiz do projeto com suas credenciais:

```env
# Substitua pelos valores reais do seu projeto Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=agendamentointeligente-4405f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=agendamentointeligente-4405f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=agendamentointeligente-4405f.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id_aqui
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id_aqui
```

### 7. **Configurar Allowlist de Usuários**

No Firestore, crie uma coleção chamada `allowlist` com documentos para cada usuário autorizado:

**Documento exemplo:** `allowlist/seu-email@gmail.com`
```json
{
  "role": "owner",
  "professionalId": null
}
```

**Papéis disponíveis:**
- `owner` - Acesso total
- `admin` - Acesso total (exceto billing)
- `pro` - Apenas própria agenda
- `atendente` - Pode criar agendamentos para qualquer profissional

### 8. **Deploy das Cloud Functions**

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 9. **Configurar Regras do Firestore**

As regras já estão configuradas no arquivo `firestore.rules`. Para aplicá-las:

```bash
firebase deploy --only firestore:rules
```

## 🚀 Testando o Sistema

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse o sistema:**
   - Vá para `http://localhost:3000`
   - Clique em "Entrar com Google"
   - Faça login com uma conta Google que está na allowlist

3. **Verifique o debug:**
   - No canto inferior direito, veja as informações de debug
   - Confirme que o papel está correto

## 🔧 Resolução de Problemas

### "Acesso negado" após login:
- Verifique se o email está na coleção `allowlist`
- Confirme que o papel está definido corretamente
- Verifique se as Cloud Functions foram deployadas

### Erro de configuração:
- Confirme que todas as variáveis de ambiente estão corretas
- Verifique se o projeto Firebase está ativo
- Confirme que a autenticação Google está habilitada

### Problemas com Custom Claims:
- As claims são definidas pelas Cloud Functions
- Verifique se a função `setUserClaims` foi deployada
- Confirme que o usuário está na allowlist

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador para erros
2. Confirme as configurações do Firebase
3. Verifique se todas as dependências estão instaladas

---

**🎉 Após configurar, você terá um sistema completo funcionando com Firebase real!**
