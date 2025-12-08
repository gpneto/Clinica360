import { useState, useEffect, useRef } from 'react';

export function useOrcamentosState(orcamentos: any[]) {
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null);
  const [expandedOrcamentos, setExpandedOrcamentos] = useState<Set<string>>(new Set());
  const hasInitializedExpanded = useRef(false);

  // Expandir todos os orçamentos por padrão quando a lista é carregada pela primeira vez
  useEffect(() => {
    if (orcamentos.length > 0 && !hasInitializedExpanded.current) {
      setExpandedOrcamentos(new Set(orcamentos.map(o => o.id)));
      hasInitializedExpanded.current = true;
    }
  }, [orcamentos]);

  const toggleExpand = (id: string) => {
    setExpandedOrcamentos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return {
    selectedOrcamentoId,
    setSelectedOrcamentoId,
    expandedOrcamentos,
    toggleExpand,
  };
}

