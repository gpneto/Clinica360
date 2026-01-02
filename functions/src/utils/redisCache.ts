import Redis from 'ioredis';
import * as redisHttp from './redisCacheHttp';

// Configuração do Redis
// Usar database 1 para cache das functions (database 0 e 6 são usados pelo Evolution API)
// Para GCP, use o IP interno da VM ou o hostname do Redis
const REDIS_HOST = process.env.REDIS_HOST || process.env.REDIS_INTERNAL_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_DB = parseInt(process.env.REDIS_DB || '1', 10); // Database 1 para cache

// Cache de disponibilidade do serviço HTTP (verificar a cada 60s)
let httpServiceAvailable: boolean | null = null;
let httpServiceCheckTime: number = 0;
const HTTP_SERVICE_CHECK_INTERVAL = 60000; // 60 segundos

// Cliente Redis singleton (fallback direto)
let redisClient: Redis | null = null;

/**
 * Obtém ou cria o cliente Redis
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      db: REDIS_DB,
      connectTimeout: 10000, // 10 segundos de timeout
      retryStrategy: (times) => {
        // Retry com backoff exponencial, mas limitar tentativas
        if (times > 5) {
          console.log(`[Redis] Máximo de tentativas de reconexão atingido (${times}), parando retry`);
          return null; // Para de tentar reconectar
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Tentando reconectar... (tentativa ${times}, delay ${delay}ms)`);
        return delay;
      },
      maxRetriesPerRequest: 1, // Reduzir tentativas por request
      enableReadyCheck: true,
      lazyConnect: true, // Mudar para lazy connect para não bloquear na inicialização
      enableOfflineQueue: false, // Não enfileirar comandos quando offline
    });

    redisClient.on('error', (error) => {
      console.error('[Redis] Erro na conexão:', error);
      // Não resetar o cliente aqui, deixar o retryStrategy lidar
    });

    redisClient.on('connect', () => {
      console.log(`[Redis] Conectado ao Redis (${REDIS_HOST}:${REDIS_PORT}, DB: ${REDIS_DB})`);
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Cliente Redis pronto');
    });

    redisClient.on('close', () => {
      console.log('[Redis] Conexão fechada');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Erro ao criar cliente Redis:', error);
    return null;
  }
}

/**
 * Prefixo para chaves de cache
 */
const CACHE_PREFIX = 'cache:';

/**
 * TTL padrão para cache (5 minutos)
 * Use 0 para cache permanente (sem expiração)
 */
const DEFAULT_TTL = 300; // 5 minutos em segundos

/**
 * Verifica se o serviço HTTP está disponível (com cache)
 */
async function checkHttpServiceAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Se já verificamos recentemente, usar cache
  if (httpServiceAvailable !== null && (now - httpServiceCheckTime) < HTTP_SERVICE_CHECK_INTERVAL) {
    return httpServiceAvailable;
  }

  // Verificar disponibilidade
  httpServiceAvailable = await redisHttp.isServiceAvailable();
  httpServiceCheckTime = now;

  if (httpServiceAvailable) {
    console.log('[Redis] Serviço HTTP disponível, usando para cache');
  } else {
    console.log('[Redis] Serviço HTTP indisponível, usando conexão direta');
  }

  return httpServiceAvailable;
}

