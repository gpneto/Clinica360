'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Dashboard } from '@/components/Dashboard';
import { AccessGuard } from '@/components/AccessGuard';
import { Appointment } from '@/types';
import { MobileAppointmentForm } from '@/components/MobileAppointmentForm';
import { CompleteAppointmentModal } from '@/components/CompleteAppointmentModal';
import { useAppointments } from '@/hooks/useFirestore';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';

export default function Home() {
  const { user, loading, themePreference, customColor, customColor2, companyId } = useAuth();
  const router = useRouter();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const hasRedirectedRef = useRef(false);
  
  // Verificar pathname ANTES de qualquer renderização para evitar loops
  // Se já estiver em /login ou /signin, retornar null imediatamente
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname.replace(/\/$/, '');
    if (pathname === '/login' || pathname === '/signin') {
      return null;
    }
  }
  
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyle = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;

  // Buscar agendamentos para ter acesso ao updateAppointment
  const { appointments, updateAppointment } = useAppointments(companyId);

  useEffect(() => {
    // Verificar hostname e redirecionar antes de verificar autenticação
    if (typeof window !== 'undefined' && !hasRedirectedRef.current) {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
      
      // Se já estiver em /login ou /signin, não fazer nada
      if (pathname === '/login' || pathname === '/signin') {
        return;
      }
      
      // Se for texai.online e NÃO estiver autenticado, redirecionar para /login
      // Se já estiver autenticado, deixar acessar normalmente
      if ((hostname === 'texai.online' || hostname === 'www.texai.online') && !loading && !user) {
        hasRedirectedRef.current = true;
        window.location.replace('/login');
        return;
      }
      
      // Se não for texai.online e não estiver autenticado, redirecionar para /signin
      if (!loading && !user) {
        hasRedirectedRef.current = true;
        window.location.replace('/signin');
      }
    }
  }, [user, loading]);

  const handleViewAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAppointment(null);
  };

  const handleCompleteClick = (appointment: Appointment) => {
    setCompletingAppointment(appointment);
    setShowCompleteModal(true);
  };

  const handleEventComplete = async (
    appointmentId: string,
    data: { valorPagoCentavos: number; formaPagamento: string; clientePresente: boolean }
  ) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        console.error('Agendamento não encontrado');
        return;
      }

      await updateAppointment(appointmentId, {
        status: 'concluido' as const,
        valorPagoCentavos: data.valorPagoCentavos,
        formaPagamento: data.formaPagamento as any,
        clientePresente: data.clientePresente,
      });
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
  return null;
  }

  return (
    <AccessGuard allowed={['owner', 'admin', 'pro', 'atendente', 'outro', 'super_admin']}>
      <div
        className={cn(
          'min-h-screen p-4 sm:p-6 lg:p-8',
          'bg-slate-50'
        )}
      >
        <div className="max-w-7xl mx-auto">
          <Dashboard 
            onViewAppointment={handleViewAppointment}
            onCompleteClick={handleCompleteClick}
          />
        </div>
      </div>
      <MobileAppointmentForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        selectedDate={undefined}
        editingAppointment={editingAppointment}
        startedFromButton={false}
      />
      <CompleteAppointmentModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setCompletingAppointment(null);
        }}
        appointment={completingAppointment}
        onComplete={handleEventComplete}
      />
    </AccessGuard>
  );
}
