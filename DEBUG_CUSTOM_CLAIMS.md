# Debug: Custom Claims não estão sendo setados

## Problema Identificado

Os custom claims estão retornando `undefined`:
```
[checkUserPermission] 🔑 Usando custom claims do token: { role: undefined, companyId: undefined, ativo: undefined }
```

## O que foi implementado para debug

### 1. Logs detalhados adicionados

A função `setUserCustomClaimsOnLogin` agora tem logs detalhados em cada etapa:
- Quando inicia
- Quando busca o usuário no Firestore
- Quando encontra os dados
- Quando seta os claims
- Quando verifica se foram setados corretamente

### 2. Retry mechanism

Se o usuário não for encontrado imediatamente, a função aguarda 1 segundo e tenta novamente (pode ser race condition).

### 3. Verificação pós-set

Após setar os claims, a função verifica se foram realmente setados no Firebase Auth.

## Como verificar o problema

### Passo 1: Verificar logs da função `setUserCustomClaimsOnLogin`

Após fazer login, verifique os logs no Firebase Console:
```
[setUserCustomClaimsOnLogin] 🔍 Iniciando set de custom claims para usuário: {uid}
[setUserCustomClaimsOnLogin] 📋 Buscando usuário {uid} no Firestore...
[setUserCustomClaimsOnLogin] 📝 Dados do usuário encontrados: {...}
[setUserCustomClaimsOnLogin] 🔧 Preparando para setar custom claims: {...}
[setUserCustomClaimsOnLogin] ✅ Custom claims setados com sucesso para {uid}: {...}
[setUserCustomClaimsOnLogin] ✅ Verificação: Claims no Auth: {...}
```

### Passo 2: Verificar se o usuário existe no Firestore

No Firebase Console, vá em Firestore e verifique:
- Collection: `users`
- Document ID: `{seu-uid}`
- Campos esperados: `role`, `companyId`, `ativo`

### Passo 3: Verificar se a função está sendo chamada

No console do navegador, após login, você deve ver:
```
[loginWithGoogle] 🔧 Chamando setUserCustomClaimsOnLogin para usuário: {uid}
[loginWithGoogle] ✅ Resposta de setUserCustomClaimsOnLogin: {...}
```

### Passo 4: Verificar se há erros

Procure por logs de erro:
```
[loginWithGoogle] ❌ Erro ao setar custom claims: {...}
[setUserCustomClaimsOnLogin] ❌ Erro ao setar claims: {...}
```

## Possíveis causas

### 1. Usuário não existe no Firestore ainda
**Sintoma:** Log mostra "Usuário não encontrado no Firestore"
**Solução:** A função tem retry automático. Se ainda falhar, o trigger `updateUserCustomClaims` vai setar quando o documento for criado.

### 2. Usuário não tem `role` setado
**Sintoma:** `role: undefined` nos dados do usuário
**Solução:** Verificar se o usuário foi criado corretamente com `role` no Firestore.

### 3. Função não está sendo chamada
**Sintoma:** Não há logs de `[loginWithGoogle] 🔧 Chamando setUserCustomClaimsOnLogin`
**Solução:** Verificar se a função foi deployada corretamente.

### 4. Erro ao setar claims no Firebase Auth
**Sintoma:** Log mostra erro ao setar claims
**Solução:** Verificar permissões do service account e se o usuário existe no Firebase Auth.

## Solução temporária (Fallback)

A função `checkUserPermission` tem fallback automático:
- Se os claims não existirem, consulta o Firestore
- Isso garante que a verificação de permissões sempre funciona
- Mas será mais lento (~1400ms vs 0ms)

## Próximos passos para debug

1. **Fazer login novamente** e verificar os logs completos
2. **Copiar todos os logs** relacionados a `setUserCustomClaimsOnLogin`
3. **Verificar no Firestore** se o usuário existe e tem os campos corretos
4. **Verificar no Firebase Auth** se o usuário existe lá também

## Comandos úteis para debug

### Verificar claims de um usuário manualmente
```javascript
// No Firebase Console > Functions > Logs, ou via Admin SDK
const admin = require('firebase-admin');
const user = await admin.auth().getUser('USER_UID');
console.log('Custom Claims:', user.customClaims);
```

### Setar claims manualmente (para teste)
```javascript
await admin.auth().setCustomUserClaims('USER_UID', {
  role: 'owner',
  companyId: 'COMPANY_ID',
  ativo: true
});
```

### Verificar se a função foi deployada
```bash
firebase functions:list
# Deve mostrar: setUserCustomClaimsOnLogin
```