/**
 * Obtém um valor do cache (tenta HTTP primeiro, fallback para direto)
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // Tentar usar serviço HTTP primeiro (sem verificar disponibilidade para evitar latência extra)
  // O próprio getCache do HTTP já tem timeout de 5s, então se falhar, fazemos fallback
  if (redisHttp.isServiceConfigured()) {
    try {
      const result = await redisHttp.getCache<T>(key);
      // Se retornou um valor (não null), retornar
      if (result !== null) {
        return result;
      }
      // Se retornou null, pode ser cache miss legítimo ou erro
      // Verificar se o serviço ainda está disponível (com cache de 60s)
      const stillAvailable = await checkHttpServiceAvailable();
      if (stillAvailable) {
        // Serviço disponível e retornou null = cache miss legítimo
        return null;
      } else {
        // Serviço ficou indisponível, fazer fallback
        console.log('[Redis] Serviço HTTP ficou indisponível, fazendo fallback para conexão direta');
      }
    } catch (error) {
      console.warn('[Redis] Erro ao usar serviço HTTP, fazendo fallback:', error);
      httpServiceAvailable = false; // Marcar como indisponível
    }
  }

  // Fallback para conexão direta
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Cliente não disponível, retornando null');
    return null;
  }

  try {
    // Se o cliente está em estado 'wait' ou 'connecting', tentar conectar
    if (client.status === 'wait' || client.status === 'end') {
      try {
        console.log(`[Redis] Cliente em estado ${client.status}, tentando conectar...`);
        await client.connect();
      } catch (connectError: any) {
        // Se falhar ao conectar, retornar null silenciosamente
        if (connectError.code === 'ETIMEDOUT' || connectError.code === 'ECONNREFUSED') {
          console.warn(`[Redis] Não foi possível conectar (${connectError.code}), retornando null`);
          return null;
        }
        throw connectError;
      }
    }

    // Aguardar até que o cliente esteja pronto (com timeout)
    const readyStatuses = ['ready', 'connect', 'connecting'];
    if (!readyStatuses.includes(client.status)) {
      // Aguardar até 2 segundos para o cliente ficar pronto
      const maxWait = 2000;
      const startWait = Date.now();
      while (!readyStatuses.includes(client.status) && (Date.now() - startWait) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!readyStatuses.includes(client.status)) {
        console.warn(`[Redis] Cliente não ficou pronto a tempo (status: ${client.status}), retornando null`);
        return null;
      }
    }

    const fullKey = `${CACHE_PREFIX}${key}`;
    const start = Date.now();
    
    // Usar timeout para evitar espera infinita
    const value = await Promise.race([
      client.get(fullKey),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5s timeout
    ]);
    
    const duration = Date.now() - start;

    if (value) {
      console.log(`[Redis] Cache HIT para "${key}" (${duration}ms)`);
      return JSON.parse(value) as T;
    } else {
      console.log(`[Redis] Cache MISS para "${key}" (${duration}ms)`);
      return null;
    }
  } catch (error: any) {
    // Não logar erro se for timeout ou conexão - já foi logado antes
    if (error.code !== 'ETIMEDOUT' && error.code !== 'ECONNREFUSED' && !error.message?.includes('MaxRetriesPerRequest')) {
      console.error(`[Redis] Erro ao obter cache para "${key}":`, error);
    }
    return null;
  }
}

/**
 * Define um valor no cache (tenta HTTP primeiro, fallback para direto)
 */
