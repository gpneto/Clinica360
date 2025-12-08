'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where, writeBatch } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';
import { TipoEstabelecimento } from '@/types';

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

interface ExistingCompany {
  companyId: string;
  companyName: string;
  userRole: string;
}

export default function SetupPage() {
  const { user, needsCompanySetup, loading, switchContext } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(true);
  const [existingCompanies, setExistingCompanies] = useState<ExistingCompany[]>([]);
  const [showCompanyChoice, setShowCompanyChoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [tipoEstabelecimento, setTipoEstabelecimento] = useState<TipoEstabelecimento | undefined>(undefined);
  const [customerLabel, setCustomerLabel] = useState<'paciente' | 'cliente'>('paciente');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/signin');
      } else if (!needsCompanySetup) {
        router.replace('/agenda');
      }
    }
  }, [loading, user, needsCompanySetup, router]);

  // Verificar se o email já existe em alguma empresa (mesma lógica da troca de contexto)
  useEffect(() => {
    const checkExistingEmail = async () => {
      if (!user?.email || loading) {
        setCheckingEmail(false);
        return;
      }

      try {
        setCheckingEmail(true);
        const foundCompanies: ExistingCompany[] = [];

        // Buscar em todas as empresas (mesma lógica do auth-context)
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        
        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id;
          const companyData = companyDoc.data();
          
          // Buscar usuários desta empresa com este email (mesma query do auth-context)
          const usersQuery = query(
            collection(db, `companies/${companyId}/users`),
            where('email', '==', user.email)
          );
          
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            // Pegar o primeiro usuário encontrado (pode haver múltiplos perfis)
            const userData = usersSnapshot.docs[0].data();
            foundCompanies.push({
              companyId,
              companyName: companyData.nome || 'Empresa sem nome',
              userRole: userData.role || 'unknown',
            });
          }
        }

        if (foundCompanies.length > 0) {
          setExistingCompanies(foundCompanies);
          setShowCompanyChoice(true);
        } else {
          // Se não encontrou, continuar com o fluxo normal
          setShowCompanyChoice(false);
        }
      } catch (error) {
        console.error('[Setup] Erro ao verificar email existente:', error);
        // Em caso de erro, continuar com o fluxo normal
        setShowCompanyChoice(false);
      } finally {
        setCheckingEmail(false);
      }
    };

    if (user && !loading && needsCompanySetup) {
      checkExistingEmail();
    }
  }, [user, loading, needsCompanySetup]);

  useEffect(() => {
    if (user?.email) {
      setCompanyEmail(user.email);
    }
    if (user?.displayName) {
      setCompanyName((prev) => prev || `${user.displayName} - Empresa`);
    }
  }, [user]);

  const handleUseExistingCompany = async (companyId: string, role: string) => {
    try {
      setSubmitting(true);
      
      // Adicionar o usuário atual à empresa se ainda não estiver
      const userRef = doc(db, `companies/${companyId}/users`, user!.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user!.uid,
          nome: user!.displayName || user!.email || 'Usuário',
          email: user!.email?.toLowerCase() || '',
          role: role,
          ativo: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Atualizar o documento do usuário
      await setDoc(doc(db, 'users', user!.uid), {
        nome: user!.displayName || user!.email || 'Usuário',
        email: (user!.email || '').toLowerCase(),
        role: role,
        ativo: true,
        companyId: companyId,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      showSuccess('Você foi vinculado à empresa existente!');
      await switchContext({
        companyId: companyId,
        role: role,
      });
      router.push('/');
    } catch (error: any) {
      console.error('[Setup] Erro ao vincular à empresa existente:', error);
      showError('Erro ao vincular à empresa. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNewCompany = () => {
    setShowCompanyChoice(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!companyName) {
      showError('Informe o nome da empresa.');
      return;
    }

    try {
      setSubmitting(true);
      const now = Timestamp.now();
      const trialEnds = Timestamp.fromDate(new Date(now.toDate().getTime() + 15 * 24 * 60 * 60 * 1000));
      const companyDoc = await addDoc(collection(db, 'companies'), {
        nome: companyName,
        tipoEstabelecimento: tipoEstabelecimento || null,
        email: companyEmail || user.email || '',
        telefone: companyPhone,
        cnpj,
        ativo: true,
        trialStartedAt: now,
        trialEndsAt: trialEnds,
        subscriptionActive: false,
        createdAt: now,
        updatedAt: now,
        ownerUid: user.uid,
      });

      await setDoc(doc(db, `companies/${companyDoc.id}/users`, user.uid), {
        uid: user.uid,
        nome: user.displayName || companyName,
        email: user.email || companyEmail,
        role: 'owner',
        ativo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        nome: user.displayName || companyName,
        email: (user.email || companyEmail).toLowerCase(),
        role: 'owner',
        ativo: true,
        companyId: companyDoc.id,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      const defaultSettings = {
        nomeSalao: companyName,
        telefoneSalao: companyPhone,
        emailSalao: companyEmail || user.email || '',
        enderecoSalao: companyAddress,
        whatsappProvider: 'disabled' as const,
        customerLabel,
        horarioFuncionamento: {
          inicio: '08:00',
          fim: '18:00',
          diasSemana: [1, 2, 3, 4, 5],
        },
        horarioFuncionamentoCustom: false,
        notificacoes: {
          lembreteAgendamento: true,
          confirmacaoAutomatica: true,
        },
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, `companies/${companyDoc.id}/settings`, 'general'),
        defaultSettings,
        { merge: true }
      );

      // Atualizar collection whatsappPhoneNumbers se houver número de telefone
      const phoneNumber = defaultSettings.telefoneSalao;
      if (phoneNumber) {
        try {
          const normalizePhone = (value: string) => value.replace(/\D/g, '');
          const generatePhoneVariants = (phone: string): Set<string> => {
            const normalized = normalizePhone(phone);
            if (!normalized || normalized.length < 10) return new Set();
            
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

          const variants = generatePhoneVariants(phoneNumber);
          const normalized = normalizePhone(phoneNumber);
          const batch = writeBatch(db);
          const timestamp = Timestamp.now();

          for (const variant of Array.from(variants)) {
            const phoneRef = doc(db, 'whatsappPhoneNumbers', variant);
            batch.set(phoneRef, {
              companyId: companyDoc.id,
              phoneNumber: normalized,
              originalPhoneNumber: phoneNumber,
              updatedAt: timestamp,
            }, { merge: true });
          }

          await batch.commit();
          console.log(`[Setup] ✅ Mapeamento de telefone criado: ${normalized} -> ${companyDoc.id}`);
        } catch (error) {
          console.error('[Setup] Erro ao atualizar whatsappPhoneNumbers:', error);
          // Não bloquear a criação se falhar
        }
      }

      showSuccess('Empresa criada com sucesso!');
      await switchContext({
        companyId: companyDoc.id,
        role: 'owner',
      });
      router.push('/');
    } catch (error: any) {
      console.error('[Setup] Erro ao criar empresa', error);
      const message = error?.message || 'Erro ao criar a empresa. Tente novamente.';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Mostrar carregando apenas enquanto está carregando ou se não há usuário
  // Se não precisa de setup, redirecionar (já tratado no useEffect)
  if (loading || !user || checkingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // Se não precisa de setup, não mostrar nada (o useEffect vai redirecionar)
  if (!needsCompanySetup) {
    return null;
  }

  // Mostrar tela de escolha se encontrou empresas existentes
  if (showCompanyChoice && existingCompanies.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Email já cadastrado</h1>
              <p className="text-slate-200 mt-1">
                Este email já está vinculado a {existingCompanies.length} empresa{existingCompanies.length > 1 ? 's' : ''}. O que você deseja fazer?
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {existingCompanies.map((company) => (
              <motion.div
                key={company.companyId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/20 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => handleUseExistingCompany(company.companyId, company.userRole)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{company.companyName}</h3>
                      <p className="text-sm text-slate-300 mt-1">
                        Perfil: {company.userRole === 'owner' ? 'Proprietário' : 
                                 company.userRole === 'admin' ? 'Administrador' :
                                 company.userRole === 'pro' ? 'Profissional' :
                                 company.userRole === 'atendente' ? 'Atendente' : 'Usuário'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-white/20 pt-6">
            <Button
              type="button"
              onClick={handleCreateNewCompany}
              disabled={submitting}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              Criar nova empresa com este email
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Vamos criar sua empresa</h1>
            <p className="text-slate-200 mt-1">
              Identificamos que este usuário ainda não está vinculado a nenhuma empresa. Cadastre os dados iniciais para começar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white/5 border border-white/20 rounded-2xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Informações da Empresa</h2>
              <p className="text-sm text-slate-200/80 mt-1">
                Esses dados serão usados em templates, relatórios e comunicação com clientes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Nome da empresa
              </label>
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Ex: Clínica Bem Estar"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Tipo de Estabelecimento
              </label>
              <select
                value={tipoEstabelecimento || ''}
                onChange={(e) => setTipoEstabelecimento(e.target.value as TipoEstabelecimento || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
              >
                <option value="" className="bg-slate-900 text-white">Selecione o tipo...</option>
                {TIPOS_ESTABELECIMENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value} className="bg-slate-900 text-white">
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email de contato
                </label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(event) => setCompanyEmail(event.target.value)}
                  placeholder="contato@empresa.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Telefone
                </label>
                <Input
                  value={companyPhone}
                  onChange={(event) => setCompanyPhone(event.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Endereço (opcional)
              </label>
              <Input
                value={companyAddress}
                onChange={(event) => setCompanyAddress(event.target.value)}
                placeholder="Rua Exemplo, 123 - Centro, Cidade"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                CPF ou CNPJ (opcional)
              </label>
              <Input
                value={cnpj}
                onChange={(event) => setCnpj(event.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/20 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Terminologia dos clientes</h2>
              <p className="text-sm text-slate-200/80 mt-1">
                Escolha como o sistema deve chamar seus clientes. Essa configuração pode ser alterada depois em Configurações.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Como você prefere chamar seus clientes?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerLabel('paciente')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    customerLabel === 'paciente'
                      ? 'border-blue-400 bg-blue-500/10 text-white shadow-lg'
                      : 'border-white/20 bg-white/5 text-slate-200 hover:border-white/40'
                  }`}
                >
                  <p className="text-sm font-semibold">Pacientes</p>
                  <p className="text-xs text-slate-200/80 mt-1">
                    Ideal para clínicas e consultórios de saúde.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerLabel('cliente')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    customerLabel === 'cliente'
                      ? 'border-blue-400 bg-blue-500/10 text-white shadow-lg'
                      : 'border-white/20 bg-white/5 text-slate-200 hover:border-white/40'
                  }`}
                >
                  <p className="text-sm font-semibold">Clientes</p>
                  <p className="text-xs text-slate-200/80 mt-1">
                    Perfeito para salões de beleza, estética ou outros segmentos.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Finalizar cadastro
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

