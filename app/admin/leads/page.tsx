'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { useCompanies } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  Calendar,
  Search,
  Filter,
  X,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  Edit,
  Save,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Company, CompanyUser } from '@/types';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LeadCompany extends Company {
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  leadNotes?: string;
  lastContactedAt?: Date;
  contactedBy?: string;
  show?: boolean; // Campo para controlar exibição no painel administrativo
}

interface LeadUser {
  id: string;
  companyId: string;
  companyName?: string;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
  ativo: boolean;
  createdAt: Date;
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  leadNotes?: string;
  lastContactedAt?: Date;
  show?: boolean; // Campo para controlar exibição no painel administrativo
}

type TabType = 'companies' | 'users';
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'all';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  converted: 'Convertido',
  lost: 'Perdido',
};

export default function LeadsPage() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus>('all');
  const [selectedCompany, setSelectedCompany] = useState<LeadCompany | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeadUser | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [users, setUsers] = useState<LeadUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Carregar usuários de todas as empresas (apenas empresas com show !== false)
  useEffect(() => {
    const loadAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const allUsers: LeadUser[] = [];
        
        // Filtrar apenas empresas que devem ser exibidas (show !== false)
        const visibleCompanies = companies.filter(company => {
          const show = (company as any).show !== undefined ? (company as any).show : true;
          return show !== false;
        });
        
        // Para cada empresa visível, buscar seus usuários
        for (const company of visibleCompanies) {
          try {
            const usersQuery = query(
              collection(db, `companies/${company.id}/users`),
              orderBy('createdAt', 'desc')
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            usersSnapshot.docs.forEach(doc => {
              const data = doc.data();
              // Verificar se o usuário também tem show !== false
              const userShow = data.show !== undefined ? data.show : true;
              
              if (userShow !== false) {
                allUsers.push({
                  id: doc.id,
                  companyId: company.id,
                  companyName: company.nome,
                  nome: data.nome || '',
                  email: data.email || '',
                  telefone: data.telefoneE164 || data.telefone || '',
                  role: data.role || '',
                  ativo: data.ativo !== false,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  leadStatus: data.leadStatus || 'new',
                  leadNotes: data.leadNotes || '',
                  lastContactedAt: data.lastContactedAt?.toDate(),
                  show: userShow,
                });
              }
            });
          } catch (error) {
            console.error(`Erro ao carregar usuários da empresa ${company.id}:`, error);
          }
        }
        
        setUsers(allUsers);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (companies.length > 0) {
      loadAllUsers();
    }
  }, [companies]);

  // Converter empresas para LeadCompany e filtrar apenas empresas que devem ser exibidas
  const leadCompanies: LeadCompany[] = useMemo(() => {
    return companies
      .filter(company => {
        // Verificar campo 'show' - se não existir, considerar como true (mostrar por padrão)
        const show = (company as any).show !== undefined ? (company as any).show : true;
        return show !== false; // Mostrar apenas se show não for false
      })
      .map(company => {
        // Converter trialEndsAt de Timestamp para Date se necessário
        let trialEndsAt: Date | undefined;
        if (company.trialEndsAt) {
          const trialEndsAtValue = company.trialEndsAt as any;
          if (trialEndsAtValue instanceof Date) {
            trialEndsAt = trialEndsAtValue;
          } else if (trialEndsAtValue.toDate && typeof trialEndsAtValue.toDate === 'function') {
            trialEndsAt = trialEndsAtValue.toDate();
          } else if (trialEndsAtValue.seconds) {
            trialEndsAt = new Date(trialEndsAtValue.seconds * 1000);
          }
        }

        return {
          ...company,
          trialEndsAt,
          leadStatus: (company as any).leadStatus || 'new',
          leadNotes: (company as any).leadNotes || '',
          lastContactedAt: (company as any).lastContactedAt?.toDate?.(),
          show: (company as any).show !== undefined ? (company as any).show : true,
        };
      });
  }, [companies]);

  // Filtrar empresas
  const filteredCompanies = useMemo(() => {
    let filtered = leadCompanies;

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(company =>
        company.nome.toLowerCase().includes(term) ||
        company.email?.toLowerCase().includes(term) ||
        company.telefone?.includes(term) ||
        company.cnpj?.includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(company => company.leadStatus === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [leadCompanies, searchTerm, statusFilter]);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.nome.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.companyName?.toLowerCase().includes(term) ||
        user.telefone?.includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.leadStatus === statusFilter);
    }

    return filtered.sort((a, b) => {
      // Ordenar primeiro pelo nome da empresa
      const companyA = (a.companyName || a.companyId || '').toLowerCase();
      const companyB = (b.companyName || b.companyId || '').toLowerCase();
      
      if (companyA !== companyB) {
        return companyA.localeCompare(companyB, 'pt-BR');
      }
      
      // Se a empresa for a mesma, ordenar pelo nome do usuário
      return a.nome.toLowerCase().localeCompare(b.nome.toLowerCase(), 'pt-BR');
    });
  }, [users, searchTerm, statusFilter]);

  const handleStatusChange = async (item: LeadCompany | LeadUser, newStatus: LeadStatus) => {
    if (newStatus === 'all') return;

    try {
      if (activeTab === 'companies') {
        const company = item as LeadCompany;
        // Atualizar no Firestore
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'companies', company.id), {
          leadStatus: newStatus,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const user = item as LeadUser;
        // Atualizar no Firestore
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, `companies/${user.companyId}/users`, user.id), {
          leadStatus: newStatus,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCompany && !selectedUser) return;

    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      
      if (activeTab === 'companies' && selectedCompany) {
        await updateDoc(doc(db, 'companies', selectedCompany.id), {
          leadNotes: editingNotes,
          updatedAt: new Date(),
        });
      } else if (activeTab === 'users' && selectedUser) {
        await updateDoc(doc(db, `companies/${selectedUser.companyId}/users`, selectedUser.id), {
          leadNotes: editingNotes,
          updatedAt: new Date(),
        });
      }
      
      setIsEditingNotes(false);
      setSelectedCompany(null);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
    }
  };

  const handleToggleShow = async (item: LeadCompany | LeadUser, newShowValue: boolean) => {
    try {
      const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
      
      if (activeTab === 'companies') {
        const company = item as LeadCompany;
        await updateDoc(doc(db, 'companies', company.id), {
          show: newShowValue,
          updatedAt: Timestamp.now(),
        });
      } else {
        const user = item as LeadUser;
        await updateDoc(doc(db, `companies/${user.companyId}/users`, user.id), {
          show: newShowValue,
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar campo show:', error);
    }
  };

  // Função para gerar cor baseada no nome da empresa
  const getCompanyColor = (companyName: string | undefined, companyId: string): string => {
    const name = companyName || companyId;
    
    // Array de cores suaves para fundo
    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-purple-50 border-purple-200',
      'bg-yellow-50 border-yellow-200',
      'bg-pink-50 border-pink-200',
      'bg-indigo-50 border-indigo-200',
      'bg-orange-50 border-orange-200',
      'bg-teal-50 border-teal-200',
      'bg-cyan-50 border-cyan-200',
      'bg-rose-50 border-rose-200',
      'bg-amber-50 border-amber-200',
      'bg-emerald-50 border-emerald-200',
    ];
    
    // Gerar índice baseado no hash do nome
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const stats = useMemo(() => {
    const totalCompanies = leadCompanies.length;
    const newCompanies = leadCompanies.filter(c => c.leadStatus === 'new').length;
    const contactedCompanies = leadCompanies.filter(c => c.leadStatus === 'contacted').length;
    const convertedCompanies = leadCompanies.filter(c => c.leadStatus === 'converted').length;

    const totalUsers = users.length;
    const newUsers = users.filter(u => u.leadStatus === 'new').length;
    const contactedUsers = users.filter(u => u.leadStatus === 'contacted').length;
    const convertedUsers = users.filter(u => u.leadStatus === 'converted').length;

    return {
      companies: { total: totalCompanies, new: newCompanies, contacted: contactedCompanies, converted: convertedCompanies },
      users: { total: totalUsers, new: newUsers, contacted: contactedUsers, converted: convertedUsers },
    };
  }, [leadCompanies, users]);

  return (
    <AccessGuard allowed={['super_admin']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  Gestão de Leads
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Rastreamento de empresas e usuários cadastrados
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Empresas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.companies.total}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Novas Empresas</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.companies.new}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Usuários</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Convertidos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.companies.converted + stats.users.converted}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, email, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeadStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os status</option>
                    <option value="new">Novo</option>
                    <option value="contacted">Contatado</option>
                    <option value="qualified">Qualificado</option>
                    <option value="converted">Convertido</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'companies'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empresas ({filteredCompanies.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários ({filteredUsers.length})
              </div>
            </button>
          </div>

          {/* Companies List */}
          {activeTab === 'companies' && (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Empresas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhuma empresa encontrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Empresa</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contato</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cadastro</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fim do Teste</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map((company) => (
                          <tr
                            key={company.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900">{company.nome}</p>
                                {company.cnpj && (
                                  <p className="text-xs text-gray-500">CNPJ: {company.cnpj}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                {company.email && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Mail className="w-3 h-3" />
                                    {company.email}
                                  </div>
                                )}
                                {company.telefone && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {company.telefone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">
                                {company.tipoEstabelecimento || 'Não informado'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={company.leadStatus || 'new'}
                                onChange={(e) => handleStatusChange(company, e.target.value as LeadStatus)}
                                className={`px-2 py-1 rounded text-xs font-medium border-0 ${STATUS_COLORS[company.leadStatus || 'new']}`}
                              >
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {format(
                                company.createdAt instanceof Date ? company.createdAt : new Date(company.createdAt),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {company.trialEndsAt ? (
                                (() => {
                                  let trialEndDate: Date;
                                  const trialEndsAtValue = company.trialEndsAt as any;
                                  if (trialEndsAtValue instanceof Date) {
                                    trialEndDate = trialEndsAtValue;
                                  } else if (trialEndsAtValue?.toDate && typeof trialEndsAtValue.toDate === 'function') {
                                    trialEndDate = trialEndsAtValue.toDate();
                                  } else if (trialEndsAtValue?.seconds) {
                                    trialEndDate = new Date(trialEndsAtValue.seconds * 1000);
                                  } else {
                                    trialEndDate = new Date(trialEndsAtValue);
                                  }
                                  
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const endDate = new Date(trialEndDate);
                                  endDate.setHours(0, 0, 0, 0);
                                  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                  const isExpired = daysRemaining < 0;
                                  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
                                  
                                  return (
                                    <div>
                                      <p className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                                        {format(trialEndDate, "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                      {isExpired ? (
                                        <p className="text-xs text-red-500">Expirado</p>
                                      ) : isExpiringSoon ? (
                                        <p className="text-xs text-orange-500">{daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}</p>
                                      ) : (
                                        <p className="text-xs text-gray-500">{daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}</p>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-gray-400">Não informado</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setEditingNotes(company.leadNotes || '');
                                  setIsEditingNotes(true);
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          {activeTab === 'users' && (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Usuário</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Empresa</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contato</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Perfil</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cadastro</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => {
                          const companyColor = getCompanyColor(user.companyName, user.companyId);
                          return (
                          <tr
                            key={`${user.companyId}-${user.id}`}
                            className={`border-b ${companyColor} hover:opacity-80 transition-all`}
                          >
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{user.nome}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-600">{user.companyName || user.companyId}</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </div>
                                {user.telefone && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {user.telefone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{user.role}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={user.leadStatus || 'new'}
                                onChange={(e) => handleStatusChange(user, e.target.value as LeadStatus)}
                                className={`px-2 py-1 rounded text-xs font-medium border-0 ${STATUS_COLORS[user.leadStatus || 'new']}`}
                              >
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {format(user.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditingNotes(user.leadNotes || '');
                                  setIsEditingNotes(true);
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Modal */}
          {(selectedCompany || selectedUser) && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setSelectedCompany(null);
                setSelectedUser(null);
                setIsEditingNotes(false);
              }}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Notas - {activeTab === 'companies' ? selectedCompany?.nome : selectedUser?.nome}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCompany(null);
                        setSelectedUser(null);
                        setIsEditingNotes(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notas do Lead
                      </label>
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                        placeholder="Adicione notas sobre o contato com este lead..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedCompany(null);
                          setSelectedUser(null);
                          setIsEditingNotes(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveNotes}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}

