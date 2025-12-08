/**
 * Funções utilitárias para mensagens WhatsApp
 */

import { Image, Video, Music, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import type { WhatsAppMessage } from '@/hooks/useWhatsappMessages';

export const getMessageText = (message: WhatsAppMessage): string => {
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

export const getMediaInfo = (message: WhatsAppMessage): { type: string; url: string; mimetype?: string } | null => {
  const mediaUrl = message.message?.mediaUrl || (message as any).mediaUrl;
  const messageType = message.message?.type;
  
  if (!mediaUrl) return null;
  
  return {
    type: messageType || 'unknown',
    url: mediaUrl,
    mimetype: message.message?.mimetype || (message as any).mediaMimetype,
  };
};

export const renderMedia = (mediaInfo: { type: string; url: string; mimetype?: string }, message: WhatsAppMessage, isInbound: boolean) => {
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

export const formatMessageDate = (date: Date | Timestamp | undefined): string => {
  if (!date) return '';
  
  let dateObj: Date;
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'agora';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min atrás`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h atrás`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} dia${days > 1 ? 's' : ''} atrás`;
  } else {
    return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  }
};

