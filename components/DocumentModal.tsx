'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, AlertCircle, Pill, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';
import { generateReceitaPDF, generateAtestadoPDF } from './DocumentPDFGenerator';
import type { Professional, Patient, TipoMedida, Medicamento } from '@/types';
import { useMedicamentos } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';
import { getGradientColors } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'receita' | 'atestado';
  companyId: string;
  patientId: string;
  patient: Patient | null;
  professionals: Professional[];
  company: { nome?: string; telefone?: string; email?: string; endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }; cnpj?: string; logoUrl?: string } | null;
}

export function DocumentModal({
  isOpen,
  onClose,
  type,
  companyId,
  patientId,
  patient,
  professionals,
  company,
}: DocumentModalProps) {
  const { themePreference, customColor, customColor2, professionalId, user } = useAuth();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom' && !!customColor;
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  
  // Buscar profissional pelo email do usuário logado
  // Primeiro busca na collection de usuários da empresa para pegar o professionalId
  const [loggedProfessional, setLoggedProfessional] = useState<typeof professionals[0] | null>(null);
  const [loadingProfessional, setLoadingProfessional] = useState(false);
  
  useEffect(() => {
    const findProfessionalByEmail = async () => {
      if (!user?.email || !companyId) {
        setLoggedProfessional(null);
        return;
      }
      
      setLoadingProfessional(true);
      try {
        // Primeiro, tentar buscar por email diretamente na lista de profissionais
        let found = professionals.find(p => {
          const profEmail = (p as any).email;
          return profEmail && profEmail.toLowerCase() === user.email?.toLowerCase();
        });
        
        // Se não encontrou por email, buscar via userUid
        if (!found && user.uid) {
          found = professionals.find(p => p.userUid === user.uid);
        }
        
        // Se ainda não encontrou, buscar na collection de usuários da empresa
        if (!found) {
          const usersQuery = query(
            collection(db, `companies/${companyId}/users`),
            where('email', '==', user.email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            // Pegar o primeiro usuário encontrado (pode haver múltiplos perfis)
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            const userProfessionalId = userData.professionalId;
            
            // Buscar o profissional pelo ID encontrado
            if (userProfessionalId) {
              found = professionals.find(p => p.id === userProfessionalId);
            }
          }
        }
        
        setLoggedProfessional(found || null);
      } catch (error) {
        console.error('Erro ao buscar profissional pelo email:', error);
        setLoggedProfessional(null);
      } finally {
        setLoadingProfessional(false);
      }
    };
    
    findProfessionalByEmail();
  }, [user?.email, user?.uid, companyId, professionals]);
  
  const loggedProfessionalId = loggedProfessional?.id || null;
  const loggedProfessionalHasCro = loggedProfessional && loggedProfessional.cro && loggedProfessional.cro.trim();
  
  // Detectar se é mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { medicamentos, loading: loadingMedicamentos } = useMedicamentos();
  
  // Estados para autocomplete de cada medicamento
  const [autocompleteStates, setAutocompleteStates] = useState<Record<number, {
    searchTerm: string;
    showSuggestions: boolean;
    selectedIndex: number;
  }>>({});

  // Estados para Receita
  const [receitaMedicamentos, setReceitaMedicamentos] = useState<Array<{
    numero: number; // Número do medicamento na ordem de adição
    nome: string;
    quantidade: number;
    medida: TipoMedida;
    posologia: string;
    exigeControleEspecial: boolean;
    controleEspecialInfo?: {
      compradorNome?: string;
      compradorIdent?: string;
      compradorOrgaoEmissor?: string;
      compradorEndereco?: string;
      compradorCidade?: string;
      compradorUF?: string;
      compradorTelefone?: string;
      fornecedorNome?: string;
      fornecedorIdent?: string;
      fornecedorOrgaoEmissor?: string;
      fornecedorEndereco?: string;
      fornecedorCidade?: string;
      fornecedorUF?: string;
      fornecedorTelefone?: string;
      farmaceuticoAssinatura?: string;
      farmaceuticoData?: string;
    };
    informacoesControleEspecial?: string; // Manter para compatibilidade
  }>>([]);
  const [proximoNumeroMedicamento, setProximoNumeroMedicamento] = useState(1);
  const [receitaObservacoes, setReceitaObservacoes] = useState('');

  // Estados para Atestado
  const [atestadoTexto, setAtestadoTexto] = useState('');
  const [atestadoTipoAfastamento, setAtestadoTipoAfastamento] = useState<'dias' | 'horas'>('dias');
  const [atestadoDias, setAtestadoDias] = useState<number | undefined>(undefined);
  const [atestadoHoras, setAtestadoHoras] = useState<number | undefined>(undefined);
  const [atestadoHoraInicio, setAtestadoHoraInicio] = useState<string>('');
  const [atestadoHoraFim, setAtestadoHoraFim] = useState<string>('');
  const [atestadoCid, setAtestadoCid] = useState<string>('');
  const [cidSearchTerm, setCidSearchTerm] = useState('');
  const [showCidSuggestions, setShowCidSuggestions] = useState(false);
  const [selectedCidIndex, setSelectedCidIndex] = useState(-1);
  const [cids, setCids] = useState<Array<{codigo: string; descricao: string}>>([]);
  const [atestadoCpf, setAtestadoCpf] = useState<string>('');

  // Função para gerar texto padrão do atestado
  const gerarTextoAtestado = () => {
    if (!patient) return '';
    
    const nomePaciente = patient.nome || 'paciente';
    const cpf = atestadoCpf || '___.___.___-__';
    
    let periodo = '';
    if (atestadoTipoAfastamento === 'dias') {
      periodo = atestadoDias ? `${atestadoDias} ${atestadoDias === 1 ? 'dia' : 'dias'}` : '___ dia(s)';
    } else {
      // Para horas, usar os horários de início e fim
      if (atestadoHoraInicio && atestadoHoraFim) {
        periodo = `das ${atestadoHoraInicio} às ${atestadoHoraFim}`;
      } else if (atestadoHoraInicio) {
        periodo = `a partir das ${atestadoHoraInicio}`;
      } else if (atestadoHoraFim) {
        periodo = `até às ${atestadoHoraFim}`;
      } else {
        periodo = 'das ___ às ___';
      }
    }
    
    return `Atesto, para os devidos fins que o(a) Sr.(a) ${nomePaciente} CPF ${cpf}, foi submetido a procedimentos nesta data.

Em decorrência, deverá permanecer afastado de suas atividades por um período de ${periodo}, a partir desta data.`;
  };

  // Carregar CPF do paciente quando o modal abrir
  useEffect(() => {
    if (type === 'atestado' && patient && isOpen) {
      if (patient.cpf) {
        setAtestadoCpf(patient.cpf);
      } else {
        setAtestadoCpf('');
      }
    }
  }, [type, patient, isOpen]);

  // Atualizar texto do atestado quando dados mudarem (incluindo CPF)
  useEffect(() => {
    if (type === 'atestado' && patient && isOpen) {
      const textoGerado = gerarTextoAtestado();
      setAtestadoTexto(textoGerado);
    }
  }, [type, patient, atestadoTipoAfastamento, atestadoDias, atestadoHoras, atestadoCpf, atestadoHoraInicio, atestadoHoraFim, isOpen]);

  // Carregar CIDs da categoria K
  useEffect(() => {
    fetch('/cids-k.json')
      .then(res => res.json())
      .then(data => setCids(data))
      .catch(err => console.error('Erro ao carregar CIDs:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Se encontrou profissional pelo email e tem CRO, selecionar automaticamente
      if (loggedProfessionalHasCro && loggedProfessionalId) {
        setSelectedProfessionalId(loggedProfessionalId);
      } else {
        setSelectedProfessionalId('');
      }
      setReceitaMedicamentos([]);
      setReceitaObservacoes('');
      setAtestadoTipoAfastamento('dias');
      setAtestadoDias(undefined);
      setAtestadoHoras(undefined);
      setAtestadoHoraInicio('');
      setAtestadoHoraFim('');
      setAtestadoCid('');
      // Não resetar CPF aqui, será carregado do paciente se disponível
      setCidSearchTerm('');
      setShowCidSuggestions(false);
      setSelectedCidIndex(-1);
      setAutocompleteStates({});
      setProximoNumeroMedicamento(1);
      // Não resetar atestadoTexto aqui, será gerado pelo useEffect abaixo
    }
  }, [isOpen, loggedProfessionalHasCro, loggedProfessionalId]);

  // Função para filtrar medicamentos em memória
  const getFilteredMedicamentos = (searchTerm: string, index: number) => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return medicamentos.filter(med => 
      med.name.toLowerCase().includes(term)
    ).slice(0, 10); // Limitar a 10 sugestões
  };

  // Função para remover acentos de uma string
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Função para filtrar CIDs
  const getFilteredCids = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      // Se não há termo de busca, retornar todos os CIDs (limitado para performance)
      return cids.slice(0, 50);
    }
    const term = removeAccents(searchTerm.toLowerCase());
    return cids.filter(cid => {
      const codigoNormalizado = removeAccents(cid.codigo.toLowerCase());
      const descricaoNormalizada = removeAccents(cid.descricao.toLowerCase());
      return codigoNormalizado.includes(term) || descricaoNormalizada.includes(term);
    }).slice(0, 50); // Aumentado para 50 sugestões para melhor visualização
  };

  // Função para selecionar medicamento do autocomplete
  const handleSelectMedicamento = (index: number, medicamento: typeof medicamentos[0]) => {
    const updated = [...receitaMedicamentos];
    updated[index] = {
      ...updated[index],
      nome: medicamento.name,
      posologia: medicamento.posology || updated[index].posologia,
      medida: (medicamento.measurement_type as TipoMedida) || updated[index].medida,
      quantidade: medicamento.measurement_qty || updated[index].quantidade,
      exigeControleEspecial: medicamento.special_prescription_required || updated[index].exigeControleEspecial,
    };
    setReceitaMedicamentos(updated);
    
    // Fechar autocomplete
    setAutocompleteStates(prev => ({
      ...prev,
      [index]: {
        searchTerm: medicamento.name,
        showSuggestions: false,
        selectedIndex: -1,
      }
    }));
  };

  // Função para atualizar nome do medicamento com autocomplete
  const handleUpdateMedicamentoNome = (index: number, value: string) => {
    handleUpdateMedicamento(index, 'nome', value);
    
    // Atualizar estado do autocomplete
    setAutocompleteStates(prev => ({
      ...prev,
      [index]: {
        searchTerm: value,
        showSuggestions: value.trim().length > 0,
        selectedIndex: -1,
      }
    }));
  };

  const handleAddMedicamento = () => {
    const numero = proximoNumeroMedicamento;
    setProximoNumeroMedicamento(numero + 1);
    setReceitaMedicamentos([
      {
        numero,
        nome: '',
        quantidade: 1,
        medida: 'comprimido',
        posologia: '',
        exigeControleEspecial: false,
        controleEspecialInfo: undefined,
        informacoesControleEspecial: '',
      },
      ...receitaMedicamentos,
    ]);
  };

  const handleRemoveMedicamento = (index: number) => {
    setReceitaMedicamentos(receitaMedicamentos.filter((_, i) => i !== index));
  };

  const handleUpdateMedicamento = (index: number, field: string, value: any) => {
    const updated = [...receitaMedicamentos];
    updated[index] = { ...updated[index], [field]: value };
    setReceitaMedicamentos(updated);
  };

  // Função helper para remover valores undefined de objetos (Firestore não aceita undefined)
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const handleSave = async () => {
    // Validar se encontrou profissional pelo email do usuário logado
    if (!loggedProfessional) {
      showError('Nenhum profissional encontrado com o email do usuário logado. É necessário estar vinculado a um profissional para emitir receitas e atestados.');
      return;
    }

    if (!loggedProfessionalHasCro) {
      showError('O profissional vinculado não possui CRO cadastrado. É necessário ter CRO para emitir receitas e atestados.');
      return;
    }

    if (!selectedProfessionalId) {
      showError('Profissional não selecionado');
      return;
    }

    // Validar que o profissional selecionado é o mesmo encontrado pelo email
    if (selectedProfessionalId !== loggedProfessionalId) {
      showError('Apenas o profissional logado pode emitir receitas e atestados.');
      return;
    }

    const professional = professionals.find((p) => p.id === selectedProfessionalId);
    if (!professional) {
      showError('Profissional não encontrado');
      return;
    }

    // Validar se o profissional tem CRO (necessário para emitir receitas e atestados)
    if (!professional.cro || !professional.cro.trim()) {
      showError('Este profissional não possui CRO cadastrado. Apenas profissionais com CRO podem emitir receitas e atestados.');
      return;
    }

    if (type === 'receita') {
      if (receitaMedicamentos.length === 0) {
        showError('Adicione pelo menos um medicamento');
        return;
      }

      // Validar medicamentos
      for (const med of receitaMedicamentos) {
        if (!med.nome.trim()) {
          showError('Preencha o nome de todos os medicamentos');
          return;
        }
        if (!med.posologia.trim()) {
          showError('Preencha a posologia de todos os medicamentos');
          return;
        }
      }
    } else {
      if (!atestadoTexto.trim()) {
        showError('Preencha o texto do atestado');
        return;
      }
    }

    setSaving(true);

    try {
      if (type === 'receita') {
        // Salvar receita no Firestore - remover campo numero dos medicamentos
        const medicamentosParaSalvar = receitaMedicamentos.map(({ numero, ...med }) => med);
        const receitaData = removeUndefined({
          companyId,
          patientId,
          professionalId: selectedProfessionalId,
          professionalName: professional.apelido,
          professionalSignatureUrl: professional.signatureImageUrl || null,
          medicamentos: medicamentosParaSalvar,
          observacoes: receitaObservacoes || null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdByUid: null,
        });

        await addDoc(collection(db, `companies/${companyId}/patients/${patientId}/receitas`), receitaData);

        // Gerar PDF - converter farmaceuticoData de string para Date e remover campo numero
        const medicamentosParaPDF = receitaMedicamentos.map(med => {
          const { numero, ...medSemNumero } = med;
          return {
            ...medSemNumero,
            controleEspecialInfo: med.controleEspecialInfo ? {
              ...med.controleEspecialInfo,
              farmaceuticoData: med.controleEspecialInfo.farmaceuticoData 
                ? new Date(med.controleEspecialInfo.farmaceuticoData) 
                : undefined
            } : undefined
          };
        });

        await generateReceitaPDF(
          company,
          patient,
          {
            id: professional.id,
            apelido: professional.apelido,
            signatureImageUrl: professional.signatureImageUrl,
            cro: professional.cro,
            croEstado: professional.croEstado,
          },
          medicamentosParaPDF,
          receitaObservacoes || undefined,
          companyId,
          themePreference,
          customColor || null,
          customColor2 || null
        );

        showSuccess('Receita criada e PDF gerado com sucesso');
      } else {
        // Salvar atestado no Firestore
        const atestadoData = removeUndefined({
          companyId,
          patientId,
          professionalId: selectedProfessionalId,
          professionalName: professional.apelido,
          professionalSignatureUrl: professional.signatureImageUrl || null,
          texto: atestadoTexto,
          tipoAfastamento: atestadoTipoAfastamento,
          diasAfastamento: atestadoTipoAfastamento === 'dias' ? (atestadoDias || null) : null,
          horasAfastamento: null, // Não usado mais quando tipo é horas
          horaInicio: atestadoTipoAfastamento === 'horas' ? (atestadoHoraInicio || null) : null,
          horaFim: atestadoTipoAfastamento === 'horas' ? (atestadoHoraFim || null) : null,
          cid: atestadoCid || null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdByUid: null,
        });

        await addDoc(collection(db, `companies/${companyId}/patients/${patientId}/atestados`), atestadoData);

        // Gerar PDF
        await generateAtestadoPDF(
          company,
          patient,
          {
            id: professional.id,
            apelido: professional.apelido,
            signatureImageUrl: professional.signatureImageUrl,
            cro: professional.cro,
            croEstado: professional.croEstado,
          },
          atestadoTexto,
          atestadoTipoAfastamento === 'dias' ? atestadoDias : undefined,
          atestadoTipoAfastamento === 'horas' ? atestadoHoras : undefined,
          atestadoTipoAfastamento,
          atestadoCid || undefined,
          atestadoTipoAfastamento === 'horas' ? (atestadoHoraInicio || undefined) : undefined,
          atestadoTipoAfastamento === 'horas' ? (atestadoHoraFim || undefined) : undefined,
          companyId,
          themePreference,
          customColor || null,
          customColor2 || null
        );

        showSuccess('Atestado criado e PDF gerado com sucesso');
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      showError('Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const medidaOptions: { value: TipoMedida; label: string }[] = [
    { value: 'ampola', label: 'Ampola' },
    { value: 'caixa', label: 'Caixa' },
    { value: 'comprimido', label: 'Comprimido' },
    { value: 'frasco', label: 'Frasco' },
    { value: 'pacote', label: 'Pacote' },
    { value: 'tubo', label: 'Tubo' },
    { value: 'capsula', label: 'Cápsula' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[1002] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'rounded-t-2xl md:rounded-2xl shadow-2xl max-w-5xl w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden',
              hasGradient
                ? 'bg-white/95 backdrop-blur-xl border-2'
                : 'bg-white border-2 border-gray-200'
            )}
            style={
              hasGradient && isCustom && gradientColors
                ? {
                    borderColor: `${gradientColors.start}40`,
                  }
                : isVibrant
                ? {
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                  }
                : undefined
            }
          >
            {/* Header fixo com gradiente moderno */}
            <div
              className={cn(
                'flex items-center justify-between px-6 py-6 md:p-7 md:pt-7 border-b flex-shrink-0 relative overflow-hidden',
                hasGradient
                  ? isCustom && gradientColors
                    ? 'bg-white/90 border-white/40'
                    : isVibrant
                    ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
                    : 'bg-white/90 border-white/40'
                  : 'border-gray-200 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50'
              )}
              style={isMobile ? {
                paddingTop: 'max(7rem, env(safe-area-inset-top, 0px) + 1.5rem)',
                ...(hasGradient && isCustom && gradientColors ? {
                  borderColor: `${gradientColors.start}40`,
                  background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
                } : undefined)
              } : (hasGradient && isCustom && gradientColors ? {
                borderColor: `${gradientColors.start}40`,
                background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
              } : undefined)}
            >
              <div
                className={cn(
                  'absolute inset-0',
                  hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5'
                      : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
                    : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
                )}
                style={hasGradient && isCustom && gradientColors ? {
                  background: `linear-gradient(90deg, ${gradientColors.start}05 0%, ${gradientColors.middle}05 50%, ${gradientColors.end}05 100%)`,
                } : undefined}
              ></div>
              <div className="flex items-center gap-4 relative z-10">
                <div
                  className={cn(
                    'p-3 rounded-2xl shadow-lg transform transition-transform duration-300 hover:scale-105',
                    hasGradient
                      ? isCustom && gradientColors
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/30'
                        : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
                      : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
                  )}
                  style={hasGradient && isCustom && gradientColors ? {
                    background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    boxShadow: `0 10px 15px -3px ${gradientColors.start}30, 0 4px 6px -2px ${gradientColors.start}20`,
                  } : undefined}
                >
                  {type === 'receita' ? (
                    <Pill className="w-6 h-6 text-white" />
                  ) : (
                    <FileCheck className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2
                    className={cn(
                      'text-2xl md:text-3xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-clip-text text-transparent'
                          : isVibrant
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                          : 'text-slate-900'
                        : 'text-slate-900'
                    )}
                    style={hasGradient && isCustom && gradientColors ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : undefined}
                  >
                    {type === 'receita' ? 'Nova Receita' : 'Novo Atestado'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1.5 font-medium">
                    {type === 'receita' ? 'Adicione os medicamentos e informações da receita' : 'Preencha os dados do atestado médico'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md relative z-10"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-gray-50/80 to-white"
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start}05 0%, ${gradientColors.middle}05 50%, ${gradientColors.end}05 100%)`,
                    }
                  : undefined
              }
            >
            {/* Seleção de Profissional */}
            <div className="mb-6">
              <Label htmlFor="professional" className={cn(
                'text-sm font-semibold mb-2 block',
                hasGradient ? 'text-slate-700' : 'text-gray-700'
              )}>
                Profissional *
              </Label>
              {loggedProfessional ? (
                <div className="mt-1">
                  <Input
                    id="professional"
                    value={loggedProfessional.apelido || 'Profissional não encontrado'}
                    disabled
                    className={cn(
                      'bg-gray-100 cursor-not-allowed',
                      !loggedProfessionalHasCro ? 'border-red-300' : '',
                      hasGradient
                        ? 'border-white/60 bg-white/50'
                        : 'border-gray-300 bg-gray-100'
                    )}
                  />
                  {loggedProfessionalHasCro ? (
                    <p className="text-sm text-gray-600 mt-2">
                      CRO: {loggedProfessional.cro} {loggedProfessional.croEstado ? `- ${loggedProfessional.croEstado}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Este profissional não possui CRO cadastrado. É necessário ter CRO para emitir receitas e atestados.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Nenhum profissional encontrado com o email do usuário logado. É necessário estar vinculado a um profissional com CRO para emitir receitas e atestados.
                  </p>
                </div>
              )}
            </div>

            {type === 'receita' ? (
              /* Formulário de Receita */
              <div className="space-y-6">
                {/* Medicamentos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Medicamentos *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddMedicamento}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Medicamento
                    </Button>
                  </div>

                  {receitaMedicamentos.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-500">Nenhum medicamento adicionado</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {receitaMedicamentos.map((med, index) => (
                      <div key={index} className={cn(
                        'p-4 border-2 rounded-xl shadow-md hover:shadow-lg transition-all',
                        hasGradient
                          ? 'bg-white/90 border-white/60'
                          : 'bg-white border-gray-200'
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                              hasGradient && isCustom && gradientColors
                                ? ''
                                : hasGradient && isVibrant
                                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            )}
                            style={hasGradient && isCustom && gradientColors ? {
                              background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                            } : undefined}
                            >
                              {med.numero}
                            </div>
                            <h4 className={cn(
                              'font-semibold',
                              hasGradient ? 'text-slate-900' : 'text-gray-900'
                            )}>
                              Medicamento {med.numero}
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMedicamento(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="relative">
                            <Label>Nome do Medicamento *</Label>
                            <Input
                              value={med.nome}
                              onChange={(e) => handleUpdateMedicamentoNome(index, e.target.value)}
                              onFocus={() => {
                                setAutocompleteStates(prev => ({
                                  ...prev,
                                  [index]: {
                                    searchTerm: med.nome,
                                    showSuggestions: med.nome.trim().length > 0,
                                    selectedIndex: -1,
                                  }
                                }));
                              }}
                              onBlur={() => {
                                // Delay para permitir clique na sugestão
                                setTimeout(() => {
                                  setAutocompleteStates(prev => ({
                                    ...prev,
                                    [index]: {
                                      ...prev[index],
                                      showSuggestions: false,
                                    }
                                  }));
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                const state = autocompleteStates[index];
                                if (!state || !state.showSuggestions) return;
                                
                                const filtered = getFilteredMedicamentos(state.searchTerm, index);
                                if (filtered.length === 0) return;

                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setAutocompleteStates(prev => ({
                                    ...prev,
                                    [index]: {
                                      ...prev[index],
                                      selectedIndex: Math.min(
                                        (prev[index]?.selectedIndex ?? -1) + 1,
                                        filtered.length - 1
                                      ),
                                    }
                                  }));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setAutocompleteStates(prev => ({
                                    ...prev,
                                    [index]: {
                                      ...prev[index],
                                      selectedIndex: Math.max(
                                        (prev[index]?.selectedIndex ?? -1) - 1,
                                        -1
                                      ),
                                    }
                                  }));
                                } else if (e.key === 'Enter' && state.selectedIndex >= 0) {
                                  e.preventDefault();
                                  handleSelectMedicamento(index, filtered[state.selectedIndex]);
                                }
                              }}
                              placeholder="Digite o nome do medicamento..."
                              className="mt-1"
                            />
                            {autocompleteStates[index]?.showSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {getFilteredMedicamentos(autocompleteStates[index].searchTerm, index).map((medicamento, idx) => (
                                  <div
                                    key={medicamento.id}
                                    onClick={() => handleSelectMedicamento(index, medicamento)}
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                      idx === autocompleteStates[index]?.selectedIndex ? 'bg-gray-100' : ''
                                    }`}
                                  >
                                    <div className="font-medium text-sm">{medicamento.name}</div>
                                    {medicamento.posology && (
                                      <div className="text-xs text-gray-500 mt-1">{medicamento.posology}</div>
                                    )}
                                  </div>
                                ))}
                                {getFilteredMedicamentos(autocompleteStates[index].searchTerm, index).length === 0 && (
                                  <div className="px-4 py-2 text-sm text-gray-500">
                                    Nenhum medicamento encontrado. Você pode digitar o nome manualmente.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Quantidade *</Label>
                              <Input
                                type="number"
                                min="1"
                                value={med.quantidade || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Permitir campo vazio temporariamente
                                  if (value === '') {
                                    handleUpdateMedicamento(index, 'quantidade', 0);
                                  } else {
                                    const numValue = parseInt(value);
                                    // Só atualizar se for um número válido e maior que 0
                                    if (!isNaN(numValue) && numValue > 0) {
                                      handleUpdateMedicamento(index, 'quantidade', numValue);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // Quando perder o foco, garantir que tenha pelo menos 1
                                  const value = parseInt(e.target.value);
                                  if (isNaN(value) || value < 1) {
                                    handleUpdateMedicamento(index, 'quantidade', 1);
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Medida *</Label>
                              <Select
                                value={med.medida}
                                onValueChange={(value) => handleUpdateMedicamento(index, 'medida', value as TipoMedida)}
                                className="mt-1"
                              >
                                {medidaOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Posologia *</Label>
                          <Textarea
                            value={med.posologia}
                            onChange={(e) => handleUpdateMedicamento(index, 'posologia', e.target.value)}
                            placeholder="Ex: 1 comprimido de 8 em 8 horas"
                            className="mt-1"
                            rows={2}
                          />
                        </div>

                        {med.exigeControleEspecial && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Checkbox
                              id={`controle-especial-${index}`}
                              checked={true}
                              disabled={true}
                            />
                            <Label htmlFor={`controle-especial-${index}`} className="text-sm text-yellow-800 cursor-default">
                              Este medicamento exige receita de controle especial (preenchido manualmente no PDF)
                            </Label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={receitaObservacoes}
                    onChange={(e) => setReceitaObservacoes(e.target.value)}
                    placeholder="Observações adicionais (opcional)"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              /* Formulário de Atestado */
              <div className="space-y-6">
                <div>
                  <Label>CPF do Paciente</Label>
                  <Input
                    type="text"
                    value={atestadoCpf}
                    onChange={(e) => {
                      // Formatar CPF automaticamente
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setAtestadoCpf(value);
                      }
                    }}
                    placeholder="000.000.000-00"
                    className="mt-1"
                    maxLength={14}
                  />
                </div>

                <div>
                  <Label>Texto do Atestado *</Label>
                  <Textarea
                    value={atestadoTexto}
                    onChange={(e) => setAtestadoTexto(e.target.value)}
                    placeholder="O texto será gerado automaticamente..."
                    className="mt-1"
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Afastamento</Label>
                    <Select
                      value={atestadoTipoAfastamento}
                      onValueChange={(value) => {
                        setAtestadoTipoAfastamento(value as 'dias' | 'horas');
                        setAtestadoDias(undefined);
                        setAtestadoHoras(undefined);
                        setAtestadoHoraInicio('');
                        setAtestadoHoraFim('');
                      }}
                      className="mt-1"
                    >
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                    </Select>
                  </div>
                  {atestadoTipoAfastamento === 'dias' && (
                    <div>
                      <Label>Dias de Afastamento</Label>
                      <Input
                        type="number"
                        min="0"
                        value={atestadoDias || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined;
                          setAtestadoDias(value);
                        }}
                        placeholder="Ex: 3"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Horário de atendimento (apenas para horas) */}
                {atestadoTipoAfastamento === 'horas' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Horário de Início</Label>
                      <Input
                        type="time"
                        value={atestadoHoraInicio}
                        onChange={(e) => setAtestadoHoraInicio(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Horário de Fim</Label>
                      <Input
                        type="time"
                        value={atestadoHoraFim}
                        onChange={(e) => setAtestadoHoraFim(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Campo CID com autocomplete */}
                <div className="relative">
                  <Label>CID (Código Internacional de Doenças) - Categoria K</Label>
                  <Input
                    value={cidSearchTerm || atestadoCid}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCidSearchTerm(value);
                      setShowCidSuggestions(true); // Sempre mostrar quando há digitação
                      setSelectedCidIndex(-1);
                      // Se o valor digitado corresponde a um CID completo selecionado, limpar
                      if (!value.includes(' - ')) {
                        setAtestadoCid('');
                      }
                    }}
                    onFocus={() => {
                      // Sempre mostrar sugestões ao focar, mesmo sem texto
                      setShowCidSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCidSuggestions(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowCidSuggestions(false);
                        setSelectedCidIndex(-1);
                        return;
                      }

                      if (!showCidSuggestions) {
                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setShowCidSuggestions(true);
                        }
                        return;
                      }
                      const filtered = getFilteredCids(cidSearchTerm || atestadoCid);
                      if (filtered.length === 0) return;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedCidIndex(prev => Math.min(prev + 1, filtered.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedCidIndex(prev => Math.max(prev - 1, -1));
                      } else if (e.key === 'Enter' && selectedCidIndex >= 0) {
                        e.preventDefault();
                        const selected = filtered[selectedCidIndex];
                        setAtestadoCid(selected.codigo);
                        setCidSearchTerm(`${selected.codigo} - ${selected.descricao}`);
                        setShowCidSuggestions(false);
                      }
                    }}
                    placeholder="Clique para ver a lista de CIDs ou digite para buscar..."
                    className="mt-1"
                  />
                  {showCidSuggestions && getFilteredCids(cidSearchTerm || atestadoCid).length > 0 && (
                    <div className="absolute z-[1003] w-full bottom-full mb-1 bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-80 overflow-auto">
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600">
                        {cidSearchTerm.trim() 
                          ? `Encontrados ${getFilteredCids(cidSearchTerm || atestadoCid).length} CIDs`
                          : `Mostrando ${Math.min(50, cids.length)} de ${cids.length} CIDs (digite para filtrar)`
                        }
                      </div>
                      {getFilteredCids(cidSearchTerm || atestadoCid).map((cid, idx) => (
                        <div
                          key={cid.codigo}
                          onClick={() => {
                            setAtestadoCid(cid.codigo);
                            setCidSearchTerm(`${cid.codigo} - ${cid.descricao}`);
                            setShowCidSuggestions(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                            idx === selectedCidIndex ? 'bg-blue-100' : ''
                          }`}
                        >
                          <div className="font-bold text-sm text-gray-900">{cid.codigo}</div>
                          <div className="text-xs text-gray-600 mt-1">{cid.descricao}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

            {/* Footer */}
            <div className={cn(
              'flex items-center justify-end gap-3 p-6 border-t flex-shrink-0',
              hasGradient
                ? isCustom && gradientColors
                  ? 'bg-white/50 border-white/30'
                  : 'bg-white/60 border-white/30'
                : 'bg-gray-50 border-gray-200'
            )}>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-semibold transition-all',
                  hasGradient
                    ? 'border-white/50 hover:border-white/70 text-slate-700 hover:bg-white/80'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all',
                  hasGradient
                    ? isCustom && gradientColors
                      ? ''
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-green-600 hover:bg-green-700'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar e Gerar PDF
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

