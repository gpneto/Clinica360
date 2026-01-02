/**
 * Redis Cache HTTP Client
 * Usa o serviço intermediário Redis Cache Service para operações de cache
 * Isso evita a latência de conexão direta ao Redis
 */

/**
 * Obtém a URL do serviço Redis Cache
 * Tenta: 1) REDIS_SERVICE_URL, 2) construir a partir de evolution-api-url
 */
function getRedisServiceUrl(): string {
  // Tentar variável de ambiente direta primeiro
  if (process.env.REDIS_SERVICE_URL) {
    return process.env.REDIS_SERVICE_URL;
  }

  // Tentar obter do secret evolution-api-url e extrair o host
  const env = process.env as any;
  const evolutionApiUrl = env['evolution-api-url'] || 
                         env.EVOLUTION_API_URL || 
                         process.env.EVOLUTION_API_URL;

  if (evolutionApiUrl) {
    try {
      // Extrair host da URL (pode ser http:// ou https://)
      const url = new URL(evolutionApiUrl);
      // Construir URL do serviço Redis Cache na porta 8081
      // Sempre usar HTTP (não HTTPS) para o serviço interno
      return `http://${url.hostname}:8081`;
    } catch (error) {
      // Se não conseguir fazer parse, retornar vazio
      console.warn(`[Redis HTTP] Erro ao extrair host de evolution-api-url:`, error);
    }
  }

  return '';
}

let REDIS_SERVICE_URL = getRedisServiceUrl();
const REDIS_SERVICE_API_KEY = process.env.REDIS_SERVICE_API_KEY || 'SmartDoctorRedisService2024!Secure';
const REDIS_SERVICE_TIMEOUT = 5000; // 5 segundos de timeout (reduzido para fallback mais rápido)

// Garantir que sempre usa HTTP (não HTTPS)
if (REDIS_SERVICE_URL && REDIS_SERVICE_URL.startsWith('https://')) {
  REDIS_SERVICE_URL = REDIS_SERVICE_URL.replace('https://', 'http://');
  console.log(`[Redis HTTP] URL convertida de HTTPS para HTTP: ${REDIS_SERVICE_URL}`);
}

// Log da URL configurada (apenas uma vez)
if (REDIS_SERVICE_URL) {
  console.log(`[Redis HTTP] Serviço configurado: ${REDIS_SERVICE_URL}`);
} else {
  console.warn('[Redis HTTP] REDIS_SERVICE_URL não configurado - usando fallback direto');
}

/**
 * TTL padrão para cache (5 minutos)
 */
const DEFAULT_TTL = 300; // 5 minutos em segundos

/**
 * Verifica se o serviço está disponível
 */
async function isServiceAvailable(): Promise<boolean> {
  if (!REDIS_SERVICE_URL) {
    console.log('[Redis HTTP] REDIS_SERVICE_URL não configurado');
    return false;
  }

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s para health check

    const response = await fetch(`${REDIS_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { status?: string };
      const isHealthy = data.status === 'healthy';
      console.log(`[Redis HTTP] Health check: ${isHealthy ? 'healthy' : 'unhealthy'} (${duration}ms)`);
      return isHealthy;
    }
    console.warn(`[Redis HTTP] Health check falhou: HTTP ${response.status} (${duration}ms)`);
    return false;
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.warn(`[Redis HTTP] Serviço não disponível: ${error.message}`);
    } else {
      console.warn(`[Redis HTTP] Health check timeout após 5s`);
    }
    return false;
  }
}

/**
 * Obtém um valor do cache via HTTP
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!REDIS_SERVICE_URL) {
    console.warn('[Redis HTTP] REDIS_SERVICE_URL não configurado, retornando null');
    return null;
  }

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REDIS_SERVICE_TIMEOUT);
    const url = `${REDIS_SERVICE_URL}/cache/get`;
    console.log(`[Redis HTTP] GET cache iniciado para "${key}" (URL: ${url}, timeout: ${REDIS_SERVICE_TIMEOUT}ms)`);

    const fetchStart = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': REDIS_SERVICE_API_KEY,
      },
      body: JSON.stringify({ key }),
    });

    clearTimeout(timeoutId);
    const fetchDuration = Date.now() - fetchStart;
    const totalDuration = Date.now() - start;

    console.log(`[Redis HTTP] Resposta recebida para "${key}" (HTTP ${response.status}, fetch: ${fetchDuration}ms, total: ${totalDuration}ms)`);

    if (!response.ok) {
      if (response.status === 503) {
        console.warn(`[Redis HTTP] Serviço indisponível (${response.status})`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const jsonStart = Date.now();
    const data = await response.json() as { found: boolean; value?: T };
    const jsonDuration = Date.now() - jsonStart;

    if (data.found) {
      console.log(`[Redis HTTP] Cache HIT para "${key}" (total: ${totalDuration}ms, fetch: ${fetchDuration}ms, json: ${jsonDuration}ms)`);
      return data.value as T;
    } else {
      console.log(`[Redis HTTP] Cache MISS para "${key}" (total: ${totalDuration}ms, fetch: ${fetchDuration}ms, json: ${jsonDuration}ms)`);
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Redis HTTP] Timeout ao obter cache para "${key}" após ${REDIS_SERVICE_TIMEOUT}ms`);
    } else {
      console.error(`[Redis HTTP] Erro ao obter cache para "${key}":`, error.message || error);
    }
    return null;
  }
}

