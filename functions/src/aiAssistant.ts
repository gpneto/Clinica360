import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';
import { DateTime } from 'luxon';

const db = admin.firestore();

// Constante para o modelo da OpenAI - SEMPRE usar esta constante
// Usando gpt-4o que é o modelo mais recente e funcional da OpenAI
const OPENAI_MODEL = 'gpt-4o';

// Definir secret para API key da OpenAI
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// Constantes de configuração
// const MAX_RESULTS = 50; // Não utilizado atualmente
const MAX_FUNCTION_RESULT_SIZE = 5000;
const MAX_MESSAGES = 20;
const TIMEZONE_BRASIL = 'America/Sao_Paulo';

// Preços da OpenAI por modelo (por 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': {
    input: 2.50,
    output: 10.00,
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.60,
  },
};

// Função auxiliar para validar IDs - ÚNICA E REUTILIZÁVEL
function isValidId(id: any): id is string {
  if (id == null || typeof id !== 'string') return false;
  const trimmed = id.trim();
  return (
    trimmed !== '' &&
    trimmed !== '__all__' &&
    !trimmed.includes('__all__') &&
    !(trimmed.startsWith('__') && trimmed.endsWith('__'))
  );
}

// Função auxiliar para verificar permissões do usuário usando Custom Claims
// OTIMIZAÇÃO: Usa claims do token JWT em vez de consultar Firestore (muito mais rápido!)
async function checkUserPermission(
  uid: string,
  companyId: string,
  requiredActions: string[],
  authToken?: admin.auth.DecodedIdToken
): Promise<{ allowed: boolean; role?: string; reason?: string }> {
  try {
    const checkStartTime = Date.now();
    
    // PRIORIDADE 1: Tentar usar custom claims do token (muito mais rápido - 0ms vs 1400ms)
    if (authToken) {
      const claims = authToken;
      const userRole = claims.role as string | undefined;
      const userCompanyId = claims.companyId as string | undefined;
      const userAtivo = claims.ativo as boolean | undefined;
      
      // Verificar se os claims existem e são válidos
      const hasValidClaims = userRole !== undefined && userRole !== null;
      
      console.log('[checkUserPermission] 🔑 Verificando custom claims do token:', {
        role: userRole,
        companyId: userCompanyId,
        ativo: userAtivo,
        hasValidClaims
      });
      
      // Se os claims são válidos, usar eles
      if (hasValidClaims) {
        // Se o companyId dos claims for igual ao solicitado, usar os claims (otimizado)
        if (userCompanyId === companyId) {
          // Verificar se o usuário está ativo
          if (userAtivo === false) {
            const result = { allowed: false, reason: 'Usuário inativo' };
            console.log(`[checkUserPermission] ⏱️ Verificação via claims: ${Date.now() - checkStartTime}ms`);
            return result;
          }

          // Mapear ações para permissões necessárias
          const rolePermissions: Record<string, string[]> = {
            owner: ['create', 'read', 'update', 'delete', 'manage'],
            admin: ['create', 'read', 'update', 'delete', 'manage'],
            pro: ['create', 'read', 'update'],
            atendente: ['read', 'create'],
          };

          const userPermissions = rolePermissions[userRole || ''] || [];

          // Verificar se o usuário tem todas as permissões necessárias
          const hasAllPermissions = requiredActions.every((action) =>
            userPermissions.includes(action)
          );

          if (!hasAllPermissions) {
            const result = {
              allowed: false,
              role: userRole,
              reason: `Ação requer permissões: ${requiredActions.join(', ')}`,
            };
            console.log(`[checkUserPermission] ⏱️ Verificação via claims: ${Date.now() - checkStartTime}ms`);
            return result;
          }

          const result = { allowed: true, role: userRole };
          console.log(`[checkUserPermission] ⏱️ Verificação via claims: ${Date.now() - checkStartTime}ms (OTIMIZADO!)`);
          return result;
        } else {
          // CompanyId diferente: usuário pode ter acesso a múltiplas empresas
          // Verificar se o usuário pertence à empresa solicitada na collection companies/{companyId}/users/{uid}
          console.log(`[checkUserPermission] 🔄 CompanyId do request (${companyId}) diferente do claim (${userCompanyId}), verificando acesso à empresa solicitada...`);
        }
      } else {
        // Claims não estão setados ainda, usar fallback
        console.log('[checkUserPermission] ⚠️ Custom claims não encontrados no token, usando fallback para Firestore');
      }
    }
    
    // FALLBACK: Verificar na collection companies/{companyId}/users/{uid} (suporta múltiplas empresas)
    console.log('[checkUserPermission] 🔍 Consultando Firestore para verificar acesso à empresa:', companyId);
    let companyUserDoc = await db.collection(`companies/${companyId}/users`).doc(uid).get();
    let queryTime = Date.now() - checkStartTime;
    console.log(`[checkUserPermission] ⏱️ Tempo da query Firestore (por UID): ${queryTime}ms`);
    console.log(`[checkUserPermission] 📄 Documento encontrado por UID: ${companyUserDoc.exists}`);
    
    // Se não encontrou por UID, tentar buscar por email (usuários podem estar em múltiplas empresas)
    if (!companyUserDoc.exists && authToken?.email) {
      const userEmail = authToken.email.toLowerCase();
      console.log(`[checkUserPermission] 🔍 Tentando buscar por email: ${userEmail}`);
      const emailQuery = await db.collection(`companies/${companyId}/users`)
        .where('email', '==', userEmail)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        const emailDoc = emailQuery.docs[0];
        // Criar um DocumentSnapshot simulado para manter compatibilidade
        companyUserDoc = emailDoc;
        console.log(`[checkUserPermission] ✅ Usuário encontrado por email na empresa ${companyId}`);
      } else {
        console.log(`[checkUserPermission] ⚠️ Usuário não encontrado por email na empresa ${companyId}`);
      }
    }
    
    if (!companyUserDoc.exists) {
      // Tentar também a collection raiz 'users' como fallback adicional
      console.log('[checkUserPermission] 🔍 Tentando buscar na collection raiz "users"');
      const rootUserDoc = await db.collection('users').doc(uid).get();
      if (rootUserDoc.exists) {
        const rootUserData = rootUserDoc.data();
        const rootUserCompanyId = rootUserData?.companyId;
        if (rootUserCompanyId !== companyId) {
          console.log(`[checkUserPermission] ❌ Usuário na collection raiz pertence a outra empresa: ${rootUserCompanyId}`);
          return { allowed: false, reason: 'Usuário não pertence a esta empresa' };
        }
        // Usar dados da collection raiz
        const userData = rootUserData;
        const userRole = userData?.role;
        
        console.log(`[checkUserPermission] ✅ Usuário encontrado na collection raiz, role: ${userRole}`);
        
        // Verificar se o usuário está ativo
        if (userData?.ativo === false) {
          return { allowed: false, reason: 'Usuário inativo' };
        }

        // Mapear ações para permissões necessárias
        const rolePermissions: Record<string, string[]> = {
          owner: ['create', 'read', 'update', 'delete', 'manage'],
          admin: ['create', 'read', 'update', 'delete', 'manage'],
          pro: ['create', 'read', 'update'],
          atendente: ['read', 'create'],
        };

        const userPermissions = rolePermissions[userRole] || [];

        // Verificar se o usuário tem todas as permissões necessárias
        const hasAllPermissions = requiredActions.every((action) =>
          userPermissions.includes(action)
        );

        if (!hasAllPermissions) {
          return {
            allowed: false,
            role: userRole,
            reason: `Ação requer permissões: ${requiredActions.join(', ')}`,
          };
        }

        return { allowed: true, role: userRole };
      }
      console.log('[checkUserPermission] ❌ Usuário não encontrado em nenhuma collection');
      return { allowed: false, reason: 'Usuário não encontrado nesta empresa' };
    }

    const userData = companyUserDoc.data();
    const userRole = userData?.role;

    // Verificar se o usuário está ativo
    if (userData?.ativo === false) {
      return { allowed: false, reason: 'Usuário inativo' };
    }

    // Mapear ações para permissões necessárias
    const rolePermissions: Record<string, string[]> = {
      owner: ['create', 'read', 'update', 'delete', 'manage'],
      admin: ['create', 'read', 'update', 'delete', 'manage'],
      pro: ['create', 'read', 'update'],
      atendente: ['read', 'create'],
    };

    const userPermissions = rolePermissions[userRole] || [];

    // Verificar se o usuário tem todas as permissões necessárias
    const hasAllPermissions = requiredActions.every((action) =>
      userPermissions.includes(action)
    );

    if (!hasAllPermissions) {
      return {
        allowed: false,
        role: userRole,
        reason: `Ação requer permissões: ${requiredActions.join(', ')}`,
      };
    }

    return { allowed: true, role: userRole };
  } catch (error: any) {
    console.error('[checkUserPermission] Erro ao verificar permissões:', error);
    return { allowed: false, reason: 'Erro ao verificar permissões' };
  }
}

/**
 * Verifica se o usuário tem acesso financeiro completo (necessário para relatórios/estatísticas)
 * Mesma lógica usada na tela de relatórios (hasFullFinancialAccess)
 */
async function checkFinancialAccess(
  uid: string,
  companyId: string,
  authToken?: admin.auth.DecodedIdToken
): Promise<boolean> {
  try {
    // PRIORIDADE 1: Tentar usar custom claims do token
    if (authToken) {
      const userRole = authToken.role as string | undefined;
      const userCompanyId = authToken.companyId as string | undefined;
      const userAtivo = authToken.ativo as boolean | undefined;
      const userPermissions = authToken.permissions as any;

      // Verificar se os claims existem e são válidos
      if (userRole && userCompanyId === companyId && userAtivo !== false) {
        // Owner e admin têm acesso total
        if (userRole === 'owner' || userRole === 'admin') {
          return true;
        }

        // Para tipo 'outro', verificar permissão granular financeiroAcessoCompleto
        if (userRole === 'outro' && userPermissions) {
          return userPermissions.financeiroAcessoCompleto === true;
        }

        // Outros roles não têm acesso
        return false;
      }
    }

    // FALLBACK: Verificar na collection companies/{companyId}/users/{uid}
    const companyUserDoc = await db.collection(`companies/${companyId}/users`).doc(uid).get();
    
    if (!companyUserDoc.exists) {
      // Tentar collection raiz 'users' como fallback
      const rootUserDoc = await db.collection('users').doc(uid).get();
      if (!rootUserDoc.exists) {
        return false;
      }
      const userData = rootUserDoc.data();
      const userRole = userData?.role;
      const userPermissions = userData?.permissions;

      // Verificar se o usuário está ativo
      if (userData?.ativo === false) {
        return false;
      }

      // Owner e admin têm acesso total
      if (userRole === 'owner' || userRole === 'admin') {
        return true;
      }

      // Para tipo 'outro', verificar permissão granular financeiroAcessoCompleto
      if (userRole === 'outro' && userPermissions) {
        return userPermissions.financeiroAcessoCompleto === true;
      }

      return false;
    }

    const userData = companyUserDoc.data();
    const userRole = userData?.role;
    const userPermissions = userData?.permissions;

    // Verificar se o usuário está ativo
    if (userData?.ativo === false) {
      return false;
    }

    // Owner e admin têm acesso total
    if (userRole === 'owner' || userRole === 'admin') {
      return true;
    }

    // Para tipo 'outro', verificar permissão granular financeiroAcessoCompleto
    if (userRole === 'outro' && userPermissions) {
      return userPermissions.financeiroAcessoCompleto === true;
    }

    return false;
  } catch (error: any) {
    console.error('[checkFinancialAccess] Erro ao verificar acesso financeiro:', error);
    return false;
  }
}

// Função auxiliar para obter datas no timezone do Brasil usando Luxon
function getBrazilDates() {
  const now = DateTime.now().setZone(TIMEZONE_BRASIL);
  const today = now.startOf('day');
  const tomorrow = today.plus({ days: 1 });

  return {
    today: {
      date: today.toFormat('yyyy-MM-dd'),
      formatted: today.toFormat("EEEE, d 'de' MMMM 'de' yyyy", { locale: 'pt-BR' }),
      iso: today.toISO(),
    },
    tomorrow: {
      date: tomorrow.toFormat('yyyy-MM-dd'),
      formatted: tomorrow.toFormat("EEEE, d 'de' MMMM 'de' yyyy", { locale: 'pt-BR' }),
      iso: tomorrow.toISO(),
    },
    now: now,
  };
}

// Função auxiliar para converter Timestamp do Firestore para ISO string no timezone do Brasil
function firestoreTimestampToBrazilISO(timestamp: admin.firestore.Timestamp | string | undefined): string | undefined {
  if (!timestamp) return undefined;

  if (typeof timestamp === 'string') {
    return timestamp;
  }

  if (timestamp.toDate) {
    const date = timestamp.toDate();
    const brazilDate = DateTime.fromJSDate(date).setZone(TIMEZONE_BRASIL);
    return brazilDate.toFormat("yyyy-MM-dd'T'HH:mm:ss");
  }

  return undefined;
}

