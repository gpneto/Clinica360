'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Save, 
  Bell, 
  Clock, 
  DollarSign, 
  Shield,
  Sparkles,
  MessageSquare,
  RefreshCcw,
  Upload,
  X,
  Image as ImageIcon,
  Download,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Search,
  Package,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Timestamp, collection, doc, getCountFromServer, getDoc, onSnapshot, query, setDoc, where, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, functions, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useTutorial } from '@/components/tutorial/TutorialProvider';
import { cn } from '@/lib/utils';
import { addMonths, subMonths, formatDistanceToNow, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompany, useServices } from '@/hooks/useFirestore';
import { TipoEstabelecimento, Patient } from '@/types';
import { updateDoc } from 'firebase/firestore';
import { SampleDataGenerator } from '@/lib/sample-data-generator';

const TIPOS_ESTABELECIMENTO: { value: TipoEstabelecimento; label: string }[] = [
  { value: 'salao_beleza', label: 'Salões de Beleza' },
  { value: 'clinica_estetica', label: 'Clínicas Estéticas' },
  { value: 'profissional_autonomo', label: 'Profissionais Autônomos' },
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'dentista', label: 'Clinica Odontológica' },
  { value: 'clinica_veterinaria', label: 'Clínicas Veterinárias' },
  { value: 'barbearia', label: 'Barbearias' },
  { value: 'estudio_tatuagem', label: 'Estúdios de Tatuagem' },
  { value: 'clinica_fisioterapia', label: 'Clínicas de Fisioterapia' },
  { value: 'psicologia', label: 'Psicologia' },
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'outros', label: 'Outros' },
];

// Tipos para configuração de horários
interface HorarioDia {
  diaSemana: number; // 0-6 (domingo-sábado)
  inicio: string; // HH:mm
  fim: string; // HH:mm
  ativo: boolean;
}

interface Intervalo {
  id: string;
  diaSemana: number; // 0-6 (domingo-sábado)
  inicio: string; // HH:mm
  fim: string; // HH:mm
  descricao?: string; // Ex: "Almoço", "Intervalo"
}

interface Bloqueio {
  id: string;
  tipo: 'semanal' | 'mensal' | 'data_especifica'; // Tipo de recorrência
  diaSemana?: number; // 0-6 (para tipo 'semanal')
  diaMes?: number; // 1-31 (para tipo 'mensal')
  dataEspecifica?: string; // YYYY-MM-DD (para tipo 'data_especifica')
  inicio: string; // HH:mm
  fim: string; // HH:mm
  descricao?: string; // Ex: "Reunião", "Manutenção"
  ativo: boolean;
}

interface HorarioFuncionamentoConfig {
  // Estrutura antiga (mantida para compatibilidade)
  inicio?: string;
  fim?: string;
  diasSemana?: number[];
  
  // Nova estrutura
  horariosPorDia?: HorarioDia[]; // Horários configurados por dia
  intervalos?: Intervalo[]; // Intervalos (ex: almoço)
  bloqueios?: Bloqueio[]; // Bloqueios recorrentes ou específicos
}

interface SettingsData {
  // Configurações gerais
  nomeSalao: string; // Mantido para compatibilidade, será usado como nomeFantasia
  nomeFantasia?: string;
  razaoSocial?: string;
  telefoneSalao: string;
  emailSalao: string;
  enderecoSalao: string;
  estado: string;
  whatsappProvider: 'meta' | 'evolution' | 'disabled';
  whatsappIntegrationType?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  whatsappNumber?: string;
  customerLabel: 'paciente' | 'cliente';
  
  // Configurações de agendamento pelo WhatsApp
  agendamentoWhatsappHabilitado?: boolean;
  agendamentoWhatsappApenasContatos?: boolean;
  agendamentoWhatsappServicosIds?: string[]; // IDs dos serviços disponíveis para agendamento pelo WhatsApp
  
  // Configurações de mensagem de aniversário
  mensagemAniversarioAutomatica?: boolean;
  mensagemAniversarioTexto?: string;
  
  // Configurações de horário
  horarioFuncionamento: HorarioFuncionamentoConfig;
  
  // Configurações financeiras
  comissaoPadrao: number;
  taxaCancelamento: number;
  diasAntecedenciaCancelamento: number;
  
  // Configurações de notificação
  lembrete24h: boolean;
  lembrete1h: boolean;
  confirmacaoAutomatica: boolean;
  showCommission: boolean;
  
  // Configurações de backup
  backupAutomatico: boolean;
  frequenciaBackup: 'diario' | 'semanal' | 'mensal';
  
  // Credenciais do Capim (para migração)
  capimEmail?: string;
  capimPassword?: string;
}

