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

export const showInfo = (message: string) => {
  toast(message, {
    duration: 4000,
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
  });
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