// Função auxiliar para salvar métricas de uso (otimizada)
async function saveUsageMetrics(params: {
  companyId: string;
  userId: string;
  functionName: string;
  processingTimeMs: number;
  tokens?: { total: number; prompt: number; completion: number };
  cost?: { inputUSD: number; outputUSD: number; totalUSD: number };
  success: boolean;
  error?: string;
}) {
  try {
    const { companyId, userId, functionName, processingTimeMs, tokens, cost, success, error } = params;

    // Calcular data uma vez
    const todayDate = DateTime.now().setZone(TIMEZONE_BRASIL).startOf('day');
    const todayISO = todayDate.toISO();
    const todayStr = todayDate.toFormat('yyyy-MM-dd');

    // Preparar dados uma vez para evitar recálculos
    const tokensData = tokens || { total: 0, prompt: 0, completion: 0 };
    const costData = cost || { inputUSD: 0, outputUSD: 0, totalUSD: 0 };

    // Executar ambas as operações em paralelo para economizar tempo
    // Usar Promise.allSettled para não falhar uma operação se a outra falhar
    await Promise.allSettled([
      // Salvar métrica individual (mais importante - não pode falhar silenciosamente)
      db.collection('aiMetrics').add({
        companyId,
        userId,
        functionName,
        processingTimeMs,
        tokens: tokensData,
        cost: costData,
        success,
        error: error || null,
        model: OPENAI_MODEL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      // Atualizar contadores agregados (menos crítico - pode falhar sem afetar a métrica individual)
      db.collection('aiMetricsDaily').doc(`${companyId}_${todayStr}`).set(
        {
          companyId,
          date: todayISO,
          [functionName]: admin.firestore.FieldValue.increment(1),
          totalCalls: admin.firestore.FieldValue.increment(1),
          totalCost: admin.firestore.FieldValue.increment(costData.totalUSD),
          totalTokens: admin.firestore.FieldValue.increment(tokensData.total),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    ]);
  } catch (error: any) {
    // Não falhar a requisição se o log falhar
    console.error('[saveUsageMetrics] Erro ao salvar métricas:', error.message);
  }
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIChatRequest {
  messages: ChatMessage[];
  companyId: string;
}

interface AppointmentData {
  id: string;
  professionalId?: string;
  professionalName?: string; // Nome do profissional
  clientId?: string;
  patientName?: string; // Nome do paciente
  serviceId?: string;
  serviceName?: string; // Nome do serviço
  inicio: string;
  fim?: string;
  precoCentavos?: number;
  valorPagoCentavos?: number;
  status?: string;
  comissaoPercent?: number;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Para permitir outras propriedades
}

/**
 * Função para buscar agendamentos
 * Aceita IDs ou nomes (busca IDs automaticamente se nomes forem fornecidos)
 */
async function searchAppointments(params: {
  companyId: string;
  professionalId?: string;
  professionalName?: string;
  clientId?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  weekday?: number; // 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado
  userQuery?: string; // Query original do usuário para detectar "hoje" ou "amanhã"
}) {
  const { companyId, professionalId, professionalName, clientId, clientName, startDate, endDate, status, weekday, userQuery } = params;
  
  // Calcular data de hoje e amanhã no timezone do Brasil usando Luxon
  const brazilDates = getBrazilDates();
  const correctTodayStr = brazilDates.today.date;
  const correctTomorrowStr = brazilDates.tomorrow.date;
  
  console.log('[searchAppointments] 📅 Datas calculadas (Luxon):', {
    hoje: { date: correctTodayStr, formatted: brazilDates.today.formatted },
    amanha: { date: correctTomorrowStr, formatted: brazilDates.tomorrow.formatted },
    timestamp: brazilDates.now.toISO()
  });
  
  // Detectar se o usuário perguntou sobre "hoje" ou "amanhã" e corrigir a data se necessário
  let finalStartDate = startDate;
  let finalEndDate = endDate;
  
  // SEMPRE verificar userQuery primeiro, mesmo se startDate/endDate já foram fornecidos
  if (userQuery) {
    const queryLower = userQuery.toLowerCase();
    // Padrões mais abrangentes para "hoje"
    const hasHoje = /\bhoje\b/.test(queryLower) || 
                    /\bagendamentos?\s+de\s+hoje\b/.test(queryLower) || 
                    /\bo\s+que\s+tem\s+pra\s+hoje\b/.test(queryLower) || 
                    /\bo\s+que\s+tem\s+para\s+hoje\b/.test(queryLower) ||
                    /\bpara\s+hoje\b/.test(queryLower);
    
    // Padrões mais abrangentes para "amanhã"
    const hasAmanha = /\bamanh[ãa]\b/.test(queryLower) || 
                      /\bagendamentos?\s+de\s+amanh[ãa]\b/.test(queryLower) || 
                      /\bo\s+que\s+tem\s+pra\s+amanh[ãa]\b/.test(queryLower) || 
                      /\bo\s+que\s+tem\s+para\s+amanh[ãa]\b/.test(queryLower) ||
                      /\bpara\s+amanh[ãa]\b/.test(queryLower);
    
    console.log('[searchAppointments] 🔍 Análise da query do usuário:', {
      userQuery,
      queryLower,
      hasHoje,
      hasAmanha,
      startDateRecebido: startDate,
      endDateRecebido: endDate,
      correctTodayStr,
      correctTomorrowStr
    });
    
    // SEMPRE forçar correção quando detectar "hoje" ou "amanhã", independente da data recebida
    if (hasHoje) {
      console.log('[searchAppointments] 🔧🔧🔧 CORREÇÃO FORÇADA: Usuário perguntou sobre "hoje". IGNORANDO data recebida e usando data correta:', {
        originalStartDate: startDate,
        originalEndDate: endDate,
        correctToday: correctTodayStr,
        userQuery
      });
      finalStartDate = correctTodayStr;
      finalEndDate = correctTodayStr;
    } else if (hasAmanha) {
      console.log('[searchAppointments] 🔧🔧🔧 CORREÇÃO FORÇADA: Usuário perguntou sobre "amanhã". IGNORANDO data recebida e usando data correta:', {
        originalStartDate: startDate,
        originalEndDate: endDate,
        correctTomorrow: correctTomorrowStr,
        userQuery
      });
      finalStartDate = correctTomorrowStr;
      finalEndDate = correctTomorrowStr;
    }
  } else {
    console.warn('[searchAppointments] ⚠️ userQuery não foi fornecido! Não é possível validar datas de "hoje" ou "amanhã"');
  }
  
  console.log('[searchAppointments] ✅ Iniciando busca com datas FINAIS:', {
    companyId,
    professionalId,
    professionalName,
    clientId,
    clientName,
    startDateFINAL: finalStartDate,
    endDateFINAL: finalEndDate,
    status,
    originalStartDate: startDate,
    originalEndDate: endDate,
    corrected: finalStartDate !== startDate || finalEndDate !== endDate,
    correctTodayStr,
    correctTomorrowStr,
    userQuery: userQuery?.substring(0, 100)
  });
  
  try {
    // OTIMIZAÇÃO: Primeiro buscar os agendamentos, depois buscar apenas os dados necessários
    // Resolver IDs a partir de nomes APENAS se necessário para filtrar a query
    let finalProfessionalId = professionalId;
    if (!finalProfessionalId && professionalName) {
      console.log('[searchAppointments] Buscando ID do profissional por nome (necessário para filtrar query):', professionalName);
      finalProfessionalId = await findProfessionalIdByName(companyId, professionalName);
      console.log('[searchAppointments] ID do profissional encontrado:', finalProfessionalId || 'não encontrado');
    }
    // NÃO buscar todos os profissionais ativos aqui - vamos buscar apenas os que aparecem nos agendamentos depois

    let finalClientId = clientId;
    if (!finalClientId && clientName) {
      console.log('[searchAppointments] Buscando ID do paciente por nome (necessário para filtrar query):', clientName);
      finalClientId = await findPatientIdByName(companyId, clientName);
      console.log('[searchAppointments] ID do paciente encontrado:', finalClientId || 'não encontrado');
      
      if (!finalClientId) {
        console.warn('[searchAppointments] Paciente não encontrado:', clientName);
        // Retornar array vazio em vez de objeto de erro para manter compatibilidade
        return [];
      }
    }
  
    // PASSO 1: Buscar agendamentos primeiro (com filtros mínimos necessários)
    let query: admin.firestore.Query = db.collection(`companies/${companyId}/appointments`);
    
    console.log('[searchAppointments] Construindo query com filtros:', {
      finalProfessionalId,
      finalClientId,
      status,
      finalStartDate,
      finalEndDate,
    });
    
    // PRIORIDADE: Filtrar por data no Firestore primeiro (mais eficiente)
    // Se temos uma data de início, usar para filtrar no Firestore
    if (finalStartDate) {
      try {
        // Converter data string para Timestamp do Firestore
        const startDateObj = new Date(finalStartDate + 'T00:00:00');
        const startTimestamp = admin.firestore.Timestamp.fromDate(startDateObj);
        query = query.where('inicio', '>=', startTimestamp);
        console.log('[searchAppointments] ✅ Filtro de data de início aplicado no Firestore:', {
          startDate: finalStartDate,
          startTimestamp: startTimestamp.toDate().toISOString(),
        });
      } catch (error) {
        console.warn('[searchAppointments] ⚠️ Não foi possível aplicar filtro de data de início no Firestore:', error);
      }
    }
    
    // Se temos uma data de fim, também filtrar no Firestore (incluindo quando é o mesmo dia)
    if (finalEndDate) {
      try {
        // Para data de fim, usar o fim do dia (23:59:59)
        const endDateObj = new Date(finalEndDate + 'T23:59:59');
        const endTimestamp = admin.firestore.Timestamp.fromDate(endDateObj);
        query = query.where('inicio', '<=', endTimestamp);
        console.log('[searchAppointments] ✅ Filtro de data de fim aplicado no Firestore:', {
          endDate: finalEndDate,
          endTimestamp: endTimestamp.toDate().toISOString(),
          isSameDay: finalStartDate === finalEndDate,
        });
      } catch (error) {
        console.warn('[searchAppointments] ⚠️ Não foi possível aplicar filtro de data de fim no Firestore:', error);
      }
    }
    
    // Aplicar outros filtros que não requerem índice composto
    if (finalProfessionalId) {
      query = query.where('professionalId', '==', finalProfessionalId);
      console.log('[searchAppointments] Filtro aplicado: professionalId');
    } else if (finalClientId) {
      query = query.where('clientId', '==', finalClientId);
      console.log('[searchAppointments] Filtro aplicado: clientId');
    } else if (status) {
      query = query.where('status', '==', status);
      console.log('[searchAppointments] Filtro aplicado: status');
    }
    
    // Ordenar por data de início (requer índice se houver where)
    try {
      query = query.orderBy('inicio', 'desc');
      console.log('[searchAppointments] Ordenação aplicada: inicio desc');
    } catch (error) {
      // Se não conseguir ordenar (por causa de índice), buscar sem ordenação
      console.warn('[searchAppointments] Não foi possível ordenar por inicio, buscando sem ordenação:', error);
    }
    
    console.log('[searchAppointments] 🔍 PASSO 1: Executando query de agendamentos...');
    const queryStartTime = Date.now();
    const snapshot = await query.limit(100).get();
    const queryDuration = Date.now() - queryStartTime;
    console.log(`[searchAppointments] ✅ Agendamentos encontrados: ${snapshot.size} (tempo: ${queryDuration}ms)`);
    
    // Se não encontrou agendamentos, retornar vazio sem buscar dados relacionados
    if (snapshot.empty) {
      console.log('[searchAppointments] ⚠️ Nenhum agendamento encontrado, retornando vazio sem buscar dados relacionados');
      return {
        appointments: [],
        metadata: {
          dateUsed: finalStartDate && finalEndDate && finalStartDate === finalEndDate ? finalStartDate : null,
          dateUsedFormatted: finalStartDate && finalEndDate && finalStartDate === finalEndDate ? 
            new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }).format(new Date(finalStartDate + 'T12:00:00')) : null,
          wasCorrected: finalStartDate !== startDate || finalEndDate !== endDate,
          correctToday: correctTodayStr,
          correctTomorrow: correctTomorrowStr,
          queryType: userQuery ? (/\bhoje\b/.test(userQuery.toLowerCase()) ? 'hoje' : /\bamanh[ãa]\b/.test(userQuery.toLowerCase()) ? 'amanha' : null) : null
        }
      };
    }
    
    // PASSO 2: Extrair apenas os IDs que realmente aparecem nos agendamentos encontrados
    const appointmentDocs = snapshot.docs;
    
    // Coletar e filtrar IDs de profissionais - usando função auxiliar isValidId
    const rawProfessionalIds: any[] = [];
    appointmentDocs.forEach((doc, index) => {
      try {
        const data = doc.data();
        const profId = data.professionalId;
        if (profId != null) {
          rawProfessionalIds.push(profId);
          // Log se encontrar "__all__"
          if (profId === '__all__' || (typeof profId === 'string' && profId.includes('__all__'))) {
            console.warn(`[searchAppointments] ⚠️⚠️⚠️ ENCONTRADO "__all__" no documento ${index} (ID: ${doc.id}):`, {
              professionalId: profId,
              documentId: doc.id,
              documentData: data
            });
          }
        }
      } catch (e) {
        console.error(`[searchAppointments] Erro ao processar documento ${index}:`, e);
      }
    });
    
    console.log('[searchAppointments] 🔍 IDs brutos de profissionais coletados (total:', rawProfessionalIds.length, '):', rawProfessionalIds);
    
    const allProfessionalIds = rawProfessionalIds.filter(isValidId);
    const invalidProfessionalIds = rawProfessionalIds.filter(id => !isValidId(id));
    
    if (invalidProfessionalIds.length > 0) {
      console.warn('[searchAppointments] ⚠️ IDs inválidos de profissionais removidos:', invalidProfessionalIds);
    }
    
    console.log('[searchAppointments] ✅ IDs válidos de profissionais após filtro (', allProfessionalIds.length, '):', allProfessionalIds);
    
    // Coletar e filtrar IDs de clientes - COM LOG DETALHADO
    const rawClientIds: any[] = [];
    appointmentDocs.forEach((doc, index) => {
      try {
        const data = doc.data();
        const clientId = data.clientId;
        if (clientId != null) {
          rawClientIds.push(clientId);
          // Log se encontrar "__all__"
          if (clientId === '__all__' || (typeof clientId === 'string' && clientId.includes('__all__'))) {
            console.warn(`[searchAppointments] ⚠️⚠️⚠️ ENCONTRADO "__all__" no documento ${index} (ID: ${doc.id}):`, {
              clientId: clientId,
              documentId: doc.id,
              documentData: data
            });
          }
        }
      } catch (e) {
        console.error(`[searchAppointments] Erro ao processar documento ${index}:`, e);
      }
    });
    
    console.log('[searchAppointments] 🔍 IDs brutos de clientes coletados (total:', rawClientIds.length, '):', rawClientIds);
    
    const allClientIds = rawClientIds.filter(isValidId);
    const invalidClientIds = rawClientIds.filter(id => !isValidId(id));
    
    if (invalidClientIds.length > 0) {
      console.warn('[searchAppointments] ⚠️ IDs inválidos de clientes removidos:', invalidClientIds);
    }
    
    console.log('[searchAppointments] ✅ IDs válidos de clientes após filtro (', allClientIds.length, '):', allClientIds);
    
    // Coletar serviceIds (pode ser um único serviceId ou um array serviceIds)
    const allServiceIds: string[] = [];
    appointmentDocs.forEach((doc, index) => {
      try {
        const data = doc.data();
        // Verificar serviceIds (array) primeiro
        if (Array.isArray(data.serviceIds) && data.serviceIds.length > 0) {
          const validServiceIds = data.serviceIds.filter(isValidId);
          allServiceIds.push(...validServiceIds);
          // Log se encontrar "__all__" no array
          const invalidInArray = data.serviceIds.filter(id => !isValidId(id));
          if (invalidInArray.length > 0) {
            console.warn(`[searchAppointments] ⚠️ IDs inválidos no array serviceIds do documento ${index}:`, invalidInArray);
          }
        }
        // Depois verificar serviceId (único)
        if (data.serviceId) {
          if (isValidId(data.serviceId)) {
            allServiceIds.push(data.serviceId);
          } else {
            console.warn(`[searchAppointments] ⚠️ serviceId inválido no documento ${index}:`, data.serviceId);
          }
        }
      } catch (e) {
        console.error(`[searchAppointments] Erro ao processar serviceIds do documento ${index}:`, e);
      }
    });
    
    // Remover duplicatas
    const professionalIds = Array.from(new Set(allProfessionalIds));
    const clientIds = Array.from(new Set(allClientIds));
    const serviceIds = Array.from(new Set(allServiceIds));
    
    console.log('[searchAppointments] ✅ IDs coletados dos agendamentos:', {
      profissionais: professionalIds.length,
      clientes: clientIds.length,
      servicos: serviceIds.length
    });
    
    // VERIFICAÇÃO FINAL CRÍTICA - garantir que NENHUM "__all__" passou
    const allIdsToCheck = [...professionalIds, ...clientIds, ...serviceIds];
    const foundAll = allIdsToCheck.find(id => id === '__all__' || (typeof id === 'string' && id.includes('__all__')));
    if (foundAll) {
      console.error('[searchAppointments] ❌❌❌ ERRO CRÍTICO: "__all__" ainda presente após todas as validações!', foundAll);
      throw new Error('ID "__all__" detectado após validação - não é possível continuar');
    }
    
    // Validação de IDs
    const validProfessionalIds = professionalIds.filter(id => {
      if (!id || typeof id !== 'string') return false;
      const trimmed = id.trim();
      if (trimmed === '' || trimmed === '__all__' || trimmed.includes('__all__')) {
        console.warn('[searchAppointments] ⚠️ ID de profissional inválido removido:', id);
        return false;
      }
      return true;
    });
    const validClientIds = clientIds.filter(isValidId);
    const validServiceIds = serviceIds.filter(isValidId);
    
    console.log('[searchAppointments] 📊 PASSO 2: IDs extraídos dos agendamentos encontrados:', {
      profissionais: validProfessionalIds.length,
      clientes: validClientIds.length,
      servicos: validServiceIds.length,
      totalAgendamentos: appointmentDocs.length
    });
    
    // PASSO 3: Buscar APENAS os dados relacionados que realmente aparecem nos agendamentos
    const professionalsMap = new Map<string, any>();
    const patientsMap = new Map<string, any>();
    const servicesMap = new Map<string, any>();
    
    const searchStartTime = Date.now();
    
    // Se não há IDs para buscar, pular esta etapa
    if (validProfessionalIds.length === 0 && validClientIds.length === 0 && validServiceIds.length === 0) {
      console.log('[searchAppointments] ⚠️ Nenhum ID válido encontrado nos agendamentos, pulando busca de dados relacionados');
    } else {
      try {
        // PASSO 3: Executar todas as três buscas simultaneamente usando whereIn (mais eficiente)
        console.log('[searchAppointments] 🔍 PASSO 3: Buscando dados relacionados em paralelo (otimizado com whereIn)...');
        const [professionals, patients, services] = await Promise.all([
        // Buscar profissionais usando whereIn (mais eficiente - até 30 IDs por query)
        validProfessionalIds.length > 0
          ? (async () => {
              try {
                // whereIn suporta até 30 valores, então dividimos em lotes se necessário
                const batchSize = 30;
                const batches: Array<Array<string>> = [];
                for (let i = 0; i < validProfessionalIds.length; i += batchSize) {
                  batches.push(validProfessionalIds.slice(i, i + batchSize));
                }
                const allDocs = await Promise.all(
                  batches.map(batch => 
                    db.collection(`companies/${companyId}/professionals`)
                      .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                      .get()
                  )
                );
                return allDocs.flatMap(snapshot => 
                  snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
                );
              } catch (err: any) {
                console.error(`[searchAppointments] ❌ Erro ao buscar profissionais:`, err.message);
                return [];
              }
            })()
          : Promise.resolve([]),
        
        // Buscar pacientes usando whereIn
        validClientIds.length > 0
          ? (async () => {
              try {
                const batchSize = 30;
                const batches: Array<Array<string>> = [];
                for (let i = 0; i < validClientIds.length; i += batchSize) {
                  batches.push(validClientIds.slice(i, i + batchSize));
                }
                const allDocs = await Promise.all(
                  batches.map(batch => 
                    db.collection(`companies/${companyId}/patients`)
                      .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                      .get()
                  )
                );
                return allDocs.flatMap(snapshot => 
                  snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
                );
              } catch (err: any) {
                console.error(`[searchAppointments] ❌ Erro ao buscar pacientes:`, err.message);
                return [];
              }
            })()
          : Promise.resolve([]),
        
        // Buscar serviços usando whereIn
        validServiceIds.length > 0
          ? (async () => {
              try {
                const batchSize = 30;
                const batches: Array<Array<string>> = [];
                for (let i = 0; i < validServiceIds.length; i += batchSize) {
                  batches.push(validServiceIds.slice(i, i + batchSize));
                }
                const allDocs = await Promise.all(
                  batches.map(batch => 
                    db.collection(`companies/${companyId}/services`)
                      .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                      .get()
                  )
                );
                return allDocs.flatMap(snapshot => 
                  snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
                );
              } catch (err: any) {
                console.error(`[searchAppointments] ❌ Erro ao buscar serviços:`, err.message);
                return [];
              }
            })()
          : Promise.resolve([])
      ]);
      
      // Popular os Maps
      professionals.forEach(({ id, data }) => professionalsMap.set(id, data));
      patients.forEach(({ id, data }) => patientsMap.set(id, data));
      services.forEach(({ id, data }) => servicesMap.set(id, data));
      
        const searchDuration = Date.now() - searchStartTime;
        console.log('[searchAppointments] ✅ PASSO 3 concluído: Dados relacionados carregados em paralelo:', {
          profissionais: professionalsMap.size,
          pacientes: patientsMap.size,
          servicos: servicesMap.size,
          tempoTotal: `${searchDuration}ms`
        });
      } catch (err: any) {
        console.error('[searchAppointments] ❌ Erro geral ao buscar dados relacionados:', err.message);
      }
    }
    
    console.log('[searchAppointments] Dados relacionados carregados:', {
      professionals: professionalsMap.size,
      patients: patientsMap.size,
      services: servicesMap.size,
    });
    
    let appointments: AppointmentData[] = appointmentDocs.map(doc => {
      const data = doc.data();
      const professionalId = data.professionalId;
      const clientId = data.clientId;
      const serviceId = data.serviceId;
      
      // Não buscar dados relacionados se o ID for "__all__" (ID reservado)
      const professionalData = professionalId && professionalId !== '__all__' 
        ? professionalsMap.get(professionalId) 
        : null;
      const patientData = clientId && clientId !== '__all__' 
        ? patientsMap.get(clientId) 
        : null;
      const serviceData = serviceId && serviceId !== '__all__' 
        ? servicesMap.get(serviceId) 
        : null;
      
      // Converter Timestamps para ISO strings no timezone do Brasil usando Luxon
      const inicioISO = firestoreTimestampToBrazilISO(data.inicio);
      const fimISO = firestoreTimestampToBrazilISO(data.fim);
      
      return {
        id: doc.id,
        ...data,
        professionalId: professionalId || undefined,
        professionalName: professionalData?.apelido || undefined,
        clientId: clientId || undefined,
        patientName: patientData?.nome || undefined,
        serviceId: serviceId || undefined,
        serviceName: serviceData?.nome || undefined,
        status: data.status || undefined,
        precoCentavos: data.precoCentavos || undefined,
        valorPagoCentavos: data.valorPagoCentavos || undefined,
        comissaoPercent: data.comissaoPercent || undefined,
        observacoes: data.observacoes || undefined,
        inicio: inicioISO || data.inicio,
        fim: fimISO || data.fim,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as AppointmentData;
    });
  
  // Aplicar filtros adicionais em memória
  if (finalProfessionalId && !appointments.some(a => a.professionalId === finalProfessionalId)) {
    appointments = appointments.filter(a => a.professionalId === finalProfessionalId);
  }
  if (finalClientId && !appointments.some(a => a.clientId === finalClientId)) {
    appointments = appointments.filter(a => a.clientId === finalClientId);
  }
  if (status && !appointments.some(a => a.status === status)) {
    appointments = appointments.filter(a => a.status === status);
  }
  
  // Filtrar por data se fornecido
  // Função auxiliar para extrair apenas a data como string YYYY-MM-DD (evita problemas de timezone)
  const extractDateString = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    
    const str = String(dateStr);
    
    // Se já está no formato YYYY-MM-DD, retornar diretamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    
    // Se está no formato yyyy-MM-dd'T'HH:mm:ss (sem timezone), extrair diretamente
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }
    
    // Se tem hora, extrair apenas a parte da data
    try {
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        console.warn('[searchAppointments] ⚠️ Data inválida ao extrair string:', str);
        return '';
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // month é 0-indexed, então +1
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn('[searchAppointments] ⚠️ Erro ao extrair data:', str, error);
      return '';
    }
  };

  // Função auxiliar para normalizar data para comparação (apenas dia/mês/ano, timezone Brasil)
  const normalizeDateForComparison = (dateStr: string, useEndOfDay: boolean = false): Date => {
    let baseDate: Date;
    
    // Se a string está no formato YYYY-MM-DD (sem hora), criar data diretamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      baseDate = new Date(year, month - 1, day); // month é 0-indexed
    } else {
      // Se tem hora, extrair apenas a parte da data
      const date = new Date(dateStr);
      // Criar uma nova data apenas com dia/mês/ano no timezone local (Brasil)
      // Isso garante que comparamos apenas a data, não a hora
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      baseDate = new Date(year, month, day);
    }
    
    // Se useEndOfDay é true, ajustar para o fim do dia (23:59:59.999)
    if (useEndOfDay) {
      baseDate.setHours(23, 59, 59, 999);
    } else {
      baseDate.setHours(0, 0, 0, 0);
    }
    
    return baseDate;
  };

  // Se startDate e endDate são iguais, usar comparação por string para evitar problemas de timezone
  const isSameDay: boolean = !!(finalStartDate && finalEndDate && finalStartDate === finalEndDate);
  
  if (finalStartDate) {
    const beforeStartFilter = appointments.length;
    if (isSameDay) {
      // Quando é o mesmo dia, comparar apenas a data como string (YYYY-MM-DD)
      const startDateStr = extractDateString(finalStartDate);
      appointments = appointments.filter(apt => {
        const aptInicioStr = apt.inicio ? String(apt.inicio) : '';
        const aptDateStr = extractDateString(aptInicioStr);
        return aptDateStr === startDateStr;
      });
      console.log('[searchAppointments] Filtro por data de início aplicado (mesmo dia - comparação por string):', {
        startDate,
        startDateStr,
        antesDoFiltro: beforeStartFilter,
        agendamentosFiltrados: appointments.length,
      });
    } else {
      // Quando é um range, comparar normalmente
      const start = normalizeDateForComparison(finalStartDate, false);
      appointments = appointments.filter(apt => {
        const aptDate = normalizeDateForComparison(String(apt.inicio || ''), false);
        return aptDate >= start;
      });
      console.log('[searchAppointments] Filtro por data de início aplicado:', {
        startDate,
        startNormalized: start.toISOString(),
        antesDoFiltro: beforeStartFilter,
        agendamentosFiltrados: appointments.length,
      });
    }
  }
  if (finalEndDate) {
    const beforeEndFilter = appointments.length;
    const endDateStr = extractDateString(finalEndDate);
    
    // Debug: verificar alguns agendamentos antes do filtro
    if (isSameDay && beforeEndFilter > 0) {
      const sampleApts = appointments.slice(0, 3);
      console.log('[searchAppointments] 🔍 DEBUG - Amostra de agendamentos antes do filtro de fim:', {
        endDateStr,
        sampleApts: sampleApts.map(apt => ({
          id: apt.id,
          inicio: apt.inicio,
          inicioType: typeof apt.inicio,
          extractedDate: extractDateString(String(apt.inicio)),
          matches: extractDateString(String(apt.inicio)) === endDateStr
        }))
      });
    }
    
    if (isSameDay) {
      // Quando é o mesmo dia, o filtro de início já fez o trabalho, só precisamos garantir que está correto
      // Mas vamos fazer uma verificação adicional para garantir
      appointments = appointments.filter(apt => {
        const aptInicioStr = apt.inicio ? String(apt.inicio) : '';
        const aptDateStr = extractDateString(aptInicioStr);
        return aptDateStr === endDateStr;
      });
      console.log('[searchAppointments] Filtro por data de fim aplicado (mesmo dia - comparação por string):', {
        endDate,
        endDateStr,
        isSameDay,
        antesDoFiltro: beforeEndFilter,
        agendamentosFiltrados: appointments.length,
      });
    } else {
      // Quando é um range, comparar normalmente
      const end = normalizeDateForComparison(finalEndDate, false);
      appointments = appointments.filter(apt => {
        const aptDate = normalizeDateForComparison(String(apt.inicio || ''), false);
        return aptDate <= end;
      });
      console.log('[searchAppointments] Filtro por data de fim aplicado:', {
        endDate,
        endDateStr,
        endNormalized: end.toISOString(),
        isSameDay,
        antesDoFiltro: beforeEndFilter,
        agendamentosFiltrados: appointments.length,
      });
    }
  }
  
  // Filtrar apenas agendamentos futuros se não há filtro de data específico
  if (!finalStartDate && !finalEndDate) {
    const now = new Date();
    const beforeFilter = appointments.length;
    appointments = appointments.filter(apt => {
      const aptDate = new Date(apt.inicio);
      return aptDate >= now; // Apenas agendamentos futuros
    });
    console.log('[searchAppointments] Filtro de agendamentos futuros:', {
      antes: beforeFilter,
      depois: appointments.length,
    });
  }
  
  // Filtrar por dia da semana se especificado
  if (typeof weekday === 'number' && weekday >= 0 && weekday <= 6) {
    const beforeWeekdayFilter = appointments.length;
    appointments = appointments.filter(apt => {
      const aptDate = new Date(apt.inicio);
      const aptWeekday = aptDate.getDay(); // 0 = domingo, 1 = segunda, etc.
      return aptWeekday === weekday;
    });
    console.log('[searchAppointments] Filtro por dia da semana:', {
      weekday,
      antes: beforeWeekdayFilter,
      depois: appointments.length,
    });
  }
  
  // Ordenar sempre por data crescente (mais próximo primeiro) após todos os filtros
  // Isso garante que os agendamentos sejam apresentados do mais próximo para o mais distante
  appointments.sort((a, b) => {
    const dateA = new Date(a.inicio).getTime();
    const dateB = new Date(b.inicio).getTime();
    return dateA - dateB; // Mais próximo primeiro (ordem crescente)
  });
    
    const result = appointments.slice(0, 50); // Limitar a 50 resultados
    
    // Adicionar informações sobre a data usada na busca para a IA usar na resposta
    const resultWithMetadata = {
      appointments: result,
      metadata: {
        dateUsed: finalStartDate && finalEndDate && finalStartDate === finalEndDate ? finalStartDate : null,
        dateUsedFormatted: finalStartDate && finalEndDate && finalStartDate === finalEndDate ? 
          new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(finalStartDate + 'T12:00:00')) : null,
        wasCorrected: finalStartDate !== startDate || finalEndDate !== endDate,
        correctToday: correctTodayStr,
        correctTomorrow: correctTomorrowStr,
        queryType: userQuery ? (/\bhoje\b/.test(userQuery.toLowerCase()) ? 'hoje' : /\bamanh[ãa]\b/.test(userQuery.toLowerCase()) ? 'amanha' : null) : null
      }
    };
    
    console.log('[searchAppointments] Busca concluída com sucesso:', {
      totalEncontrado: appointments.length,
      retornado: result.length,
      metadata: resultWithMetadata.metadata
    });
    
    return resultWithMetadata;
  } catch (error: any) {
    console.error('[searchAppointments] Erro ao buscar agendamentos:', {
      error: error.message,
      stack: error.stack,
      params: {
        companyId,
        professionalId,
        professionalName,
        clientId,
        clientName,
        startDate,
        endDate,
        status,
      },
    });
    throw error; // Re-throw para ser tratado no nível superior
  }
}

