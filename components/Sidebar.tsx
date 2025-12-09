'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  Calendar,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Building2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Package,
  HeartPulse,
  LayoutDashboard,
  MessageCircle,
  FileText,
  CreditCard,
  HelpCircle,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/firebase';
import { useCompany } from '@/hooks/useFirestore';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import {
  canAccessProfessionalsMenu,
  canViewAllAgendas,
  hasFullFinancialAccess,
} from '@/lib/permissions';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  roles?: string[];
  checkPermission?: (user: any) => boolean; // Função para verificar permissão granular
  submenu?: NavigationItem[]; // Submenu items
}

const navigation: NavigationItem[] = [
  { name: 'Painel Admin', href: '/admin', icon: Activity, roles: ['super_admin'] },
  { name: 'Leads', href: '/admin/leads', icon: Users, roles: ['super_admin'] },
  { name: 'Empresas', href: '/admin/empresas', icon: Building2, roles: ['super_admin'] },
  { 
    name: 'Inicial', 
    href: '/', 
    icon: LayoutDashboard, 
    roles: ['owner', 'admin', 'pro', 'atendente', 'outro']
  },
  { 
    name: 'Agenda', 
    href: '/agenda', 
    icon: Calendar, 
    roles: ['owner', 'admin', 'pro', 'atendente', 'outro'],
    checkPermission: (user) => {
      // Para tipo 'outro', verificar se tem permissão de visualização ou edição
      if (user?.role === 'outro') {
        return user?.permissions?.agendaVisualizacao || user?.permissions?.agendaEdicao || false;
      }
      return true; // Para outros roles, sempre permitir
    }
  },
  { 
    name: 'Pacientes', 
    href: '/pacientes', 
    icon: HeartPulse, 
    roles: ['owner', 'admin', 'pro', 'atendente', 'outro']
  },
  { 
    name: 'Mensagens', 
    href: '/mensagens', 
    icon: MessageCircle, 
    roles: ['owner', 'admin', 'atendente', 'outro']
  },
  { 
    name: 'Relatórios', 
    href: '/relatorios', 
    icon: BarChart3, 
    roles: ['owner', 'admin', 'outro'],
    checkPermission: (user) => hasFullFinancialAccess(user)
  },
  { 
    name: 'Configurações', 
    icon: Settings, 
    roles: ['owner', 'admin'],
    submenu: [
      {
        name: 'Geral',
        href: '/configuracoes',
        icon: Settings,
        roles: ['owner', 'admin']
      },
      { 
        name: 'Profissionais', 
        href: '/profissionais', 
        icon: UserCheck, 
        roles: ['owner', 'admin', 'outro'],
        checkPermission: (user) => canAccessProfessionalsMenu(user)
      },
      { 
        name: 'Serviços', 
        href: '/servicos', 
        icon: Package, 
        roles: ['owner', 'admin', 'pro', 'atendente', 'outro']
      },
      { name: 'Usuários', href: '/usuarios', icon: Users, roles: ['owner', 'admin'] },
      { name: 'Modelos de anamnese', href: '/configuracoes/modelos-anamnese', icon: FileText, roles: ['owner', 'admin'] },
      { name: 'Plano', href: '/plano', icon: CreditCard, roles: ['owner', 'admin'] },
      { name: 'Meu Perfil', href: '/perfil', icon: User, roles: ['owner', 'admin', 'pro', 'atendente', 'outro'] },
    ]
  },
  { 
    name: 'Ajuda', 
    href: '/ajuda', 
    icon: HelpCircle, 
    roles: ['owner', 'admin', 'pro', 'atendente', 'outro']
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [logoError, setLogoError] = useState(false);
  const pathname = usePathname();
  const { user, role, loading, companyId, contextCount, themePreference, customColor, customColor2, userData } = useAuth();
  const { company } = useCompany(companyId);
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyle = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const customerLabels = useCustomerLabels();
  
  // Resetar erro do logo quando a empresa mudar
  useEffect(() => {
    setLogoError(false);
  }, [company?.logoUrl]);
  
  // Criar objeto user completo com permissões para verificação
  const userWithPermissions = userData && user ? {
    uid: user.uid,
    role: userData.role,
    permissions: userData.permissions,
  } : null;

  // Função para traduzir roles para nomes amigáveis
  const getRoleDisplayName = (role: string | null) => {
    if (!role) return 'Admin';
    
    const roleMap: Record<string, string> = {
      'super_admin': 'Super Administrador',
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'pro': 'Profissional',
      'atendente': 'Atendente',
      'outro': 'Recepcionista'
    };
    
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Detecta se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Em modo desenvolvimento, sempre mostrar o sidebar em desktop
  const shouldShowSidebar = process.env.NODE_ENV === 'development' || (user && role);

  const handleLogout = async () => {
    try {
      await logout();
      // Redirecionar para a página de login após logout
      window.location.href = '/signin';
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const handleSwitchContext = () => {
    // Limpar contexto salvo para forçar nova seleção
    localStorage.removeItem('selectedContext');
    // Redirecionar para página de seleção de contexto
    window.location.href = '/contexto';
  };

  // Função recursiva para filtrar navegação incluindo submenus
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    if (!role) return [];
    
    const normalizedRole = role.toLowerCase();
    
    return items.filter(item => {
      // Verificar se o role tem acesso básico
      if (!item.roles || !item.roles.some(r => r === normalizedRole)) {
        return false;
      }
      
      // Se há função de verificação de permissão, usar ela
      if (item.checkPermission) {
        if (!item.checkPermission(userWithPermissions)) {
          return false;
        }
      }
      
      return true;
    }).map(item => {
      // Se tem submenu, filtrar recursivamente
      if (item.submenu) {
        const filteredSubmenu = filterNavigationItems(item.submenu);
        if (filteredSubmenu.length === 0) {
          return null; // Será filtrado depois
        }
        return {
          ...item,
          submenu: filteredSubmenu
        };
      }
      return item;
    }).filter((item): item is NavigationItem => item !== null);
  };

  // Filtrar navegação baseado na role do usuário e permissões granulares (memoizado)
  const filteredNavigation = useMemo(() => {
    return filterNavigationItems(navigation);
  }, [role, userWithPermissions]);

  // Função para verificar se um item ou seus submenus estão ativos
  const isItemOrSubmenuActive = (item: NavigationItem): boolean => {
    if (item.href) {
      const isActive = item.href === '/' 
        ? pathname === '/' 
        : pathname === item.href || pathname.startsWith(item.href + '/');
      if (isActive) return true;
    }
    
    if (item.submenu) {
      return item.submenu.some(subItem => isItemOrSubmenuActive(subItem));
    }
    
    return false;
  };

  // Função para toggle submenu
  const toggleSubmenu = (itemName: string) => {
    setOpenSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Auto-abrir submenus se a rota atual estiver dentro deles
  useEffect(() => {
    if (!filteredNavigation.length) return;
    
    const newOpenSubmenus = new Set<string>();
    
    const checkAndOpenSubmenus = (items: NavigationItem[], parentName?: string): boolean => {
      let hasActive = false;
      
      items.forEach(item => {
        if (item.submenu) {
          const hasActiveChild = item.submenu.some(subItem => {
            if (subItem.href) {
              const isActive = subItem.href === '/' 
                ? pathname === '/' 
                : pathname === subItem.href || pathname.startsWith(subItem.href + '/');
              return isActive;
            }
            // Verificar recursivamente em submenus aninhados
            if (subItem.submenu) {
              const menuKey = parentName ? `${parentName}-${item.name}` : item.name;
              return checkAndOpenSubmenus([subItem], menuKey);
            }
            return false;
          });
          
          if (hasActiveChild) {
            const menuKey = parentName ? `${parentName}-${item.name}` : item.name;
            newOpenSubmenus.add(menuKey);
            checkAndOpenSubmenus(item.submenu, menuKey);
            hasActive = true;
          }
        }
      });
      
      return hasActive;
    };
    
    checkAndOpenSubmenus(filteredNavigation);
    
    // Só atualizar se houver mudanças
    if (newOpenSubmenus.size > 0) {
      setOpenSubmenus(prev => {
        // Verificar se já tem todos os submenus abertos
        const allAlreadyOpen = Array.from(newOpenSubmenus).every(key => prev.has(key));
        if (allAlreadyOpen) {
          return prev; // Não há mudanças, retornar o mesmo Set
        }
        // Criar novo Set combinando os anteriores com os novos
        return new Set([...Array.from(prev), ...Array.from(newOpenSubmenus)]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Não mostrar sidebar na página de login
  if (pathname === '/signin') {
    return null;
  }

  // Não renderizar sidebar se não estiver logado ou ainda carregando
  if (!shouldShowSidebar) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <motion.div
          className="lg:hidden fixed top-4 left-4 z-50 sm:top-5 md:top-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'h-10 w-10 border shadow-sm transition-colors',
              hasGradient
                ? 'bg-white/80 border-white/30 text-slate-700 hover:bg-white/90'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
              isOpen && 'opacity-0 pointer-events-none'
            )}
          >
            {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </motion.div>
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isMobile ? (isOpen ? 0 : '-100%') : 0,
          opacity: isMobile ? (isOpen ? 1 : 0) : 1
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 sm:w-72 border-r lg:translate-x-0 lg:static lg:inset-0 backdrop-blur-lg',
          hasGradient ? 'bg-white/80 border-white/20 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={cn(
              'flex items-center justify-between gap-3 px-5 py-4 border-b',
              hasGradient ? 'border-white/20 bg-white/40' : 'border-slate-200 bg-white'
            )}
          >
            <div className="flex items-center gap-3">
              {company?.logoUrl && !logoError ? (
                <motion.div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden cursor-pointer bg-muted/20 border-2 border-dashed border-input'
                  )}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  title={company.nome}
                >
                  <img
                    src={company.logoUrl}
                    alt={`Logo ${company.nome}`}
                    className="h-full w-full object-contain transition-transform duration-200"
                    onError={() => setLogoError(true)}
                  />
                </motion.div>
              ) : (
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm',
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
                  <Sparkles className="w-6 h-6" />
                </div>
              )}
              <div>
                <h1 className="text-sm font-semibold text-slate-900">AllOne</h1>
                <p className={cn('text-xs', hasGradient ? 'text-slate-600' : 'text-slate-500')}>Portal de Gestão</p>
              </div>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'lg:hidden h-9 w-9 text-slate-500 hover:text-slate-900',
                  hasGradient ? 'hover:bg-white/70' : 'hover:bg-slate-100'
                )}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* User info */}
          <div
            className={cn(
              'p-4 border-b',
              hasGradient ? 'border-white/20 bg-white/30' : 'border-slate-200 bg-slate-50'
            )}
          >
            <AnimatePresence mode="wait">
              {company && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   whileHover={{ scale: 1.02 }}
                   className={cn(
                     'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-sm',
                     hasGradient ? 'border-white/20 bg-white/70' : 'border-slate-200 bg-white'
                   )}
                 >
                  <Building2 className={cn('w-4 h-4 flex-shrink-0', hasGradient ? 'text-slate-600' : 'text-slate-500')} />
                  <p className={cn('text-xs font-semibold truncate', 'text-slate-700')}>
                    {company.nome}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm',
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
                  <span className="font-bold text-base">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.displayName || user?.email || 'Usuário'}
                </p>
                <p className={cn('text-xs font-medium capitalize', hasGradient ? 'text-slate-600' : 'text-slate-500')}>
                  {getRoleDisplayName(role)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {filteredNavigation.map((item, index) => {
                const renderNavigationItem = (navItem: NavigationItem, depth: number = 0, parentKey: string = '') => {
                  const itemKey = parentKey ? `${parentKey}-${navItem.name}` : navItem.name;
                  const isActive = navItem.href ? (navItem.href === '/' 
                    ? pathname === '/' 
                    : pathname === navItem.href || pathname.startsWith(navItem.href + '/')) : false;
                  const hasSubmenu = navItem.submenu && navItem.submenu.length > 0;
                  const isSubmenuOpen = openSubmenus.has(itemKey);
                  const displayName = navItem.name === 'Pacientes' ? customerLabels.pluralTitle : navItem.name;
                  const isItemActive = isItemOrSubmenuActive(navItem);

                  return (
                    <div key={itemKey}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 + depth * 0.02 }}
                      >
                        {hasSubmenu ? (
                          <div className="flex items-center gap-1">
                            {navItem.href ? (
                              <>
                                <Link
                                  href={navItem.href}
                                  onClick={() => setIsOpen(false)}
                                  className="flex-1"
                                >
                                  <motion.div
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                      'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                                      isActive
                                        ? isVibrant
                                          ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                                          : isCustom && gradientStyleHorizontal
                                          ? 'text-white shadow-lg'
                                          : 'bg-slate-900 text-white shadow-sm'
                                        : hasGradient
                                          ? 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    )}
                                    style={
                                      isActive && isCustom && gradientStyleHorizontal
                                        ? gradientStyleHorizontal
                                        : undefined
                                    }
                                  >
                                    <motion.div
                                      whileHover={{ rotate: isActive ? 0 : 10 }}
                                      className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                        isActive
                                          ? hasGradient
                                            ? 'bg-white/20'
                                            : 'bg-white/10'
                                          : hasGradient
                                            ? 'bg-white/50 group-hover:bg-white/70'
                                            : 'bg-slate-100 group-hover:bg-slate-200'
                                      )}
                                    >
                                      <navItem.icon
                                        className={cn(
                                          'w-5 h-5 flex-shrink-0',
                                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                                        )}
                                      />
                                    </motion.div>
                                    <span
                                      className={cn(
                                        'flex-1 text-left',
                                        isActive 
                                          ? 'text-white' 
                                          : hasGradient
                                            ? 'text-slate-600 group-hover:text-slate-900'
                                            : 'text-slate-600 group-hover:text-slate-900'
                                      )}
                                    >
                                      {displayName}
                                    </span>
                                  </motion.div>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubmenu(itemKey);
                                  }}
                                  className={cn(
                                    'p-2 rounded-lg transition-colors',
                                    isActive
                                      ? 'text-white hover:bg-white/20'
                                      : hasGradient
                                        ? 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                  )}
                                >
                                  <motion.div
                                    animate={{ rotate: isSubmenuOpen ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'h-4 w-4 transition-all',
                                        isActive
                                          ? 'text-white'
                                          : 'text-slate-300 group-hover:text-slate-500'
                                      )}
                                    />
                                  </motion.div>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => toggleSubmenu(itemKey)}
                                className="w-full flex items-center gap-1"
                              >
                                <div className="flex-1">
                                  <motion.div
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                      'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                                      isItemActive
                                        ? isVibrant
                                          ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                                          : isCustom && gradientStyleHorizontal
                                          ? 'text-white shadow-lg'
                                          : 'bg-slate-900 text-white shadow-sm'
                                        : hasGradient
                                          ? 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    )}
                                    style={
                                      isItemActive && isCustom && gradientStyleHorizontal
                                        ? gradientStyleHorizontal
                                        : undefined
                                    }
                                  >
                                    <motion.div
                                      whileHover={{ rotate: isItemActive ? 0 : 10 }}
                                      className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                        isItemActive
                                          ? hasGradient
                                            ? 'bg-white/20'
                                            : 'bg-white/10'
                                          : hasGradient
                                            ? 'bg-white/50 group-hover:bg-white/70'
                                            : 'bg-slate-100 group-hover:bg-slate-200'
                                      )}
                                    >
                                      <navItem.icon
                                        className={cn(
                                          'w-5 h-5 flex-shrink-0',
                                          isItemActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                                        )}
                                      />
                                    </motion.div>
                                    <span
                                      className={cn(
                                        'flex-1 text-left',
                                        isItemActive 
                                          ? 'text-white' 
                                          : hasGradient
                                            ? 'text-slate-600 group-hover:text-slate-900'
                                            : 'text-slate-600 group-hover:text-slate-900'
                                      )}
                                    >
                                      {displayName}
                                    </span>
                                  </motion.div>
                                </div>
                                <div className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  isItemActive
                                    ? 'text-white'
                                    : hasGradient
                                      ? 'text-slate-500'
                                      : 'text-slate-500'
                                )}>
                                  <motion.div
                                    animate={{ rotate: isSubmenuOpen ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'h-4 w-4 transition-all',
                                        isItemActive
                                          ? 'text-white'
                                          : 'text-slate-300'
                                      )}
                                    />
                                  </motion.div>
                                </div>
                              </button>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={navItem.href || '#'}
                            onClick={() => setIsOpen(false)}
                          >
                              <motion.div
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                                  depth > 0 && 'ml-6',
                                  isActive
                                    ? isVibrant
                                      ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg'
                                      : isCustom && gradientStyleHorizontal
                                      ? 'text-white shadow-lg'
                                      : 'bg-slate-900 text-white shadow-sm'
                                    : hasGradient
                                      ? 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                )}
                                style={
                                  isActive && isCustom && gradientStyleHorizontal
                                    ? gradientStyleHorizontal
                                    : undefined
                                }
                              >
                                <motion.div
                                  whileHover={{ rotate: isActive ? 0 : 10 }}
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                    isActive
                                      ? hasGradient
                                        ? 'bg-white/20'
                                        : 'bg-white/10'
                                      : hasGradient
                                        ? 'bg-white/50 group-hover:bg-white/70'
                                        : 'bg-slate-100 group-hover:bg-slate-200'
                                  )}
                                >
                                  <navItem.icon
                                    className={cn(
                                      'w-5 h-5 flex-shrink-0',
                                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                                    )}
                                  />
                                </motion.div>
                                <span
                                  className={cn(
                                    'flex-1',
                                    isActive 
                                      ? 'text-white' 
                                      : hasGradient
                                        ? 'text-slate-600 group-hover:text-slate-900'
                                        : 'text-slate-600 group-hover:text-slate-900'
                                  )}
                                >
                                  {displayName}
                                </span>
                                {depth === 0 && (
                                  <ChevronRight
                                    className={cn(
                                      'ml-auto h-4 w-4 transition-all',
                                      isActive
                                        ? 'text-white'
                                        : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1'
                                    )}
                                  />
                                )}
                              </motion.div>
                            </Link>
                        )}
                      </motion.div>
                      
                      {/* Renderizar submenu */}
                      {hasSubmenu && (
                        <AnimatePresence>
                          {isSubmenuOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                                {navItem.submenu!.map((subItem) => renderNavigationItem(subItem, depth + 1, itemKey))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  );
                };

                return renderNavigationItem(item);
              })}
            </div>
          </nav>

          {/* Switch Context */}
          {contextCount > 1 && (
            <div
              className={cn(
                'p-3 border-t',
                hasGradient ? 'border-white/20 bg-white/50' : 'border-slate-200 bg-white'
              )}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  variant="ghost"
                  onClick={handleSwitchContext}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                    hasGradient
                      ? 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                  Trocar Empresa/Perfil
                </Button>
              </motion.div>
            </div>
          )}

          {/* Logout */}
          <div
            className={cn(
              'p-3 border-t',
              hasGradient ? 'border-white/20 bg-white/50' : 'border-slate-200 bg-white'
            )}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                  hasGradient
                    ? 'text-red-600 hover:bg-red-100/60'
                    : 'text-red-600 hover:bg-red-50'
                )}
              >
                <LogOut className="w-5 h-5" />
                Sair da conta
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Overlay */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
