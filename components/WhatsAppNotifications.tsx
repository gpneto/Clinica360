'use client';

import { useEffect } from 'react';
import { useWhatsAppNotifications } from '@/hooks/useWhatsAppNotifications';

/**
 * Componente que escuta novas mensagens e exibe notificações
 * Deve ser usado no layout principal para funcionar em todas as telas
 */
export function WhatsAppNotifications() {
  useEffect(() => {
    console.log('[WhatsAppNotifications] Componente montado');
  }, []);

  useWhatsAppNotifications();
  
  return null; // Componente não renderiza nada, apenas escuta eventos
}
