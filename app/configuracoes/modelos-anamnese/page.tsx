'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Plus, 
  Save, 
  Trash2, 
  Edit,
  X,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Eye,
  Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Timestamp, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Tipos
type TipoResposta = 'sim_nao' | 'texto' | 'sim_nao_texto';

interface PerguntaAnamnese {
  id: string;
  pergunta: string;
  tipoResposta: TipoResposta;
  ordem: number;
  geraAlerta?: boolean; // Se true, gera alerta quando resposta for positiva
}

interface SecaoAnamnese {
  id: string;
  nome: string;
  perguntas: PerguntaAnamnese[];
  ordem: number;
}

interface ModeloAnamnese {
  id: string;
  nome: string;
  ativo: boolean;
  padrao: boolean;
  secoes: SecaoAnamnese[];
  createdAt: Date;
  updatedAt: Date;
}

const ANAMNESE_PADRAO: Omit<ModeloAnamnese, 'id' | 'createdAt' | 'updatedAt'> = {
  nome: 'Anamnese Padrão',
  ativo: false,
  padrao: true,
  secoes: [
    {
      id: 'sec-1',
      nome: 'Motivo da Consulta',
      ordem: 1,
      perguntas: [
        {
          id: 'perg-1',
          pergunta: 'Qual é o motivo da consulta?',
          tipoResposta: 'texto',
          ordem: 1,
          geraAlerta: false
        },
        {
          id: 'perg-2',
          pergunta: 'Estética',
          tipoResposta: 'sim_nao',
          ordem: 2,
          geraAlerta: false
        }
      ]
    },
    {
      id: 'sec-2',
      nome: 'Histórico Médico',
      ordem: 2,
      perguntas: [
        {
          id: 'perg-3',
          pergunta: 'Está realizando algum tratamento médico? Qual?',
          tipoResposta: 'sim_nao_texto',
          ordem: 1,
          geraAlerta: true
        },
        {
          id: 'perg-4',
          pergunta: 'Está fazendo uso de algum medicamento? Qual?',
          tipoResposta: 'sim_nao_texto',
          ordem: 2,
          geraAlerta: true
        },
        {
          id: 'perg-5',
          pergunta: 'Possui alergia a algum medicamento? Qual?',
          tipoResposta: 'sim_nao_texto',
          ordem: 3,
          geraAlerta: true
        },
        {
          id: 'perg-6',
          pergunta: 'Tem diabete?',
          tipoResposta: 'sim_nao',
          ordem: 4,
          geraAlerta: true
        },
        {
          id: 'perg-7',
          pergunta: 'Tem algum problema cardiovascular?',
          tipoResposta: 'sim_nao',
          ordem: 5,
          geraAlerta: true
        },
        {
          id: 'perg-8',
          pergunta: 'Tem algum problema de pressão arterial?',
          tipoResposta: 'sim_nao',
          ordem: 6,
          geraAlerta: true
        },
        {
          id: 'perg-9',
          pergunta: 'Tem disfunção hepática?',
          tipoResposta: 'sim_nao',
          ordem: 7,
          geraAlerta: true
        },
        {
          id: 'perg-10',
          pergunta: 'Tem disfunção renal?',
          tipoResposta: 'sim_nao',
          ordem: 8,
          geraAlerta: true
        },
        {
          id: 'perg-11',
          pergunta: 'Tem alguma doença presente na família que julgue importante comentar? Qual?',
          tipoResposta: 'sim_nao_texto',
          ordem: 9,
          geraAlerta: true
        },
        {
          id: 'perg-12',
          pergunta: 'Está grávida?',
          tipoResposta: 'sim_nao',
          ordem: 10,
          geraAlerta: true
        },
        {
          id: 'perg-13',
          pergunta: 'Sente dores de cabeça, dores na face, ouvido ou articulação frequentemente?',
          tipoResposta: 'sim_nao',
          ordem: 11,
          geraAlerta: false
        },
        {
          id: 'perg-14',
          pergunta: 'Teve algum desmaio, tem ataques nervosos, epilepsia ou convulsão?',
          tipoResposta: 'sim_nao',
          ordem: 12,
          geraAlerta: false
        },
        {
          id: 'perg-15',
          pergunta: 'Possui alguma doença não citada anteriormente que julgue importante comentar? Qual?',
          tipoResposta: 'sim_nao_texto',
          ordem: 13,
          geraAlerta: true
        }
      ]
    },
    {
      id: 'sec-3',
      nome: 'Hábitos',
      ordem: 3,
      perguntas: [
        {
          id: 'perg-16',
          pergunta: 'Você consome bebidas alcoólicas? Com que frequência?',
          tipoResposta: 'sim_nao_texto',
          ordem: 1,
          geraAlerta: false
        },
        {
          id: 'perg-18',
          pergunta: 'Fuma ou já fumou?',
          tipoResposta: 'sim_nao',
          ordem: 3,
          geraAlerta: false
        },
        {
          id: 'perg-19',
          pergunta: 'Costuma consumir alimentos ricos em açúcar com frequência? Qual a frequência?',
          tipoResposta: 'sim_nao_texto',
          ordem: 4,
          geraAlerta: false
        }
      ]
    },
    {
      id: 'sec-4',
      nome: 'Histórico Odontológico',
      ordem: 4,
      perguntas: [
        {
          id: 'perg-21',
          pergunta: 'Quando foi a ultima vez que passou por tratamento odontológico?',
          tipoResposta: 'texto',
          ordem: 1,
          geraAlerta: false
        },
        {
          id: 'perg-22',
          pergunta: 'Utiliza alguma prótese dentária? (prótese fixa, prótese removível, aparelho ortodôntico, etc.)',
          tipoResposta: 'sim_nao',
          ordem: 2,
          geraAlerta: false
        },
        {
          id: 'perg-23',
          pergunta: 'Sente sensibilidade nos dentes?',
          tipoResposta: 'sim_nao',
          ordem: 3,
          geraAlerta: false
        },
        {
          id: 'perg-24',
          pergunta: 'Range os dentes ou tem apertamento?',
          tipoResposta: 'sim_nao',
          ordem: 4,
          geraAlerta: false
        },
        {
          id: 'perg-25',
          pergunta: 'Sua gengiva sangra com frequência?',
          tipoResposta: 'sim_nao',
          ordem: 5,
          geraAlerta: false
        }
      ]
    },
    {
      id: 'sec-5',
      nome: 'Observações',
      ordem: 5,
      perguntas: [
        {
          id: 'perg-26',
          pergunta: 'Alguma observação que julgue importante comentar',
          tipoResposta: 'texto',
          ordem: 1,
          geraAlerta: false
        }
      ]
    }
  ]
};

