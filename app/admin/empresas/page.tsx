'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessGuard } from '@/components/AccessGuard';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Edit, Trash2, Check, X, Users, UserPlus } from 'lucide-react';
import { useCompanies, useCompanyUsers } from '@/hooks/useFirestore';
import { Company, CompanyUser, TipoEstabelecimento } from '@/types';
import { showSuccess, showError } from '@/components/ui/toast';
import { AnimatePresence as AP } from 'framer-motion';

const TIPOS_ESTABELECIMENTO: { value: TipoEstabelecimento; label: string }[] = [
  { value: 'salao_beleza', label: 'Salões de Beleza' },
  { value: 'clinica_estetica', label: 'Clínicas Estéticas' },
  { value: 'profissional_autonomo', label: 'Profissionais Autônomos' },
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'dentista', label: 'Clínica Odontológica' },
  { value: 'clinica_veterinaria', label: 'Clínicas Veterinárias' },
  { value: 'barbearia', label: 'Barbearias' },
  { value: 'estudio_tatuagem', label: 'Estúdios de Tatuagem' },
  { value: 'clinica_fisioterapia', label: 'Clínicas de Fisioterapia' },
  { value: 'psicologia', label: 'Psicologia' },
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'outros', label: 'Outros' },
];

export default function EmpresasPage() {
  const { role } = useAuth();
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    tipoEstabelecimento?: TipoEstabelecimento;
    cnpj: string;
    telefone: string;
    email: string;
    ativo: boolean;
    endereco: {
      rua: string;
      numero: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    };
  }>({
    nome: '',
    tipoEstabelecimento: undefined,
    cnpj: '',
    telefone: '',
    email: '',
    ativo: true,
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    }
  });

  const [userFormData, setUserFormData] = useState({
    nome: '',
    email: '',
    role: 'atendente' as 'owner' | 'admin' | 'pro' | 'atendente' | 'outro',
    ativo: true
  });

  const isSuperAdmin = role === 'super_admin';
  
  // Hook para usuários da empresa selecionada
  const { users: companyUsers, createCompanyUser, updateCompanyUser, deleteCompanyUser } = useCompanyUsers(selectedCompany?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
        showSuccess('Empresa atualizada com sucesso!');
      } else {
        await createCompany(formData);
        showSuccess('Empresa criada com sucesso!');
      }
      setIsModalOpen(false);
      setEditingCompany(null);
      setFormData({
        nome: '',
        tipoEstabelecimento: undefined,
        cnpj: '',
        telefone: '',
        email: '',
        ativo: true,
        endereco: {
          rua: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        }
      });
    } catch (error) {
      showError('Erro ao salvar empresa');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      nome: company.nome,
      tipoEstabelecimento: company.tipoEstabelecimento || undefined,
      cnpj: company.cnpj || '',
      telefone: company.telefone || '',
      email: company.email || '',
      ativo: company.ativo,
      endereco: company.endereco || {
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      }
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta empresa?')) {
      try {
        await deleteCompany(id);
        showSuccess('Empresa excluída com sucesso!');
      } catch (error) {
        showError('Erro ao excluir empresa');
      }
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    
    try {
      if (editingUser) {
        await updateCompanyUser(editingUser.id, userFormData);
        showSuccess('Usuário atualizado com sucesso!');
      } else {
        await createCompanyUser({
          companyId: selectedCompany.id,
          uid: '', // Será gerado automaticamente
          ...userFormData
        });
        showSuccess('Usuário criado com sucesso!');
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
      setUserFormData({
        nome: '',
        email: '',
        role: 'atendente',
        ativo: true
      });
    } catch (error) {
      showError('Erro ao salvar usuário');
    }
  };

  const handleEditUser = (user: CompanyUser) => {
    setEditingUser(user);
    setUserFormData({
      nome: user.nome,
      email: user.email,
      role: user.role,
      ativo: user.ativo
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteCompanyUser(id);
        showSuccess('Usuário excluído com sucesso!');
      } catch (error) {
        showError('Erro ao excluir usuário');
      }
    }
  };

  const handleManageUsers = (company: Company) => {
    setSelectedCompany(company);
    setIsUserModalOpen(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas super admins podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
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
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                Gerenciamento de Empresas
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gerencie empresas cadastradas no sistema
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Empresas</p>
                  <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Empresas Ativas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {companies.filter(c => c.ativo).length}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card key={company.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {company.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {company.nome}
                      </CardTitle>
                      <Badge 
                        variant={company.ativo ? "default" : "secondary"}
                        className={company.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {company.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleManageUsers(company)}
                      title="Gerenciar Usuários"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(company)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(company.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Email:</span>
                    <span>{company.email}</span>
                  </div>
                )}
                {company.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Telefone:</span>
                    <span>{company.telefone}</span>
                  </div>
                )}
                {company.cnpj && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">CNPJ:</span>
                    <span>{company.cnpj}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Empresa
                      </label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome da empresa"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Estabelecimento
                      </label>
                      <select
                        value={formData.tipoEstabelecimento || ''}
                        onChange={(e) => setFormData({ ...formData, tipoEstabelecimento: (e.target.value as TipoEstabelecimento) || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione o tipo...</option>
                        {TIPOS_ESTABELECIMENTO.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CNPJ
                        </label>
                        <Input
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone
                        </label>
                        <Input
                          value={formData.telefone}
                          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="empresa@exemplo.com"
                      />
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
                        Empresa ativa
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        {editingCompany ? 'Salvar Alterações' : 'Criar Empresa'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Usuários */}
        <AnimatePresence>
          {isUserModalOpen && selectedCompany && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setIsUserModalOpen(false);
                setSelectedCompany(null);
                setEditingUser(null);
              }}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Usuários da Empresa: {selectedCompany.nome}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Gerencie os usuários desta empresa
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingUser(null);
                        setUserFormData({
                          nome: '',
                          email: '',
                          role: 'atendente',
                          ativo: true
                        });
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </div>

                  {/* Lista de Usuários */}
                  <div className="space-y-4 mb-6">
                    {companyUsers.map((user) => (
                      <Card key={user.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {user.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{user.nome}</h3>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}
                                    className={
                                      user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                      user.role === 'pro' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {user.role === 'owner' ? 'Proprietário' :
                                     user.role === 'admin' ? 'Administrador' :
                                     user.role === 'pro' ? 'Profissional' :
                                     user.role === 'outro' ? 'Outro/Recepcionista' : 'Atendente'}
                                  </Badge>
                                  <Badge 
                                    variant={user.ativo ? "default" : "secondary"}
                                    className={user.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                  >
                                    {user.ativo ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {companyUsers.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum usuário cadastrado nesta empresa</p>
                      </div>
                    )}
                  </div>

                  {/* Formulário de Usuário */}
                  {!editingUser && (
                    <form onSubmit={handleUserSubmit} className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Novo Usuário
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome
                          </label>
                          <Input
                            value={userFormData.nome}
                            onChange={(e) => setUserFormData({ ...userFormData, nome: e.target.value })}
                            placeholder="Nome do usuário"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <Input
                            type="email"
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Usuário
                          </label>
                          <select
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="atendente">Atendente</option>
                            <option value="pro">Profissional</option>
                            <option value="outro">Outro/Recepcionista</option>
                            <option value="admin">Administrador</option>
                            <option value="owner">Proprietário</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="userAtivo"
                            checked={userFormData.ativo}
                            onChange={(e) => setUserFormData({ ...userFormData, ativo: e.target.checked })}
                            className="rounded border-gray-200"
                          />
                          <label htmlFor="userAtivo" className="text-sm font-medium text-gray-700">
                            Usuário ativo
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsUserModalOpen(false);
                            setSelectedCompany(null);
                            setEditingUser(null);
                          }}
                          className="flex-1"
                        >
                          Fechar
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Formulário de Edição de Usuário */}
                  {editingUser && (
                    <form onSubmit={handleUserSubmit} className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Editar Usuário: {editingUser.nome}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome
                          </label>
                          <Input
                            value={userFormData.nome}
                            onChange={(e) => setUserFormData({ ...userFormData, nome: e.target.value })}
                            placeholder="Nome do usuário"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <Input
                            type="email"
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Usuário
                          </label>
                          <select
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="atendente">Atendente</option>
                            <option value="pro">Profissional</option>
                            <option value="outro">Outro/Recepcionista</option>
                            <option value="admin">Administrador</option>
                            <option value="owner">Proprietário</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="userAtivoEdit"
                            checked={userFormData.ativo}
                            onChange={(e) => setUserFormData({ ...userFormData, ativo: e.target.checked })}
                            className="rounded border-gray-200"
                          />
                          <label htmlFor="userAtivoEdit" className="text-sm font-medium text-gray-700">
                            Usuário ativo
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          Salvar Alterações
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(null);
                            setUserFormData({
                              nome: '',
                              email: '',
                              role: 'atendente',
                              ativo: true
                            });
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
