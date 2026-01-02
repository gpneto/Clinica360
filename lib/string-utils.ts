/**
 * Utilitários para normalização e cache de strings
 * Otimiza operações repetitivas de normalização de strings para filtros
 */

// Cache simples para strings normalizadas
const normalizationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10000; // Máximo de entradas no cache

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas
 * Usa cache para evitar reprocessamento da mesma string
 */
export function normalizeString(value: string): string {
  if (!value) return '';
  
  // Verificar cache primeiro
  const cached = normalizationCache.get(value);
  if (cached !== undefined) {
    return cached;
  }

  // Normalizar: remover acentos e converter para minúsculas
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Limitar tamanho do cache
  if (normalizationCache.size >= MAX_CACHE_SIZE) {
    // Remover a entrada mais antiga (Map mantém ordem de inserção)
    const firstKey = normalizationCache.keys().next().value;
    normalizationCache.delete(firstKey);
  }

  // Armazenar no cache
  normalizationCache.set(value, normalized);
  return normalized;
}

/**
 * Limpa o cache de normalização
 * Útil para liberar memória quando necessário
 */
export function clearNormalizationCache(): void {
  normalizationCache.clear();
}

/**
 * Obtém estatísticas do cache
 */
export function getNormalizationCacheStats(): { size: number; maxSize: number } {
  return {
    size: normalizationCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

