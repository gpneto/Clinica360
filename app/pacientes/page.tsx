'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePatients, useCompany } from '@/hooks/useFirestore';
import { Patient } from '@/types';
import { Plus, Edit, Trash2, Users, Phone, Mail, MessageCircle, ClipboardList, FolderOpen, X, AlertTriangle, Table } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { canAccessPatientDebits } from '@/lib/permissions';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { TAB_ITEMS } from '@/app/pacientes/detalhe/constants';

export default function PatientsPage() {
  const { companyId, user, userData, themePreference, customColor, customColor2 } = useAuth();
  const router = useRouter();
  const { patients, loading, error, createPatient, updatePatient, deletePatient } = usePatients(companyId);
  const { company } = useCompany(companyId);
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const isDentist = company?.tipoEstabelecimento === 'dentista';
  
  // Criar objeto user completo para verificação de permissões
  const userWithPermissions = userData && user ? {
    uid: user.uid,
    role: userData.role,
    permissions: userData.permissions,
  } : null;
  
  // Função para verificar se uma aba está disponível para o usuário
  const isTabAvailable = (tabId: string) => {
    const tab = TAB_ITEMS.find(t => t.id === tabId);
    if (!tab) return false;
    
    // Se a tab requer permissão de débitos, verificar se o usuário tem acesso
    if ('requiresDebitsPermission' in tab && tab.requiresDebitsPermission && (tab.id === 'orcamentos' || tab.id === 'financeiro')) {
      return canAccessPatientDebits(userWithPermissions as any);
    }
    
    // Se a tab requer dentista, verificar se o tipo de estabelecimento é dentista
    if ('requiresDentist' in tab && tab.requiresDentist && tab.id === 'ficha_odontologica') {
      return isDentist;
    }
    
    return true;
  };
  
  // Filtrar abas disponíveis
  const availableTabs = TAB_ITEMS.filter(tab => isTabAvailable(tab.id));
  
  // Handler para quando uma aba é selecionada
  const handleTabSelect = (patientId: string, tabId: string) => {
    router.push(`/pacientes/detalhe?patientId=${patientId}&tab=${tabId}`);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'duplicates' | 'list'>('list');
  const [formData, setFormData] = useState({
    nome: '',
    telefoneE164: '',
    email: '',
    cpf: '',
    preferenciaNotificacao: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
    anamnese: '',
    dataNascimento: '' as string
  });
  const labels = useCustomerLabels();
  const singularLabel = labels.singular;
  const singularTitle = labels.singularTitle;
  const pluralLabel = labels.plural;
  const pluralTitle = labels.pluralTitle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      console.error('companyId não está definido');
      alert('Erro: Não foi possível identificar a empresa. Por favor, faça login novamente.');
      return;
    }
    
    try {
      // Converter dataNascimento de string para Date se fornecido
      // Usar startOfDay para garantir que a data seja meia-noite na timezone local, não UTC
      const patientData = {
        ...formData,
        telefoneE164: formData.telefoneE164.trim() || undefined, // Permitir telefone vazio
        dataNascimento: formData.dataNascimento ? startOfDay(new Date(formData.dataNascimento + 'T00:00:00')) : undefined
      };

      if (editingPatient) {
        await updatePatient(editingPatient.id, patientData);
      } else {
        await createPatient({
          ...patientData,
          companyId,
          ownerUid: user?.uid || 'current-user'
        });
      }
      setIsModalOpen(false);
      setEditingPatient(null);
      setFormData({
        nome: '',
        telefoneE164: '',
        email: '',
        cpf: '',
        preferenciaNotificacao: 'whatsapp',
        anamnese: '',
        dataNascimento: ''
      });
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    // Formatar data de nascimento para o input (YYYY-MM-DD)
    let dataNascimentoFormat = '';
    if (patient.dataNascimento) {
      try {
        let date: Date;
        if (patient.dataNascimento instanceof Date) {
          date = patient.dataNascimento;
        } else if (patient.dataNascimento && typeof patient.dataNascimento === 'object' && 'toDate' in patient.dataNascimento) {
          // Firestore Timestamp
          date = (patient.dataNascimento as any).toDate();
        } else {
          date = new Date(patient.dataNascimento);
        }
        
        // Verificar se a data é válida antes de chamar toISOString
        if (!isNaN(date.getTime())) {
          dataNascimentoFormat = date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Erro ao formatar data de nascimento:', error);
        dataNascimentoFormat = '';
      }
    }
    
    setFormData({
      nome: patient.nome,
      telefoneE164: patient.telefoneE164 || '',
      email: patient.email || '',
      cpf: patient.cpf || '',
      preferenciaNotificacao: patient.preferenciaNotificacao,
      anamnese: patient.anamnese || '',
      dataNascimento: dataNascimentoFormat
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPatientToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) return;
    
    try {
      await deletePatient(patientToDelete);
      setIsDeleteDialogOpen(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
    }
  };

  const formatPhone = (phone: string | undefined) => {
    if (!phone) return 'Sem telefone';
    // Formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const getNotificationIcon = (preferencia: string) => {
    const iconColor = isCustom && gradientColors ? gradientColors.start : undefined;
    switch (preferencia) {
      case 'whatsapp':
        return <MessageCircle className={cn('w-4 h-4', isVibrant ? 'text-green-600' : isNeutral ? 'text-slate-600' : 'text-green-600')} style={iconColor ? { color: iconColor } : undefined} />;
      case 'sms':
        return <Phone className={cn('w-4 h-4', isVibrant ? 'text-blue-600' : isNeutral ? 'text-slate-600' : 'text-blue-600')} style={iconColor ? { color: iconColor } : undefined} />;
      case 'email':
        return <Mail className={cn('w-4 h-4', isVibrant ? 'text-purple-600' : isNeutral ? 'text-slate-600' : 'text-purple-600')} style={iconColor ? { color: iconColor } : undefined} />;
      default:
        return <MessageCircle className={cn('w-4 h-4', isVibrant ? 'text-gray-600' : isNeutral ? 'text-slate-600' : 'text-gray-600')} style={iconColor ? { color: iconColor } : undefined} />;
    }
  };

  const getNotificationLabel = (preferencia: string) => {
    switch (preferencia) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'sms':
        return 'SMS';
      case 'email':
        return 'E-mail';
      default:
        return 'WhatsApp';
    }
  };

  // Detectar pacientes com telefones duplicados
  const patientsWithDuplicatePhones = useMemo(() => {
    const phoneMap = new Map<string, Patient[]>();
    
    // Agrupar pacientes por telefone
    patients.forEach(patient => {
      if (patient.telefoneE164) {
        const phone = patient.telefoneE164;
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, []);
        }
        phoneMap.get(phone)!.push(patient);
      }
    });
    
    // Retornar apenas telefones que aparecem mais de uma vez
    const duplicates = new Set<string>();
    phoneMap.forEach((patientList, phone) => {
      if (patientList.length > 1) {
        duplicates.add(phone);
      }
    });
    
    // Retornar todos os pacientes que têm telefones duplicados
    return patients.filter(patient => 
      patient.telefoneE164 && duplicates.has(patient.telefoneE164)
    );
  }, [patients]);

  // Verificar se um paciente tem telefone duplicado
  const duplicatePhonesSet = useMemo(() => {
    const phoneMap = new Map<string, number>();
    const duplicates = new Set<string>();
    
    patients.forEach(patient => {
      if (patient.telefoneE164) {
        const count = phoneMap.get(patient.telefoneE164) || 0;
        phoneMap.set(patient.telefoneE164, count + 1);
        if (count + 1 > 1) {
          duplicates.add(patient.telefoneE164);
        }
      }
    });
    
    return duplicates;
  }, [patients]);

  const hasDuplicatePhone = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.telefoneE164 && duplicatePhonesSet.has(patient.telefoneE164);
  };

  const filteredPatients = useMemo(() => {
    const normalizeString = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    // Filtrar por aba primeiro
    let basePatients = activeTab === 'duplicates' 
      ? patientsWithDuplicatePhones 
      : activeTab === 'list'
      ? patients
      : patients;

    // Depois filtrar por busca
    const term = searchTerm.trim();
    const normalizedTerm = normalizeString(term);
    if (!normalizedTerm) return basePatients;
    return basePatients.filter((patient) => {
      const name = patient.nome ? normalizeString(patient.nome) : '';
      const phone = patient.telefoneE164 ? normalizeString(patient.telefoneE164) : '';
      const email = patient.email ? normalizeString(patient.email) : '';
      return (
        name.includes(normalizedTerm) ||
        phone.includes(normalizedTerm) ||
        email.includes(normalizedTerm)
      );
    });
  }, [patients, searchTerm, activeTab, patientsWithDuplicatePhones]);

  const collator = useMemo(() => {
    const locale = 'pt-BR';
    if (typeof Intl !== 'undefined' && typeof Intl.Collator === 'function') {
      return new Intl.Collator(locale, {
        sensitivity: 'base',
        ignorePunctuation: true,
        numeric: false,
      });
    }
    return new Intl.Collator(locale);
  }, []);

  const sortedPatients = useMemo(() => {
    const normalizeString = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return [...filteredPatients].sort((a, b) => {
      if (typeof collator.compare === 'function') {
        return collator.compare(a.nome || '', b.nome || '');
      }
      const aName = normalizeString(a.nome || '');
      const bName = normalizeString(b.nome || '');
      return aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base', ignorePunctuation: true });
    });
  }, [filteredPatients, collator]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <AccessGuard 
        allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}
      >
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Empresa não identificada</h2>
            <p className="text-gray-600 mb-4">
              Não foi possível identificar a empresa. Por favor, faça login novamente.
            </p>
            <Button onClick={() => window.location.href = '/home'} variant="outline">
              Ir para Login
            </Button>
          </div>
        </div>
      </AccessGuard>
    );
  }

  return (
     <AccessGuard allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}>
      <div className={cn('app-page min-h-screen p-2 sm:p-4 md:p-6 lg:p-8')}>
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'rounded-2xl p-6 transition-all',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-16 sm:pl-20 lg:pl-0">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientColors
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : 'bg-slate-900'
                      : isNeutral
                      ? 'bg-slate-900'
                      : 'bg-slate-900'
                  )}
                  style={
                    isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1
                    className={cn(
                      'text-3xl sm:text-4xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-clip-text text-transparent drop-shadow'
                          : isVibrant
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-slate-900'
                        : isNeutral
                        ? 'text-slate-900'
                        : 'text-slate-900'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }
                        : undefined
                    }
                  >
                    {pluralTitle}
                  </h1>
                  <p className={cn('text-sm mt-0.5', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                    Gerencie sua base de {pluralLabel}
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => {
                    setEditingPatient(null);
                    setFormData({
                      nome: '',
                      telefoneE164: '',
                      email: '',
                      cpf: '',
                      preferenciaNotificacao: 'whatsapp',
                      anamnese: '',
                      dataNascimento: ''
                    });
                    setIsModalOpen(true);
                  }}
                  className={cn(
                    'text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? 'hover:opacity-90'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : isNeutral
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo {singularTitle}
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all',
                  isVibrant
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white'
                    : 'app-card text-slate-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', isVibrant ? 'text-white/70' : 'text-blue-600')}>
                      Total de {pluralTitle}
                    </p>
                    <p className={cn('text-3xl font-bold', isVibrant ? 'text-white' : '')}>{patients.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all',
                  isVibrant
                    ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white'
                    : 'app-card text-slate-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', isVibrant ? 'text-white/70' : 'text-emerald-600')}>Preferem WhatsApp</p>
                    <p className={cn('text-3xl font-bold', isVibrant ? 'text-white' : '')}>
                      {patients.filter(c => c.preferenciaNotificacao === 'whatsapp').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all',
                  isVibrant
                    ? 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-white'
                    : 'app-card text-slate-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', isVibrant ? 'text-white/70' : 'text-purple-600')}>Com E-mail</p>
                    <p className={cn('text-3xl font-bold', isVibrant ? 'text-white' : '')}>
                      {patients.filter(c => c.email).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all',
                  isVibrant
                    ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white'
                    : 'app-card text-slate-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', isVibrant ? 'text-white/70' : 'text-amber-600')}>Telefones Duplicados</p>
                    <p className={cn('text-3xl font-bold', isVibrant ? 'text-white' : '')}>
                      {patientsWithDuplicatePhones.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Tabs e Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-4 space-y-4"
          >
            {/* Tabs */}
            <div className={cn(
              'flex gap-2 p-1 rounded-xl',
              isVibrant 
                ? 'bg-white/50 border border-white/25 backdrop-blur' 
                : 'bg-slate-100 border border-slate-200'
            )}>
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                  activeTab === 'list'
                    ? isVibrant
                      ? 'bg-white/80 text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isVibrant
                    ? 'text-slate-600 hover:bg-white/30'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Table className={cn('w-4 h-4', activeTab === 'list' ? (isVibrant ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-500')} />
                Lista ({patients.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'all'
                    ? isVibrant
                      ? 'bg-white/80 text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isVibrant
                    ? 'text-slate-600 hover:bg-white/30'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                Cards ({patients.length})
              </button>
              <button
                onClick={() => setActiveTab('duplicates')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                  activeTab === 'duplicates'
                    ? isVibrant
                      ? 'bg-white/80 text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isVibrant
                    ? 'text-slate-600 hover:bg-white/30'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <AlertTriangle className={cn('w-4 h-4', activeTab === 'duplicates' ? 'text-amber-600' : 'text-slate-500')} />
                Duplicados ({patientsWithDuplicatePhones.length})
              </button>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Pesquisar ${singularLabel} pelo nome...`}
                className={cn(
                  'h-12 rounded-xl border px-4 text-sm sm:text-base transition-all',
                  isVibrant
                    ? 'border-white/30 bg-white/70 text-slate-800 placeholder:text-slate-500 focus-visible:ring-indigo-400 focus-visible:border-indigo-300 backdrop-blur'
                    : 'border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500'
                )}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  className={cn(
                    'h-12 sm:w-auto',
                    isVibrant ? 'text-slate-700 hover:bg-white/40' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  Limpar busca
                </Button>
              )}
            </div>
          </motion.div>

          {searchTerm && filteredPatients.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'mb-4 rounded-2xl border p-6 text-center text-sm sm:text-base',
                isVibrant ? 'border-white/25 bg-white/70 backdrop-blur text-slate-700' : 'border-slate-200 bg-white text-slate-600'
              )}
            >
              Nenhum {singularLabel} encontrado para "{searchTerm}".
            </motion.div>
          )}

          {/* Patients Grid or Table */}
          {activeTab === 'list' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn(
                'rounded-xl border overflow-hidden',
                isVibrant 
                  ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl' 
                  : 'bg-white border-slate-200 shadow-lg'
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn(
                      'border-b',
                      isVibrant ? 'bg-white/50 border-white/25' : 'bg-slate-50 border-slate-200'
                    )}>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        isVibrant ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Nome
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        isVibrant ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Telefone
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        isVibrant ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Abas
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        isVibrant ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn(
                    isVibrant ? 'bg-white/30' : 'bg-white divide-y divide-slate-200'
                  )}>
                    {sortedPatients.map((patient, index) => (
                      <motion.tr
                        key={patient.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => router.push(`/pacientes/detalhe?patientId=${patient.id}`)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isVibrant
                            ? 'hover:bg-white/50 border-b border-white/25'
                            : 'hover:bg-slate-50 border-b border-slate-200',
                          hasDuplicatePhone(patient.id) ? 'bg-amber-50/50' : ''
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm shadow-md',
                                hasGradient
                                  ? isCustom && gradientStyleHorizontal
                                    ? ''
                                    : isVibrant
                                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                  : isNeutral
                                  ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                                  : 'bg-gradient-to-br from-blue-500 to-purple-500'
                              )}
                              style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                            >
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className={cn(
                                'text-sm font-semibold',
                                isVibrant ? 'text-slate-900' : 'text-gray-900'
                              )}>
                                {patient.nome}
                              </div>
                              {hasDuplicatePhone(patient.id) && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span className="text-xs text-amber-600 font-medium">
                                    Telefone duplicado
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={cn(
                            'text-sm',
                            isVibrant ? 'text-slate-700' : 'text-gray-700',
                            hasDuplicatePhone(patient.id) ? 'font-semibold text-amber-700' : ''
                          )}>
                            {patient.telefoneE164 ? formatPhone(patient.telefoneE164) : (
                              <span className={cn('italic', isVibrant ? 'text-slate-400' : 'text-gray-400')}>
                                Sem telefone
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              value=""
                              onValueChange={(value) => {
                                if (value) {
                                  handleTabSelect(patient.id, value);
                                }
                              }}
                              className={cn(
                                'w-full min-w-[180px] text-sm',
                                isVibrant
                                  ? 'border-white/30 bg-white/60 text-slate-800 focus:border-indigo-400 focus:ring-indigo-200'
                                  : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200'
                              )}
                            >
                              <option value="">Selecione uma aba...</option>
                              {availableTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                  <option key={tab.id} value={tab.id}>
                                    {tab.label}
                                  </option>
                                );
                              })}
                            </Select>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/pacientes/detalhe?patientId=${patient.id}&tab=ficha_odontologica`);
                              }}
                              className={cn(
                                isVibrant 
                                  ? 'text-blue-600 hover:bg-white/40' 
                                  : isNeutral
                                  ? 'text-slate-700 hover:bg-slate-100'
                                  : isCustom && gradientColors
                                  ? 'hover:bg-opacity-10'
                                  : 'text-blue-600 hover:bg-blue-50'
                              )}
                              style={isCustom && gradientColors ? { color: gradientColors.start } : undefined}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(patient);
                              }}
                              className={cn(
                                isVibrant 
                                  ? 'border-blue-200 hover:border-blue-400 text-slate-700 hover:bg-white/40 border-white/30' 
                                  : isNeutral
                                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                  : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                              )}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedPatients.length === 0 && (
                <div className={cn(
                  'p-12 text-center',
                  isVibrant ? 'text-slate-500' : 'text-gray-500'
                )}>
                  Nenhum {singularLabel} encontrado.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
            {sortedPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => router.push(`/pacientes/detalhe?patientId=${patient.id}`)}
                className={cn(
                  'cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duração-300 group relative',
                  isVibrant
                    ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:border-indigo-300'
                    : 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-blue-300',
                  hasDuplicatePhone(patient.id)
                    ? 'border-amber-400 border-2'
                    : ''
                )}
              >
                {/* Indicador de telefone duplicado */}
                {hasDuplicatePhone(patient.id) && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-lg',
                      'bg-amber-500 text-white'
                    )}>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Telefone Duplicado</span>
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold shadow-lg transition-transform duration-300 group-hover:scale-110',
                          hasGradient
                            ? isCustom && gradientStyleHorizontal
                              ? ''
                              : isVibrant
                              ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500'
                            : isNeutral
                            ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                            : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        )}
                        style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                      >
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className={cn('text-lg font-bold', isVibrant ? 'text-slate-900' : 'text-gray-900')}>
                          {patient.nome}
                        </h3>
                        <div className={cn('flex items-center gap-2 text-xs', isVibrant ? 'text-slate-600/90' : 'text-gray-500')}>
                          <span>{singularTitle}</span>
                          {patient.preferenciaNotificacao && (
                            <>
                              <span>•</span>
                              <span>Prefere {getNotificationLabel(patient.preferenciaNotificacao)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/pacientes/detalhe?patientId=${patient.id}&tab=ficha_odontologica`);
                        }}
                        className={cn(
                          isVibrant 
                            ? 'text-blue-600 hover:bg-white/40 border border-white/25 rounded-full px-3 py-1' 
                            : isNeutral
                            ? 'text-slate-700 hover:bg-slate-100'
                            : isCustom && gradientColors
                            ? 'hover:bg-opacity-10 rounded-full px-3 py-1'
                            : 'text-blue-600 hover:bg-blue-50'
                        )}
                        style={isCustom && gradientColors ? { color: gradientColors.start } : undefined}
                      >
                        <FolderOpen className="w-4 h-4 mr-1" />
                        Ver ficha
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(patient);
                        }}
                        className={cn(
                          isVibrant 
                            ? 'border-blue-200 hover:border-blue-400 text-slate-700 hover:bg-white/40 border-white/30' 
                            : isNeutral
                            ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                            : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                        )}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {patient.telefoneE164 ? (
                      <div
                        className={cn(
                          'flex items-center gap-3 rounded-lg p-3 text-sm',
                          isVibrant ? 'bg-white/50 text-slate-700 border border-white/25' : 'bg-gray-50 text-gray-600',
                          hasDuplicatePhone(patient.id) ? 'border-amber-300 border-2 bg-amber-50' : ''
                        )}
                      >
                        <Phone className={cn(
                          'w-4 h-4', 
                          hasDuplicatePhone(patient.id) 
                            ? 'text-amber-600' 
                            : isVibrant 
                              ? 'text-indigo-500' 
                              : isNeutral 
                                ? 'text-slate-500' 
                                : isCustom && gradientColors 
                                  ? `text-[${gradientColors.start}]` 
                                  : 'text-blue-500'
                        )} style={isCustom && gradientColors && !hasDuplicatePhone(patient.id) ? { color: gradientColors.start } : undefined} />
                        <span className={cn(
                          'font-medium', 
                          isVibrant ? 'text-slate-800' : isNeutral ? 'text-slate-700' : '',
                          hasDuplicatePhone(patient.id) ? 'text-amber-900 font-semibold' : ''
                        )}>
                          {formatPhone(patient.telefoneE164)}
                          {hasDuplicatePhone(patient.id) && (
                            <span className="ml-2 text-xs text-amber-700">
                              ({patients.filter(p => p.telefoneE164 === patient.telefoneE164).length} {pluralLabel})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'flex items-center gap-3 rounded-lg p-3 text-sm',
                          isVibrant ? 'bg-white/50 text-slate-700 border border-white/25' : 'bg-gray-50 text-gray-400'
                        )}
                      >
                        <Phone className={cn('w-4 h-4', isVibrant ? 'text-slate-400' : 'text-gray-400')} />
                        <span className={cn('font-medium italic', isVibrant ? 'text-slate-500' : 'text-gray-500')}>
                          Sem telefone cadastrado
                        </span>
                      </div>
                    )}
                    
                    {patient.email && (
                      <div
                        className={cn(
                          'flex items-center gap-3 rounded-lg p-3 text-sm',
                          isVibrant ? 'bg-white/50 text-slate-700 border border-white/25' : 'bg-gray-50 text-gray-600'
                        )}
                      >
                        <Mail className={cn('w-4 h-4', isVibrant ? 'text-purple-500' : isNeutral ? 'text-slate-500' : isCustom && gradientColors ? `text-[${gradientColors.middle}]` : 'text-purple-500')} style={isCustom && gradientColors ? { color: gradientColors.middle } : undefined} />
                        <span className={cn('font-medium', isVibrant ? 'text-slate-800' : isNeutral ? 'text-slate-700' : '')}>{patient.email}</span>
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-3 text-sm',
                        isVibrant ? 'bg-white/50 text-slate-700 border border-white/25' : 'bg-gray-50 text-gray-600'
                      )}
                    >
                      {getNotificationIcon(patient.preferenciaNotificacao)}
                      <span className={cn('font-medium', isVibrant ? 'text-slate-800' : isNeutral ? 'text-slate-700' : '')}>{getNotificationLabel(patient.preferenciaNotificacao)}</span>
                    </div>

                    {patient.anamnese && (
                      <div
                        className={cn(
                          'rounded-lg p-3 text-sm',
                          isVibrant 
                            ? 'bg-white/50 border border-white/25 text-slate-700' 
                            : isNeutral
                            ? 'bg-slate-50 border border-slate-200 text-slate-700'
                            : isCustom
                            ? 'bg-blue-50 border border-blue-100 text-gray-700'
                            : 'bg-blue-50 border border-blue-100 text-gray-700'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className={cn('w-4 h-4', isVibrant ? 'text-indigo-500' : isNeutral ? 'text-slate-600' : isCustom && gradientColors ? `text-[${gradientColors.start}]` : 'text-blue-500')} style={isCustom && gradientColors ? { color: gradientColors.start } : undefined} />
                          <span className={cn('font-semibold', isVibrant ? 'text-indigo-500' : isNeutral ? 'text-slate-700' : isCustom && gradientColors ? `text-[${gradientColors.start}]` : 'text-blue-600')} style={isCustom && gradientColors ? { color: gradientColors.start } : undefined}>Anamnese</span>
                        </div>
                        <p className="whitespace-pre-line">{patient.anamnese}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          )}

          {patients.length === 0 && (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.3 }}
               className="text-center py-16"
             >
              <div
                className={cn(
                  'mx-auto rounded-2xl p-12 shadow-xl max-w-md',
                  isVibrant ? 'bg-white/80 border border-white/20 backdrop-blur-xl' : 'bg-white/80 border border-white/20 backdrop-blur-lg'
                )}
              >
                <div
                  className={cn(
                    'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg',
                    isVibrant
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  )}
                >
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className={cn('text-xl font-bold mb-3', isVibrant ? 'text-slate-900' : 'text-gray-900')}>
                  Nenhum {singularLabel} cadastrado
                </h3>
                <p className={cn('mb-6', isVibrant ? 'text-slate-600/80' : 'text-gray-600')}>
                  Comece adicionando o primeiro {singularLabel} ao sistema.
                </p>
                <Button 
                  onClick={() => {
                    setEditingPatient(null);
                    setFormData({
                      nome: '',
                      telefoneE164: '',
                      email: '',
                      cpf: '',
                      preferenciaNotificacao: 'whatsapp',
                      anamnese: '',
                      dataNascimento: ''
                    });
                    setIsModalOpen(true);
                  }}
                  className={cn(
                    'text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? 'hover:opacity-90'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : isNeutral
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar {singularTitle}
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto',
              isVibrant ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'w-full max-w-md rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] my-4',
                isVibrant ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
              )}
            >
              <div className="p-6 pb-4 border-b flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-white',
                      hasGradient
                        ? isCustom && gradientStyleHorizontal
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                          : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : isNeutral
                        ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    )}
                    style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className={cn('text-xl font-bold', isVibrant ? 'text-slate-900' : 'text-gray-900')}>
                    {editingPatient ? `Editar ${singularTitle}` : `Novo ${singularTitle}`}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPatient(null);
                  }}
                  className={cn(isVibrant ? 'text-slate-600 hover:bg-white/40' : '')}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form id="patient-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                      placeholder="João Silva"
                      required
                    />
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      Telefone (opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.telefoneE164}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefoneE164: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                    value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={`${singularLabel}@exemplo.com`}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      CPF (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => {
                        // Formatar CPF automaticamente
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                          setFormData(prev => ({ ...prev, cpf: value }));
                        }
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      Data de Nascimento (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataNascimento: e.target.value }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    />
                    <p className={cn('text-xs mt-1', isVibrant ? 'text-slate-500' : 'text-gray-500')}>
                      O aniversário aparecerá no calendário como evento de dia todo
                    </p>
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      Anamnese (opcional)
                    </label>
                    <textarea
                      value={formData.anamnese}
                      onChange={(e) => setFormData(prev => ({ ...prev, anamnese: e.target.value }))}
                      placeholder="Registre aqui o histórico clínico e observações importantes..."
                      className={cn(
                        'w-full min-h-[120px] resize-y rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isVibrant ? 'text-slate-700' : 'text-gray-700')}>
                      Preferência de Notificação
                    </label>
                    <select
                      value={formData.preferenciaNotificacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferenciaNotificacao: e.target.value as any }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duração-200 focus:outline-none focus:ring-2',
                        isVibrant
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">E-mail</option>
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-6 pt-4 border-t flex gap-3 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPatient(null);
                  }}
                  className={cn(
                    'flex-1',
                    isVibrant ? 'border-white/30 text-slate-700 hover:bg-white/40' : 'border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  form="patient-form"
                  className={cn(
                    'flex-1 text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? 'hover:opacity-90'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : isNeutral
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  {editingPatient ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className={cn(
            isVibrant 
              ? 'bg-white/95 border-white/30 backdrop-blur-xl' 
              : isNeutral
              ? 'bg-slate-50 border-slate-200'
              : 'bg-white border-gray-200'
          )}>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  isVibrant
                    ? 'bg-red-100 text-red-600'
                    : isNeutral
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-red-100 text-red-600'
                )}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <DialogTitle className={cn(
                  'text-xl font-bold',
                  isVibrant ? 'text-slate-900' : isNeutral ? 'text-slate-800' : 'text-gray-900'
                )}>
                  Confirmar Exclusão
                </DialogTitle>
              </div>
              <DialogDescription className={cn(
                'text-base mt-4',
                isVibrant ? 'text-slate-700' : isNeutral ? 'text-slate-600' : 'text-gray-700'
              )}>
                Tem certeza que deseja deletar este {singularLabel}?
              </DialogDescription>
              <div className={cn(
                'mt-4 p-4 rounded-lg border-2',
                isVibrant
                  ? 'bg-red-50/80 border-red-200/50'
                  : isNeutral
                  ? 'bg-slate-100 border-slate-300'
                  : 'bg-red-50 border-red-200'
              )}>
                <p className={cn(
                  'text-sm font-semibold mb-2',
                  isVibrant ? 'text-red-800' : isNeutral ? 'text-slate-800' : 'text-red-800'
                )}>
                  ⚠️ Atenção: Esta ação não pode ser desfeita!
                </p>
                <ul className={cn(
                  'text-sm space-y-1 list-disc list-inside',
                  isVibrant ? 'text-red-700' : isNeutral ? 'text-slate-700' : 'text-red-700'
                )}>
                  <li>Todas as informações do {singularLabel} serão permanentemente excluídas</li>
                  <li>Todos os agendamentos relacionados serão perdidos</li>
                  <li>Histórico de evoluções, procedimentos e documentos serão removidos</li>
                </ul>
              </div>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setPatientToDelete(null);
                }}
                className={cn(
                  isVibrant
                    ? 'border-white/30 hover:bg-white/40'
                    : isNeutral
                    ? 'border-slate-300 hover:bg-slate-100'
                    : 'border-gray-300 hover:bg-gray-100'
                )}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className={cn(
                  'text-white shadow-lg',
                  isVibrant
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                    : isNeutral
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                )}
              >
                Sim, Deletar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccessGuard>
  );
}
