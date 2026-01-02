'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useWhatsAppContacts, useWhatsAppMessages, sendWhatsAppMessage, WhatsAppContact, WhatsAppMessage } from '@/hooks/useWhatsappMessages';
import { MessageCircle, Send, Search, Phone, User, Bot, UserCircle, ArrowLeft, Image, Video, Music, FileText, Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function MensagensPage() {
  const { companyId } = useAuth();
  const { contacts, loading: contactsLoading } = useWhatsAppContacts(companyId);
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterAutomaticOnly, setFilterAutomaticOnly] = useState(false);
  const [showContactsList, setShowContactsList] = useState(true); // Para mobile: controla se mostra lista ou chat
  const [isMobile, setIsMobile] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message?: string; synced?: number; total?: number } | null>(null);
  const [contactsPhotos, setContactsPhotos] = useState<Record<string, { profilePicUrl?: string; pushName?: string }>>({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const { messages, loading: messagesLoading, loadingMore, hasMore, loadMore } = useWhatsAppMessages(
    companyId,
    selectedContact?.wa_id || null
  );

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Buscar fotos de todos os contatos uma única vez ao carregar a tela
  useEffect(() => {
    if (!companyId || loadingPhotos) return;

    const loadContactsPhotos = async () => {
      try {
        setLoadingPhotos(true);
        const getWhatsAppContactsPhotosFn = httpsCallable(functions, 'getWhatsAppContactsPhotos');
        const result = await getWhatsAppContactsPhotosFn({ companyId });
        
        const data = result.data as { success: boolean; contacts: Record<string, { profilePicUrl?: string; pushName?: string }>; count?: number };
        
        if (data.success && data.contacts) {
          setContactsPhotos(data.contacts);
          const contactsWithPhotos = Object.values(data.contacts).filter(c => c.profilePicUrl).length;
          console.log(`[Mensagens] ✅ Fotos de contatos carregadas: ${data.count || Object.keys(data.contacts).length} contato(s), ${contactsWithPhotos} com foto`);
          console.log(`[Mensagens] 📋 Sample de remoteJids no cache:`, Object.keys(data.contacts).slice(0, 5));
        }
      } catch (error: any) {
        console.error('[Mensagens] Erro ao carregar fotos de contatos:', error);
        // Não exibir erro ao usuário, apenas continuar sem fotos
      } finally {
        setLoadingPhotos(false);
      }
    };

    loadContactsPhotos();
  }, [companyId]);

  // Formatar telefone para exibição
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Função para obter o pushName da API usando a mesma lógica de busca da foto
  const getContactPushNameFromApi = (contact: WhatsAppContact): string | null => {
    // Normalizar wa_id para comparação
    const normalizedWaId = contact.wa_id.replace(/\D/g, '');
    
    // Tentar com remoteJid salvo no contato
    if (contact.remoteJid && contactsPhotos[contact.remoteJid]?.pushName) {
      return contactsPhotos[contact.remoteJid].pushName || null;
    }
    
    // Gerar todas as variações possíveis do número para buscar no cache
    const variations = new Set<string>();
    
    // Adicionar número normalizado
    variations.add(normalizedWaId);
    
    // Adicionar variações com @s.whatsapp.net, @c.us e @lid
    variations.add(`${normalizedWaId}@s.whatsapp.net`);
    variations.add(`${normalizedWaId}@c.us`);
    variations.add(`${normalizedWaId}@lid`);
    
    // Adicionar/remover código do país (55)
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
    
    // Se o contato tem remoteJid, tentar usar diretamente também
    if (contact.remoteJid) {
      variations.add(contact.remoteJid);
    }
    
    // Tentar cada variação no cache
    for (const variant of Array.from(variations)) {
      const pushName = contactsPhotos[variant]?.pushName;
      if (pushName) {
        return pushName;
      }
    }
    
    // Se não encontrou variação exata, buscar por correspondência parcial nos keys do cache
    const cacheKeys = Object.keys(contactsPhotos);
    for (const cacheKey of cacheKeys) {
      // Extrair número do cache key (remover @s.whatsapp.net, @c.us ou @lid)
      const cacheKeyNumber = cacheKey.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
      
      // Verificar se o número bate (comparando normalizados)
      if (cacheKeyNumber === normalizedWaId || 
          (normalizedWaId.startsWith('55') && cacheKeyNumber === normalizedWaId.slice(2)) ||
          (!normalizedWaId.startsWith('55') && cacheKeyNumber === `55${normalizedWaId}`)) {
        const pushName = contactsPhotos[cacheKey]?.pushName;
        if (pushName) {
          return pushName;
        }
      }
    }
    
    // Tentar também com o remoteJid do contato se ele existir mas não foi encontrado diretamente
    if (contact.remoteJid) {
      // Extrair número do remoteJid do contato
      const contactRemoteJidNumber = contact.remoteJid.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
      
      // Buscar no cache por correspondência parcial
      for (const cacheKey of cacheKeys) {
        const cacheKeyNumber = cacheKey.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
        
        // Verificar se o número do remoteJid do contato bate com o número do cache key
        if (cacheKeyNumber === contactRemoteJidNumber || 
            (contactRemoteJidNumber.startsWith('55') && cacheKeyNumber === contactRemoteJidNumber.slice(2)) ||
            (!contactRemoteJidNumber.startsWith('55') && cacheKeyNumber === `55${contactRemoteJidNumber}`)) {
          const pushName = contactsPhotos[cacheKey]?.pushName;
          if (pushName) {
            return pushName;
          }
        }
      }
    }
    
    return null;
  };

  // Função para obter o nome do contato
  // Prioridade: name > patientName > pushName da API (se não tiver nome ou nome igual ao telefone) > pushName > profile_name > telefone
  const getContactName = (contact: WhatsAppContact): string => {
    // Primeiro tentar usar nome do Firestore
    const firestoreName = contact.name || contact.patientName;
    
    // Se não tiver nome no Firestore ou o nome for igual ao número de telefone
    if (!firestoreName) {
      // Buscar pushName da API
      const apiPushName = getContactPushNameFromApi(contact);
      if (apiPushName) {
        return apiPushName;
      }
    } else {
      // Verificar se o nome do Firestore é igual ao número de telefone
      const formattedPhone = formatPhone(contact.wa_id);
      const normalizedFirestoreName = firestoreName.trim();
      const normalizedPhone = formattedPhone.trim();
      
      if (normalizedFirestoreName === normalizedPhone || normalizedFirestoreName === contact.wa_id) {
        // Se o nome for igual ao telefone, buscar pushName da API
        const apiPushName = getContactPushNameFromApi(contact);
        if (apiPushName) {
          return apiPushName;
        }
      }
    }
    
    // Se não encontrou pushName da API, usar a ordem padrão
    return firestoreName || contact.pushName || contact.profile_name || formatPhone(contact.wa_id);
  };

  // Função para obter a foto do contato do cache ou do contato
  const getContactPhoto = (contact: WhatsAppContact): string | null => {
    // Prioridade: 1. Foto do cache (via API) usando remoteJid 2. Foto já salva no contato
    
    // Normalizar wa_id para comparação
    const normalizedWaId = contact.wa_id.replace(/\D/g, '');
    
    // Tentar com remoteJid salvo no contato
    if (contact.remoteJid && contactsPhotos[contact.remoteJid]?.profilePicUrl) {
      return contactsPhotos[contact.remoteJid].profilePicUrl || null;
    }
    
    // Gerar todas as variações possíveis do número para buscar no cache
    const variations = new Set<string>();
    
    // Adicionar número normalizado
    variations.add(normalizedWaId);
    
    // Adicionar variações com @s.whatsapp.net, @c.us e @lid
    variations.add(`${normalizedWaId}@s.whatsapp.net`);
    variations.add(`${normalizedWaId}@c.us`);
    variations.add(`${normalizedWaId}@lid`);
    
    // Adicionar/remover código do país (55)
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
    
    // Se o contato tem remoteJid, tentar usar diretamente também
    if (contact.remoteJid) {
      variations.add(contact.remoteJid);
    }
    
    // Tentar cada variação no cache
    for (const variant of Array.from(variations)) {
      const profilePicUrl = contactsPhotos[variant]?.profilePicUrl;
      if (profilePicUrl) {
        return profilePicUrl;
      }
    }
    
    // Se não encontrou variação exata, buscar por correspondência parcial nos keys do cache
    // Comparar apenas o número (sem @s.whatsapp.net, @c.us ou @lid) com os números dos keys do cache
    const cacheKeys = Object.keys(contactsPhotos);
    for (const cacheKey of cacheKeys) {
      // Extrair número do cache key (remover @s.whatsapp.net, @c.us ou @lid)
      const cacheKeyNumber = cacheKey.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
      
      // Verificar se o número bate (comparando normalizados)
      if (cacheKeyNumber === normalizedWaId || 
          (normalizedWaId.startsWith('55') && cacheKeyNumber === normalizedWaId.slice(2)) ||
          (!normalizedWaId.startsWith('55') && cacheKeyNumber === `55${normalizedWaId}`)) {
        const profilePicUrl = contactsPhotos[cacheKey]?.profilePicUrl;
        if (profilePicUrl) {
          return profilePicUrl;
        }
      }
    }
    
    // Tentar também com o remoteJid do contato se ele existir mas não foi encontrado diretamente
    if (contact.remoteJid) {
      // Extrair número do remoteJid do contato
      const contactRemoteJidNumber = contact.remoteJid.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
      
      // Buscar no cache por correspondência parcial
      for (const cacheKey of cacheKeys) {
        const cacheKeyNumber = cacheKey.replace(/@s\.whatsapp\.net|@c\.us|@lid/g, '').replace(/\D/g, '');
        
        // Verificar se o número do remoteJid do contato bate com o número do cache key
        if (cacheKeyNumber === contactRemoteJidNumber || 
            (contactRemoteJidNumber.startsWith('55') && cacheKeyNumber === contactRemoteJidNumber.slice(2)) ||
            (!contactRemoteJidNumber.startsWith('55') && cacheKeyNumber === `55${contactRemoteJidNumber}`)) {
          const profilePicUrl = contactsPhotos[cacheKey]?.profilePicUrl;
          if (profilePicUrl) {
            return profilePicUrl;
          }
        }
      }
    }
    
    // Se não encontrou no cache, usar a foto já salva no contato
    return contact.profilePicUrl || null;
  };

  // Filtrar contatos por busca e por mensagens automáticas
  const filteredContacts = contacts.filter((contact) => {
    // Filtro de busca
    const name = getContactName(contact).toLowerCase();
    const phone = formatPhone(contact.wa_id).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = name.includes(searchLower) || phone.includes(searchLower) || contact.wa_id.includes(searchTerm);
    
    // Filtro de mensagens automáticas
    if (filterAutomaticOnly && !contact.hasAutomaticMessages) {
      return false;
    }
    
    return matchesSearch;
  });

  // Filtrar mensagens se o filtro estiver ativo
  const filteredMessages = useMemo(() => {
    const filtered = filterAutomaticOnly 
      ? messages.filter((message) => message.messageSource === 'automatic')
      : messages;
    
    return filtered;
  }, [messages, filterAutomaticOnly]);

  // Separar mensagens não lidas das lidas
  const { unreadMessages, readMessages } = useMemo(() => {
    const unread = filteredMessages.filter((message) => {
      // Mensagem não lida: deve ser inbound e read deve ser explicitamente false ou undefined
      return message.direction === 'inbound' && (message.read === false || message.read === undefined);
    });
    const read = filteredMessages.filter((message) => {
      // Mensagens lidas: outbound ou inbound com read === true
      return message.direction === 'outbound' || message.read === true;
    });
    
    // Log para debug
    console.log('[Mensagens] Separando mensagens:', {
      total: filteredMessages.length,
      unread: unread.length,
      read: read.length,
      unreadSample: unread.slice(0, 3).map(m => ({ id: m.id, direction: m.direction, read: m.read })),
    });
    
    return { unreadMessages: unread, readMessages: read };
  }, [filteredMessages]);

  // Marcar mensagens como lidas quando o chat for aberto/focado
  // Atualiza o campo lastReadAt no contato ao invés de atualizar cada mensagem individual
  useEffect(() => {
    if (!companyId || !selectedContact?.wa_id || messagesLoading) return;

    // Aguardar um pouco para garantir que as mensagens foram carregadas
    const markAsReadTimeout = setTimeout(async () => {
      try {
        // Atualizar o campo lastReadAt no contato para marcar todas as mensagens como lidas
        const contactRef = doc(db, `companies/${companyId}/whatsappContacts`, selectedContact.wa_id);
        await updateDoc(contactRef, {
          lastReadAt: serverTimestamp(),
        });
        console.log(`[Mensagens] Marcadas todas as mensagens como lidas para o contato ${selectedContact.wa_id}`);
      } catch (err) {
        console.error('Erro ao marcar mensagens como lidas no contato:', err);
      }
    }, 500); // Aguardar 500ms após abrir o chat

    return () => clearTimeout(markAsReadTimeout);
  }, [companyId, selectedContact?.wa_id, messagesLoading]);

  // Scroll para última mensagem ao carregar inicialmente ou quando receber nova mensagem
  const isInitialLoadRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);
  
  useEffect(() => {
    if (messagesEndRef.current && filteredMessages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        // Se for o carregamento inicial, sempre ir para o final (última mensagem)
        if (isInitialLoadRef.current) {
          setTimeout(() => {
            if (messagesEndRef.current && container) {
              // Ir direto para o final (última mensagem - mais recente)
              container.scrollTop = container.scrollHeight;
              isInitialLoadRef.current = false;
            }
          }, 150);
        } else if (!loadingMore) {
          // Verificar se o número de mensagens aumentou (nova mensagem recebida)
          const isNewMessage = filteredMessages.length > previousMessagesLengthRef.current;
          
          if (isNewMessage) {
            // Verificar se o usuário está próximo do final antes de fazer scroll automático
            const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            const isNearBottom = scrollBottom < 150; // 150px de margem
            
            // Só fazer scroll automático se o usuário já estava próximo do final
            if (isNearBottom) {
              setTimeout(() => {
                if (container) {
                  container.scrollTop = container.scrollHeight;
                }
              }, 50);
            } else {
              // Se o usuário está vendo mensagens antigas, não fazer scroll automático
              console.log('[Mensagens] Nova mensagem recebida, mas usuário está vendo mensagens antigas. Não fazendo scroll automático.');
            }
          }
        }
      }
      previousMessagesLengthRef.current = filteredMessages.length;
    }
  }, [filteredMessages, loadingMore]);

  // Resetar flag de carregamento inicial quando mudar de contato
  useEffect(() => {
    if (selectedContact) {
      isInitialLoadRef.current = true;
      previousMessagesLengthRef.current = 0;
    }
  }, [selectedContact?.id]);

  // Manter posição do scroll ao carregar mais mensagens (quando loadingMore muda de true para false)
  const previousLoadingMoreRef = useRef(false);
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && previousLoadingMoreRef.current && !loadingMore) {
      // Acabou de carregar mais mensagens antigas no topo, ajustar scroll
      const previousScrollHeight = container.scrollHeight;
      
      // Aguardar o DOM atualizar
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeight;
          if (scrollDiff > 0) {
            // Manter a posição visual ao adicionar mensagens no topo
            container.scrollTop = container.scrollTop + scrollDiff;
          }
        }
      }, 50);
    }
    previousLoadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  // Intersection Observer para detectar quando o elemento sentinela está visível (mobile)
  useEffect(() => {
    if (!isMobile || !loadMoreTriggerRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log('[Mensagens] Intersection Observer - Carregando mais mensagens...', {
              hasMore,
              loadingMore
            });
            loadMore();
          }
        });
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '100px', // Começar a carregar 100px antes de ficar visível
        threshold: 0.1
      }
    );

    observer.observe(loadMoreTriggerRef.current);

    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [isMobile, hasMore, loadingMore, loadMore]);

  // Formatar data da mensagem
  const formatMessageDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '';
    
    const dateObj = date instanceof Timestamp 
      ? date.toDate() 
      : date instanceof Date 
        ? date 
        : new Date();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return format(dateObj, 'HH:mm', { locale: ptBR });
    } else {
      return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
  };

  // Extrair texto da mensagem
  const getMessageText = (message: WhatsAppMessage): string => {
    if (message.message?.text?.body) {
      return message.message.text.body;
    }
    if (message.message?.body) {
      return message.message.body;
    }
    if (message.message?.type === 'text') {
      return message.message.text || '';
    }
    // Para mensagens de mídia, retornar caption se houver
    if (message.message?.type === 'image' && message.message?.imageMessage?.caption) {
      return message.message.imageMessage.caption;
    }
    if (message.message?.type === 'video' && message.message?.videoMessage?.caption) {
      return message.message.videoMessage.caption;
    }
    return '[Mensagem não suportada]';
  };

  // Obter tipo de mídia e URL
  const getMediaInfo = (message: WhatsAppMessage): { type: string; url: string; mimetype?: string } | null => {
    const mediaUrl = message.message?.mediaUrl || (message as any).mediaUrl;
    const messageType = message.message?.type;
    
    if (!mediaUrl) return null;
    
    return {
      type: messageType || 'unknown',
      url: mediaUrl,
      mimetype: message.message?.mimetype || (message as any).mediaMimetype,
    };
  };

  // Renderizar mídia
  const renderMedia = (mediaInfo: { type: string; url: string; mimetype?: string }, message: WhatsAppMessage, isInbound: boolean) => {
    const { type, url, mimetype } = mediaInfo;
    
    if (type === 'image' || mimetype?.startsWith('image/')) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden">
          <img
            src={url}
            alt="Imagem"
            className="max-w-[200px] md:max-w-[250px] h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(url, '_blank')}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }
    
    if (type === 'video' || mimetype?.startsWith('video/')) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden">
          <video
            src={url}
            controls
            className="max-w-full h-auto rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
            }}
          >
            Seu navegador não suporta vídeo.
          </video>
        </div>
      );
    }
    
    if (type === 'audio' || mimetype?.startsWith('audio/')) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-slate-100 p-3">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-slate-600" />
            <audio
              src={url}
              controls
              className="flex-1"
              onError={(e) => {
                const target = e.target as HTMLAudioElement;
                target.style.display = 'none';
              }}
            >
              Seu navegador não suporta áudio.
            </audio>
          </div>
        </div>
      );
    }
    
    if (type === 'document' || mimetype?.startsWith('application/')) {
      const fileName = (message as any).message?.documentMessage?.fileName || 'Documento';
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-slate-100 p-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <FileText className="w-6 h-6 text-slate-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{fileName}</p>
              <p className="text-xs text-slate-500">{mimetype || 'Documento'}</p>
            </div>
            <Download className="w-5 h-5 text-slate-600 flex-shrink-0" />
          </a>
        </div>
      );
    }
    
    // Fallback para tipos desconhecidos
    return (
      <div className="mb-2 rounded-lg overflow-hidden bg-slate-100 p-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <FileText className="w-6 h-6 text-slate-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">Abrir mídia</p>
            <p className="text-xs text-slate-500">{mimetype || type}</p>
          </div>
          <Download className="w-5 h-5 text-slate-600 flex-shrink-0" />
        </a>
      </div>
    );
  };

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact || !companyId || sending) return;

    setSending(true);
    try {
      await sendWhatsAppMessage(companyId, selectedContact.wa_id, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // Sincronizar contatos
  const handleSyncContacts = async () => {
    if (!companyId || syncing) return;

    setSyncing(true);
    setSyncStatus({ message: 'Iniciando sincronização...' });
    
    try {
      const syncWhatsAppContactsFn = httpsCallable(functions, 'syncWhatsAppContacts');
      const result = await syncWhatsAppContactsFn({ companyId });
      
      const data = result.data as { success: boolean; synced: number; total: number; errors?: number };
      
      if (data.success) {
        setSyncStatus({ 
          message: `Sincronização concluída! ${data.synced} de ${data.total} contatos sincronizados${data.errors ? ` (${data.errors} erros)` : ''}`,
          synced: data.synced,
          total: data.total,
        });
        
        // Limpar status após 5 segundos
        setTimeout(() => {
          setSyncStatus(null);
        }, 5000);
      } else {
        throw new Error('Erro ao sincronizar');
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar contatos:', error);
      setSyncStatus({ 
        message: `Erro ao sincronizar: ${error?.message || 'Erro desconhecido'}`,
      });
      
      // Limpar status após 5 segundos
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
    } finally {
      setSyncing(false);
    }
  };

  // Ao selecionar contato no mobile, esconder lista e mostrar chat
  const handleSelectContact = (contact: WhatsAppContact) => {
    setSelectedContact(contact);
    // No mobile, esconder lista e mostrar chat
    if (window.innerWidth < 768) {
      setShowContactsList(false);
    }
  };

  // Voltar para lista de contatos (mobile)
  const handleBackToContacts = () => {
    setShowContactsList(true);
  };


  // Ajustar visibilidade baseado em selectedContact no mobile
  useEffect(() => {
    if (isMobile) {
      if (selectedContact) {
        setShowContactsList(false);
      } else {
        setShowContactsList(true);
      }
    }
  }, [selectedContact, isMobile]);

  // Prevenir scroll do body apenas no mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }
  }, [isMobile]);

  return (
    <div 
      className="flex bg-slate-50 overflow-hidden md:relative md:h-screen" 
      style={isMobile ? { 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100dvh',
        width: '100vw',
      } : {
        position: 'relative',
        height: '100vh',
        width: '100%',
      }}
    >
      {/* Lista de Contatos */}
      <div className={`
        absolute md:relative inset-0 md:inset-auto
        w-full md:w-96 
        border-r border-slate-200 bg-white flex flex-col z-10
        ${isMobile ? (showContactsList ? 'flex' : 'hidden') : 'flex'}
      `}>
        {/* Header */}
        <div className="p-3 md:p-4 pl-16 sm:pl-20 md:pl-24 lg:pl-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">Mensagens</h1>
            <Button
              onClick={handleSyncContacts}
              disabled={syncing || !companyId}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              title="Sincronizar mensagens e fotos de todos os contatos"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          </div>
          {syncStatus && (
            <div className={`mb-2 text-xs md:text-sm p-2 rounded ${
              syncStatus.message?.includes('Erro') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {syncStatus.message}
            </div>
          )}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm text-slate-700 hover:text-slate-900 active:opacity-70">
            <input
              type="checkbox"
              checked={filterAutomaticOnly}
              onChange={(e) => setFilterAutomaticOnly(e.target.checked)}
              className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Apenas mensagens automáticas</span>
              <span className="sm:hidden">Automáticas</span>
            </span>
          </label>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="p-4 text-center text-slate-500">Carregando contatos...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              {searchTerm ? 'Nenhum contato encontrado' : 'Nenhuma conversa ainda'}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const hasUnread = (contact.unreadCount || 0) > 0;

              return (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className={`
                p-3 md:p-4 border-b border-slate-100 cursor-pointer transition-colors
                ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 active:bg-slate-100'}
                ${hasUnread ? 'bg-blue-50/50' : ''}
              `}
            >
                  <div className="flex items-start gap-2 md:gap-3">
                    {(() => {
                      const photoUrl = getContactPhoto(contact);
                      // Usar key única baseada no contact.id e foto para garantir renderização correta
                      const photoKey = photoUrl ? `${contact.id}-${photoUrl.substring(0, 30)}` : contact.id;
                      return photoUrl ? (
                        <img
                          key={photoKey}
                          src={photoUrl}
                          alt={getContactName(contact)}
                          className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-200"
                          onError={(e) => {
                            // Se a imagem falhar ao carregar, usar fallback
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null;
                    })()}
                    <div 
                      className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm md:text-base ${getContactPhoto(contact) ? 'hidden' : ''}`}
                    >
                      {getContactName(contact).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {getContactName(contact)}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {formatPhone(contact.wa_id)}
                          </p>
                        </div>
                        {contact.last_message_at && (
                          <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                            {formatMessageDate(contact.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                          {contact.lastMessage || 'Sem mensagens'}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 ml-2 bg-blue-500 text-white text-xs font-semibold rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center">
                            {contact.unreadCount && contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className={`
        flex-1 flex flex-col bg-white min-h-0 overflow-hidden
        ${isMobile ? (!showContactsList ? 'flex' : 'hidden') : 'flex'}
      `}
      style={{ 
        minHeight: 0, 
        height: '100%', 
        maxHeight: '100%',
        display: isMobile ? (!showContactsList ? 'flex' : 'none') : 'flex'
      }}
      >
        {selectedContact ? (
          <>
            {/* Header do Chat */}
            <div className="p-3 md:p-4 pl-16 sm:pl-20 md:pl-24 lg:pl-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Botão voltar (mobile) */}
                <button
                  onClick={handleBackToContacts}
                  className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Voltar para lista de contatos"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
                {(() => {
                  const photoUrl = getContactPhoto(selectedContact);
                  return photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={getContactName(selectedContact)}
                      className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                      onError={(e) => {
                        // Se a imagem falhar ao carregar, usar fallback
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null;
                })()}
                <div 
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm md:text-base flex-shrink-0 ${getContactPhoto(selectedContact) ? 'hidden' : ''}`}
                >
                  {getContactName(selectedContact).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm md:text-base truncate">
                    {getContactName(selectedContact)}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 truncate">{formatPhone(selectedContact.wa_id)}</p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-50"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                minHeight: 0,
                position: 'relative',
                touchAction: 'pan-y',
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: '1 1 0%',
                height: 0, // Força o flex a calcular a altura corretamente
              } as React.CSSProperties}
              onScroll={(e) => {
                e.stopPropagation();
                const target = e.currentTarget;
                const isMobile = window.innerWidth < 768;
                
                // Carregar mais quando estiver próximo do topo (mensagens antigas)
                // No mobile, usar um threshold maior (300px) para facilitar o carregamento
                // No desktop, usar 10% do scrollHeight
                const threshold = isMobile ? 300 : target.scrollHeight * 0.1;
                
                // Carregar mais quando estiver próximo do topo
                const isNearTop = target.scrollTop <= threshold;
                
                if (isNearTop && hasMore && !loadingMore) {
                  console.log('[Mensagens] Carregando mais mensagens antigas...', {
                    scrollTop: target.scrollTop,
                    scrollHeight: target.scrollHeight,
                    clientHeight: target.clientHeight,
                    threshold,
                    hasMore,
                    loadingMore,
                    isMobile,
                    isNearTop
                  });
                  loadMore();
                }
              }}
              onTouchEnd={(e) => {
                // No mobile, também verificar ao soltar o toque
                const target = messagesContainerRef.current;
                if (target && isMobile) {
                  const threshold = 300;
                  if (target.scrollTop <= threshold && hasMore && !loadingMore) {
                    console.log('[Mensagens] TouchEnd - Carregando mais mensagens antigas...', {
                      scrollTop: target.scrollTop,
                      threshold,
                      hasMore,
                      loadingMore
                    });
                    loadMore();
                  }
                }
              }}
            >
              {messagesLoading ? (
                <div className="text-center text-slate-500 py-8">Carregando mensagens...</div>
              ) : (unreadMessages.length === 0 && readMessages.length === 0) ? (
                <div className="text-center text-slate-500 py-8">
                  {filterAutomaticOnly 
                    ? 'Nenhuma mensagem automática encontrada para este contato.'
                    : 'Nenhuma mensagem ainda. Envie a primeira mensagem!'
                  }
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Elemento sentinela para detectar quando carregar mais (mobile) - no topo para carregar mensagens antigas */}
                  {isMobile && hasMore && (
                    <div
                      ref={loadMoreTriggerRef}
                      className="h-1 w-full"
                      style={{ minHeight: '1px' }}
                    />
                  )}
                  {loadingMore && (
                    <div className="text-center text-slate-500 py-2 text-sm">
                      Carregando mensagens anteriores...
                    </div>
                  )}
                  {/* Seção de Mensagens Não Lidas */}
                  {unreadMessages.length > 0 && (
                    <>
                      <div className="sticky top-0 z-10 bg-blue-50/90 backdrop-blur-sm py-2 px-4 mb-4 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-900">
                          Mensagens não lidas ({unreadMessages.length})
                        </h3>
                      </div>
                      {unreadMessages.map((message, index) => {
                        const isInbound = message.direction === 'inbound';
                        const messageText = getMessageText(message);
                        const messageDate = message.messageTimestamp || message.createdAt;
                        const isAutomatic = message.messageSource === 'automatic';
                        const isManual = message.messageSource === 'manual';
                        const mediaInfo = getMediaInfo(message);
                        const hasMedia = !!mediaInfo;
                        const hasText = messageText && messageText !== '[Mensagem não suportada]';

                        // Usar uma key única combinando id e wam_id para evitar duplicatas
                        const uniqueKey = message.wam_id ? `${message.id}-${message.wam_id}` : `${message.id}-unread-${index}`;

                        return (
                          <div
                            key={uniqueKey}
                            className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`
                                max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm
                                ${isInbound 
                                  ? 'bg-white text-slate-900 rounded-tl-none border-2 border-blue-400' 
                                  : 'bg-blue-500 text-white rounded-tr-none'
                                }
                              `}
                            >
                              {hasMedia && renderMedia(mediaInfo!, message, isInbound)}
                              {hasText && (
                                <p className={`text-sm md:text-base whitespace-pre-wrap break-words font-bold ${hasMedia ? 'mt-2' : ''}`}>
                                  {messageText}
                                </p>
                              )}
                              <div className={`flex items-center justify-between ${hasText || hasMedia ? 'mt-1' : ''} gap-2`}>
                                <p className={`text-xs font-semibold ${isInbound ? 'text-slate-600' : 'text-blue-100'}`}>
                                  {formatMessageDate(messageDate)}
                                </p>
                                {!isInbound && (
                                  <div className="flex items-center gap-1">
                                    {isAutomatic && (
                                      <span 
                                        className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                        title="Mensagem automática do sistema"
                                      >
                                        <Bot className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        <span className="hidden sm:inline">Automática</span>
                                      </span>
                                    )}
                                    {isManual && (
                                      <span 
                                        className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                        title="Mensagem enviada manualmente"
                                      >
                                        <UserCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        <span className="hidden sm:inline">Manual</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {readMessages.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                          <h3 className="text-sm font-semibold text-slate-600 mb-4 px-2">
                            Mensagens anteriores
                          </h3>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Seção de Mensagens Lidas */}
                  {readMessages.map((message, index) => {
                    const isInbound = message.direction === 'inbound';
                    const messageText = getMessageText(message);
                    const messageDate = message.messageTimestamp || message.createdAt;
                    const isAutomatic = message.messageSource === 'automatic';
                    const isManual = message.messageSource === 'manual';
                    const mediaInfo = getMediaInfo(message);
                    const hasMedia = !!mediaInfo;
                    const hasText = messageText && messageText !== '[Mensagem não suportada]';

                    // Usar uma key única combinando id e wam_id para evitar duplicatas
                    const uniqueKey = message.wam_id ? `${message.id}-${message.wam_id}` : `${message.id}-read-${index}`;

                    return (
                      <div
                        key={uniqueKey}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`
                            max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm
                            ${isInbound 
                              ? 'bg-white text-slate-900 rounded-tl-none' 
                              : 'bg-blue-500 text-white rounded-tr-none'
                            }
                          `}
                        >
                          {hasMedia && renderMedia(mediaInfo!, message, isInbound)}
                          {hasText && (
                            <p className={`text-sm md:text-base whitespace-pre-wrap break-words ${hasMedia ? 'mt-2' : ''}`}>
                              {messageText}
                            </p>
                          )}
                          <div className={`flex items-center justify-between ${hasText || hasMedia ? 'mt-1' : ''} gap-2`}>
                            <p className={`text-xs ${isInbound ? 'text-slate-500' : 'text-blue-100'}`}>
                              {formatMessageDate(messageDate)}
                              {isInbound && message.read && (
                                <span className="ml-1">✓✓</span>
                              )}
                            </p>
                            {!isInbound && (
                              <div className="flex items-center gap-1">
                                {isAutomatic && (
                                  <span 
                                    className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                    title="Mensagem automática do sistema"
                                  >
                                    <Bot className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">Automática</span>
                                  </span>
                                )}
                                {isManual && (
                                  <span 
                                    className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-100"
                                    title="Mensagem enviada manualmente"
                                  >
                                    <UserCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">Manual</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input de Mensagem */}
            <div className="p-3 md:p-4 pb-4 md:pb-4 border-t border-slate-200 bg-white relative z-50">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 text-sm md:text-base"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 md:p-3 flex-shrink-0 relative z-50"
                  size="sm"
                >
                  {sending ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-slate-500">
                Escolha um contato da lista para ver as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

