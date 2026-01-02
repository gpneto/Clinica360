import { toast, Toaster } from 'react-hot-toast';

export { toast, Toaster };

// Toast helpers com estilos personalizados
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    style: {
      background: '#10B981',
      color: '#fff',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    style: {
      background: '#EF4444',
      color: '#fff',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  });
};

export const showInfo = (message: string, options?: { duration?: number; title?: string }) => {
  toast(message, {
    duration: options?.duration || 4000,
    style: {
      background: '#3B82F6',
      color: '#fff',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#3B82F6',
    },
    ...(options?.title && {
      // react-hot-toast não suporta title diretamente, então vamos incluir no body
    }),
  });
};

// Função específica para notificações de mensagens com título e duração customizada
// Aceita cores do tema e foto do contato para personalização
export const showMessageNotification = (
  contactName: string, 
  message: string, 
  duration: number = 8000,
  options?: {
    background?: string;
    primaryColor?: string;
    contactPhoto?: string;
  }
) => {
  // Cores padrão se não fornecido
  const bgColor = options?.background || '#3B82F6';
  const primaryColor = options?.primaryColor || '#3B82F6';
  const contactPhoto = options?.contactPhoto;
  
  toast(
    (t) => (
      <div 
        className="relative flex items-start gap-4 group overflow-hidden"
        onClick={() => toast.dismiss(t.id)}
      >
        {/* Indicador lateral colorido */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ background: primaryColor }}
        />
        
        {/* Container principal com padding à esquerda */}
        <div className="flex items-start gap-4 pl-1 flex-1">
          {/* Avatar do contato */}
          <div className="flex-shrink-0 relative">
            {contactPhoto ? (
              <div className="relative">
                <img 
                  src={contactPhoto} 
                  alt={contactName}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30 shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Indicador de status online (ponto verde) */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center ring-2 ring-white/30 shadow-lg backdrop-blur-sm">
                <span className="text-white font-bold text-xl">
                  {contactName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Conteúdo da mensagem */}
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Header com badge */}
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white/95 font-semibold text-xs uppercase tracking-wide">
                  Nova Mensagem
                </span>
              </div>
              <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />
            </div>
            
            {/* Nome do contato */}
            <div className="mb-1.5">
              <span className="text-white font-bold text-base leading-tight">
                {contactName}
              </span>
            </div>
            
            {/* Mensagem */}
            <div className="text-white/90 text-sm leading-relaxed break-words line-clamp-2">
              {message}
            </div>
            
            {/* Timestamp */}
            <div className="mt-2 text-white/60 text-xs">
              Agora
            </div>
          </div>
        </div>
        
        {/* Botão de fechar (aparece no hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-full"
          aria-label="Fechar notificação"
        >
          <svg 
            className="w-4 h-4 text-white/70" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    {
      duration: duration,
      style: {
        background: bgColor,
        color: '#fff',
        borderRadius: '16px',
        padding: '18px 20px',
        fontSize: '14px',
        fontWeight: '500',
        minWidth: '380px',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        border: 'none',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      },
      className: 'notification-message',
      iconTheme: {
        primary: '#fff',
        secondary: primaryColor,
      },
    }
  );
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#6B7280',
      color: '#fff',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
  });
};