/**
 * Função auxiliar para buscar ID do profissional por nome
 */
async function findProfessionalIdByName(companyId: string, nome: string): Promise<string | undefined> {
  const snapshot = await db
    .collection(`companies/${companyId}/professionals`)
    .where('ativo', '==', true)
    .get();
  
  const professional = snapshot.docs.find(doc => {
    const data = doc.data();
    return data.apelido?.toLowerCase().includes(nome.toLowerCase());
  });
  
  return professional ? professional.id : undefined;
}

/**
 * Função auxiliar para buscar todos os profissionais ativos
 */
async function getAllActiveProfessionals(companyId: string): Promise<Array<{ id: string; apelido: string }>> {
  const snapshot = await db
    .collection(`companies/${companyId}/professionals`)
    .where('ativo', '==', true)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    apelido: doc.data().apelido || 'Sem nome',
  }));
}

/**
 * Função auxiliar para buscar ID do paciente por nome
 */
async function findPatientIdByName(companyId: string, nome: string): Promise<string | undefined> {
  try {
    console.log('[findPatientIdByName] Buscando paciente:', { companyId, nome });
    const snapshot = await db
      .collection(`companies/${companyId}/patients`)
      .get();
    
    console.log('[findPatientIdByName] Total de pacientes encontrados:', snapshot.size);
    
    const patient = snapshot.docs.find(doc => {
      const data = doc.data();
      const patientName = data.nome?.toLowerCase() || '';
      const searchName = nome.toLowerCase();
      const matches = patientName.includes(searchName) || searchName.includes(patientName);
      
      if (matches) {
        console.log('[findPatientIdByName] Paciente encontrado:', {
          id: doc.id,
          nome: data.nome,
          searchName: nome,
        });
      }
      
      return matches;
    });
    
    if (!patient) {
      console.warn('[findPatientIdByName] Paciente não encontrado:', nome);
      // Listar alguns nomes para debug
      const sampleNames = snapshot.docs.slice(0, 5).map(doc => doc.data().nome).filter(Boolean);
      console.log('[findPatientIdByName] Exemplos de nomes na base:', sampleNames);
    }
    
    return patient ? patient.id : undefined;
  } catch (error: any) {
    console.error('[findPatientIdByName] Erro ao buscar paciente:', {
      error: error.message,
      stack: error.stack,
      companyId,
      nome,
    });
    throw error;
  }
}

