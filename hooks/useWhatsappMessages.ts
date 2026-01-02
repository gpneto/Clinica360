'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface WhatsAppMessage {
  id: string;
  wam_id?: string;
  message: any;
  chat_id: string;
  direction: 'inbound' | 'outbound';
  createdAt: Date | Timestamp;
  messageTimestamp?: Date | Timestamp;
  companyId?: string;
  read?: boolean;
  readAt?: Date | Timestamp;
  messageSource?: 'automatic' | 'manual';
}

export interface WhatsAppContact {
  id: string;
  wa_id: string;
  profile_name: string;
  name?: string;
  patientName?: string;
  pushName?: string; // PushName da mensagem
  profilePicUrl?: string; // URL da foto do perfil
  remoteJid?: string; // RemoteJid do WhatsApp para buscar foto na API
  last_message_at?: Date | Timestamp;
  lastReadAt?: Date | Timestamp; // Timestamp da última vez que as mensagens foram lidas
  updatedAt?: Date | Timestamp;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  last_message?: {
    wam_id?: string;
    text?: string | null;
    type?: string;
    direction?: 'inbound' | 'outbound';
    fromMe?: boolean;
    timestamp?: Date | Timestamp;
    createdAt?: Date | Timestamp;
    mediaUrl?: string;
    mediaMimetype?: string;
    mediaSize?: number;
  };
  hasAutomaticMessages?: boolean; // Indica se o contato tem mensagens automáticas
}