export async function setCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<boolean> {
  // Tentar usar serviço HTTP primeiro
  const useHttp = await checkHttpServiceAvailable();
  if (useHttp) {
    try {
      const result = await redisHttp.setCache<T>(key, value, ttl);
      if (result) {
        return true;
      }
      // Se falhou mas serviço estava disponível, pode ser erro temporário
      // Verificar novamente e fazer fallback se necessário
      if (!(await checkHttpServiceAvailable())) {
        console.log('[Redis] Serviço HTTP ficou indisponível, fazendo fallback para conexão direta');
      } else {
        return false; // Erro real
      }
    } catch (error) {
      console.warn('[Redis] Erro ao usar serviço HTTP, fazendo fallback:', error);
      httpServiceAvailable = false; // Marcar como indisponível
    }
  }

  // Fallback para conexão direta
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Cliente não disponível, não foi possível salvar cache');
    return false;
  }

  try {
    // Se o cliente está em estado 'wait' ou 'connecting', tentar conectar
    if (client.status === 'wait' || client.status === 'end') {
      try {
        console.log(`[Redis] Cliente em estado ${client.status}, tentando conectar...`);
        await client.connect();
      } catch (connectError: any) {
        // Se falhar ao conectar, retornar false silenciosamente
        if (connectError.code === 'ETIMEDOUT' || connectError.code === 'ECONNREFUSED') {
          console.warn(`[Redis] Não foi possível conectar (${connectError.code}), não foi possível salvar cache`);
          return false;
        }
        throw connectError;
      }
    }

    // Aguardar até que o cliente esteja pronto (com timeout)
    const readyStatuses = ['ready', 'connect', 'connecting'];
    if (!readyStatuses.includes(client.status)) {
      // Aguardar até 2 segundos para o cliente ficar pronto
      const maxWait = 2000;
      const startWait = Date.now();
      while (!readyStatuses.includes(client.status) && (Date.now() - startWait) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!readyStatuses.includes(client.status)) {
        console.warn(`[Redis] Cliente não ficou pronto a tempo (status: ${client.status}), não foi possível salvar cache`);
        return false;
      }
    }

    const fullKey = `${CACHE_PREFIX}${key}`;
    const serialized = JSON.stringify(value);
    const start = Date.now();
    
    // Usar timeout para evitar espera infinita
    await Promise.race([
      client.setex(fullKey, ttl, serialized),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5s timeout
    ]);
    
    const duration = Date.now() - start;
    const ttlInfo = ttl > 0 ? `${ttl}s` : 'sem expiração';
    console.log(`[Redis] Cache SET para "${key}" (TTL: ${ttlInfo}, ${duration}ms)`);
    return true;
  } catch (error: any) {
    // Não logar erro se for timeout ou conexão - já foi logado antes
    if (error.code !== 'ETIMEDOUT' && error.code !== 'ECONNREFUSED' && !error.message?.includes('Timeout')) {
      console.error(`[Redis] Erro ao definir cache para "${key}":`, error);
    }
    return false;
  }
}

/**
 * Remove uma chave do cache (tenta HTTP primeiro, fallback para direto)
 */
export async function deleteCache(key: string): Promise<boolean> {
  // Tentar usar serviço HTTP primeiro
  const useHttp = await checkHttpServiceAvailable();
  if (useHttp) {
    try {
      const result = await redisHttp.deleteCache(key);
      return result;
    } catch (error) {
      console.warn('[Redis] Erro ao usar serviço HTTP, fazendo fallback:', error);
      httpServiceAvailable = false; // Marcar como indisponível
    }
  }

  // Fallback para conexão direta
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Cliente não disponível, não foi possível deletar cache');
    return false;
  }

  try {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const start = Date.now();
    const result = await client.del(fullKey);
    const duration = Date.now() - start;
    console.log(`[Redis] Cache DELETE para "${key}" (${result > 0 ? 'deletado' : 'não encontrado'}, ${duration}ms)`);
    return result > 0;
  } catch (error) {
    console.error(`[Redis] Erro ao deletar cache para "${key}":`, error);
    return false;
  }
}

/**
 * Remove múltiplas chaves do cache usando padrão
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Cliente não disponível, não foi possível deletar cache por padrão');
    return 0;
  }

  try {
    const fullPattern = `${CACHE_PREFIX}${pattern}`;
    const start = Date.now();
    const keys = await client.keys(fullPattern);
    
    if (keys.length === 0) {
      console.log(`[Redis] Nenhuma chave encontrada para o padrão "${pattern}"`);
      return 0;
    }

    const result = await client.del(...keys);
    const duration = Date.now() - start;
    console.log(`[Redis] Cache DELETE PATTERN para "${pattern}" (${result} chave(s) deletada(s), ${duration}ms)`);
    return result;
  } catch (error) {
    console.error(`[Redis] Erro ao deletar cache por padrão "${pattern}":`, error);
    return 0;
  }
}

/**
 * Fecha a conexão Redis (útil para testes ou shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Conexão fechada');
  }
}

