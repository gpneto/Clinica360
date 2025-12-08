'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit,
  Save,
  X,
  Settings,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Palette
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { cn, generateGradientColors, generateGradientColorsWithTwoColors, applyCustomColor } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';

type ThemeOption = 'neutral' | 'vibrant' | 'custom';

interface UserProfile {
  nome: string;
  telefoneE164: string;
  email: string;
  role: string;
  professionalId?: string;
  ativo: boolean;
  themePreference: ThemeOption;
  customColor?: string;
  customColor2?: string;
}

const THEME_OPTIONS: { id: ThemeOption; title: string; description: string }[] = [
  {
    id: 'neutral',
    title: 'Tema neutro',
    description: 'Paleta suave com foco em legibilidade e contraste equilibrado.'
  },
  {
    id: 'vibrant',
    title: 'Tema vibrante',
    description: 'Gradientes modernos e cores vivas para uma experiência mais dinâmica.'
  },
  {
    id: 'custom',
    title: 'Cor personalizada',
    description: 'Escolha sua cor favorita e personalize a interface com gradientes modernos.'
  }
];

// Cores pré-definidas para seleção rápida
const PRESET_COLORS = [
  { name: 'Azul', value: '#3b82f6', gradient: ['#3b82f6', '#2563eb', '#1d4ed8'] },
  { name: 'Roxo', value: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
  { name: 'Rosa', value: '#ec4899', gradient: ['#ec4899', '#db2777', '#be185d'] },
  { name: 'Verde', value: '#10b981', gradient: ['#10b981', '#059669', '#047857'] },
  { name: 'Laranja', value: '#f59e0b', gradient: ['#f59e0b', '#d97706', '#b45309'] },
  { name: 'Vermelho', value: '#ef4444', gradient: ['#ef4444', '#dc2626', '#b91c1c'] },
  { name: 'Ciano', value: '#06b6d4', gradient: ['#06b6d4', '#0891b2', '#0e7490'] },
  { name: 'Dourado', value: '#b29146', gradient: ['#b29146', '#b28724', '#99731a'] },
];

export default function ProfilePage() {
  const { user, role, professionalId, companyId, userData, themePreference, customColor, setThemePreference } = useAuth();
  const customerLabels = useCustomerLabels();
  const pluralTitle = customerLabels.pluralTitle;
  const [profile, setProfile] = useState<UserProfile>({
    nome: '',
    telefoneE164: '',
    email: '',
    role: '',
    professionalId: undefined,
    ativo: true,
    themePreference: themePreference ?? 'neutral',
    customColor: customColor || undefined,
    customColor2: undefined,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(themePreference ?? 'neutral');
  const DOURADO_COLOR = PRESET_COLORS[7].value; // Última cor (Dourado)
  const [selectedColor, setSelectedColor] = useState<string>(customColor || DOURADO_COLOR);
  const [selectedColor2, setSelectedColor2] = useState<string>(DOURADO_COLOR); // Cor padrão dourada
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    setSelectedTheme(themePreference ?? 'neutral');
    if (themePreference === 'custom' && customColor) {
      setSelectedColor(customColor);
      // Carregar segunda cor se existir no perfil
      if (profile.customColor2) {
        setSelectedColor2(profile.customColor2);
      }
    }
  }, [themePreference, customColor, profile.customColor2]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, role, companyId]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      let resolvedTheme: ThemeOption = themePreference ?? 'neutral';
      let resolvedColor: string | undefined = customColor || undefined;
      let resolvedColor2: string | undefined = undefined;
      let profileData: UserProfile = {
        nome: user.displayName || '',
        telefoneE164: '',
        email: user.email || '',
        role: role || '',
        professionalId: professionalId || undefined,
        ativo: true,
        themePreference: resolvedTheme,
        customColor: resolvedColor,
        customColor2: resolvedColor2,
      };

      if (userData) {
        resolvedTheme = (userData.themePreference as ThemeOption) || resolvedTheme;
        resolvedColor = (userData as any).customColor || resolvedColor;
        resolvedColor2 = (userData as any).customColor2 || resolvedColor2;
        profileData = {
          nome: userData.nome || user.displayName || '',
          telefoneE164: '',
          email: userData.email || user.email || '',
          role: userData.role || role || '',
          professionalId: userData.professionalId || professionalId || undefined,
          ativo: userData.ativo !== false,
          themePreference: resolvedTheme,
          customColor: resolvedColor,
          customColor2: resolvedColor2,
        };
      } else if (companyId) {
        const usersQuery = query(
          collection(db, `companies/${companyId}/users`),
          where('email', '==', user.email)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
          // Se houver múltiplos documentos, filtrar pelo professionalId e role
          let userDocToUse = usersSnapshot.docs[0];
          if (usersSnapshot.docs.length > 1) {
            const matchingDoc = usersSnapshot.docs.find(docSnapshot => {
              const data = docSnapshot.data();
              const roleMatches = data.role === role;
              const professionalMatches = professionalId
                ? data.professionalId === professionalId
                : !data.professionalId;
              return roleMatches && professionalMatches;
            });
            if (matchingDoc) {
              userDocToUse = matchingDoc;
            }
          }
          
          const userDocData = userDocToUse.data();
          resolvedTheme = (userDocData.themePreference as ThemeOption) || resolvedTheme;
          resolvedColor = userDocData.customColor || resolvedColor;
          resolvedColor2 = userDocData.customColor2 || resolvedColor2;
          profileData = {
            nome: userDocData.nome || user.displayName || '',
            telefoneE164: userDocData.telefoneE164 || '',
            email: userDocData.email || user.email || '',
            role: userDocData.role || role || '',
            professionalId: userDocData.professionalId || professionalId || undefined,
            ativo: userDocData.ativo !== false,
            themePreference: resolvedTheme,
            customColor: resolvedColor,
            customColor2: resolvedColor2,
          };
        }
      } else {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          resolvedTheme = (userDocData.themePreference as ThemeOption) || resolvedTheme;
          resolvedColor = userDocData.customColor || resolvedColor;
          resolvedColor2 = userDocData.customColor2 || resolvedColor2;
          profileData = {
            nome: userDocData.nome || user.displayName || '',
            telefoneE164: userDocData.telefoneE164 || '',
            email: userDocData.email || user.email || '',
            role: userDocData.role || role || '',
            professionalId: userDocData.professionalId || professionalId || undefined,
            ativo: userDocData.ativo !== false,
            themePreference: resolvedTheme,
            customColor: resolvedColor,
            customColor2: resolvedColor2,
          };
        }
      }

      const effectiveTheme = themePreference ?? profileData.themePreference ?? 'neutral';
      const effectiveColor = customColor || profileData.customColor || DOURADO_COLOR;
      const effectiveColor2 = profileData.customColor2 || DOURADO_COLOR;
      setProfile({ ...profileData, themePreference: effectiveTheme, customColor: effectiveColor, customColor2: effectiveColor2 });
      setSelectedTheme(effectiveTheme);
      if (effectiveTheme === 'custom') {
        setSelectedColor(effectiveColor || DOURADO_COLOR);
        setSelectedColor2(effectiveColor2 || DOURADO_COLOR);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      const fallbackTheme: ThemeOption = themePreference ?? 'neutral';
      const effectiveTheme = themePreference ?? fallbackTheme;
      setProfile({
        nome: user.displayName || '',
        telefoneE164: '',
        email: user.email || '',
        role: role || '',
        professionalId: professionalId || undefined,
        ativo: true,
        themePreference: effectiveTheme,
        customColor: customColor || undefined,
        customColor2: undefined,
      });
      setSelectedTheme(effectiveTheme);
      if (effectiveTheme === 'custom') {
        setSelectedColor(customColor || DOURADO_COLOR);
        setSelectedColor2(DOURADO_COLOR);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCompanyUserDoc = async () => {
    if (!user?.email || !companyId) return null;
    const usersQuery = query(
      collection(db, `companies/${companyId}/users`),
      where('email', '==', user.email)
    );
    const usersSnapshot = await getDocs(usersQuery);
    if (usersSnapshot.empty) return null;
    
    // Se houver múltiplos documentos, filtrar pelo professionalId e role
    if (usersSnapshot.docs.length > 1) {
      const matchingDoc = usersSnapshot.docs.find(docSnapshot => {
        const data = docSnapshot.data();
        const roleMatches = data.role === role;
        const professionalMatches = professionalId
          ? data.professionalId === professionalId
          : !data.professionalId;
        return roleMatches && professionalMatches;
      });
      return matchingDoc || usersSnapshot.docs[0];
    }
    
    return usersSnapshot.docs[0];
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updates: any = {
        nome: profile.nome,
        telefoneE164: profile.telefoneE164,
        themePreference: selectedTheme,
        updatedAt: new Date(),
      };

      if (selectedTheme === 'custom' && selectedColor) {
        updates.customColor = selectedColor;
        updates.customColor2 = selectedColor2 || null;
      } else {
        updates.customColor = null;
        updates.customColor2 = null;
      }

      // Salvar apenas no documento da empresa (não no documento root users/{uid})
      if (companyId) {
        const companyUserDoc = await getCompanyUserDoc();
        if (companyUserDoc) {
          await updateDoc(companyUserDoc.ref, updates);
        } else {
          throw new Error('Documento do usuário na empresa não encontrado');
        }
      } else {
        // Se não tiver companyId (ex: super_admin), salvar no documento root
        await setDoc(
          doc(db, 'users', user.uid),
          updates,
          { merge: true }
        );
      }

      if (selectedTheme === 'custom' && selectedColor) {
        setThemePreference('custom', selectedColor, selectedColor2);
      } else {
        setThemePreference(selectedTheme);
      }
      
      setProfile(prev => ({ 
        ...prev, 
        themePreference: selectedTheme,
        customColor: selectedTheme === 'custom' ? selectedColor : undefined,
        customColor2: selectedTheme === 'custom' ? selectedColor2 : undefined
      }));
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSelection = async (option: ThemeOption) => {
    if (!user || option === selectedTheme) return;

    setSelectedTheme(option);
    
    if (option === 'custom') {
      // Se for custom, usar a cor selecionada ou a padrão (dourada)
      const colorToUse = selectedColor || DOURADO_COLOR;
      const color2ToUse = selectedColor2 || DOURADO_COLOR;
      setSelectedColor(colorToUse);
      setSelectedColor2(color2ToUse);
      setThemePreference('custom', colorToUse, color2ToUse);
      applyCustomColor(colorToUse, color2ToUse);
    } else {
      setThemePreference(option);
    }
    
    setUpdatingTheme(true);

    try {
      const updates: any = {
        themePreference: option,
        updatedAt: new Date(),
      };

      if (option === 'custom') {
        // Sempre salvar uma cor quando o tema for custom (padrão: dourada)
        const colorToSave = selectedColor || DOURADO_COLOR;
        const color2ToSave = selectedColor2 || DOURADO_COLOR;
        updates.customColor = colorToSave;
        updates.customColor2 = color2ToSave;
      } else {
        updates.customColor = null;
        updates.customColor2 = null;
      }

      // Salvar apenas no documento da empresa (não no documento root users/{uid})
      if (companyId) {
        const companyUserDoc = await getCompanyUserDoc();
        if (companyUserDoc) {
          await updateDoc(companyUserDoc.ref, updates);
        } else {
          throw new Error('Documento do usuário na empresa não encontrado');
        }
      } else {
        // Se não tiver companyId (ex: super_admin), salvar no documento root
        await setDoc(
          doc(db, 'users', user.uid),
          updates,
          { merge: true }
        );
      }

      setProfile(prev => ({ 
        ...prev, 
        themePreference: option,
        customColor: option === 'custom' ? (selectedColor || DOURADO_COLOR) : undefined,
        customColor2: option === 'custom' ? (selectedColor2 || DOURADO_COLOR) : undefined
      }));
      toast.success('Tema atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
      toast.error('Não foi possível atualizar o tema.');
      const fallback = profile.themePreference || 'neutral';
      setSelectedTheme(fallback);
      setThemePreference(fallback);
    } finally {
      setUpdatingTheme(false);
    }
  };

  const saveColorToFirestore = async (color: string, color2?: string) => {
    if (!user || selectedTheme !== 'custom') return;

    try {
      const updates: any = {
        themePreference: 'custom',
        customColor: color,
        customColor2: color2 || selectedColor2 || null,
        updatedAt: new Date(),
      };

      if (companyId) {
        const companyUserDoc = await getCompanyUserDoc();
        if (companyUserDoc) {
          await updateDoc(companyUserDoc.ref, updates);
        }
      } else {
        await setDoc(
          doc(db, 'users', user.uid),
          updates,
          { merge: true }
        );
      }

      setProfile(prev => ({ 
        ...prev, 
        themePreference: 'custom',
        customColor: color,
        customColor2: color2 || selectedColor2
      }));
      
      // Salvar também no localStorage através do setThemePreference
      const finalColor2 = color2 || selectedColor2 || DOURADO_COLOR;
      setThemePreference('custom', color, finalColor2);
    } catch (error) {
      console.error('Erro ao salvar cor no Firestore:', error);
      toast.error('Erro ao salvar cor personalizada');
    }
  };

  const handleColorSelection = async (color: string) => {
    setSelectedColor(color);
    if (selectedTheme === 'custom') {
      const color2ToUse = selectedColor2 || DOURADO_COLOR;
      setThemePreference('custom', color, color2ToUse);
      applyCustomColor(color, color2ToUse);
      await saveColorToFirestore(color, color2ToUse);
    }
  };

  const handleColor2Selection = async (color2: string) => {
    setSelectedColor2(color2);
    if (selectedTheme === 'custom') {
      const colorToUse = selectedColor || DOURADO_COLOR;
      setThemePreference('custom', colorToUse, color2);
      applyCustomColor(colorToUse, color2);
      await saveColorToFirestore(colorToUse, color2);
    }
  };

  const handleCustomColorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setSelectedColor(color);
    if (selectedTheme === 'custom') {
      const color2ToUse = selectedColor2 || DOURADO_COLOR;
      setThemePreference('custom', color, color2ToUse);
      applyCustomColor(color, color2ToUse);
      await saveColorToFirestore(color, color2ToUse);
    }
  };

  const handleCustomColor2Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const color2 = e.target.value;
    setSelectedColor2(color2);
    if (selectedTheme === 'custom') {
      const colorToUse = selectedColor || DOURADO_COLOR;
      setThemePreference('custom', colorToUse, color2);
      applyCustomColor(colorToUse, color2);
      await saveColorToFirestore(colorToUse, color2);
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      case 'pro':
        return 'Profissional';
      case 'atendente':
        return 'Atendente';
      default:
        return roleValue;
    }
  };

  if (loading) {
    return (
      <AccessGuard allowed={['owner', 'admin', 'pro', 'atendente']}>
        <div className="app-page flex min-h-screen items-center justify-center px-4">
          <div className="app-card flex items-center gap-3 px-6 py-4">
            <LoadingSpinner size="lg" />
            <span className="text-sm font-medium text-slate-600">Carregando perfil...</span>
          </div>
        </div>
      </AccessGuard>
    );
  }

  const isVibrant = selectedTheme === 'vibrant';
  const isCustom = selectedTheme === 'custom';
  // Calcular gradiente para preview e aplicação
  const previewColor = selectedColor || DOURADO_COLOR;
  const previewColor2 = selectedColor2 || DOURADO_COLOR;
  const gradientColors = isCustom && previewColor2
    ? generateGradientColorsWithTwoColors(previewColor, previewColor2)
    : isCustom && previewColor
    ? generateGradientColors(previewColor)
    : null;
  
  // Gradiente para preview quando não está ativo (usar dourada)
  const previewGradientColors = generateGradientColorsWithTwoColors(DOURADO_COLOR, DOURADO_COLOR);

  return (
    <AccessGuard allowed={['owner', 'admin', 'pro', 'atendente']}>
      <div className="app-page min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="app-card flex flex-col justify-between gap-6 px-6 py-5 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl text-white',
                  isVibrant
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg'
                    : isCustom && gradientColors
                    ? 'shadow-lg'
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
                <User className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Meu perfil</h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Settings className="h-4 w-4" />
                  Gerencie suas informações e preferências
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className={cn(
                      'text-white',
                      isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-900 hover:bg-slate-800'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="viewing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      'text-white',
                      isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-900 hover:bg-slate-800'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar perfil
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-6"
            >
              <div className="app-card px-6 py-6 text-center">
                <div
                        className={cn(
                          'mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border text-3xl font-semibold text-white',
                          isVibrant
                            ? 'border-white/40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg'
                            : isCustom && gradientColors
                            ? 'border-white/40 shadow-lg'
                            : 'border-slate-200 bg-slate-900'
                        )}
                        style={
                          isCustom && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                >
                  {(profile.nome || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  {profile.nome || user?.displayName || 'Usuário'}
                </h2>
                <Badge
                  className={cn(
                    'mt-3 rounded-full border px-3 py-1 text-xs font-medium text-white',
                    isVibrant
                      ? 'border-white/40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg'
                      : isCustom && gradientColors
                      ? 'border-white/40 shadow-lg'
                      : 'border-slate-200 bg-slate-900'
                  )}
                  style={
                    isCustom && gradientColors
                      ? {
                          background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                        }
                      : undefined
                  }
                >
                  {getRoleLabel(profile.role)}
                </Badge>

                <div className="mt-6 space-y-3 text-left text-sm">
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm',
                      isVibrant
                        ? 'border-white/25 bg-white/85 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isVibrant ? 'bg-white/80 text-indigo-600 border border-white/40' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <Mail className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{profile.email}</span>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm',
                      isVibrant
                        ? 'border-white/25 bg-white/85 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isVibrant ? 'bg-white/80 text-purple-600 border border-white/40' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <Phone className="h-5 w-5" />
                    </div>
                    <span className="font-medium">
                      {profile.telefoneE164 || 'Telefone não cadastrado'}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm',
                      profile.ativo
                        ? isVibrant
                          ? 'border-emerald-200/70 bg-white/85 text-emerald-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isVibrant
                          ? 'border-rose-200/70 bg-white/85 text-rose-600'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        profile.ativo
                          ? isVibrant
                            ? 'bg-emerald-100/80 text-emerald-600 border border-emerald-200'
                            : 'bg-emerald-100 text-emerald-700'
                          : isVibrant
                            ? 'bg-rose-100/80 text-rose-600 border border-rose-200'
                            : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span className="font-medium">
                      {profile.ativo ? 'Conta ativa' : 'Conta inativa'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="app-card px-6 py-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Credenciais
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Função</span>
                    <span className="font-medium text-slate-900">{getRoleLabel(profile.role)}</span>
                  </div>
                  {profile.professionalId && (
                    <div className="flex items-center justify-between">
                      <span>ID do profissional</span>
                      <span className="font-mono text-xs text-slate-500">{profile.professionalId}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6 lg:col-span-2"
            >
              <div className="app-card px-6 py-6">
                <h3 className="text-lg font-semibold text-slate-900">Informações pessoais</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Atualize os dados exibidos para a equipe e para os {pluralTitle.toLowerCase()}.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Nome completo</label>
                    {isEditing ? (
                      <Input
                        value={profile.nome}
                        onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Digite seu nome"
                      />
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                        {profile.nome || 'Não informado'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">E-mail</label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                      {profile.email}
                      <span className="mt-1 block text-xs text-slate-400">
                        <AlertCircle className="mr-1 inline h-3 w-3" />
                        O e-mail é usado como login e não pode ser alterado.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Telefone</label>
                    {isEditing ? (
                      <Input
                        value={profile.telefoneE164}
                        onChange={(e) => setProfile(prev => ({ ...prev, telefoneE164: e.target.value }))}
                        placeholder="(11) 99999-0000"
                      />
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                        {profile.telefoneE164 || 'Não informado'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Papel</label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>{getRoleLabel(profile.role)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="app-card px-6 py-6">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      (isVibrant || isCustom) && gradientColors
                        ? 'bg-white/20 text-white'
                        : isCustom
                        ? 'text-white'
                        : 'bg-slate-100 text-slate-600'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Tema da interface</h3>
                    <p className="text-sm text-slate-500">
                      Selecione o estilo visual que combina melhor com sua rotina.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {THEME_OPTIONS.map((option) => {
                    const active = selectedTheme === option.id;
                    const isOptionCustom = option.id === 'custom';
                    const isOptionVibrant = option.id === 'vibrant';
                    
                    // Determina o estilo do botão baseado no tema selecionado e opção
                    let buttonStyle = '';
                    if (active) {
                      if (isCustom && isOptionCustom) {
                        buttonStyle = 'border-white/60 text-white shadow-lg';
                      } else if (isVibrant && isOptionVibrant) {
                        buttonStyle = 'border-white/60 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg focus:ring-indigo-200 focus:ring-offset-transparent';
                      } else if (!isVibrant && !isCustom && option.id === 'neutral') {
                        buttonStyle = 'border-slate-900 bg-slate-900 text-white shadow-md focus:ring-slate-900 focus:ring-offset-slate-200';
                      }
                    } else {
                      if (isVibrant || isCustom) {
                        buttonStyle = 'border-white/45 bg-white/85 text-slate-800 shadow-sm hover:border-white/55 hover:bg-white/90';
                      } else {
                        buttonStyle = 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300';
                      }
                    }
                    
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleThemeSelection(option.id)}
                        disabled={updatingTheme}
                        className={cn(
                          'group relative flex h-full flex-col rounded-xl border p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
                          buttonStyle,
                          isOptionCustom && active && gradientColors && 'bg-gradient-to-br',
                          isOptionCustom && active && gradientColors && `from-[${gradientColors.start}] via-[${gradientColors.middle}] to-[${gradientColors.end}]`
                        )}
                        style={
                          isOptionCustom && active && gradientColors
                            ? {
                                background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">{option.title}</span>
                          {active ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Sparkles className="h-5 w-5 opacity-60" />
                          )}
                        </div>
                        <p
                          className={cn(
                            'mt-2 text-sm leading-relaxed',
                            active
                            ? isVibrant || isCustom
                              ? 'text-white/90'
                              : 'text-slate-100'
                            : isVibrant || isCustom
                              ? 'text-slate-700'
                              : 'text-slate-500'
                          )}
                        >
                          {option.description}
                        </p>
                        <div
                          className={cn(
                            'theme-preview mt-4 h-20 rounded-lg',
                            option.id === 'neutral' && 'theme-preview-neutral',
                            option.id === 'vibrant' && 'theme-preview-vibrant',
                            option.id === 'custom' && 'theme-preview-custom'
                          )}
                          style={
                            isOptionCustom && !active
                              ? {
                                  background: `linear-gradient(135deg, ${previewGradientColors.start} 0%, ${previewGradientColors.middle} 50%, ${previewGradientColors.end} 100%)`,
                                }
                              : isOptionCustom && active && gradientColors
                              ? {
                                  background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                }
                              : isOptionCustom && active
                              ? {
                                  background: `linear-gradient(135deg, ${previewGradientColors.start} 0%, ${previewGradientColors.middle} 50%, ${previewGradientColors.end} 100%)`,
                                }
                              : undefined
                          }
                        />
                        {active && (
                          <span className="mt-3 inline-flex items-center text-xs font-medium opacity-80">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Tema atual
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Seletor de cor para tema customizado */}
                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 space-y-4"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                      <h4 className="text-sm font-semibold text-slate-900 mb-4">
                        Escolha suas cores personalizadas
                      </h4>
                      
                      {/* Primeira Cor */}
                      <div className="mb-6">
                        <p className="text-xs font-medium text-slate-500 mb-3">
                          Primeira cor (início do gradiente)
                        </p>
                        
                        {/* Cores pré-definidas para primeira cor */}
                        <div className="mb-4">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                            {PRESET_COLORS.map((preset) => {
                              const isSelected = selectedColor === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => handleColorSelection(preset.value)}
                                  className={cn(
                                    'group relative h-12 w-12 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                                    isSelected && 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                  )}
                                  style={{
                                    background: `linear-gradient(135deg, ${preset.gradient[0]} 0%, ${preset.gradient[2]} 100%)`,
                                  }}
                                  title={preset.name}
                                >
                                  {isSelected && (
                                    <CheckCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Seletor de cor personalizado para primeira cor */}
                        <div>
                          <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                              <input
                                type="color"
                                value={selectedColor}
                                onChange={handleCustomColorChange}
                                className="h-12 w-full rounded-lg cursor-pointer border-2 border-slate-200 focus:border-slate-400 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50">
                              <span className="text-xs font-mono text-slate-600">{selectedColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Segunda Cor */}
                      <div className="mb-6">
                        <p className="text-xs font-medium text-slate-500 mb-3">
                          Segunda cor (fim do gradiente)
                        </p>
                        
                        {/* Cores pré-definidas para segunda cor */}
                        <div className="mb-4">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                            {PRESET_COLORS.map((preset) => {
                              const isSelected = selectedColor2 === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => handleColor2Selection(preset.value)}
                                  className={cn(
                                    'group relative h-12 w-12 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                                    isSelected && 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                  )}
                                  style={{
                                    background: `linear-gradient(135deg, ${preset.gradient[0]} 0%, ${preset.gradient[2]} 100%)`,
                                  }}
                                  title={preset.name}
                                >
                                  {isSelected && (
                                    <CheckCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Seletor de cor personalizado para segunda cor */}
                        <div>
                          <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                              <input
                                type="color"
                                value={selectedColor2}
                                onChange={handleCustomColor2Change}
                                className="h-12 w-full rounded-lg cursor-pointer border-2 border-slate-200 focus:border-slate-400 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50">
                              <span className="text-xs font-mono text-slate-600">{selectedColor2}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview do gradiente */}
                      {gradientColors && (
                        <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            Preview do gradiente
                          </p>
                          <div
                            className="h-24 rounded-lg shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {updatingTheme && (
                  <p className="mt-3 text-xs text-slate-500">
                    Aplicando novo tema...
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}