// Hook para buscar contatos com mensagens
export function useWhatsAppContacts(companyId: string | null | undefined) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Buscar contatos dentro da coleção da empresa
    const contactsQuery = query(
      collection(db, `companies/${companyId}/whatsappContacts`),
      orderBy('last_message_at', 'desc')
    );

    const unsubscribeContacts = onSnapshot(
      contactsQuery,
      async (contactsSnapshot) => {
        try {
          // Preparar contatos básicos (ordenados pelo Firestore)
          const contactsMap = new Map<string, WhatsAppContact>();
          const waIds: string[] = [];

          for (const contactDoc of contactsSnapshot.docs) {
            const contactData = contactDoc.data();
            const waId = contactData.wa_id || contactDoc.id;

            // Usar última mensagem salva diretamente no contato (campo last_message)
            let lastMessage = '';
            let lastMessageDirection: 'inbound' | 'outbound' = 'inbound';
            let lastMessageDate: Date | Timestamp | undefined = contactData.last_message_at;

            // Extrair informações da última mensagem do campo last_message
            if (contactData.last_message) {
              const lastMsg = contactData.last_message;
              lastMessageDirection = lastMsg.direction || 'inbound';
              
              // Priorizar messageTimestamp, senão usar createdAt ou timestamp
              lastMessageDate = lastMsg.messageTimestamp || 
                               lastMsg.timestamp || 
                               lastMsg.createdAt || 
                               contactData.last_message_at;
              
              // Extrair texto da última mensagem
              if (lastMsg.text) {
                lastMessage = lastMsg.text;
              } else if (typeof lastMsg === 'object' && 'message' in lastMsg) {
                // Fallback para estrutura antiga
                const msg = (lastMsg as any).message;
                if (msg?.text?.body) {
                  lastMessage = msg.text.body;
                } else if (msg?.type === 'text' && msg?.body) {
                  lastMessage = msg.body;
                } else if (msg?.body) {
                  lastMessage = msg.body;
                }
              }
            }

            // Só adicionar contato se tiver mensagens ou última mensagem
            if (lastMessage || contactData.last_message_at) {
              waIds.push(waId);
              contactsMap.set(waId, {
                id: contactDoc.id,
                wa_id: waId,
                profile_name: contactData.profile_name || contactData.name || contactData.patientName || contactData.pushName || waId,
                name: contactData.name || contactData.patientName || undefined,
                patientName: contactData.patientName || undefined,
                pushName: contactData.pushName || undefined,
                profilePicUrl: contactData.profilePicUrl || undefined,
                remoteJid: contactData.remoteJid || undefined,
                last_message_at: lastMessageDate || contactData.last_message_at,
                lastReadAt: contactData.lastReadAt || undefined,
                updatedAt: contactData.updatedAt,
                unreadCount: 0, // Será preenchido depois
                lastMessage,
                lastMessageDirection,
                last_message: contactData.last_message || undefined,
                hasAutomaticMessages: false, // Será preenchido depois
              });
            }
          }

          // Buscar todas as mensagens não lidas e automáticas de uma vez (em paralelo)
          const [unreadCounts, automaticMessages] = await Promise.all([
            Promise.all(
              waIds.map(async (waId) => {
                try {
                  const contact = contactsMap.get(waId);
                  const lastReadAt = contact?.lastReadAt;
                  
                  // Buscar todas as mensagens inbound
                  const allInboundQuery = query(
                    collection(db, `companies/${companyId}/whatsappMessages`),
                    where('chat_id', '==', waId),
                    where('direction', '==', 'inbound')
                  );
                  
                  const allInboundSnapshot = await getDocs(allInboundQuery);
                  
                  // Se não tem lastReadAt, todas as mensagens são não lidas
                  if (!lastReadAt) {
                    return { waId, count: allInboundSnapshot.size };
                  }
                  
                  // Converter lastReadAt para timestamp (milliseconds)
                  const lastReadTimestamp = lastReadAt instanceof Timestamp 
                    ? lastReadAt.toMillis() 
                    : lastReadAt instanceof Date 
                      ? lastReadAt.getTime()
                      : 0;
                  
                  // Contar mensagens que foram enviadas depois de lastReadAt
                  let unreadCount = 0;
                  allInboundSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const messageTimestamp = data.messageTimestamp || data.createdAt;
                    
                    // Converter messageTimestamp para timestamp (milliseconds)
                    let messageTime = 0;
                    if (messageTimestamp instanceof Timestamp) {
                      messageTime = messageTimestamp.toMillis();
                    } else if (messageTimestamp instanceof Date) {
                      messageTime = messageTimestamp.getTime();
                    }
                    
                    // Mensagem não lida se foi enviada depois de lastReadAt
                    if (messageTime > lastReadTimestamp) {
                      unreadCount++;
                    }
                  });
                  
                  return { waId, count: unreadCount };
                } catch (error) {
                  console.error(`Erro ao contar mensagens não lidas para ${waId}:`, error);
                  return { waId, count: 0 };
                }
              })
            ),
            Promise.all(
              waIds.map(async (waId) => {
                try {
                  // Query já está isolada pelo caminho companies/${companyId}/whatsappMessages
                  const automaticQuery = query(
                    collection(db, `companies/${companyId}/whatsappMessages`),
                    where('chat_id', '==', waId),
                    where('messageSource', '==', 'automatic'),
                    limit(1)
                  );
                  const automaticSnapshot = await getDocs(automaticQuery);
                  return { waId, has: !automaticSnapshot.empty };
                } catch (error) {
                  return { waId, has: false };
                }
              })
            ),
          ]);

          // Atualizar contatos com contagens e flags
          unreadCounts.forEach(({ waId, count }) => {
            const contact = contactsMap.get(waId);
            if (contact) {
              contact.unreadCount = count;
            }
          });

          automaticMessages.forEach(({ waId, has }) => {
            const contact = contactsMap.get(waId);
            if (contact) {
              contact.hasAutomaticMessages = has;
            }
          });

          // Converter para array mantendo a ordem do Firestore (ordenado por last_message_at)
          const contactsData: WhatsAppContact[] = [];
          for (const contactDoc of contactsSnapshot.docs) {
            const contactData = contactDoc.data();
            const waId = contactData.wa_id || contactDoc.id;
            const contact = contactsMap.get(waId);
            if (contact) {
              contactsData.push(contact);
            }
          }
          
          // Manter a ordem do Firestore (ordenado por last_message_at desc - mais recentes primeiro)
          const finalContacts = contactsData;

          setContacts(finalContacts);
          setLoading(false);
        } catch (err) {
          console.error('Erro ao buscar contatos:', err);
          setError('Erro ao carregar contatos');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Erro no snapshot de contatos:', err);
        setError('Erro ao carregar contatos');
        setLoading(false);
      }
    );

    return () => unsubscribeContacts();
  }, [companyId]);

  return { contacts, loading, error };
}