const ESTADOS_BRASIL = [
  { value: '', label: 'Selecione o estado...' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const MONTHLY_WHATSAPP_FREE_LIMIT = 200;
const WHATSAPP_MESSAGE_UNIT_PRICE = 0.3;
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function SettingsPage() {
  const { companyId, themePreference, user } = useAuth();
  const { company } = useCompany(companyId);
  const { services, loading: servicesLoading } = useServices(companyId);
  const [settings, setSettings] = useState<SettingsData>({
    nomeSalao: '',
    nomeFantasia: '',
    razaoSocial: '',
    telefoneSalao: '',
    emailSalao: '',
    enderecoSalao: '',
    estado: '',
    whatsappProvider: 'disabled',
    whatsappIntegrationType: undefined,
    customerLabel: 'paciente',
    agendamentoWhatsappHabilitado: false,
    agendamentoWhatsappApenasContatos: false,
    agendamentoWhatsappServicosIds: [],
    mensagemAniversarioAutomatica: false,
    mensagemAniversarioTexto: `🎉 *Feliz Aniversário, {{NOME_CLIENTE}}!* 🎉 🎉 

Parabéns pelo seu aniversário! 🎂 

Que este novo ano traga muita saúde, felicidade e inúmeras realizações. Que cada dia seja uma nova oportunidade para celebrar a vida e conquistar seus sonhos. 🎊 Desejamos um dia muito especial, repleto de momentos inesquecíveis! 🍀

 Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de saúde, alegria e realizações! 🎂✨ 

Parabéns pelo seu dia especial! 🎈`,
    horarioFuncionamento: {
      horariosPorDia: [
        { diaSemana: 1, inicio: '08:00', fim: '18:00', ativo: true },
        { diaSemana: 2, inicio: '08:00', fim: '18:00', ativo: true },
        { diaSemana: 3, inicio: '08:00', fim: '18:00', ativo: true },
        { diaSemana: 4, inicio: '08:00', fim: '18:00', ativo: true },
        { diaSemana: 5, inicio: '08:00', fim: '18:00', ativo: true },
      ],
      intervalos: [],
      bloqueios: []
    },
    comissaoPadrao: 30,
    taxaCancelamento: 0,
    diasAntecedenciaCancelamento: 24,
    lembrete24h: true,
    lembrete1h: false,
    confirmacaoAutomatica: true,
    showCommission: true,
    backupAutomatico: true,
    frequenciaBackup: 'diario'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evolutionStatus, setEvolutionStatus] = useState<Record<string, any> | null>(null);
  const [evolutionPairingLoading, setEvolutionPairingLoading] = useState(false);
  const [evolutionPairingError, setEvolutionPairingError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [evolutionPairingTriggeredAt, setEvolutionPairingTriggeredAt] = useState<number | null>(null);
  const [qrCodeErrorCount, setQrCodeErrorCount] = useState(0);
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const [qrCodeImageLoaded, setQrCodeImageLoaded] = useState(false);
  const qrCodeErrorAttemptsRef = useRef(0);
  const previousQrCodeRef = useRef<string | null>(null);
  const [messageStatsLoading, setMessageStatsLoading] = useState(false);
  const [messageStatsError, setMessageStatsError] = useState<string | null>(null);
  const [importingMedicamentos, setImportingMedicamentos] = useState(false);
  const [gerandoDadosExemplo, setGerandoDadosExemplo] = useState(false);
  const [messageStats, setMessageStats] = useState<{
    monthCount: number;
    totalCount: number;
    extraCount: number;
    estimatedCost: number;
    fetchedAt: Date | null;
  }>({
    monthCount: 0,
    totalCount: 0,
    extraCount: 0,
    estimatedCost: 0,
    fetchedAt: null,
  });
  const { openTutorial, hasCompleted: hasCompletedTutorial, statusLoading: tutorialStatusLoading } = useTutorial();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Estados para seleção de serviços do WhatsApp
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  
  // Estados para migração do Capim
  const [capimEmail, setCapimEmail] = useState('');
  const [capimPassword, setCapimPassword] = useState('');
  const [capimToken, setCapimToken] = useState<string | null>(null);
  const [capimAuthenticating, setCapimAuthenticating] = useState(false);
  const [capimAuthError, setCapimAuthError] = useState<string | null>(null);
  const [capimImporting, setCapimImporting] = useState(false);
  const [capimImportProgress, setCapimImportProgress] = useState({ current: 0, total: 0 });
  const [capimImportResult, setCapimImportResult] = useState<{ success: number; errors: number; skipped: number } | null>(null);
  const [capimPatients, setCapimPatients] = useState<any[]>([]);
  const [capimLoadingPatients, setCapimLoadingPatients] = useState(false);
  
  // Estados para importação de agendamentos
  const [capimAppointments, setCapimAppointments] = useState<any[]>([]);
  const [capimLoadingAppointments, setCapimLoadingAppointments] = useState(false);
  const [capimImportingAppointments, setCapimImportingAppointments] = useState(false);
  const [capimImportAppointmentsProgress, setCapimImportAppointmentsProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [capimImportAppointmentsResult, setCapimImportAppointmentsResult] = useState<{ 
    success: number; 
    errors: number; 
    skipped: number;
    skippedDetails?: {
      alreadyImported: number;
      patientNotFound: number;
      invalidDate: number;
    };
    skippedAppointments?: Array<{
      id: string;
      reason: 'alreadyImported' | 'patientNotFound' | 'invalidDate' | 'error';
      title?: string;
      patientName?: string;
      patientPhone?: string;
      startDate?: string;
      endDate?: string;
      error?: string;
    }>;
  } | null>(null);

  const isVibrant = themePreference === 'vibrant';
  const neutralCardClass = isVibrant
    ? 'border border-white/25 bg-white/70 backdrop-blur-xl shadow-xl'
    : 'border border-border/60 shadow-none';
  const subtleTextClass = isVibrant ? 'text-slate-600/80' : 'text-muted-foreground';

  const loadSettings = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      // Carregar configurações da empresa específica
      const settingsDoc = await getDoc(doc(db, `companies/${companyId}/settings`, 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as Partial<SettingsData>;
        setSettings(prev => {
          // Converter 'meta' para 'disabled' se existir configuração antiga
          let provider = data.whatsappProvider as SettingsData['whatsappProvider'];
          if (provider === 'meta') {
            provider = 'disabled';
          }
          
          // Migrar nomeSalao para nomeFantasia se necessário (compatibilidade com dados antigos)
          const nomeFantasia = data.nomeFantasia ?? data.nomeSalao ?? '';
          
          // Migrar horário de funcionamento antigo para nova estrutura
          let horarioFuncionamento: HorarioFuncionamentoConfig = prev.horarioFuncionamento;
          if (data.horarioFuncionamento) {
            const horarioAntigo = data.horarioFuncionamento;
            // Se tem estrutura antiga (inicio, fim, diasSemana) e não tem nova estrutura
            if (horarioAntigo.inicio && horarioAntigo.fim && horarioAntigo.diasSemana && 
                !horarioAntigo.horariosPorDia) {
              // Migrar para nova estrutura
              horarioFuncionamento = {
                horariosPorDia: horarioAntigo.diasSemana.map(dia => ({
                  diaSemana: dia,
                  inicio: horarioAntigo.inicio!,
                  fim: horarioAntigo.fim!,
                  ativo: true
                })),
                intervalos: horarioAntigo.intervalos || [],
                bloqueios: horarioAntigo.bloqueios || []
              };
            } else {
              // Usar nova estrutura ou mesclar com padrões
              horarioFuncionamento = {
                horariosPorDia: horarioAntigo.horariosPorDia || prev.horarioFuncionamento.horariosPorDia || [],
                intervalos: horarioAntigo.intervalos || [],
                bloqueios: horarioAntigo.bloqueios || []
              };
            }
          }
          
          // Mensagem padrão de aniversário
          const mensagemAniversarioPadrao = `🎉 *Feliz Aniversário, {{NOME_CLIENTE}}!* 🎉 🎉 

Parabéns pelo seu aniversário! 🎂 

Que este novo ano traga muita saúde, felicidade e inúmeras realizações. Que cada dia seja uma nova oportunidade para celebrar a vida e conquistar seus sonhos. 🎊 Desejamos um dia muito especial, repleto de momentos inesquecíveis! 🍀

 Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de saúde, alegria e realizações! 🎂✨ 

Parabéns pelo seu dia especial! 🎈`;

          return {
            ...prev,
            ...data,
            nomeSalao: data.nomeSalao ?? prev.nomeSalao, // Manter para compatibilidade
            nomeFantasia: nomeFantasia,
            razaoSocial: data.razaoSocial ?? prev.razaoSocial ?? '',
            whatsappProvider: provider ?? prev.whatsappProvider,
            // Se não houver tipo salvo, usar undefined (não padrão)
            whatsappIntegrationType: data.whatsappIntegrationType 
              ? (data.whatsappIntegrationType as SettingsData['whatsappIntegrationType'])
              : undefined,
            whatsappNumber: data.whatsappNumber ? (data.whatsappNumber as string) : undefined,
            customerLabel: (data.customerLabel as SettingsData['customerLabel']) ?? prev.customerLabel,
            showCommission: data.showCommission ?? prev.showCommission,
            horarioFuncionamento,
            // Usar mensagem padrão se não houver mensagem salva ou se estiver vazia
            mensagemAniversarioTexto: (data.mensagemAniversarioTexto && data.mensagemAniversarioTexto.trim()) 
              ? data.mensagemAniversarioTexto 
              : mensagemAniversarioPadrao,
          };
        });
        
        // Carregar credenciais do Capim se existirem
        if (data.capimEmail) {
          setCapimEmail(data.capimEmail);
        }
        if (data.capimPassword) {
          setCapimPassword(data.capimPassword);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadSettings();
    }
  }, [companyId, loadSettings]);

  useEffect(() => {
    if (!companyId) {
      setEvolutionStatus(null);
      return;
    }

    const unsubscribeEvolution = onSnapshot(
      doc(db, `companies/${companyId}/integrations`, 'whatsappEvolution'),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setEvolutionStatus(data);
          // Resetar contador de erro quando o QR code mudar
          const newQrCode = data?.qrCode || null;
          
          // Verificar status de conexão
          const status = data?.status;
          const isConnected = status === 'connected';
          
          // Se conectou, limpar QR code e resetar estados
          if (isConnected) {
            setQrCodeErrorCount(0);
            setQrCodeSrc(null);
            setQrCodeLoading(false);
            setQrCodeImageLoaded(false);
            qrCodeErrorAttemptsRef.current = 0;
            previousQrCodeRef.current = null;
          } else {
            // Se não está conectado, verificar se QR code mudou
            const newQrCode = data?.qrCode || null;
            
            // Se não está conectado e tem QR code em cache, ignorar e forçar novo
            // Só usar QR code se foi gerado recentemente (menos de 5 minutos)
            const qrCodeAge = data?.qrCodeGeneratedAt 
              ? Date.now() - (data.qrCodeGeneratedAt.toMillis?.() || data.qrCodeGeneratedAt.seconds * 1000)
              : Infinity;
            const isQrCodeRecent = qrCodeAge < 5 * 60 * 1000; // 5 minutos
            
            if (newQrCode !== previousQrCodeRef.current) {
              // QR code mudou - resetar tudo e forçar recálculo
              setQrCodeErrorCount(0);
              setQrCodeSrc(null); // Limpar URL alternativa para forçar recálculo
              setQrCodeLoading(true);
              setQrCodeImageLoaded(false); // Resetar flag de imagem carregada
              qrCodeErrorAttemptsRef.current = 0;
              previousQrCodeRef.current = newQrCode;
              
              // Se QR code é antigo (do cache), forçar geração de novo
              if (!isQrCodeRecent && newQrCode) {
                console.log('[QR Code] QR code antigo detectado, forçando geração de novo...');
                // Não usar o QR code antigo - será gerado novo via requestEvolutionPairing
                previousQrCodeRef.current = null;
              }
            } else if (newQrCode && !isQrCodeRecent) {
              // Mesmo QR code mas é antigo - ignorar
              previousQrCodeRef.current = null;
              setQrCodeImageLoaded(false);
            } else if (newQrCode) {
              // Mesmo QR code e é recente - manter estado atual
              previousQrCodeRef.current = newQrCode;
            } else {
              // Sem QR code
              previousQrCodeRef.current = null;
              setQrCodeImageLoaded(false);
            }
          }
        } else {
          setEvolutionStatus(null);
          setQrCodeErrorCount(0);
          setQrCodeSrc(null);
          setQrCodeLoading(false);
          setQrCodeImageLoaded(false);
          qrCodeErrorAttemptsRef.current = 0;
          previousQrCodeRef.current = null;
        }
      },
      error => {
        console.error('Erro ao monitorar status do Evolution:', error);
      }
    );

    return () => {
      unsubscribeEvolution();
    };
  }, [companyId]);

  // Polling para verificar status quando estiver aguardando QR Code
  useEffect(() => {
    if (!companyId || !settings.whatsappProvider || settings.whatsappProvider !== 'evolution') {
      return;
    }

    const status = evolutionStatus?.status;
    const shouldPoll = status === 'pending_qr' || status === 'initializing';

    if (!shouldPoll) {
      return;
    }

    const checkStatus = httpsCallable(functions, 'checkEvolutionStatus');
    
    const intervalId = setInterval(async () => {
      try {
        console.log('[Evolution Status] Verificando status da instância...');
        const result = await checkStatus({ companyId });
        const data = result.data as any;
        
        if (data?.success && data?.status === 'connected') {
          console.log('[Evolution Status] WhatsApp conectado!');
          // O status será atualizado automaticamente via onSnapshot acima
        }
      } catch (error) {
        console.error('[Evolution Status] Erro ao verificar status:', error);
        // Não fazer nada em caso de erro, apenas logar
      }
    }, 5000); // A cada 5 segundos

    return () => {
      clearInterval(intervalId);
    };
  }, [companyId, evolutionStatus?.status, settings.whatsappProvider]);


  const requestEvolutionPairing = useCallback(async () => {
    if (!companyId) return;
    if (!settings.whatsappIntegrationType) {
      setEvolutionPairingError('Selecione o tipo de WhatsApp antes de gerar o QR Code.');
      return;
    }
    const numberDigits = settings.whatsappNumber?.replace(/\D/g, '') || '';
    if (!settings.whatsappNumber || numberDigits.length < 10) {
      setEvolutionPairingError('Digite o número completo do WhatsApp (mínimo 10 dígitos) antes de gerar o QR Code.');
      return;
    }
    setEvolutionPairingLoading(true);
    setEvolutionPairingError(null);
    setEvolutionPairingTriggeredAt(Date.now());
    try {
      const callable = httpsCallable(functions, 'startEvolutionSession');
      const result = await callable({ 
        companyId,
        whatsappIntegrationType: settings.whatsappIntegrationType,
        whatsappNumber: settings.whatsappNumber.replace(/\D/g, '') // Remover caracteres não numéricos
      }) as any;
      if (result.data?.error) {
        setEvolutionPairingError(result.data.error);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar pareamento Evolution:', error);
      setEvolutionPairingError(error?.message || 'Não foi possível solicitar o QR Code. Tente novamente.');
    } finally {
      setEvolutionPairingLoading(false);
    }
  }, [companyId, settings.whatsappIntegrationType, settings.whatsappNumber]);

  const refreshMessageStats = useCallback(async () => {
    if (!companyId) {
      setMessageStats({
        monthCount: 0,
        totalCount: 0,
        extraCount: 0,
        estimatedCost: 0,
        fetchedAt: null,
      });
      setMessageStatsError(null);
      setMessageStatsLoading(false);
      return;
    }

    try {
      setMessageStatsLoading(true);
      setMessageStatsError(null);

      const now = new Date();
      const monthStart = startOfMonth(now);
      const nextMonthStart = addMonths(monthStart, 1);

      // Usar a collection correta: companies/{companyId}/whatsappMessages
      // Filtrar apenas mensagens automáticas (messageSource: 'automatic')
      const monthQuery = query(
        collection(db, `companies/${companyId}/whatsappMessages`),
        where('messageSource', '==', 'automatic'),
        where('createdAt', '>=', Timestamp.fromDate(monthStart)),
        where('createdAt', '<', Timestamp.fromDate(nextMonthStart))
      );

      const totalQuery = query(
        collection(db, `companies/${companyId}/whatsappMessages`),
        where('messageSource', '==', 'automatic')
      );

      const [monthSnapshot, totalSnapshot] = await Promise.all([
        getCountFromServer(monthQuery),
        getCountFromServer(totalQuery),
      ]);

      const monthCount = Number(monthSnapshot.data().count ?? 0);
      const totalCount = Number(totalSnapshot.data().count ?? 0);
      const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);

      setMessageStats({
        monthCount,
        totalCount,
        extraCount,
        estimatedCost: extraCount * WHATSAPP_MESSAGE_UNIT_PRICE,
        fetchedAt: new Date(),
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas de mensagens:', error);
      setMessageStatsError('Não foi possível carregar as estatísticas de mensagens.');
    } finally {
      setMessageStatsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      refreshMessageStats();
    } else {
      setMessageStats({
        monthCount: 0,
        totalCount: 0,
        extraCount: 0,
        estimatedCost: 0,
        fetchedAt: null,
      });
      setMessageStatsError(null);
      setMessageStatsLoading(false);
    }
  }, [companyId, refreshMessageStats]);


  // Removido: geração automática do QR code
  // O QR code agora só é gerado quando o usuário clica no botão "Gerar/Atualizar QR Code"

  const [tipoEstabelecimento, setTipoEstabelecimento] = useState<TipoEstabelecimento | undefined>(undefined);

  useEffect(() => {
    if (company?.tipoEstabelecimento) {
      setTipoEstabelecimento(company.tipoEstabelecimento);
    }
    if (company?.logoUrl) {
      setLogoUrl(company.logoUrl);
    }
  }, [company]);

  /**
   * Normaliza um número de telefone removendo caracteres não numéricos
   */
  const normalizarTelefone = (telefone: string | null | undefined): string | null => {
    if (!telefone) return null;
    return telefone.replace(/\D/g, '');
  };

  /**
   * Gera todas as variantes de um número de telefone para busca
   */
  const generatePhoneVariants = (phoneNumber: string): Set<string> => {
    const normalized = normalizarTelefone(phoneNumber);
    if (!normalized || normalized.length < 10) {
      return new Set();
    }

    const variants = new Set<string>();
    variants.add(normalized);
    
    if (!normalized.startsWith('55')) {
      variants.add(`55${normalized}`);
    } else {
      variants.add(normalized.slice(2));
    }
    
    if (normalized.length === 13 && normalized.startsWith('55')) {
      const without9 = normalized.slice(0, 4) + normalized.slice(5);
      variants.add(without9);
      variants.add(without9.slice(2));
    }

    return variants;
  };

  /**
   * Atualiza a collection whatsappPhoneNumbers com o mapeamento número -> companyId
   */
  const updateWhatsappPhoneNumbers = async (phoneNumber: string | null | undefined) => {
    if (!phoneNumber || !companyId) return;

    const normalized = normalizarTelefone(phoneNumber);
    if (!normalized || normalized.length < 10) return;

    const variants = generatePhoneVariants(phoneNumber);
    const batch = writeBatch(db);
    const timestamp = Timestamp.now();

    for (const variant of Array.from(variants)) {
      const phoneRef = doc(db, 'whatsappPhoneNumbers', variant);
      batch.set(phoneRef, {
        companyId,
        phoneNumber: normalized,
        originalPhoneNumber: phoneNumber,
        updatedAt: timestamp,
      }, { merge: true });
    }

    await batch.commit();
    console.log(`[Settings] ✅ Mapeamento de telefone atualizado: ${normalized} -> ${companyId} (${variants.size} variantes)`);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo é muito grande. Por favor, selecione uma imagem de até 5MB.');
      return;
    }

    setLogoFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !companyId) return null;

    try {
      setUploadingLogo(true);

      // Criar caminho no Storage
      const fileExtension = logoFile.name.split('.').pop() || 'png';
      const sanitizedName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `companies/${companyId}/logo/${Date.now()}-${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      // Fazer upload
      await uploadBytes(storageRef, logoFile, {
        contentType: logoFile.type,
      });

      // Obter URL
      const downloadURL = await getDownloadURL(storageRef);

      // Se havia um logo anterior, deletar do Storage
      if (logoUrl && logoUrl.includes('/o/')) {
        try {
          // Extrair o path do Storage da URL
          const urlParts = logoUrl.split('/o/');
          if (urlParts.length > 1) {
            const pathPart = urlParts[1].split('?')[0];
            const decodedPath = decodeURIComponent(pathPart);
            const oldLogoRef = ref(storage, decodedPath);
            await deleteObject(oldLogoRef);
          }
        } catch (error) {
          console.warn('Erro ao deletar logo anterior:', error);
          // Continuar mesmo se não conseguir deletar
        }
      }

      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      throw error;
    } finally {
      setUploadingLogo(false);
    }
  };

  // Função temporária para gerar dados de exemplo
  const gerarDadosExemplo = async () => {
    if (!companyId) {
      alert('Erro: Empresa não identificada');
      return;
    }

    if (!user) {
      alert('Erro: Usuário não identificado');
      return;
    }

    if (!confirm('Tem certeza que deseja gerar dados de exemplo? Esta operação criará:\n- 60 clientes\n- 8 serviços\n- 7 profissionais\n- Diversos eventos na agenda (próximos 3 meses + mês atual)\n\nEsta operação pode demorar alguns minutos.')) {
      return;
    }

    setGerandoDadosExemplo(true);
    try {
      const result = await SampleDataGenerator.generateSampleData({
        companyId,
        userId: user.uid,
        onProgress: (message, totalCreated) => {
          console.log(message, `Total: ${totalCreated}`);
        }
      });

      alert(`Dados de exemplo criados com sucesso!\n\n- ${result.patientsCreated} clientes\n- ${result.servicesCreated} serviços\n- ${result.professionalsCreated} profissionais\n- ${result.appointmentsCreated} eventos na agenda`);
    } catch (error) {
      console.error('Erro ao gerar dados de exemplo:', error);
      alert('Erro ao gerar dados de exemplo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setGerandoDadosExemplo(false);
    }
  };

  // Função temporária para importar medicamentos do JSON
  const importMedicamentos = async () => {
    if (!companyId) {
      alert('Erro: Empresa não identificada');
      return;
    }

    if (!confirm('Tem certeza que deseja importar os medicamentos? Esta operação pode demorar alguns minutos.')) {
      return;
    }

    setImportingMedicamentos(true);
    try {
      // Carregar o arquivo JSON
      const response = await fetch('/medicamentos.json');
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivo medicamentos.json');
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Formato inválido do arquivo JSON');
      }

      let successCount = 0;
      let errorCount = 0;
      const batchSize = 100; // Processar em lotes para evitar sobrecarga

      // Processar em lotes
      for (let i = 0; i < data.data.length; i += batchSize) {
        const batch = data.data.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            if (item.attributes) {
              const medicamentoData = {
                default: item.attributes.default ?? true,
                measurement_qty: item.attributes.measurement_qty ?? 1,
                measurement_type: item.attributes.measurement_type ?? 'tubes',
                name: item.attributes.name || '',
                posology: item.attributes.posology || '',
                special_prescription_required: item.attributes.special_prescription_required ?? false,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

              // Adicionar à collection raiz do Firestore
              await addDoc(collection(db, 'medicamentos'), medicamentoData);
              successCount++;
            }
          } catch (error) {
            console.error('Erro ao importar medicamento:', item.id, error);
            errorCount++;
          }
        }

        // Atualizar progresso
        console.log(`Processados ${Math.min(i + batchSize, data.data.length)} de ${data.data.length} medicamentos`);
      }

      alert(`Importação concluída!\nSucesso: ${successCount}\nErros: ${errorCount}`);
    } catch (error) {
      console.error('Erro ao importar medicamentos:', error);
      alert('Erro ao importar medicamentos: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setImportingMedicamentos(false);
    }
  };

  // Funções para migração do Capim
  const authenticateCapim = async () => {
    if (!capimEmail || !capimPassword) {
      setCapimAuthError('Por favor, preencha email e senha');
      return;
    }

    setCapimAuthenticating(true);
    setCapimAuthError(null);

    try {
      const response = await fetch('https://api.dash.capim.com.br/v1/users/sign_in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'pt-BR,pt;q=0.9',
          'origin': 'https://dash.capim.com.br',
          'referer': 'https://dash.capim.com.br/'
        },
        body: JSON.stringify({
          user: {
            email: capimEmail,
            password: capimPassword
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro ao fazer login' }));
        throw new Error(errorData.message || errorData.error || 'Credenciais inválidas');
      }

      // O token vem no header 'authorization' da resposta
      // Nota: Pode não estar acessível devido a CORS, então tentamos ler do body também
      let token: string | null = null;
      
      // Tentar ler do header primeiro
      try {
        const authHeader = response.headers.get('authorization');
        if (authHeader) {
          // Remover "Bearer " se presente
          token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        }
      } catch (headerError) {
        console.warn('Não foi possível ler header authorization:', headerError);
      }
      
      // Se não encontrou no header, tentar no body
      if (!token) {
        try {
          const data = await response.json().catch(() => ({}));
          token = data.token || data.access_token || data.accessToken || data.authorization;
          
          // Se o token no body começar com "Bearer ", remover
          if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
            token = token.substring(7);
          }
        } catch (bodyError) {
          console.warn('Erro ao ler body da resposta:', bodyError);
        }
      }
      
      if (!token) {
        throw new Error('Token não encontrado na resposta. Verifique se o servidor permite acesso ao header authorization via CORS.');
      }
      
      setCapimToken(token);
      
      setCapimAuthError(null);
      
      // Salvar credenciais nas configurações da empresa
      if (companyId) {
        try {
          await updateDoc(doc(db, `companies/${companyId}/settings`, 'general'), {
            capimEmail: capimEmail,
            capimPassword: capimPassword,
            updatedAt: Timestamp.now()
          });
          
          // Atualizar cache Redis de configurações com os novos valores
          try {
            const updateCache = httpsCallable(functions, 'updateSettingsCache');
            await updateCache({ companyId });
            console.log('[Configurações] Cache Redis atualizado após salvar credenciais Capim');
          } catch (cacheError) {
            console.warn('[Configurações] Erro ao atualizar cache (não crítico):', cacheError);
          }
        } catch (saveError) {
          console.warn('Erro ao salvar credenciais do Capim:', saveError);
          // Não é crítico, apenas avisa mas não impede o login
        }
      }
    } catch (error) {
      console.error('Erro ao autenticar no Capim:', error);
      setCapimAuthError(error instanceof Error ? error.message : 'Erro ao fazer login');
      setCapimToken(null);
    } finally {
      setCapimAuthenticating(false);
    }
  };

  const fetchCapimPatients = async (page: number = 1, allPatients: any[] = []): Promise<any[]> => {
    if (!capimToken) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      const response = await fetch(`https://api.dash.capim.com.br/v1/patients?page=${page}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${capimToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token expirado. Por favor, faça login novamente.');
        }
        throw new Error(`Erro ao buscar pacientes: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // A estrutura é: { data: [...], meta: { pagination: {...} } }
      const patientsArray = responseData.data || [];
      const pagination = responseData.meta?.pagination || {};

      // Adicionar os pacientes da página atual à lista completa
      const combined = [...allPatients, ...patientsArray];

      // Verificar se há mais páginas usando a estrutura correta
      const hasMore = pagination.next !== null && pagination.next !== undefined;
      const isLastPage = pagination.last_page === false;

      // Continuar buscando se houver próxima página
      if ((hasMore || isLastPage === false) && patientsArray.length > 0) {
        const nextPage = pagination.next || page + 1;
        return fetchCapimPatients(nextPage, combined);
      }

      return combined;
    } catch (error) {
      console.error('Erro ao buscar pacientes do Capim:', error);
      throw error;
    }
  };

  const loadCapimPatients = async () => {
    if (!capimToken) {
      setCapimAuthError('Por favor, faça login primeiro');
      return;
    }

    setCapimLoadingPatients(true);
    setCapimAuthError(null);

    try {
      const patients = await fetchCapimPatients(1);
      setCapimPatients(patients);
    } catch (error) {
      setCapimAuthError(error instanceof Error ? error.message : 'Erro ao carregar pacientes');
      setCapimPatients([]);
    } finally {
      setCapimLoadingPatients(false);
    }
  };

  const importCapimPatients = async () => {
    if (!companyId || !user) {
      alert('Erro: Empresa ou usuário não identificado');
      return;
    }

    if (capimPatients.length === 0) {
      alert('Nenhum paciente para importar. Por favor, carregue os pacientes primeiro.');
      return;
    }

    setCapimImporting(true);
    setCapimImportProgress({ current: 0, total: capimPatients.length });
    setCapimImportResult(null);
    setCapimAuthError(null);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      for (let i = 0; i < capimPatients.length; i++) {
        const capimPatient = capimPatients[i];
        setCapimImportProgress({ current: i + 1, total: capimPatients.length });

        try {
          // A estrutura do Capim é: { id, type, attributes: { name, phone, email, cpf, birthdate, ... } }
          const attrs = capimPatient.attributes || capimPatient;
          
          // Mapear dados do Capim para o formato do SmartDoctor
          const nome = attrs.name || attrs.nome || attrs.full_name || '';
          const telefone = attrs.phone || attrs.telefone || attrs.phone_number || '';
          const email = attrs.email || '';
          const cpf = attrs.cpf || attrs.document || '';
          
          // Se não tem nome, pular (mas aceitar se não tiver telefone, pois pode ser atualizado depois)
          if (!nome) {
            skippedCount++;
            continue;
          }

          // Converter telefone para formato E164 (adicionar +55 se necessário)
          // Telefone agora é opcional - não é mais usado para verificar duplicatas
          let telefoneE164: string | undefined = undefined;
          if (telefone) {
            telefoneE164 = telefone.replace(/\D/g, ''); // Remove caracteres não numéricos
            if (telefoneE164 && !telefoneE164.startsWith('55')) {
              telefoneE164 = '55' + telefoneE164;
            }
            if (telefoneE164 && !telefoneE164.startsWith('+')) {
              telefoneE164 = '+' + telefoneE164;
            }
          }

          // Converter data de nascimento se existir
          let dataNascimento: Date | undefined;
          const birthdateStr = attrs.birthdate || attrs.birth_date || attrs.data_nascimento || attrs.birthDate;
          if (birthdateStr) {
            const parsedDate = new Date(birthdateStr);
            if (!isNaN(parsedDate.getTime())) {
              dataNascimento = parsedDate;
            }
          }

          // Verificar se já existe paciente com mesmo idCapim (atualizar em vez de ignorar)
          // A estrutura do Capim é: { id: "3110375", type: "patient", attributes: {...} }
          // Usar APENAS idCapim para verificar duplicatas - telefone não é mais usado como identificador
          const idCapim = capimPatient.id ? String(capimPatient.id) : null;
          
          let existingPatientId: string | null = null;
          if (idCapim) {
            const existingCapimQuery = query(
              collection(db, `companies/${companyId}/patients`),
              where('idCapim', '==', idCapim)
            );
            const existingCapimSnapshot = await getDocs(existingCapimQuery);
            
            if (!existingCapimSnapshot.empty) {
              existingPatientId = existingCapimSnapshot.docs[0].id;
              console.log(`[Capim Import] Paciente já existe com idCapim ${idCapim}, atualizando...`);
            }
          } else {
            // Log para debug: paciente sem idCapim
            console.warn('[Capim Import] Paciente sem idCapim:', capimPatient);
          }

          // Preparar dados do paciente
          // Telefone é opcional - não é mais obrigatório
          const patientData: Partial<Omit<Patient, 'id'>> = {
            nome: nome.trim(),
            telefoneE164: telefoneE164 || undefined, // Telefone opcional
            email: email ? email.trim() : undefined,
            cpf: cpf ? cpf.replace(/\D/g, '') : undefined, // Remove formatação do CPF
            preferenciaNotificacao: telefoneE164 ? 'whatsapp' : 'email',
            dataNascimento: dataNascimento,
            anamnese: attrs.anamnese || attrs.notes || attrs.observacoes || undefined,
            idCapim: idCapim ? idCapim : undefined // Salvar ID do Capim para correlação (só salvar se não for null)
          };

          // Remover campos undefined para evitar erro no Firebase
          const cleanPatientData: Record<string, any> = {};
          Object.keys(patientData).forEach(key => {
            const value = patientData[key as keyof typeof patientData];
            if (value !== undefined) {
              cleanPatientData[key] = value;
            }
          });
          
          // Garantir que idCapim seja salvo se existir (importante para correlação com agendamentos)
          if (idCapim) {
            cleanPatientData.idCapim = idCapim;
          }

          if (existingPatientId) {
            // Atualizar paciente existente
            const patientRef = doc(db, `companies/${companyId}/patients`, existingPatientId);
            await updateDoc(patientRef, {
              ...cleanPatientData,
              updatedAt: Timestamp.now()
            });
            
            console.log(`[Capim Import] Paciente atualizado com idCapim: ${idCapim}`, {
              patientId: existingPatientId,
              nome: cleanPatientData.nome,
              idCapim: cleanPatientData.idCapim
            });
          } else {
            // Criar novo paciente
            const patientRef = await addDoc(collection(db, `companies/${companyId}/patients`), {
              companyId,
              ownerUid: user.uid,
              ...cleanPatientData,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });

            // Log para debug: verificar se idCapim foi salvo
            if (idCapim) {
              console.log(`[Capim Import] Paciente criado com idCapim: ${idCapim}`, {
                patientId: patientRef.id,
                nome: cleanPatientData.nome,
                idCapim: cleanPatientData.idCapim
              });
            }
          }

          successCount++;
        } catch (error) {
          console.error('Erro ao importar paciente:', capimPatient, error);
          errorCount++;
        }
      }

      setCapimImportResult({ success: successCount, errors: errorCount, skipped: skippedCount });
      
      // Invalidar cache de pacientes para atualizar a lista
      if (successCount > 0 && companyId) {
        try {
          const { firestoreCache } = await import('@/lib/firestore-cache');
          firestoreCache.invalidateCollection(`companies/${companyId}/patients`);
        } catch (cacheError) {
          console.warn('Erro ao invalidar cache:', cacheError);
          // Não é crítico, o onSnapshot vai atualizar automaticamente
        }
      }
    } catch (error) {
      console.error('Erro ao importar pacientes do Capim:', error);
      setCapimAuthError(error instanceof Error ? error.message : 'Erro ao importar pacientes');
    } finally {
      setCapimImporting(false);
    }
  };

  // Função para buscar ou criar o serviço "Importado Capim"
  const getOrCreateCapimService = async (): Promise<string> => {
    if (!companyId) {
      throw new Error('Empresa não identificada');
    }

    // Buscar serviço existente
    const servicesQuery = query(
      collection(db, `companies/${companyId}/services`),
      where('nome', '==', 'Importado Capim')
    );
    const servicesSnapshot = await getDocs(servicesQuery);

    if (!servicesSnapshot.empty) {
      return servicesSnapshot.docs[0].id;
    }

    // Criar novo serviço se não existir
    const newServiceRef = await addDoc(collection(db, `companies/${companyId}/services`), {
      companyId,
      nome: 'Importado Capim',
      duracaoMin: 15, // Duração padrão de 15 minutos
      precoCentavos: 0, // Sem preço definido
      comissaoPercent: 0,
      ativo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return newServiceRef.id;
  };

  // Função para buscar agendamentos do Capim
  const fetchCapimAppointments = async (startDate: Date, endDate: Date): Promise<any[]> => {
    if (!capimToken) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();
      
      const response = await fetch(
        `https://api.dash.capim.com.br/v1/time_slots?start_date=${encodeURIComponent(startDateISO)}&end_date=${encodeURIComponent(endDateISO)}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${capimToken}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token expirado. Por favor, faça login novamente.');
        }
        throw new Error(`Erro ao buscar agendamentos: ${response.statusText}`);
      }

      const data = await response.json();
      const appointments = data.data || [];
      
      // Filtrar apenas agendamentos (não aniversários)
      return appointments.filter((apt: any) => 
        apt.attributes?.event_kind === 'appointment'
      );
    } catch (error) {
      console.error('Erro ao buscar agendamentos do Capim:', error);
      throw error;
    }
  };

  // Função para carregar agendamentos do Capim
  const loadCapimAppointments = async () => {
    if (!capimToken) {
      alert('Por favor, faça login no Capim primeiro.');
      return;
    }

    setCapimLoadingAppointments(true);
    setCapimAppointments([]);
    setCapimAuthError(null);

    try {
      // Buscar agendamentos do último ano até os próximos 6 meses
      const today = new Date();
      const startDate = subMonths(today, 12); // 1 ano atrás
      const endDate = addMonths(today, 6); // 6 meses à frente

      const appointments = await fetchCapimAppointments(startDate, endDate);
      setCapimAppointments(appointments);
    } catch (error) {
      console.error('Erro ao carregar agendamentos do Capim:', error);
      setCapimAuthError(error instanceof Error ? error.message : 'Erro ao carregar agendamentos');
    } finally {
      setCapimLoadingAppointments(false);
    }
  };

  // Função para importar agendamentos do Capim
  const importCapimAppointments = async () => {
    if (!companyId || !user) {
      alert('Erro: Empresa ou usuário não identificado');
      return;
    }

    if (capimAppointments.length === 0) {
      alert('Nenhum agendamento para importar. Por favor, carregue os agendamentos primeiro.');
      return;
    }

    setCapimImportingAppointments(true);
    setCapimImportAppointmentsProgress({ current: 0, total: capimAppointments.length });
    setCapimImportAppointmentsResult(null);
    setCapimAuthError(null);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const skippedDetails = {
      alreadyImported: 0,
      patientNotFound: 0,
      invalidDate: 0
    };
    const skippedAppointments: Array<{
      id: string;
      reason: 'alreadyImported' | 'patientNotFound' | 'invalidDate' | 'error';
      title?: string;
      patientName?: string;
      patientPhone?: string;
      startDate?: string;
      endDate?: string;
      error?: string;
    }> = [];

    try {
      // Buscar ou criar o serviço "Importado Capim"
      const capimServiceId = await getOrCreateCapimService();

      // Buscar o primeiro profissional disponível (ou criar um padrão se necessário)
      const professionalsQuery = query(
        collection(db, `companies/${companyId}/professionals`)
      );
      const professionalsSnapshot = await getDocs(professionalsQuery);
      
      if (professionalsSnapshot.empty) {
        throw new Error('Nenhum profissional encontrado. Por favor, cadastre um profissional primeiro.');
      }

      const firstProfessional = professionalsSnapshot.docs[0];
      const professionalId = firstProfessional.id;

      // Criar um mapa de pacientes por idCapim para busca rápida
      // Buscar todos os pacientes e filtrar os que têm idCapim
      const patientsQuery = query(
        collection(db, `companies/${companyId}/patients`)
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientsByCapimId = new Map<string, string>();
      
      patientsSnapshot.docs.forEach(doc => {
        const patientData = doc.data();
        if (patientData.idCapim) {
          patientsByCapimId.set(String(patientData.idCapim), doc.id);
        }
      });

      // Verificar agendamentos já importados
      // Buscar todos os agendamentos e filtrar os que têm idCapim
      const existingAppointmentsQuery = query(
        collection(db, `companies/${companyId}/appointments`)
      );
      const existingAppointmentsSnapshot = await getDocs(existingAppointmentsQuery);
      const existingCapimIds = new Set<string>();
      
      existingAppointmentsSnapshot.docs.forEach(doc => {
        const aptData = doc.data();
        if (aptData.idCapim) {
          existingCapimIds.add(String(aptData.idCapim));
        }
      });

      for (let i = 0; i < capimAppointments.length; i++) {
        const capimAppointment = capimAppointments[i];
        setCapimImportAppointmentsProgress({ current: i + 1, total: capimAppointments.length });

        try {
          const attrs = capimAppointment.attributes || {};
          const relationships = capimAppointment.relationships || {};
          const capimAppointmentId = String(capimAppointment.id);
          const capimPatientId = relationships.patient?.data?.id 
            ? String(relationships.patient.data.id) 
            : null;

          // Verificar se já foi importado
          if (existingCapimIds.has(capimAppointmentId)) {
            console.log(`[Capim Import] Agendamento ${capimAppointmentId} já existe, ignorando...`, {
              title: attrs.title || attrs.patient_name,
              start_date: attrs.start_date
            });
            skippedCount++;
            skippedDetails.alreadyImported++;
            skippedAppointments.push({
              id: capimAppointmentId,
              reason: 'alreadyImported',
              title: attrs.title || attrs.patient_name,
              patientName: attrs.patient_name,
              patientPhone: attrs.patient_phone,
              startDate: attrs.start_date,
              endDate: attrs.end_date
            });
            continue;
          }

          // Buscar paciente pelo idCapim
          let patientId: string | null = null;
          let skipReason = '';
          
          if (capimPatientId) {
            patientId = patientsByCapimId.get(capimPatientId) || null;
            if (!patientId) {
              skipReason = `Paciente com idCapim ${capimPatientId} não encontrado`;
            }
          } else {
            skipReason = 'Agendamento sem idCapim do paciente';
          }

          // Se não encontrou paciente, tentar buscar pelo telefone
          if (!patientId && attrs.patient_phone) {
            const phone = attrs.patient_phone.replace(/\D/g, '');
            let telefoneE164 = phone;
            if (telefoneE164 && !telefoneE164.startsWith('55')) {
              telefoneE164 = '55' + telefoneE164;
            }
            if (telefoneE164 && !telefoneE164.startsWith('+')) {
              telefoneE164 = '+' + telefoneE164;
            }

            if (telefoneE164) {
              const patientByPhoneQuery = query(
                collection(db, `companies/${companyId}/patients`),
                where('telefoneE164', '==', telefoneE164)
              );
              const patientByPhoneSnapshot = await getDocs(patientByPhoneQuery);
              if (!patientByPhoneSnapshot.empty) {
                patientId = patientByPhoneSnapshot.docs[0].id;
                skipReason = ''; // Encontrou pelo telefone
              } else if (!skipReason) {
                skipReason = `Paciente com telefone ${attrs.patient_phone} não encontrado`;
              }
            }
          }

          // Se não encontrou paciente, tentar buscar pelo nome (última tentativa)
          // Se patient_name for "NOVA AVALIAÇÃO", usar o campo title para buscar o paciente
          if (!patientId) {
            let patientNameToSearch = attrs.patient_name?.trim() || '';
            
            // Se patient_name for "NOVA AVALIAÇÃO", usar o title
            if (patientNameToSearch.toUpperCase() === 'NOVA AVALIAÇÃO' && attrs.title) {
              patientNameToSearch = attrs.title.trim();
              console.log(`[Capim Import] Agendamento ${capimAppointmentId}: patient_name é "NOVA AVALIAÇÃO", usando title "${patientNameToSearch}" para buscar paciente`);
            }
            
            if (patientNameToSearch) {
              // Buscar todos os pacientes e fazer busca case-insensitive por nome
              patientsSnapshot.docs.forEach(doc => {
                const patientData = doc.data();
                const patientNome = (patientData.nome || '').trim();
                if (patientNome.toLowerCase() === patientNameToSearch.toLowerCase()) {
                  patientId = doc.id;
                  skipReason = ''; // Encontrou pelo nome
                }
              });
              
              if (!patientId && !skipReason) {
                skipReason = `Paciente "${patientNameToSearch}" não encontrado`;
              }
            }
          }

          // Se não encontrou paciente, criar automaticamente se patient_name for "NOVA AVALIAÇÃO" e tiver title
          if (!patientId) {
            const isNovaAvaliacao = attrs.patient_name?.trim().toUpperCase() === 'NOVA AVALIAÇÃO';
            const patientNameFromTitle = attrs.title?.trim();
            
            // Se for "NOVA AVALIAÇÃO" e tiver title, criar o paciente automaticamente
            if (isNovaAvaliacao && patientNameFromTitle) {
              try {
                console.log(`[Capim Import] Criando paciente automaticamente: "${patientNameFromTitle}" (patient_name era "NOVA AVALIAÇÃO")`);
                
                // Preparar telefone se disponível
                let telefoneE164: string | undefined = undefined;
                if (attrs.patient_phone) {
                  const phone = attrs.patient_phone.replace(/\D/g, '');
                  telefoneE164 = phone;
                  if (telefoneE164 && !telefoneE164.startsWith('55')) {
                    telefoneE164 = '55' + telefoneE164;
                  }
                  if (telefoneE164 && !telefoneE164.startsWith('+')) {
                    telefoneE164 = '+' + telefoneE164;
                  }
                }
                
                // Criar dados do paciente
                const patientData: Omit<Patient, 'id'> = {
                  companyId,
                  nome: patientNameFromTitle,
                  telefoneE164: telefoneE164 || undefined,
                  email: undefined,
                  cpf: undefined,
                  preferenciaNotificacao: telefoneE164 ? 'whatsapp' : 'email',
                  ownerUid: user.uid,
                  dataNascimento: undefined,
                  anamnese: undefined,
                  idCapim: capimPatientId ? capimPatientId : undefined
                };
                
                // Remover campos undefined para evitar erro no Firebase
                const cleanPatientData: Record<string, any> = {};
                Object.keys(patientData).forEach(key => {
                  const value = patientData[key as keyof typeof patientData];
                  if (value !== undefined) {
                    cleanPatientData[key] = value;
                  }
                });
                
                // Garantir que idCapim seja salvo se existir
                if (capimPatientId) {
                  cleanPatientData.idCapim = capimPatientId;
                }
                
                // Criar o paciente
                const patientRef = await addDoc(collection(db, `companies/${companyId}/patients`), {
                  ...cleanPatientData,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now()
                });
                
                patientId = patientRef.id;
                console.log(`[Capim Import] Paciente criado automaticamente: ${patientId}`, {
                  nome: patientNameFromTitle,
                  idCapim: capimPatientId
                });
                
                // Atualizar o mapa de pacientes para evitar buscas desnecessárias
                if (capimPatientId) {
                  patientsByCapimId.set(capimPatientId, patientId);
                }
              } catch (createError) {
                console.error(`[Capim Import] Erro ao criar paciente automaticamente:`, createError);
                const displayPatientName = patientNameFromTitle || attrs.patient_name;
                skippedCount++;
                skippedDetails.patientNotFound++;
                skippedAppointments.push({
                  id: capimAppointmentId,
                  reason: 'patientNotFound',
                  title: attrs.title || attrs.patient_name,
                  patientName: displayPatientName,
                  patientPhone: attrs.patient_phone,
                  startDate: attrs.start_date,
                  endDate: attrs.end_date,
                  error: `Erro ao criar paciente: ${createError instanceof Error ? createError.message : 'Erro desconhecido'}`
                });
                continue;
              }
            } else {
              // Se não for "NOVA AVALIAÇÃO" ou não tiver title, pular o agendamento
              const displayPatientName = isNovaAvaliacao && patientNameFromTitle
                ? patientNameFromTitle
                : attrs.patient_name;
              
              console.warn(`[Capim Import] Agendamento ${capimAppointmentId} ignorado: ${skipReason || 'Paciente não encontrado'}`, {
                capimPatientId,
                patientName: displayPatientName,
                originalPatientName: attrs.patient_name,
                title: attrs.title,
                patientPhone: attrs.patient_phone
              });
              skippedCount++;
              skippedDetails.patientNotFound++;
              skippedAppointments.push({
                id: capimAppointmentId,
                reason: 'patientNotFound',
                title: attrs.title || attrs.patient_name,
                patientName: displayPatientName,
                patientPhone: attrs.patient_phone,
                startDate: attrs.start_date,
                endDate: attrs.end_date,
                error: skipReason || 'Paciente não encontrado'
              });
              continue;
            }
          }

          // Converter datas
          const startDate = new Date(attrs.start_date);
          const endDate = new Date(attrs.end_date);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn(`[Capim Import] Agendamento ${capimAppointmentId} ignorado: Data inválida`, {
              start_date: attrs.start_date,
              end_date: attrs.end_date
            });
            skippedCount++;
            skippedDetails.invalidDate++;
            skippedAppointments.push({
              id: capimAppointmentId,
              reason: 'invalidDate',
              title: attrs.title || attrs.patient_name,
              patientName: attrs.patient_name,
              patientPhone: attrs.patient_phone,
              startDate: attrs.start_date,
              endDate: attrs.end_date,
              error: `Data inválida: start_date=${attrs.start_date}, end_date=${attrs.end_date}`
            });
            continue;
          }

          // Mapear status do Capim para o sistema
          let status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'no_show' | 'pendente' | 'bloqueio' = 'agendado';
          if (attrs.status === 'confirmed') {
            status = 'confirmado';
          } else if (attrs.status === 'cancelled' || attrs.status === 'canceled') {
            status = 'cancelado';
          } else if (attrs.attended === true) {
            status = 'concluido';
          }

          // Calcular duração em minutos
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationMin = Math.max(15, Math.round(durationMs / (1000 * 60))); // Mínimo 15 minutos

          // Criar agendamento
          const appointmentData = {
            companyId,
            professionalId,
            clientId: patientId,
            serviceId: capimServiceId,
            serviceIds: [capimServiceId],
            inicio: Timestamp.fromDate(startDate),
            fim: Timestamp.fromDate(endDate),
            precoCentavos: 0, // Sem preço definido
            comissaoPercent: 0,
            status,
            observacoes: attrs.observation || attrs.observacoes || `Importado do Capim - ${attrs.title || ''}`,
            createdByUid: user.uid,
            idCapim: capimAppointmentId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          await addDoc(collection(db, `companies/${companyId}/appointments`), appointmentData);

          successCount++;
        } catch (error) {
          console.error('Erro ao importar agendamento:', capimAppointment, error);
          errorCount++;
          const attrs = capimAppointment.attributes || {};
          skippedAppointments.push({
            id: String(capimAppointment.id || 'unknown'),
            reason: 'error',
            title: attrs.title || attrs.patient_name,
            patientName: attrs.patient_name,
            patientPhone: attrs.patient_phone,
            startDate: attrs.start_date,
            endDate: attrs.end_date,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      setCapimImportAppointmentsResult({ 
        success: successCount, 
        errors: errorCount, 
        skipped: skippedCount,
        skippedDetails,
        skippedAppointments: skippedAppointments.length > 0 ? skippedAppointments : undefined
      });
      
      // Invalidar cache de agendamentos
      if (successCount > 0 && companyId) {
        try {
          const { firestoreCache } = await import('@/lib/firestore-cache');
          firestoreCache.invalidateCollection(`companies/${companyId}/appointments`);
        } catch (cacheError) {
          console.warn('Erro ao invalidar cache:', cacheError);
        }
      }
    } catch (error) {
      console.error('Erro ao importar agendamentos do Capim:', error);
      setCapimAuthError(error instanceof Error ? error.message : 'Erro ao importar agendamentos');
    } finally {
      setCapimImportingAppointments(false);
    }
  };

  const saveSettings = async () => {
    if (!companyId) {
      alert('Erro: Empresa não identificada');
      return;
    }
    
    setSaving(true);
    try {
      // Upload do logo se houver arquivo selecionado
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        try {
          finalLogoUrl = await uploadLogo();
          if (finalLogoUrl) {
            setLogoUrl(finalLogoUrl);
            setLogoFile(null);
            setLogoPreview(null);
          }
        } catch (error) {
          console.error('Erro ao fazer upload do logo:', error);
          alert('Erro ao fazer upload do logo. As outras configurações foram salvas.');
        }
      }

      // Função recursiva para remover campos undefined (Firestore não aceita undefined)
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
        }
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Salvar configurações da empresa específica
      const settingsToSave = {
        ...settings,
        // Garantir que nomeSalao seja sincronizado com nomeFantasia para compatibilidade
        nomeSalao: settings.nomeFantasia ?? settings.nomeSalao ?? '',
        // Incluir credenciais do Capim se estiverem preenchidas
        ...(capimEmail ? { capimEmail } : {}),
        ...(capimPassword ? { capimPassword } : {}),
        // Limpar horarioFuncionamento removendo campos undefined
        horarioFuncionamento: {
          horariosPorDia: settings.horarioFuncionamento.horariosPorDia?.map(h => ({
            diaSemana: h.diaSemana,
            inicio: h.inicio,
            fim: h.fim,
            ativo: h.ativo
          })) || [],
          intervalos: settings.horarioFuncionamento.intervalos?.map(i => ({
            id: i.id,
            diaSemana: i.diaSemana,
            inicio: i.inicio,
            fim: i.fim,
            ...(i.descricao ? { descricao: i.descricao } : {})
          })) || [],
          bloqueios: settings.horarioFuncionamento.bloqueios?.map(b => ({
            id: b.id,
            tipo: b.tipo,
            inicio: b.inicio,
            fim: b.fim,
            ativo: b.ativo,
            ...(b.diaSemana !== undefined ? { diaSemana: b.diaSemana } : {}),
            ...(b.diaMes !== undefined ? { diaMes: b.diaMes } : {}),
            ...(b.dataEspecifica ? { dataEspecifica: b.dataEspecifica } : {}),
            ...(b.descricao ? { descricao: b.descricao } : {})
          })) || []
        }
      };
      
      // Remover campos undefined recursivamente antes de salvar
      const cleanedSettings = removeUndefined(settingsToSave);
      
      await setDoc(doc(db, `companies/${companyId}/settings`, 'general'), cleanedSettings, { merge: true });
      
      // Atualizar cache Redis de configurações com os novos valores
      try {
        const updateCache = httpsCallable(functions, 'updateSettingsCache');
        await updateCache({ companyId });
        console.log('[Configurações] Cache Redis atualizado com novos valores');
      } catch (error) {
        console.warn('[Configurações] Erro ao atualizar cache (não crítico):', error);
        // Não bloquear o salvamento se falhar
      }
      
      // Atualizar documento da empresa com tipo de estabelecimento e logo
      const companyUpdates: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (tipoEstabelecimento !== undefined) {
        companyUpdates.tipoEstabelecimento = tipoEstabelecimento || null;
      }
      
      if (finalLogoUrl !== undefined) {
        companyUpdates.logoUrl = finalLogoUrl || null;
      }
      
      if (Object.keys(companyUpdates).length > 1) { // Mais do que apenas updatedAt
        await updateDoc(doc(db, 'companies', companyId), companyUpdates);
      }

      // Atualizar collection whatsappPhoneNumbers se houver número de telefone
      const phoneNumber = settings.telefoneSalao;
      if (phoneNumber) {
        try {
          await updateWhatsappPhoneNumbers(phoneNumber);
        } catch (error) {
          console.error('Erro ao atualizar whatsappPhoneNumbers:', error);
          // Não bloquear o salvamento se falhar
        }
      }
      
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const diasSemana = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' }
  ];

  const formatTimestamp = (value?: any) => {
    if (!value) return null;
    if (value instanceof Date) return value.toLocaleString('pt-BR');
    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleString('pt-BR');
    }
    return null;
  };


  const evolutionStatusLabel = (() => {
    if (!evolutionStatus) return 'Não configurado';
    const status = evolutionStatus.status;
    if (status === 'connected') return 'Conectado';
    if (status === 'pending_qr') return 'Aguardando QR Code';
    if (status === 'disconnected') return 'Desconectado';
    if (status === 'error') return 'Erro';
    if (status === 'initializing') return 'Inicializando';
    return status || 'Desconhecido';
  })();


  const usagePercentage = useMemo(() => {
    if (!MONTHLY_WHATSAPP_FREE_LIMIT) return 0;
    const percent = (messageStats.monthCount / MONTHLY_WHATSAPP_FREE_LIMIT) * 100;
    return Math.min(100, Math.max(0, percent));
  }, [messageStats.monthCount]);

  const estimatedCostLabel = useMemo(
    () => currencyFormatter.format(messageStats.estimatedCost),
    [messageStats.estimatedCost]
  );

  const statsLastUpdatedLabel = useMemo(() => {
    if (!messageStats.fetchedAt) return null;
    return formatDistanceToNow(messageStats.fetchedAt, { addSuffix: true, locale: ptBR });
  }, [messageStats.fetchedAt]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AccessGuard allowed={['owner', 'admin']}>
      <div
        className={cn(
          'min-h-screen app-page',
          isVibrant ? 'bg-transparent' : 'bg-background'
        )}
      >
        {/* Header */}
        <header
          className={cn(
            'sticky top-0 z-20 border-b backdrop-blur',
            isVibrant ? 'border-white/20 bg-white/60' : 'border-border/80 bg-background/80'
          )}
        >
          <div className="py-4 flex flex-wrap items-center justify-between gap-4 pr-4 pl-16 sm:pl-20 lg:px-6">
            <div className="flex flex-col gap-2">
              <div className={cn('flex items-center gap-2', subtleTextClass)}>
                <Settings className={cn('w-5 h-5', isVibrant ? 'text-slate-600' : 'text-muted-foreground')} />
                <span className={cn('text-sm', subtleTextClass)}>
                  Ajuste preferências e integrações do AllOne.
                </span>
              </div>
              <h1
                className={cn(
                  'text-2xl font-semibold',
                  isVibrant
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
                    : 'text-foreground'
                )}
              >
                Configurações
              </h1>
            </div>
            
            <Button
              onClick={saveSettings}
              disabled={saving}
              size="lg"
              className={cn(
                'font-semibold transition-all shadow-sm',
                isVibrant
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                  : ''
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <div
          className={cn(
            'max-w-5xl mx-auto space-y-8 p-6',
            isVibrant ? 'text-slate-900' : ''
          )}
        >
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={cn(
                  'transition-all',
                  isVibrant
                    ? 'border border-white/25 bg-white/70 backdrop-blur-xl shadow-xl'
                    : 'border border-primary/30 bg-primary/5 shadow-none'
                )}
              >
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles
                      className={cn(
                        'w-5 h-5',
                        isVibrant ? 'text-indigo-500' : 'text-primary'
                      )}
                    />
                    Tutorial do AllOne
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Revise o passo a passo do primeiro acesso sempre que precisar relembrar como usar o sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className={cn('text-sm', subtleTextClass)}>
                      Configure serviços, time e agenda seguindo as etapas guiadas do tutorial interativo.
                    </p>
                    <p className={cn('text-xs', subtleTextClass)}>
                      Status:{' '}
                      <span className={hasCompletedTutorial ? 'font-medium text-emerald-600' : 'font-medium text-primary'}>
                        {hasCompletedTutorial ? 'Concluído' : 'Pendente'}
                      </span>
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className={cn(
                      'w-full md:w-auto font-semibold',
                      isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                        : ''
                    )}
                    onClick={() => openTutorial(0, { replay: true })}
                    disabled={tutorialStatusLoading}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {hasCompletedTutorial ? 'Assistir novamente' : 'Começar tutorial'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Informações da Empresa */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn('transition-all', neutralCardClass)}>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shield
                      className={cn(
                        'w-5 h-5',
                        isVibrant ? 'text-indigo-500' : 'text-primary'
                      )}
                    />
                    Informações da Empresa
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Esses dados aparecem para a equipe e em comunicações automáticas enviadas aos seus {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome-fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome-fantasia"
                      value={settings.nomeFantasia ?? settings.nomeSalao ?? ''}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        nomeFantasia: e.target.value,
                        nomeSalao: e.target.value // Manter sincronizado para compatibilidade
                      }))}
                      placeholder="Ex: AllOne Clínicas"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="razao-social">Razão Social</Label>
                    <Input
                      id="razao-social"
                      value={settings.razaoSocial ?? ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, razaoSocial: e.target.value }))}
                      placeholder="Ex: AllOne Clínicas Ltda"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefone-empresa">Telefone</Label>
                    <Input
                      id="telefone-empresa"
                      type="tel"
                      value={settings.telefoneSalao}
                      onChange={(e) => setSettings(prev => ({ ...prev, telefoneSalao: e.target.value }))}
                      placeholder="+55 (11) 99999-0000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-empresa">E-mail</Label>
                    <Input
                      id="email-empresa"
                      type="email"
                      value={settings.emailSalao}
                      onChange={(e) => setSettings(prev => ({ ...prev, emailSalao: e.target.value }))}
                      placeholder="contato@smartdoctor.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endereco-empresa">Endereço</Label>
                    <Input
                      id="endereco-empresa"
                      value={settings.enderecoSalao}
                      onChange={(e) => setSettings(prev => ({ ...prev, enderecoSalao: e.target.value }))}
                      placeholder="Rua Exemplo, 123 - Centro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado-empresa">Estado</Label>
                    <select
                      id="estado-empresa"
                      value={settings.estado}
                      onChange={(e) => setSettings(prev => ({ ...prev, estado: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {ESTADOS_BRASIL.map((estado) => (
                        <option key={estado.value} value={estado.value}>
                          {estado.label}
                        </option>
                      ))}
                    </select>
                    <p className={cn('text-sm', subtleTextClass)}>
                      Selecione o estado para exibir feriados estaduais no calendário.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo-estabelecimento">Tipo de Estabelecimento</Label>
                    <select
                      id="tipo-estabelecimento"
                      value={tipoEstabelecimento || ''}
                      onChange={(e) => setTipoEstabelecimento(e.target.value as TipoEstabelecimento || undefined)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="">Selecione o tipo...</option>
                      {TIPOS_ESTABELECIMENTO.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                    <p className={cn('text-sm', subtleTextClass)}>
                      Defina o tipo de estabelecimento para melhor organização.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customer-label">Como chamar os clientes no sistema?</Label>
                    <select
                      id="customer-label"
                      value={settings.customerLabel}
                      onChange={(event) =>
                        setSettings(prev => ({
                          ...prev,
                          customerLabel: event.target.value as SettingsData['customerLabel'],
                        }))
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="paciente">Pacientes</option>
                      <option value="cliente">Clientes</option>
                    </select>
                    <p className={cn('text-sm', subtleTextClass)}>
                      Essa escolha altera rótulos como "Pacientes" ou "Clientes" em todo o sistema e nos relatórios.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logo-upload">Logo da Empresa</Label>
                    <div className="space-y-4">
                      {(logoPreview || logoUrl) && (
                        <div className="relative inline-block">
                          <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-input overflow-hidden bg-muted/20">
                            <img
                              src={logoPreview || logoUrl || ''}
                              alt="Preview do logo"
                              className="h-full w-full object-contain"
                            />
                            {(logoPreview || logoFile) && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                                title="Remover logo"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <label
                          htmlFor="logo-upload"
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                            uploadingLogo
                              ? 'cursor-not-allowed opacity-50'
                              : isVibrant
                              ? 'border-white/40 bg-white/60 text-slate-700 hover:bg-white/80'
                              : 'border-input bg-background text-foreground hover:bg-accent'
                          )}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingLogo ? 'Fazendo upload...' : logoFile ? 'Trocar logo' : 'Enviar logo'}
                        </label>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </div>
                      <p className={cn('text-sm', subtleTextClass)}>
                        Envie o logo da sua empresa. Ele aparecerá no sidebar. Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.
                      </p>
                      {logoFile && (
                        <p className="text-xs text-primary font-medium">
                          ✓ Novo logo selecionado. Não esqueça de salvar as alterações.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Horário de Funcionamento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={cn('transition-all', neutralCardClass)}>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Clock className={cn('w-5 h-5', isVibrant ? 'text-indigo-500' : 'text-primary')} />
                    Horário de Funcionamento
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Configure os horários disponíveis para agendamentos por dia, intervalos e bloqueios.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Horários por Dia */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Horários por Dia</Label>
                    </div>
                    <div className="space-y-3">
                      {diasSemana.map(dia => {
                        const horarioDia = settings.horarioFuncionamento.horariosPorDia?.find(h => h.diaSemana === dia.value);
                        const isAtivo = horarioDia?.ativo ?? false;
                        
                        return (
                          <div key={dia.value} className="flex items-center gap-4 rounded-lg border border-input/60 bg-muted/30 p-4">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <input
                                type="checkbox"
                                checked={isAtivo}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const horariosPorDia = prev.horarioFuncionamento.horariosPorDia || [];
                                    const index = horariosPorDia.findIndex(h => h.diaSemana === dia.value);
                                    
                                    if (e.target.checked) {
                                      // Adicionar ou ativar horário
                                      if (index >= 0) {
                                        const updated = [...horariosPorDia];
                                        updated[index] = { ...updated[index], ativo: true };
                                        return {
                                          ...prev,
                                          horarioFuncionamento: {
                                            ...prev.horarioFuncionamento,
                                            horariosPorDia: updated
                                          }
                                        };
                                      } else {
                                        return {
                                          ...prev,
                                          horarioFuncionamento: {
                                            ...prev.horarioFuncionamento,
                                            horariosPorDia: [
                                              ...horariosPorDia,
                                              { diaSemana: dia.value, inicio: '08:00', fim: '18:00', ativo: true }
                                            ]
                                          }
                                        };
                                      }
                                    } else {
                                      // Desativar horário
                                      if (index >= 0) {
                                        const updated = [...horariosPorDia];
                                        updated[index] = { ...updated[index], ativo: false };
                                        return {
                                          ...prev,
                                          horarioFuncionamento: {
                                            ...prev.horarioFuncionamento,
                                            horariosPorDia: updated
                                          }
                                        };
                                      }
                                      return prev;
                                    }
                                  });
                                }}
                                className="h-4 w-4 rounded border border-input bg-background text-primary"
                              />
                              <Label className="text-sm font-medium min-w-[100px]">{dia.label}</Label>
                            </div>
                            
                            {isAtivo && (
                              <>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label htmlFor={`horario-inicio-${dia.value}`} className="text-xs">Início</Label>
                                    <Input
                                      id={`horario-inicio-${dia.value}`}
                                      type="time"
                                      value={horarioDia?.inicio || '08:00'}
                                      onChange={(e) => {
                                        setSettings(prev => {
                                          const horariosPorDia = prev.horarioFuncionamento.horariosPorDia || [];
                                          const index = horariosPorDia.findIndex(h => h.diaSemana === dia.value);
                                          
                                          if (index >= 0) {
                                            const updated = [...horariosPorDia];
                                            updated[index] = { ...updated[index], inicio: e.target.value };
                                            return {
                                              ...prev,
                                              horarioFuncionamento: {
                                                ...prev.horarioFuncionamento,
                                                horariosPorDia: updated
                                              }
                                            };
                                          }
                                          return prev;
                                        });
                                      }}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`horario-fim-${dia.value}`} className="text-xs">Fim</Label>
                                    <Input
                                      id={`horario-fim-${dia.value}`}
                                      type="time"
                                      value={horarioDia?.fim || '18:00'}
                                      onChange={(e) => {
                                        setSettings(prev => {
                                          const horariosPorDia = prev.horarioFuncionamento.horariosPorDia || [];
                                          const index = horariosPorDia.findIndex(h => h.diaSemana === dia.value);
                                          
                                          if (index >= 0) {
                                            const updated = [...horariosPorDia];
                                            updated[index] = { ...updated[index], fim: e.target.value };
                                            return {
                                              ...prev,
                                              horarioFuncionamento: {
                                                ...prev.horarioFuncionamento,
                                                horariosPorDia: updated
                                              }
                                            };
                                          }
                                          return prev;
                                        });
                                      }}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Intervalos */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Intervalos</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSettings(prev => {
                            const intervalos = prev.horarioFuncionamento.intervalos || [];
                            const novoIntervalo: Intervalo = {
                              id: Date.now().toString(),
                              diaSemana: 1,
                              inicio: '12:00',
                              fim: '13:00',
                              descricao: 'Almoço'
                            };
                            return {
                              ...prev,
                              horarioFuncionamento: {
                                ...prev.horarioFuncionamento,
                                intervalos: [...intervalos, novoIntervalo]
                              }
                            };
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Intervalo
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {settings.horarioFuncionamento.intervalos?.map((intervalo, index) => (
                        <div key={intervalo.id} className="flex items-center gap-3 rounded-lg border border-input/60 bg-muted/30 p-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Dia da Semana</Label>
                              <select
                                value={intervalo.diaSemana}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const intervalos = prev.horarioFuncionamento.intervalos || [];
                                    const updated = [...intervalos];
                                    updated[index] = { ...updated[index], diaSemana: parseInt(e.target.value) };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        intervalos: updated
                                      }
                                    };
                                  });
                                }}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                {diasSemana.map(dia => (
                                  <option key={dia.value} value={dia.value}>{dia.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Início</Label>
                              <Input
                                type="time"
                                value={intervalo.inicio}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const intervalos = prev.horarioFuncionamento.intervalos || [];
                                    const updated = [...intervalos];
                                    updated[index] = { ...updated[index], inicio: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        intervalos: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim</Label>
                              <Input
                                type="time"
                                value={intervalo.fim}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const intervalos = prev.horarioFuncionamento.intervalos || [];
                                    const updated = [...intervalos];
                                    updated[index] = { ...updated[index], fim: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        intervalos: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descrição (opcional)</Label>
                              <Input
                                type="text"
                                placeholder="Ex: Almoço"
                                value={intervalo.descricao || ''}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const intervalos = prev.horarioFuncionamento.intervalos || [];
                                    const updated = [...intervalos];
                                    updated[index] = { ...updated[index], descricao: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        intervalos: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSettings(prev => {
                                const intervalos = prev.horarioFuncionamento.intervalos || [];
                                return {
                                  ...prev,
                                  horarioFuncionamento: {
                                    ...prev.horarioFuncionamento,
                                    intervalos: intervalos.filter((_, i) => i !== index)
                                  }
                                };
                              });
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(!settings.horarioFuncionamento.intervalos || settings.horarioFuncionamento.intervalos.length === 0) && (
                        <p className={cn('text-sm text-center py-4', subtleTextClass)}>
                          Nenhum intervalo configurado. Clique em "Adicionar Intervalo" para criar um.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bloqueios */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Bloqueios</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSettings(prev => {
                            const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                            const novoBloqueio: Bloqueio = {
                              id: Date.now().toString(),
                              tipo: 'semanal',
                              diaSemana: 3,
                              inicio: '08:00',
                              fim: '12:00',
                              descricao: 'Reunião',
                              ativo: true
                            };
                            return {
                              ...prev,
                              horarioFuncionamento: {
                                ...prev.horarioFuncionamento,
                                bloqueios: [...bloqueios, novoBloqueio]
                              }
                            };
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Bloqueio
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {settings.horarioFuncionamento.bloqueios?.map((bloqueio, index) => (
                        <div key={bloqueio.id} className="rounded-lg border border-input/60 bg-muted/30 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={bloqueio.ativo}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                    const updated = [...bloqueios];
                                    updated[index] = { ...updated[index], ativo: e.target.checked };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        bloqueios: updated
                                      }
                                    };
                                  });
                                }}
                                className="h-4 w-4 rounded border border-input bg-background text-primary"
                              />
                              <Label className="text-sm font-medium">Ativo</Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSettings(prev => {
                                  const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                  return {
                                    ...prev,
                                    horarioFuncionamento: {
                                      ...prev.horarioFuncionamento,
                                      bloqueios: bloqueios.filter((_, i) => i !== index)
                                    }
                                  };
                                });
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de Recorrência</Label>
                              <select
                                value={bloqueio.tipo}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                    const updated = [...bloqueios];
                                    updated[index] = { 
                                      ...updated[index], 
                                      tipo: e.target.value as 'semanal' | 'mensal' | 'data_especifica',
                                      // Limpar campos não relevantes
                                      ...(e.target.value === 'semanal' ? { diaMes: undefined, dataEspecifica: undefined } : {}),
                                      ...(e.target.value === 'mensal' ? { diaSemana: undefined, dataEspecifica: undefined } : {}),
                                      ...(e.target.value === 'data_especifica' ? { diaSemana: undefined, diaMes: undefined } : {})
                                    };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        bloqueios: updated
                                      }
                                    };
                                  });
                                }}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="semanal">Semanal (toda semana no mesmo dia)</option>
                                <option value="mensal">Mensal (todo mês no mesmo dia)</option>
                                <option value="data_especifica">Data Específica</option>
                              </select>
                            </div>
                            {bloqueio.tipo === 'semanal' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Dia da Semana</Label>
                                <select
                                  value={bloqueio.diaSemana || 0}
                                  onChange={(e) => {
                                    setSettings(prev => {
                                      const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                      const updated = [...bloqueios];
                                      updated[index] = { ...updated[index], diaSemana: parseInt(e.target.value) };
                                      return {
                                        ...prev,
                                        horarioFuncionamento: {
                                          ...prev.horarioFuncionamento,
                                          bloqueios: updated
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  {diasSemana.map(dia => (
                                    <option key={dia.value} value={dia.value}>{dia.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {bloqueio.tipo === 'mensal' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Dia do Mês (1-31)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={bloqueio.diaMes || ''}
                                  onChange={(e) => {
                                    setSettings(prev => {
                                      const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                      const updated = [...bloqueios];
                                      updated[index] = { ...updated[index], diaMes: parseInt(e.target.value) };
                                      return {
                                        ...prev,
                                        horarioFuncionamento: {
                                          ...prev.horarioFuncionamento,
                                          bloqueios: updated
                                        }
                                      };
                                    });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                            )}
                            {bloqueio.tipo === 'data_especifica' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Data Específica</Label>
                                <Input
                                  type="date"
                                  value={bloqueio.dataEspecifica || ''}
                                  onChange={(e) => {
                                    setSettings(prev => {
                                      const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                      const updated = [...bloqueios];
                                      updated[index] = { ...updated[index], dataEspecifica: e.target.value };
                                      return {
                                        ...prev,
                                        horarioFuncionamento: {
                                          ...prev.horarioFuncionamento,
                                          bloqueios: updated
                                        }
                                      };
                                    });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Horário Início</Label>
                              <Input
                                type="time"
                                value={bloqueio.inicio}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                    const updated = [...bloqueios];
                                    updated[index] = { ...updated[index], inicio: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        bloqueios: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Horário Fim</Label>
                              <Input
                                type="time"
                                value={bloqueio.fim}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                    const updated = [...bloqueios];
                                    updated[index] = { ...updated[index], fim: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        bloqueios: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descrição (opcional)</Label>
                              <Input
                                type="text"
                                placeholder="Ex: Reunião, Manutenção"
                                value={bloqueio.descricao || ''}
                                onChange={(e) => {
                                  setSettings(prev => {
                                    const bloqueios = prev.horarioFuncionamento.bloqueios || [];
                                    const updated = [...bloqueios];
                                    updated[index] = { ...updated[index], descricao: e.target.value };
                                    return {
                                      ...prev,
                                      horarioFuncionamento: {
                                        ...prev.horarioFuncionamento,
                                        bloqueios: updated
                                      }
                                    };
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!settings.horarioFuncionamento.bloqueios || settings.horarioFuncionamento.bloqueios.length === 0) && (
                        <p className={cn('text-sm text-center py-4', subtleTextClass)}>
                          Nenhum bloqueio configurado. Clique em "Adicionar Bloqueio" para criar um.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Configurações Financeiras */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className={cn('transition-all', neutralCardClass)}>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <DollarSign className={cn('w-5 h-5', isVibrant ? 'text-indigo-500' : 'text-primary')} />
                    Configurações Financeiras
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Defina as regras padrão para comissões e políticas de cancelamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="comissao-padrao">Comissão padrão (%)</Label>
                    <Input
                      id="comissao-padrao"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.comissaoPadrao}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSettings(prev => ({ ...prev, comissaoPadrao: Number.isNaN(value) ? 0 : value }));
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxa-cancelamento">Taxa de cancelamento (%)</Label>
                    <Input
                      id="taxa-cancelamento"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.taxaCancelamento}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSettings(prev => ({ ...prev, taxaCancelamento: Number.isNaN(value) ? 0 : value }));
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dias-antecedencia">Dias de antecedência para cancelamento</Label>
                    <Input
                      id="dias-antecedencia"
                      type="number"
                      min="0"
                      value={settings.diasAntecedenciaCancelamento}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSettings(prev => ({ ...prev, diasAntecedenciaCancelamento: Number.isNaN(value) ? 0 : value }));
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary">
                      <input
                        type="checkbox"
                        checked={settings.showCommission}
                        onChange={(e) => setSettings(prev => ({ ...prev, showCommission: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Exibir informações de comissão</span>
                        <p className={cn('text-sm', subtleTextClass)}>
                          Quando desativado, campos de comissão somem dos formulários e relatórios.
                        </p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Configurações de Notificação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className={cn('transition-all', neutralCardClass)}>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Bell className={cn('w-5 h-5', isVibrant ? 'text-indigo-500' : 'text-primary')} />
                    Configurações de Notificação
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Controle como e quando os lembretes são enviados aos {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'} e configure a integração do WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label htmlFor="lembrete24h" className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary">
                      <input
                        type="checkbox"
                        id="lembrete24h"
                        checked={settings.lembrete24h}
                        onChange={(e) => setSettings(prev => ({ ...prev, lembrete24h: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Lembrete 24h antes</span>
                        <p className={cn('text-sm', subtleTextClass)}>
                          Aviso automático enviado no dia anterior ao agendamento.
                        </p>
                      </div>
                    </label>
                    
                    <label htmlFor="lembrete1h" className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary">
                      <input
                        type="checkbox"
                        id="lembrete1h"
                        checked={settings.lembrete1h}
                        onChange={(e) => setSettings(prev => ({ ...prev, lembrete1h: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Lembrete 1h antes</span>
                        <p className={cn('text-sm', subtleTextClass)}>
                          Reforce a presença com uma mensagem próxima ao horário.
                        </p>
                      </div>
                    </label>
                    
                    <label htmlFor="confirmacaoAutomatica" className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary">
                      <input
                        type="checkbox"
                        id="confirmacaoAutomatica"
                        checked={settings.confirmacaoAutomatica}
                        onChange={(e) => setSettings(prev => ({ ...prev, confirmacaoAutomatica: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Confirmação automática</span>
                        <p className={cn('text-sm', subtleTextClass)}>
                          Define se o campo “Enviar notificação para o cliente” na tela de criar agendamento permanece habilitado por padrão.
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="space-y-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Envio de WhatsApp
                        </h3>
                        <p className={cn('text-sm', subtleTextClass)}>
                          Escolha o provedor e acompanhe o status da integração.
                        </p>
                      </div>
                      {false && (
                        <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Sessão ativa
                        </span>
                      )}
                    </div>

                    {/* Se já está conectado, mostrar apenas a seção de status (sem os campos de configuração) */}
                    {evolutionStatus?.status === 'connected' && settings.whatsappProvider === 'evolution' ? (
                      <div className="space-y-4 rounded-lg border border-input/60 bg-muted/10 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-medium">
                            Status Evolution: <span className="font-semibold text-primary">{evolutionStatusLabel}</span>
                          </p>
                          {formatTimestamp(evolutionStatus?.updatedAt) && (
                            <span className={cn('text-xs', subtleTextClass)}>
                              Atualizado em {formatTimestamp(evolutionStatus?.updatedAt)}
                            </span>
                          )}
                        </div>

                        {/* Mostrar mensagem quando estiver conectado */}
                        <div className={cn('rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4 text-center', subtleTextClass)}>
                          <p className="text-sm font-medium text-emerald-700">
                            ✅ WhatsApp conectado com sucesso!
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            Você pode enviar e receber mensagens normalmente.
                          </p>
                        </div>

                        <div className={cn('grid gap-2 text-xs md:grid-cols-2', subtleTextClass)}>
                          {evolutionStatus?.lastMessageAt && (
                            <p>
                              Último envio: {formatTimestamp(evolutionStatus.lastMessageAt)}
                            </p>
                          )}
                          {!evolutionStatus?.lastMessageAt && evolutionStatus?.lastConnectedAt && (
                            <p>
                              Última conexão: {formatTimestamp(evolutionStatus.lastConnectedAt)}
                            </p>
                          )}
                          {evolutionStatus?.lastDisconnectReason && (
                            <p className="text-destructive">
                              Motivo da última desconexão: {evolutionStatus.lastDisconnectReason}
                            </p>
                          )}
                          {evolutionStatus?.lastError && (
                            <p className="text-destructive">
                              Erro recente: {evolutionStatus.lastError}
                            </p>
                          )}
                        </div>

                        <CardFooter className="flex flex-wrap items-center gap-3 p-0 pt-2">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={disconnecting}
                              onClick={async () => {
                                if (!companyId) return;
                                if (!confirm('Tem certeza que deseja desconectar o WhatsApp? Isso irá:\n\n• Deletar a instância no Evolution API\n• Limpar todas as configurações do WhatsApp\n• Remover todas as mensagens do WhatsApp (whatsappMessages)\n• Remover todos os contatos do WhatsApp (whatsappContacts)\n• Limpar histórico de agendamentos pelo WhatsApp\n\n⚠️ Esta ação não pode ser desfeita!\n\nVocê precisará configurar novamente para usar o WhatsApp.')) {
                                  return;
                                }
                                setDisconnecting(true);
                                try {
                                  const disconnectCallable = httpsCallable(functions, 'disconnectWhatsApp');
                                  await disconnectCallable({ companyId });
                                  alert('WhatsApp desconectado com sucesso! Todas as configurações foram limpas.');
                                  // Recarregar a página para atualizar as configurações
                                  window.location.reload();
                                } catch (error: any) {
                                  console.error('Erro ao desconectar WhatsApp:', error);
                                  alert(`Erro ao desconectar WhatsApp: ${error?.message || 'Erro desconhecido'}`);
                                  setDisconnecting(false);
                                }
                              }}
                              className={cn(
                                isVibrant
                                  ? 'border-red-300 bg-red-500 text-white hover:bg-red-600 hover:border-red-400'
                                  : ''
                              )}
                            >
                              {disconnecting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Desconectando...
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-2" />
                                  Desconectar
                                </>
                              )}
                            </Button>
                          </div>
                        </CardFooter>
                      </div>
                    ) : (
                      <>
                        {/* Aviso para salvar configurações */}
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                ⚠️ Lembre-se de salvar as configurações
                              </p>
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                Após alterar o provedor, tipo de WhatsApp ou número, clique no botão "Salvar Configurações" no final da página para aplicar as mudanças.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="whatsapp-provider">Provedor de envio</Label>
                            <select
                              id="whatsapp-provider"
                              value={settings.whatsappProvider}
                              onChange={(e) => {
                                const provider = e.target.value as SettingsData['whatsappProvider'];
                                setSettings(prev => ({
                                  ...prev,
                                  whatsappProvider: provider,
                                  // Resetar tipo de integração quando mudar o provider
                                  whatsappIntegrationType: provider === 'evolution' ? undefined : prev.whatsappIntegrationType,
                                }));
                              }}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <option value="disabled">Desabilitado</option>
                              <option value="evolution">Evolution API (número próprio)</option>
                            </select>
                            <p className={cn('text-sm', subtleTextClass)}>
                              {settings.whatsappProvider === 'disabled' 
                                ? 'Quando desabilitado, nenhuma mensagem será enviada automaticamente via WhatsApp.'
                                : 'Evolution API utiliza o WhatsApp Web do número configurado e é recomendado para produção.'}
                            </p>
                          </div>

                          {settings.whatsappProvider === 'evolution' && (
                            <div className="space-y-2">
                              <Label htmlFor="whatsapp-integration-type">
                                Tipo de WhatsApp <span className="text-destructive">*</span>
                              </Label>
                              <select
                                id="whatsapp-integration-type"
                                value={settings.whatsappIntegrationType || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const integrationType = value ? (value as SettingsData['whatsappIntegrationType']) : undefined;
                                  setSettings(prev => ({
                                    ...prev,
                                    whatsappIntegrationType: integrationType,
                                  }));
                                  // Limpar QR code antigo quando o tipo mudar
                                  if (evolutionStatus?.qrCode) {
                                    // O QR code será limpo automaticamente quando o usuário gerar um novo
                                    // Mas não vamos exibir o antigo enquanto muda o tipo
                                  }
                                }}
                                required
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              >
                                <option value="">Selecione o tipo de WhatsApp...</option>
                                <option value="WHATSAPP-BAILEYS">WhatsApp do Celular (Baileys) - Usa QR Code</option>
                                <option value="WHATSAPP-BUSINESS">WhatsApp Business - API Oficial Meta (Token)</option>
                              </select>
                              <p className={cn('text-sm', subtleTextClass)}>
                                {!settings.whatsappIntegrationType
                                  ? '⚠️ Selecione o tipo de WhatsApp antes de gerar o QR Code.'
                                  : settings.whatsappIntegrationType === 'WHATSAPP-BAILEYS'
                                  ? 'WhatsApp do Celular usa QR Code para pareamento. Escaneie o QR Code com seu WhatsApp.'
                                  : '⚠️ WhatsApp Business usa a API oficial do Meta e requer token/credenciais. Não usa QR Code. Configure as credenciais no Meta Business Manager.'}
                              </p>
                            </div>
                          )}

                          {settings.whatsappProvider === 'evolution' && (
                            <div className="space-y-2">
                              <Label htmlFor="whatsapp-number">
                                Número do WhatsApp <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="whatsapp-number"
                                type="tel"
                                placeholder="5599999999999"
                                value={settings.whatsappNumber || ''}
                                onChange={(e) => {
                                  // Remover caracteres não numéricos
                                  const value = e.target.value.replace(/\D/g, '');
                                  setSettings(prev => ({
                                    ...prev,
                                    whatsappNumber: value,
                                  }));
                                  // Limpar QR code antigo quando o número mudar
                                  if (evolutionStatus?.qrCode) {
                                    // O QR code será limpo automaticamente quando o usuário gerar um novo
                                    // Mas não vamos exibir o antigo enquanto digita
                                  }
                                }}
                                required
                                className="w-full"
                              />
                              <p className={cn('text-sm', subtleTextClass)}>
                                Digite o número com código do país (ex: 5599999999999). Apenas números.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Configurações de Agendamento pelo WhatsApp */}
                    <div className="space-y-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                      <div className="flex flex-col gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Agendamento pelo WhatsApp
                          </h3>
                          <p className={cn('text-sm mt-1', subtleTextClass)}>
                            Permita que {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'} agendem diretamente pelo WhatsApp.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.agendamentoWhatsappHabilitado || false}
                            onChange={(e) => setSettings(prev => ({ 
                              ...prev, 
                              agendamentoWhatsappHabilitado: e.target.checked,
                              // Se desabilitar, também desabilitar a restrição de contatos
                              ...(e.target.checked ? {} : { agendamentoWhatsappApenasContatos: false })
                            }))}
                            className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                          <div className="space-y-1 flex-1">
                            <span className="text-sm font-medium text-foreground">Habilitar agendamento pelo WhatsApp</span>
                            <p className={cn('text-sm', subtleTextClass)}>
                              Quando habilitado, {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'} poderão agendar consultas diretamente pelo WhatsApp através de um assistente inteligente.
                            </p>
                            {(!settings.whatsappProvider || settings.whatsappProvider === 'disabled') && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ É necessário configurar o provedor de WhatsApp acima para usar esta funcionalidade.
                              </p>
                            )}
                          </div>
                        </label>

                        {settings.agendamentoWhatsappHabilitado && (
                          <>
                            <label className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.agendamentoWhatsappApenasContatos || false}
                                onChange={(e) => setSettings(prev => ({ 
                                  ...prev, 
                                  agendamentoWhatsappApenasContatos: e.target.checked
                                }))}
                                className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                              <div className="space-y-1 flex-1">
                                <span className="text-sm font-medium text-foreground">Apenas para contatos cadastrados</span>
                                <p className={cn('text-sm', subtleTextClass)}>
                                  Quando habilitado, apenas {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'} já cadastrados no sistema poderão agendar pelo WhatsApp. Desabilitado, qualquer pessoa poderá agendar.
                                </p>
                              </div>
                            </label>

                            {/* Seleção de Serviços */}
                            <div className="space-y-3 rounded-lg border border-input/60 bg-muted/20 p-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground">
                                  Serviços disponíveis para agendamento
                                </Label>
                                <p className={cn('text-sm', subtleTextClass)}>
                                  Escolha quais serviços estarão disponíveis para o cliente selecionar durante o agendamento pelo WhatsApp. Por padrão, todos os serviços ativos estarão disponíveis.
                                </p>
                              </div>

                              {servicesLoading ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <span className={cn('ml-2 text-sm', subtleTextClass)}>Carregando serviços...</span>
                                </div>
                              ) : services.length === 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                                  <p className="text-sm text-amber-800 dark:text-amber-200">
                                    ⚠️ Nenhum serviço cadastrado. Cadastre serviços na página de Serviços para disponibilizá-los no agendamento pelo WhatsApp.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowServiceModal(true)}
                                    className="w-full"
                                  >
                                    <Package className="w-4 h-4 mr-2" />
                                    {(!settings.agendamentoWhatsappServicosIds || settings.agendamentoWhatsappServicosIds.length === 0)
                                      ? 'Todos os serviços ativos (padrão)'
                                      : `${settings.agendamentoWhatsappServicosIds.length} serviço${settings.agendamentoWhatsappServicosIds.length !== 1 ? 's' : ''} selecionado${settings.agendamentoWhatsappServicosIds.length !== 1 ? 's' : ''}`
                                    }
                                  </Button>
                                  {settings.agendamentoWhatsappServicosIds && settings.agendamentoWhatsappServicosIds.length > 0 && (
                                    <p className={cn('text-xs text-center', subtleTextClass)}>
                                      Clique no botão acima para alterar a seleção de serviços
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Configurações de Mensagem de Aniversário */}
                    <div className="space-y-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                      <div className="flex flex-col gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Mensagem de Aniversário Automática
                          </h3>
                          <p className={cn('text-sm mt-1', subtleTextClass)}>
                            Configure o envio automático de mensagens de aniversário para {settings.customerLabel === 'paciente' ? 'pacientes' : 'clientes'}.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 rounded-lg border border-input/60 bg-muted/20 p-4 transition hover:border-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.mensagemAniversarioAutomatica || false}
                            onChange={(e) => setSettings(prev => ({ 
                              ...prev, 
                              mensagemAniversarioAutomatica: e.target.checked
                            }))}
                            className="mt-1 h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                          <div className="space-y-1 flex-1">
                            <span className="text-sm font-medium text-foreground">Habilitar envio automático de mensagem de aniversário</span>
                            <p className={cn('text-sm', subtleTextClass)}>
                              Quando habilitado, mensagens de aniversário serão enviadas automaticamente no dia do aniversário do {settings.customerLabel === 'paciente' ? 'paciente' : 'cliente'}.
                            </p>
                            <p className={cn('text-xs mt-1 font-medium', subtleTextClass)}>
                              ⏰ As mensagens serão enviadas automaticamente todos os dias às 09:00 (horário de Brasília).
                            </p>
                            {(!settings.whatsappProvider || settings.whatsappProvider === 'disabled') && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ É necessário configurar o provedor de WhatsApp acima para usar esta funcionalidade.
                              </p>
                            )}
                          </div>
                        </label>

                        {settings.mensagemAniversarioAutomatica && (
                          <div className="space-y-2 rounded-lg border border-input/60 bg-muted/20 p-4">
                            <Label htmlFor="mensagem-aniversario-texto" className="text-sm font-medium text-foreground">
                              Mensagem de Aniversário
                            </Label>
                            <Textarea
                              id="mensagem-aniversario-texto"
                              value={settings.mensagemAniversarioTexto || ''}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                mensagemAniversarioTexto: e.target.value
                              }))}
                              placeholder="Digite a mensagem que será enviada automaticamente no dia do aniversário. Use {{NOME_CLIENTE}} para incluir o nome do paciente/cliente."
                              className="min-h-[120px] w-full resize-none"
                            />
                            <p className={cn('text-xs', subtleTextClass)}>
                              💡 Dica: Use <code className="px-1 py-0.5 bg-muted rounded text-xs">{'{{NOME_CLIENTE}}'}</code> no texto para incluir o nome do {settings.customerLabel === 'paciente' ? 'paciente' : 'cliente'} na mensagem.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                  {settings.whatsappProvider === 'evolution' && evolutionStatus?.status !== 'connected' && (
                      <div className="space-y-4 rounded-lg border border-input/60 bg-muted/10 p-4">
                        {/* Seção para quando não está conectado */}
                        {(!settings.whatsappIntegrationType || !settings.whatsappNumber || settings.whatsappNumber.replace(/\D/g, '').length < 10) ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              ⚠️ {!settings.whatsappIntegrationType 
                                ? 'Selecione o tipo de WhatsApp acima antes de gerar o QR Code.'
                                : !settings.whatsappNumber || settings.whatsappNumber.replace(/\D/g, '').length < 10
                                ? 'Digite o número completo do WhatsApp acima antes de gerar o QR Code.'
                                : 'Configure o WhatsApp acima antes de gerar o QR Code.'}
                            </p>
                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                              {!settings.whatsappIntegrationType
                                ? 'Escolha entre "WhatsApp do Celular (Baileys)" ou "WhatsApp Business" e salve as configurações.'
                                : settings.whatsappIntegrationType === 'WHATSAPP-BUSINESS'
                                ? '⚠️ WhatsApp Business usa a API oficial do Meta e requer token/credenciais configuradas no Meta Business Manager. Não usa QR Code para pareamento.'
                                : 'Digite o número completo com código do país (ex: 5599999999999) e salve as configurações.'}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-sm font-medium">
                                Status Evolution: <span className="font-semibold text-primary">{evolutionStatusLabel}</span>
                              </p>
                              {formatTimestamp(evolutionStatus?.updatedAt) && (
                                <span className={cn('text-xs', subtleTextClass)}>
                                  Atualizado em {formatTimestamp(evolutionStatus?.updatedAt)}
                                </span>
                              )}
                            </div>

                            {/* Só mostrar QR code se:
                                1. NÃO estiver conectado
                                2. Tipo de integração estiver selecionado
                                3. Número estiver completo (mínimo 10 dígitos)
                                4. QR code existe E foi gerado recentemente (menos de 10 minutos)
                                5. Status é pending_qr ou initializing (não mostrar QR codes de tentativas antigas)
                            */}
                            {settings.whatsappIntegrationType && 
                              settings.whatsappNumber && 
                              settings.whatsappNumber.replace(/\D/g, '').length >= 10 &&
                              evolutionStatus?.status !== 'connected' && 
                              (evolutionStatus?.status === 'pending_qr' || evolutionStatus?.status === 'initializing') &&
                              evolutionStatus?.qrCode && 
                              (() => {
                                // Verificar se o QR code foi gerado recentemente
                                const qrCodeAge = evolutionStatus?.qrCodeGeneratedAt 
                                  ? Date.now() - (evolutionStatus.qrCodeGeneratedAt.toMillis?.() || evolutionStatus.qrCodeGeneratedAt.seconds * 1000)
                                  : Infinity;
                                const isQrCodeRecent = qrCodeAge < 10 * 60 * 1000; // 10 minutos
                                return isQrCodeRecent;
                              })() && (
                          <div className="space-y-4">
                              {evolutionStatus?.qrCode ? (() => {
                              // Função para determinar a URL do QR code de forma segura
                              const getQrCodeUrl = (qrCode: string): string | null => {
                                if (!qrCode || typeof qrCode !== 'string') return null;
                                
                                const trimmed = qrCode.trim();
                                if (!trimmed) return null;
                                
                                // PRIORIDADE 1: Se já é uma URL completa (data: ou http) - usar diretamente
                                if (trimmed.startsWith('data:image')) {
                                  // Validar se é uma data URL válida (deve ter vírgula separando o tipo dos dados)
                                  if (trimmed.includes(',') && trimmed.length > 20) {
                                    return trimmed;
                                  }
                                  // Se não tem vírgula, pode estar malformado - tentar corrigir
                                  return null;
                                }
                                
                                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                  try {
                                    new URL(trimmed);
                                    return trimmed;
                                  } catch {
                                    return null;
                                  }
                                }
                                
                                // PRIORIDADE 2: Se é SVG
                                if (trimmed.startsWith('<svg')) {
                                  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
                                }
                                
                                // PRIORIDADE 3: Se parece ser uma data URL malformada (tem "data:image/png;base64," mas com vírgulas extras)
                                // Extrair apenas o conteúdo base64 (depois da primeira vírgula) para usar na API externa
                                if (trimmed.startsWith('data:image/png;base64,') || trimmed.startsWith('data:image/png;base64')) {
                                  // Extrair apenas o conteúdo base64 (depois da vírgula)
                                  const base64Index = trimmed.indexOf(',');
                                  if (base64Index > 0) {
                                    const base64Content = trimmed.substring(base64Index + 1);
                                    // Se o conteúdo base64 contém vírgulas, usar na API externa (não é base64 válido)
                                    if (base64Content.includes(',')) {
                                      // Usar apenas o conteúdo base64 (sem o prefixo data:) na API externa
                                      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(base64Content)}`;
                                    } else {
                                      // É base64 válido, usar como data URL
                                      return `data:image/png;base64,${base64Content}`;
                                    }
                                  }
                                }
                                
                                // PRIORIDADE 4: Verificar se contém vírgulas (NÃO é base64 válido)
                                // Se tem vírgulas, provavelmente é texto/dados que precisa ser convertido em QR code
                                // IMPORTANTE: Esta verificação deve vir ANTES da validação de base64
                                if (trimmed.includes(',')) {
                                  // Usar API externa para gerar QR code a partir do texto
                                  // NUNCA tentar usar como base64 se contém vírgulas
                                  try {
                                    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(trimmed)}`;
                                  } catch {
                                    return null;
                                  }
                                }
                                
                                // PRIORIDADE 5: Validar base64 puro (sem vírgulas, sem prefixo data:)
                                // Base64 válido: apenas A-Z, a-z, 0-9, +, /, = e sem vírgulas
                                const base64Regex = /^[A-Za-z0-9+/=]+$/;
                                if (base64Regex.test(trimmed) && trimmed.length > 100 && trimmed.length < 100000) {
                                  // É base64 válido e tem tamanho razoável para uma imagem
                                  return `data:image/png;base64,${trimmed}`;
                                }
                                
                                // PRIORIDADE 6: Se parece ser texto simples (sem vírgulas, mas não é base64)
                                // Usar API externa para gerar QR code
                                if (trimmed.length > 0 && trimmed.length < 5000) {
                                  try {
                                    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(trimmed)}`;
                                  } catch {
                                    return null;
                                  }
                                }
                                
                                return null;
                              };

                              // Sempre recalcular a URL quando o QR code mudar, a menos que já tenhamos uma URL válida em qrCodeSrc
                              // Isso evita usar URLs antigas/inválidas
                              let qrUrl = qrCodeSrc;
                              
                              // Verificar se o QR code original contém vírgulas - se sim, NUNCA usar como base64
                              const qrCodeHasCommas = evolutionStatus.qrCode?.includes(',');
                              
                              // Se não temos qrCodeSrc ou se ele contém uma URL inválida (base64 com vírgulas), recalcular
                              if (!qrUrl || (qrUrl.startsWith('data:image/png;base64,') && qrCodeHasCommas)) {
                                // Recalcular URL do QR code
                                qrUrl = getQrCodeUrl(evolutionStatus.qrCode);
                                
                                // VALIDAÇÃO FINAL: Se o QR code original tem vírgulas, FORÇAR uso da API externa
                                // Isso garante que nunca tentaremos usar base64 quando há vírgulas
                                if (qrCodeHasCommas && qrUrl && qrUrl.startsWith('data:image/png;base64,')) {
                                  // QR code tem vírgulas mas foi gerado como base64 - CORRIGIR
                                  // Extrair apenas o conteúdo base64 (sem o prefixo) se começar com data:image/png;base64,
                                  let qrCodeData = evolutionStatus.qrCode;
                                  if (qrCodeData.startsWith('data:image/png;base64,')) {
                                    const base64Index = qrCodeData.indexOf(',');
                                    if (base64Index > 0) {
                                      qrCodeData = qrCodeData.substring(base64Index + 1);
                                    }
                                  }
                                  qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}`;
                                }
                              }
                              
                              // Se não conseguiu gerar URL válida após várias tentativas, mostrar mensagem
                              if (!qrUrl || qrCodeErrorCount >= 3) {
                                return (
                                  <div className={cn('rounded-lg border border-dashed border-input bg-muted/20 p-8 text-center', subtleTextClass)}>
                                    <p className="text-sm font-medium mb-2">
                                      Erro ao exibir QR Code
                                    </p>
                                    <p className="text-xs mb-3">
                                      O QR Code foi recebido, mas não pôde ser exibido. Tente gerar um novo QR Code.
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setQrCodeErrorCount(0);
                                        setQrCodeSrc(null);
                                        setQrCodeLoading(true);
                                        setQrCodeImageLoaded(false);
                                        qrCodeErrorAttemptsRef.current = 0;
                                        requestEvolutionPairing();
                                      }}
                                      className={cn(
                                        isVibrant
                                          ? 'border-white/40 bg-white/60 text-slate-800 hover:bg-white/80 hover:border-white/50'
                                          : ''
                                      )}
                                    >
                                      Gerar novo QR Code
                                    </Button>
                                  </div>
                                );
                              }

                              return (
                              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                  <div className="flex-shrink-0 relative h-44 w-44">
                                    {/* Sempre mostrar loader enquanto carregando ou se ainda não carregou com sucesso */}
                                    {(qrCodeLoading || !qrUrl || !qrCodeImageLoaded) && (
                                      <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-input bg-background p-2 z-10">
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                          <p className={cn('text-xs', subtleTextClass)}>Carregando QR Code...</p>
                                        </div>
                                      </div>
                                    )}
                                    {/* Só renderizar a imagem se temos uma URL válida E só mostrar depois que carregar com sucesso */}
                                    {qrUrl && (
                                      <img
                                        src={qrUrl}
                                    alt="QR Code WhatsApp Evolution"
                                        className={cn(
                                          "h-44 w-44 rounded-lg border border-input bg-background p-2 shadow-sm transition-opacity duration-300",
                                          (!qrCodeImageLoaded || qrCodeLoading) ? "opacity-0 pointer-events-none" : "opacity-100"
                                        )}
                                        style={{ display: (!qrCodeImageLoaded || qrCodeLoading) ? 'none' : 'block' }}
                                        onLoadStart={() => {
                                          setQrCodeLoading(true);
                                          setQrCodeImageLoaded(false); // Resetar flag ao começar novo carregamento
                                        }}
                                    onError={(e) => {
                                          setQrCodeLoading(true); // Manter loading ao tentar alternativa
                                          setQrCodeImageLoaded(false); // Não marcar como carregado se deu erro
                                          
                                          // Prevenir loop: só tentar alternativas se ainda não tentou muitas vezes
                                          qrCodeErrorAttemptsRef.current += 1;
                                          
                                          if (qrCodeErrorAttemptsRef.current >= 3) {
                                            setQrCodeErrorCount(3);
                                            setQrCodeLoading(false);
                                            return;
                                          }
                                          
                                      const target = e.target as HTMLImageElement;
                                          const currentSrc = target.src;
                                          const qrCode = evolutionStatus.qrCode;
                                          
                                          setQrCodeErrorCount(qrCodeErrorAttemptsRef.current);
                                          
                                          // Tentar alternativas apenas uma vez por tipo
                                          if (qrCodeErrorAttemptsRef.current === 1) {
                                            // Primeira tentativa falhou - ignorar e tentar alternativa
                                            // Se estava usando API externa, tentar base64
                                            if (currentSrc.includes('api.qrserver.com')) {
                                              // Só tentar base64 se não contiver vírgulas e for válido
                                              if (qrCode && !qrCode.includes(',') && /^[A-Za-z0-9+/=]+$/.test(qrCode) && qrCode.length > 100) {
                                                setQrCodeSrc(`data:image/png;base64,${qrCode}`);
                                                setQrCodeLoading(true);
                                                setQrCodeImageLoaded(false);
                                      } else {
                                                // Se não é base64 válido, parar tentativas
                                                setQrCodeErrorCount(3);
                                                qrCodeErrorAttemptsRef.current = 3;
                                                setQrCodeLoading(false);
                                              }
                                            } else if (qrCode?.trim().startsWith('<svg')) {
                                              // Se é SVG, garantir encoding correto
                                              setQrCodeSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`);
                                              setQrCodeLoading(true);
                                              setQrCodeImageLoaded(false);
                                            } else {
                                              // Tentar API externa como alternativa
                                              setQrCodeSrc(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode || '')}`);
                                              setQrCodeLoading(true);
                                              setQrCodeImageLoaded(false);
                                            }
                                          } else if (qrCodeErrorAttemptsRef.current === 2) {
                                            // Segunda tentativa: se ainda não funcionou, parar
                                            setQrCodeErrorCount(3);
                                            qrCodeErrorAttemptsRef.current = 3;
                                            setQrCodeLoading(false);
                                          }
                                        }}
                                        onLoad={() => {
                                          // Só marcar como carregado quando realmente carregar com sucesso
                                          // E só depois da primeira tentativa (ignorar primeira imagem)
                                          if (qrCodeErrorAttemptsRef.current === 0 || qrCodeErrorAttemptsRef.current >= 1) {
                                            setQrCodeImageLoaded(true);
                                            setQrCodeLoading(false);
                                            // Resetar contador quando carregar com sucesso
                                            if (qrCodeErrorAttemptsRef.current > 0) {
                                              setQrCodeErrorCount(0);
                                              qrCodeErrorAttemptsRef.current = 0;
                                            }
                                      }
                                    }}
                                  />
                                    )}
                                </div>
                                <div className={cn('space-y-3 text-sm', subtleTextClass)}>
                                  <p>
                                    Abra o WhatsApp no celular &gt; Aparelhos Conectados &gt; Conectar novo aparelho e escaneie o QR Code.
                                  </p>
                                  <a
                                    href={evolutionStatus.qrCode?.startsWith('http') 
                                      ? evolutionStatus.qrCode 
                                      : `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(evolutionStatus.qrCode)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    Abrir QR Code em uma nova aba
                                  </a>
                                </div>
                              </div>
                              );
                            })() : (
                              <div className={cn('rounded-lg border border-dashed border-input bg-muted/20 p-8 text-center', subtleTextClass)}>
                                <p className="text-sm font-medium mb-2">
                                  Aguardando geração do QR Code...
                                </p>
                                <p className="text-xs">
                                  Se o QR Code não aparecer em alguns segundos, clique em "Gerar/Atualizar QR Code" novamente.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mostrar informações de status quando não estiver conectado, mas campos estiverem preenchidos */}
                        {evolutionStatus?.status !== 'connected' && (
                          <div className={cn('grid gap-2 text-xs md:grid-cols-2', subtleTextClass)}>
                            {evolutionStatus?.lastMessageAt && (
                              <p>
                                Último envio: {formatTimestamp(evolutionStatus.lastMessageAt)}
                              </p>
                            )}
                            {!evolutionStatus?.lastMessageAt && evolutionStatus?.lastConnectedAt && (
                              <p>
                                Última conexão: {formatTimestamp(evolutionStatus.lastConnectedAt)}
                              </p>
                            )}
                            {evolutionStatus?.lastDisconnectReason && (
                              <p className="text-destructive">
                                Motivo da última desconexão: {evolutionStatus.lastDisconnectReason}
                              </p>
                            )}
                            {evolutionStatus?.lastError && (
                              <p className="text-destructive">
                                Erro recente: {evolutionStatus.lastError}
                              </p>
                            )}
                            {evolutionPairingError && (
                              <p className="text-destructive">
                                {evolutionPairingError}
                              </p>
                            )}
                          </div>
                        )}

                        {/* CardFooter só aparece quando não está conectado */}
                        {evolutionStatus?.status !== 'connected' && (
                          <CardFooter className="flex flex-wrap items-center gap-3 p-0 pt-2">
                            {(!settings.whatsappIntegrationType || !settings.whatsappNumber || settings.whatsappNumber.replace(/\D/g, '').length < 10) && (
                              <p className="text-sm text-amber-600 dark:text-amber-400">
                                ⚠️ {!settings.whatsappIntegrationType 
                                  ? 'Selecione o tipo de WhatsApp acima e salve as configurações antes de gerar o QR Code.'
                                  : !settings.whatsappNumber || settings.whatsappNumber.replace(/\D/g, '').length < 10
                                  ? 'Digite o número completo do WhatsApp acima e salve as configurações antes de gerar o QR Code.'
                                  : 'Configure o WhatsApp acima antes de gerar o QR Code.'}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={requestEvolutionPairing}
                                disabled={evolutionPairingLoading || !companyId || !settings.whatsappIntegrationType || !settings.whatsappNumber || settings.whatsappNumber.replace(/\D/g, '').length < 10 || settings.whatsappIntegrationType === 'WHATSAPP-BUSINESS'}
                                className={cn(
                                  isVibrant
                                    ? 'border-white/40 bg-white/60 text-slate-800 hover:bg-white/80 hover:border-white/50'
                                    : ''
                                )}
                              >
                                {evolutionPairingLoading 
                                  ? 'Gerando QR...' 
                                  : settings.whatsappIntegrationType === 'WHATSAPP-BUSINESS'
                                  ? '⚠️ WhatsApp Business não usa QR Code'
                                  : 'Gerar/Atualizar QR Code'}
                              </Button>
                              {(settings.whatsappProvider === 'evolution' && (settings.whatsappIntegrationType || settings.whatsappNumber)) && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={disconnecting}
                                  onClick={async () => {
                                    if (!companyId) return;
                                    if (!confirm('Tem certeza que deseja desconectar o WhatsApp? Isso irá:\n\n• Deletar a instância no Evolution API\n• Limpar todas as configurações do WhatsApp\n• Remover todas as mensagens do WhatsApp (whatsappMessages)\n• Remover todos os contatos do WhatsApp (whatsappContacts)\n• Limpar histórico de agendamentos pelo WhatsApp\n\n⚠️ Esta ação não pode ser desfeita!\n\nVocê precisará configurar novamente para usar o WhatsApp.')) {
                                      return;
                                    }
                                    setDisconnecting(true);
                                    try {
                                      const disconnectCallable = httpsCallable(functions, 'disconnectWhatsApp');
                                      await disconnectCallable({ companyId });
                                      alert('WhatsApp desconectado com sucesso! Todas as configurações foram limpas.');
                                      // Recarregar a página para atualizar as configurações
                                      window.location.reload();
                                    } catch (error: any) {
                                      console.error('Erro ao desconectar WhatsApp:', error);
                                      alert(`Erro ao desconectar WhatsApp: ${error?.message || 'Erro desconhecido'}`);
                                      setDisconnecting(false);
                                    }
                                  }}
                                  className={cn(
                                    isVibrant
                                      ? 'border-red-300 bg-red-500 text-white hover:bg-red-600 hover:border-red-400'
                                      : ''
                                  )}
                                >
                                  {disconnecting ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Desconectando...
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-4 h-4 mr-2" />
                                      Desconectar
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            <span className={cn('text-xs', subtleTextClass)}>
                              {settings.whatsappIntegrationType === 'WHATSAPP-BUSINESS'
                                ? 'WhatsApp Business usa API oficial do Meta e requer token/credenciais. Não usa QR Code.'
                                : 'Clique se o QR Code não aparecer ou estiver expirado.'}
                            </span>
                          </CardFooter>
                        )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

            {/* Migração do Capim - Apenas para dentistas */}
            {tipoEstabelecimento === 'dentista' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className={cn('transition-all', neutralCardClass)}>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Download
                      className={cn(
                        'w-5 h-5',
                        isVibrant ? 'text-indigo-500' : 'text-primary'
                      )}
                    />
                    Migração de Pacientes do Capim
                  </CardTitle>
                  <CardDescription className={cn(subtleTextClass)}>
                    Importe seus pacientes do sistema Capim para o AllOne.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!capimToken ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="capim-email">Email do Capim</Label>
                        <Input
                          id="capim-email"
                          type="email"
                          value={capimEmail}
                          onChange={(e) => setCapimEmail(e.target.value)}
                          placeholder="seu@email.com"
                          disabled={capimAuthenticating}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capim-password">Senha do Capim</Label>
                        <Input
                          id="capim-password"
                          type="password"
                          value={capimPassword}
                          onChange={(e) => setCapimPassword(e.target.value)}
                          placeholder="Sua senha"
                          disabled={capimAuthenticating}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !capimAuthenticating) {
                              authenticateCapim();
                            }
                          }}
                        />
                      </div>
                      {capimAuthError && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {capimAuthError}
                        </div>
                      )}
                      <Button
                        onClick={authenticateCapim}
                        disabled={capimAuthenticating || !capimEmail || !capimPassword}
                        className={cn(
                          'w-full font-semibold',
                          isVibrant
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                            : ''
                        )}
                      >
                        {capimAuthenticating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Autenticando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Conectar ao Capim
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-700">
                            Conectado ao Capim
                          </p>
                          <p className="text-xs text-emerald-600">
                            Autenticação realizada com sucesso
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCapimToken(null);
                            setCapimEmail('');
                            setCapimPassword('');
                            setCapimPatients([]);
                            setCapimImportResult(null);
                            setCapimAuthError(null);
                          }}
                          className="ml-auto"
                        >
                          Desconectar
                        </Button>
                      </div>

                      {capimPatients.length === 0 ? (
                        <div className="space-y-4">
                          <Button
                            onClick={loadCapimPatients}
                            disabled={capimLoadingPatients}
                            className={cn(
                              'w-full font-semibold',
                              isVibrant
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                                : ''
                            )}
                          >
                            {capimLoadingPatients ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Carregando pacientes...
                              </>
                            ) : (
                              <>
                                <Users className="mr-2 h-4 w-4" />
                                Carregar Pacientes do Capim
                              </>
                            )}
                          </Button>
                          {capimAuthError && (
                            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {capimAuthError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm font-medium text-foreground mb-1">
                              {capimPatients.length} paciente(s) encontrado(s)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Revise os dados antes de importar
                            </p>
                          </div>

                          {capimImportResult && (
                            <div className={cn(
                              'rounded-lg border p-4',
                              capimImportResult.errors > 0
                                ? 'border-amber-500/30 bg-amber-50/50'
                                : 'border-emerald-500/30 bg-emerald-50/50'
                            )}>
                              <p className={cn(
                                'text-sm font-medium mb-2',
                                capimImportResult.errors > 0 ? 'text-amber-700' : 'text-emerald-700'
                              )}>
                                Importação concluída!
                              </p>
                              <div className="text-xs space-y-1">
                                <p className="text-emerald-600">
                                  ✓ {capimImportResult.success} importado(s) com sucesso
                                </p>
                                {capimImportResult.skipped > 0 && (
                                  <p className="text-slate-600">
                                    ⊘ {capimImportResult.skipped} ignorado(s) (já existentes)
                                  </p>
                                )}
                                {capimImportResult.errors > 0 && (
                                  <p className="text-amber-600">
                                    ✗ {capimImportResult.errors} erro(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {capimImporting && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Importando pacientes...</span>
                                <span className="font-medium">
                                  {capimImportProgress.current} / {capimImportProgress.total}
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-300"
                                  style={{
                                    width: `${(capimImportProgress.current / capimImportProgress.total) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={importCapimPatients}
                            disabled={capimImporting || capimPatients.length === 0}
                            className={cn(
                              'w-full font-semibold',
                              isVibrant
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                                : ''
                            )}
                          >
                            {capimImporting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importando...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Importar {capimPatients.length} Paciente(s)
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção de Importação de Agendamentos do Capim */}
                  {capimToken && (
                    <div className="mt-6 space-y-4 border-t pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Importar Agendamentos</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Importe agendamentos do último ano até os próximos 6 meses do Capim
                          </p>
                        </div>
                      </div>

                      {capimAppointments.length === 0 ? (
                        <div className="space-y-4">
                          <Button
                            onClick={loadCapimAppointments}
                            disabled={capimLoadingAppointments}
                            className={cn(
                              'w-full font-semibold',
                              isVibrant
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                                : ''
                            )}
                          >
                            {capimLoadingAppointments ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Carregando agendamentos...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Carregar Agendamentos (último ano + 6 meses)
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm font-medium text-foreground">
                              {capimAppointments.length} agendamento(s) encontrado(s)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Revise os dados antes de importar
                            </p>
                          </div>

                          {capimImportAppointmentsResult && (
                            <div className={cn(
                              'rounded-lg border p-4',
                              capimImportAppointmentsResult.errors > 0
                                ? 'border-amber-500/30 bg-amber-50/50'
                                : 'border-emerald-500/30 bg-emerald-50/50'
                            )}>
                              <p className={cn(
                                'text-sm font-medium mb-2',
                                capimImportAppointmentsResult.errors > 0 ? 'text-amber-700' : 'text-emerald-700'
                              )}>
                                Importação concluída!
                              </p>
                              <div className="text-xs space-y-1">
                                <p className="text-emerald-600">
                                  ✓ {capimImportAppointmentsResult.success} importado(s) com sucesso
                                </p>
                                {capimImportAppointmentsResult.skipped > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-slate-600 font-medium">
                                      ⊘ {capimImportAppointmentsResult.skipped} ignorado(s):
                                    </p>
                                    {capimImportAppointmentsResult.skippedDetails && (
                                      <div className="pl-3 space-y-0.5">
                                        {capimImportAppointmentsResult.skippedDetails.alreadyImported > 0 && (
                                          <p className="text-slate-500">
                                            • {capimImportAppointmentsResult.skippedDetails.alreadyImported} já importado(s)
                                          </p>
                                        )}
                                        {capimImportAppointmentsResult.skippedDetails.patientNotFound > 0 && (
                                          <p className="text-amber-600">
                                            • {capimImportAppointmentsResult.skippedDetails.patientNotFound} sem paciente correspondente
                                            <span className="text-xs text-slate-500 block pl-2">
                                              (importe os pacientes do Capim primeiro)
                                            </span>
                                          </p>
                                        )}
                                        {capimImportAppointmentsResult.skippedDetails.invalidDate > 0 && (
                                          <p className="text-amber-600">
                                            • {capimImportAppointmentsResult.skippedDetails.invalidDate} com data inválida
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {capimImportAppointmentsResult.skippedAppointments && capimImportAppointmentsResult.skippedAppointments.length > 0 && (
                                      <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-800">
                                          Ver detalhes dos agendamentos ignorados ({capimImportAppointmentsResult.skippedAppointments.length})
                                        </summary>
                                        <div className="mt-2 max-h-60 overflow-y-auto space-y-2 pl-3 border-l-2 border-slate-200">
                                          {capimImportAppointmentsResult.skippedAppointments.map((apt, idx) => (
                                            <div key={idx} className="text-xs bg-slate-50 rounded p-2 space-y-1">
                                              <div className="flex items-start justify-between">
                                                <span className="font-medium text-slate-700">
                                                  {apt.title || apt.patientName || `Agendamento ${apt.id}`}
                                                </span>
                                                <span className={cn(
                                                  'px-2 py-0.5 rounded text-xs font-medium',
                                                  apt.reason === 'alreadyImported' ? 'bg-slate-200 text-slate-700' :
                                                  apt.reason === 'patientNotFound' ? 'bg-amber-100 text-amber-700' :
                                                  apt.reason === 'invalidDate' ? 'bg-red-100 text-red-700' :
                                                  'bg-red-100 text-red-700'
                                                )}>
                                                  {apt.reason === 'alreadyImported' ? 'Já importado' :
                                                   apt.reason === 'patientNotFound' ? 'Paciente não encontrado' :
                                                   apt.reason === 'invalidDate' ? 'Data inválida' :
                                                   'Erro'}
                                                </span>
                                              </div>
                                              {apt.patientName && (
                                                <div className="text-slate-600">
                                                  <span className="font-medium">Paciente:</span> {apt.patientName}
                                                </div>
                                              )}
                                              {apt.patientPhone && (
                                                <div className="text-slate-600">
                                                  <span className="font-medium">Telefone:</span> {apt.patientPhone}
                                                </div>
                                              )}
                                              {apt.startDate && (
                                                <div className="text-slate-600">
                                                  <span className="font-medium">Data:</span> {new Date(apt.startDate).toLocaleString('pt-BR')}
                                                  {apt.endDate && ` - ${new Date(apt.endDate).toLocaleString('pt-BR')}`}
                                                </div>
                                              )}
                                              {apt.error && (
                                                <div className="text-red-600 text-xs mt-1">
                                                  <span className="font-medium">Motivo:</span> {apt.error}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                )}
                                {capimImportAppointmentsResult.errors > 0 && (
                                  <p className="text-amber-600">
                                    ✗ {capimImportAppointmentsResult.errors} erro(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {capimImportingAppointments && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Importando agendamentos...</span>
                                <span className="font-medium">
                                  {capimImportAppointmentsProgress.current} / {capimImportAppointmentsProgress.total}
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-300"
                                  style={{
                                    width: `${(capimImportAppointmentsProgress.current / capimImportAppointmentsProgress.total) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={loadCapimAppointments}
                              disabled={capimLoadingAppointments || capimImportingAppointments}
                              variant="outline"
                              className="flex-1"
                            >
                              {capimLoadingAppointments ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Carregando...
                                </>
                              ) : (
                                <>
                                  <RefreshCcw className="mr-2 h-4 w-4" />
                                  Recarregar
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={importCapimAppointments}
                              disabled={capimImportingAppointments || capimAppointments.length === 0}
                              className={cn(
                                'flex-1 font-semibold',
                                isVibrant
                                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                                  : ''
                              )}
                            >
                              {capimImportingAppointments ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importando...
                                </>
                              ) : (
                                <>
                                  <Download className="mr-2 h-4 w-4" />
                                  Importar {capimAppointments.length} Agendamento(s)
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            )}

                <div
                  className={cn(
                    'rounded-lg border p-4 shadow-sm transition',
                    isVibrant
                      ? 'border-white/40 bg-white/75 backdrop-blur'
                      : 'border-primary/20 bg-primary/5'
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          isVibrant ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'
                        )}
                      >
                        <MessageSquare className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Uso de mensagens via WhatsApp
                        </h3>
                        <p className={cn('text-sm', subtleTextClass)}>
                          As primeiras {MONTHLY_WHATSAPP_FREE_LIMIT} mensagens do mês são gratuitas.
                          Excedentes custam {currencyFormatter.format(WHATSAPP_MESSAGE_UNIT_PRICE)} por mensagem.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          isVibrant ? 'border-primary/40 text-primary bg-primary/10' : 'border-primary/30 text-primary bg-primary/5'
                        )}
                      >
                        200 mensagens incluídas/mês
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={refreshMessageStats}
                        disabled={messageStatsLoading || !companyId}
                        className={cn(
                          'gap-2',
                          isVibrant ? 'border-white/40 bg-white/70 text-slate-700 hover:bg-white/80' : ''
                        )}
                      >
                        <RefreshCcw
                          className={cn('h-4 w-4', messageStatsLoading ? 'animate-spin' : '')}
                        />
                        Atualizar
                      </Button>
                    </div>
                  </div>

                  {messageStatsError ? (
                    <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {messageStatsError}
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      {messageStatsLoading ? (
                        <div className="space-y-3">
                          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/80" />
                          <div className="h-3 w-full animate-pulse rounded bg-slate-200/70" />
                          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200/70" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <span>Consumo no mês</span>
                              <span>
                                {messageStats.monthCount.toLocaleString('pt-BR')} /{' '}
                                {MONTHLY_WHATSAPP_FREE_LIMIT.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200/80">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500 ease-out',
                                  messageStats.monthCount > MONTHLY_WHATSAPP_FREE_LIMIT
                                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600'
                                )}
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                            {messageStats.extraCount > 0 && (
                              <p className="mt-2 text-xs font-semibold text-rose-500">
                                {messageStats.extraCount.toLocaleString('pt-BR')} mensagens acima do limite gratuito.
                              </p>
                            )}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className={cn('rounded-lg border bg-white/80 p-3 shadow-sm', isVibrant ? 'border-white/60' : 'border-slate-200/70')}>
                              <p className="text-xs uppercase text-slate-500">Mensagens no mês</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {messageStats.monthCount.toLocaleString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Gratuitas restantes:{' '}
                                {Math.max(0, MONTHLY_WHATSAPP_FREE_LIMIT - messageStats.monthCount).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className={cn('rounded-lg border bg-white/80 p-3 shadow-sm', isVibrant ? 'border-white/60' : 'border-slate-200/70')}>
                              <p className="text-xs uppercase text-slate-500">Excedente estimado</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {messageStats.extraCount.toLocaleString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Tarifa: {currencyFormatter.format(WHATSAPP_MESSAGE_UNIT_PRICE)} por mensagem
                              </p>
                            </div>
                            <div className={cn('rounded-lg border bg-white/80 p-3 shadow-sm', isVibrant ? 'border-white/60' : 'border-slate-200/70')}>
                              <p className="text-xs uppercase text-slate-500">Custo estimado do mês</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {estimatedCostLabel}
                              </p>
                              <p className="text-xs text-slate-500">
                                Atualize sempre que precisar
                              </p>
                            </div>
                            <div className={cn('rounded-lg border bg-white/80 p-3 shadow-sm', isVibrant ? 'border-white/60' : 'border-slate-200/70')}>
                              <p className="text-xs uppercase text-slate-500">Total histórico</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {messageStats.totalCount.toLocaleString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Soma de todas as mensagens enviadas
                              </p>
                            </div>
                          </div>

                          {statsLastUpdatedLabel && (
                            <p className={cn('text-xs text-slate-500', isVibrant ? 'text-slate-600' : '')}>
                              Atualizado {statsLastUpdatedLabel}.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>

        <div
          className={cn(
            'sticky bottom-0 z-20 border-t px-6 py-4 backdrop-blur',
            isVibrant ? 'border-white/20 bg-white/70' : 'border-border/80 bg-background/95'
          )}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Botão temporário para gerar dados de exemplo
              <Button
                onClick={gerarDadosExemplo}
                disabled={gerandoDadosExemplo}
                size="lg"
                variant="outline"
                className={cn(
                  'font-semibold transition-all shadow-sm border-blue-500 text-blue-600 hover:bg-blue-50',
                  gerandoDadosExemplo && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {gerandoDadosExemplo ? 'Gerando dados...' : 'Gerar Dados de Exemplo (TEMP)'}
              </Button>
               */}
              {/* Botão temporário para importar medicamentos
              <Button
                onClick={importMedicamentos}
                disabled={importingMedicamentos}
                size="lg"
                variant="outline"
                className={cn(
                  'font-semibold transition-all shadow-sm border-orange-500 text-orange-600 hover:bg-orange-50',
                  importingMedicamentos && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importingMedicamentos ? 'Importando medicamentos...' : 'Importar Medicamentos (TEMP)'}
              </Button>
               */}
            </div>

            <div className="flex items-center gap-3">
              <span className={cn('text-sm', subtleTextClass)}>
                Lembre-se de salvar para aplicar as alterações.
              </span>
              <Button
                onClick={saveSettings}
                disabled={saving}
                size="lg"
                className={cn(
                  'font-semibold transition-all shadow-sm',
                  isVibrant
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                    : ''
                )}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Seleção de Serviços */}
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
              <h3 className="text-lg font-bold text-slate-900">Selecionar Serviços</h3>
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
              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className={cn('ml-2 text-sm', subtleTextClass)}>Carregando serviços...</span>
                </div>
              ) : services.filter(s => s.ativo).length === 0 ? (
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
                    Nenhum serviço ativo
                  </h3>
                  <p className={cn(
                    'text-sm',
                    isVibrant ? 'text-slate-600' : 'text-gray-600'
                  )}>
                    Não há serviços ativos cadastrados.
                  </p>
                </div>
              ) : (() => {
                const filteredServices = services.filter(service => 
                  service.ativo && 
                  service.nome.toLowerCase().includes(serviceQuery.toLowerCase())
                );
                
                return filteredServices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Nenhum serviço encontrado para "{serviceQuery}"</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredServices.map((service) => {
                      const currentIds = settings.agendamentoWhatsappServicosIds || [];
                      const isSelected = currentIds.includes(service.id);
                      
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
                              const currentIds = settings.agendamentoWhatsappServicosIds || [];
                              if (e.target.checked) {
                                // Adicionar serviço
                                setSettings(prev => ({
                                  ...prev,
                                  agendamentoWhatsappServicosIds: [...currentIds, service.id]
                                }));
                              } else {
                                // Remover serviço
                                const newIds = currentIds.filter(id => id !== service.id);
                                // Se não sobrou nenhum, voltar para "todos" (array vazio)
                                setSettings(prev => ({
                                  ...prev,
                                  agendamentoWhatsappServicosIds: newIds.length > 0 ? newIds : []
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
                );
              })()}
            </div>

            <div className="p-4 border-t bg-slate-50">
              {(() => {
                const currentIds = settings.agendamentoWhatsappServicosIds || [];
                const isAllSelected = currentIds.length === 0;
                const selectedCount = currentIds.length;
                const selectedServicesList = services.filter(s => currentIds.includes(s.id));
                const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {isAllSelected 
                          ? 'Todos os serviços ativos (padrão)' 
                          : `${selectedCount} serviço${selectedCount !== 1 ? 's' : ''} selecionado${selectedCount !== 1 ? 's' : ''}`
                        }
                      </span>
                      {!isAllSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSettings(prev => ({ ...prev, agendamentoWhatsappServicosIds: [] }));
                          }}
                          className="text-xs"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    {!isAllSelected && (
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-semibold text-slate-900">
                          R$ {(totalPrice / 100).toFixed(2)} • {totalDuration} min
                        </span>
                      </div>
                    )}
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
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AccessGuard>
  );
}
