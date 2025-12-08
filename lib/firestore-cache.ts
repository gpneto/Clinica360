/**
 * Sistema de Cache em Memória para Firestore
 * 
 * Reduz o consumo de leituras do Firestore armazenando dados em cache
 * com TTL (Time To Live) configurável e invalidação automática.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

interface QueryCacheKey {
  collection: string;
  filters?: Record<string, any>;
  orderBy?: string;
}

class FirestoreCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutos padrão
  private maxCacheSize: number = 1000; // Máximo de entradas no cache

  /**
   * Gera uma chave única para um documento
   */
  private getDocKey(collection: string, docId: string): string {
    return `doc:${collection}:${docId}`;
  }

  /**
   * Gera uma chave única para uma query
   */
  private getQueryKey(collection: string, filters?: Record<string, any>, orderBy?: string): string {
    const filtersStr = filters ? JSON.stringify(filters) : '';
    return `query:${collection}:${filtersStr}:${orderBy || ''}`;
  }

  /**
   * Verifica se uma entrada do cache ainda é válida
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limita o tamanho do cache removendo entradas mais antigas
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Ordenar por timestamp (mais antigas primeiro)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remover as mais antigas até ficar dentro do limite
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Obtém dados do cache para um documento
   */
  getDoc<T>(collection: string, docId: string): T | null {
    this.cleanExpired();
    const key = this.getDocKey(collection, docId);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      return entry.data as T;
    }
    
    return null;
  }

  /**
   * Armazena dados no cache para um documento
   */
  setDoc<T>(collection: string, docId: string, data: T, ttl?: number): void {
    this.cleanExpired();
    const key = this.getDocKey(collection, docId);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    this.enforceMaxSize();
  }

  /**
   * Obtém dados do cache para uma query
   */
  getQuery<T>(collection: string, filters?: Record<string, any>, orderBy?: string): T | null {
    this.cleanExpired();
    const key = this.getQueryKey(collection, filters, orderBy);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      return entry.data as T;
    }
    
    return null;
  }

  /**
   * Armazena dados no cache para uma query
   */
  setQuery<T>(
    collection: string,
    data: T,
    filters?: Record<string, any>,
    orderBy?: string,
    ttl?: number
  ): void {
    this.cleanExpired();
    const key = this.getQueryKey(collection, filters, orderBy);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    this.enforceMaxSize();
  }

  /**
   * Invalida o cache de um documento específico
   */
  invalidateDoc(collection: string, docId: string): void {
    const key = this.getDocKey(collection, docId);
    this.cache.delete(key);
  }

  /**
   * Invalida o cache de uma collection inteira
   * Útil quando há mudanças que podem afetar múltiplas queries
   */
  invalidateCollection(collection: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(`:${collection}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalida o cache de queries que correspondem a um padrão
   */
  invalidateQuery(collection: string, filters?: Record<string, any>): void {
    const keysToDelete: string[] = [];
    const queryKey = this.getQueryKey(collection, filters);
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`query:${collection}:`)) {
        // Se não há filtros específicos, invalidar todas as queries da collection
        if (!filters) {
          keysToDelete.push(key);
        } else if (key.includes(JSON.stringify(filters))) {
          keysToDelete.push(key);
        }
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): { size: number; maxSize: number; entries: number } {
    this.cleanExpired();
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: this.cache.size,
    };
  }

  /**
   * Configura o TTL padrão
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Configura o tamanho máximo do cache
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
    this.enforceMaxSize();
  }
}

// Instância singleton do cache
export const firestoreCache = new FirestoreCache();

// Configurações padrão por tipo de dado
export const CACHE_TTL = {
  // Dados que mudam raramente - cache longo
  COMPANY: 30 * 60 * 1000, // 30 minutos
  COMPANY_SETTINGS: 30 * 60 * 1000, // 30 minutos
  PROFESSIONAL: 10 * 60 * 1000, // 10 minutos
  SERVICE: 10 * 60 * 1000, // 10 minutos
  
  // Dados que mudam com frequência média
  PATIENT: 5 * 60 * 1000, // 5 minutos
  APPOINTMENT: 2 * 60 * 1000, // 2 minutos (agendamentos mudam mais)
  
  // Dados que mudam frequentemente - cache curto
  PATIENT_EVOLUTION: 2 * 60 * 1000, // 2 minutos
  DENTAL_PROCEDURE: 2 * 60 * 1000, // 2 minutos
  DEBIT: 2 * 60 * 1000, // 2 minutos
  
  // Dados que raramente mudam
  COMPANY_USER: 15 * 60 * 1000, // 15 minutos
  USER: 15 * 60 * 1000, // 15 minutos
};

/**
 * Helper para criar uma chave de query a partir de constraints do Firestore
 */
export function createQueryKey(
  collection: string,
  constraints?: Array<{ type: string; field?: string; value?: any }>,
  orderBy?: string
): string {
  const filters: Record<string, any> = {};
  
  if (constraints) {
    for (const constraint of constraints) {
      if (constraint.type === 'where' && constraint.field) {
        filters[constraint.field] = constraint.value;
      }
    }
  }
  
  return firestoreCache['getQueryKey'](collection, Object.keys(filters).length > 0 ? filters : undefined, orderBy);
}

