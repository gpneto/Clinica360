import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { WhatsAppNotifications } from '@/components/WhatsAppNotifications';
import { SidebarWrapper } from '@/components/SidebarWrapper';
import { Toaster } from '@/components/ui/toast';
import { IosPreventZoom } from '@/components/IosPreventZoom';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { PageViewTracker } from '@/components/PageViewTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AllOne',
  description: 'Sistema de agendamento multi-profissionais com finanças e lembretes automáticos',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  minimumScale: 1.0,
  userScalable: false,
  themeColor: '#6b7280',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <GoogleAnalytics />
        <IosPreventZoom />
        <AuthProvider>
          <WhatsAppNotifications />
          <SidebarWrapper>
            {children}
            <PageViewTracker />
          </SidebarWrapper>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
