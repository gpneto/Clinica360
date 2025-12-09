'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X, 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Check,
  ChevronsUpDown,
  Save,
  Search,
  Package,
  AlertCircle
} from 'lucide-react';
import { useProfessionals, useServices, usePatients, useAppointments, useCompanySettings } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import type { Patient } from '@/types';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedProfessional?: string;
  editingAppointment?: any;
  startedFromButton?: boolean; // Indica se foi iniciado pelo botão "Novo agendamento"
  initialStep?: number; // Etapa inicial do formulário (padrão: 1)
  rescheduleMode?: boolean; // Indica se está em modo reagendar
}

type FormData = {
  clientId: string;
  serviceId: string[]; // Array para permitir múltiplos serviços
  professionalId: string;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  notes: string;
  price: number;
  valorPago?: number;
  formaPagamento?: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'outros';
  clientePresente?: boolean;
  enviarNotificacao: boolean;
  isBlock: boolean;
  blockDescription: string;
  blockScope: 'single' | 'all';
  recurrenceEnabled: boolean;
  recurrenceFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurrenceCustomInterval: number; // Número de dias para intervalo personalizado
  recurrenceEndsOn: string;
};

export function MobileAppointmentForm({ 
  isOpen, 
  onClose, 
  selectedDate, 
  selectedProfessional,
  editingAppointment,
  startedFromButton = false,
  initialStep = 1,
  rescheduleMode = false
}: MobileAppointmentFormProps) {
  const router = useRouter();
  const { companyId, user, professionalId, role, themePreference, customColor, customColor2 } = useAuth();
  const { settings: companySettings } = useCompanySettings(companyId);
  const confirmacaoAutomatica = companySettings?.confirmacaoAutomatica !== false;
  const { professionals } = useProfessionals(companyId);
  const { services } = useServices(companyId);
  const { patients, createPatient } = usePatients(companyId);
  const {
    createAppointment,
    updateAppointment,
    createRecurringAppointments,
    updateRecurringAppointments,
    appointments
  } = useAppointments(companyId);
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const gradientStyleDiagonal = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [patientQuery, setPatientQuery] = useState('');
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const customTimeButtonRef = useRef<HTMLButtonElement>(null);

  const buildInitialForm = useMemo<FormData>(() => {
    let dateValue = '';
    let timeValue = '';

    const baseProfessionalId =
      selectedProfessional || (role === 'pro' ? professionalId || '' : '');

    if (editingAppointment) {
      dateValue = editingAppointment.inicio.toISOString().split('T')[0];
      const startHours = editingAppointment.inicio.getHours().toString().padStart(2, '0');
      const startMinutes = editingAppointment.inicio.getMinutes().toString().padStart(2, '0');
      timeValue = `${startHours}:${startMinutes}`;
    } else if (selectedDate) {
      dateValue = selectedDate.toISOString().split('T')[0];
      // Arredondar minutos para o slot mais próximo (0 ou 30)
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 60;
      const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
      const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
      
      // Limitar ao horário máximo (22h)
      const adjustedHours = finalHours > 22 ? 22 : finalHours < 8 ? 8 : finalHours;
      const adjustedMinutes = finalHours > 22 ? 0 : finalMinutes;
      
      timeValue = `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
    }

    const isExistingBlock =
      !!editingAppointment &&
      (editingAppointment.isBlock || editingAppointment.status === 'bloqueio');

    const durationMinutes = editingAppointment
      ? Math.max(
          15,
          Math.round(
            (editingAppointment.fim.getTime() - editingAppointment.inicio.getTime()) / (1000 * 60) / 15
          ) * 15 // Arredondar para o múltiplo de 15 minutos mais próximo
        )
      : 60;

    const hasRecurrence =
      !isExistingBlock && !!editingAppointment?.recurrenceGroupId;
    const recurrenceFrequency =
      editingAppointment?.recurrenceFrequency || 'weekly';
    const recurrenceEndsOn =
      hasRecurrence && editingAppointment?.recurrenceEndsAt
        ? editingAppointment.recurrenceEndsAt.toISOString().split('T')[0]
        : '';

    let endValue = '';
    if (editingAppointment) {
      endValue = `${editingAppointment.fim.getHours().toString().padStart(2, '0')}:${editingAppointment.fim
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    } else if (timeValue) {
      const [h, m] = timeValue.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const base = new Date();
        base.setHours(h, m, 0, 0);
        base.setMinutes(base.getMinutes() + durationMinutes);
        endValue = `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    const enviarNotificacaoDefault = isExistingBlock
      ? false
      : editingAppointment?.enviarNotificacao !== undefined
        ? Boolean(editingAppointment.enviarNotificacao)
        : confirmacaoAutomatica;

    return {
      clientId: isExistingBlock ? '' : (editingAppointment?.clientId || ''),
      serviceId: isExistingBlock ? [] : (() => {
        const serviceIds = editingAppointment?.serviceIds && editingAppointment.serviceIds.length > 0
          ? editingAppointment.serviceIds
          : editingAppointment?.serviceId
          ? [editingAppointment.serviceId]
          : [];
        return serviceIds;
      })(),
      professionalId: isExistingBlock
        ? (editingAppointment?.professionalId || '')
        : baseProfessionalId,
      date: dateValue,
      time: timeValue,
      endTime: endValue,
      notes: editingAppointment?.observacoes || '',
      price: isExistingBlock ? 0 : (editingAppointment?.precoCentavos ?? 0),
      // No modo reagendar, não copiar dados de pagamento e conclusão
      valorPago: rescheduleMode ? undefined : (editingAppointment?.valorPagoCentavos
        ? editingAppointment.valorPagoCentavos / 100
        : undefined),
      formaPagamento: rescheduleMode ? undefined : editingAppointment?.formaPagamento,
      clientePresente: rescheduleMode ? undefined : editingAppointment?.clientePresente,
      enviarNotificacao: enviarNotificacaoDefault,
      isBlock: isExistingBlock,
      blockDescription: isExistingBlock
        ? (editingAppointment?.blockDescription || editingAppointment?.observacoes || '')
        : '',
      blockScope: isExistingBlock
        ? editingAppointment?.blockScope || (editingAppointment?.professionalId === '__all__' ? 'all' : 'single')
        : 'single',
      duration: durationMinutes,
      recurrenceEnabled: hasRecurrence,
      recurrenceFrequency,
      recurrenceCustomInterval: 7, // Padrão: 7 dias (semanal)
      recurrenceEndsOn,
    };
  }, [editingAppointment, selectedDate, selectedProfessional, role, professionalId, confirmacaoAutomatica, rescheduleMode]);

  const [formData, setFormData] = useState<FormData>(buildInitialForm);
  useEffect(() => {
    setFormData(buildInitialForm);
  }, [buildInitialForm, isOpen]);
  useEffect(() => {
    if (
      formData.isBlock &&
      formData.blockScope === 'all' &&
      formData.professionalId !== '__all__'
    ) {
      setFormData(prev => ({ ...prev, professionalId: '__all__' }));
    }
    if (
      formData.isBlock &&
      formData.blockScope === 'single' &&
      formData.professionalId === '__all__'
    ) {
      setFormData(prev => ({
        ...prev,
        professionalId: selectedProfessional || professionalId || ''
      }));
    }
  }, [formData.isBlock, formData.blockScope, formData.professionalId, selectedProfessional, professionalId]);
  
  // Selecionar automaticamente o profissional se houver apenas 1 e não for edição
  useEffect(() => {
    if (
      isOpen &&
      !editingAppointment &&
      !formData.isBlock &&
      professionals.length === 1 &&
      !formData.professionalId
    ) {
      setFormData(prev => ({
        ...prev,
        professionalId: professionals[0].id
      }));
    }
  }, [isOpen, editingAppointment, professionals, formData.isBlock, formData.professionalId]);
  
  useEffect(() => {
    if (formData.isBlock && formData.recurrenceEnabled) {
      setFormData(prev => ({
        ...prev,
        recurrenceEnabled: false,
        recurrenceEndsOn: '',
      }));
    }
  }, [formData.isBlock, formData.recurrenceEnabled]);
  useEffect(() => {
    if (
      !formData.isBlock &&
      formData.recurrenceEnabled &&
      formData.date &&
      formData.recurrenceEndsOn &&
      formData.recurrenceEndsOn < formData.date
    ) {
      setFormData(prev => ({
        ...prev,
        recurrenceEndsOn: prev.date,
      }));
    }
  }, [formData.isBlock, formData.recurrenceEnabled, formData.recurrenceEndsOn, formData.date]);
  const clientId = formData.clientId;
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === clientId) || null,
    [patients, clientId]
  );

  const filteredPatients = useMemo(() => {
    const normalizeString = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const term = patientQuery.trim();
    const normalizedTerm = normalizeString(term);
    if (!normalizedTerm) return patients;
    const result = patients.filter((patient) => {
      const name = patient.nome ? normalizeString(patient.nome) : '';
      const phone = patient.telefoneE164 ? normalizeString(patient.telefoneE164) : '';
      const email = patient.email ? normalizeString(patient.email) : '';
      return (
        name.includes(normalizedTerm) ||
        phone.includes(normalizedTerm) ||
        email.includes(normalizedTerm)
      );
    });
    return result;
  }, [patientQuery, patients]);

  const filteredServices = useMemo(() => {
    const normalizeString = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    // Filtrar apenas serviços ativos
    const activeServices = services.filter(s => s.ativo);

    const term = serviceQuery.trim();
    const normalizedTerm = normalizeString(term);
    if (!normalizedTerm) return activeServices;
    const result = activeServices.filter((service) => {
      const name = service.nome ? normalizeString(service.nome) : '';
      return name.includes(normalizedTerm);
    });
    return result;
  }, [serviceQuery, services]);

  const handlePatientSelect = (patient: Patient | null) => {
    if (patient) {
      setFormData((prev) => ({ ...prev, clientId: patient.id }));
      setPatientQuery('');
    } else {
      setFormData((prev) => ({ ...prev, clientId: '' }));
      setPatientQuery('');
    }
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Telefone não informado';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    nome: '',
    telefoneE164: '',
    email: '',
    cpf: '',
    preferenciaNotificacao: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
    anamnese: ''
  });
  const customerLabels = useCustomerLabels();
  const singularLabel = customerLabels.singular;
  const singularTitle = customerLabels.singularTitle;
  const pluralTitle = customerLabels.pluralTitle;

  // Gerar opções de duração de 15 em 15 minutos, de 15 minutos até 8 horas
  const durationOptions = useMemo(() => {
    const options: { value: number; label: string }[] = [];
    for (let minutes = 15; minutes <= 480; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      let label = '';
      if (hours > 0 && mins > 0) {
        label = `${hours}h ${mins}min`;
      } else if (hours > 0) {
        label = `${hours}h`;
      } else {
        label = `${mins}min`;
      }
      options.push({ value: minutes, label });
    }
    return options;
  }, []);

  // Calcular hora final baseada na hora inicial e duração
  const calculateEndTime = useCallback((startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    
    const base = new Date();
    base.setHours(h, m, 0, 0);
    base.setMinutes(base.getMinutes() + durationMinutes);
    
    return `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  // Atualizar hora final quando hora inicial ou duração mudarem (apenas para não-bloqueios)
  useEffect(() => {
    if (!formData.isBlock && formData.time && formData.duration) {
      const newEndTime = calculateEndTime(formData.time, formData.duration);
      if (newEndTime) {
        setFormData(prev => {
          // Só atualiza se for diferente para evitar loops
          if (prev.endTime !== newEndTime) {
            return { ...prev, endTime: newEndTime };
          }
          return prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.time, formData.duration, formData.isBlock, calculateEndTime]);

  // Buscar agendamentos do dia quando data for selecionada
  const dayAppointments = useMemo(() => {
    if (!formData.date || !formData.professionalId || formData.isBlock) {
      return [];
    }

    // Parse da data selecionada (formato YYYY-MM-DD)
    const [year, month, day] = formData.date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);

    const filtered = appointments.filter(apt => {
      if (!apt.inicio) return false;
      
      const aptDate = new Date(apt.inicio);
      if (isNaN(aptDate.getTime())) return false;
      
      // Comparar apenas dia, mês e ano (ignorar horas)
      const isSameDay = aptDate.getFullYear() === selectedDate.getFullYear() &&
                       aptDate.getMonth() === selectedDate.getMonth() &&
                       aptDate.getDate() === selectedDate.getDate();
      
      const matchesProfessional = apt.professionalId === formData.professionalId || 
                                   apt.professionalId === '__all__' ||
                                   (formData.professionalId === '__all__');
      const isNotBlock = !apt.isBlock && apt.status !== 'bloqueio';
      
      return isSameDay && matchesProfessional && isNotBlock;
    });


    return filtered;
  }, [formData.date, formData.professionalId, formData.isBlock, appointments, startedFromButton]);

  // Gerar horários disponíveis (8h às 22h, de 30 em 30 minutos)
  const availableTimeSlots = useMemo(() => {
    const slots: { time: string; label: string; disabled: boolean }[] = [];
    const startHour = 8;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Verificar se o horário está ocupado
        let isOccupied = false;
        if (formData.date && formData.duration && formData.professionalId && dayAppointments.length > 0) {
          // Criar data/hora do slot no timezone local
          const [year, month, day] = formData.date.split('-').map(Number);
          const [hour, minute] = timeString.split(':').map(Number);
          const slotStart = new Date(year, month - 1, day, hour, minute, 0);
          const slotEnd = new Date(slotStart.getTime() + formData.duration * 60000);
          
          isOccupied = dayAppointments.some(apt => {
            if (!apt.inicio || !apt.fim) return false;
            
            const aptStart = new Date(apt.inicio);
            const aptEnd = new Date(apt.fim);
            
            if (isNaN(aptStart.getTime()) || isNaN(aptEnd.getTime())) return false;
            
            // Verificar sobreposição: slotStart < aptEnd && slotEnd > aptStart
            const overlaps = slotStart < aptEnd && slotEnd > aptStart;
            
            
            return overlaps;
          });
        }
        
        const label = minute === 0 ? `${hour}h` : `${hour}h${minute}`;
        slots.push({
          time: timeString,
          label,
          disabled: isOccupied
        });
      }
    }
    
    return slots;
  }, [formData.date, formData.duration, formData.professionalId, dayAppointments]);

  // Atualizar professionalId quando role ou professionalId mudarem
  useEffect(() => {
    if (role === 'pro' && professionalId && !selectedProfessional) {
      setFormData(prev => ({ ...prev, professionalId }));
    }
  }, [role, professionalId, selectedProfessional]);

  // Resetar hora personalizada quando data ou profissional mudarem
  useEffect(() => {
    setShowCustomTime(false);
  }, [formData.date, formData.professionalId]);

  // Resetar hora personalizada quando o formulário é aberto/fechado ou quando editingAppointment muda
  useEffect(() => {
    if (!isOpen) {
      setShowCustomTime(false);
    }
  }, [isOpen, editingAppointment]);

  // Recalcular duração e preço quando os serviços mudarem
  useEffect(() => {
    if (formData.serviceId.length > 0 && !formData.isBlock) {
      const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
      const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
      const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
      
      setFormData(prev => ({
        ...prev,
        duration: totalDuration || prev.duration,
        price: totalPrice || prev.price
      }));
    } else if (formData.serviceId.length === 0 && !formData.isBlock) {
      // Se não há serviços selecionados, resetar para valores padrão
      setFormData(prev => ({
        ...prev,
        duration: 60,
        price: 0
      }));
    }
  }, [formData.serviceId, services, formData.isBlock]);

  // Atualizar formData quando editingAppointment mudar
  useEffect(() => {
    if (editingAppointment) {
      const dateValue = editingAppointment.inicio.toISOString().split('T')[0];
      const hours = editingAppointment.inicio.getHours().toString().padStart(2, '0');
      const minutes = editingAppointment.inicio.getMinutes().toString().padStart(2, '0');
      const timeValue = `${hours}:${minutes}`;
      const isBlock = editingAppointment.isBlock || editingAppointment.status === 'bloqueio';
      const blockScope = isBlock
        ? editingAppointment.blockScope || (editingAppointment.professionalId === '__all__' ? 'all' : 'single')
        : 'single';
      const durationMinutes = Math.max(
        1,
        Math.round((editingAppointment.fim.getTime() - editingAppointment.inicio.getTime()) / (1000 * 60))
      );
      const endValue = `${editingAppointment.fim.getHours().toString().padStart(2, '0')}:${editingAppointment.fim
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const hasRecurrence = !isBlock && Boolean(editingAppointment.recurrenceGroupId);
      const recurrenceFrequency = editingAppointment.recurrenceFrequency || 'weekly';
      const recurrenceEndsOn =
        hasRecurrence && editingAppointment.recurrenceEndsAt
          ? editingAppointment.recurrenceEndsAt.toISOString().split('T')[0]
          : '';

      const enviarNotificacaoValue = isBlock
        ? false
        : editingAppointment.enviarNotificacao !== undefined
          ? Boolean(editingAppointment.enviarNotificacao)
          : confirmacaoAutomatica;

      setFormData((prev) => ({
        ...prev,
        clientId: isBlock ? '' : editingAppointment.clientId,
        serviceId: isBlock ? [] : (editingAppointment.serviceIds && editingAppointment.serviceIds.length > 0
          ? editingAppointment.serviceIds
          : editingAppointment.serviceId
          ? (Array.isArray(editingAppointment.serviceId) ? editingAppointment.serviceId : [editingAppointment.serviceId])
          : []),
        professionalId: editingAppointment.professionalId,
        date: dateValue,
        time: timeValue,
        endTime: endValue,
        duration: durationMinutes,
        notes: editingAppointment.observacoes || '',
        price: isBlock ? 0 : editingAppointment.precoCentavos ?? 0,
        // No modo reagendar, não copiar dados de pagamento e conclusão
        valorPago: rescheduleMode ? undefined : (editingAppointment.valorPagoCentavos ? editingAppointment.valorPagoCentavos / 100 : undefined),
        formaPagamento: rescheduleMode ? undefined : editingAppointment.formaPagamento,
        clientePresente: rescheduleMode ? undefined : editingAppointment.clientePresente,
        enviarNotificacao: enviarNotificacaoValue,
        isBlock,
        blockDescription: isBlock
          ? editingAppointment.blockDescription || editingAppointment.observacoes || ''
          : '',
        blockScope,
        recurrenceEnabled: hasRecurrence,
        recurrenceFrequency,
        recurrenceEndsOn,
      }));
    }
  }, [editingAppointment, confirmacaoAutomatica, rescheduleMode]);

  // Atualizar data e hora quando selectedDate mudar (apenas para novos agendamentos)
  useEffect(() => {
    if (!editingAppointment && selectedDate && isOpen) {
      const dateValue = selectedDate.toISOString().split('T')[0];
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeValue = `${hours}:${minutes}`;

      let endValue = '';
      const [h, m] = timeValue.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const base = new Date();
        base.setHours(h, m, 0, 0);
        base.setMinutes(base.getMinutes() + (formData.duration || 60));
        endValue = `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}`;
      }

      setFormData(prev => ({
        ...prev,
        date: dateValue,
        time: timeValue,
        endTime: prev.isBlock ? (prev.endTime || endValue) : endValue,
        professionalId: prev.professionalId || selectedProfessional || (role === 'pro' ? professionalId || '' : '')
      }));
    }
  }, [selectedDate, editingAppointment, isOpen, formData.duration, formData.isBlock, selectedProfessional, role, professionalId]);

  const steps = useMemo(() => {
    const base = [
      { id: 1, title: formData.isBlock ? 'Tipo' : singularTitle, icon: formData.isBlock ? Clock : User },
      { id: 2, title: formData.isBlock ? 'Escopo' : 'Serviço', icon: formData.isBlock ? User : FileText },
      { id: 3, title: 'Profissional', icon: User },
      { id: 4, title: 'Data/Hora', icon: Calendar },
      { id: 5, title: 'Detalhes', icon: Clock },
    ];

    if (!formData.isBlock && editingAppointment?.status === 'concluido') {
      base.push({ id: 6, title: 'Pagamento', icon: Check });
    }

    return base;
  }, [formData.isBlock, editingAppointment?.status, singularTitle]);

  useEffect(() => {
    const maxStep = steps.length;
    if (currentStep > maxStep) {
      setCurrentStep(maxStep);
    }
  }, [steps, currentStep, setCurrentStep]);

  // Resetar step para initialStep quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Garantir que o botão "+ Outra hora" seja visível quando o step 4 for renderizado
  useEffect(() => {
    if (currentStep === 4 && formData.date && formData.professionalId && !formData.isBlock && formData.duration && customTimeButtonRef.current) {
      // Aguardar um pouco para garantir que o DOM foi atualizado
      setTimeout(() => {
        if (customTimeButtonRef.current) {
          customTimeButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [currentStep, formData.date, formData.professionalId, formData.isBlock, formData.duration]);

  const canProceed = useCallback(() => {
    if (formData.isBlock) {
      switch (currentStep) {
        case 1:
        case 2:
          return true;
        case 3:
          return formData.blockScope === 'all' ? true : Boolean(formData.professionalId);
        case 4:
          return Boolean(formData.date && formData.time && formData.endTime);
        case 5:
          // Descrição do bloqueio é opcional, mas se estiver no step 5, pode prosseguir
          return true;
        default:
          return true;
      }
    }

    switch (currentStep) {
      case 1:
        return Boolean(formData.clientId);
      case 2:
        return formData.serviceId.length > 0;
      case 3:
        return Boolean(formData.professionalId);
      case 4:
        return Boolean(
          formData.date &&
            formData.time &&
            (!formData.recurrenceEnabled || formData.recurrenceEndsOn)
        );
      case 5:
        return true;
      case 6:
        return editingAppointment?.status === 'concluido';
      default:
        return false;
    }
  }, [
    currentStep,
    formData.blockDescription,
    formData.blockScope,
    formData.date,
    formData.endTime,
    formData.isBlock,
    formData.professionalId,
    formData.serviceId,
    formData.clientId,
    formData.time,
    formData.recurrenceEnabled,
    formData.recurrenceEndsOn,
    editingAppointment?.status,
  ]);

  const nextStep = () => {
    const maxStep = steps.length;
    if (currentStep < maxStep && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!companyId) {
      alert('Erro: companyId não encontrado.');
      return;
    }

    if (!canProceed()) {
      alert('Preencha as informações necessárias antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!formData.date || !formData.time) {
        throw new Error('Data ou hora inválida');
      }

      const startDate = new Date(`${formData.date}T${formData.time}`);
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Data ou hora inválida');
      }

      const blockDescription = (formData.blockDescription ?? '').trim();
      let endDate = new Date(startDate);

      const selectedServices = formData.isBlock
        ? []
        : services.filter((s) => Array.isArray(formData.serviceId) && formData.serviceId.includes(s.id));
      const selectedPatient = formData.isBlock
        ? null
        : patients.find((c) => c.id === formData.clientId);

      if (formData.isBlock) {
        if (!formData.endTime) {
          throw new Error('Selecione o horário de término do bloqueio');
        }
        endDate = new Date(`${formData.date}T${formData.endTime}`);
        if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
          endDate = new Date(startDate.getTime() + 60 * 60000);
        }
      } else {
        if (selectedServices.length === 0 || !selectedPatient) {
          throw new Error(`Selecione ${singularLabel} e pelo menos um serviço válido.`);
        }

        // Calcular duração total (soma de todos os serviços)
        const totalDurationMinutes = selectedServices.reduce((sum, service) => {
          return sum + (service.duracaoMin || 0);
        }, 0) || formData.duration || 60;
        
        endDate = new Date(startDate.getTime() + totalDurationMinutes * 60000);
      }

      const recurrenceEnabled =
        !formData.isBlock && formData.recurrenceEnabled;
      let recurrenceEndDate: Date | null = null;

      if (recurrenceEnabled) {
        if (!formData.recurrenceEndsOn) {
          throw new Error('Informe a data final da recorrência.');
        }
        const recurrenceCandidate = new Date(
          `${formData.recurrenceEndsOn}T23:59:59`
        );
        if (Number.isNaN(recurrenceCandidate.getTime())) {
          throw new Error('Data final da recorrência inválida.');
        }
        if (recurrenceCandidate < startDate) {
          throw new Error(
            'A data final da recorrência deve ser posterior à data inicial.'
          );
        }
        const maxEndDate = new Date(startDate);
        maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
        if (recurrenceCandidate > maxEndDate) {
          throw new Error(
            'A data final da recorrência deve ser no máximo 1 ano após o início.'
          );
        }
        recurrenceEndDate = recurrenceCandidate;
      }

      const professionalTargetId =
        formData.isBlock && formData.blockScope === 'all'
          ? '__all__'
          : formData.professionalId;

      if (!professionalTargetId) {
        throw new Error('Selecione o profissional responsável.');
      }

      const status = formData.isBlock ? 'bloqueio' : 'agendado';
      const shouldNotify =
        !formData.isBlock && formData.enviarNotificacao !== false;

      const basePayload: any = {
        companyId,
        professionalId: professionalTargetId,
        inicio: startDate,
        fim: endDate,
        status,
        isBlock: formData.isBlock,
        blockDescription: formData.isBlock ? (blockDescription || 'Bloqueio de horário') : '',
        blockScope: formData.isBlock ? formData.blockScope : 'single',
        observacoes: formData.isBlock ? (blockDescription || 'Bloqueio de horário') : formData.notes || '',
        createdByUid: user?.uid || 'current-user',
      };

      if (formData.isBlock) {
        basePayload.clientId = '';
        basePayload.serviceId = '';
        basePayload.precoCentavos = 0;
        basePayload.comissaoPercent = 0;
      } else if (selectedServices.length > 0) {
        basePayload.clientId = formData.clientId;
        // Usar o primeiro serviço como principal (para compatibilidade com o tipo Appointment)
        basePayload.serviceId = formData.serviceId[0] || '';
        // Salvar todos os serviços selecionados
        basePayload.serviceIds = formData.serviceId;
        // Calcular preço total de todos os serviços
        const totalPrice = selectedServices.reduce((sum, service) => {
          return sum + (service.precoCentavos || 0);
        }, 0);
        basePayload.precoCentavos = formData.price || totalPrice;
        // Usar a comissão do primeiro serviço
        basePayload.comissaoPercent = selectedServices[0]?.comissaoPercent || 0;
      }

      if (recurrenceEnabled && recurrenceEndDate) {
        basePayload.recurrenceFrequency = formData.recurrenceFrequency;
        basePayload.recurrenceEndsAt = recurrenceEndDate;
        basePayload.recurrenceOriginalStart =
          editingAppointment?.recurrenceOriginalStart || startDate;
      }

      if (editingAppointment) {
        // Modo reagendar: criar apenas o novo agendamento (sem modificar o original)
        if (rescheduleMode) {
          // Garantir que usa o clientId do agendamento original
          const clientIdToUse = editingAppointment.clientId || formData.clientId;
          
          // Criar novo agendamento com os novos dados
          // IMPORTANTE: Não copiar dados de pagamento e conclusão no reagendamento
          const newAppointmentData = {
            ...basePayload,
            clientId: clientIdToUse,
            serviceId: formData.serviceId[0] || editingAppointment.serviceId || '',
            serviceIds: formData.serviceId.length > 0 ? formData.serviceId : (editingAppointment.serviceIds || [editingAppointment.serviceId]),
            precoCentavos: formData.price || selectedServices.reduce((sum, service) => sum + (service.precoCentavos || 0), 0) || editingAppointment.precoCentavos || 0,
            comissaoPercent: selectedServices[0]?.comissaoPercent || editingAppointment.comissaoPercent || 0,
            observacoes: formData.notes || editingAppointment.observacoes || '',
            status: 'agendado' as const,
            // Garantir que não inclui dados de pagamento/conclusão
            valorPagoCentavos: undefined,
            formaPagamento: undefined,
            clientePresente: undefined,
          };

          // Criar apenas o novo agendamento (não modificar o original)
          await createAppointment(newAppointmentData, shouldNotify);
        } else {
          // Modo edição normal
          const isRecurringAppointment = !!editingAppointment.recurrenceGroupId;

          if (recurrenceEnabled && recurrenceEndDate && isRecurringAppointment) {
            const proceed = window.confirm(
              'Este agendamento faz parte de uma recorrência. Ao atualizar, todos os agendamentos futuros serão ajustados. Deseja continuar?'
            );
            if (!proceed) {
              setIsSubmitting(false);
              return;
            }

            const recurringPayload = {
              ...basePayload,
              recurrenceGroupId: editingAppointment.recurrenceGroupId,
              recurrenceOriginalStart:
                editingAppointment.recurrenceOriginalStart ||
                basePayload.recurrenceOriginalStart ||
                startDate,
            };

            await updateRecurringAppointments(
              editingAppointment.id,
              recurringPayload,
              {
                frequency: formData.recurrenceFrequency,
                endDate: recurrenceEndDate,
                customIntervalDays: formData.recurrenceFrequency === 'custom' ? formData.recurrenceCustomInterval : undefined,
              },
              shouldNotify
            );
          } else {
            const updateData: any = { ...basePayload };
            delete updateData.companyId;

            if (!recurrenceEnabled) {
              updateData.recurrenceFrequency = undefined;
              updateData.recurrenceEndsAt = undefined;
              updateData.recurrenceOriginalStart = undefined;
            }

            if (formData.isBlock) {
              updateData.clientId = '';
              updateData.serviceId = '';
              updateData.precoCentavos = 0;
              updateData.comissaoPercent = 0;
            } else if (selectedServices.length > 0) {
              updateData.clientId = formData.clientId;
              // Usar o primeiro serviço como principal (para compatibilidade com o tipo Appointment)
              updateData.serviceId = formData.serviceId[0] || '';
              // Salvar todos os serviços selecionados
              updateData.serviceIds = formData.serviceId;
              // Calcular preço total de todos os serviços
              const totalPrice = selectedServices.reduce((sum, service) => {
                return sum + (service.precoCentavos || 0);
              }, 0);
              updateData.precoCentavos = formData.price || totalPrice;
              // Usar a comissão do primeiro serviço
              updateData.comissaoPercent = selectedServices[0]?.comissaoPercent || 0;
              updateData.observacoes = formData.notes || '';

              if (
                editingAppointment.status === 'concluido' &&
                formData.valorPago !== undefined &&
                formData.valorPago !== null
              ) {
                updateData.valorPagoCentavos = Math.round(
                  formData.valorPago * 100
                );
              }
              if (
                formData.formaPagamento !== undefined &&
                formData.formaPagamento !== null
              ) {
                updateData.formaPagamento = formData.formaPagamento;
              }
              if (
                formData.clientePresente !== undefined &&
                formData.clientePresente !== null
              ) {
                updateData.clientePresente = formData.clientePresente;
              }
            }

            await updateAppointment(
              editingAppointment.id,
              updateData,
              shouldNotify
            );
          }
        }
      } else {
        if (recurrenceEnabled && recurrenceEndDate) {
          const recurringPayload = {
            ...basePayload,
            recurrenceFrequency: formData.recurrenceFrequency,
            recurrenceEndsAt: recurrenceEndDate,
            recurrenceOriginalStart: startDate,
          };

          await createRecurringAppointments(
            recurringPayload,
            {
              frequency: formData.recurrenceFrequency,
              endDate: recurrenceEndDate,
              customIntervalDays: formData.recurrenceFrequency === 'custom' ? formData.recurrenceCustomInterval : undefined,
            },
            shouldNotify
          );
        } else {
          await createAppointment(basePayload, shouldNotify);
        }
      }

      // Resetar formulário e fechar modal
      setFormData(buildInitialForm);
      setCurrentStep(1);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      alert(`Erro ao salvar registro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewPatient = async () => {
    if (!newPatientData.nome || !newPatientData.telefoneE164 || !companyId) return;
    
    try {
      const newPatient = await createPatient({
        companyId,
        nome: newPatientData.nome,
        telefoneE164: newPatientData.telefoneE164,
        email: newPatientData.email || undefined,
        cpf: newPatientData.cpf || undefined,
        preferenciaNotificacao: newPatientData.preferenciaNotificacao,
        anamnese: newPatientData.anamnese || undefined,
        ownerUid: user?.uid || 'current-user'
      });
      
      setFormData(prev => ({ ...prev, clientId: newPatient.id }));
      setPatientQuery('');
      
      setNewPatientData({
        nome: '',
        telefoneE164: '',
        email: '',
        cpf: '',
        preferenciaNotificacao: 'whatsapp',
        anamnese: ''
      });
      setShowNewPatientModal(false);
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      alert(`Erro ao criar ${singularLabel}. Tente novamente.`);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setPatientQuery('');
    }
  }, [isOpen]);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Adicionar atributo para indicar que o modal está aberto
      document.body.setAttribute('data-modal-open', 'true');
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
        
        // Remover atributo quando o modal fecha
        document.body.removeAttribute('data-modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center backdrop-blur-sm',
        isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'flex w-full flex-col sm:h-auto sm:max_h-[90vh] sm:w-[500px] mobile-drawer',
          isVibrant
            ? 'rounded-t-3xl sm:rounded-2xl bg-white/85 border border-white/20 backdrop-blur-2xl shadow-indigo-500/20'
            : 'bg-white sm:rounded-2xl shadow-2xl'
        )}
        style={{ 
          height: '100svh',
          maxHeight: '100svh',
          maxWidth: '100vw',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'manipulation',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between border-b text-white',
            isVibrant
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 border-white/20'
              : isCustom && gradientStyleDiagonal
              ? 'border-white/20'
              : 'bg-slate-900 border-slate-900/10'
          )}
          style={
            isCustom && gradientStyleDiagonal 
              ? {
                  ...gradientStyleDiagonal,
                  paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
                  paddingBottom: `0.5rem`,
                  paddingLeft: `calc(0.75rem + env(safe-area-inset-left, 0px))`,
                  paddingRight: `calc(0.75rem + env(safe-area-inset-right, 0px))`
                }
              : {
                  paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
                  paddingBottom: `0.5rem`,
                  paddingLeft: `calc(0.75rem + env(safe-area-inset-left, 0px))`,
                  paddingRight: `calc(0.75rem + env(safe-area-inset-right, 0px))`
                }
          }
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <h2 className="text-sm sm:text-lg font-bold">Novo Agendamento</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              'text-white',
              hasGradient ? 'hover:bg-white/20' : 'hover:bg-white/10'
            )}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div
          className={cn(
            'border-b px-1 sm:px-4 py-0 sm:py-3',
            isVibrant ? 'bg-white/40 border-white/20 backdrop-blur' : 'bg-gray-50'
          )}
        >
          <div className="flex items-center justify-between gap-0.5 sm:gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep >= step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div 
                  key={step.id} 
                  className="flex flex-col items-center flex-1 relative m-0 p-0"
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-all duration-300 m-0 relative z-10',
                      isCompleted
                        ? isVibrant
                          ? 'bg-emerald-400 text-white shadow-lg'
                          : 'bg-green-500 text-white'
                        : isActive
                          ? isVibrant
                            ? 'bg-indigo-500 text-white shadow-lg'
                            : 'bg-blue-500 text-white'
                          : isVibrant
                            ? 'bg-white/80 text-slate-700'
                            : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                  </div>
                  <span
                    className={cn(
                      'text-center text-[9px] sm:text-sm font-medium transition-colors m-0 p-0 leading-none',
                      isActive
                        ? isVibrant ? 'text-slate-800' : 'text-blue-600'
                        : isVibrant ? 'text-slate-600' : 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-1/2 h-0.5 transition-colors',
                        currentStep > step.id
                          ? isVibrant ? 'bg-emerald-400' : 'bg-green-500'
                          : isVibrant ? 'bg-slate-400/70' : 'bg-gray-200'
                      )}
                      style={{ 
                        width: 'calc(100% - 1rem)', 
                        left: 'calc(50% + 0.5rem)',
                        top: 'calc(50% - 10px)',
                        transform: 'translateY(-50%)',
                        zIndex: 0
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-4 overscroll-contain relative" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
            flex: '1 1 auto',
            overflowY: 'auto',
            paddingBottom: currentStep === 4 && formData.date && formData.professionalId && !formData.isBlock && formData.duration 
              ? 'calc(3rem + 280px)' // Espaço extra quando o botão "+ Outra hora" está no footer
              : 'calc(2rem + 100px)' // Espaço padrão para o footer
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1 */}
              {currentStep === 1 && (
                <Card className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Escolha o {singularTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={formData.isBlock ? 'outline' : 'default'}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            isBlock: false,
                            blockDescription: '',
                            blockScope: 'single',
                            enviarNotificacao: confirmacaoAutomatica,
                            endTime: '',
                            clientId: prev.clientId,
                            serviceId: prev.serviceId,
                            price: prev.price,
                            duration: prev.duration || 60
                          }));
                          if (currentStep > 5) {
                            setCurrentStep(5);
                          }
                        }}
                        className={cn(
                          'text-xs font-semibold',
                          !formData.isBlock
                            ? cn(
                                'text-white',
                                hasGradient
                                  ? isCustom && gradientStyleHorizontal
                                    ? ''
                                    : 'bg-gradient-to-r from-indigo-500 to-rose-500'
                                  : 'bg-slate-900'
                              )
                            : cn(
                                'text-slate-700',
                                isCustom && 'border-slate-300 hover:bg-slate-100'
                              )
                        )}
                        style={!formData.isBlock && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                      >
                        Atendimento
                      </Button>
                      <Button
                        type="button"
                        variant={formData.isBlock ? 'default' : 'outline'}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            isBlock: true,
                            clientId: '',
                            serviceId: [],
                            price: 0,
                            notes: '',
                            enviarNotificacao: false,
                            blockScope: 'single',
                            blockDescription: '',
                            endTime: '',
                            duration: prev.duration || 60,
                            professionalId: role === 'pro' && professionalId ? professionalId : ''
                          }));
                          if (currentStep > 3) {
                            setCurrentStep(3);
                          }
                        }}
                        className={cn(
                          'text-xs font-semibold',
                          formData.isBlock
                            ? cn(
                                'text-white',
                                hasGradient
                                  ? isCustom && gradientStyleHorizontal
                                    ? ''
                                    : 'bg-gradient-to-r from-indigo-500 to-rose-500'
                                  : 'bg-slate-900'
                              )
                            : cn(
                                'text-slate-700',
                                isCustom && 'border-slate-300 hover:bg-slate-100'
                              )
                        )}
                        style={formData.isBlock && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                      >
                        Bloqueio
                      </Button>
                    </div>

                    {formData.isBlock ? (
                      <div
                        className={cn(
                          'rounded-xl border px-4 py-4 text-sm leading-relaxed',
                          isVibrant
                            ? 'border-white/30 bg-white/60 text-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        Bloqueios não estão associados a {pluralTitle}. Use este registro apenas para
                        sinalizar indisponibilidades na agenda.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label
                            className={cn(
                              'block text-sm font-medium mb-2',
                              isVibrant ? 'text-slate-700' : 'text-slate-600'
                            )}
                          >
                            {singularTitle}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPatientModal(true);
                              setPatientQuery('');
                            }}
                            className={cn(
                              'w-full rounded-lg border transition-all text-left px-4 py-3 text-base',
                              'focus:outline-none focus:ring-2 focus:ring-offset-2',
                              selectedPatient
                                ? isVibrant
                                  ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                                  : 'border-gray-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                                : isVibrant
                                ? 'border-white/30 bg-white/60 text-slate-500 focus:border-indigo-300 focus:ring-indigo-300'
                                : 'border-gray-300 bg-white text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                            )}
                          >
                            {selectedPatient ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">{selectedPatient.nome}</span>
                                <span className="text-xs text-slate-500">
                                  {formatPhoneNumber(selectedPatient.telefoneE164)}
                                </span>
                              </div>
                            ) : (
                              <span>{`Selecione ou busque ${singularLabel}`}</span>
                            )}
                          </button>
                        </div>

                        <Button
                          type="button"
                          onClick={() => setShowNewPatientModal(true)}
                          variant="outline"
                          disabled={formData.isBlock}
                          className={cn(
                            'mt-3 flex h-11 items-center justify-center gap-2 text-sm',
                            isVibrant
                              ? 'border-white/30 text-slate-800 hover:bg-white/30 hover:text-indigo-600'
                              : ''
                          )}
                        >
                          <Plus className="h-4 w-4" />
                          Cadastrar {singularTitle}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Serviço */}
              {currentStep === 2 && (
                <Card className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Escolha o Serviço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.isBlock ? (
                      <div
                        className={cn(
                          'rounded-xl border px-4 py-4 text-sm leading-relaxed',
                          isVibrant
                            ? 'border-white/30 bg-white/60 text-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        Bloqueios não exigem seleção de serviço. Eles apenas reservam o horário indicado.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label
                            className={cn(
                              'block text-sm font-medium mb-2',
                              isVibrant ? 'text-slate-700' : 'text-slate-600'
                            )}
                          >
                            Serviço
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowServiceModal(true);
                              setServiceQuery('');
                            }}
                            className={cn(
                              'w-full rounded-lg border transition-all text-left px-4 py-3 text-base',
                              'focus:outline-none focus:ring-2 focus:ring-offset-2',
                              formData.serviceId.length > 0
                                ? isVibrant
                                  ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                                  : 'border-gray-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                                : isVibrant
                                ? 'border-white/30 bg-white/60 text-slate-500 focus:border-indigo-300 focus:ring-indigo-300'
                                : 'border-gray-300 bg-white text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                            )}
                          >
                            {formData.serviceId.length > 0 ? (
                              (() => {
                                const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                                const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                                const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900">
                                      {selectedServicesList.length === 1 
                                        ? selectedServicesList[0].nome
                                        : `${selectedServicesList.length} serviços selecionados`}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      R$ {(totalPrice / 100).toFixed(2)} • {totalDuration} min
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span>Selecione um ou mais serviços</span>
                            )}
                          </button>
                        </div>
                        {formData.serviceId.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Duração Total</p>
                              <p className="text-sm font-semibold text-green-900">
                                {(() => {
                                  const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                                  const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                                  return `${totalDuration} min`;
                                })()}
                              </p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Preço Total</p>
                              <p className="text-sm font-semibold text-green-900">
                                {(() => {
                                  const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                                  const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                                  return `R$ ${(totalPrice / 100).toFixed(2)}`;
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Profissional */}
              {currentStep === 3 && (
                <Card className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Escolha o Profissional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.isBlock && (
                      <div
                        className={cn(
                          'rounded-xl border px-4 py-3',
                          isVibrant
                            ? 'border-white/30 bg-white/60 text-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        <p className="text-sm font-medium mb-2">Escopo do bloqueio</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={formData.blockScope === 'single' ? 'default' : 'outline'}
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                blockScope: 'single',
                                professionalId: role === 'pro' && professionalId ? professionalId : prev.professionalId || ''
                              }))
                            }
                            className={cn(
                              'text-xs font-semibold px-3',
                              formData.blockScope === 'single'
                                ? hasGradient
                              ? isCustom && gradientStyleHorizontal
                                ? 'text-white'
                                : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white'
                              : 'bg-slate-900 text-white'
                                : ''
                            )}
                          >
                            Profissional específico
                          </Button>
                          <Button
                            type="button"
                            variant={formData.blockScope === 'all' ? 'default' : 'outline'}
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                blockScope: 'all',
                                professionalId: '__all__'
                              }))
                            }
                            className={cn(
                              'text-xs font-semibold px-3',
                              formData.blockScope === 'all'
                                ? hasGradient
                              ? isCustom && gradientStyleHorizontal
                                ? 'text-white'
                                : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white'
                              : 'bg-slate-900 text-white'
                                : ''
                            )}
                          >
                            Todos os profissionais
                          </Button>
                        </div>
                        <p className="text-xs mt-2 text-slate-500">
                          Bloqueios gerais aparecerão em todas as agendas.
                        </p>
                      </div>
                    )}

                    <div>
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          isVibrant ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        Profissional
                        {role === 'pro' && (
                          <span className="text-xs text-gray-500 ml-2">(Você está logado como profissional)</span>
                        )}
                      </label>
                      <select
                        value={
                          formData.isBlock && formData.blockScope === 'all'
                            ? '__all__'
                            : formData.professionalId
                        }
                        onChange={(e) => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
                        disabled={
                          (formData.isBlock && formData.blockScope === 'all') ||
                          (role === 'pro' && !formData.isBlock)
                        }
                        className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                          (formData.isBlock && formData.blockScope === 'all') || (role === 'pro' && !formData.isBlock)
                            ? 'bg-gray-100 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <option value="">Selecione um profissional</option>
                        {formData.isBlock && <option value="__all__">Todos os profissionais</option>}
                        {professionals.map(professional => (
                          <option key={professional.id} value={professional.id}>
                            {professional.apelido}
                          </option>
                        ))}
                      </select>
                      {role === 'pro' && (
                        <p className="text-xs text-gray-600 mt-1">
                          Você não pode alterar o profissional pois está logado como profissional.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Data e Hora */}
              {currentStep === 4 && (
                <Card 
                  className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}
                  style={{ overflow: 'visible', position: 'relative' }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Data e Hora
                    </CardTitle>
                  </CardHeader>
                  <CardContent 
                    className="space-y-4" 
                    style={{ 
                      paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                      overflow: 'visible',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          isVibrant ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        Data
                      </label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="p-3 text-base"
                      />
                    </div>
                    <div>
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          isVibrant ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        Hora
                      </label>
                      {formData.date && formData.professionalId && !formData.isBlock ? (
                        <div className="space-y-3">
                          {!formData.duration ? (
                            <div className={cn(
                              'rounded-lg p-4 text-center',
                              isVibrant
                                ? 'bg-white/60 border border-white/30 text-slate-600'
                                : 'bg-slate-50 border border-slate-200 text-slate-500'
                            )}>
                              <p className="text-sm">Selecione um serviço primeiro para ver os horários disponíveis</p>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                {availableTimeSlots.map((slot) => (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, time: slot.time }));
                                      setShowCustomTime(false);
                                    }}
                                    className={cn(
                                      'relative px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                                      'focus:outline-none focus:ring-2 focus:ring-offset-2',
                                      formData.time === slot.time
                                        ? isVibrant
                                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl scale-110 ring-4 ring-emerald-300/50 z-10 border-2 border-white'
                                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl scale-110 ring-4 ring-emerald-200 z-10 border-2 border-white'
                                        : slot.disabled
                                        ? isVibrant
                                          ? 'bg-amber-50/80 border-2 border-amber-300/50 text-amber-700 hover:bg-amber-100/90 hover:border-amber-400 hover:shadow-md active:scale-95'
                                          : 'bg-amber-50 border-2 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 hover:shadow-sm active:scale-95'
                                        : isVibrant
                                        ? 'bg-white/75 border border-white/30 text-slate-700 hover:bg-white/90 hover:border-indigo-300 hover:shadow-md active:scale-95'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm active:scale-95'
                                    )}
                                  >
                                    {slot.label}
                                    {slot.disabled && (
                                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full -mt-1 -mr-1 ring-2 ring-white" title="Horário ocupado" />
                                    )}
                                  </button>
                                ))}
                              </div>
                              {dayAppointments.length > 0 && (
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                  {dayAppointments.length} horário{dayAppointments.length !== 1 ? 's' : ''} ocupado{dayAppointments.length !== 1 ? 's' : ''} neste dia
                                </p>
                              )}
                              {formData.date && formData.professionalId && !formData.isBlock && formData.duration && (
                                <div 
                                  className="pt-3 border-t border-slate-200 mt-4" 
                                  style={{ 
                                    marginBottom: '1rem',
                                    paddingBottom: '0.5rem',
                                    position: 'relative',
                                    zIndex: 10,
                                    marginTop: '1.5rem'
                                  }}
                                >
                                  {!showCustomTime ? (
                                    <button
                                      ref={customTimeButtonRef}
                                      type="button"
                                      id="custom-time-button"
                                      onClick={() => {
                                        setShowCustomTime(true);
                                        // Se não houver hora selecionada nos slots, manter vazio
                                        // Caso contrário, manter a hora atual
                                      }}
                                      className={cn(
                                        'w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                                        'focus:outline-none focus:ring-2 focus:ring-offset-2',
                                        'relative z-10',
                                        'shadow-sm',
                                        'block',
                                        isVibrant
                                          ? 'bg-white/80 border-2 border-white/50 text-slate-700 hover:bg-white hover:border-indigo-300 hover:shadow-md'
                                          : 'bg-slate-50 border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-400 hover:shadow-md'
                                      )}
                                      style={{ 
                                        minHeight: '48px',
                                        display: 'block',
                                        width: '100%',
                                        visibility: 'visible',
                                        opacity: 1,
                                        position: 'relative',
                                        zIndex: 10
                                      }}
                                    >
                                      + Outra hora
                                    </button>
                                  ) : (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-slate-600">
                                        Insira uma hora personalizada
                                      </label>
                                      <Input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => {
                                          setFormData(prev => ({ ...prev, time: e.target.value }));
                                        }}
                                        min="08:00"
                                        max="22:00"
                                        className="p-3 text-base"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Se a hora personalizada estiver nos slots, manter selecionada
                                          const isInSlots = availableTimeSlots.some(slot => slot.time === formData.time);
                                          if (!isInSlots) {
                                            setFormData(prev => ({ ...prev, time: '' }));
                                          }
                                          setShowCustomTime(false);
                                        }}
                                        className={cn(
                                          'w-full px-3 py-1.5 rounded text-xs font-medium transition-all',
                                          isVibrant
                                            ? 'text-slate-600 hover:text-slate-800'
                                            : 'text-slate-500 hover:text-slate-700'
                                        )}
                                      >
                                        Usar horários pré-definidos
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <Input
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                          className="p-3 text-base"
                        />
                      )}
                    </div>
                    {!formData.isBlock && (
                      <div>
                        <label
                          className={cn(
                            'block text-sm font-medium mb-2',
                            isVibrant ? 'text-slate-700' : 'text-slate-600'
                          )}
                        >
                          Duração
                          {formData.serviceId.length > 0 && (() => {
                            const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                            const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                            const suggestedDuration = totalDuration || 60;
                            return formData.duration === suggestedDuration ? (
                              <span className="text-xs text-slate-500 ml-2">(sugerida pelo serviço)</span>
                            ) : null;
                          })()}
                        </label>
                        <select
                          value={formData.duration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value, 10);
                            setFormData(prev => ({ ...prev, duration: newDuration }));
                          }}
                          className={cn(
                            'w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-base',
                            isVibrant
                              ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                              : 'border-gray-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                          )}
                        >
                          {durationOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formData.time && formData.endTime && (
                          <p className="mt-1 text-xs text-slate-500">
                            Término: {formData.endTime}
                          </p>
                        )}
                      </div>
                    )}
                    {formData.isBlock && (
                      <div>
                        <label
                          className={cn(
                            'block text-sm font-medium mb-2',
                            isVibrant ? 'text-slate-700' : 'text-slate-600'
                          )}
                        >
                          Hora de término
                        </label>
                        <Input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                          className="p-3 text-base"
                        />
                      </div>
                    )}
                    {!formData.isBlock && (
                      <div
                        className={cn(
                          'rounded-xl border p-4 space-y-4',
                          isVibrant
                            ? 'border-white/30 bg-white/60 text-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">Agendamento recorrente</p>
                            <p className="text-xs text-slate-500">
                              Repete automaticamente este atendimento em intervalos regulares.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.recurrenceEnabled}
                            disabled={Boolean(editingAppointment) && !formData.recurrenceEnabled}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                recurrenceEnabled: e.target.checked,
                                recurrenceEndsOn: e.target.checked
                                  ? prev.recurrenceEndsOn || prev.date
                                  : '',
                              }))
                            }
                            className="w-5 h-5 rounded border-gray-300"
                          />
                        </div>

                        {Boolean(editingAppointment) && !formData.recurrenceEnabled && (
                          <p className="text-xs text-slate-500">
                            Para configurar recorrência em um agendamento já existente, crie uma nova série.
                          </p>
                        )}

                        {formData.recurrenceEnabled && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium mb-2 text-slate-500">
                                Frequência
                              </label>
                              <select
                                value={formData.recurrenceFrequency}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    recurrenceFrequency: e.target.value as FormData['recurrenceFrequency'],
                                  }))
                                }
                                className={cn(
                                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                                  isVibrant
                                    ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                                    : 'border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                                )}
                              >
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quinzenal</option>
                                <option value="monthly">Mensal</option>
                                <option value="custom">Personalizada</option>
                              </select>
                            </div>
                            {formData.recurrenceFrequency === 'custom' && (
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium mb-2 text-slate-500">
                                  Intervalo (em dias)
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={formData.recurrenceCustomInterval}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value) && value > 0) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        recurrenceCustomInterval: Math.min(365, Math.max(1, value)),
                                      }));
                                    }
                                  }}
                                  className={cn(
                                    'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
                                    isVibrant
                                      ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                                      : 'border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                                  )}
                                  placeholder="Ex: 3, 5, 10..."
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                  O agendamento será repetido a cada {formData.recurrenceCustomInterval} dia{formData.recurrenceCustomInterval !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-medium mb-2 text-slate-500">
                                Repetir até
                              </label>
                              <Input
                                type="date"
                                min={formData.date || undefined}
                                value={formData.recurrenceEndsOn}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    recurrenceEndsOn: e.target.value,
                                  }))
                                }
                                className={cn(
                                  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
                                  isVibrant
                                    ? 'border-white/30 bg-white/75 text-slate-800 focus:border-indigo-300 focus:ring-indigo-300'
                                    : 'border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-500'
                                )}
                              />
                              <p className="mt-1 text-[11px] text-slate-500">
                                O limite máximo é de 1 ano a partir da data inicial.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Espaçamento extra no mobile para evitar sobreposição com o botão do footer */}
                  <div className="h-20 sm:h-0" />
                </Card>
              )}

              {/* Step 5: Detalhes */}
              {currentStep === 5 && (
                <Card className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Detalhes Finais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.isBlock ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Descrição do bloqueio</label>
                          <textarea
                            value={formData.blockDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, blockDescription: e.target.value }))}
                            placeholder="Descreva o motivo da indisponibilidade..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
                            rows={4}
                          />
                        </div>
                        <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 text-violet-800 text-sm leading-relaxed">
                          Este bloqueio será exibido na agenda do(s) profissional(is) selecionado(s) e não enviará notificações.
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Observações</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Observações adicionais..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
                            rows={4}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Preço (opcional)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={(formData.price / 100).toFixed(2)}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                price: Number.isNaN(value) ? 0 : Math.max(0, Math.round(value * 100))
                              }));
                            }}
                            placeholder="0,00"
                            className="p-3 text-base"
                          />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <input
                            type="checkbox"
                            id="enviarNotificacao"
                            checked={formData.enviarNotificacao !== false}
                            onChange={(e) => setFormData(prev => ({ ...prev, enviarNotificacao: e.target.checked }))}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <label htmlFor="enviarNotificacao" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Enviar notificação para o cliente
                          </label>
                        </div>
                      </>
                    )}

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Resumo</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {formData.isBlock ? (
                          <>
                            <li>
                              <strong>Escopo:</strong>{' '}
                              {formData.blockScope === 'all' ? 'Todos os profissionais' : 'Profissional específico'}
                            </li>
                            {formData.blockScope === 'single' && (
                              <li>
                                <strong>Profissional:</strong>{' '}
                                {professionals.find(p => p.id === formData.professionalId)?.apelido || 'Não selecionado'}
                              </li>
                            )}
                            <li><strong>Data:</strong> {formData.date ? (() => {
                              const [year, month, day] = formData.date.split('-');
                              return `${day}/${month}/${year}`;
                            })() : 'Não definida'}</li>
                            <li>
                              <strong>Horário:</strong>{' '}
                              {formData.time ? formData.time : '—'}
                              {formData.endTime ? ` às ${formData.endTime}` : ''}
                            </li>
                            <li><strong>Descrição:</strong> {formData.blockDescription || 'Sem descrição'}</li>
                          </>
                        ) : (
                          <>
                            <li><strong>Cliente:</strong> {selectedPatient?.nome || 'Não selecionado'}</li>
                            <li>
                              <strong>Serviço{formData.serviceId.length !== 1 ? 's' : ''}:</strong>{' '}
                              {formData.serviceId.length > 0
                                ? (() => {
                                    const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                                    return selectedServicesList.length > 0
                                      ? selectedServicesList.map(s => s.nome).join(', ')
                                      : 'Não selecionado';
                                  })()
                                : 'Não selecionado'}
                            </li>
                            <li><strong>Profissional:</strong> {professionals.find(p => p.id === formData.professionalId)?.apelido || 'Não selecionado'}</li>
                            <li><strong>Data:</strong> {formData.date ? (() => {
                              const [year, month, day] = formData.date.split('-');
                              return `${day}/${month}/${year}`;
                            })() : 'Não definida'}</li>
                            <li><strong>Hora:</strong> {formData.time || 'Não definida'}</li>
                            <li><strong>Duração:</strong> {formData.duration} minutos</li>
                            {formData.recurrenceEnabled && (
                              <li>
                                <strong>Recorrência:</strong>{' '}
                                {({
                                  daily: 'Diariamente',
                                  weekly: 'Semanal',
                                  biweekly: 'Quinzenal',
                                  monthly: 'Mensal',
                                  custom: `A cada ${formData.recurrenceCustomInterval} dia${formData.recurrenceCustomInterval !== 1 ? 's' : ''}`,
                                } as Record<string, string>)[formData.recurrenceFrequency]}{' '}
                                até{' '}
                                {formData.recurrenceEndsOn
                                  ? (() => {
                                      const [year, month, day] = formData.recurrenceEndsOn.split('-');
                                      return `${day}/${month}/${year}`;
                                    })()
                                  : 'data não definida'}
                              </li>
                            )}
                            <li><strong>Preço:</strong> R$ {(formData.price / 100).toFixed(2)}</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 6: Pagamento (apenas para agendamentos concluídos) */}
              {currentStep === 6 && editingAppointment?.status === 'concluido' && (
                <Card className={cn(isVibrant ? 'border-white/25 bg-white/70 backdrop-blur' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Informações de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Valor Pago</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorPago || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, valorPago: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="p-3 text-base"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Forma de Pagamento</label>
                      <select
                        value={formData.formaPagamento || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, formaPagamento: e.target.value as any }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      >
                        <option value="">Selecione...</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="pix">PIX</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="clientePresente"
                        checked={formData.clientePresente || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientePresente: e.target.checked }))}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                      <label htmlFor="clientePresente" className="text-sm font-medium">
                        {singularTitle} compareceu ao atendimento
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer - Sticky at bottom */}
        <div
          className={cn(
            'border-t z-[100] flex-shrink-0',
            hasGradient ? 'bg-white/95 border-white/20 backdrop-blur' : 'bg-white'
          )}
          style={{
            paddingTop: currentStep === 4 && formData.date && formData.professionalId && !formData.isBlock && formData.duration ? '0.75rem' : '1rem',
            paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`,
            paddingLeft: `calc(1rem + env(safe-area-inset-left, 0px))`,
            paddingRight: `calc(1rem + env(safe-area-inset-right, 0px))`,
            position: 'relative',
            zIndex: 100,
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'visible'
          }}
        >
          {/* Botão "+ Outra hora" no mobile quando estiver no step 4 */}
          {currentStep === 4 && formData.date && formData.professionalId && !formData.isBlock && formData.duration && (
            <div className="mb-3 px-4 sm:hidden" style={{ marginBottom: '0.75rem' }}>
              {!showCustomTime ? (
                <button
                  ref={customTimeButtonRef}
                  type="button"
                  id="custom-time-button-mobile"
                  onClick={() => {
                    setShowCustomTime(true);
                  }}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'shadow-sm',
                    isVibrant
                      ? 'bg-white/80 border-2 border-white/50 text-slate-700 hover:bg-white hover:border-indigo-300 hover:shadow-md'
                      : 'bg-slate-50 border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-400 hover:shadow-md'
                  )}
                  style={{ 
                    minHeight: '48px',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  + Outra hora
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Insira uma hora personalizada
                  </label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, time: e.target.value }));
                    }}
                    min="08:00"
                    max="22:00"
                    className="p-3 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const isInSlots = availableTimeSlots.some(slot => slot.time === formData.time);
                      if (!isInSlots) {
                        setFormData(prev => ({ ...prev, time: '' }));
                      }
                      setShowCustomTime(false);
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 rounded text-xs font-medium transition-all',
                      isVibrant
                        ? 'text-slate-600 hover:text-slate-800'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Usar horários pré-definidos
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className={cn(
            "flex items-center justify-between gap-2 sm:gap-3",
            currentStep === 4 && formData.date && formData.professionalId && !formData.isBlock && formData.duration ? "pt-2" : ""
          )}
          style={{
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'visible'
          }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className={cn(
                  'flex h-12 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-w-[48px]',
                  'border-2 border-slate-500 text-slate-900 bg-white hover:bg-slate-100',
                  'shadow-md active:shadow-inner relative z-[101]'
                )}
                style={{ zIndex: 101 }}
                type="button"
              >
                <X className="w-5 h-5 flex-shrink-0 text-slate-900" />
                <span className="hidden sm:inline font-medium text-slate-900">Fechar</span>
              </Button>
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={cn(
                  'flex h-12 items-center gap-1.5 sm:gap-2 px-3 sm:px-4',
                  hasGradient ? 'border-white/25 text-slate-700 hover:bg-white/40' : ''
                )}
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Anterior</span>
                <span className="sm:hidden">Anterior</span>
              </Button>
            </div>

            {currentStep < (editingAppointment?.status === 'concluido' ? 6 : 5) ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className={cn(
                  'flex h-12 items-center gap-2 px-4 sm:px-6 text-white flex-shrink-0',
                  hasGradient
                    ? isCustom && gradientStyleDiagonal
                      ? ''
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-none'
                )}
                style={{
                  ...(isCustom && gradientStyleDiagonal ? gradientStyleDiagonal : {}),
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                Próximo
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={cn(
                  'flex h-12 items-center gap-2 px-4 sm:px-6 text-white flex-shrink-0',
                  hasGradient
                    ? isCustom && gradientStyleDiagonal
                      ? ''
                      : 'bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 hover:from-emerald-500 hover:via-sky-600 hover:to-indigo-600'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-none'
                )}
                style={{
                  ...(isCustom && gradientStyleDiagonal ? gradientStyleDiagonal : {}),
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {editingAppointment ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingAppointment ? 'Atualizar Agendamento' : 'Criar Agendamento'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal Novo Paciente/Cliente */}
      {showNewPatientModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto',
            isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'w-full max-w-md rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] my-4',
              isVibrant ? 'bg-white/85 border-white/25 backdrop-blur-2xl' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Novo {singularTitle}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewPatientModal(false)}
                className={cn(isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome *</label>
                <Input
                  value={newPatientData.nome}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder={`Nome completo do ${singularLabel}`}
                  className="p-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefone *</label>
                <Input
                  type="tel"
                  value={newPatientData.telefoneE164}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, telefoneE164: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                  className="p-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email (opcional)</label>
                <Input
                  type="email"
                  value={newPatientData.email}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={`${singularLabel}@email.com`}
                  className="p-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CPF (opcional)</label>
                <Input
                  type="text"
                  value={newPatientData.cpf}
                  onChange={(e) => {
                    // Formatar CPF automaticamente
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                      setNewPatientData(prev => ({ ...prev, cpf: value }));
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="p-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Anamnese (opcional)</label>
                <textarea
                  value={newPatientData.anamnese}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, anamnese: e.target.value }))}
                  placeholder="Observações clínicas, alergias, tratamentos em andamento..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[100px] resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferência de Notificação</label>
                <select
                  value={newPatientData.preferenciaNotificacao}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, preferenciaNotificacao: e.target.value as 'whatsapp' | 'sms' | 'email' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

            </div>

            <div className="p-6 pt-4 border-t flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowNewPatientModal(false)}
                className={cn('flex-1', hasGradient ? 'border-white/30 text-slate-700 hover:bg-white/40' : '')}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNewPatient}
                disabled={!newPatientData.nome || !newPatientData.telefoneE164}
                  className={cn(
                    'flex-1 text-white',
                    hasGradient
                      ? isCustom && gradientStyleDiagonal
                        ? ''
                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  )}
                  style={isCustom && gradientStyleDiagonal ? gradientStyleDiagonal : undefined}
                >
                  Criar {singularTitle}
                </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal Seleção de Cliente */}
      {showPatientModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[70] flex items-start justify-center p-4 pt-8 sm:pt-16 backdrop-blur-sm overflow-y-auto',
            isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
          )}
          onClick={() => setShowPatientModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] mt-0',
              isVibrant ? 'bg-white/95 border-white/25 backdrop-blur-2xl' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900">Selecionar {singularTitle}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPatientModal(false)}
                className={cn(isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder={`Buscar ${singularLabel} por nome, telefone ou email`}
                  className="pl-10 pr-4 py-3 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">Nenhum {singularLabel} encontrado</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPatientModal(false);
                      setShowNewPatientModal(true);
                    }}
                    className={cn(hasGradient ? 'border-white/30 text-slate-700 hover:bg-white/40' : '')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Novo {singularTitle}
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        handlePatientSelect(patient);
                        setShowPatientModal(false);
                        setPatientQuery('');
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-lg transition-all',
                        'flex items-center justify-between gap-3',
                        selectedPatient?.id === patient.id
                          ? isVibrant
                            ? 'bg-indigo-500/20 border-2 border-indigo-500'
                            : 'bg-blue-50 border-2 border-blue-500'
                          : isVibrant
                          ? 'hover:bg-white/60 border border-transparent hover:border-white/30'
                          : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                      )}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-slate-900 truncate">{patient.nome}</span>
                        <span className="text-xs text-slate-500">
                          {formatPhoneNumber(patient.telefoneE164)}
                        </span>
                        {patient.email && (
                          <span className="text-xs text-slate-500 truncate">{patient.email}</span>
                        )}
                      </div>
                      {selectedPatient?.id === patient.id && (
                        <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPatientModal(false);
                  setShowNewPatientModal(true);
                }}
                className={cn('w-full', hasGradient ? 'border-white/30 text-slate-700 hover:bg-white/40' : '')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Novo {singularTitle}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal Seleção de Serviço */}
      {showServiceModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-[70] flex items-start justify-center p-4 pt-8 sm:pt-16 backdrop-blur-sm overflow-y-auto',
            isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
          )}
          onClick={() => setShowServiceModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] mt-0',
              isVibrant ? 'bg-white/95 border-white/25 backdrop-blur-2xl' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900">Selecionar Serviço</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowServiceModal(false)}
                className={cn(isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  value={serviceQuery}
                  onChange={(e) => setServiceQuery(e.target.value)}
                  placeholder="Buscar serviço por nome"
                  className="pl-10 pr-4 py-3 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {services.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className={cn(
                    'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                    isVibrant
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-blue-100 text-blue-600'
                  )}>
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className={cn(
                    'text-lg font-semibold mb-2',
                    isVibrant ? 'text-slate-900' : 'text-gray-900'
                  )}>
                    Nenhum serviço cadastrado
                  </h3>
                  <p className={cn(
                    'text-sm mb-6',
                    isVibrant ? 'text-slate-600' : 'text-gray-600'
                  )}>
                    Você precisa cadastrar serviços antes de criar agendamentos.
                  </p>
                  <Button
                    onClick={() => {
                      setShowServiceModal(false);
                      router.push('/servicos');
                    }}
                    className={cn(
                      'w-full',
                      isVibrant
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Serviços
                  </Button>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">Nenhum serviço encontrado para "{serviceQuery}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredServices.map((service) => {
                    const isSelected = formData.serviceId.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer',
                          'flex items-center gap-3',
                          isSelected
                            ? isVibrant
                              ? 'bg-indigo-500/20 border-2 border-indigo-500'
                              : 'bg-blue-50 border-2 border-blue-500'
                            : isVibrant
                            ? 'hover:bg-white/60 border border-transparent hover:border-white/30'
                            : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Adicionar serviço
                              setFormData(prev => ({
                                ...prev,
                                serviceId: [...prev.serviceId, service.id]
                              }));
                            } else {
                              // Remover serviço
                              setFormData(prev => ({
                                ...prev,
                                serviceId: prev.serviceId.filter(id => id !== service.id)
                              }));
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-semibold text-slate-900 truncate">{service.nome}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">
                              R$ {(service.precoCentavos / 100).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              {service.duracaoMin} min
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50">
              {formData.serviceId.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {formData.serviceId.length} serviço{formData.serviceId.length !== 1 ? 's' : ''} selecionado{formData.serviceId.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, serviceId: [] }));
                      }}
                      className="text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-semibold text-slate-900">
                      {(() => {
                        const selectedServicesList = services.filter(s => formData.serviceId.includes(s.id));
                        const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                        const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                        return `R$ ${(totalPrice / 100).toFixed(2)} • ${totalDuration} min`;
                      })()}
                    </span>
                  </div>
                  <Button
                    onClick={() => setShowServiceModal(false)}
                    className={cn(
                      'w-full',
                      isVibrant
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                  >
                    Confirmar
                  </Button>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-slate-500 mb-3">Selecione pelo menos um serviço</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowServiceModal(false)}
                    className={cn('w-full', hasGradient ? 'border-white/30 text-slate-700 hover:bg-white/40' : '')}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
