'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Crown, Shield, Briefcase, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ContextOption {
  companyId: string;
  companyName: string;
  role: string;
  professionalId?: string;
  professionalName?: string;
  isSuperAdmin?: boolean;
}

interface CompanyContextSelectorProps {
  contexts: ContextOption[];
  onSelect: (context: ContextOption) => void;
  userEmail: string;
}

export function CompanyContextSelector({ contexts, onSelect, userEmail }: CompanyContextSelectorProps) {
  const [selectedContext, setSelectedContext] = useState<ContextOption | null>(null);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-6 h-6 text-yellow-600" />;
      case 'owner':
        return <Crown className="w-6 h-6 text-purple-600" />;
      case 'admin':
        return <Shield className="w-6 h-6 text-blue-600" />;
      case 'pro':
        return <Briefcase className="w-6 h-6 text-green-600" />;
      case 'atendente':
        return <Users className="w-6 h-6 text-orange-600" />;
      default:
        return <User className="w-6 h-6 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrador';
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      case 'pro':
        return 'Profissional';
      case 'atendente':
        return 'Atendente';
      default:
        return 'Usuário';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Acesso total ao sistema e todas as empresas';
      case 'owner':
        return 'Gerencia toda a empresa e seus funcionários';
      case 'admin':
        return 'Administra a empresa com permissões elevadas';
      case 'pro':
        return 'Acesso à agenda e clientes próprios';
      case 'atendente':
        return 'Atendimento e criação de agendamentos';
      default:
        return 'Acesso básico ao sistema';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg"
          >
            <Building2 className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Selecione o Contexto de Acesso
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Olá, <span className="font-semibold text-blue-600">{userEmail}</span>
          </p>
          <p className="text-gray-500">
            Você tem acesso a múltiplas empresas. Escolha em qual contexto deseja trabalhar:
          </p>
        </div>

        {/* Context Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {contexts.map((context, index) => (
            <motion.div
              key={`${context.companyId}-${context.role}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  selectedContext?.companyId === context.companyId && 
                  selectedContext?.role === context.role
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-lg hover:border-blue-300'
                }`}
                onClick={() => setSelectedContext(context)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getRoleIcon(context.role)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {context.isSuperAdmin ? 'Sistema Global' : context.companyName}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        context.role === 'super_admin' ? 'bg-yellow-100 text-yellow-800' :
                        context.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        context.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        context.role === 'pro' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {getRoleLabel(context.role)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {getRoleDescription(context.role)}
                    </p>
                    
                    {context.professionalName && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Briefcase className="w-4 h-4" />
                        <span>Profissional: {context.professionalName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {selectedContext?.companyId === context.companyId && 
                 selectedContext?.role === context.role && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={() => selectedContext && onSelect(selectedContext)}
            disabled={!selectedContext}
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <motion.span
              animate={selectedContext ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              Acessar Sistema
            </motion.span>
          </Button>
          
          {!selectedContext && (
            <p className="text-sm text-gray-500 mt-3">
              Selecione um contexto para continuar
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            💡 Você pode trocar de contexto a qualquer momento através do menu do usuário
          </p>
        </div>
      </motion.div>
    </div>
  );
}





