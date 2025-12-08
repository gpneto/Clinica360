'use client';

import { useState } from 'react';
import { AccessGuard } from '@/components/AccessGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Users, UserPlus, Edit, Shield, UserCheck, UserX, X, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading';
import toast from 'react-hot-toast';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { PermissionsModal } from '@/components/PermissionsModal';
import { GranularPermissions } from '@/types';
import { createDefaultPermissions } from '@/lib/permissions';

interface User {
  id: string;
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro';
  ativo: boolean;
  createdAt: any;
  professionalId?: string;
  permissions?: GranularPermissions;
}

type NewUserForm = {
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro';
  ativo: boolean;
};

export default function UsuariosPage() {
  const { role, companyId, themePreference, customColor, customColor2 } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const createEmptyUser = (): NewUserForm => ({
    nome: '',
    email: '',
    role: 'atendente',
    ativo: true,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(() => createEmptyUser());
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const isVibrant = themePreference === 'vibrant';
  const isNeutral = themePreference === 'neutral';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const vibrantStatCards = [
    'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-xl hover:shadow-2xl',
    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl',
    'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl hover:shadow-2xl',
    'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl'
  ];

  useEffect(() => {
    if (!companyId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Buscar usuários da empresa específica
    const q = query(
      collection(db, `companies/${companyId}/users`), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleOpenCreateModal = () => {
    setNewUserForm(createEmptyUser());
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (!creatingUser) {
      setIsCreateModalOpen(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyId) {
      toast.error('Empresa não identificada');
      return;
    }

    const nome = newUserForm.nome.trim();
    const email = newUserForm.email.trim().toLowerCase();

    if (!nome) {
      toast.error('Informe o nome do usuário');
      return;
    }

    if (!email) {
      toast.error('Informe o e-mail do usuário');
      return;
    }

    setCreatingUser(true);

    try {
      const payload: Record<string, any> = {
        nome,
        email,
        role: newUserForm.role,
        ativo: newUserForm.ativo,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Se o role for 'outro', criar permissões padrão (todas desabilitadas)
      if (newUserForm.role === 'outro') {
        payload.permissions = createDefaultPermissions();
      }

      await addDoc(collection(db, `companies/${companyId}/users`), payload);

      toast.success('Usuário adicionado com sucesso');
      setNewUserForm(createEmptyUser());
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!companyId) {
      toast.error('Empresa não identificada');
      return;
    }
    
    try {
      await updateDoc(doc(db, `companies/${companyId}/users`, userId), {
        ativo: !currentStatus
      });
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro') => {
    if (!companyId) {
      toast.error('Empresa não identificada');
      return;
    }
    
    try {
      const updateData: any = { role: newRole };
      
      // Se mudando para 'outro', criar permissões padrão (todas desabilitadas)
      if (newRole === 'outro') {
        updateData.permissions = createDefaultPermissions();
      } else {
        // Se mudando de 'outro' para outro role, remover permissões
        updateData.permissions = null;
      }
      
      await updateDoc(doc(db, `companies/${companyId}/users`, userId), updateData);
      toast.success('Role alterada com sucesso');
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      toast.error('Erro ao alterar role');
    }
  };

  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setPermissionsModalOpen(true);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSavePermissions = async (permissions: GranularPermissions) => {
    if (!companyId || !selectedUser) {
      toast.error('Erro ao salvar permissões');
      return;
    }

    try {
      await updateDoc(doc(db, `companies/${companyId}/users`, selectedUser.id), {
        permissions,
        updatedAt: Timestamp.now(),
      });
      toast.success('Permissões salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões');
      throw error;
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    if (hasGradient) {
      // No tema custom, usar texto preto para melhor legibilidade
      if (isCustom) {
        switch (userRole) {
          case 'owner':
            return 'border-slate-900 bg-slate-900 text-white';
          case 'admin':
            return 'border-blue-200 bg-blue-50 text-blue-700';
          case 'pro':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
          case 'atendente':
            return 'border-amber-200 bg-amber-50 text-amber-700';
          case 'outro':
            return 'border-purple-200 bg-purple-50 text-purple-700';
          default:
            return 'border-slate-200 bg-slate-50 text-slate-600';
        }
      }
      return 'border-white/30 bg-white/10 text-white';
    }
    switch (userRole) {
      case 'owner':
        return 'border-slate-900 bg-slate-900 text-white';
      case 'admin':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'pro':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'atendente':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'outro':
        return 'border-purple-200 bg-purple-50 text-purple-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-600';
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      case 'pro': return 'Profissional';
      case 'atendente': return 'Atendente';
      case 'outro': return 'Outro/Recepcionista';
      default: return userRole;
    }
  };

  if (loading) {
    return (
      <AccessGuard allowed={['owner', 'admin']}>
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </AccessGuard>
    );
  }

  if (!companyId) {
    return (
      <AccessGuard allowed={['owner', 'admin']}>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-96">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Empresa não identificada</h2>
            <p className="text-gray-600 text-center">
              Não foi possível identificar a empresa. Entre em contato com o administrador.
            </p>
          </div>
        </div>
      </AccessGuard>
    );
  }

  return (
    <AccessGuard allowed={['owner', 'admin']}>
      <div className="app-page min-h-screen px-4 pt-3 pb-6 sm:px-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-2xl px-6 py-5 transition-all',
              hasGradient
                ? 'bg-white/80 border border-white/25 shadow-xl backdrop-blur-xl'
                : 'app-card border border-slate-200 shadow-sm'
            )}
          >
            <div
              className={cn(
                'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
                'pl-16 pr-4 sm:px-0'
              )}
            >
              <div>
                <p
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    hasGradient ? 'text-slate-500/80' : 'text-slate-400'
                  )}
                >
                  Usuários
                </p>
                <h1
                  className={cn(
                    'text-2xl font-semibold',
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
                  Gestão de acessos
                </h1>
                <p
                  className={cn(
                    'text-sm',
                    hasGradient ? 'text-slate-600/80' : 'text-slate-500'
                  )}
                >
                  Acompanhe permissões e status da equipe
                </p>
              </div>
              <Button
                onClick={handleOpenCreateModal}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300',
                  hasGradient
                    ? isCustom && gradientStyleHorizontal
                      ? 'text-white hover:opacity-90'
                      : isVibrant
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : isNeutral
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
                style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
              >
                <UserPlus className="w-4 h-4" />
                Novo usuário
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ label: 'Total', value: users.length, icon: Users },
              { label: 'Ativos', value: users.filter(u => u.ativo).length, icon: UserCheck },
              { label: 'Profissionais', value: users.filter(u => u.role === 'pro').length, icon: Shield },
              { label: 'Atendentes', value: users.filter(u => u.role === 'atendente').length, icon: UserPlus }].map(({ label, value, icon: Icon }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card
                  className={cn(
                    'h-full rounded-2xl transition-all duration-300',
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'text-white border-0 shadow-xl hover:shadow-2xl'
                        : isVibrant
                        ? vibrantStatCards[index % vibrantStatCards.length]
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
                  <CardContent
                    className={cn(
                      'p-5 flex items-center justify-between',
                      hasGradient ? 'text-white' : ''
                    )}
                  >
                    <div>
                      <p
                        className={cn(
                          'text-xs uppercase tracking-wide',
                          hasGradient ? 'text-white/70' : 'text-slate-400'
                        )}
                      >
                        {label}
                      </p>
                      <p
                        className={cn(
                          'text-2xl font-semibold mt-1',
                          hasGradient ? 'text-white' : 'text-slate-900'
                        )}
                      >
                        {value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl text-white',
                        hasGradient ? 'bg-white/20 shadow-lg' : isNeutral ? 'bg-slate-900' : 'bg-slate-900'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Users List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={cn(
                'overflow-hidden rounded-2xl border transition-all',
                hasGradient
                  ? 'bg-white/70 border-white/25 backdrop-blur-xl shadow-xl'
                  : isNeutral
                  ? 'app-card border border-slate-200'
                  : 'app-card'
              )}
            >
              <CardHeader
                className={cn(
                  'border-b px-6 py-4',
                  hasGradient ? 'border-white/25 bg-white/30 backdrop-blur' : 'border-slate-200'
                )}
              >
                <CardTitle
                  className={cn(
                    'flex items-center gap-2 text-lg font-semibold',
                    hasGradient ? 'text-slate-900' : 'text-slate-900'
                  )}
                >
                  <Users
                    className={cn(
                      'w-5 h-5',
                      hasGradient ? 'text-slate-600' : 'text-slate-500'
                    )}
                  />
                  Lista de usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className={cn(
                        'border-b text-left text-xs font-medium uppercase tracking-wider',
                        hasGradient
                          ? 'bg-white/50 border-white/25 text-slate-600'
                          : 'bg-slate-50 border-slate-200 text-gray-500'
                      )}
                    >
                      <tr>
                        {['Usuário', 'Email', 'Role', 'Status', 'Ações'].map((column) => {
                          const isRoleOrAcoes = column === 'Role' || column === 'Ações';
                          const shouldUseBlackText = isCustom && isRoleOrAcoes;
                          
                          return (
                            <th key={column} className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-block font-semibold tracking-[0.08em]',
                                  hasGradient
                                    ? shouldUseBlackText
                                      ? 'text-slate-900'
                                      : isCustom && gradientColors
                                        ? 'bg-clip-text text-transparent drop-shadow-sm'
                                        : isVibrant
                                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow-sm'
                                        : 'text-slate-500'
                                    : isNeutral
                                    ? 'text-slate-500'
                                    : 'text-slate-500'
                                )}
                                style={
                                  isCustom && gradientColors && !shouldUseBlackText
                                    ? {
                                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                      }
                                    : undefined
                                }
                              >
                                {column}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-transparent">
                      {users.map((user, index) => (
                        <motion.tr 
                          key={user.id} 
                          className={cn(
                            'transition-colors',
                            hasGradient ? 'hover:bg-white/10' : isNeutral ? 'hover:bg-slate-50' : 'hover:bg-slate-50'
                          )}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm',
                                  hasGradient
                                    ? isCustom && gradientColors
                                      ? 'text-white'
                                      : isVibrant
                                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white'
                                      : 'bg-slate-900 text-white'
                                    : isNeutral
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-900 text-white'
                                )}
                                style={
                                  isCustom && gradientColors
                                    ? {
                                        background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                      }
                                    : undefined
                                }
                              >
                                <span className="font-bold">
                                  {user.nome.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-semibold text-gray-900">
                                  {user.nome || 'Sem nome'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value as any)}
                              className={cn(
                                'text-xs font-semibold px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none',
                                getRoleBadgeColor(user.role)
                              )}
                              disabled={user.role === 'owner'}
                            >
                              <option value="atendente">Atendente</option>
                              <option value="pro">Profissional</option>
                              <option value="outro">Outro/Recepcionista</option>
                              <option value="admin">Administrador</option>
                              {role === 'owner' && <option value="owner">Proprietário</option>}
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge 
                              variant={user.ativo ? "default" : "secondary"}
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold',
                                user.ativo
                                  ? hasGradient
                                    ? 'bg-emerald-500/90 text-white'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : hasGradient
                                    ? 'bg-rose-500/90 text-white'
                                    : 'bg-rose-100 text-rose-700'
                              )}
                            >
                              {user.ativo ? '✓ Ativo' : '✗ Inativo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {user.role === 'outro' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPermissionsModal(user)}
                                  className={cn(
                                    'font-semibold transition-all duration-200',
                                    hasGradient
                                      ? isCustom
                                        ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                        : 'border-white/30 text-white hover:bg-white/10'
                                      : isNeutral
                                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                                      : 'border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                                  )}
                                >
                                  <Settings className="w-4 h-4 mr-1" />
                                  Permissões
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                                className={cn(
                                  'font-semibold transition-all duration-200',
                                  user.ativo
                                    ? hasGradient
                                      ? isCustom
                                        ? 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900'
                                        : 'border-white/30 text-white hover:bg-white/10'
                                      : isNeutral
                                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                                      : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                                    : hasGradient
                                      ? isCustom
                                        ? 'border-green-200 text-green-700 hover:bg-green-50 hover:text-green-900'
                                        : 'border-white/30 text-white hover:bg-white/10'
                                      : isNeutral
                                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                                      : 'border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700'
                                )}
                              >
                                {user.ativo ? 'Desativar' : 'Ativar'}
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {isCreateModalOpen && (
          <div
            className={cn(
              'fixed inset-0 z-[1200] flex items-center justify-center p-4 transition-colors',
              hasGradient ? 'bg-slate-900/60 backdrop-blur-xl' : 'bg-black/60'
            )}
            onClick={handleCloseCreateModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'w-full max-w-lg rounded-2xl border shadow-2xl transition-all',
                hasGradient ? 'bg-white/85 border-white/30 backdrop-blur-2xl' : 'bg-white border-slate-200'
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-6 py-5 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg',
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
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        className={cn(
                          'text-xl font-bold',
                          hasGradient ? 'text-slate-900' : 'text-slate-900'
                        )}
                      >
                        Novo usuário
                      </h2>
                      <p
                        className={cn(
                          'text-sm',
                          hasGradient ? 'text-slate-600/80' : 'text-slate-500'
                        )}
                      >
                        Convite um integrante para acessar a plataforma
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseCreateModal}
                    disabled={creatingUser}
                    className={cn(
                      'rounded-full',
                      hasGradient ? 'text-slate-500 hover:bg-white/30' : 'text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        Nome completo
                      </label>
                      <Input
                        value={newUserForm.nome}
                        onChange={(event) =>
                          setNewUserForm((prev) => ({ ...prev, nome: event.target.value }))
                        }
                        placeholder="Nome do usuário"
                        autoFocus
                        required
                        className={cn(
                          'transition-all duration-200',
                          hasGradient
                            ? 'border-white/30 bg-white/70 text-slate-900 focus-visible:border-indigo-400 focus-visible:ring-indigo-200'
                            : 'border-slate-300 focus-visible:border-slate-900 focus-visible:ring-slate-900'
                        )}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        E-mail
                      </label>
                      <Input
                        type="email"
                        value={newUserForm.email}
                        onChange={(event) =>
                          setNewUserForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                        placeholder="usuario@empresa.com"
                        required
                        className={cn(
                          'transition-all duration-200',
                          hasGradient
                            ? 'border-white/30 bg-white/70 text-slate-900 focus-visible:border-indigo-400 focus-visible:ring-indigo-200'
                            : 'border-slate-300 focus-visible:border-slate-900 focus-visible:ring-slate-900'
                        )}
                      />
                    </div>

                    <div>
                      <label
                        className={cn(
                          'block text-sm font-medium mb-2',
                          hasGradient ? 'text-slate-700' : 'text-slate-600'
                        )}
                      >
                        Permissão
                      </label>
                      <select
                        value={newUserForm.role}
                        onChange={(event) =>
                          setNewUserForm((prev) => ({
                            ...prev,
                            role: event.target.value as NewUserForm['role'],
                          }))
                        }
                        className={cn(
                          'w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2',
                          hasGradient
                            ? 'border-white/30 bg-white/70 text-slate-800 focus:border-indigo-400 focus:ring-indigo-200'
                            : 'border-slate-300 bg-white text-slate-700 focus:border-slate-900 focus:ring-slate-900'
                        )}
                      >
                        <option value="atendente">Atendente</option>
                        <option value="pro">Profissional</option>
                        <option value="outro">Outro/Recepcionista</option>
                        <option value="admin">Administrador</option>
                        {role === 'owner' && <option value="owner">Proprietário</option>}
                      </select>
                    </div>

                    <div
                      className={cn(
                        'flex items-center justify-between rounded-lg px-4 py-3 sm:col-span-2 transition-all duration-200',
                        hasGradient ? 'border-white/30 bg-white/65 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                      )}
                    >
                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            hasGradient ? 'text-slate-800' : 'text-slate-700'
                          )}
                        >
                          Usuário ativo
                        </p>
                        <p
                          className={cn(
                            'text-xs',
                            hasGradient ? 'text-slate-500/80' : 'text-slate-500'
                          )}
                        >
                          Usuários inativos não conseguem acessar o sistema
                        </p>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newUserForm.ativo}
                          onChange={(event) =>
                            setNewUserForm((prev) => ({
                              ...prev,
                              ativo: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            hasGradient ? 'text-slate-700' : 'text-slate-600'
                          )}
                        >
                          Ativo
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseCreateModal}
                      disabled={creatingUser}
                      className={cn(
                        'px-4',
                        hasGradient
                          ? 'border-white/30 text-slate-700 hover:bg-white/30'
                          : isNeutral
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={creatingUser}
                      className={cn(
                        'flex items-center gap-2 px-5',
                        hasGradient
                          ? isCustom && gradientStyleHorizontal
                            ? 'text-white hover:opacity-90'
                            : isVibrant
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          : isNeutral
                          ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      )}
                      style={isCustom && gradientStyleHorizontal ? gradientStyleHorizontal : undefined}
                    >
                      {creatingUser ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Adicionar usuário
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Permissões */}
        {permissionsModalOpen && selectedUser && (
          <PermissionsModal
            isOpen={permissionsModalOpen}
            onClose={handleClosePermissionsModal}
            onSave={handleSavePermissions}
            initialPermissions={selectedUser.permissions}
            userName={selectedUser.nome}
          />
        )}
      </div>
    </AccessGuard>
  );
}
