import { onCall, HttpsError } from 'firebase-functions/v2/https';

/**
 * Função de teste simples para verificar CORS
 */
export const testFunction = onCall({
  memory: '1GiB',
}, async (request) => {
  console.log('[testFunction] ========== INÍCIO DA FUNÇÃO ==========');
  console.log('[testFunction] Request recebido:', {
    hasAuth: !!request.auth,
    uid: request.auth?.uid,
    hasData: !!request.data,
    dataKeys: request.data ? Object.keys(request.data) : [],
  });

  const uid = request.auth?.uid;
  if (!uid) {
    console.error('[testFunction] ❌ Erro: Usuário não autenticado');
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  console.log('[testFunction] ✅ Função executada com sucesso');
  
  return {
    success: true,
    message: 'Função de teste executada com sucesso!',
    timestamp: new Date().toISOString(),
    uid,
  };
});