// Hook para buscar mensagens de um contato específico com paginação
export function useWhatsAppMessages(
  companyId: string | null | undefined,
  chatId: string | null | undefined
) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  // Não iniciar em loading se não houver chatId - só carregar quando contato for selecionado
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const MESSAGES_PER_PAGE = 10;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Cache manual em memória (não usa localStorage)
  const messagesCacheRef = useRef<Map<string, WhatsAppMessage[]>>(new Map());
  
  // Função para obter chave do cache
  const getCacheKey = useCallback((companyId: string, chatId: string) => {
    return `${companyId}_${chatId}`;
  }, []);
  
  // Função para obter mensagens do cache em memória
  const getCachedMessages = useCallback((companyId: string, chatId: string): WhatsAppMessage[] | null => {
    const key = getCacheKey(companyId, chatId);
    return messagesCacheRef.current.get(key) || null;
  }, [getCacheKey]);
  
  // Função para salvar mensagens no cache em memória
  const setCachedMessages = useCallback((companyId: string, chatId: string, messages: WhatsAppMessage[]) => {
    const key = getCacheKey(companyId, chatId);
    // Limitar a 200 mensagens por conversa
    const limitedMessages = messages.slice(-200);
    messagesCacheRef.current.set(key, limitedMessages);
  }, [getCacheKey]);
  
  // Função para limpar cache quando mudar de conversa
  const clearCache = useCallback((companyId: string, chatId: string) => {
    const key = getCacheKey(companyId, chatId);
    messagesCacheRef.current.delete(key);
  }, [getCacheKey]);

  // Função auxiliar para obter timestamp de uma mensagem (prioriza messageTimestamp, senão createdAt)
  const getMessageTimestamp = useCallback((message: WhatsAppMessage | { messageTimestamp?: Date | Timestamp; createdAt?: Date | Timestamp }): number => {
    const timestamp = (message as any).messageTimestamp || (message as any).createdAt;
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    }
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    return 0;
  }, []);

    // Reset quando companyId ou chatId mudar
  useEffect(() => {
    if (!companyId || !chatId) {
      setMessages([]);
      setLoading(false);
      setLastVisible(null);
      setHasMore(true);
      // Limpar listener anterior
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Resetar estado ao mudar de conversa
    setMessages([]);
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
    setError(null);

    // Limpar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Carregar primeiras 10 mensagens (mais recentes) - sempre do Firestore
    loadMessages(true);
  }, [companyId, chatId]);

  const setupRealtimeListener = useCallback(() => {
    if (!companyId || !chatId) return null;

    // Escutar apenas mensagens novas (mais recentes que a última mensagem carregada)
    // Usar um timestamp de referência para pegar apenas mensagens mais novas
    let realtimeQuery;
    try {
      // Limitar a apenas 20 mensagens mais recentes para evitar sobrecarga
      // Query já está isolada pelo caminho companies/${companyId}/whatsappMessages
      realtimeQuery = query(
        collection(db, `companies/${companyId}/whatsappMessages`),
        where('chat_id', '==', chatId),
        orderBy('createdAt', 'desc'),
        limit(20) // Limitar para não sobrecarregar
      );
    } catch (error) {
      // Se não houver índice, não usar listener em tempo real
      console.warn('Não é possível usar listener em tempo real sem índice:', error);
      return null;
    }

    const unsubscribe = onSnapshot(
      realtimeQuery,
      (snapshot) => {
        setMessages((prev) => {
          // Se não há mensagens carregadas ainda, não adicionar nada (aguardar loadMessages)
          if (prev.length === 0) {
            return prev;
          }

          // Como as mensagens estão ordenadas do mais recente para o mais antigo, a primeira é a mais recente
          const newestLoaded = prev[0];
          const newestTime = newestLoaded ? getMessageTimestamp(newestLoaded) : 0;

          const newRealtimeMessages: WhatsAppMessage[] = [];
          // Verificar duplicatas por ID e wam_id
          const existingIds = new Set(prev.map(m => m.id));
          const existingWamIds = new Set(prev.map(m => m.wam_id).filter(id => id));
          
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Evitar duplicatas por ID
            if (existingIds.has(docSnap.id)) {
              return;
            }

            // Evitar duplicatas por wam_id (caso a mesma mensagem tenha IDs diferentes)
            if (data.wam_id && existingWamIds.has(data.wam_id)) {
              console.warn(`[useWhatsAppMessages] Mensagem duplicada detectada (wam_id: ${data.wam_id}), ignorando...`);
              return;
            }

            // Verificar se é uma mensagem nova (mais recente que a última carregada)
            const messageTime = getMessageTimestamp({
              messageTimestamp: data.messageTimestamp,
              createdAt: data.createdAt
            } as any);

            // Adicionar apenas mensagens mais recentes que a última carregada
            if (messageTime > newestTime) {
              // Preservar o estado de leitura: se read não estiver definido, considerar como undefined (não lida)
              const readValue = data.read !== undefined ? data.read : undefined;
              
              newRealtimeMessages.push({
                id: docSnap.id,
                wam_id: data.wam_id,
                message: data.message,
                chat_id: data.chat_id,
                direction: data.direction,
                createdAt: data.createdAt,
                messageTimestamp: data.messageTimestamp,
                companyId: data.companyId,
                read: readValue,
                readAt: data.readAt,
                messageSource: data.messageSource,
              });
            }
          });

          if (newRealtimeMessages.length > 0) {
            console.log('[useWhatsAppMessages] Realtime - novas mensagens recebidas:', newRealtimeMessages.length);
            newRealtimeMessages.forEach((msg, idx) => {
              const time = getMessageTimestamp(msg);
              console.log(`[useWhatsAppMessages] Realtime nova ${idx}: id=${msg.id}, time=${time}`);
            });
            
            // Ordenar e adicionar apenas mensagens novas (mais antigas primeiro)
            newRealtimeMessages.sort((a, b) => {
              const aTime = getMessageTimestamp(a);
              const bTime = getMessageTimestamp(b);
              return aTime - bTime; // Ordenar do mais antigo para o mais recente
            });

            // Adicionar novas mensagens no final (já que são as mais recentes)
            const updatedMessages = [...prev, ...newRealtimeMessages];
            
            // Reordenar todo o array para garantir ordem correta (mais antigas primeiro)
            updatedMessages.sort((a, b) => {
              const aTime = getMessageTimestamp(a);
              const bTime = getMessageTimestamp(b);
              return aTime - bTime; // Ordenar do mais antigo para o mais recente
            });
            
            // Atualizar cache em memória com novas mensagens
            if (companyId && chatId) {
              setCachedMessages(companyId, chatId, updatedMessages);
            }
            
            return updatedMessages;
          }
          
          return prev;
        });
      },
      (err) => {
        console.error('Erro no listener de mensagens em tempo real:', err);
      }
    );

    return unsubscribe;
  }, [companyId, chatId, setCachedMessages, getMessageTimestamp]);

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!companyId || !chatId) return;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Query para buscar mensagens ordenadas por createdAt ascendente (mais antigas primeiro)
      // Mas vamos buscar as mais recentes primeiro e depois inverter, para carregar do final para o início
      let messagesQuery;
      try {
        const baseQuery = query(
          collection(db, `companies/${companyId}/whatsappMessages`),
          where('chat_id', '==', chatId),
          orderBy('createdAt', 'desc'),
          limit(MESSAGES_PER_PAGE)
        );

        if (lastVisible && !isInitial) {
          // Query já está isolada pelo caminho companies/${companyId}/whatsappMessages
          messagesQuery = query(
            collection(db, `companies/${companyId}/whatsappMessages`),
            where('chat_id', '==', chatId),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(MESSAGES_PER_PAGE)
          );
        } else {
          messagesQuery = baseQuery;
        }
      } catch (error) {
        // Se não houver índice, usar query sem orderBy
        console.warn('Índice não encontrado, usando query simples:', error);
        messagesQuery = query(
          collection(db, `companies/${companyId}/whatsappMessages`),
          where('chat_id', '==', chatId),
          limit(MESSAGES_PER_PAGE)
        );
      }

      const snapshot = await getDocs(messagesQuery);

      if (snapshot.empty) {
        setHasMore(false);
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        return;
      }

      const newMessages: WhatsAppMessage[] = [];
      const seenIds = new Set<string>();
      const seenWamIds = new Set<string>();
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Evitar duplicatas dentro do próprio resultado da query
        if (seenIds.has(doc.id)) {
          console.warn(`[useWhatsAppMessages] Duplicata por ID na query: ${doc.id}`);
          return;
        }
        
        if (data.wam_id && seenWamIds.has(data.wam_id)) {
          console.warn(`[useWhatsAppMessages] Duplicata por wam_id na query: ${data.wam_id}`);
          return;
        }
        
        seenIds.add(doc.id);
        if (data.wam_id) {
          seenWamIds.add(data.wam_id);
        }
        
        // Preservar o estado de leitura: se read não estiver definido, considerar como undefined (não lida)
        // Não usar || false aqui, pois undefined significa não lida, false também significa não lida
        const readValue = data.read !== undefined ? data.read : undefined;
        
        newMessages.push({
          id: doc.id,
          wam_id: data.wam_id,
          message: data.message,
          chat_id: data.chat_id,
          direction: data.direction,
          createdAt: data.createdAt,
          messageTimestamp: data.messageTimestamp,
          companyId: data.companyId,
          read: readValue,
          readAt: data.readAt,
          messageSource: data.messageSource,
        });
      });

      // Ordenar por data (mais antigas primeiro para exibição - comportamento padrão de chat)
      // Usar messageTimestamp se disponível, senão usar createdAt
      newMessages.sort((a, b) => {
        const aTime = getMessageTimestamp(a);
        const bTime = getMessageTimestamp(b);
        return aTime - bTime; // Ordenar do mais antigo para o mais recente
      });

      // Se for carregamento inicial, substituir. Se for carregar mais, adicionar no final (mensagens mais antigas)
      if (isInitial) {
        console.log(`[useWhatsAppMessages] Carregadas ${newMessages.length} mensagens iniciais do Firestore para ${chatId}`);
        setMessages(newMessages);
        // Salvar no cache em memória após buscar do Firestore
        setCachedMessages(companyId, chatId, newMessages);
      } else {
        // Verificar duplicatas antes de adicionar
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const existingWamIds = new Set(prev.map(m => m.wam_id).filter(id => id));
          
          // Filtrar mensagens duplicadas
          const uniqueNewMessages = newMessages.filter(msg => {
            if (existingIds.has(msg.id)) {
              console.warn(`[useWhatsAppMessages] Mensagem duplicada por ID ignorada: ${msg.id}`);
              return false;
            }
            if (msg.wam_id && existingWamIds.has(msg.wam_id)) {
              console.warn(`[useWhatsAppMessages] Mensagem duplicada por wam_id ignorada: ${msg.wam_id}`);
              return false;
            }
            return true;
          });
          
          console.log(`[useWhatsAppMessages] Carregadas mais ${uniqueNewMessages.length} mensagens antigas para ${chatId} (${newMessages.length - uniqueNewMessages.length} duplicadas ignoradas)`);
          
          // Adicionar mensagens antigas no início (já que são mais antigas que as existentes)
          const updatedMessages = [...uniqueNewMessages, ...prev];
          
          // Reordenar todo o array para garantir ordem correta (mais antigas primeiro)
          updatedMessages.sort((a, b) => {
            const aTime = getMessageTimestamp(a);
            const bTime = getMessageTimestamp(b);
            return aTime - bTime; // Ordenar do mais antigo para o mais recente
          });
          
          // Atualizar cache em memória com novas mensagens carregadas
          if (companyId && chatId) {
            setCachedMessages(companyId, chatId, updatedMessages);
          }
          
          return updatedMessages;
        });
      }

      // Atualizar lastVisible com o último documento (mais antigo)
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc);
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);

      // NÃO marcar mensagens como lidas automaticamente ao carregar
      // As mensagens só devem ser marcadas como lidas quando o usuário visualizar o chat
      // Isso será feito na página de mensagens quando o chat for aberto/focado

      // Escutar novas mensagens em tempo real (apenas as mais recentes)
      // Aguardar um pouco para garantir que as mensagens iniciais foram carregadas
      if (isInitial) {
        // Aguardar 500ms antes de configurar o listener para evitar conflitos
        setTimeout(() => {
          const unsubscribe = setupRealtimeListener();
          if (unsubscribe) {
            unsubscribeRef.current = unsubscribe;
          }
        }, 500);
      }

      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens');
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [companyId, chatId, lastVisible, setupRealtimeListener, setCachedMessages, getMessageTimestamp]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && companyId && chatId) {
      loadMessages(false);
    }
  }, [loadingMore, hasMore, companyId, chatId, loadMessages]);

  return { messages, loading, loadingMore, error, hasMore, loadMore };
}

// Função para enviar mensagem
export async function sendWhatsAppMessage(
  companyId: string,
  to: string,
  message: string
) {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    
    // Normalizar telefone (remover + e manter apenas números)
    const normalizedPhone = to.replace(/\D/g, '');
    // Garantir que tenha código do país (55 para Brasil)
    const phoneWithCountry = normalizedPhone.startsWith('55') 
      ? normalizedPhone 
      : `55${normalizedPhone}`;

    // Chamar função do Firebase para enviar mensagem
    const sendMessage = httpsCallable(functions, 'sendWhatsappMessage');
    const result = await sendMessage({
      companyId,
      to: phoneWithCountry,
      message,
    });

    return result.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