/**
 * Função auxiliar para buscar ID do serviço por nome
 */
async function findServiceIdByName(companyId: string, nome: string): Promise<string | undefined> {
  const snapshot = await db
    .collection(`companies/${companyId}/services`)
    .where('ativo', '==', true)
    .get();
  
  const service = snapshot.docs.find(doc => {
    const data = doc.data();
    return data.nome?.toLowerCase().includes(nome.toLowerCase());
  });
  
  return service ? service.id : undefined;
}

/**
 * Função para criar agendamento
 * Aceita IDs ou nomes (busca IDs automaticamente se nomes forem fornecidos)
 */
async function createAppointment(params: {
  companyId: string;
  professionalId?: string;
  professionalName?: string;
  professionalNumber?: number; // Número do profissional da lista (1, 2, 3...)
  clientId?: string;
  clientName?: string;
  serviceId?: string;
  serviceName?: string;
  inicio: string; // ISO string
  fim?: string; // ISO string (opcional, será calculado se não fornecido)
  duracaoMinutos?: number; // Duração em minutos (usado se fim não fornecido)
  precoCentavos?: number;
  comissaoPercent?: number;
  observacoes?: string;
  createdByUid: string;
  confirm?: boolean; // Se true, cria o agendamento. Se false ou não fornecido, retorna resumo para confirmação
}) {
  const {
    companyId,
    professionalId,
    professionalName,
    professionalNumber,
    clientId,
    clientName,
    serviceId,
    serviceName,
    inicio,
    fim,
    duracaoMinutos,
    precoCentavos: precoCentavosParam = 0,
    comissaoPercent = 0,
    observacoes = '',
    createdByUid,
    confirm = false,
  } = params;

  console.log('[createAppointment] Iniciando criação de agendamento:', {
    companyId,
    professionalId,
    professionalName,
    clientId,
    clientName,
    serviceId,
    serviceName,
    inicio,
  });

  // Converter a string ISO para Date, garantindo que seja interpretada como hora local do Brasil
  // Se a string não tem timezone (ex: "2025-11-25T10:30:00"), interpretar como hora local do Brasil
  let inicioDateCheck: Date;
  if (inicio.includes('Z') || inicio.includes('+') || inicio.includes('-', 10)) {
    // Tem timezone explícito, usar como está
    inicioDateCheck = new Date(inicio);
  } else {
    // Não tem timezone, interpretar como hora local do Brasil usando Luxon
    // Isso garante que 10:30 no Brasil seja realmente 10:30, não 10:30 UTC
    const match = inicio.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      // Usar Luxon para criar a data no timezone do Brasil
      const brazilDateTime = DateTime.fromObject(
        {
          year: parseInt(year),
          month: parseInt(month),
          day: parseInt(day),
          hour: parseInt(hour),
          minute: parseInt(minute),
          second: parseInt(second || '0'),
        },
        { zone: TIMEZONE_BRASIL }
      );
      // Converter para Date JavaScript (já em UTC corretamente)
      inicioDateCheck = brazilDateTime.toJSDate();
      console.log('[createAppointment] Data convertida usando timezone do Brasil:', {
        entrada: inicio,
        timezone: TIMEZONE_BRASIL,
        horaBrasil: brazilDateTime.toFormat('dd/MM/yyyy HH:mm:ss'),
        horaUTC: inicioDateCheck.toISOString(),
      });
    } else {
      inicioDateCheck = new Date(inicio);
    }
  }
  
  // Obter data atual no timezone do Brasil usando Luxon
  const nowBrazil = DateTime.now().setZone(TIMEZONE_BRASIL);
  const now = nowBrazil.toJSDate();
  
  // Comparar apenas data e hora, permitindo margem de 5 minutos para evitar problemas de sincronização
  // e permitir agendamentos para o mesmo dia/hora atual
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
  
  if (inicioDateCheck < fiveMinutesAgo) {
    const formattedDate = inicioDateCheck.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const todayFormatted = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    console.warn('[createAppointment] Tentativa de criar agendamento no passado:', {
      dataInformada: formattedDate,
      dataAtual: todayFormatted,
      inicioISO: inicio,
      nowISO: now.toISOString(),
    });
    throw new Error(`A data informada (${formattedDate}) está no passado. Por favor, informe uma data futura.`);
  }

  // Resolver IDs a partir de nomes se necessário
  let finalProfessionalId = professionalId;
  if (!finalProfessionalId && professionalName) {
    console.log('[createAppointment] Buscando profissional por nome:', professionalName);
    finalProfessionalId = await findProfessionalIdByName(companyId, professionalName);
    if (!finalProfessionalId) {
      throw new Error(`Profissional "${professionalName}" não encontrado`);
    }
    console.log('[createAppointment] Profissional encontrado:', finalProfessionalId);
  }

  // Se não foi informado profissional, verificar se há apenas um ativo
  if (!finalProfessionalId) {
    console.log('[createAppointment] Profissional não informado, buscando profissionais ativos...');
    const activeProfessionals = await getAllActiveProfessionals(companyId);
    console.log('[createAppointment] Profissionais ativos encontrados:', activeProfessionals.length);
    
    if (activeProfessionals.length === 0) {
      throw new Error('Nenhum profissional ativo encontrado. É necessário ter pelo menos um profissional cadastrado.');
    } else if (activeProfessionals.length === 1) {
      // Se houver apenas um, usar automaticamente
      finalProfessionalId = activeProfessionals[0].id;
      console.log('[createAppointment] Usando único profissional disponível:', {
        id: finalProfessionalId,
        nome: activeProfessionals[0].apelido,
      });
    } else {
      // Se houver mais de um e não foi informado número, retornar lista para escolha
      if (!professionalNumber) {
        const professionalsList = activeProfessionals.map((p, index) => ({
          numero: index + 1,
          id: p.id,
          nome: p.apelido,
        }));
        
        console.log('[createAppointment] Múltiplos profissionais encontrados, retornando lista para escolha');
        return {
          needsProfessionalSelection: true,
          professionals: professionalsList,
          message: `Encontrei ${activeProfessionals.length} profissionais disponíveis. Por favor, escolha qual profissional deseja:\n\n${professionalsList.map(p => `${p.numero}. ${p.nome}`).join('\n')}\n\nResponda com o número do profissional (ex: 1, 2, 3...).`,
        };
      } else {
        // Usuário escolheu um número da lista
        const selectedProfessional = activeProfessionals[professionalNumber - 1];
        if (!selectedProfessional) {
          throw new Error(`Número de profissional inválido. Escolha um número entre 1 e ${activeProfessionals.length}.`);
        }
        finalProfessionalId = selectedProfessional.id;
        console.log('[createAppointment] Profissional escolhido pelo número:', {
          numero: professionalNumber,
          id: finalProfessionalId,
          nome: selectedProfessional.apelido,
        });
      }
    }
  }

  let finalClientId = clientId;
  if (!finalClientId && clientName) {
    console.log('[createAppointment] Buscando paciente por nome:', clientName);
    finalClientId = await findPatientIdByName(companyId, clientName);
    if (!finalClientId) {
      throw new Error(`Paciente "${clientName}" não encontrado`);
    }
    console.log('[createAppointment] Paciente encontrado:', finalClientId);
  }

  let finalServiceId = serviceId;
  if (!finalServiceId && serviceName) {
    console.log('[createAppointment] Buscando serviço por nome:', serviceName);
    finalServiceId = await findServiceIdByName(companyId, serviceName);
    if (!finalServiceId) {
      throw new Error(`Serviço "${serviceName}" não encontrado`);
    }
    console.log('[createAppointment] Serviço encontrado:', finalServiceId);
  }
  if (!finalClientId) {
    throw new Error('É necessário fornecer o ID ou nome do paciente');
  }
  if (!finalServiceId) {
    throw new Error('É necessário fornecer o ID ou nome do serviço');
  }

  // Buscar dados completos para exibir resumo
  const [professionalDoc, clientDoc, serviceDoc] = await Promise.all([
    db.collection(`companies/${companyId}/professionals`).doc(finalProfessionalId).get(),
    db.collection(`companies/${companyId}/patients`).doc(finalClientId).get(),
    db.collection(`companies/${companyId}/services`).doc(finalServiceId).get(),
  ]);

  if (!professionalDoc.exists || !clientDoc.exists || !serviceDoc.exists) {
    throw new Error('Dados não encontrados. Verifique se profissional, paciente e serviço existem.');
  }

  const professionalData = professionalDoc.data();
  const clientData = clientDoc.data();
  const serviceData = serviceDoc.data();

  // Buscar dados do serviço para obter duração e preço padrão
  let serviceDuracaoMin: number = duracaoMinutos || serviceData?.duracaoMin || 60;
  let finalPrecoCentavos: number = precoCentavosParam || serviceData?.precoCentavos || 0;

  // Converter inicio para Date local do Brasil (mesma lógica da validação)
  let inicioDate: Date;
  if (inicio.includes('Z') || inicio.includes('+') || inicio.includes('-', 10)) {
    inicioDate = new Date(inicio);
  } else {
    const match = inicio.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
        // Usar Luxon para criar a data no timezone do Brasil
        const brazilDateTime = DateTime.fromObject(
          {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            second: parseInt(second || '0'),
          },
          { zone: TIMEZONE_BRASIL }
        );
        // Converter para Date JavaScript (já em UTC corretamente)
        inicioDate = brazilDateTime.toJSDate();
        console.log('[createAppointment] Data de início convertida usando timezone do Brasil:', {
          entrada: inicio,
          horaBrasil: brazilDateTime.toFormat('dd/MM/yyyy HH:mm:ss'),
          horaUTC: inicioDate.toISOString(),
        });
    } else {
      inicioDate = new Date(inicio);
    }
  }
  
  // Calcular fim se não fornecido
  let finalFim: string;
  let fimDate: Date;
  if (fim) {
    finalFim = fim;
    // Converter fim para Date local do Brasil também
    if (fim.includes('Z') || fim.includes('+') || fim.includes('-', 10)) {
      fimDate = new Date(fim);
    } else {
      const matchFim = fim.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (matchFim) {
        const [, year, month, day, hour, minute, second] = matchFim;
        // Usar Luxon para criar a data no timezone do Brasil
        const brazilDateTime = DateTime.fromObject(
          {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            second: parseInt(second || '0'),
          },
          { zone: TIMEZONE_BRASIL }
        );
        // Converter para Date JavaScript (já em UTC corretamente)
        fimDate = brazilDateTime.toJSDate();
        console.log('[createAppointment] Data de fim convertida usando timezone do Brasil:', {
          entrada: fim,
          horaBrasil: brazilDateTime.toFormat('dd/MM/yyyy HH:mm:ss'),
          horaUTC: fimDate.toISOString(),
        });
      } else {
        fimDate = new Date(fim);
      }
    }
  } else {
    // Calcular fim baseado na duração
    fimDate = new Date(inicioDate.getTime() + serviceDuracaoMin * 60000);
    // Converter para ISO string no timezone do Brasil usando Luxon
    const fimDateTime = DateTime.fromJSDate(fimDate).setZone(TIMEZONE_BRASIL);
    const year = fimDateTime.year;
    const month = String(fimDateTime.month).padStart(2, '0');
    const day = String(fimDateTime.day).padStart(2, '0');
    const hour = String(fimDateTime.hour).padStart(2, '0');
    const minute = String(fimDateTime.minute).padStart(2, '0');
    const second = String(fimDateTime.second).padStart(2, '0');
    finalFim = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  // Verificar conflitos de horário - OTIMIZADO: filtrar por data antes de buscar
  const startOfDay = new Date(inicioDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(inicioDate);
  endOfDay.setHours(23, 59, 59, 999);

  let conflictQuery = db
    .collection(`companies/${companyId}/appointments`)
    .where('professionalId', '==', finalProfessionalId)
    .where('status', 'in', ['agendado', 'confirmado']);

  // Filtrar por data para reduzir resultados (requer índice composto)
  try {
    conflictQuery = conflictQuery
      .where('inicio', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('inicio', '<=', admin.firestore.Timestamp.fromDate(endOfDay));
  } catch (error) {
    // Se não tiver índice, buscar sem filtro de data (fallback)
    console.warn('[createAppointment] Índice composto não encontrado, buscando sem filtro de data');
  }

  const conflictingAppointments = await conflictQuery.get();
  
  const hasConflict = conflictingAppointments.docs.some(doc => {
    const appointment = doc.data();
    const appointmentStart = appointment.inicio.toDate();
    const appointmentEnd = appointment.fim.toDate();
    
    return (
      (inicioDate >= appointmentStart && inicioDate < appointmentEnd) ||
      (fimDate > appointmentStart && fimDate <= appointmentEnd) ||
      (inicioDate <= appointmentStart && fimDate >= appointmentEnd)
    );
  });
  
  if (hasConflict) {
    throw new Error('Horário já ocupado para este profissional');
  }

  // Formatar data e hora para exibição (usar as datas já convertidas)
  const inicioDateFormatted = inicioDate;
  const fimDateFormatted = fimDate;
  const dataFormatada = inicioDateFormatted.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const horaInicio = inicioDateFormatted.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const horaFim = fimDateFormatted.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Se não foi confirmado, retornar resumo para confirmação
  if (!confirm) {
    console.log('[createAppointment] Retornando resumo para confirmação');
    return {
      needsConfirmation: true,
      summary: {
        profissional: professionalData?.apelido || 'Não informado',
        paciente: clientData?.nome || 'Não informado',
        servico: serviceData?.nome || 'Não informado',
        data: dataFormatada,
        horario: `${horaInicio} às ${horaFim}`,
        duracao: `${serviceDuracaoMin} minutos`,
        preco: finalPrecoCentavos > 0 ? `R$ ${(finalPrecoCentavos / 100).toFixed(2).replace('.', ',')}` : 'Preço do serviço',
        observacoes: observacoes || 'Nenhuma',
      },
      appointmentData: {
        professionalId: finalProfessionalId,
        clientId: finalClientId,
        serviceId: finalServiceId,
        inicio,
        fim: finalFim,
        precoCentavos: finalPrecoCentavos,
        comissaoPercent,
        observacoes,
      },
      message: `Por favor, confirme as informações do agendamento:\n\n` +
        `👤 **Profissional:** ${professionalData?.apelido || 'Não informado'}\n` +
        `👥 **Paciente:** ${clientData?.nome || 'Não informado'}\n` +
        `💼 **Serviço:** ${serviceData?.nome || 'Não informado'}\n` +
        `📅 **Data:** ${dataFormatada}\n` +
        `🕐 **Horário:** ${horaInicio} às ${horaFim}\n` +
        `⏱️ **Duração:** ${serviceDuracaoMin} minutos\n` +
        `💰 **Preço:** ${finalPrecoCentavos > 0 ? `R$ ${(finalPrecoCentavos / 100).toFixed(2).replace('.', ',')}` : 'Preço do serviço'}\n` +
        `${observacoes ? `📝 **Observações:** ${observacoes}\n` : ''}` +
        `\nDigite "confirmar" ou "sim" para criar o agendamento, ou "cancelar" para cancelar.`,
    };
  }

  // Se confirmado, criar o agendamento
  console.log('[createAppointment] Confirmação recebida, criando agendamento...');
  
  // Log das datas antes de salvar
  const inicioBrazil = DateTime.fromJSDate(inicioDate).setZone(TIMEZONE_BRASIL);
  const fimBrazil = DateTime.fromJSDate(fimDate).setZone(TIMEZONE_BRASIL);
  console.log('[createAppointment] Datas que serão salvas no Firestore:', {
    inicioBrasil: inicioBrazil.toFormat('dd/MM/yyyy HH:mm:ss'),
    inicioUTC: inicioDate.toISOString(),
    fimBrasil: fimBrazil.toFormat('dd/MM/yyyy HH:mm:ss'),
    fimUTC: fimDate.toISOString(),
  });
  
  const appointmentRef = await db.collection(`companies/${companyId}/appointments`).add({
    professionalId: finalProfessionalId,
    clientId: finalClientId,
    serviceId: finalServiceId,
    inicio: admin.firestore.Timestamp.fromDate(inicioDate),
    fim: admin.firestore.Timestamp.fromDate(fimDate),
    precoCentavos: finalPrecoCentavos,
    comissaoPercent,
    status: 'agendado',
    observacoes,
    createdByUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log('[createAppointment] Agendamento criado com sucesso:', appointmentRef.id);
  
  return {
    success: true,
    appointmentId: appointmentRef.id,
    message: `✅ Agendamento criado com sucesso!\n\n` +
      `**Profissional:** ${professionalData?.apelido}\n` +
      `**Paciente:** ${clientData?.nome}\n` +
      `**Serviço:** ${serviceData?.nome}\n` +
      `**Data:** ${dataFormatada}\n` +
      `**Horário:** ${horaInicio} às ${horaFim}`,
  };
}

/**
 * Função para obter estatísticas/totais
 */
async function getStatistics(params: {
  companyId: string;
  startDate?: string;
  endDate?: string;
  professionalId?: string;
}) {
  const { companyId, startDate, endDate, professionalId } = params;
  
  let query = db.collection(`companies/${companyId}/appointments`);
  
  if (professionalId) {
    query = query.where('professionalId', '==', professionalId) as any;
  }
  
  const snapshot = await query.get();
  let appointments: AppointmentData[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      professionalId: data.professionalId || undefined,
      clientId: data.clientId || undefined,
      serviceId: data.serviceId || undefined,
      status: data.status || undefined,
      precoCentavos: data.precoCentavos || undefined,
      valorPagoCentavos: data.valorPagoCentavos || undefined,
      comissaoPercent: data.comissaoPercent || undefined,
      observacoes: data.observacoes || undefined,
      inicio: data.inicio?.toDate?.()?.toISOString() || data.inicio,
      fim: data.fim?.toDate?.()?.toISOString() || data.fim,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as AppointmentData;
  });
  
  // Filtrar por data se fornecido
  if (startDate) {
    const start = new Date(startDate);
    appointments = appointments.filter(apt => {
      const aptDate = new Date(apt.inicio);
      return aptDate >= start;
    });
  }
  if (endDate) {
    const end = new Date(endDate);
    appointments = appointments.filter(apt => {
      const aptDate = new Date(apt.inicio);
      return aptDate <= end;
    });
  }
  
  const totalAgendamentos = appointments.length;
  const agendados = appointments.filter(a => a.status === 'agendado').length;
  const confirmados = appointments.filter(a => a.status === 'confirmado').length;
  const concluidos = appointments.filter(a => a.status === 'concluido').length;
  const cancelados = appointments.filter(a => a.status === 'cancelado').length;
  
  // Calcular valores totais (previsão) - soma de todos os agendamentos no período
  const valorTotalCentavos = appointments.reduce((sum, apt) => {
    return sum + (apt.precoCentavos || 0);
  }, 0);
  
  // Calcular valor recebido (realizado) - apenas agendamentos concluídos
  const valorRecebidoCentavos = appointments
    .filter(a => a.status === 'concluido')
    .reduce((sum, apt) => {
      return sum + (apt.valorPagoCentavos || apt.precoCentavos || 0);
    }, 0);
  
  // Calcular previsão (agendados + confirmados) - agendamentos que ainda não foram concluídos
  const valorPrevisaoCentavos = appointments
    .filter(a => a.status === 'agendado' || a.status === 'confirmado')
    .reduce((sum, apt) => {
      return sum + (apt.precoCentavos || 0);
    }, 0);
  
  return {
    totalAgendamentos,
    agendados,
    confirmados,
    concluidos,
    cancelados,
    valorTotalCentavos, // Total do período (todos os agendamentos)
    valorRecebidoCentavos, // Valor já recebido (apenas concluídos)
    valorPrevisaoCentavos, // Previsão (agendados + confirmados)
    valorTotalReais: valorTotalCentavos / 100,
    valorRecebidoReais: valorRecebidoCentavos / 100,
    valorPrevisaoReais: valorPrevisaoCentavos / 100,
  };
}

/**
 * Função para buscar pacientes
 */
async function searchPatients(params: {
  companyId: string;
  nome?: string;
  telefone?: string;
}) {
  const { companyId, nome, telefone } = params;
  
  let query = db.collection(`companies/${companyId}/patients`);
  
  if (nome) {
    // Busca por nome - MELHORADO: limitar busca inicial e filtrar em memória
    // Buscar até 100 pacientes e filtrar (melhor que buscar todos)
    const snapshot = await query.limit(100).get();
    const searchNameLower = nome.toLowerCase();
    const patients = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((p: any) => {
        const patientName = p.nome?.toLowerCase() || '';
        return patientName.includes(searchNameLower) || searchNameLower.includes(patientName);
      })
      .slice(0, 20); // Limitar resultados finais
    return patients;
  }
  
  if (telefone) {
    // Normalizar telefone
    const normalized = telefone.replace(/\D/g, '');
    const variants = [
      normalized,
      normalized.startsWith('55') ? normalized.slice(2) : `55${normalized}`,
    ];
    
    query = query.where('telefoneE164', 'in', variants) as any;
  }
  
  const snapshot = await query.limit(20).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Função para buscar profissionais
 */
async function searchProfessionals(params: { companyId: string; nome?: string }) {
  const { companyId, nome } = params;
  
  const snapshot = await db
    .collection(`companies/${companyId}/professionals`)
    .where('ativo', '==', true)
    .get();
  
  let professionals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  if (nome) {
    professionals = professionals.filter((p: any) =>
      p.apelido?.toLowerCase().includes(nome.toLowerCase())
    );
  }
  
  return professionals;
}

/**
 * Função para buscar serviços
 */
async function searchServices(params: { companyId: string; nome?: string }) {
  const { companyId, nome } = params;
  
  const snapshot = await db
    .collection(`companies/${companyId}/services`)
    .where('ativo', '==', true)
    .get();
  
  let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  if (nome) {
    services = services.filter((s: any) =>
      s.nome?.toLowerCase().includes(nome.toLowerCase())
    );
  }
  
  return services;
}

/**
 * Cloud Function principal para chat com IA
 */
export const aiAssistant = onCall(
  { secrets: [OPENAI_API_KEY], memory: '512MiB' },
  async (request) => {
    const startTime = Date.now();
    let lastLogTime = startTime;
    
    const logTime = (label: string) => {
      const now = Date.now();
      const elapsed = now - lastLogTime;
      const totalElapsed = now - startTime;
      console.log(`[aiAssistant] ⏱️ ${label} | Tempo desde último log: ${elapsed}ms | Tempo total: ${totalElapsed}ms`);
      lastLogTime = now;
    };
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[aiAssistant] 🚀 FUNÇÃO INICIADA');
    console.log('[aiAssistant] Modelo configurado:', OPENAI_MODEL);
    console.log('═══════════════════════════════════════════════════════════════');
    logTime('Início da função');
    
    const uid = request.auth?.uid;
    const { messages, companyId }: AIChatRequest = request.data;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    if (!companyId) {
      throw new HttpsError('invalid-argument', 'companyId é obrigatório');
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'Mensagens são obrigatórias');
    }

    // Capturar a última mensagem do usuário (pergunta)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    console.log('[aiAssistant] 📝 Última mensagem do usuário:', lastUserMessage.substring(0, 100));
    logTime('Mensagem do usuário capturada');

    // Obter e limpar a API key (remover espaços e quebras de linha)
    let apiKey: string | undefined;
    try {
      apiKey = OPENAI_API_KEY.value()?.trim();
      logTime('API key obtida');
      
      if (!apiKey) {
        throw new HttpsError('failed-precondition', 'OpenAI API key não configurada. Por favor, configure o secret OPENAI_API_KEY no Firebase.');
      }
    } catch (secretError: any) {
      console.error('Erro ao obter secret OPENAI_API_KEY:', secretError);
      throw new HttpsError(
        'failed-precondition',
        'Erro ao acessar a API key da OpenAI. Verifique se o secret OPENAI_API_KEY está configurado no Firebase.'
      );
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Obter data atual no timezone do Brasil usando Luxon
      const brazilDates = getBrazilDates();
      const todayStr = brazilDates.today.date;
      const todayFormatted = brazilDates.today.formatted;
      const tomorrowStr = brazilDates.tomorrow.date;
      const tomorrowFormatted = brazilDates.tomorrow.formatted;
      
      console.log('[aiAssistant] 📅 Datas calculadas (Luxon):', {
        hoje: { date: todayStr, formatted: todayFormatted },
        amanha: { date: tomorrowStr, formatted: tomorrowFormatted },
        timestamp: brazilDates.now.toISO()
      });
      logTime('Datas calculadas');

      // Definir funções disponíveis para a IA
      const functions = [
        {
          name: 'searchAppointments',
          description: `Busca agendamentos. Pode filtrar por profissional, cliente, data, status ou dia da semana. Aceita nomes ou IDs. Se não especificar data, retorna apenas agendamentos futuros ordenados do mais próximo para o mais distante. Os resultados incluem nomes completos do profissional (professionalName), paciente (patientName) e serviço (serviceName) - sempre inclua essas informações ao apresentar os agendamentos ao usuário. IMPORTANTE: Se houver apenas um profissional cadastrado e o usuário não especificar um profissional, a função automaticamente filtrará os agendamentos desse profissional único. 

CRÍTICO - DATAS:
- Data de HOJE: ${todayStr} (${todayFormatted}). Quando o usuário perguntar sobre "hoje", "agendamentos de hoje", "o que tem pra hoje", etc., você DEVE usar startDate: "${todayStr}" e endDate: "${todayStr}".
- Data de AMANHÃ: ${tomorrowStr} (${tomorrowFormatted}). Quando o usuário perguntar sobre "amanhã", "agendamentos de amanhã", "o que tem pra amanhã", etc., você DEVE usar startDate: "${tomorrowStr}" e endDate: "${tomorrowStr}".
NUNCA invente ou calcule datas diferentes. Use EXATAMENTE as datas fornecidas acima.`,
          parameters: {
            type: 'object',
            properties: {
              professionalId: {
                type: 'string',
                description: 'ID do profissional (opcional se professionalName for fornecido)',
              },
              professionalName: {
                type: 'string',
                description: 'Nome/apelido do profissional (opcional se professionalId for fornecido). Use quando o usuário mencionar o nome do profissional.',
              },
              clientId: {
                type: 'string',
                description: 'ID do cliente/paciente (opcional se clientName for fornecido)',
              },
              clientName: {
                type: 'string',
                description: 'Nome do cliente/paciente (opcional se clientId for fornecido). Use quando o usuário mencionar o nome do paciente (ex: "Letícia", "João Silva").',
              },
              startDate: {
                type: 'string',
                description: `Data de início no formato ISO (YYYY-MM-DD) (opcional). CRÍTICO - DATAS: Data de HOJE é ${todayStr}. Data de AMANHÃ é ${tomorrowStr}. Quando o usuário perguntar sobre "hoje", use startDate: "${todayStr}". Quando perguntar sobre "amanhã", use startDate: "${tomorrowStr}". NUNCA invente ou calcule datas diferentes. IMPORTANTE: Quando o usuário pedir "esta semana" ou "semana atual", calcule o início da semana atual (domingo) e o fim da semana atual (sábado). A semana no Brasil vai de domingo (dia 0) a sábado (dia 6).`,
              },
              endDate: {
                type: 'string',
                description: `Data de fim no formato ISO (YYYY-MM-DD) (opcional). CRÍTICO - DATAS: Data de HOJE é ${todayStr}. Data de AMANHÃ é ${tomorrowStr}. Quando o usuário perguntar sobre "hoje", use endDate: "${todayStr}". Quando perguntar sobre "amanhã", use endDate: "${tomorrowStr}". NUNCA invente ou calcule datas diferentes. IMPORTANTE: Quando o usuário pedir "esta semana" ou "semana atual", calcule o fim da semana atual (sábado). A semana no Brasil vai de domingo (dia 0) a sábado (dia 6).`,
              },
              status: {
                type: 'string',
                enum: ['agendado', 'confirmado', 'concluido', 'cancelado', 'no_show', 'pendente'],
                description: 'Status do agendamento (opcional)',
              },
              weekday: {
                type: 'number',
                description: 'Dia da semana (0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado). Use quando o usuário pedir agendamentos de um dia específico da semana (ex: "quarta-feira", "quinta", "sexta"). A função retornará apenas agendamentos futuros naquele dia da semana, ordenados do mais próximo para o mais distante.',
              },
            },
          },
        },
        {
          name: 'createAppointment',
          description: 'Cria um novo agendamento para QUALQUER data futura. IMPORTANTE: Esta função SEMPRE retorna um resumo para confirmação primeiro (com needsConfirmation=true). Só cria o agendamento quando confirm=true. Pode usar nomes ou IDs para profissional, cliente e serviço. Se usar nomes, a função buscará os IDs automaticamente. Se não informar profissional e houver apenas um profissional ativo, será usado automaticamente. Se houver múltiplos profissionais, a função retornará uma lista numerada para escolha. Para datas: aceite qualquer data futura mencionada pelo usuário (ex: "dia 27", "27 de novembro", "próxima semana"). Calcule a data no formato ISO (YYYY-MM-DDTHH:mm) e use normalmente. NUNCA recuse criar agendamentos para datas futuras.',
          parameters: {
            type: 'object',
            properties: {
              professionalId: {
                type: 'string',
                description: 'ID do profissional (opcional se professionalName for fornecido ou se houver apenas um profissional ativo)',
              },
              professionalName: {
                type: 'string',
                description: 'Nome/apelido do profissional (opcional se professionalId for fornecido ou se houver apenas um profissional ativo). Use este campo quando o usuário mencionar o nome do profissional.',
              },
              professionalNumber: {
                type: 'number',
                description: 'Número do profissional da lista (1, 2, 3...) quando a função retornar needsProfessionalSelection=true. Use este campo quando o usuário escolher um profissional da lista numerada.',
              },
              clientId: {
                type: 'string',
                description: 'ID do cliente/paciente (opcional se clientName for fornecido)',
              },
              clientName: {
                type: 'string',
                description: 'Nome do cliente/paciente (opcional se clientId for fornecido). Use este campo quando o usuário mencionar o nome do paciente.',
              },
              serviceId: {
                type: 'string',
                description: 'ID do serviço (opcional se serviceName for fornecido)',
              },
              serviceName: {
                type: 'string',
                description: 'Nome do serviço (opcional se serviceId for fornecido). Use este campo quando o usuário mencionar o nome do serviço.',
              },
              inicio: {
                type: 'string',
                description: 'Data e hora de início no formato ISO (ex: 2025-11-27T10:00:00). OBRIGATÓRIO. Aceita QUALQUER data futura. Quando o usuário mencionar uma data específica (ex: "dia 27", "27 de novembro"), calcule a data correta no formato ISO. Se não especificar hora, use um horário padrão razoável (ex: 10:00 ou 14:00).',
              },
              fim: {
                type: 'string',
                description: 'Data e hora de fim no formato ISO (ex: 2024-01-15T11:00:00). Opcional se duracaoMinutos for fornecido.',
              },
              duracaoMinutos: {
                type: 'number',
                description: 'Duração do agendamento em minutos (opcional, padrão 60). Usado para calcular o fim se não fornecido.',
              },
              precoCentavos: {
                type: 'number',
                description: 'Preço em centavos (opcional, será usado o preço do serviço se não fornecido)',
              },
              comissaoPercent: {
                type: 'number',
                description: 'Percentual de comissão (opcional, padrão 0)',
              },
              observacoes: {
                type: 'string',
                description: 'Observações sobre o agendamento (opcional)',
              },
              confirm: {
                type: 'boolean',
                description: 'Se true, cria o agendamento. Se false ou não fornecido, retorna apenas o resumo para confirmação. Use true apenas quando o usuário confirmar explicitamente (ex: dizer "sim", "confirmar", "criar").',
              },
            },
            required: ['inicio'],
          },
        },
        {
          name: 'getStatistics',
          description: 'Obtém estatísticas e totais de agendamentos. Pode filtrar por período e profissional. IMPORTANTE: Esta função requer acesso financeiro completo. Se o usuário não tiver permissão para acessar relatórios e estatísticas, a função retornará um erro de permissão. Nesse caso, você deve informar educadamente que o usuário não tem permissão para acessar essas informações e sugerir que entre em contato com o administrador. Quando o usuário pedir estatísticas de "este mês" ou "mês atual", calcule as datas do primeiro dia do mês atual até o último dia do mês atual, usando o ANO ATUAL (2025 ou o ano vigente). Exemplo: Se hoje é 26 de novembro de 2025, "este mês" significa de 2025-11-01 até 2025-11-30. A função retorna: valorTotalCentavos (total do período - todos os agendamentos), valorRecebidoCentavos (valor já recebido - apenas concluídos), valorPrevisaoCentavos (previsão - agendados + confirmados). SEMPRE apresente tanto o valor recebido quanto a previsão quando o usuário perguntar sobre valores.',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description: 'Data de início no formato ISO (YYYY-MM-DD). Quando o usuário pedir "este mês", use o primeiro dia do mês atual no ano atual (ex: 2025-11-01 para novembro de 2025).',
              },
              endDate: {
                type: 'string',
                description: 'Data de fim no formato ISO (YYYY-MM-DD). Quando o usuário pedir "este mês", use o último dia do mês atual no ano atual (ex: 2025-11-30 para novembro de 2025).',
              },
              professionalId: {
                type: 'string',
                description: 'ID do profissional (opcional)',
              },
            },
          },
        },
        {
          name: 'searchPatients',
          description: 'Busca pacientes por nome ou telefone. IMPORTANTE: Se retornar múltiplos resultados e o usuário não especificou um nome exato, você DEVE apresentar uma lista numerada solicitando qual paciente usar. Formato: "Encontrei X pacientes. Qual você deseja usar?\n\n1. [Nome 1]\n2. [Nome 2]\n...\n\nResponda com o número (ex: 1, 2, 3...)." Aguarde a escolha antes de continuar.',
          parameters: {
            type: 'object',
            properties: {
              nome: {
                type: 'string',
                description: 'Nome do paciente (opcional)',
              },
              telefone: {
                type: 'string',
                description: 'Telefone do paciente (opcional)',
              },
            },
          },
        },
        {
          name: 'searchProfessionals',
          description: 'Busca profissionais ativos por nome. IMPORTANTE: Se retornar múltiplos resultados e o usuário não especificou um nome exato, você DEVE apresentar uma lista numerada solicitando qual profissional usar. Formato: "Encontrei X profissionais. Qual você deseja usar?\n\n1. [Nome 1]\n2. [Nome 2]\n...\n\nResponda com o número (ex: 1, 2, 3...)." Aguarde a escolha antes de continuar.',
          parameters: {
            type: 'object',
            properties: {
              nome: {
                type: 'string',
                description: 'Nome/apelido do profissional (opcional)',
              },
            },
          },
        },
        {
          name: 'searchServices',
          description: 'Busca serviços ativos por nome. IMPORTANTE: Se retornar múltiplos resultados e o usuário não especificou um nome exato, você DEVE apresentar uma lista numerada solicitando qual serviço usar. Formato: "Encontrei X serviços. Qual você deseja usar?\n\n1. [Nome 1]\n2. [Nome 2]\n...\n\nResponda com o número (ex: 1, 2, 3...)." Aguarde a escolha antes de continuar.',
          parameters: {
            type: 'object',
            properties: {
              nome: {
                type: 'string',
                description: 'Nome do serviço (opcional)',
              },
            },
          },
        },
      ];

      // Preparar mensagens do sistema - VERSÃO OTIMIZADA (reduzida em ~70%)
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `Você é um assistente para sistema de agendamento de consultas.

📅 DATAS ATUAIS (referência):
- HOJE: ${todayStr} (${todayFormatted})
- AMANHÃ: ${tomorrowStr} (${tomorrowFormatted})
- Quando perguntar "que dia é hoje?", responda: "Hoje é ${todayFormatted}"
- Quando perguntar "que dia é amanhã?", responda: "Amanhã será ${tomorrowFormatted}"

📋 REGRAS PRINCIPAIS:
1. DATAS: Você PODE criar agendamentos para QUALQUER data futura. Use "${todayStr}" apenas quando o usuário mencionar "hoje" e "${tomorrowStr}" quando mencionar "amanhã". Para outras datas (ex: "dia 27", "27 de novembro"), calcule a data correta no formato ISO (YYYY-MM-DDTHH:mm) e use normalmente. NUNCA recuse criar agendamentos para datas futuras.
2. FORMATO DE AGENDAMENTOS: **Paciente:** [patientName] | **Profissional:** [professionalName] | **Serviço:** [serviceName] | **Data:** [formato BR] | **Horário:** [24h] | **Status:** [status]
3. NOMES/IDs: Aceite nomes ou IDs. Use campos *Name quando o usuário mencionar nomes.
4. CONFIRMAÇÃO: createAppointment retorna resumo primeiro. Use confirm=true apenas após confirmação do usuário.
5. VALORES: Apresente valorRecebidoReais (concluídos) e valorPrevisaoReais (previstos) quando perguntar sobre valores.
6. DATAS RELATIVAS: "esta semana" = domingo a sábado atual. "este mês" = primeiro ao último dia do mês atual (ano atual).
7. Use dateInfo do resultado das funções quando disponível.
8. LISTAGENS: Quando buscar profissionais, pacientes ou serviços e houver múltiplos resultados sem nome específico, SEMPRE apresente uma lista numerada solicitando qual usar. Formato: "Encontrei X resultados. Qual você deseja usar?\n\n1. [Nome 1]\n2. [Nome 2]\n3. [Nome 3]\n\nResponda com o número (ex: 1, 2, 3...)." Aguarde a escolha do usuário antes de continuar.
9. CRIAÇÃO DE AGENDAMENTOS: Você PODE e DEVE criar agendamentos para QUALQUER data futura mencionada pelo usuário. NUNCA recuse ou limite a criação apenas para "hoje" ou "amanhã". Se o usuário mencionar "dia 27", "27 de novembro", "próxima semana", etc., calcule a data correta e crie o agendamento normalmente.
10. PERMISSÕES: A função getStatistics requer acesso financeiro completo. Se você receber um erro de permissão ao tentar usar getStatistics, informe educadamente ao usuário que ele não tem permissão para acessar relatórios e estatísticas e sugira que entre em contato com o administrador do sistema. NÃO tente usar a função novamente ou fornecer informações financeiras sem permissão.

Consulte as descriptions das funções para detalhes específicos. Seja prestativo e objetivo.`,
      };

      // Limitar histórico de mensagens para evitar exceder limite de tokens
      // Manter apenas as últimas MAX_MESSAGES mensagens (10 turnos de conversa) + mensagem do sistema
      const limitedMessages = messages.length > MAX_MESSAGES 
        ? messages.slice(-MAX_MESSAGES)
        : messages;

      // Remover mensagens duplicadas consecutivas (mesmo role e conteúdo)
      const deduplicatedMessages: ChatMessage[] = [];
      let lastMessage: ChatMessage | null = null;
      for (const msg of limitedMessages) {
        if (!lastMessage || 
            lastMessage.role !== msg.role || 
            lastMessage.content !== msg.content) {
          deduplicatedMessages.push(msg);
          lastMessage = msg;
        } else {
          console.warn('[aiAssistant] Mensagem duplicada detectada e removida:', {
            role: msg.role,
            content: msg.content.substring(0, 50),
          });
        }
      }

      // Interceptar mensagens do usuário e substituir "hoje" e "amanhã" pelas datas reais
      const processedMessages = deduplicatedMessages.map((msg) => {
        if (msg.role === 'user') {
          // Substituir "hoje" e variações pela data real
          let processedContent = msg.content;
          
          // Padrões para "hoje"
          const hojePatterns = [
            /\bhoje\b/gi,
            /\bagendamentos?\s+de\s+hoje\b/gi,
            /\bo\s+que\s+tem\s+pra\s+hoje\b/gi,
            /\bo\s+que\s+tem\s+para\s+hoje\b/gi,
            /\bagendamentos?\s+hoje\b/gi,
          ];
          
          // Padrões para "amanhã"
          const amanhaPatterns = [
            /\bamanhã\b/gi,
            /\bamanha\b/gi,
            /\bagendamentos?\s+de\s+amanhã\b/gi,
            /\bagendamentos?\s+de\s+amanha\b/gi,
            /\bo\s+que\s+tem\s+pra\s+amanhã\b/gi,
            /\bo\s+que\s+tem\s+pra\s+amanha\b/gi,
            /\bo\s+que\s+tem\s+para\s+amanhã\b/gi,
            /\bo\s+que\s+tem\s+para\s+amanha\b/gi,
            /\bagendamentos?\s+amanhã\b/gi,
            /\bagendamentos?\s+amanha\b/gi,
          ];
          
          // Verificar se contém "hoje" ou "amanhã"
          const hasHoje = hojePatterns.some(pattern => pattern.test(processedContent));
          const hasAmanha = amanhaPatterns.some(pattern => pattern.test(processedContent));
          
          if (hasHoje || hasAmanha) {
            // Adicionar contexto explícito sobre as datas
            processedContent = `${processedContent}\n\n[CONTEXTO DE DATA: A data de hoje é ${todayStr} (${todayFormatted}). A data de amanhã é ${tomorrowStr} (${tomorrowFormatted}). Quando você mencionar "hoje", use startDate: "${todayStr}" e endDate: "${todayStr}". Quando mencionar "amanhã", use startDate: "${tomorrowStr}" e endDate: "${tomorrowStr}".]`;
            
            console.log('[aiAssistant] 📅 Mensagem do usuário processada com contexto de data:', {
              original: msg.content.substring(0, 100),
              hasHoje,
              hasAmanha,
              todayStr,
              tomorrowStr
            });
          }
          
          return {
            role: msg.role,
            content: processedContent,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      });

      // Construir histórico de mensagens
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        systemMessage,
        ...processedMessages,
      ];
      logTime('Mensagens processadas e histórico construído');

      // Chamar OpenAI com function calling
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('[aiAssistant] 🤖🤖🤖 CHAMANDO OPENAI COM MODELO:', OPENAI_MODEL);
      console.log('═══════════════════════════════════════════════════════════════');
      logTime('Iniciando primeira chamada OpenAI');
      const openaiCallStartTime = Date.now();
      
      let response = await openai.chat.completions.create({
        model: OPENAI_MODEL, // Usando gpt-4o (modelo mais recente e funcional)
        messages: chatMessages,
        functions,
        function_call: 'auto',
        temperature: 0.7, // gpt-4o suporta temperature customizado
      });
      
      const openaiCallDuration = Date.now() - openaiCallStartTime;
      console.log('[aiAssistant] ✅ Resposta recebida do modelo:', OPENAI_MODEL);
      console.log('[aiAssistant] Modelo usado na resposta:', response.model || 'não informado');
      console.log(`[aiAssistant] ⏱️ Tempo da primeira chamada OpenAI: ${openaiCallDuration}ms`);
      logTime('Primeira chamada OpenAI concluída');

      let assistantMessage = response.choices[0].message;
      const functionCalls: any[] = [];
      
      // Acumular uso de tokens de todas as chamadas
      let totalTokensUsed = response.usage?.total_tokens || 0;
      let totalPromptTokens = response.usage?.prompt_tokens || 0;
      let totalCompletionTokens = response.usage?.completion_tokens || 0;

      // Processar function calls se houver
      let functionCallCount = 0;
      while (assistantMessage.function_call) {
        functionCallCount++;
        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments || '{}');
        
        console.log(`[aiAssistant] 🔄 Processando function call #${functionCallCount}: ${functionName}`);
        logTime(`Iniciando processamento de function call #${functionCallCount}`);

        let functionResult: any;

        try {
          console.log(`[aiAssistant] Executando função: ${functionName}`, {
            functionArgs,
            companyId,
          });
          logTime(`Iniciando execução da função ${functionName}`);
          const functionStartTime = Date.now();

          // Verificar permissões para funções sensíveis
          const functionPermissions: Record<string, string[]> = {
            'createAppointment': ['create'],
            'searchAppointments': ['read'],
            'getStatistics': ['read'],
            'searchPatients': ['read'],
            'searchProfessionals': ['read'],
            'searchServices': ['read'],
          };

          const requiredActions = functionPermissions[functionName] || ['read'];
          const permissionCheckStartTime = Date.now();
          
          // Obter token decodificado para usar custom claims (muito mais rápido!)
          let authToken: admin.auth.DecodedIdToken | undefined;
          try {
            if (request.auth?.token) {
              authToken = request.auth.token;
              console.log('[aiAssistant] 🔑 Token obtido, claims presentes:', {
                hasRole: !!authToken.role,
                hasCompanyId: !!authToken.companyId,
                hasAtivo: authToken.ativo !== undefined,
                role: authToken.role,
                companyId: authToken.companyId,
                ativo: authToken.ativo
              });
            } else {
              console.warn('[aiAssistant] ⚠️ request.auth.token não disponível');
            }
          } catch (error: any) {
            console.warn('[aiAssistant] ⚠️ Não foi possível obter token para custom claims, usando fallback:', error.message);
          }
          
          const permissionCheck = await checkUserPermission(uid, companyId, requiredActions, authToken);
          const permissionCheckDuration = Date.now() - permissionCheckStartTime;
          console.log(`[aiAssistant] ⏱️ Verificação de permissões: ${permissionCheckDuration}ms`);

          if (!permissionCheck.allowed) {
            throw new HttpsError(
              'permission-denied',
              `Você não tem permissão para executar esta ação. ${permissionCheck.reason || ''}`
            );
          }

          // Verificação adicional para getStatistics: requer acesso financeiro completo
          if (functionName === 'getStatistics') {
            const hasFinancialAccess = await checkFinancialAccess(uid, companyId, authToken);
            if (!hasFinancialAccess) {
              throw new HttpsError(
                'permission-denied',
                'Você não tem permissão para acessar relatórios e estatísticas. Esta funcionalidade requer acesso financeiro completo.'
              );
            }
          }
          
          switch (functionName) {
            case 'searchAppointments':
              // Passar a última mensagem do usuário para validação de data
              // Remover o contexto de data adicionado anteriormente se houver
              const lastUserMessageRaw = deduplicatedMessages.filter(m => m.role === 'user').pop()?.content || '';
              // Remover o contexto de data que foi adicionado anteriormente
              const lastUserMessage = lastUserMessageRaw.split('\n\n[CONTEXTO DE DATA:')[0].trim();
              
              console.log('[aiAssistant] 📝 Query do usuário extraída para validação:', {
                original: lastUserMessageRaw.substring(0, 100),
                cleaned: lastUserMessage,
                willPassToFunction: true
              });
              
              functionResult = await searchAppointments({
                companyId,
                ...functionArgs,
                userQuery: lastUserMessage,
              });
              
              // Extrair appointments e metadata do resultado
              if (functionResult && !functionResult.error && functionResult.appointments) {
                const metadata = functionResult.metadata || {};
                // Adicionar informação sobre a data usada diretamente no resultado para a IA
                functionResult.dateInfo = metadata.dateUsedFormatted ? 
                  `Data usada na busca: ${metadata.dateUsedFormatted} (${metadata.dateUsed})` : null;
                if (metadata.queryType === 'hoje' || metadata.queryType === 'amanha') {
                  functionResult.dateInfo = `IMPORTANTE: O usuário perguntou sobre "${metadata.queryType}". A data correta usada na busca foi: ${metadata.dateUsedFormatted} (${metadata.dateUsed}). Use esta data exata na sua resposta, não invente outra data.`;
                }
              }
              
              const functionDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] Resultado de ${functionName}:`, {
                hasError: !!functionResult?.error,
                appointmentsCount: Array.isArray(functionResult) ? functionResult.length : functionResult?.appointments?.length || 0,
                dateInfo: functionResult?.dateInfo,
                metadata: functionResult?.metadata
              });
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${functionDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            case 'createAppointment':
              functionResult = await createAppointment({
                companyId,
                ...functionArgs,
                createdByUid: uid,
              });
              const createAppointmentDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${createAppointmentDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            case 'getStatistics':
              functionResult = await getStatistics({
                companyId,
                ...functionArgs,
              });
              const getStatisticsDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${getStatisticsDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            case 'searchPatients':
              functionResult = await searchPatients({
                companyId,
                ...functionArgs,
              });
              const searchPatientsDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${searchPatientsDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            case 'searchProfessionals':
              functionResult = await searchProfessionals({
                companyId,
                ...functionArgs,
              });
              const searchProfessionalsDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${searchProfessionalsDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            case 'searchServices':
              functionResult = await searchServices({
                companyId,
                ...functionArgs,
              });
              const searchServicesDuration = Date.now() - functionStartTime;
              console.log(`[aiAssistant] ⏱️ Tempo total de execução da função ${functionName}: ${searchServicesDuration}ms`);
              logTime(`Função ${functionName} concluída`);
              break;

            default:
              functionResult = { error: `Função desconhecida: ${functionName}` };
          }
        } catch (error: any) {
          // Melhorar tratamento de erros com mais detalhes
          const errorType = error.code || error.name || error?.constructor?.name || 'UnknownError';
          const errorMessage = error.message || 'Erro ao executar função';
          
          console.error(`[aiAssistant] Erro ${errorType} ao executar função ${functionName}:`, {
            error: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            functionArgs,
            companyId,
            errorCode: error.code,
            errorStatus: error.status,
          });

          // Salvar métrica de erro
          // Salvar métricas de erro (não-bloqueante)
          saveUsageMetrics({
            companyId,
            userId: uid,
            functionName,
            processingTimeMs: 0,
            success: false,
            error: `${errorType}: ${errorMessage}`,
          }).catch((error) => {
            console.warn('[aiAssistant] ⚠️ Erro ao salvar métricas (não crítico):', error.message);
          });

          // Retornar erro mais específico baseado no tipo
          if (error instanceof HttpsError) {
            // Re-throw erros do Firebase Functions (já formatados)
            throw error;
          }

          functionResult = {
            error: errorMessage,
            errorType,
            // Não expor stack em produção
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
          };
        }

        // Adicionar resultado da função ao histórico
        chatMessages.push(assistantMessage);
        
        // Limitar tamanho do resultado da função para evitar exceder tokens
        let functionResultContent = JSON.stringify(functionResult);
        if (functionResultContent.length > MAX_FUNCTION_RESULT_SIZE) {
          // Se o resultado for muito grande, truncar e adicionar informação estruturada
          const truncated = functionResultContent.substring(0, MAX_FUNCTION_RESULT_SIZE);
          try {
            const parsed = JSON.parse(truncated);
            functionResultContent = JSON.stringify({
              truncated: true,
              originalLength: functionResultContent.length,
              data: parsed,
              message: 'Resultado truncado. Use apenas os dados fornecidos.',
            });
          } catch {
            // Se não conseguir parsear, usar fallback simples
            functionResultContent = truncated + '... (resultado truncado)';
          }
        }
        
        // Adicionar resultado da função ao histórico usando role 'function' (suportado por gpt-4o)
        chatMessages.push({
          role: 'function',
          name: functionName,
          content: functionResultContent,
        });

        functionCalls.push({
          name: functionName,
          args: functionArgs,
          result: functionResult,
        });

        // Limitar histórico novamente antes de chamar a IA
        if (chatMessages.length > MAX_MESSAGES + 10) {
          // Manter mensagem do sistema + últimas mensagens
          const systemMsg = chatMessages[0];
          const recentMessages = chatMessages.slice(-(MAX_MESSAGES + 5));
          chatMessages.length = 0;
          chatMessages.push(systemMsg, ...recentMessages);
        }

        // Obter resposta final da IA
        console.log('[aiAssistant] 🤖 Chamada final usando modelo:', OPENAI_MODEL);
        logTime('Iniciando chamada final OpenAI');
        const finalOpenaiCallStartTime = Date.now();
        
        response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: chatMessages,
          functions,
          function_call: 'auto',
          temperature: 0.7, // gpt-4o suporta temperature customizado
        });
        
        const finalOpenaiCallDuration = Date.now() - finalOpenaiCallStartTime;
        console.log('[aiAssistant] ✅ Resposta final recebida do modelo:', OPENAI_MODEL);
        console.log(`[aiAssistant] ⏱️ Tempo da chamada final OpenAI: ${finalOpenaiCallDuration}ms`);
        logTime('Chamada final OpenAI concluída');

        assistantMessage = response.choices[0].message;
        
        // Acumular tokens desta chamada
        if (response.usage) {
          totalTokensUsed += response.usage.total_tokens || 0;
          totalPromptTokens += response.usage.prompt_tokens || 0;
          totalCompletionTokens += response.usage.completion_tokens || 0;
        }
      }

      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      const finalResponse = assistantMessage.content || '';
      logTime('Resposta final processada');
      
      // Calcular custo estimado usando MODEL_PRICING
      const pricing = MODEL_PRICING[OPENAI_MODEL] || MODEL_PRICING['gpt-4o'];
      const inputCostUSD = (totalPromptTokens / 1_000_000) * pricing.input;
      const outputCostUSD = (totalCompletionTokens / 1_000_000) * pricing.output;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      logTime('Custos calculados');
      
      // Salvar log de uso da IA (não-bloqueante para melhor performance)
      logTime('Iniciando salvamento de log de uso (não-bloqueante)');
      db.collection('aiUsageLogs').add({
        companyId,
        userId: uid,
        userMessage: lastUserMessage,
        assistantResponse: finalResponse,
        processingTimeMs,
        tokens: {
          total: totalTokensUsed,
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
        },
        cost: {
          inputUSD: inputCostUSD,
          outputUSD: outputCostUSD,
          totalUSD: totalCostUSD,
        },
        functionCalls: functionCalls.length > 0 ? functionCalls.map(fc => ({
          name: fc.name,
          // Não salvar o resultado completo para economizar espaço, apenas indicar se teve sucesso
          success: !fc.result?.error,
          hasError: !!fc.result?.error,
        })) : [],
        model: OPENAI_MODEL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }).then(() => {
        console.log('[aiAssistant] ✅ Log de uso salvo com sucesso. Modelo usado:', OPENAI_MODEL);
      }).catch((logError: any) => {
        // Não falhar a requisição se o log falhar
        console.error('[aiAssistant] ⚠️ Erro ao salvar log de uso (não crítico):', {
          error: logError.message,
          companyId,
          userId: uid,
        });
      });
      logTime('Log de uso iniciado (não-bloqueante)');

      // Salvar métricas de uso agregadas (não-bloqueante para melhor performance)
      logTime('Iniciando salvamento de métricas (não-bloqueante)');
      saveUsageMetrics({
        companyId,
        userId: uid,
        functionName: 'aiAssistant',
        processingTimeMs,
        tokens: {
          total: totalTokensUsed,
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
        },
        cost: {
          inputUSD: inputCostUSD,
          outputUSD: outputCostUSD,
          totalUSD: totalCostUSD,
        },
        success: true,
      }).catch((error) => {
        // Log silencioso - não afeta a resposta ao usuário
        console.warn('[aiAssistant] ⚠️ Erro ao salvar métricas (não crítico):', error.message);
      });
      logTime('Métricas iniciadas (não-bloqueante)');

      const totalDuration = Date.now() - startTime;
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`[aiAssistant] ✅ FUNÇÃO CONCLUÍDA | Tempo total: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      console.log('═══════════════════════════════════════════════════════════════');

      return {
        message: finalResponse,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      };
        } catch (error: any) {
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      const totalDuration = endTime - startTime;
      
      // Se for um HttpsError (incluindo permission-denied), propagar diretamente sem transformar
      if (error instanceof HttpsError) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[aiAssistant] ❌ ERRO DE PERMISSÃO/SISTEMA | Código: ${error.code} | Mensagem: ${error.message}`);
        console.log('═══════════════════════════════════════════════════════════════');
        // Re-lançar o erro diretamente para que a mensagem específica seja preservada
        throw error;
      }
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`[aiAssistant] ❌ ERRO NA FUNÇÃO | Tempo até erro: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      console.log('═══════════════════════════════════════════════════════════════');
      
      // Salvar log de erro também
      const errorType = error?.code || error?.name || error?.constructor?.name || 'UnknownError';
      const errorMessage = error?.message || 'Erro desconhecido';
      
      try {
        logTime('Iniciando salvamento de log de erro');
        const errorLogStartTime = Date.now();
        
        await db.collection('aiUsageLogs').add({
          companyId,
          userId: uid,
          userMessage: lastUserMessage || '',
          assistantResponse: null,
          error: errorMessage,
          errorType,
          processingTimeMs,
          tokens: {
            total: 0,
            prompt: 0,
            completion: 0,
          },
          cost: {
            inputUSD: 0,
            outputUSD: 0,
            totalUSD: 0,
          },
          functionCalls: [],
          model: OPENAI_MODEL,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        const errorLogDuration = Date.now() - errorLogStartTime;
        console.log(`[aiAssistant] ⏱️ Tempo para salvar log de erro: ${errorLogDuration}ms`);
        logTime('Log de erro salvo');
      } catch (logError: any) {
        console.error('[aiAssistant] Erro ao salvar log de erro:', logError.message);
      }

      // Salvar métricas de erro (não-bloqueante)
      saveUsageMetrics({
        companyId,
        userId: uid,
        functionName: 'aiAssistant',
        processingTimeMs,
        success: false,
        error: `${errorType}: ${errorMessage}`,
      }).catch((error) => {
        console.warn('[aiAssistant] ⚠️ Erro ao salvar métricas de erro (não crítico):', error.message);
      });
      
      console.error('Erro no AI Assistant:', {
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        apiKeyStartsWith: apiKey?.substring(0, 7),
      });
      
      // Tratar erros específicos com mensagens amigáveis
      if (error?.message?.includes('not a legal HTTP header value')) {
        throw new HttpsError(
          'failed-precondition',
          'API key da OpenAI inválida. Verifique se o secret OPENAI_API_KEY está configurado corretamente no Firebase (sem espaços ou caracteres especiais).'
        );
      }
      
      if (error?.message?.includes('Connection error') || error?.code === 'ECONNREFUSED') {
        throw new HttpsError(
          'unavailable',
          'Erro de conexão com a API da OpenAI. Por favor, tente novamente em alguns instantes.'
        );
      }
      
      // Tratar erro de limite de tokens
      if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
        throw new HttpsError(
          'resource-exhausted',
          'A conversa ficou muito longa. Por favor, inicie uma nova conversa ou faça uma pergunta mais específica.'
        );
      }
      
      // Tratar outros erros da API OpenAI
      if (error?.status || error?.code) {
        throw new HttpsError(
          'internal',
          'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente ou reformule sua pergunta.'
        );
      }
      
      // Erro genérico (não expor detalhes técnicos)
      throw new HttpsError(
        'internal',
        'Ocorreu um erro inesperado. Por favor, tente novamente.'
      );
    }
  }
);

