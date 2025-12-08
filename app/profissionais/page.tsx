'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { canAccessProfessionalsMenu } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Users, Edit, Trash2, Clock, Palette, Calendar, UserCheck, Settings, Link as LinkIcon, Mail, X } from 'lucide-react';
import { showSuccess, showError } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth-context';
import { useProfessionals, useCompany } from '@/hooks/useFirestore';
import { collection, addDoc, Timestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';

interface User {
  id: string;
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente';
  ativo: boolean;
  createdAt: any;
  professionalId?: string;
}

interface Professional {
  id: string;
  email?: string;
  userUid?: string;
  apelido: string;
  corHex: string;
  ativo: boolean;
  signatureImageUrl?: string;
  cro?: string;
  croEstado?: string;
  janelaAtendimento: {
    diasSemana: number[];
    inicio: string;
    fim: string;
  };
}

export default function ProfessionalsPage() {
  const { companyId, themePreference, customColor, customColor2 } = useAuth();
  const { professionals, loading, createProfessional, updateProfessional, deleteProfessional } = useProfessionals(companyId);
  const { company } = useCompany(companyId);
  const isDentista = company?.tipoEstabelecimento === 'dentista';
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    apelido: '',
    corHex: '#3B82F6',
    ativo: true,
    signatureImageUrl: '' as string | undefined,
    cro: '' as string | undefined,
    croEstado: '' as string | undefined,
    janelaAtendimento: {
      diasSemana: [1, 2, 3, 4, 5], // Segunda a sexta
      inicio: '08:00',
      fim: '18:00'
    }
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Inicializar canvas com alta resolução
  useEffect(() => {
    if (canvasRef.current && showSignatureModal) {
      // Pequeno delay para garantir que o modal está renderizado
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.max(6, dpr * 3);
        
        // Canvas mais largo (horizontal) do que alto (vertical) para evitar assinaturas achatadas
        // Proporção recomendada: 4:1 ou 5:1 (largura:altura) - mais horizontal
        const displayWidth = rect.width || 1200;
        const displayHeight = Math.min(rect.height || 200, 200); // Altura fixa de 200px para proporção muito mais horizontal
        
        canvas.width = displayWidth * scale;
        canvas.height = displayHeight * scale;
        
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        ctx.strokeStyle = '#0066CC';
        ctx.lineWidth = 2.2 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 10;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Carregar assinatura existente se estiver editando e não houver nova assinatura desenhada
        if (editingProfessional?.signatureImageUrl && !hasSignature) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (ctx && canvas) {
              // Manter proporção da imagem
              const imgAspect = img.width / img.height;
              const canvasAspect = canvas.width / canvas.height;
              
              let drawWidth = canvas.width;
              let drawHeight = canvas.height;
              let drawX = 0;
              let drawY = 0;
              
              if (imgAspect > canvasAspect) {
                drawHeight = canvas.width / imgAspect;
                drawY = (canvas.height - drawHeight) / 2;
              } else {
                drawWidth = canvas.height * imgAspect;
                drawX = (canvas.width - drawWidth) / 2;
              }
              
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
              setHasSignature(true);
            }
          };
          img.onerror = () => {
            console.warn('Erro ao carregar assinatura existente');
          };
          img.src = editingProfessional.signatureImageUrl;
        } else if (!editingProfessional?.signatureImageUrl) {
          // Se não houver assinatura existente, limpar o canvas
          setHasSignature(false);
        }
      }, 100);
    }
  }, [showSignatureModal, editingProfessional?.signatureImageUrl]);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen || showSignatureModal) {
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
  }, [isModalOpen, showSignatureModal]);

  // Funções para desenhar no canvas
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2.2 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 10;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2.2 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      ctx.strokeStyle = '#0066CC';
      ctx.lineWidth = 2.2 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const uploadSignature = async (professionalId?: string): Promise<string | null> => {
    if (!canvasRef.current || !companyId || !hasSignature) return null;
    
    try {
      setUploadingSignature(true);
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob());
        }, 'image/png', 1.0);
      });

      if (!blob || blob.size === 0) return null;

      const timestamp = Date.now();
      const finalProfessionalId = professionalId || editingProfessional?.id || `temp-${timestamp}`;
      const storagePath = `companies/${companyId}/professionals/${finalProfessionalId}/signature/${timestamp}.png`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      showError('Erro ao salvar assinatura');
      return null;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      showError('Empresa não identificada');
      return;
    }
    
    // Validar se tem email
    if (!formData.email) {
      showError('Email é obrigatório para criar um profissional');
      return;
    }
    
    try {
      // Fazer upload da assinatura se houver uma nova
      let signatureUrl = formData.signatureImageUrl;
      if (hasSignature && canvasRef.current) {
        const uploadedUrl = await uploadSignature();
        if (uploadedUrl) {
          signatureUrl = uploadedUrl;
        }
      }

      const professionalDataToSave = {
        ...formData,
        signatureImageUrl: signatureUrl || undefined,
      };

      if (editingProfessional) {
        // Se houver uma nova assinatura desenhada, fazer upload
        if (hasSignature && canvasRef.current) {
          const uploadedUrl = await uploadSignature(editingProfessional.id);
          if (uploadedUrl) {
            signatureUrl = uploadedUrl;
          }
        } else if (!hasSignature && editingProfessional.signatureImageUrl) {
          // Se não houver nova assinatura mas existir uma anterior, manter a existente
          signatureUrl = editingProfessional.signatureImageUrl;
        }

        // Atualizar profissional
        const updatedData: any = {
          email: formData.email,
          apelido: formData.apelido,
          corHex: formData.corHex,
          ativo: formData.ativo,
          janelaAtendimento: formData.janelaAtendimento
        };
        
        // Incluir signatureImageUrl apenas se houver valor
        if (signatureUrl) {
          updatedData.signatureImageUrl = signatureUrl;
        }
        
        // Incluir CRO apenas se for dentista e houver valor
        if (isDentista) {
          if (formData.cro && formData.cro.trim()) {
            updatedData.cro = formData.cro.trim();
          }
          if (formData.croEstado && formData.croEstado.trim()) {
            updatedData.croEstado = formData.croEstado.trim();
          }
        } else {
          // Se não for dentista, remover campos CRO
          updatedData.cro = null;
          updatedData.croEstado = null;
        }
        
        await updateProfessional(editingProfessional.id, updatedData);
        showSuccess('Profissional atualizado com sucesso!');
      } else {
        // Verificar se já existe um profissional com esse email nesta empresa
        const professionalsQuery = query(
          collection(db, `companies/${companyId}/professionals`),
          where('email', '==', formData.email)
        );
        const professionalsSnapshot = await getDocs(professionalsQuery);
        
        if (!professionalsSnapshot.empty) {
          showError('Já existe um profissional com esse email nesta empresa');
          return;
        }
        
        // Criar profissional primeiro para obter o ID
        // Remover campos undefined para evitar erro no Firestore
        const professionalDataWithoutSignature: any = {
          email: formData.email,
          apelido: formData.apelido,
          corHex: formData.corHex,
          ativo: formData.ativo,
          companyId,
          janelaAtendimento: formData.janelaAtendimento
        };
        
        // Adicionar CRO apenas se for dentista e tiver valor
        if (isDentista) {
          if (formData.cro && formData.cro.trim()) {
            professionalDataWithoutSignature.cro = formData.cro.trim();
          }
          if (formData.croEstado && formData.croEstado.trim()) {
            professionalDataWithoutSignature.croEstado = formData.croEstado.trim();
          }
        }
        
        // Criar o documento do profissional manualmente para obter o ID
        const professionalRef = await addDoc(
          collection(db, `companies/${companyId}/professionals`),
          {
            ...professionalDataWithoutSignature,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }
        );

        // Se houver assinatura, fazer upload usando o ID do profissional criado
        let finalSignatureUrl = signatureUrl;
        if (hasSignature && canvasRef.current) {
          const blob = await new Promise<Blob>((resolve) => {
            if (canvasRef.current) {
              canvasRef.current.toBlob((blob) => {
                if (blob) resolve(blob);
                else resolve(new Blob());
              }, 'image/png', 1.0);
            } else {
              resolve(new Blob());
            }
          });

          if (blob && blob.size > 0) {
            const timestamp = Date.now();
            const storagePath = `companies/${companyId}/professionals/${professionalRef.id}/signature/${timestamp}.png`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, blob);
            finalSignatureUrl = await getDownloadURL(storageRef);
            
            // Atualizar o documento com a URL da assinatura
            await updateDoc(professionalRef, {
              signatureImageUrl: finalSignatureUrl,
              updatedAt: Timestamp.now()
            });
          }
        }

        // Verificar se já existe um usuário com o mesmo e-mail
        const usersQuery = query(
          collection(db, `companies/${companyId}/users`),
          where('email', '==', formData.email)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
          // Criar novo usuário vinculado ao profissional
          await addDoc(
            collection(db, `companies/${companyId}/users`),
            {
              uid: '', // Será preenchido quando o usuário fizer login
              nome: formData.apelido,
              email: formData.email,
              role: 'pro',
              ativo: true,
              professionalId: professionalRef.id,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            }
          );

          showSuccess('Profissional criado com sucesso! O usuário pode fazer login com o email informado.');
        } else {
          const existingUsers = usersSnapshot.docs.map((doc) => doc.data());
          const hasOwnerOrAdmin = existingUsers.some(
            (user) => user.role === 'owner' || user.role === 'admin'
          );

          if (!hasOwnerOrAdmin) {
            let linkedExistingUser = false;

            for (const userDoc of usersSnapshot.docs) {
              const userData = userDoc.data();
              if (!userData.professionalId) {
                await updateDoc(userDoc.ref, {
                  professionalId: professionalRef.id,
                  updatedAt: Timestamp.now()
                });
                linkedExistingUser = true;
              }
            }

            if (linkedExistingUser) {
              showSuccess('Profissional criado e associado ao usuário existente.');
            } else {
              showSuccess('Profissional criado com sucesso! Usuário existente mantido sem alterações.');
            }
          } else {
            showSuccess('Profissional criado com sucesso! Usuário proprietário/administrador existente mantido.');
          }
        }
      }
      setIsModalOpen(false);
      setEditingProfessional(null);
      setFormData({
        email: '',
        apelido: '',
        corHex: '#3B82F6',
        ativo: true,
        signatureImageUrl: '',
        cro: '',
        croEstado: '',
        janelaAtendimento: {
          diasSemana: [1, 2, 3, 4, 5],
          inicio: '08:00',
          fim: '18:00'
        }
      });
      setHasSignature(false);
      clearSignature();
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      showError('Erro ao salvar profissional');
    }
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      email: (professional as any).email || '',
      apelido: professional.apelido,
      corHex: professional.corHex,
      ativo: professional.ativo,
      signatureImageUrl: professional.signatureImageUrl,
      cro: professional.cro || '',
      croEstado: professional.croEstado || '',
      janelaAtendimento: professional.janelaAtendimento
    });
    setHasSignature(!!professional.signatureImageUrl);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este profissional?')) {
      try {
        // Excluir o profissional
        await deleteProfessional(id);
        showSuccess('Profissional excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        showError('Erro ao excluir profissional');
      }
    }
  };


  const filteredProfessionals = professionals.filter(professional =>
    professional.apelido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDiasSemana = (dias: number[]) => {
    const diasMap: { [key: number]: string } = {
      0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
    };
    return dias.map(dia => diasMap[dia]).join(', ');
  };

  if (loading) {
    return (
      <AccessGuard 
        allowed={['owner', 'admin', 'outro']}
        checkPermission={(user) => canAccessProfessionalsMenu(user)}
      >
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
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
                    Profissionais
                  </h1>
                  <p className={cn('text-sm mt-0.5', hasGradient ? 'text-slate-600/80' : 'text-gray-500')}>
                    Gerencie profissionais e suas configurações
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => {
                    setEditingProfessional(null);
                    setFormData({
                      email: '',
                      apelido: '',
                      corHex: '#3B82F6',
                      ativo: true,
                      signatureImageUrl: '',
                      cro: '',
                      croEstado: '',
                      janelaAtendimento: {
                        diasSemana: [1, 2, 3, 4, 5],
                        inicio: '08:00',
                        fim: '18:00'
                      }
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
                  Novo Profissional
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card
                className={cn(
                  'transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white border-0 shadow-xl hover:shadow-2xl'
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white border-0 shadow-xl hover:shadow-2xl'
                      : 'app-card'
                    : isNeutral
                    ? 'app-card'
                    : 'app-card'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-blue-600')}>Total de Profissionais</p>
                      <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>{professionals.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className={cn(
                  'transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white border-0 shadow-xl hover:shadow-2xl'
                      : isVibrant
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white border-0 shadow-xl hover:shadow-2xl'
                      : 'app-card'
                    : isNeutral
                    ? 'app-card'
                    : 'app-card'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm mb-1', hasGradient ? 'text-white/70' : 'text-emerald-600')}>Profissionais Ativos</p>
                      <p className={cn('text-3xl font-bold', hasGradient ? 'text-white' : '')}>
                        {professionals.filter(p => p.ativo).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card
              className={cn(
                'rounded-xl shadow-xl',
                hasGradient ? 'bg-white/75 border border-white/25 backdrop-blur-xl' : 'bg-white/80 border-0'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className={cn('w-5 h-5', hasGradient ? 'text-slate-500' : 'text-gray-400')} />
                  <Input
                    placeholder="Buscar profissionais por nome..."
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

          {/* Professionals List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProfessionals.map((professional, index) => {
              const email = (professional as any).email || '';
              return (
                <motion.div
                  key={professional.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={cn(
                      'rounded-2xl border-2 transition-all duration-300 overflow-hidden group',
                      hasGradient
                        ? 'bg-white/80 border-white/25 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:border-indigo-300'
                        : isNeutral
                        ? 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-slate-300'
                        : 'bg-white/90 border-gray-100 shadow-lg hover:shadow-2xl hover:border-blue-300'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300"
                            style={{ backgroundColor: professional.corHex }}
                          >
                            {professional.apelido.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-gray-900">
                              {professional.apelido}
                            </CardTitle>
                            <Badge 
                              variant={professional.ativo ? "default" : "secondary"}
                              className={`font-semibold mt-1 ${
                                professional.ativo 
                                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
                                  : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                              }`}
                            >
                              {professional.ativo ? '✓ Ativo' : '✗ Inativo'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(professional)}
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
                            onClick={() => handleDelete(professional.id)}
                            className={cn(
                              hasGradient
                                ? 'border-white/30 text-rose-600 hover:bg-white/40'
                                : isNeutral
                                ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'
                                : 'hover:bg-red-50 text-red-600 border-red-200 hover:border-red-400'
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-3">
                    {email && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <p className="text-sm font-medium text-blue-800">
                          {email}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{professional.janelaAtendimento.inicio} - {professional.janelaAtendimento.fim}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{getDiasSemana(professional.janelaAtendimento.diasSemana)}</span>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Modal de Assinatura em Tela Cheia */}
          {showSignatureModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] m-4 flex flex-col"
              >
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Assinatura do Profissional
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSignatureModal(false);
                      // Se não houver assinatura desenhada, limpar
                      if (!hasSignature) {
                        clearSignature();
                      }
                    }}
                    className="border-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 p-6 overflow-auto">
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full border border-gray-300 rounded cursor-crosshair touch-none bg-white"
                        style={{ 
                          height: '200px', // Altura fixa menor para proporção muito mais horizontal (4:1 ou 5:1)
                          minHeight: '200px',
                          maxHeight: '200px'
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        {hasSignature ? (
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Assinatura desenhada. Clique em "Salvar" para confirmar.
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Use o mouse ou o dedo para desenhar sua assinatura na área acima
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearSignature}
                          disabled={!hasSignature}
                          className="text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Limpar
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (hasSignature && canvasRef.current) {
                              // Converter canvas para data URL e salvar no formData
                              const dataUrl = canvasRef.current.toDataURL('image/png');
                              setFormData({ ...formData, signatureImageUrl: dataUrl });
                              setShowSignatureModal(false);
                            } else {
                              showError('Por favor, desenhe uma assinatura antes de salvar');
                            }
                          }}
                          disabled={!hasSignature}
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
                          Salvar Assinatura
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail para Login
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="profissional@exemplo.com"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        O profissional usará este e-mail para fazer login no sistema.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome
                      </label>
                      <Input
                        value={formData.apelido}
                        onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                        placeholder="Nome do profissional"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cor
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.corHex}
                          onChange={(e) => setFormData({ ...formData, corHex: e.target.value })}
                          className="w-12 h-10 rounded border border-gray-200"
                        />
                        <Input
                          value={formData.corHex}
                          onChange={(e) => setFormData({ ...formData, corHex: e.target.value })}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        className="rounded border-gray-200"
                      />
                      <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                        Profissional ativo
                      </label>
                    </div>

                    {/* Assinatura do Profissional */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assinatura do Profissional <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                        {(formData.signatureImageUrl || (hasSignature && canvasRef.current)) ? (
                          <div className="space-y-2">
                            <div className="border border-gray-200 rounded bg-gray-50 p-4 flex items-center justify-center min-h-[120px]">
                              {formData.signatureImageUrl ? (
                                <img 
                                  src={formData.signatureImageUrl} 
                                  alt="Assinatura" 
                                  className="max-h-32 object-contain"
                                  onError={(e) => {
                                    // Se a imagem falhar ao carregar, tentar usar o canvas
                                    if (canvasRef.current) {
                                      const dataUrl = canvasRef.current.toDataURL('image/png');
                                      (e.target as HTMLImageElement).src = dataUrl;
                                    }
                                  }}
                                />
                              ) : canvasRef.current ? (
                                <img 
                                  src={canvasRef.current.toDataURL('image/png')} 
                                  alt="Assinatura" 
                                  className="max-h-32 object-contain"
                                />
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSignatureModal(true)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar Assinatura
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFormData({ ...formData, signatureImageUrl: undefined });
                                  setHasSignature(false);
                                  if (canvasRef.current) {
                                    clearSignature();
                                  }
                                }}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSignatureModal(true)}
                            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <Edit className="w-6 h-6 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {editingProfessional?.signatureImageUrl 
                                ? 'Clique para editar a assinatura' 
                                : 'Clique para adicionar assinatura'}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Campos CRO e Estado - apenas para dentistas */}
                    {isDentista && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CRO
                          </label>
                          <Input
                            value={formData.cro || ''}
                            onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                            placeholder="Ex: 12345"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado do CRO
                          </label>
                          <select
                            value={formData.croEstado || ''}
                            onChange={(e) => setFormData({ ...formData, croEstado: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecione o estado</option>
                            <option value="AC">AC - Acre</option>
                            <option value="AL">AL - Alagoas</option>
                            <option value="AP">AP - Amapá</option>
                            <option value="AM">AM - Amazonas</option>
                            <option value="BA">BA - Bahia</option>
                            <option value="CE">CE - Ceará</option>
                            <option value="DF">DF - Distrito Federal</option>
                            <option value="ES">ES - Espírito Santo</option>
                            <option value="GO">GO - Goiás</option>
                            <option value="MA">MA - Maranhão</option>
                            <option value="MT">MT - Mato Grosso</option>
                            <option value="MS">MS - Mato Grosso do Sul</option>
                            <option value="MG">MG - Minas Gerais</option>
                            <option value="PA">PA - Pará</option>
                            <option value="PB">PB - Paraíba</option>
                            <option value="PR">PR - Paraná</option>
                            <option value="PE">PE - Pernambuco</option>
                            <option value="PI">PI - Piauí</option>
                            <option value="RJ">RJ - Rio de Janeiro</option>
                            <option value="RN">RN - Rio Grande do Norte</option>
                            <option value="RS">RS - Rio Grande do Sul</option>
                            <option value="RO">RO - Rondônia</option>
                            <option value="RR">RR - Roraima</option>
                            <option value="SC">SC - Santa Catarina</option>
                            <option value="SP">SP - São Paulo</option>
                            <option value="SE">SE - Sergipe</option>
                            <option value="TO">TO - Tocantins</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 border-t border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
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
                      {editingProfessional ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingProfessional(null);
                      }}
                      className="flex-1"
                    >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}