'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useServices, useCompanySettings, useCompany } from '@/hooks/useFirestore';
import { Service } from '@/types';
import { Plus, Package, Edit, Trash2, Clock, DollarSign, Percent, UserCheck, BarChart3, Gift, Tablet, Wand2, Upload, Check, X, Search, FileUp, Table, Power, PowerOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { addDoc, collection, Timestamp, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ProcedimentoOdontologico {
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  selected: boolean;
}

export default function ServicesPage() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const { services, loading, error, createService, updateService, toggleServiceActive } = useServices(companyId);
  const { settings: companySettings, loading: companySettingsLoading } = useCompanySettings(companyId);
  const { company, loading: companyLoading } = useCompany(companyId);
  const showCommission = companySettings?.showCommission ?? true;
  const defaultCommissionPercent = companySettings?.comissaoPadrao ?? 30;
  const isDentista = company?.tipoEstabelecimento === 'dentista';
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [procedimentos, setProcedimentos] = useState<ProcedimentoOdontologico[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportTemplateModalOpen, setIsImportTemplateModalOpen] = useState(false);
  const [templateImportLoading, setTemplateImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'cards'>('list');
  const [formData, setFormData] = useState({
    nome: '',
    duracaoMin: 60,
    precoCentavos: 5000, // R$ 50,00
    comissaoPercent: 30,
    ativo: true
  });

  useEffect(() => {
    if (!showCommission && !editingService && !isModalOpen) {
      setFormData(prev => ({ ...prev, comissaoPercent: 0 }));
    }
  }, [showCommission, editingService, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      console.error('companyId não está definido');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        comissaoPercent: showCommission ? formData.comissaoPercent : 0,
      };

      // Se for template, salvar apenas os campos editados (não criar serviço completo)
      if (editingService?.isTemplate) {
        const templateId = editingService.templateId;
        console.log('[handleSubmit] Editando template:', { templateId, payload });
        if (!templateId) {
          console.error('[handleSubmit] templateId não encontrado!', editingService);
          alert('Erro: templateId não encontrado.');
          return;
        }
        // Atualizar apenas os campos editados do template
        await updateService(editingService.id, payload);
        alert('Campos editados salvos com sucesso! O procedimento padrão foi atualizado.');
      } else if (editingService) {
        // Serviço normal da empresa, atualizar
        await updateService(editingService.id, payload);
      } else {
        // Novo serviço
        await createService({
          ...payload,
          companyId
        });
      }
      setIsModalOpen(false);
      setEditingService(null);
      setFormData({
        nome: '',
        duracaoMin: 60,
        precoCentavos: 5000,
        comissaoPercent: showCommission ? defaultCommissionPercent : 0,
        ativo: true
      });
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
    }
  };

  const handleEdit = (service: Service) => {
    // Se for template, abrir modal para criar cópia na empresa
    // Se for serviço normal, editar normalmente
    setEditingService(service);
    setFormData({
      nome: service.nome,
      duracaoMin: service.duracaoMin, // Usa a duração do template ou do serviço
      precoCentavos: service.isTemplate ? 0 : service.precoCentavos, // Templates começam com 0
      comissaoPercent: service.isTemplate ? 0 : service.comissaoPercent, // Templates começam com 0
      ativo: service.ativo
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string) => {
    console.log('[handleToggleActive] Iniciando...', { id, servicesCount: services.length });
    
    const service = services.find(s => s.id === id);
    console.log('[handleToggleActive] Serviço encontrado:', service);
    
    if (!service) {
      console.error('[handleToggleActive] Serviço não encontrado na lista');
      alert('Serviço não encontrado.');
      return;
    }
    
    const isActive = service.ativo ?? true;
    const action = isActive ? 'desativar' : 'ativar';
    const message = `Tem certeza que deseja ${action} este ${service.isTemplate ? 'procedimento padrão' : 'serviço'}?`;
    
    console.log('[handleToggleActive] Status atual:', isActive, 'Ação:', action);
    
    if (confirm(message)) {
      console.log('[handleToggleActive] Usuário confirmou, chamando toggleServiceActive...');
      try {
        await toggleServiceActive(id);
        console.log('[handleToggleActive] toggleServiceActive concluído com sucesso');
        // O onSnapshot deve atualizar automaticamente
        console.log('[handleToggleActive] Aguardando atualização do onSnapshot...');
      } catch (error: any) {
        console.error('[handleToggleActive] Erro capturado:', error);
        console.error('[handleToggleActive] Stack:', error?.stack);
        alert(`Erro ao processar a ação: ${error?.message || 'Erro desconhecido'}. Tente novamente.`);
      }
    } else {
      console.log('[handleToggleActive] Usuário cancelou');
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const { companyCommissionValue, professionalValue } = useMemo(() => {
    const preco = Number.isFinite(formData.precoCentavos) ? formData.precoCentavos : 0;

    if (!showCommission) {
      return {
        companyCommissionValue: 0,
        professionalValue: preco,
      };
    }

    const commissionPercent = Number.isFinite(formData.comissaoPercent) ? formData.comissaoPercent : 0;
    const companyValue = Math.max(0, Math.round((preco * commissionPercent) / 100));
    const profValue = Math.max(0, preco - companyValue);
    return {
      companyCommissionValue: companyValue,
      professionalValue: profValue,
    };
  }, [formData.comissaoPercent, formData.precoCentavos, showCommission]);

  const loadProcedimentosFromTemplate = async () => {
    try {
      setImportLoading(true);
      // Buscar templates de procedimentos odontológicos do Firestore
      const templatesQuery = query(
        collection(db, 'dental_procedures_templates'),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(templatesQuery);
      
      const procedimentosList: ProcedimentoOdontologico[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          nome: data.nome || '',
          duracaoMin: data.duracaoMin || 60,
          precoCentavos: data.precoCentavos || 0,
          selected: true,
        };
      }).filter(p => p.nome); // Remover linhas vazias

      if (procedimentosList.length === 0) {
        alert('Nenhum procedimento encontrado no template. Entre em contato com o suporte.');
        return;
      }

      setProcedimentos(procedimentosList);
      setIsImportModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      alert('Erro ao carregar o template de procedimentos. Tente novamente.');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleProcedimento = (index: number) => {
    setProcedimentos(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const toggleAllProcedimentos = () => {
    const allSelected = procedimentos.every(p => p.selected);
    setProcedimentos(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const filteredProcedimentos = procedimentos.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImportProcedimentos = async () => {
    if (!companyId) return;

    const selectedProcedimentos = procedimentos.filter(p => p.selected);
    if (selectedProcedimentos.length === 0) {
      alert('Selecione pelo menos um procedimento para importar.');
      return;
    }

    try {
      setImportLoading(true);
      for (const proc of selectedProcedimentos) {
        await createService({
          nome: proc.nome,
          duracaoMin: proc.duracaoMin || 0, // Usa a duração do template ou 0
          precoCentavos: 0, // Zerado - usuário deve definir
          comissaoPercent: 0, // Zerado - usuário deve definir
          ativo: true,
          companyId,
        });
      }
      alert(`${selectedProcedimentos.length} procedimento(s) importado(s) com sucesso! Os valores de preço e comissão foram zerados.`);
      setIsImportModalOpen(false);
      setProcedimentos([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Erro ao importar procedimentos:', error);
      alert('Erro ao importar procedimentos. Tente novamente.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setTemplateImportLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        // A planilha tem apenas a coluna "Nome"
        const nome = row['Nome'] || row['nome'] || '';

        if (!nome || nome.trim() === '') {
          skipped++;
          continue;
        }

        const procedimento = {
          nome: String(nome).trim(),
          duracaoMin: 60, // Valor padrão
          precoCentavos: 0, // Valor padrão (pode ser ajustado depois)
          ativo: true,
          createdAt: Timestamp.now(),
        };

        try {
          await addDoc(collection(db, 'dental_procedures_templates'), procedimento);
          imported++;
        } catch (error) {
          console.error(`Erro ao importar ${procedimento.nome}:`, error);
          skipped++;
        }
      }

      alert(`✅ Importação concluída!\n   Importados: ${imported}\n   Ignorados: ${skipped}`);
      setIsImportTemplateModalOpen(false);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
    } finally {
      setTemplateImportLoading(false);
      // Resetar o input
      event.target.value = '';
    }
  };

  // Filtrar serviços pelo termo de busca (mantém todos, ativos e inativos)
  const filteredServices = useMemo(() => {
    console.log('[ServicesPage] Total de serviços recebidos:', services.length);
    console.log('[ServicesPage] Serviços ativos:', services.filter(s => s.ativo).length);
    console.log('[ServicesPage] Serviços inativos:', services.filter(s => !s.ativo).length);
    
    if (!searchTerm.trim()) {
      console.log('[ServicesPage] Sem busca, retornando todos os serviços:', services.length);
      return services;
    }
    const filtered = services.filter(service =>
      service.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('[ServicesPage] Após busca, serviços encontrados:', filtered.length);
    return filtered;
  }, [services, searchTerm]);

  if (loading || companySettingsLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AccessGuard 
      allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}
    >
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
                  <Package className="w-6 h-6 text-white" />
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
                    Serviços
                  </h1>
                  <p className={cn('text-sm mt-0.5', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                    Gerencie serviços e preços
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex gap-3"
              >
                {/* Botão temporário para importar template da planilha 
                <Button
                  onClick={() => setIsImportTemplateModalOpen(true)}
                  disabled={templateImportLoading}
                  className={cn(
                    'text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? 'hover:opacity-90'
                        : isVibrant
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                        : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                      : isNeutral
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {templateImportLoading ? 'Importando...' : 'Importar Template (TEMP)'}
                </Button>
                */}
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setFormData({
                      nome: '',
                      duracaoMin: 60,
                      precoCentavos: 5000,
                      comissaoPercent: showCommission ? defaultCommissionPercent : 0,
                      ativo: true
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
                  Novo Serviço
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 gap-4',
              showCommission ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className={cn(
                  'rounded-xl p-6 shadow-xl transition-all',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-blue-600')}>Total de Serviços</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{services.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6" />
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
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-emerald-600')}>Serviços Ativos</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>
                      {services.filter(s => s.ativo).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6" />
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
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white'
                      : isVibrant
                      ? 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-white'
                      : 'app-card text-slate-900'
                    : isNeutral
                    ? 'app-card text-slate-900'
                    : 'app-card text-slate-900'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-purple-600')}>Preço Médio</p>
                    <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>
                      {services.length > 0 
                        ? formatCurrency(Math.round(services.reduce((acc, s) => acc + s.precoCentavos, 0) / services.length))
                        : 'R$ 0,00'
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>

            {showCommission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div
                  className={cn(
                    'rounded-xl p-6 shadow-xl transition-all',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'text-white'
                        : isVibrant
                        ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white'
                        : 'app-card text-slate-900'
                      : isNeutral
                      ? 'app-card text-slate-900'
                      : 'app-card text-slate-900'
                  )}
                  style={
                    isCustom && gradientColors
                      ? {
                          background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-orange-600')}>Comissão Média</p>
                      <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>
                        {services.length > 0 
                          ? `${Math.round(services.reduce((acc, s) => acc + s.comissaoPercent, 0) / services.length)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Percent className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Tabs and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Tabs */}
            <div className={cn(
              'flex gap-2 p-1 rounded-xl',
              hasGradient 
                ? 'bg-white/50 border border-white/25 backdrop-blur' 
                : 'bg-slate-100 border border-slate-200'
            )}>
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                  activeTab === 'list'
                    ? hasGradient
                      ? 'bg-white/80 text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : hasGradient
                    ? 'text-slate-600 hover:bg-white/30'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Table className={cn('w-4 h-4', activeTab === 'list' ? (hasGradient ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-500')} />
                Lista ({services.length})
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'cards'
                    ? hasGradient
                      ? 'bg-white/80 text-slate-900 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : hasGradient
                    ? 'text-slate-600 hover:bg-white/30'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                Cards ({services.length})
              </button>
            </div>

            {/* Search */}
            <Card
              className={cn(
                'rounded-xl shadow-xl',
                hasGradient ? 'bg-white/75 border border-white/25 backdrop-blur-xl' : 'bg-white/80 border-0'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Search className={cn('w-5 h-5', hasGradient ? 'text-slate-500' : 'text-gray-400')} />
                  <Input
                    placeholder="Buscar serviços por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      'flex-1 border-0 focus:ring-0 text-base',
                      hasGradient ? 'bg-transparent text-slate-800' : ''
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Services Grid or Table */}
          {activeTab === 'list' ? (
            <TooltipProvider>
              <div
                className={cn(
                  'rounded-xl border overflow-hidden',
                  hasGradient 
                    ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl' 
                    : 'bg-white border-slate-200 shadow-lg'
                )}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr className={cn(
                      'border-b',
                      hasGradient ? 'bg-white/50 border-white/25' : 'bg-slate-50 border-slate-200'
                    )}>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider w-[200px] max-w-[200px]',
                        hasGradient ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Nome
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        hasGradient ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Status
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        hasGradient ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Duração
                      </th>
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        hasGradient ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Preço
                      </th>
                      {showCommission && (
                        <>
                          <th className={cn(
                            'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                            hasGradient ? 'text-slate-700' : 'text-slate-600'
                          )}>
                            Comissão
                          </th>
                          <th className={cn(
                            'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                            hasGradient ? 'text-slate-700' : 'text-slate-600'
                          )}>
                            Valor Comissão
                          </th>
                        </>
                      )}
                      <th className={cn(
                        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider',
                        hasGradient ? 'text-slate-700' : 'text-slate-600'
                      )}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn(
                    hasGradient ? 'bg-white/30' : 'bg-white divide-y divide-slate-200'
                  )}>
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={showCommission ? 7 : 5} className="px-6 py-12 text-center">
                          <div className={cn(
                            hasGradient ? 'text-slate-500' : 'text-gray-500'
                          )}>
                            {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((service) => (
                        <tr
                          key={service.id}
                          className={cn(
                            'transition-colors',
                            hasGradient
                              ? 'hover:bg-white/50 border-b border-white/25'
                              : 'hover:bg-slate-50 border-b border-slate-200'
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm shadow-md flex-shrink-0',
                                  hasGradient
                                    ? isCustom && gradientColors
                                      ? ''
                                      : isVibrant
                                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                                      : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                    : isNeutral
                                    ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                )}
                                style={isCustom && gradientColors ? {
                                  background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                } : undefined}
                              >
                                <Package className="w-5 h-5" />
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    'text-sm font-semibold truncate max-w-[200px] cursor-default',
                                    hasGradient ? 'text-slate-900' : 'text-gray-900'
                                  )}>
                                    {service.nome}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{service.nome}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              service.ativo 
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
                                : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                            }`}>
                              {service.ativo ? '✓ Ativo' : '✗ Inativo'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={cn(
                              'text-sm flex items-center gap-2',
                              hasGradient ? 'text-slate-700' : 'text-gray-700'
                            )}>
                              <Clock className="w-4 h-4 text-blue-500" />
                              {formatDuration(service.duracaoMin)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={cn(
                              'text-sm flex items-center gap-2',
                              hasGradient ? 'text-slate-700' : 'text-gray-700'
                            )}>
                              <DollarSign className="w-4 h-4 text-green-500" />
                              {formatCurrency(service.precoCentavos)}
                            </div>
                          </td>
                          {showCommission && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm flex items-center gap-2',
                                  hasGradient ? 'text-slate-700' : 'text-gray-700'
                                )}>
                                  <Percent className="w-4 h-4 text-purple-500" />
                                  {service.comissaoPercent}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={cn(
                                  'text-sm font-semibold',
                                  hasGradient ? 'text-green-600' : 'text-green-600'
                                )}>
                                  {formatCurrency(Math.round(service.precoCentavos * service.comissaoPercent / 100))}
                                </div>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {service.isTemplate && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                  Padrão
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(service)}
                                title={service.isTemplate ? 'Criar cópia personalizada na sua empresa' : 'Editar serviço'}
                                className={cn(
                                  hasGradient
                                    ? 'border-white/30 text-slate-700 hover:bg-white/40'
                                    : isNeutral
                                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                    : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                                )}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(service.id)}
                                className={cn(
                                  service.ativo
                                    ? hasGradient
                                      ? 'border-white/30 text-orange-600 hover:bg-white/40'
                                      : isNeutral
                                      ? 'border-slate-300 text-orange-600 hover:bg-slate-100 hover:border-slate-400'
                                      : 'hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-400'
                                    : hasGradient
                                    ? 'border-white/30 text-green-600 hover:bg-white/40'
                                    : isNeutral
                                    ? 'border-slate-300 text-green-600 hover:bg-slate-100 hover:border-slate-400'
                                    : 'hover:bg-green-50 text-green-600 border-green-200 hover:border-green-400'
                                )}
                                title={service.ativo ? 'Desativar serviço' : 'Ativar serviço'}
                              >
                                {service.ativo ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </TooltipProvider>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'col-span-full text-center py-16 rounded-2xl',
                  hasGradient ? 'bg-white/80 border border-white/20 backdrop-blur-xl' : 'bg-white/80 border border-white/20 backdrop-blur-lg'
                )}
              >
                <div
                  className={cn(
                    'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg',
                    hasGradient
                      ? isCustom && gradientStyleHorizontal
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      : isNeutral
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  )}
                  style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                >
                  <Package className="w-10 h-10 text-white" />
                </div>
                <h3 className={cn('text-xl font-bold mb-3', hasGradient ? 'text-slate-900' : 'text-gray-900')}>
                  {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
                </h3>
                <p className={cn('mb-6', hasGradient ? 'text-slate-600/80' : 'text-gray-600')}>
                  {searchTerm 
                    ? `Tente buscar com outro termo ou ${filteredServices.length === 0 ? 'adicione um novo serviço' : ''}`
                    : 'Comece adicionando o primeiro serviço ao sistema.'
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => {
                      setEditingService(null);
                      setFormData({
                        nome: '',
                        duracaoMin: 60,
                        precoCentavos: 5000,
                        comissaoPercent: showCommission ? defaultCommissionPercent : 0,
                        ativo: true
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
                    Adicionar Serviço
                  </Button>
                )}
              </motion.div>
            ) : (
              filteredServices.map((service) => (
              <div
                key={service.id}
                className={cn(
                  'rounded-2xl border-2 transition-all duration-300 overflow-hidden group',
                  hasGradient
                    ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:border-indigo-300'
                    : isNeutral
                    ? 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-slate-300'
                    : 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-blue-300'
                )}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className={cn(
                          'w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300',
                          hasGradient
                            ? isCustom && gradientColors
                              ? ''
                              : isVibrant
                              ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500'
                            : isNeutral
                            ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                            : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        )}
                        style={
                          isCustom && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        <Package className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {service.nome}
                          </h3>
                          {service.isTemplate && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                          service.ativo 
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
                            : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                        }`}>
                          {service.ativo ? '✓ Ativo' : '✗ Inativo'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                        title={service.isTemplate ? 'Criar cópia personalizada na sua empresa' : 'Editar serviço'}
                        className={cn(
                          hasGradient
                            ? 'border-white/30 text-slate-700 hover:bg-white/40'
                            : isNeutral
                            ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                            : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                        )}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(service.id)}
                        className={cn(
                          service.ativo
                            ? hasGradient
                              ? 'border-white/30 text-orange-600 hover:bg-white/40'
                              : isNeutral
                              ? 'border-slate-300 text-orange-600 hover:bg-slate-100 hover:border-slate-400'
                              : 'hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-400'
                            : hasGradient
                            ? 'border-white/30 text-green-600 hover:bg-white/40'
                            : isNeutral
                            ? 'border-slate-300 text-green-600 hover:bg-slate-100 hover:border-slate-400'
                            : 'hover:bg-green-50 text-green-600 border-green-200 hover:border-green-400'
                        )}
                        title={service.ativo ? 'Desativar serviço' : 'Ativar serviço'}
                      >
                        {service.ativo ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{formatDuration(service.duracaoMin)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{formatCurrency(service.precoCentavos)}</span>
                    </div>
                    
                    {showCommission && (
                      <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <Percent className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{service.comissaoPercent}% comissão</span>
                      </div>
                    )}
                  </div>

                  {showCommission && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Comissão:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(Math.round(service.precoCentavos * service.comissaoPercent / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Repasse:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(Math.round(service.precoCentavos * (100 - service.comissaoPercent) / 100))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
              hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'w-full max-w-md rounded-2xl border shadow-2xl',
                hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
              )}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-white',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                          : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : isNeutral
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duration-200 focus:outline-none focus:ring-2',
                        hasGradient
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                      placeholder="Ex: Corte de cabelo"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Duração (minutos)
                    </label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duracaoMin}
                      onChange={(e) => setFormData(prev => ({ ...prev, duracaoMin: parseInt(e.target.value) }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duration-200 focus:outline-none focus:ring-2',
                        hasGradient
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.precoCentavos / 100}
                      onChange={(e) => setFormData(prev => ({ ...prev, precoCentavos: Math.round(parseFloat(e.target.value) * 100) }))}
                      className={cn(
                        'w-full rounded-lg border p-3 transition-all duration-200 focus:outline-none focus:ring-2',
                        hasGradient
                          ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      )}
                      required
                    />
                  </div>

                  {showCommission && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Comissão da Empresa (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.comissaoPercent}
                        onChange={(e) => setFormData(prev => ({ ...prev, comissaoPercent: parseInt(e.target.value) }))}
                        className={cn(
                          'w-full rounded-lg border p-3 transition-all duration-200 focus:outline-none focus:ring-2',
                          hasGradient
                            ? 'border-white/30 bg-white/60 text-slate-900 focus:border-indigo-400 focus:ring-indigo-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        )}
                      />
                      <p
                        className={cn(
                          'mt-2 text-xs sm:text-sm',
                          hasGradient ? 'text-slate-600/90' : 'text-gray-500'
                        )}
                      >
                        Empresa receberá{' '}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(companyCommissionValue)}
                        </span>{' '}
                        por atendimento. Profissional ficará com{' '}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(professionalValue)}
                        </span>.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                      Serviço ativo
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingService(null);
                      }}
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
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
                      {editingService ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Importação de Procedimentos */}
        {isImportModalOpen && (
          <div
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
              hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col',
                hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-white',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                        : isNeutral
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                        : 'bg-gradient-to-br from-green-500 to-emerald-500'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Importar Procedimentos Odontológicos</h2>
                    <p className="text-sm text-gray-600">
                      {procedimentos.filter(p => p.selected).length} de {procedimentos.length} selecionados
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setProcedimentos([]);
                    setSearchQuery('');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Busca e Seleção */}
              <div className="p-4 border-b flex-shrink-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar procedimento..."
                    className="pl-10 pr-4 py-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={procedimentos.length > 0 && procedimentos.every(p => p.selected)}
                      onChange={toggleAllProcedimentos}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Selecionar todos ({filteredProcedimentos.length} procedimentos)
                    </span>
                  </label>
                </div>
              </div>

              {/* Lista de Procedimentos */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredProcedimentos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum procedimento encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProcedimentos.map((proc, index) => {
                      const originalIndex = procedimentos.findIndex(p => p.nome === proc.nome);
                      return (
                        <label
                          key={index}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer flex items-center gap-3',
                            proc.selected
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={proc.selected}
                            onChange={() => toggleProcedimento(originalIndex)}
                            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-gray-900 block truncate">{proc.nome}</span>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {proc.duracaoMin} min
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(proc.precoCentavos)}
                              </span>
                            </div>
                          </div>
                          {proc.selected && (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {procedimentos.filter(p => p.selected).length} procedimento(s) selecionado(s)
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setProcedimentos([]);
                      setSearchQuery('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImportProcedimentos}
                    disabled={importLoading || procedimentos.filter(p => p.selected).length === 0}
                    className={cn(
                      'flex-1 text-white shadow-lg',
                      hasGradient
                        ? isCustom && gradientStyleHorizontal
                          ? 'hover:opacity-90'
                          : isVibrant
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                        : isNeutral
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    )}
                    style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                  >
                    {importLoading ? 'Importando...' : 'Importar Selecionados'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal temporário para importar template da planilha */}
        {isImportTemplateModalOpen && (
          <div
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
              hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'w-full max-w-md rounded-2xl border shadow-2xl',
                hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
              )}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-white',
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-orange-500 to-red-600'
                          : 'bg-gradient-to-br from-orange-500 to-red-500'
                        : isNeutral
                        ? 'bg-gradient-to-br from-orange-500 to-red-500'
                        : 'bg-gradient-to-br from-orange-500 to-red-500'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <FileUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Importar Template da Planilha</h2>
                    <p className="text-sm text-gray-600">Selecione o arquivo Excel para importar</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arquivo Excel (lista_procedimentos.xlsx)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={templateImportLoading}
                      className="w-full rounded-lg border border-gray-300 p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>⚠️ Atenção:</strong> Este é um botão temporário para importar o template. 
                      Os dados serão salvos na collection <code>dental_procedures_templates</code> do Firestore.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsImportTemplateModalOpen(false)}
                      disabled={templateImportLoading}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AccessGuard>
  );
}
