'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarClock, ClipboardList, FileText, FolderOpen, History, Stethoscope, Upload, Wallet, Trash2, MessageCircle, Send, Reply, Clock3, Smartphone, Printer, Copy, Check, X, Edit, ChevronDown, ChevronUp, Bot, UserCircle, Image, Video, Music, Download, Plus, Eye, Save, AlertTriangle, CheckCircle2, Pill, FileCheck, DollarSign } from 'lucide-react';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { canAccessClientsMenu, canAccessPatientDebits } from '@/lib/permissions';
import { usePatient, useAppointments, useProfessionals, useServices, usePatientEvolutions, useCompany, useDentalProcedures, usePatientDebits, useOrcamentos } from '@/hooks/useFirestore';
import { showError, showSuccess } from '@/components/ui/toast';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL, uploadBytesResumable, getMetadata, deleteObject } from 'firebase/storage';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PatientEvolution } from '@/types';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/style.css';
import { Badge } from '@/components/ui/badge';
import { collection, limit, onSnapshot, orderBy, query, where, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { DentalChart } from './DentalChart';
import { FinanceiroTab } from './FinanceiroTab';
import { DocumentosTab } from './DocumentosTab';
import { DadosPacienteTab } from './DadosPacienteTab';
import { FichaOdontologicaTab } from './FichaOdontologicaTab';
import { ArquivosTab } from './ArquivosTab';
import { EvolucoesTab } from './EvolucoesTab';
import { AnamneseTab } from './AnamneseTab';
import { InteracoesTab } from './InteracoesTab';
import { ConsultasTab } from './ConsultasTab';
import { OrcamentosTab } from './OrcamentosTab';
import { generateOrcamentoPDF } from './DentalChart';
import { cn, getGradientColors } from '@/lib/utils';
import { OrcamentoModal } from './OrcamentoModal';
import { OrcamentosModals } from './OrcamentosModals';
import { useOrcamentosHandlers } from './useOrcamentosHandlers';
import { useOrcamentosState } from './useOrcamentos';
import { useConsultas } from './useConsultas';
import { Timestamp } from 'firebase/firestore';
import { normalizePhone, generatePhoneVariants, formatFileSize, formatEvolutionDate, formatDateTime } from './utils';
import { getMessageText, getMediaInfo, renderMedia, formatMessageDate } from './whatsappUtils';
import { TAB_ITEMS } from './constants';

function PatientDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const tabParam = searchParams.get('tab');

  const { companyId, loading: authLoading, user, userData, themePreference, customColor, customColor2 } = useAuth();
  
  // Criar objeto user completo para verificação de permissões
  const userWithPermissions = userData && user ? {
    uid: user.uid,
    role: userData.role,
    nome: userData.nome || user.displayName || '',
    email: userData.email || user.email || '',
    ativo: userData.ativo,
    companyId: userData.companyId || companyId || '',
    professionalId: userData.professionalId,
    permissions: userData.permissions,
  } : null;
  const { patient, loading: patientLoading, error, updatePatient } = usePatient(companyId, patientId || null);
  const { appointments, loading: appointmentsLoading } = useAppointments(companyId, { clientId: patientId || undefined });
  const { professionals, loading: professionalsLoading } = useProfessionals(companyId);
  const { services, loading: servicesLoading } = useServices(companyId);
  const {
    evolutions,
    loading: evolutionsLoading,
    addEvolution,
    updateEvolution,
    deleteEvolution,
  } = usePatientEvolutions(companyId, patientId || null);
  const { company } = useCompany(companyId);
  const isDentist = company?.tipoEstabelecimento === 'dentista';
  const {
    procedimentos: dentalProcedures,
    loading: dentalProceduresLoading,
    addProcedimento: addDentalProcedure,
    updateProcedimento: updateDentalProcedure,
    deleteProcedimento: deleteDentalProcedure,
  } = useDentalProcedures(companyId, patientId || null);
  const { createDebito } = usePatientDebits(companyId, patientId || null);
  const { orcamentos, loading: orcamentosLoading, deleteOrcamento, updateOrcamento, createOrcamento } = useOrcamentos(companyId, patientId || null);
  const {
    sendOrcamentoModal,
    setSendOrcamentoModal,
    copiedLink,
    handleSendOrcamento,
    handlePrintOrcamento,
    handleCopyLink,
    handleSendViaSystem,
  } = useOrcamentosHandlers(companyId, patientId, company, patient, updateOrcamento);

  // Pré-carregar todas as imagens dos dentes IMEDIATAMENTE assim que a página abrir
  // useLayoutEffect executa ANTES da pintura do DOM, garantindo carregamento o mais cedo possível
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Lista de todos os números de dentes (permanentes e decíduos)
    const allTeethNumbers = [
      // Permanentes
      11, 12, 13, 14, 15, 16, 17, 18,
      21, 22, 23, 24, 25, 26, 27, 28,
      31, 32, 33, 34, 35, 36, 37, 38,
      41, 42, 43, 44, 45, 46, 47, 48,
      // Decíduos
      51, 52, 53, 54, 55,
      61, 62, 63, 64, 65,
      71, 72, 73, 74, 75,
      81, 82, 83, 84, 85,
    ];

    // Função para pré-carregar uma imagem
    const preloadImage = (imagePath: string) => {
      // Verificar se já existe link de preload
      const existingLink = document.querySelector(`link[href="${imagePath}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imagePath;
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
      }

      // Criar Image object para forçar carregamento
      const img = document.createElement('img');
      img.src = imagePath;
      // Manter referência para evitar garbage collection
      (window as any).__dentalImages = (window as any).__dentalImages || [];
      (window as any).__dentalImages.push(img);
    };

    // Carregar TODAS as imagens imediatamente (sem delays, sem condições)
    allTeethNumbers.forEach((numero) => {
      const imagePath = `/images/dental-teeth/${numero}.png`;
      preloadImage(imagePath);
    });

    // Limpar referências quando desmontar
    return () => {
      if ((window as any).__dentalImages) {
        (window as any).__dentalImages = [];
      }
    };
  }, [patientId]); // Re-executar quando o patientId mudar (nova página de paciente)

  // Backup: também executar com useEffect para garantir
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const allTeethNumbers = [
      11, 12, 13, 14, 15, 16, 17, 18,
      21, 22, 23, 24, 25, 26, 27, 28,
      31, 32, 33, 34, 35, 36, 37, 38,
      41, 42, 43, 44, 45, 46, 47, 48,
      51, 52, 53, 54, 55,
      61, 62, 63, 64, 65,
      71, 72, 73, 74, 75,
      81, 82, 83, 84, 85,
    ];

    // Garantir que todas as imagens sejam carregadas
    allTeethNumbers.forEach((numero) => {
      const imagePath = `/images/dental-teeth/${numero}.png`;
      const img = document.createElement('img');
      img.src = imagePath;
      // Forçar decode para garantir carregamento completo
      img.decode().catch(() => {
        // Ignorar erros de decode
      });
    });
  }, [patientId]);
  const customerLabels = useCustomerLabels();
  const singularLabel = customerLabels.singular;
  const singularTitle = customerLabels.singularTitle;
  const pluralTitle = customerLabels.pluralTitle;

  // Inicializar a aba baseado no parâmetro da URL ou padrão 'dados_paciente'
  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]['id']>('dados_paciente');
  const isManualTabChange = useRef(false);

  // Função para verificar se uma aba está disponível para o usuário
  const isTabAvailable = useCallback((tabId: string) => {
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
  }, [isDentist, userWithPermissions]);

  // Atualizar a aba quando o parâmetro tab mudar na URL (apenas quando não for mudança manual)
  useEffect(() => {
    // Se foi uma mudança manual, ignorar
    if (isManualTabChange.current) {
      isManualTabChange.current = false;
      return;
    }

    if (tabParam && TAB_ITEMS.some(tab => tab.id === tabParam)) {
      if (isTabAvailable(tabParam)) {
        setActiveTab(tabParam as (typeof TAB_ITEMS)[number]['id']);
      } else {
        // Se a aba solicitada não está disponível, voltar para a aba padrão
        setActiveTab('dados_paciente');
      }
    }
  }, [tabParam, isTabAvailable]);
  
  // Hooks para gerenciar lógica de orçamentos e consultas
  const {
    selectedOrcamentoId,
    setSelectedOrcamentoId,
    expandedOrcamentos,
    toggleExpand,
  } = useOrcamentosState(orcamentos);
  
  const {
    getProfessionalLabel,
    getServiceLabel,
    upcomingAppointments,
    pastAppointments,
  } = useConsultas(professionals, services, servicesLoading, appointments);
  
  // Obter o número de telefone do paciente para usar como chat_id
  const patientPhone = useMemo(() => {
    if (!patient?.telefoneE164) return null;
    // Normalizar o telefone para usar como chat_id
    return normalizePhone(patient.telefoneE164);
  }, [patient?.telefoneE164]);

  // Scroll automático para a última mensagem

  // Função para obter o texto da mensagem



  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{singularTitle} não encontrado.</p>
      </div>
    );
  }

  if (authLoading || patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-red-600 font-semibold">Erro ao carregar {singularLabel}.</p>
            <p className="text-sm text-gray-600">{error}</p>
            <Button onClick={() => router.push('/pacientes')} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-gray-700 font-semibold">{singularTitle} não encontrado.</p>
            <Button onClick={() => router.push('/pacientes')} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detectar tema e gerar estilos dinâmicos
  const isVibrant: boolean = themePreference === 'vibrant';
  const isCustom: boolean = themePreference === 'custom' && !!customColor;
  const hasGradient: boolean = isVibrant || isCustom;
  const gradientColors: { start: string; middle: string; end: string } | undefined = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) || undefined : undefined;
  
  // Estilos dinâmicos para gradientes
  const gradientStyleHorizontal = isCustom && gradientColors
    ? {
        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
      }
    : null;

  return (
    <AccessGuard 
      allowed={['owner', 'admin', 'atendente', 'pro', 'outro']}
      checkPermission={(user) => canAccessClientsMenu(user)}
    >
      <div className={cn(
        'min-h-screen p-3 sm:p-6 lg:p-10',
        hasGradient ? 'app-page' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50'
      )}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Moderno */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'rounded-xl p-4 sm:p-6 transition-all',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/pacientes')} 
                  className={cn(
                    'flex items-center gap-2',
                    hasGradient ? 'hover:bg-white/60' : 'hover:bg-slate-100'
                  )}
                >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg',
                      isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                        : isCustom && gradientColors
                        ? ''
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
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h1
                      className={cn(
                        'text-xl sm:text-2xl md:text-3xl font-bold',
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent drop-shadow'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                          : 'text-gray-900'
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
                {patient.nome || `${singularTitle} sem nome`}
              </h1>
                    <div className="flex items-center gap-2 text-xs sm:text-sm mt-1">
                      <span className={cn(hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                        {patient.email || 'Sem e-mail cadastrado'}
                      </span>
                      <span className={cn(hasGradient ? 'text-slate-400' : 'text-gray-400')}>•</span>
                      <span className={cn(hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                        {patient.telefoneE164 || 'Sem telefone'}
                      </span>
            </div>
            </div>
          </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs Modernas */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={cn(
              'rounded-xl p-4 sm:p-6 transition-all',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div className="flex flex-wrap gap-2 sm:gap-3">
                {TAB_ITEMS.filter(tab => {
                  // Se a tab requer permissão de débitos, verificar se o usuário tem acesso
                  if ('requiresDebitsPermission' in tab && tab.requiresDebitsPermission && (tab.id === 'orcamentos' || tab.id === 'financeiro')) {
                    return canAccessPatientDebits(userWithPermissions as any);
                  }
                  // Se a tab requer dentista, verificar se o tipo de estabelecimento é dentista
                  if ('requiresDentist' in tab && tab.requiresDentist && tab.id === 'ficha_odontologica') {
                    return isDentist;
                  }
                  return true; // Outras tabs sempre visíveis se o usuário tem acesso à página
              }).map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                  <motion.button
                      key={tab.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                      onClick={() => {
                        isManualTabChange.current = true;
                        setActiveTab(tab.id);
                        // Atualizar a URL sem recarregar a página
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.set('tab', tab.id);
                        window.history.pushState({}, '', newUrl.toString());
                      }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                      isActive
                        ? hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white shadow-lg'
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                          : 'bg-slate-900 text-white shadow-lg'
                        : hasGradient
                        ? 'bg-white/60 text-slate-700 hover:bg-white/80 border border-white/40'
                        : 'bg-white text-gray-600 hover:bg-slate-50 border border-slate-200'
                    )}
                    style={isActive && isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </motion.button>
                  );
                })}
              </div>
          </motion.div>

          {activeTab === 'dados_paciente' && (
            <DadosPacienteTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
            />
          )}

          {/* Pré-carregamento oculto de todas as imagens dos dentes */}
          {isDentist && (
            <div className="hidden" aria-hidden="true">
              {[
                11, 12, 13, 14, 15, 16, 17, 18,
                21, 22, 23, 24, 25, 26, 27, 28,
                31, 32, 33, 34, 35, 36, 37, 38,
                41, 42, 43, 44, 45, 46, 47, 48,
                51, 52, 53, 54, 55,
                61, 62, 63, 64, 65,
                71, 72, 73, 74, 75,
                81, 82, 83, 84, 85,
              ].map((numero) => (
                <img
                  key={numero}
                  src={`/images/dental-teeth/${numero}.png`}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{ display: 'none', width: '1px', height: '1px' }}
                />
              ))}
            </div>
          )}

          {activeTab === 'ficha_odontologica' && isDentist && (
            <FichaOdontologicaTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              professionals={professionals || []}
              dentalProcedures={dentalProcedures || []}
              orcamentos={orcamentos || []}
              dentalProceduresLoading={dentalProceduresLoading}
              user={user}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              onNavigateToOrcamentos={(orcamentoId) => {
                setActiveTab('orcamentos');
                if (orcamentoId) {
                  const scrollToOrcamento = () => {
                    const element = document.getElementById(`orcamento-${orcamentoId}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('ring-4', 'ring-blue-300');
                      setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-blue-300');
                      }, 2000);
                      return true;
                    }
                    return false;
                  };
                  if (!scrollToOrcamento()) {
                    setTimeout(() => {
                      if (!scrollToOrcamento()) {
                        setTimeout(() => scrollToOrcamento(), 300);
                      }
                    }, 150);
                  }
                }
              }}
              onAddProcedimento={async (procedimento) => {
                await addDentalProcedure(
                  {
                    ...procedimento,
                    createdByUid: user?.uid,
                  },
                  async (procedureId) => {
                    if (procedimento.gerarPagamentoFinanceiro) {
                      const debitoId = await createDebito({
                        companyId: companyId || '',
                        patientId: patientId || '',
                        procedimento: procedimento.procedimento,
                        valorTotalCentavos: procedimento.valorCentavos,
                        saldoReceberCentavos: procedimento.valorCentavos,
                        saldoRecebidoCentavos: 0,
                        lancamentos: [],
                        status: 'pendente',
                        profissionalId: procedimento.profissionalId,
                        observacoes: procedimento.observacoes,
                        dentalProcedureId: procedureId,
                        createdByUid: user?.uid,
                      });
                      await updateDentalProcedure(procedureId, {
                        debitoId,
                      });
                    }
                  }
                );
              }}
              onEditProcedimento={updateDentalProcedure}
              onDeleteProcedimento={deleteDentalProcedure}
              createDebito={createDebito}
              updateDentalProcedure={updateDentalProcedure}
            />
          )}

          {activeTab === 'anamnese' && (
            <AnamneseTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              company={company}
              professionals={professionals || []}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
            />
          )}

          {/* Modais de anamnese movidos para AnamneseTab */}

          {activeTab === 'evolucoes' && (
            <EvolucoesTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              evolutions={evolutions}
              evolutionsLoading={evolutionsLoading}
            />
          )}

          {activeTab === 'orcamentos' && (
            <OrcamentosTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              company={company}
              user={userWithPermissions}
              userData={userData}
              themePreference={themePreference}
              customColor={customColor}
              isDentist={isDentist}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              updatePatient={updatePatient}
              setActiveTab={setActiveTab as React.Dispatch<React.SetStateAction<string>>}
              orcamentos={orcamentos}
              orcamentosLoading={orcamentosLoading}
              expandedOrcamentos={expandedOrcamentos}
              canAccessPatientDebits={canAccessPatientDebits(userWithPermissions as any)}
              onToggleExpand={toggleExpand}
              onNewOrcamento={() => setSelectedOrcamentoId('new')}
              onEditOrcamento={(id) => setSelectedOrcamentoId(id)}
              onDeleteOrcamento={deleteOrcamento}
              onSendOrcamento={handleSendOrcamento}
              onPrintOrcamento={handlePrintOrcamento}
            >
              {/* Modal de Orçamento */}
              {selectedOrcamentoId && (
                <OrcamentoModal
                  isOpen={!!selectedOrcamentoId}
                  onClose={() => setSelectedOrcamentoId(null)}
                  companyId={companyId || ''}
                  patientId={patientId}
                  procedimentos={dentalProcedures || []}
                  orcamento={selectedOrcamentoId === 'new' ? null : orcamentos.find(o => o.id === selectedOrcamentoId) || null}
                  onSave={() => {
                    setSelectedOrcamentoId(null);
                    // Os dados serão atualizados automaticamente pelo useOrcamentos
                  }}
                />
              )}

              <OrcamentosModals
                sendOrcamentoModal={sendOrcamentoModal}
                setSendOrcamentoModal={setSendOrcamentoModal}
                copiedLink={copiedLink}
                handleCopyLink={handleCopyLink}
                handleSendViaSystem={handleSendViaSystem}
                patient={patient}
                singularTitle={singularTitle}
                hasGradient={hasGradient}
                isCustom={isCustom}
                gradientColors={gradientColors ?? null}
                isVibrant={isVibrant}
              />
            </OrcamentosTab>
          )}

          {activeTab === 'documentos' && (
            <DocumentosTab
              companyId={companyId || ''}
              patientId={patientId}
              company={company}
              patient={patient}
              professionals={professionals}
            />
          )}

          {activeTab === 'arquivos' && (
            <ArquivosTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              activeTab={activeTab}
            />
          )}

          {activeTab === 'interacoes' && (
            <InteracoesTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              patientPhone={patientPhone}
            />
          )}

          {activeTab === 'financeiro' && canAccessPatientDebits(userWithPermissions as any) && (
            <FinanceiroTab
              companyId={companyId}
              patientId={patientId}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
            />
          )}

          {activeTab === 'consultas' && (
            <ConsultasTab
              companyId={companyId}
              patientId={patientId}
              patient={patient}
              company={company}
              user={userWithPermissions}
              userData={userData}
              themePreference={themePreference}
              customColor={customColor}
              isDentist={isDentist}
              singularLabel={singularLabel}
              singularTitle={singularTitle}
              pluralTitle={pluralTitle}
              hasGradient={hasGradient}
              isCustom={isCustom}
              gradientColors={gradientColors}
              isVibrant={isVibrant}
              gradientStyleHorizontal={gradientStyleHorizontal}
              updatePatient={updatePatient}
              setActiveTab={setActiveTab as React.Dispatch<React.SetStateAction<string>>}
              upcomingAppointments={upcomingAppointments}
              pastAppointments={pastAppointments}
              appointmentsLoading={appointmentsLoading}
              professionalsLoading={professionalsLoading}
              servicesLoading={servicesLoading}
              services={services}
              getProfessionalLabel={getProfessionalLabel}
              getServiceLabel={getServiceLabel}
              formatDateTime={formatDateTime}
            />
          )}
        </div>
      </div>
    </AccessGuard>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    }>
      <PatientDetailContent />
    </Suspense>
  );
}
