'use client';

// Export helpCategories for static generation

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Shield,
  LayoutDashboard,
  ArrowLeft,
  Calendar,
  HeartPulse,
  Sparkles,
  BarChart3,
  Settings,
  UserCheck,
  Package,
  FileText,
  CreditCard,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getGradientColors, getGradientStyle } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useCustomerLabels } from '@/hooks/useCustomerLabels';
import { useRouter, usePathname } from 'next/navigation';
import { AccessGuard } from '@/components/AccessGuard';
import { helpCategories } from './helpData';

// Re-export types for convenience
export type { HelpCategory, HelpSection, HelpFeature } from './helpData';
  const customerLabels = useCustomerLabels();
  const router = useRouter();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;

  // Ler pathname e selecionar categoria/seção automaticamente
  useEffect(() => {
    // Remove trailing slash e divide o path
    const cleanPath = pathname.replace(/\/$/, '');
    const pathParts = cleanPath.split('/').filter(Boolean);
    
    // Formato esperado: /ajuda/category ou /ajuda/category/section
    if (pathParts.length >= 2 && pathParts[0] === 'ajuda') {
      const categoryFromPath = pathParts[1];
      const sectionFromPath = pathParts[2];
      
      if (categoryFromPath) {
        setSelectedCategory(categoryFromPath);
      } else {
        setSelectedCategory(null);
      }
      
      if (sectionFromPath) {
        setSelectedSection(sectionFromPath);
      } else {
        setSelectedSection(null);
      }
    } else if (pathParts.length === 1 && pathParts[0] === 'ajuda') {
      // Se estiver apenas em /ajuda, limpar seleções
      setSelectedCategory(null);
      setSelectedSection(null);
    }
  }, [pathname]);

  const selectedCategoryData = helpCategories.find((c) => c.id === selectedCategory);
  const selectedSectionData = selectedCategoryData?.sections.find((s) => s.id === selectedSection);

  return (
    <AccessGuard allowed={['owner', 'admin', 'pro', 'atendente', 'outro']}>
      <div className={cn('app-page min-h-screen', hasGradient ? 'bg-transparent' : 'bg-slate-50')}>
        <div className="h-screen overflow-y-auto">
          {/* Header */}
          <div
            className={cn(
              'sticky top-0 z-10 p-6 border-b backdrop-blur',
              hasGradient ? 'border-white/20 bg-white/40' : 'border-slate-200 bg-slate-50'
            )}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className={cn(
                    'h-9 w-9',
                    hasGradient ? 'hover:bg-white/60' : 'hover:bg-slate-100'
                  )}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                    isVibrant
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
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
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h1
                    className={cn(
                      'text-xl font-bold',
                      hasGradient
                        ? isCustom && gradientColors
                          ? 'bg-clip-text text-transparent drop-shadow'
                          : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent drop-shadow'
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
                    Central de Ajuda
                  </h1>
                  <p className={cn('text-sm', hasGradient ? 'text-slate-600/80' : 'text-slate-500')}>
                    Guia completo do sistema
                  </p>
                </div>
              </div>

              {/* Botão WhatsApp */}
              <Button
                onClick={() => {
                  const phoneNumber = '5551995279117';
                  const whatsappUrl = `https://wa.me/${phoneNumber}`;
                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                }}
                className={cn(
                  'flex items-center justify-center gap-2',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'text-white shadow-lg'
                      : 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg hover:opacity-90'
                    : 'bg-green-500 text-white hover:bg-green-600'
                )}
                style={
                  isCustom && gradientColors
                    ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      }
                    : undefined
                }
              >
                <MessageCircle className="w-4 h-4" />
                <span>Falar com Suporte via WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto p-8">
              {selectedSectionData ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      {selectedSectionData.title}
                    </h2>
                    <p className="text-lg text-slate-600">{selectedSectionData.description}</p>
                  </div>

                  <div className="space-y-6">
                    {selectedSectionData.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          'rounded-xl p-6 border shadow-sm',
                          hasGradient
                            ? 'border-white/25 bg-white/50 backdrop-blur-xl'
                            : 'border-slate-200 bg-white'
                        )}
                      >
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">
                          {feature.title}
                        </h3>
                        <p className="text-slate-600 mb-4">{feature.description}</p>

                        {feature.steps && feature.steps.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Como usar:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-2">
                              {feature.steps.map((step, stepIndex) => (
                                <li key={stepIndex} className="leading-relaxed">{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {feature.tips && feature.tips.length > 0 && (
                          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Dicas importantes:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 ml-2">
                              {feature.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="leading-relaxed">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {feature.access && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                            <Shield className="w-4 h-4" />
                            <span>
                              Acesso: {feature.access.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                  <div
                    className={cn(
                      'flex h-20 w-20 items-center justify-center rounded-full mb-6',
                      isVibrant
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'
                        : isCustom && gradientColors
                        ? ''
                        : 'bg-slate-200'
                    )}
                    style={
                      isCustom && gradientColors
                        ? {
                            background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                          }
                        : undefined
                    }
                  >
                    <HelpCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-700 mb-2">
                    Bem-vindo à Central de Ajuda
                  </h3>
                  <p className="text-slate-500 text-center max-w-md">
                    Selecione uma funcionalidade no menu lateral para ver instruções detalhadas de como usar o sistema
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}