export default function ModelosAnamnesePage() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const [modelos, setModelos] = useState<ModeloAnamnese[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModelo, setEditingModelo] = useState<ModeloAnamnese | null>(null);
  const [viewingModelo, setViewingModelo] = useState<ModeloAnamnese | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [novoNomeModelo, setNovoNomeModelo] = useState('');
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;

  // Carregar modelos
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `companies/${companyId}/anamneseModelos`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date(),
            secoes: (docData.secoes || []).map((sec: any) => ({
              ...sec,
              perguntas: (sec.perguntas || []).map((p: any) => ({
                ...p
              }))
            }))
          } as ModeloAnamnese;
        });
        
        // Se não houver modelos, criar o padrão
        if (data.length === 0) {
          criarAnamnesePadrao();
        } else {
          setModelos(data);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar modelos:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const criarAnamnesePadrao = async () => {
    if (!companyId) return;
    
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, `companies/${companyId}/anamneseModelos`), {
        ...ANAMNESE_PADRAO,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Erro ao criar anamnese padrão:', error);
    }
  };

  const toggleAtivo = async (modelo: ModeloAnamnese) => {
    if (!companyId) return;
    
    try {
      await updateDoc(doc(db, `companies/${companyId}/anamneseModelos`, modelo.id), {
        ativo: !modelo.ativo,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao atualizar modelo:', error);
    }
  };

  const criarNovoModelo = async () => {
    if (!companyId || !novoNomeModelo.trim()) return;
    
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, `companies/${companyId}/anamneseModelos`), {
        nome: novoNomeModelo.trim(),
        ativo: false,
        padrao: false,
        secoes: [],
        createdAt: now,
        updatedAt: now
      });
      setNovoNomeModelo('');
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar modelo:', error);
    }
  };

  const salvarModelo = async () => {
    if (!companyId || !editingModelo) return;
    
    try {
      await updateDoc(doc(db, `companies/${companyId}/anamneseModelos`, editingModelo.id), {
        nome: editingModelo.nome,
        secoes: editingModelo.secoes,
        updatedAt: Timestamp.now()
      });
      setEditingModelo(null);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
    }
  };

  const deletarModelo = async (modeloId: string) => {
    if (!companyId) return;
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    
    try {
      await deleteDoc(doc(db, `companies/${companyId}/anamneseModelos`, modeloId));
    } catch (error) {
      console.error('Erro ao deletar modelo:', error);
    }
  };

  const copiarModelo = async (modelo: ModeloAnamnese) => {
    if (!companyId) return;
    
    try {
      const now = Timestamp.now();
      const novoNome = `${modelo.nome} (Cópia)`;
      
      await addDoc(collection(db, `companies/${companyId}/anamneseModelos`), {
        nome: novoNome,
        ativo: false,
        padrao: false,
        secoes: modelo.secoes.map(secao => ({
          ...secao,
          perguntas: secao.perguntas.map(pergunta => ({ ...pergunta }))
        })),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Erro ao copiar modelo:', error);
    }
  };

  const adicionarSecao = () => {
    if (!editingModelo) return;
    
    const novaSecao: SecaoAnamnese = {
      id: `sec-${Date.now()}`,
      nome: 'Nova Seção',
      perguntas: [],
      ordem: editingModelo.secoes.length + 1
    };
    
    setEditingModelo({
      ...editingModelo,
      secoes: [...editingModelo.secoes, novaSecao]
    });
  };

  const atualizarSecao = (secaoId: string, updates: Partial<SecaoAnamnese>) => {
    if (!editingModelo) return;
    
    setEditingModelo({
      ...editingModelo,
      secoes: editingModelo.secoes.map(sec =>
        sec.id === secaoId ? { ...sec, ...updates } : sec
      )
    });
  };

  const deletarSecao = (secaoId: string) => {
    if (!editingModelo) return;
    
    setEditingModelo({
      ...editingModelo,
      secoes: editingModelo.secoes.filter(sec => sec.id !== secaoId)
    });
  };

  const adicionarPergunta = (secaoId: string) => {
    if (!editingModelo) return;
    
    const secao = editingModelo.secoes.find(s => s.id === secaoId);
    if (!secao) return;
    
    const novaPergunta: PerguntaAnamnese = {
      id: `perg-${Date.now()}`,
      pergunta: 'Nova pergunta',
      tipoResposta: 'sim_nao',
      ordem: secao.perguntas.length + 1,
      geraAlerta: false
    };
    
    setEditingModelo({
      ...editingModelo,
      secoes: editingModelo.secoes.map(sec =>
        sec.id === secaoId
          ? { ...sec, perguntas: [...sec.perguntas, novaPergunta] }
          : sec
      )
    });
  };

  const atualizarPergunta = (secaoId: string, perguntaId: string, updates: Partial<PerguntaAnamnese>) => {
    if (!editingModelo) return;
    
    setEditingModelo({
      ...editingModelo,
      secoes: editingModelo.secoes.map(sec =>
        sec.id === secaoId
          ? {
              ...sec,
              perguntas: sec.perguntas.map(p =>
                p.id === perguntaId ? { ...p, ...updates } : p
              )
            }
          : sec
      )
    });
  };

  const deletarPergunta = (secaoId: string, perguntaId: string) => {
    if (!editingModelo) return;
    
    setEditingModelo({
      ...editingModelo,
      secoes: editingModelo.secoes.map(sec =>
        sec.id === secaoId
          ? { ...sec, perguntas: sec.perguntas.filter(p => p.id !== perguntaId) }
          : sec
      )
    });
  };

  if (loading) {
    return (
      <AccessGuard allowed={['owner', 'admin']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando modelos...</p>
          </div>
        </div>
      </AccessGuard>
    );
  }

  return (
    <AccessGuard allowed={['owner', 'admin']}>
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
                  <FileText className="w-6 h-6 text-white" />
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
                    Modelos de Anamnese
                  </h1>
                  <p className={cn('text-sm mt-0.5', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                    Gerencie os modelos de anamnese que serão utilizados no atendimento dos pacientes
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Lista de Modelos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {modelos.map((modelo) => (
              <Card key={modelo.id} className={cn(
                'transition-all duration-200 rounded-2xl border-2 overflow-hidden group',
                hasGradient
                  ? modelo.ativo
                    ? 'bg-white/80 border-white/30 backdrop-blur-xl shadow-xl ring-2 ring-indigo-300'
                    : 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:border-indigo-300'
                  : isNeutral
                  ? modelo.ativo
                    ? 'bg-white/90 border-slate-300 shadow-lg ring-2 ring-slate-400'
                    : 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-slate-300'
                  : modelo.ativo
                  ? 'bg-white/90 border-blue-300 shadow-lg ring-2 ring-blue-500'
                  : 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-blue-300'
              )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {modelo.nome}
                      {modelo.padrao && (
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {modelo.secoes.length} {modelo.secoes.length === 1 ? 'seção' : 'seções'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAtivo(modelo)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        modelo.ativo
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      {modelo.ativo ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {!modelo.padrao ? (
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full',
                        hasGradient
                          ? 'border-white/30 text-slate-700 hover:bg-white/40'
                          : isNeutral
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                          : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                      )}
                      onClick={() => setEditingModelo(modelo)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full',
                        hasGradient
                          ? 'border-white/30 text-slate-700 hover:bg-white/40'
                          : isNeutral
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                          : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                      )}
                      onClick={() => copiarModelo(modelo)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Modelo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full',
                      hasGradient
                        ? 'border-white/30 text-slate-700 hover:bg-white/40'
                        : isNeutral
                        ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                        : 'hover:bg-blue-50 border-blue-200 hover:border-blue-400'
                    )}
                    onClick={() => setViewingModelo(modelo)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Anamnese
                  </Button>
                  {!modelo.padrao && (
                    <Button
                      variant="destructive"
                      className={cn(
                        'w-full',
                        hasGradient
                          ? 'border-white/30 text-rose-600 hover:bg-white/40'
                          : isNeutral
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                          : 'hover:bg-red-50 text-red-600 border-red-200 hover:border-red-400'
                      )}
                      onClick={() => deletarModelo(modelo.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

            {/* Card para criar novo modelo */}
            {!isCreating ? (
              <Card className={cn(
                'border-2 border-dashed transition-colors cursor-pointer rounded-2xl',
                hasGradient
                  ? 'border-white/30 hover:border-indigo-400 bg-white/50 backdrop-blur'
                  : isNeutral
                  ? 'border-slate-300 hover:border-slate-400 bg-white/50'
                  : 'border-gray-300 hover:border-blue-400 bg-white/50'
              )}>
                <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                  <Button
                    variant="ghost"
                    className="flex flex-col items-center gap-2 h-auto py-8"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className={cn('w-8 h-8', hasGradient ? 'text-slate-400' : 'text-gray-400')} />
                    <span className={cn('font-medium', hasGradient ? 'text-slate-600' : 'text-gray-600')}>Criar Novo Modelo</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className={cn(
                'rounded-2xl border-2',
                hasGradient
                  ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl'
                  : isNeutral
                  ? 'bg-white/90 border-gray-100 shadow-lg'
                  : 'bg-white/90 border-gray-100 shadow-lg'
              )}>
                <CardHeader>
                  <CardTitle>Novo Modelo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome do Modelo</Label>
                    <Input
                      value={novoNomeModelo}
                      onChange={(e) => setNovoNomeModelo(e.target.value)}
                      placeholder="Ex: Anamnese Clínica Geral"
                      autoFocus
                      className={cn(
                        hasGradient
                          ? 'border-white/30 bg-white/70 focus-visible:border-indigo-400 focus-visible:ring-indigo-200'
                          : 'border-gray-300 focus-visible:border-slate-900 focus-visible:ring-slate-900'
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={criarNovoModelo}
                      disabled={!novoNomeModelo.trim()}
                      className={cn(
                        'flex-1 text-white',
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
                      <Save className="w-4 h-4 mr-2" />
                      Criar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setNovoNomeModelo('');
                      }}
                      className={cn(
                        hasGradient
                          ? 'border-white/30 text-slate-700 hover:bg-white/40'
                          : isNeutral
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                          : 'border-gray-300 hover:bg-gray-100'
                      )}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

        {/* Modal de Edição */}
        <AnimatePresence>
          {editingModelo && !editingModelo.padrao && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4',
                hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
              )}
              onClick={() => setEditingModelo(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
                  hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
                )}
              >
                <div className={cn(
                  'p-6 border-b',
                  hasGradient
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-white/25'
                    : isNeutral
                    ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Editar Modelo</h2>
                      <p className="text-sm text-gray-600 mt-1">{editingModelo.nome}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingModelo(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Nome do Modelo */}
                  <div>
                    <Label>Nome do Modelo</Label>
                    <Input
                      value={editingModelo.nome}
                      onChange={(e) =>
                        setEditingModelo({ ...editingModelo, nome: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Seções */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Seções</h3>
                      <Button onClick={adicionarSecao} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Seção
                      </Button>
                    </div>

                    {editingModelo.secoes.map((secao, secaoIndex) => (
                      <Card key={secao.id} className="border-2">
                        <CardHeader className="bg-gray-50">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                            <Input
                              value={secao.nome}
                              onChange={(e) =>
                                atualizarSecao(secao.id, { nome: e.target.value })
                              }
                              className="flex-1 font-semibold"
                              placeholder="Nome da seção"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletarSecao(secao.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Perguntas</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adicionarPergunta(secao.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Pergunta
                            </Button>
                          </div>

                          {secao.perguntas.map((pergunta, perguntaIndex) => (
                            <div
                              key={pergunta.id}
                              className="p-4 border rounded-lg bg-gray-50 space-y-3"
                            >
                              <div className="flex items-start gap-3">
                                <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <Label className="text-sm">Pergunta</Label>
                                    <Textarea
                                      value={pergunta.pergunta}
                                      onChange={(e) =>
                                        atualizarPergunta(secao.id, pergunta.id, {
                                          pergunta: e.target.value
                                        })
                                      }
                                      placeholder="Digite a pergunta..."
                                      className="mt-1"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-sm">Tipo de Resposta</Label>
                                      <Select
                                        value={pergunta.tipoResposta}
                                        onValueChange={(value) =>
                                          atualizarPergunta(secao.id, pergunta.id, {
                                            tipoResposta: value as TipoResposta
                                          })
                                        }
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="sim_nao">Sim/Não</SelectItem>
                                          <SelectItem value="texto">Somente Texto</SelectItem>
                                          <SelectItem value="sim_nao_texto">Sim/Não com Texto</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {(pergunta.tipoResposta === 'sim_nao' || pergunta.tipoResposta === 'sim_nao_texto') && (
                                      <div className="flex items-center space-x-2 pt-8">
                                        <Switch
                                          id={`alerta-${pergunta.id}`}
                                          checked={pergunta.geraAlerta || false}
                                          onCheckedChange={(checked) =>
                                            atualizarPergunta(secao.id, pergunta.id, {
                                              geraAlerta: checked
                                            })
                                          }
                                        />
                                        <Label
                                          htmlFor={`alerta-${pergunta.id}`}
                                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                                        >
                                          <span className="text-orange-600">⚠️</span>
                                          Gera Alerta
                                        </Label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deletarPergunta(secao.id, pergunta.id)}
                                  className="mt-8"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {secao.perguntas.length === 0 && (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                              <p className="text-sm">Nenhuma pergunta adicionada ainda</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {editingModelo.secoes.length === 0 && (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>Nenhuma seção adicionada ainda</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={adicionarSecao}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Primeira Seção
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn(
                  'p-6 border-t flex justify-end gap-3',
                  hasGradient ? 'bg-gray-50 border-white/25' : 'bg-gray-50 border-gray-200'
                )}>
                  <Button
                    variant="outline"
                    onClick={() => setEditingModelo(null)}
                    className={cn(
                      hasGradient
                        ? 'border-white/30 text-slate-700 hover:bg-white/40'
                        : isNeutral
                        ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                        : 'border-gray-300 hover:bg-gray-100'
                    )}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={salvarModelo}
                    className={cn(
                      'text-white',
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
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Visualização */}
        <AnimatePresence>
          {viewingModelo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4',
                hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/50'
              )}
              onClick={() => setViewingModelo(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
                  hasGradient ? 'bg-white/80 border-white/25 backdrop-blur-2xl' : 'bg-white border-white/20'
                )}
              >
                <div className={cn(
                  'p-6 border-b',
                  hasGradient
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-white/25'
                    : isNeutral
                    ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Eye className="w-6 h-6 text-blue-600" />
                        Visualizar Anamnese
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">{viewingModelo.nome}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingModelo(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {viewingModelo.secoes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>Nenhuma seção adicionada ainda</p>
                    </div>
                  ) : (
                    viewingModelo.secoes
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((secao) => (
                        <Card key={secao.id} className="border-2">
                          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              {secao.nome}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-3">
                            {secao.perguntas.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">Nenhuma pergunta nesta seção</p>
                            ) : (
                              secao.perguntas
                                .sort((a, b) => a.ordem - b.ordem)
                                .map((pergunta, index) => (
                                  <div
                                    key={pergunta.id}
                                    className="p-4 border rounded-lg bg-gray-50 space-y-2"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 space-y-2">
                                        <p className="font-medium text-gray-900">
                                          {pergunta.pergunta}
                                        </p>
                                        <div className="flex items-center gap-3 flex-wrap">
                                          <Badge variant="outline" className="text-xs">
                                            {pergunta.tipoResposta === 'sim_nao'
                                              ? 'Sim/Não'
                                              : pergunta.tipoResposta === 'texto'
                                              ? 'Somente Texto'
                                              : 'Sim/Não com Texto'}
                                          </Badge>
                                          {pergunta.geraAlerta && (
                                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                              <span className="mr-1">⚠️</span>
                                              Gera Alerta
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                            )}
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>

                <div className={cn(
                  'p-6 border-t flex justify-end',
                  hasGradient ? 'bg-gray-50 border-white/25' : 'bg-gray-50 border-gray-200'
                )}>
                  <Button
                    variant="outline"
                    onClick={() => setViewingModelo(null)}
                    className={cn(
                      hasGradient
                        ? 'border-white/30 text-slate-700 hover:bg-white/40'
                        : isNeutral
                        ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                        : 'border-gray-300 hover:bg-gray-100'
                    )}
                  >
                    Fechar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </AccessGuard>
  );
}

