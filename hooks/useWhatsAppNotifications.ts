'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showMessageNotification } from '@/components/ui/toast';
import { getGradientStyle } from '@/lib/utils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface NotificationState {
  permission: NotificationPermission;
  lastMessageTimestamp: number;
}

/**
 * Hook para mostrar notificações quando chegam novas mensagens
 * Funciona em todas as telas do sistema
 */
export function useWhatsAppNotifications() {
  console.log('[useWhatsAppNotifications] Hook chamado');
  
  const { companyId, user, themePreference, customColor, customColor2 } = useAuth();
  console.log('[useWhatsAppNotifications] Auth context:', { companyId, hasUser: !!user });
  
  const notificationStateRef = useRef<NotificationState>({
    permission: 'default',
    lastMessageTimestamp: Date.now(),
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Cache de fotos dos contatos
  const [contactsPhotos, setContactsPhotos] = useState<Record<string, { profilePicUrl?: string; pushName?: string }>>({});
  const photosLoadedRef = useRef(false);
  
  // Carregar fotos dos contatos uma única vez
  useEffect(() => {
    if (!companyId || photosLoadedRef.current) return;
    
    const loadContactsPhotos = async () => {
      try {
        photosLoadedRef.current = true;
        const getWhatsAppContactsPhotosFn = httpsCallable(functions, 'getWhatsAppContactsPhotos');
        const result = await getWhatsAppContactsPhotosFn({ companyId });
        
        const data = result.data as { success: boolean; contacts: Record<string, { profilePicUrl?: string; pushName?: string }> };
        
        if (data.success && data.contacts) {
          setContactsPhotos(data.contacts);
          console.log('[Notifications] ✅ Fotos de contatos carregadas:', Object.keys(data.contacts).length, 'contatos');
        }
      } catch (error) {
        console.error('[Notifications] Erro ao carregar fotos de contatos:', error);
        // Continuar sem fotos
      }
    };
    
    loadContactsPhotos();
  }, [companyId]);

  // Solicitar permissão de notificações ao montar
  useEffect(() => {
    console.log('[Notifications] Hook montado, verificando suporte e permissão...');
    console.log('[Notifications] Notification API disponível?', 'Notification' in window);
    
    if ('Notification' in window) {
      console.log('[Notifications] Permissão atual:', Notification.permission);
      if (Notification.permission === 'default') {
        console.log('[Notifications] Solicitando permissão...');
        Notification.requestPermission().then((permission) => {
          notificationStateRef.current.permission = permission;
          console.log('[Notifications] ✅ Permissão de notificações:', permission);
        }).catch((error) => {
          console.error('[Notifications] ❌ Erro ao solicitar permissão:', error);
        });
      } else {
        notificationStateRef.current.permission = Notification.permission;
        console.log('[Notifications] Permissão já definida:', Notification.permission);
      }
    } else {
      console.warn('[Notifications] ⚠️ API de Notificações não disponível no navegador');
    }
  }, []);

  // Escutar novas mensagens
  useEffect(() => {
    console.log('[Notifications] useEffect executado:', { companyId, user: !!user });
    
    if (!companyId || !user) {
      console.log('[Notifications] ⏭️ Pulando: companyId ou user não disponível', { companyId, hasUser: !!user });
      // Limpar listener se não houver companyId ou user
      if (unsubscribeRef.current) {
        console.log('[Notifications] Limpando listener anterior...');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Verificar permissão (apenas para log, não bloqueia mais porque usamos notificação interna)
    const hasNotificationAPI = 'Notification' in window;
    const permission = hasNotificationAPI ? Notification.permission : 'not-supported';
    console.log('[Notifications] Verificando permissão:', { hasNotificationAPI, permission });
    
    if (hasNotificationAPI && Notification.permission === 'granted') {
      console.log('[Notifications] ✅ Permissão nativa concedida - notificações nativas também serão exibidas');
    } else if (hasNotificationAPI && Notification.permission === 'denied') {
      console.log('[Notifications] ℹ️ Permissão nativa negada - apenas notificações internas serão exibidas');
    } else {
      console.log('[Notifications] ℹ️ Usando apenas notificações internas (toast)');
    }
    
    console.log('[Notifications] ✅ Configurando listener para notificações internas...');
    console.log('[Notifications] Collection path:', `companies/${companyId}/whatsappMessages`);

    // Query para buscar as mensagens mais recentes (apenas inbound)
    // Vamos buscar apenas as últimas 10 para detectar novas mensagens
    let messagesQuery;
    try {
      messagesQuery = query(
        collection(db, `companies/${companyId}/whatsappMessages`),
        where('direction', '==', 'inbound'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      console.log('[Notifications] ✅ Query criada com sucesso');
    } catch (error) {
      console.error('[Notifications] ❌ Erro ao criar query:', error);
      return;
    }

    // Flag para identificar se é o primeiro snapshot (carregamento inicial)
    let isFirstSnapshot = true;

    // Escutar mudanças em tempo real
    console.log('[Notifications] 📡 Configurando onSnapshot...');
    console.log('[Notifications] Query que será usada:', {
      collection: `companies/${companyId}/whatsappMessages`,
      filters: ['direction == inbound'],
      orderBy: 'createdAt desc',
      limit: 10,
    });
    
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const now = Date.now();
        const state = notificationStateRef.current;

        console.log('[Notifications] 📨 Snapshot recebido:', {
          isFirstSnapshot,
          totalDocs: snapshot.docs.length,
          changesCount: snapshot.docChanges().length,
          metadata: snapshot.metadata,
        });

        // No primeiro snapshot, inicializar lastMessageTimestamp com a mensagem mais recente
        if (isFirstSnapshot) {
          console.log('[Notifications] 🔄 Primeiro snapshot - inicializando...');
          if (snapshot.docs.length > 0) {
            const firstDoc = snapshot.docs[0];
            const firstData = firstDoc.data();
            const firstTimestamp = firstData.messageTimestamp || firstData.createdAt;
            
            let firstTime = 0;
            if (firstTimestamp instanceof Timestamp) {
              firstTime = firstTimestamp.toMillis();
            } else if (firstTimestamp instanceof Date) {
              firstTime = firstTimestamp.getTime();
            } else {
              firstTime = now;
            }
            
            state.lastMessageTimestamp = firstTime;
            console.log('[Notifications] ✅ Listener inicializado, última mensagem conhecida:', {
              timestamp: firstTime,
              date: new Date(firstTime).toISOString(),
            });
          } else {
            console.log('[Notifications] ℹ️ Nenhuma mensagem encontrada no primeiro snapshot');
          }
          isFirstSnapshot = false;
          return; // Não mostrar notificações no primeiro snapshot
        }

        const changes = snapshot.docChanges();
        console.log('[Notifications] 📋 Mudanças no snapshot:', changes.length);
        
        changes.forEach((change, index) => {
          console.log(`[Notifications] Mudança ${index + 1}/${changes.length}:`, {
            type: change.type,
            docId: change.doc.id,
          });

          // Só processar documentos adicionados (novas mensagens)
          if (change.type !== 'added') {
            console.log(`[Notifications] ⏭️ Pulando mudança do tipo "${change.type}"`);
            return;
          }

          const data = change.doc.data();
          const messageTimestamp = data.messageTimestamp || data.createdAt;
          
          console.log('[Notifications] 📝 Dados da mensagem:', {
            chat_id: data.chat_id,
            direction: data.direction,
            hasMessageTimestamp: !!data.messageTimestamp,
            hasCreatedAt: !!data.createdAt,
          });
          
          // Converter messageTimestamp para timestamp (milliseconds)
          let messageTime = 0;
          if (messageTimestamp instanceof Timestamp) {
            messageTime = messageTimestamp.toMillis();
          } else if (messageTimestamp instanceof Date) {
            messageTime = messageTimestamp.getTime();
          } else {
            // Se não conseguir converter, usar timestamp atual menos um pouco
            messageTime = now - 1000;
            console.warn('[Notifications] ⚠️ Não foi possível converter timestamp, usando now-1000');
          }

          console.log('[Notifications] ⏰ Comparando timestamps:', {
            messageTime,
            messageTimeDate: new Date(messageTime).toISOString(),
            lastMessageTimestamp: state.lastMessageTimestamp,
            lastMessageTimestampDate: new Date(state.lastMessageTimestamp).toISOString(),
            isNewer: messageTime > state.lastMessageTimestamp,
          });

          // Só mostrar notificação se a mensagem for mais recente que a última que vimos
          if (messageTime > state.lastMessageTimestamp) {
            console.log('[Notifications] ✅ Nova mensagem detectada! Preparando notificação...');
            
            // Atualizar timestamp da última mensagem processada
            state.lastMessageTimestamp = Math.max(state.lastMessageTimestamp, messageTime);

            // Extrair informações da mensagem
            const chatId = data.chat_id || '';
            const messageText = data.message?.text?.body || 
                              data.message?.body || 
                              data.message?.conversation || 
                              'Nova mensagem';
            
            console.log('[Notifications] 📄 Texto da mensagem:', {
              originalLength: messageText.length,
              preview: messageText.substring(0, 50),
            });
            
            // Limitar tamanho do texto da notificação
            const truncatedText = messageText.length > 100 
              ? messageText.substring(0, 100) + '...' 
              : messageText;

            // Buscar nome e foto do contato
            const getContactInfo = async (): Promise<{ name: string; photo?: string }> => {
              let contactName = '';
              let contactPhoto: string | undefined;
              
              try {
                const contactRef = doc(db, `companies/${companyId}/whatsappContacts`, chatId);
                const contactDoc = await getDoc(contactRef);
                
                if (contactDoc.exists()) {
                  const contactData = contactDoc.data();
                  // Prioridade: name > patientName > pushName > profile_name > telefone formatado
                  contactName = contactData.name || 
                                contactData.patientName || 
                                contactData.pushName || 
                                contactData.profile_name;
                  
                  if (!contactName || contactName === chatId) {
                    contactName = '';
                  }
                  
                  // Buscar foto no cache
                  const normalizedWaId = chatId.replace(/\D/g, '');
                  const remoteJid = contactData.remoteJid;
                  
                  // Tentar diferentes variações do ID
                  const variations = new Set<string>();
                  if (remoteJid) variations.add(remoteJid);
                  variations.add(normalizedWaId);
                  variations.add(`${normalizedWaId}@s.whatsapp.net`);
                  variations.add(`${normalizedWaId}@c.us`);
                  variations.add(`${normalizedWaId}@lid`);
                  
                  if (normalizedWaId.startsWith('55')) {
                    const without55 = normalizedWaId.slice(2);
                    variations.add(without55);
                    variations.add(`${without55}@s.whatsapp.net`);
                    variations.add(`${without55}@c.us`);
                    variations.add(`${without55}@lid`);
                  } else {
                    const with55 = `55${normalizedWaId}`;
                    variations.add(with55);
                    variations.add(`${with55}@s.whatsapp.net`);
                    variations.add(`${with55}@c.us`);
                    variations.add(`${with55}@lid`);
                  }
                  
                  // Buscar foto no cache
                  for (const variant of Array.from(variations)) {
                    const photoData = contactsPhotos[variant];
                    if (photoData?.profilePicUrl) {
                      contactPhoto = photoData.profilePicUrl;
                      break;
                    }
                  }
                }
              } catch (error) {
                console.error('[Notifications] Erro ao buscar informações do contato:', error);
              }
              
              // Fallback: formatar número de telefone se não encontrou nome
              if (!contactName) {
                const phoneNumber = chatId.replace(/\D/g, '');
                if (phoneNumber.length === 13 && phoneNumber.startsWith('55')) {
                  contactName = `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(2, 4)}) ${phoneNumber.slice(4, 9)}-${phoneNumber.slice(9)}`;
                } else {
                  contactName = chatId;
                }
              }
              
              return { name: contactName, photo: contactPhoto };
            };

            // Buscar informações do contato e mostrar notificação
            getContactInfo().then((contactInfo) => {
              console.log('[Notifications] 📞 Informações do contato:', {
                name: contactInfo.name,
                hasPhoto: !!contactInfo.photo,
              });

              // Obter cores do tema usando getGradientStyle
              let notificationBg = '#3B82F6'; // Azul padrão
              let notificationPrimary = '#3B82F6';
              
              if (themePreference === 'custom' && customColor) {
                // Tema customizado: usar gradiente
                const gradientStyle = getGradientStyle('custom', customColor, '135deg', customColor2);
                if (gradientStyle) {
                  notificationBg = gradientStyle.background;
                }
                notificationPrimary = customColor;
              } else if (themePreference === 'vibrant') {
                // Tema vibrante: gradiente padrão
                const gradientStyle = getGradientStyle('vibrant');
                if (gradientStyle) {
                  notificationBg = gradientStyle.background;
                }
                notificationPrimary = '#6366f1';
              } else {
                // Tema neutro: usar cor neutra (slate) para manter o tema consistente
                notificationBg = '#475569'; // slate-600 (neutro, elegante)
                notificationPrimary = '#475569';
              }

              // Mostrar notificação interna (toast) - sempre funciona
              try {
                console.log('[Notifications] 🔔 Mostrando notificação interna (toast)...');
                showMessageNotification(contactInfo.name, truncatedText, 8000, {
                  background: notificationBg,
                  primaryColor: notificationPrimary,
                  contactPhoto: contactInfo.photo,
                });
                console.log('[Notifications] ✅ Notificação interna exibida!');
              } catch (error) {
                console.error('[Notifications] ❌ Erro ao exibir notificação interna:', error);
              }

              // Tentar mostrar notificação nativa do navegador (se tiver permissão)
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  console.log('[Notifications] 🔔 Criando notificação nativa...');
                  const notification = new Notification('Nova mensagem', {
                    body: `${contactInfo.name}: ${truncatedText}`,
                    icon: contactInfo.photo || '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: `message-${chatId}-${messageTime}`,
                    requireInteraction: false,
                    silent: false,
                  });

                  console.log('[Notifications] ✅ Notificação nativa criada com sucesso!');

                  // Fechar notificação após 8 segundos (mesmo tempo do toast)
                  setTimeout(() => {
                    notification.close();
                    console.log('[Notifications] 🔒 Notificação nativa fechada automaticamente');
                  }, 8000);
                } catch (error) {
                  console.error('[Notifications] ❌ Erro ao exibir notificação nativa:', error);
                }
              } else {
                console.log('[Notifications] ℹ️ Notificação nativa não disponível (permissão:', Notification.permission, ')');
              }
            }).catch((error) => {
              console.error('[Notifications] ❌ Erro ao buscar nome do contato:', error);
              // Fallback: usar número formatado
              const phoneNumber = chatId.replace(/\D/g, '');
              const formattedPhone = phoneNumber.length === 13 && phoneNumber.startsWith('55')
                ? `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(2, 4)}) ${phoneNumber.slice(4, 9)}-${phoneNumber.slice(9)}`
                : chatId;
              
              // Obter cores do tema para fallback também
              let notificationBg = '#3B82F6';
              let notificationPrimary = '#3B82F6';
              
              if (themePreference === 'custom' && customColor) {
                const gradientStyle = getGradientStyle('custom', customColor, '135deg', customColor2);
                if (gradientStyle) {
                  notificationBg = gradientStyle.background;
                }
                notificationPrimary = customColor;
              } else if (themePreference === 'vibrant') {
                const gradientStyle = getGradientStyle('vibrant');
                if (gradientStyle) {
                  notificationBg = gradientStyle.background;
                }
                notificationPrimary = '#6366f1';
              }
              
              try {
                showMessageNotification(formattedPhone, truncatedText, 8000, {
                  background: notificationBg,
                  primaryColor: notificationPrimary,
                });
                
                // Tentar mostrar notificação nativa também com fallback
                if ('Notification' in window && Notification.permission === 'granted') {
                  const notification = new Notification('Nova mensagem', {
                    body: `${formattedPhone}: ${truncatedText}`,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: `message-${chatId}-${messageTime}`,
                    requireInteraction: false,
                    silent: false,
                  });
                  
                  setTimeout(() => {
                    notification.close();
                  }, 8000);
                }
              } catch (error) {
                console.error('[Notifications] ❌ Erro ao exibir notificação de fallback:', error);
              }
            });
          } else {
            console.log('[Notifications] ⏭️ Mensagem não é mais recente, ignorando');
          }
        });
      },
      (error) => {
        console.error('[Notifications] ❌ Erro no listener de mensagens:', error);
        console.error('[Notifications] Detalhes do erro:', {
          name: error?.name,
          message: error?.message,
          code: (error as any)?.code,
          stack: error?.stack,
        });
      }
    );

    unsubscribeRef.current = unsubscribe;
    console.log('[Notifications] ✅ Listener configurado e ativo');

    // Cleanup: remover listener ao desmontar ou quando companyId/user mudar
    return () => {
      console.log('[Notifications] 🧹 Limpando listener...');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        console.log('[Notifications] ✅ Listener removido');
      }
    };
  }, [companyId, user, themePreference, customColor, customColor2, contactsPhotos]);

  // Não retorna nada, apenas escuta e mostra notificações
  return null;
}
