'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  where,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AIMetric {
  id: string;
  companyId: string;
  userId?: string;
  functionName: string;
  processingTimeMs: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: {
    inputUSD: number;
    outputUSD: number;
    totalUSD: number;
  };
  success: boolean;
  error?: string | null;
  model: string;
  createdAt: Date | Timestamp;
}

export interface AIMetricsDaily {
  id: string;
  companyId: string;
  date: string;
  totalCalls: number;
  totalCost: number;
  totalTokens: number;
  lastUpdated: Date | Timestamp;
  [functionName: string]: any; // Para contadores dinâmicos por função
}

export interface AIUsageLog {
  id: string;
  companyId: string;
  userId?: string;
  userMessage: string;
  assistantResponse?: string | null;
  processingTimeMs: number;
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  };
  cost: {
    inputUSD: number;
    outputUSD: number;
    totalUSD: number;
  };
  functionCalls?: Array<{
    name: string;
    success: boolean;
    hasError: boolean;
  }>;
  model: string;
  error?: string | null;
  errorType?: string | null;
  createdAt: Date | Timestamp;
}

export interface AIMetricsStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalCost: number;
  totalTokens: number;
  averageProcessingTime: number;
  callsByFunction: Record<string, number>;
  callsByCompany: Record<string, number>;
}

export function useAIMetrics(limitCount: number = 100) {
  const [metrics, setMetrics] = useState<AIMetric[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<AIMetricsDaily[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AIMetricsStats | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    const loadAllMetrics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Carregar aiMetrics
        const metricsQuery = query(
          collection(db, 'aiMetrics'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        const metricsSnapshot = await getDocs(metricsQuery);
        
        const metricsData: AIMetric[] = metricsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyId: data.companyId || '',
            userId: data.userId || undefined,
            functionName: data.functionName || '',
            processingTimeMs: data.processingTimeMs || 0,
            tokens: data.tokens || { prompt: 0, completion: 0, total: 0 },
            cost: data.cost || { inputUSD: 0, outputUSD: 0, totalUSD: 0 },
            success: data.success !== false,
            error: data.error || null,
            model: data.model || '',
            createdAt: data.createdAt || new Date(),
          };
        });

        setMetrics(metricsData);
        setHasMore(metricsSnapshot.docs.length === limitCount);
        
        if (metricsSnapshot.docs.length > 0) {
          setLastDoc(metricsSnapshot.docs[metricsSnapshot.docs.length - 1]);
        }

        // Carregar aiMetricsDaily
        const dailyQuery = query(
          collection(db, 'aiMetricsDaily'),
          orderBy('date', 'desc'),
          limit(30) // Últimos 30 dias
        );

        const dailySnapshot = await getDocs(dailyQuery);
        
        const dailyData: AIMetricsDaily[] = dailySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyId: data.companyId || '',
            date: data.date || '',
            totalCalls: data.totalCalls || 0,
            totalCost: data.totalCost || 0,
            totalTokens: data.totalTokens || 0,
            lastUpdated: data.lastUpdated || new Date(),
            ...data, // Incluir todos os campos dinâmicos (contadores por função)
          };
        });

        setDailyMetrics(dailyData);

        // Carregar aiUsageLogs
        const logsQuery = query(
          collection(db, 'aiUsageLogs'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        const logsSnapshot = await getDocs(logsQuery);
        
        const logsData: AIUsageLog[] = logsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyId: data.companyId || '',
            userId: data.userId || undefined,
            userMessage: data.userMessage || '',
            assistantResponse: data.assistantResponse || null,
            processingTimeMs: data.processingTimeMs || 0,
            tokens: data.tokens || { total: 0, prompt: 0, completion: 0 },
            cost: data.cost || { inputUSD: 0, outputUSD: 0, totalUSD: 0 },
            functionCalls: data.functionCalls || [],
            model: data.model || '',
            error: data.error || null,
            errorType: data.errorType || null,
            createdAt: data.createdAt || new Date(),
          };
        });

        setUsageLogs(logsData);

        // Calcular estatísticas agregadas
        const calculatedStats: AIMetricsStats = {
          totalCalls: metricsData.length,
          successfulCalls: metricsData.filter(m => m.success).length,
          failedCalls: metricsData.filter(m => !m.success).length,
          totalCost: metricsData.reduce((sum, m) => sum + (m.cost?.totalUSD || 0), 0),
          totalTokens: metricsData.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
          averageProcessingTime: metricsData.length > 0
            ? metricsData.reduce((sum, m) => sum + m.processingTimeMs, 0) / metricsData.length
            : 0,
          callsByFunction: metricsData.reduce((acc, m) => {
            acc[m.functionName] = (acc[m.functionName] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          callsByCompany: metricsData.reduce((acc, m) => {
            acc[m.companyId] = (acc[m.companyId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };

        setStats(calculatedStats);
      } catch (err: any) {
        console.error('Erro ao carregar métricas de IA:', err);
        setError(err.message || 'Erro ao carregar métricas');
      } finally {
        setLoading(false);
      }
    };

    loadAllMetrics();
  }, [limitCount]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;

    try {
      const q = query(
        collection(db, 'aiMetrics'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      const newData: AIMetric[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          companyId: data.companyId || '',
          userId: data.userId || undefined,
          functionName: data.functionName || '',
          processingTimeMs: data.processingTimeMs || 0,
          tokens: data.tokens || { prompt: 0, completion: 0, total: 0 },
          cost: data.cost || { promptUSD: 0, completionUSD: 0, totalUSD: 0 },
          success: data.success !== false,
          error: data.error || null,
          model: data.model || '',
          createdAt: data.createdAt || new Date(),
        };
      });

      setMetrics(prev => [...prev, ...newData]);
      setHasMore(snapshot.docs.length === limitCount);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar mais métricas:', err);
      setError(err.message || 'Erro ao carregar mais métricas');
    }
  };

  return {
    metrics,
    dailyMetrics,
    usageLogs,
    stats,
    loading,
    error,
    hasMore,
    loadMore,
  };
}