/**
 * Define um valor no cache via HTTP
 * @param ttl TTL em segundos. Use 0 para cache permanente (sem expiração)
 */
export async function setCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<boolean> {
  if (!REDIS_SERVICE_URL) {
    console.warn('[Redis HTTP] REDIS_SERVICE_URL não configurado, não foi possível salvar cache');
    return false;
  }

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REDIS_SERVICE_TIMEOUT);
    const ttlInfo = ttl > 0 ? `${ttl}s` : 'sem expiração';
    console.log(`[Redis HTTP] SET cache iniciado para "${key}" (TTL: ${ttlInfo}, timeout: ${REDIS_SERVICE_TIMEOUT}ms)`);

    const response = await fetch(`${REDIS_SERVICE_URL}/cache/set`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': REDIS_SERVICE_API_KEY,
      },
      body: JSON.stringify({
        key,
        value: value as any,
        ttl: ttl > 0 ? ttl : undefined, // Se TTL for 0, não enviar (cache permanente)
      }),
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;
    console.log(`[Redis HTTP] SET cache resposta recebida para "${key}" (HTTP ${response.status}, ${duration}ms)`);

    if (!response.ok) {
      if (response.status === 503) {
        console.warn(`[Redis HTTP] Serviço indisponível (${response.status})`);
        return false;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { success?: boolean };
    if (data.success) {
      const ttlInfo = ttl > 0 ? `${ttl}s` : 'sem expiração';
      console.log(`[Redis HTTP] Cache SET para "${key}" (TTL: ${ttlInfo}, ${duration}ms)`);
      return true;
    }
    console.warn(`[Redis HTTP] SET cache retornou success=false para "${key}"`);
    return false;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Redis HTTP] Timeout ao salvar cache para "${key}"`);
    } else {
      console.error(`[Redis HTTP] Erro ao definir cache para "${key}":`, error);
    }
    return false;
  }
}

/**
 * Remove uma chave do cache via HTTP
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!REDIS_SERVICE_URL) {
    console.warn('[Redis HTTP] REDIS_SERVICE_URL não configurado, não foi possível deletar cache');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REDIS_SERVICE_TIMEOUT);

    const start = Date.now();
    const response = await fetch(`${REDIS_SERVICE_URL}/cache/delete`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': REDIS_SERVICE_API_KEY,
      },
      body: JSON.stringify({ key }),
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    if (!response.ok) {
      if (response.status === 503) {
        console.warn(`[Redis HTTP] Serviço indisponível (${response.status})`);
        return false;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { deleted?: boolean };
    console.log(`[Redis HTTP] Cache DELETE para "${key}" (${data.deleted ? 'deletado' : 'não encontrado'}, ${duration}ms)`);
    return data.deleted || false;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Redis HTTP] Timeout ao deletar cache para "${key}"`);
    } else {
      console.error(`[Redis HTTP] Erro ao deletar cache para "${key}":`, error);
    }
    return false;
  }
}

/**
 * Remove múltiplas chaves do cache usando padrão (não suportado via HTTP, retorna 0)
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  console.warn(`[Redis HTTP] deleteCachePattern não suportado via HTTP para padrão "${pattern}"`);
  return 0;
}

/**
 * Verifica se o serviço HTTP está configurado
 */
export function isServiceConfigured(): boolean {
  return !!REDIS_SERVICE_URL;
}

/**
 * Exporta função para verificar disponibilidade do serviço
 */
export { isServiceAvailable };
