'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Trash2, Search, Check, MoreVertical, Edit, FileText, Download, Save, Printer, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import CurrencyInput from 'react-currency-input-field';
import { useServices, useCompany, usePatient, useOrcamentos } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';
import { getGradientColors, getGradientStyle } from '@/lib/utils';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { OrcamentoModal } from './OrcamentoModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, getDaysInMonth, setDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TipoDenticao, ProcedimentoOdontologico, DenteProcedimento, FaceDente, EstadoProcedimento } from '@/types';
import type { Professional } from '@/types';

// Cache global de imagens dos dentes
const imageCache = new Map<string, HTMLImageElement>();
const preloadedLinks = new Set<string>();

// Função para pré-carregar uma imagem usando link rel="preload" + Image
const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      const cached = imageCache.get(src);
      if (cached) {
        resolve(cached);
        return;
      }
    }

    // Usar link rel="preload" para forçar carregamento prioritário
    if (!preloadedLinks.has(src) && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      preloadedLinks.add(src);
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Componente para representar um dente - usa imagem PNG sempre
const ToothIcon = ({ numero, hasProcedimentos }: { numero: number; hasProcedimentos: boolean }) => {
  // Caminho da imagem do dente
  const imagePath = `/images/dental-teeth/${numero}.png`;

  // Sempre usar a imagem PNG com cache - eager loading para imagens visíveis
    return (
      <img 
        src={imagePath} 
        alt={`Dente ${numero}`}
        className="w-full h-full object-contain"
      loading="eager"
      fetchPriority="high"
      decoding="async"
        style={{
          filter: hasProcedimentos ? 'hue-rotate(250deg) saturate(1.5)' : 'none',
          opacity: hasProcedimentos ? 0.9 : 1
        }}
      />
    );
};

const ModalPortal = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
    setMounted(true);
  }, []);

  if (!mounted || !container) return null;
  return createPortal(children, container);
};

const MenuPortal = ({ children, onClose, buttonId }: { children: ReactNode; onClose: () => void; buttonId: string }) => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    const portalContainer = document.createElement('div');
    portalContainer.style.position = 'fixed';
    portalContainer.style.top = '0';
    portalContainer.style.left = '0';
    portalContainer.style.width = '100%';
    portalContainer.style.height = '100%';
    portalContainer.style.pointerEvents = 'none';
    portalContainer.style.zIndex = '9999';
    document.body.appendChild(portalContainer);
    setContainer(portalContainer);

    // Calcular posição do botão
    const calculatePosition = () => {
      const button = document.querySelector(`[data-menu-button-id="${buttonId}"]`) as HTMLElement;
      if (button) {
        const rect = button.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    // Calcular posição inicial
    calculatePosition();

    // Recalcular em caso de scroll ou resize
    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    // Overlay para fechar o menu
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9998';
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'default';
    overlay.onclick = (e) => {
      e.stopPropagation();
      onClose();
    };
    document.body.appendChild(overlay);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      if (document.body.contains(portalContainer)) {
        document.body.removeChild(portalContainer);
      }
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };
  }, [onClose, buttonId]);

  if (!mounted || !container) return null;
  
  // Clonar children e adicionar posição
  const childrenWithPosition = position ? (
    <div style={{ position: 'fixed', top: `${position.top}px`, right: `${position.right}px`, pointerEvents: 'auto' }}>
      {children}
    </div>
  ) : children;
  
  return createPortal(childrenWithPosition, container);
};

// Função para formatar informação dos dentes
const formatarDentes = (proc: ProcedimentoOdontologico & { valorCentavosEditado?: number }): string => {
  // Verificar se tem seleção em lote
  if (proc.selectionTypes && proc.selectionTypes.length > 0) {
    const tipos: string[] = [];
    if (proc.selectionTypes.includes('ALL')) {
      return 'Todos os dentes';
    }
    if (proc.selectionTypes.includes('UPPER')) {
      tipos.push('Superiores');
    }
    if (proc.selectionTypes.includes('LOWER')) {
      tipos.push('Inferiores');
    }
    if (tipos.length > 0) {
      return tipos.join(' + ');
    }
  }
  
  // Se tem dentes específicos
  if (proc.dentes && proc.dentes.length > 0) {
    const numerosDentes = proc.dentes.map(d => d.numero).sort((a, b) => a - b);
    if (numerosDentes.length <= 5) {
      return numerosDentes.join(', ');
    } else {
      return `${numerosDentes[0]}-${numerosDentes[numerosDentes.length - 1]} (${numerosDentes.length} dentes)`;
    }
  }
  
  return '-';
};

// Função auxiliar para carregar imagem e converter para base64
const loadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    // Se já for base64, retornar direto
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }

    // Tentar extrair o caminho do Storage da URL
    let storagePath: string | null = null;
    try {
      const urlObj = new URL(imageUrl);
      // Tentar extrair o path do Storage
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
      if (pathMatch) {
        storagePath = decodeURIComponent(pathMatch[1]);
      }
    } catch (e) {
      console.warn('Não foi possível extrair o caminho da URL:', e);
    }
    
    // Método 1: Usar Cloud Function (mais confiável, evita CORS)
    if (storagePath) {
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        // Usar a mesma Cloud Function usada para assinaturas, que já funciona
        const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
        const result = await getSignatureImageBase64({ storagePath });
        const data = result.data as { base64?: string; error?: string };
        if (data?.base64) {
          return data.base64;
        }
      } catch (cloudFunctionError) {
        console.warn('Erro ao obter logo via Cloud Function:', cloudFunctionError);
        // Continuar para tentar outros métodos
      }
    }

    // Método 2: Tentar usar getDownloadURL (pode ter token de acesso)
    if (storagePath) {
      try {
        const { storage } = await import('@/lib/firebase');
        const { ref, getDownloadURL } = await import('firebase/storage');
        const storageRef = ref(storage, storagePath);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Se conseguiu a URL, tentar fazer fetch
        // URLs assinadas do Firebase geralmente funcionam mesmo com CORS
        try {
          const response = await fetch(downloadURL);
          if (response.ok) {
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch (fetchError) {
          console.warn('Erro ao fazer fetch da URL assinada:', fetchError);
        }
      } catch (storageError) {
        console.warn('Erro ao obter URL assinada do Storage:', storageError);
      }
    }

    // Método 3: Tentar fetch direto (pode não funcionar devido a CORS)
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (fetchError) {
      console.warn('Erro ao fazer fetch direto (CORS pode estar bloqueando):', fetchError);
    }

    return null;
  } catch (error) {
    console.error('Erro ao carregar imagem:', error);
    return null;
  }
};

// Função auxiliar para processar assinatura: cor azul e melhor qualidade
const processSignature = async (imageBase64: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Criar canvas com tamanho maior para melhor qualidade
        const scale = 2; // Escala para aumentar resolução
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        // Habilitar suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Desenhar a imagem no tamanho maior
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Obter dados da imagem
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Processar cada pixel para aplicar cor azul (caneta esferográfica)
        // Cor azul da caneta: RGB(0, 102, 204) - azul médio como caneta esferográfica
        const blueR = 0;
        const blueG = 102;
        const blueB = 204;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Se o pixel tem conteúdo (não é muito transparente)
          if (a > 20) {
            // Calcular luminosidade do pixel original
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
            
            // Se o pixel é parte da assinatura (não é muito claro)
            if (luminance < 230) {
              // Calcular intensidade baseada no inverso da luminosidade
              // Pixels mais escuros = traço mais forte e visível
              const intensity = (255 - luminance) / 255;
              
              // Aplicar cor azul mantendo a intensidade para parecer natural
              // Usar variação baseada na posição para suavizar (evitar pixels)
              const x = (i / 4) % canvas.width;
              const y = Math.floor((i / 4) / canvas.width);
              const smoothVariation = 1.0 - (Math.sin(x * 0.1) * Math.sin(y * 0.1) * 0.05); // Variação suave
              const finalIntensity = Math.min(1, intensity * smoothVariation);
              
              // Cor azul de caneta esferográfica
              data[i] = Math.round(blueR * finalIntensity); // R (azul = pouco vermelho)
              data[i + 1] = Math.round(blueG * finalIntensity); // G
              data[i + 2] = Math.round(blueB * finalIntensity); // B
              // Manter opacidade baseada na transparência original, mas reforçada
              data[i + 3] = Math.min(255, a * (0.85 + finalIntensity * 0.15));
            } else {
              // Pixels muito claros = tornar transparente
              data[i + 3] = 0;
            }
          }
        }
        
        // Aplicar os dados processados de volta ao canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Converter para base64 com alta qualidade
        const processedBase64 = canvas.toDataURL('image/png', 1.0);
        resolve(processedBase64);
      };
      img.onerror = () => resolve(null);
      img.src = imageBase64;
    } catch (error) {
      console.error('Erro ao processar assinatura:', error);
      resolve(null);
    }
  });
};

// Função auxiliar para aplicar bordas arredondadas à imagem usando canvas
const applyRoundedCorners = async (imageBase64: string, radius: number, canvasSize: number): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Criar canvas com tamanho maior para melhor qualidade
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        // Habilitar suavização de imagem para melhor qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calcular raio proporcional ao tamanho do canvas
        const canvasRadius = (radius / 20) * canvasSize; // 20mm é o tamanho original
        
        // Criar caminho com bordas arredondadas
        ctx.beginPath();
        ctx.moveTo(canvasRadius, 0);
        ctx.lineTo(canvasSize - canvasRadius, 0);
        ctx.quadraticCurveTo(canvasSize, 0, canvasSize, canvasRadius);
        ctx.lineTo(canvasSize, canvasSize - canvasRadius);
        ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - canvasRadius, canvasSize);
        ctx.lineTo(canvasRadius, canvasSize);
        ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - canvasRadius);
        ctx.lineTo(0, canvasRadius);
        ctx.quadraticCurveTo(0, 0, canvasRadius, 0);
        ctx.closePath();
        
        // Clippar o contexto para o caminho arredondado
        ctx.clip();
        
        // Desenhar a imagem dentro do canvas arredondado com alta qualidade
        ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
        
        // Converter para base64 com qualidade máxima (PNG mantém qualidade)
        const roundedImageBase64 = canvas.toDataURL('image/png', 1.0);
        resolve(roundedImageBase64);
      };
      img.onerror = () => resolve(null);
      img.src = imageBase64;
    } catch (error) {
      console.error('Erro ao aplicar bordas arredondadas:', error);
      resolve(null);
    }
  });
};

// Função para gerar PDF profissional e moderno do orçamento
export const generateOrcamentoPDF = async (
  company: { nome?: string; telefone?: string; email?: string; endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }; cnpj?: string; logoUrl?: string } | null,
  patient: { nome?: string; telefoneE164?: string; email?: string } | null,
  procedimentos: Array<ProcedimentoOdontologico & { valorCentavosEditado?: number }>,
  desconto: string,
  observacoes: string,
  signatureImageUrl?: string | null,
  signedBy?: string | null,
  signedAt?: Date | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Cores modernas
  const primaryColor: [number, number, number] = [34, 139, 34]; // Verde profissional
  const secondaryColor: [number, number, number] = [74, 85, 104]; // Cinza escuro
  const lightGray: [number, number, number] = [241, 245, 249]; // Cinza claro
  const borderColor: [number, number, number] = [226, 232, 240]; // Cinza de borda

  // Cabeçalho com fundo colorido (reduzido)
  const headerHeight = 35;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Título da clínica no cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const companyName = company?.nome || 'Clínica';
  const companyNameWidth = doc.getTextWidth(companyName);
  doc.text(companyName, (pageWidth - companyNameWidth) / 2, 15);
  
  // Subtítulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ORÇAMENTO ODONTOLÓGICO', pageWidth / 2, 23, { align: 'center' });
  
  // Logo da empresa (com bordas arredondadas)
  const logoSize = 28; // Aumentado de 20 para 28mm para melhor visibilidade
  const logoX = pageWidth - margin - logoSize / 2 - 5;
  const logoY = headerHeight / 2;
  const logoRadius = 4; // Aumentado proporcionalmente
  const logoCanvasSize = 400; // Aumentado para 400px para alta qualidade
  
  if (company?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logoUrl);
      if (logoBase64) {
        // Aplicar bordas arredondadas à imagem com alta qualidade
        const roundedLogoBase64 = await applyRoundedCorners(logoBase64, logoRadius, logoCanvasSize);
        
        if (roundedLogoBase64) {
          // Adicionar a imagem com bordas arredondadas (sem 'FAST' para melhor qualidade)
          doc.addImage(roundedLogoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        } else {
          // Fallback: adicionar imagem sem bordas arredondadas se falhar
          doc.addImage(logoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        }
      } else {
        // Fallback: círculo com inicial se falhar ao carregar logo
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(255, 255, 255);
        doc.circle(logoX, logoY, 8, 'F');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const initial = companyName.charAt(0).toUpperCase();
        const initialWidth = doc.getTextWidth(initial);
        doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
      }
    } catch (error) {
      console.error('Erro ao adicionar logo ao PDF:', error);
      // Fallback: círculo com inicial em caso de erro
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);
      doc.circle(logoX, logoY, 8, 'F');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const initial = companyName.charAt(0).toUpperCase();
      const initialWidth = doc.getTextWidth(initial);
      doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
    }
  } else {
    // Logo/Ícone simples (círculo com inicial) quando não há logo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.circle(logoX, logoY, 8, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const initial = companyName.charAt(0).toUpperCase();
    const initialWidth = doc.getTextWidth(initial);
    doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
  }

  yPos = headerHeight + 8;

  // Dados da Clínica em caixa moderna
  const clinicBoxStartY = yPos - 5;
  const clinicTitleY = yPos;
  let clinicTextY = yPos + 7;
  
  // Coletar informações primeiro para calcular altura
  const clinicInfo: string[] = [];
  if (company?.endereco) {
    const endereco = [
      company.endereco.rua && company.endereco.numero ? `${company.endereco.rua}, ${company.endereco.numero}` : company.endereco.rua || '',
      company.endereco.bairro || '',
      company.endereco.cidade && company.endereco.estado ? `${company.endereco.cidade} - ${company.endereco.estado}` : company.endereco.cidade || company.endereco.estado || '',
      company.endereco.cep ? `CEP: ${company.endereco.cep}` : ''
    ].filter(Boolean);
    clinicInfo.push(...endereco);
  }
  if (company?.telefone) clinicInfo.push(`Telefone: ${company.telefone}`);
  if (company?.email) clinicInfo.push(`E-mail: ${company.email}`);
  if (company?.cnpj) clinicInfo.push(`CNPJ: ${company.cnpj}`);

  // Calcular altura da caixa
  const clinicBoxHeight = clinicInfo.length > 0 ? (clinicInfo.length * 5.5) + 12 : 25;
  
  // Desenhar caixa primeiro
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, clinicBoxStartY, maxWidth, clinicBoxHeight, 3, 3, 'F');
  
  // Desenhar título sobre a caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('DADOS DA CLÍNICA', margin + 5, clinicTitleY);
  
  // Desenhar informações
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  clinicInfo.forEach((info) => {
    doc.text(info, margin + 5, clinicTextY);
    clinicTextY += 5.5;
  });

  yPos = clinicBoxStartY + clinicBoxHeight + 10;

  // Dados do Cliente em caixa moderna
  const patientBoxStartY = yPos - 5;
  const patientTitleY = yPos;
  let patientTextY = yPos + 7;
  
  // Coletar informações primeiro para calcular altura
  const patientInfo: string[] = [];
  if (patient?.nome) patientInfo.push(`Nome: ${patient.nome}`);
  if (patient?.telefoneE164) patientInfo.push(`Telefone: ${patient.telefoneE164}`);
  if (patient?.email) patientInfo.push(`E-mail: ${patient.email}`);

  // Calcular altura da caixa
  const patientBoxHeight = patientInfo.length > 0 ? (patientInfo.length * 5.5) + 12 : 25;
  
  // Desenhar caixa primeiro
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, patientBoxStartY, maxWidth, patientBoxHeight, 3, 3, 'F');
  
  // Desenhar título sobre a caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('DADOS DO CLIENTE', margin + 5, patientTitleY);
  
  // Desenhar informações
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  patientInfo.forEach((info) => {
    doc.text(info, margin + 5, patientTextY);
    patientTextY += 5.5;
  });

  yPos = patientBoxStartY + patientBoxHeight + 15;

  // Data do orçamento
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`Data do Orçamento: ${dataAtual}`, margin, yPos);
  yPos += 12;

  // Tabela de Procedimentos moderna
  const tableTitleStartY = yPos - 6;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, tableTitleStartY, maxWidth, 10, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PROCEDIMENTOS', margin + 5, yPos);
  
  yPos += 12;

  // Cabeçalho da tabela
  const tableHeaderY = yPos;
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, tableHeaderY - 5, maxWidth, 8, 'F');
  
  // Definir posições das colunas
  const colNumX = margin + 8;
  const colProcX = margin + 20;
  const colDentesX = margin + maxWidth * 0.55;
  const colValorX = pageWidth - margin - 35;
  const colProcWidth = colDentesX - colProcX - 5;
  const colDentesWidth = colValorX - colDentesX - 10;
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('#', colNumX, tableHeaderY);
  doc.text('PROCEDIMENTO', colProcX, tableHeaderY);
  doc.text('DENTE(S)', colDentesX, tableHeaderY);
  doc.text('VALOR', colValorX, tableHeaderY, { align: 'right' });
  
  yPos = tableHeaderY + 8;

  // Linhas da tabela
  procedimentos.forEach((proc, index) => {
    const valor = proc.valorCentavosEditado !== undefined ? proc.valorCentavosEditado : (proc.valorCentavos || 0);
    const valorFormatado = `R$ ${(valor / 100).toFixed(2).replace('.', ',')}`;
    const dentesInfo = formatarDentes(proc);
    
    // Calcular altura necessária para o procedimento
    const procText = doc.splitTextToSize(proc.procedimento || 'Procedimento', colProcWidth);
    const dentesText = doc.splitTextToSize(dentesInfo, colDentesWidth);
    const rowHeight = Math.max(Math.max(procText.length, dentesText.length) * 5 + 4, 10);
    const rowStartY = yPos - 5;
    
    // Alternar cor de fundo
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
  } else {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    }
    doc.rect(margin, rowStartY, maxWidth, rowHeight, 'F');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Número
    doc.text(String(index + 1), colNumX, yPos + 2);
    
    // Procedimento (quebrar texto se necessário)
    procText.forEach((line: string, lineIndex: number) => {
      doc.text(line, colProcX, yPos + 2 + (lineIndex * 5));
    });
    
    // Dentes
    doc.setFontSize(8);
    dentesText.forEach((line: string, lineIndex: number) => {
      doc.text(line, colDentesX, yPos + 2 + (lineIndex * 5));
    });
    
    // Valor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(valorFormatado, colValorX, yPos + 2, { align: 'right' });
    
    yPos += rowHeight + 2;
    
    // Verificar se precisa de nova página
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin + 12;
      
      // Redesenhar cabeçalho da tabela na nova página
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(margin, yPos - 5, maxWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('#', colNumX, yPos);
      doc.text('PROCEDIMENTO', colProcX, yPos);
      doc.text('DENTE(S)', colDentesX, yPos);
      doc.text('VALOR', colValorX, yPos, { align: 'right' });
      yPos += 8;
    }
    
    // Borda inferior
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
  });

  yPos += 10;

  // Resumo financeiro em caixa destacada
  const summaryY = yPos;
  
  // Calcular valores
  const descontoCentavos = Math.round(parseFloat(desconto.replace(',', '.')) * 100) || 0;
  const valorTotal = procedimentos.reduce((sum, p) => {
    const valor = p.valorCentavosEditado !== undefined ? p.valorCentavosEditado : (p.valorCentavos || 0);
    return sum + valor;
  }, 0);
  const saldoTotal = Math.max(0, valorTotal - descontoCentavos);

  const summaryBoxHeight = 40;
  
  if (descontoCentavos > 0) {
    // Desconto - lado esquerdo
    const descontoBoxWidth = maxWidth / 2 - 5;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, summaryY, descontoBoxWidth, summaryBoxHeight, 3, 3, 'F');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Desconto:', margin + 8, summaryY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Vermelho para desconto
    doc.text(`- R$ ${(descontoCentavos / 100).toFixed(2).replace('.', ',')}`, margin + 8, summaryY + 22);
    
    // Valor Total destacado - lado direito
    const totalBoxWidth = maxWidth / 2 - 5;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(totalBoxX, summaryY, totalBoxWidth, summaryBoxHeight, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL', totalBoxX + totalBoxWidth / 2, summaryY + 12, { align: 'center' });
    
    doc.setFontSize(20);
    doc.text(`R$ ${(saldoTotal / 100).toFixed(2).replace('.', ',')}`, totalBoxX + totalBoxWidth / 2, summaryY + 28, { align: 'center' });
  } else {
    // Apenas Valor Total - ocupando toda largura
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, summaryY, maxWidth, summaryBoxHeight, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL', pageWidth / 2, summaryY + 12, { align: 'center' });
    
    doc.setFontSize(20);
    doc.text(`R$ ${(saldoTotal / 100).toFixed(2).replace('.', ',')}`, pageWidth / 2, summaryY + 28, { align: 'center' });
  }

  yPos = summaryY + summaryBoxHeight + 15;

  // Observações (se houver) - renderizar ANTES da assinatura, apenas UMA vez
  if (observacoes && observacoes.trim()) {
    // Verificar se precisa de nova página para observações
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }
    
    const obsBoxStartY = yPos;
    const obsTitleY = yPos + 8;
    const textStartY = yPos + 12;
    yPos = textStartY;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const obsLines = doc.splitTextToSize(observacoes, maxWidth - 20);
    
    // Renderizar o texto primeiro para saber onde termina
    let firstPageEndY = textStartY;
    let movedToNewPage = false;
    
    obsLines.forEach((line: string, index: number) => {
      // Verificar se precisa de nova página
      if (yPos + 6 > pageHeight - 60) {
        // Guardar onde terminou na primeira página
        if (!movedToNewPage) {
          firstPageEndY = yPos;
          movedToNewPage = true;
        }
        
        doc.addPage();
        yPos = margin + 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(line, margin + 8, yPos);
      yPos += 6;
    });
    
    // Desenhar a caixa na posição inicial (apenas na primeira página)
    const obsHeight = movedToNewPage 
      ? Math.max(firstPageEndY - obsBoxStartY + 8, 25)
      : Math.max(yPos - obsBoxStartY + 8, 25);
    
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, obsBoxStartY, maxWidth, obsHeight, 3, 3, 'F');
    
    // Título sobre a caixa
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('OBSERVAÇÕES', margin + 8, obsTitleY);
    
    // Atualizar yPos para depois das observações
    yPos += 10;
  }

  // Verificar se precisa de nova página para assinatura
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // Campo para Assinatura moderno
  const signatureBoxStartY = yPos;
  const signatureBoxHeight = signatureImageUrl ? 60 : 25; // Reduzido para 25mm quando não há imagem
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, signatureBoxStartY, maxWidth, signatureBoxHeight, 3, 3, 'F');
  
  if (signatureImageUrl) {
    // Se houver assinatura digital, adicionar a imagem
    let imageLoadedSuccessfully = false;
    try {
      console.log('Carregando imagem da assinatura:', signatureImageUrl);
      
      let base64Image: string;
      
      // Verificar se já é uma data URL (base64)
      if (signatureImageUrl.startsWith('data:image/')) {
        base64Image = signatureImageUrl;
        console.log('Imagem já está em formato base64');
      } else {
        // Tentar extrair o caminho do Storage da URL e fazer download via SDK
        // A URL do Firebase Storage tem o formato: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
        let storagePath: string | null = null;
        try {
          const urlObj = new URL(signatureImageUrl);
          console.log('URL completa:', signatureImageUrl);
          console.log('Pathname:', urlObj.pathname);
          
          // Tentar diferentes padrões de extração
          // Padrão 1: /o/{path}?alt=media
          let pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            storagePath = decodeURIComponent(pathMatch[1]);
            console.log('Caminho extraído (padrão 1):', storagePath);
          } else {
            // Padrão 2: tentar extrair do pathname completo
            const pathParts = urlObj.pathname.split('/o/');
            if (pathParts.length > 1) {
              const pathWithQuery = pathParts[1];
              const pathOnly = pathWithQuery.split('?')[0];
              storagePath = decodeURIComponent(pathOnly);
              console.log('Caminho extraído (padrão 2):', storagePath);
            }
          }
        } catch (e) {
          console.warn('Não foi possível extrair o caminho da URL:', e);
        }
        
        if (storagePath) {
          // Usar Firebase Storage SDK para fazer download (evita CORS)
          try {
            console.log('Tentando fazer download via Storage SDK, caminho:', storagePath);
            const { storage } = await import('@/lib/firebase');
            const { ref, getBytes } = await import('firebase/storage');
            const storageRef = ref(storage, storagePath);
            const bytes = await getBytes(storageRef);
            console.log('Bytes obtidos:', bytes.byteLength);
            
            // Converter bytes para base64
            const blob = new Blob([bytes], { type: 'image/png' });
            const reader = new FileReader();
            base64Image = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  resolve(reader.result);
                } else {
                  reject(new Error('Erro ao converter imagem para base64'));
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            console.log('Imagem convertida para base64 com sucesso');
          } catch (storageError) {
            console.error('Erro ao usar Storage SDK:', storageError);
            // Se falhar, tentar usar a URL diretamente (pode funcionar em alguns casos)
            throw new Error(`Não foi possível carregar a imagem via Storage SDK: ${storageError}`);
          }
        } else {
          // Se não conseguir extrair o caminho, tentar usar a URL diretamente
          console.warn('Não foi possível extrair o caminho do Storage. Tentando usar URL diretamente.');
          throw new Error('Não foi possível extrair o caminho do Storage da URL. A imagem deve ser passada como base64.');
        }
      }
      
      console.log('Imagem convertida para base64, tamanho:', base64Image.length);
      
      // Processar assinatura para cor azul e melhor qualidade
      const processedSignature = await processSignature(base64Image);
      const finalSignatureImage = processedSignature || base64Image;
      
      // Adicionar imagem da assinatura (igual ao formato da anamnese)
      const img = new Image();
      img.src = finalSignatureImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const imgWidth = 80;
            const imgHeight = (img.height / img.width) * imgWidth;
            const imgX = margin + 8;
            const imgY = signatureBoxStartY + 8;
            
            // Adicionar imagem processada (sem 'FAST' para melhor qualidade)
            doc.addImage(finalSignatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
            
            // Nome e data ao lado da assinatura
            const textX = imgX + imgWidth + 10;
            let textY = imgY + 10;
            
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Assinado por:', textX, textY);
            
            textY += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(signedBy || 'Não informado', textX, textY);
            
            // Sempre mostrar a data da assinatura
            textY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Data:', textX, textY);
            textY += 5;
            doc.setFont('helvetica', 'normal');
            // Usar a data da assinatura se disponível, senão usar a data atual
            const dataAssinatura = signedAt || new Date();
            doc.text(format(dataAssinatura, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), textX, textY);
            
            // Adicionar texto "Assinatura do Cliente" abaixo da assinatura
            let labelY = imgY + imgHeight + 8;
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Assinatura do Cliente', imgX, labelY);
            
            imageLoadedSuccessfully = true;
            resolve(null);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
      });
    } catch (error) {
      console.error('Erro ao carregar imagem da assinatura:', error);
      // Se falhar e a imagem não foi carregada com sucesso, mostrar campo de assinatura normal (com linha horizontal)
      if (!imageLoadedSuccessfully) {
        yPos = signatureBoxStartY + 12;
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.8);
        doc.line(margin + 8, yPos, pageWidth - margin - 8, yPos);
        yPos += 7;
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Assinatura do Cliente', margin + 8, yPos);
      }
    }
  } else {
    // Campo de assinatura normal (sem imagem, com linha horizontal)
    yPos = signatureBoxStartY + 12;
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin + 8, yPos, pageWidth - margin - 8, yPos);
    yPos += 7;
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Cliente', margin + 8, yPos);
  }

  // Rodapé
  const footerY = pageHeight - 15;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, footerY, { align: 'center' });

  // Salvar PDF
  const fileName = signatureImageUrl 
    ? `orcamento-assinado-${patient?.nome?.replace(/\s+/g, '-') || 'cliente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    : `orcamento-${patient?.nome?.replace(/\s+/g, '-') || 'cliente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

// Função para gerar PDF da anamnese
export const generateAnamnesePDF = async (
  company: { nome?: string; telefone?: string; email?: string; logoUrl?: string },
  patient: { nome?: string; telefoneE164?: string; email?: string } | null,
  modelo: { nome: string; secoes: Array<{ id: string; nome: string; ordem: number; perguntas: Array<{ id: string; pergunta: string; tipoResposta: string; ordem: number; geraAlerta?: boolean }> }> },
  respostas: Record<string, any>,
  signatureImageUrl?: string | null,
  signedBy?: string | null,
  signedAt?: Date | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Cores modernas
  const primaryColor: [number, number, number] = [34, 139, 34]; // Verde profissional
  const secondaryColor: [number, number, number] = [74, 85, 104]; // Cinza escuro
  const lightGray: [number, number, number] = [241, 245, 249]; // Cinza claro
  const borderColor: [number, number, number] = [226, 232, 240]; // Cinza de borda
  const alertColor: [number, number, number] = [255, 140, 0]; // Laranja para alertas

  // Cabeçalho com fundo colorido
  const headerHeight = 35;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Título da clínica no cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const companyName = company?.nome || 'Clínica';
  const companyNameWidth = doc.getTextWidth(companyName);
  doc.text(companyName, (pageWidth - companyNameWidth) / 2, 15);
  
  // Subtítulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ANAMNESE ODONTOLÓGICA', pageWidth / 2, 23, { align: 'center' });
  
  // Logo da empresa (com bordas arredondadas)
  const logoSize = 28; // Aumentado de 20 para 28mm para melhor visibilidade
  const logoX = pageWidth - margin - logoSize / 2 - 5;
  const logoY = headerHeight / 2;
  const logoRadius = 4; // Aumentado proporcionalmente
  const logoCanvasSize = 400; // Aumentado para 400px para alta qualidade
  
  if (company?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logoUrl);
      if (logoBase64) {
        // Aplicar bordas arredondadas à imagem com alta qualidade
        const roundedLogoBase64 = await applyRoundedCorners(logoBase64, logoRadius, logoCanvasSize);
        
        if (roundedLogoBase64) {
          // Adicionar a imagem com bordas arredondadas (sem 'FAST' para melhor qualidade)
          doc.addImage(roundedLogoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        } else {
          // Fallback: adicionar imagem sem bordas arredondadas se falhar
          doc.addImage(logoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        }
      } else {
        // Fallback: círculo com inicial se falhar ao carregar logo
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(255, 255, 255);
        doc.circle(logoX, logoY, 8, 'F');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const initial = companyName.charAt(0).toUpperCase();
        const initialWidth = doc.getTextWidth(initial);
        doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
      }
    } catch (error) {
      console.error('Erro ao adicionar logo ao PDF:', error);
      // Fallback: círculo com inicial em caso de erro
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);
      doc.circle(logoX, logoY, 8, 'F');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const initial = companyName.charAt(0).toUpperCase();
      const initialWidth = doc.getTextWidth(initial);
      doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
    }
  } else {
    // Logo/Ícone simples (círculo com inicial) quando não há logo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.circle(logoX, logoY, 8, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const initial = companyName.charAt(0).toUpperCase();
    const initialWidth = doc.getTextWidth(initial);
    doc.text(initial, logoX - initialWidth / 2, logoY + 2.5);
  }
  
  yPos = headerHeight + 15;

  // Informações do paciente
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(patient?.nome || 'Não informado', margin + 25, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Modelo:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(modelo.nome, margin + 25, yPos);
  
  yPos += 6;
  if (signedAt && signedAt instanceof Date && !isNaN(signedAt.getTime())) {
    doc.setFont('helvetica', 'bold');
    doc.text('Data da Assinatura:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(format(signedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), margin + 45, yPos);
    yPos += 6;
  }
  if (signedBy) {
    doc.setFont('helvetica', 'bold');
    doc.text('Assinado por:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(signedBy, margin + 35, yPos);
    yPos += 6;
  }

  yPos += 5;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Processar seções
  const secoesOrdenadas = [...modelo.secoes].sort((a, b) => a.ordem - b.ordem);
  
  for (const secao of secoesOrdenadas) {
    // Verificar se precisa de nova página
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    // Título da seção
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, yPos, maxWidth, 12, 3, 3, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(secao.nome, margin + 5, yPos + 8);
    yPos += 15;

    // Processar perguntas
    const perguntasOrdenadas = [...secao.perguntas].sort((a, b) => a.ordem - b.ordem);
    
    for (let i = 0; i < perguntasOrdenadas.length; i++) {
      const pergunta = perguntasOrdenadas[i];
      const respostaKey = `${secao.id}-${pergunta.id}`;
      const resposta = respostas[respostaKey] || null;

      // Verificar se precisa de nova página
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      // Pergunta - garantir fonte antes de cada texto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      
      let perguntaText = `${i + 1}. ${pergunta.pergunta}`;
      if (pergunta.geraAlerta) {
        perguntaText += ' [Gera Alerta]';
      }
      
      const perguntaLines = doc.splitTextToSize(perguntaText, maxWidth - 10);
      // Garantir fonte antes de renderizar cada linha
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(perguntaLines, margin + 5, yPos);
      yPos += perguntaLines.length * 5 + 2;

      // Resposta - garantir fonte antes de cada texto
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      
      if (resposta) {
        let respostaText = '';
        
        if (pergunta.tipoResposta === 'sim_nao') {
          respostaText = `Resposta: ${resposta.resposta === 'sim' ? 'Sim' : 'Não'}`;
        } else if (pergunta.tipoResposta === 'texto') {
          respostaText = `Resposta: ${resposta.texto || 'Não respondido'}`;
        } else if (pergunta.tipoResposta === 'sim_nao_texto') {
          respostaText = `Resposta: ${resposta.resposta === 'sim' ? 'Sim' : resposta.resposta === 'nao' ? 'Não' : 'Não respondido'}`;
          if (resposta.texto) {
            respostaText += `\nObservações: ${resposta.texto}`;
          }
        }
        
        const respostaLines = doc.splitTextToSize(respostaText, maxWidth - 15);
        doc.text(respostaLines, margin + 10, yPos);
        yPos += respostaLines.length * 4.5 + 3;
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('Não respondido', margin + 10, yPos);
        yPos += 5;
      }

      yPos += 3;
    }

    yPos += 5;
  }

  // Verificar se precisa de nova página para assinatura
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // Campo para Assinatura moderno
  const signatureBoxStartY = yPos;
  const signatureBoxHeight = signatureImageUrl ? 60 : 25; // Reduzido para 25mm quando não há imagem
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, signatureBoxStartY, maxWidth, signatureBoxHeight, 3, 3, 'F');
  
  if (signatureImageUrl) {
    // Se houver assinatura digital, adicionar a imagem
    try {
      let base64Image: string;
      
      if (signatureImageUrl.startsWith('data:image/')) {
        base64Image = signatureImageUrl;
      } else {
        // Tentar obter via Cloud Function
        try {
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('@/lib/firebase');
          const urlObj = new URL(signatureImageUrl);
          let pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
            const result = await getSignatureImageBase64({ storagePath });
            const data = result.data as { base64: string };
            if (data && data.base64) {
              base64Image = data.base64;
            } else {
              throw new Error('Imagem não encontrada');
            }
          } else {
            throw new Error('Caminho inválido');
          }
        } catch (error) {
          console.error('Erro ao obter imagem via Cloud Function:', error);
          throw error;
        }
      }

      // Processar assinatura para cor azul e melhor qualidade
      const processedSignature = await processSignature(base64Image);
      const finalSignatureImage = processedSignature || base64Image;
      
      // Adicionar imagem da assinatura
      const img = new Image();
      img.src = finalSignatureImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const imgWidth = 80;
            const imgHeight = (img.height / img.width) * imgWidth;
            const imgX = margin + 8;
            const imgY = signatureBoxStartY + 8;
            
            // Adicionar imagem processada (sem 'FAST' para melhor qualidade)
            doc.addImage(finalSignatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
            
            // Nome e data ao lado da assinatura
            const textX = imgX + imgWidth + 10;
            let textY = imgY + 10;
            
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Assinado por:', textX, textY);
            
            textY += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(signedBy || 'Não informado', textX, textY);
            
            if (signedAt) {
              textY += 5;
              doc.setFont('helvetica', 'bold');
              doc.text('Data:', textX, textY);
              textY += 5;
              doc.setFont('helvetica', 'normal');
              doc.text(format(signedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), textX, textY);
            }
            
            resolve(null);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
      });
    } catch (error) {
      console.error('Erro ao carregar imagem da assinatura:', error);
      // Se falhar, mostrar campo de assinatura normal
      yPos = signatureBoxStartY + 12;
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.8);
      doc.line(margin + 8, yPos, pageWidth - margin - 8, yPos);
      yPos += 7;
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Assinatura do Paciente', margin + 8, yPos);
    }
  } else {
    // Campo de assinatura normal (sem imagem)
    yPos = signatureBoxStartY + 12;
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin + 8, yPos, pageWidth - margin - 8, yPos);
    yPos += 7;
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Paciente', margin + 8, yPos);
  }

  // Rodapé
  const footerY = pageHeight - 15;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, footerY, { align: 'center' });

  // Salvar PDF
  const fileName = signatureImageUrl 
    ? `anamnese-assinada-${patient?.nome?.replace(/\s+/g, '-') || 'paciente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    : `anamnese-${patient?.nome?.replace(/\s+/g, '-') || 'paciente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

interface DentalChartProps {
  companyId: string;
  patientId: string | null | undefined;
  professionals: Professional[];
  procedimentos: ProcedimentoOdontologico[];
  onAddProcedimento: (procedimento: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditProcedimento?: (id: string, procedimento: Partial<ProcedimentoOdontologico>) => Promise<void>;
  onDeleteProcedimento?: (id: string) => Promise<void>;
  orcamentos?: Array<{
    id: string;
    procedimentos: Array<{
      id: string;
      procedimento?: string;
      dentes?: Array<{ numero: number; faces?: string[] }>;
      selectionTypes?: Array<'ALL' | 'UPPER' | 'LOWER'>;
    }>;
    status: string;
  }>;
  onNavigateToOrcamentos?: (orcamentoId?: string) => void;
}

// Numeração dos dentes: Permanente (11-18, 21-28, 31-38, 41-48) e Decídua (51-55, 61-65, 71-75, 81-85)
// Visão do paciente (superior = cima, inferior = baixo)
const DENTES_PERMANENTES = {
  superior_direita: [18, 17, 16, 15, 14, 13, 12, 11], // Quadrante 1 - da direita para esquerda
  superior_esquerda: [21, 22, 23, 24, 25, 26, 27, 28], // Quadrante 2 - da esquerda para direita
  inferior_esquerda: [31, 32, 33, 34, 35, 36, 37, 38], // Quadrante 3 - da esquerda para direita
  inferior_direita: [48, 47, 46, 45, 44, 43, 42, 41], // Quadrante 4 - da direita para esquerda
};

const DENTES_DECIDUOS = {
  superior_direita: [55, 54, 53, 52, 51], // Quadrante 5 - da direita para esquerda
  superior_esquerda: [61, 62, 63, 64, 65], // Quadrante 6 - da esquerda para direita
  inferior_esquerda: [71, 72, 73, 74, 75], // Quadrante 7 - da esquerda para direita
  inferior_direita: [85, 84, 83, 82, 81], // Quadrante 8 - da direita para esquerda
};

const FACES: { value: FaceDente; label: string }[] = [
  { value: 'C', label: 'C - Cervical' },
  { value: 'D', label: 'D - Distal' },
  { value: 'M', label: 'M - Mesial' },
  { value: 'O', label: 'O - Oclusal' },
  { value: 'P', label: 'P - Palatino' },
  { value: 'V', label: 'V - Vestibular' },
];

// Offsets para curvar visualmente cada arcada como uma curva contínua de 16 dentes
// Superior: formato U (centro mais baixo -> valores positivos maiores no centro)
// Inferior: formato ∩ (centro mais alto -> valores negativos maiores no centro)
const OFFSETS_SUPERIOR_16 = [12, 20, 30, 40, 50, 56, 60, 64, 64, 60, 56, 50, 40, 30, 20, 12];
const OFFSETS_INFERIOR_16 = [-12, -20, -30, -40, -50, -56, -60, -64, -64, -60, -56, -50, -40, -30, -20, -12];
const ROTATIONS_SUPERIOR_16 = [6, 5, 4, 3, 2, 1, 0, -1, 1, 0, -1, -2, -3, -4, -5, -6];
const ROTATIONS_INFERIOR_16 = [-6, -5, -4, -3, -2, -1, 0, 1, -1, 0, 1, 2, 3, 4, 5, 6];

// Conjuntos específicos para dentição decídua (10 dentes por arcada)
// Superior decídua: U (centro mais baixo, valores positivos)
// Inferior decídua: ∩ (centro mais alto, valores negativos)
const OFFSETS_SUPERIOR_10 = [12, 20, 28, 36, 44, 44, 36, 28, 20, 12];
const OFFSETS_INFERIOR_10 = [-12, -20, -28, -36, -44, -44, -36, -28, -20, -12];
const ROTATIONS_SUPERIOR_10 = [6, 4, 2, 1, 0, 0, -1, -2, -4, -6];
const ROTATIONS_INFERIOR_10 = [-6, -4, -2, -1, 0, 0, 1, 2, 4, 6];

// Componente DatePicker com calendário visual
function DatePicker({ value, onChange, placeholder = 'DD/MM/AAAA', className = '' }: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          return new Date(year, month, 1);
        }
      }
    }
    return new Date();
  });

  // Atualizar mês quando value mudar
  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          setCurrentMonth(new Date(year, month, 1));
        }
      }
    }
  }, [value]);

  const selectedDate = value ? (() => {
    const parts = value.split('/');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
        return new Date(year, month, day);
      }
    }
    return null;
  })() : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleDateSelect = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    onChange(`${day}/${month}/${year}`);
    setIsOpen(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const today = new Date();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer text-left bg-white hover:border-green-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                {value || placeholder}
              </span>
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0 z-[1003]" align="start" side="bottom" sideOffset={4}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="text-sm font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isSameDay(day, today);

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !isTodayDate && 'text-gray-700 hover:bg-gray-100',
                    isTodayDate && !isSelected && 'bg-blue-50 text-blue-700 border border-blue-300',
                    isSelected && 'bg-green-600 text-white shadow-md'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                handleDateSelect(today);
              }}
              className="w-full px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors font-medium"
            >
              Hoje
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DentalChart({
  companyId,
  patientId,
  professionals,
  procedimentos,
  onAddProcedimento,
  onEditProcedimento,
  onDeleteProcedimento,
  orcamentos = [],
  onNavigateToOrcamentos,
}: DentalChartProps) {
  const { company } = useCompany(companyId);
  const { patient } = usePatient(companyId, patientId);
  const { createOrcamento } = useOrcamentos(companyId, patientId);
  const { themePreference, customColor, customColor2 } = useAuth();
  
  // Variáveis de tema
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom' && customColor;
  const hasGradient = isVibrant || isCustom;
  const gradientColors = isCustom && customColor ? getGradientColors('custom', customColor, customColor2) : null;
  const gradientStyleHorizontal = isCustom && customColor ? getGradientStyle('custom', customColor, '90deg', customColor2) : undefined;
  const gradientStyleDiagonal = isCustom && customColor ? getGradientStyle('custom', customColor, '135deg', customColor2) : undefined;
  
  // Função para verificar se um procedimento está em algum orçamento finalizado
  const procedimentoTemOrcamento = (procId: string): boolean => {
    return orcamentos.some((orc: any) => 
      orc.status === 'finalizado' && orc.procedimentos.some((p: any) => p.id === procId)
    );
  };
  
  // Função para contar quantos orçamentos finalizados um procedimento tem
  const contarOrcamentosPorProcedimento = (procId: string): number => {
    return orcamentos.filter((orc: any) => 
      orc.status === 'finalizado' && orc.procedimentos.some((p: any) => p.id === procId)
    ).length;
  };
  
  // Função para obter os IDs dos orçamentos que contêm um procedimento
  const obterOrcamentosPorProcedimento = (procId: string): string[] => {
    return orcamentos
      .filter((orc: any) => 
        orc.status === 'finalizado' && orc.procedimentos.some((p: any) => p.id === procId)
      )
      .map((orc: any) => orc.id);
  };
  const [tipoDenticao, setTipoDenticao] = useState<TipoDenticao>('permanente');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrcamentoModalOpen, setIsOrcamentoModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquear scroll do body quando o modal estiver aberto
  useEffect(() => {
    if (isModalOpen || isOrcamentoModalOpen) {
      // Salvar a posição atual do scroll
      const scrollY = window.scrollY;
      // Bloquear o scroll do body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar o scroll quando o modal fechar
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isModalOpen, isOrcamentoModalOpen]);
  const [procedimentosSelecionadosParaOrcamento, setProcedimentosSelecionadosParaOrcamento] = useState<Set<string>>(new Set());
  // Estados para adicionar procedimentos ao orçamento quando criados via modal
  const [orcamentoProcedimentos, setOrcamentoProcedimentos] = useState<Array<ProcedimentoOdontologico & { valorCentavosEditado?: number; valorEditadoString?: string; comissaoPercentEditado?: number }>>([]);
  const [editingProc, setEditingProc] = useState<ProcedimentoOdontologico | null>(null);
  const [selectedProcDetails, setSelectedProcDetails] = useState<ProcedimentoOdontologico | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    procedimento: '',
    serviceIds: [] as string[],
    valorCentavos: '',
    dentes: [] as DenteProcedimento[],
    additionalDentes: [] as DenteProcedimento[],
    profissionalId: '',
    estado: 'a_realizar' as EstadoProcedimento,
    realizadoEm: '',
    gerarPagamentoFinanceiro: false,
    observacoes: '',
    bulkSelection: false,
    bulkTypes: [] as Array<'ALL' | 'UPPER' | 'LOWER'>,
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const { services } = useServices(companyId);
  // Filtro da Ficha Geral (exclusivo)
  const [filterState, setFilterState] = useState<'all' | EstadoProcedimento>('all');

  // Pré-carregar imagens quando o componente montar (backup caso não tenha carregado na página)
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const allTeethNumbers = [
      11, 12, 13, 14, 15, 16, 17, 18,
      21, 22, 23, 24, 25, 26, 27, 28,
      31, 32, 33, 34, 35, 36, 37, 38,
      41, 42, 43, 44, 45, 46, 47, 48,
      51, 52, 53, 54, 55,
      61, 62, 63, 64, 65,
      71, 72, 73, 74, 75,
      81, 82, 83, 84, 85,
    ];

    // Carregar todas as imagens imediatamente
    allTeethNumbers.forEach((numero) => {
      const imagePath = `/images/dental-teeth/${numero}.png`;
      
      // Verificar se já foi pré-carregado (evitar duplicação)
      const existingLink = document.querySelector(`link[href="${imagePath}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imagePath;
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
      }

      // Sempre forçar carregamento via Image object
      const img = new Image();
      img.src = imagePath;
    });
  }, []);

  // Filtrar serviços baseado na busca
  const filteredServices = services.filter(service =>
    service.nome.toLowerCase().includes(serviceQuery.toLowerCase())
  );

  // Atualizar procedimento e valor quando serviços mudarem
  useEffect(() => {
    if (formData.serviceIds.length > 0) {
      const selectedServicesList = services.filter(s => formData.serviceIds.includes(s.id));
      const procedimentoNome = selectedServicesList.map(s => s.nome).join(', ');
      const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
      setFormData(prev => ({
        ...prev,
        procedimento: procedimentoNome,
        valorCentavos: (totalPrice / 100).toFixed(2).replace('.', ','),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        procedimento: '',
        valorCentavos: '',
      }));
    }
  }, [formData.serviceIds, services]);

  const dentes = tipoDenticao === 'permanente' ? DENTES_PERMANENTES : DENTES_DECIDUOS;

  const getSelecaoRapida = () => {
    const superiores = [...dentes.superior_direita, ...dentes.superior_esquerda];
    const inferiores = [...dentes.inferior_direita, ...dentes.inferior_esquerda];
    const todos = [...superiores, ...inferiores];
    return { superiores, inferiores, todos };
  };

  const handleToothClick = (numero: number) => {
    setSelectedTooth(numero);
    setEditingProc(null);
    // Inicializar com o dente clicado
    setFormData(prev => ({
      ...prev,
      procedimento: '',
      serviceIds: [],
      valorCentavos: '',
      dentes: [{ numero, faces: [] }],
      additionalDentes: [],
      profissionalId: '',
      estado: 'a_realizar',
      realizadoEm: '',
      gerarPagamentoFinanceiro: false,
      observacoes: '',
      bulkSelection: false,
      bulkTypes: [],
    }));
    setIsModalOpen(true);
  };

  const handleEditProc = (proc: ProcedimentoOdontologico) => {
    setEditingProc(proc);
    setOpenMenuId(null);
    // Preencher o formulário com os dados do procedimento
    const serviceIdsFromProc = proc.procedimento ? 
      services.filter(s => proc.procedimento.includes(s.nome)).map(s => s.id) : [];
    
    setFormData({
      procedimento: proc.procedimento || '',
      serviceIds: serviceIdsFromProc,
      valorCentavos: ((proc.valorCentavos || 0) / 100).toFixed(2).replace('.', ','),
      dentes: proc.dentes && proc.dentes.length > 0 ? proc.dentes : [],
      additionalDentes: [],
      profissionalId: proc.profissionalId || '',
      estado: proc.estado || 'a_realizar',
      realizadoEm: proc.realizadoEm ? new Date(proc.realizadoEm).toISOString().split('T')[0] : '',
      gerarPagamentoFinanceiro: proc.gerarPagamentoFinanceiro || false,
      observacoes: proc.observacoes || '',
      bulkSelection: !!(proc as any).selectionTypes && (proc as any).selectionTypes.length > 0,
      bulkTypes: (proc as any).selectionTypes || [],
    });
    setIsModalOpen(true);
  };

  const handleAddDente = () => {
    // Se está em seleção em lote, voltar para seleção limpa (apenas 1 seletor)
    if (formData.bulkSelection) {
      const defaultNumero = selectedTooth || (tipoDenticao === 'permanente' ? 11 : 51);
      setFormData(prev => ({
        ...prev,
        dentes: [{ numero: defaultNumero, faces: [] }],
        bulkSelection: false,
        bulkTypes: [],
      }));
      return;
    }
    const novoNumero = selectedTooth || (tipoDenticao === 'permanente' ? 11 : 51);
    setFormData(prev => ({
      ...prev,
      dentes: [...prev.dentes, { numero: novoNumero, faces: [] }],
      bulkSelection: false,
      bulkTypes: [],
    }));
  };

  const handleAddAdditionalDente = () => {
    const defaultNumero = selectedTooth || (tipoDenticao === 'permanente' ? 11 : 51);
    setFormData(prev => ({
      ...prev,
      additionalDentes: [...prev.additionalDentes, { numero: defaultNumero, faces: [] }],
      bulkSelection: true,
    }));
  };

  const handleRemoveAdditionalDente = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalDentes: prev.additionalDentes.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateAdditionalDente = (index: number, updates: Partial<DenteProcedimento>) => {
    setFormData(prev => ({
      ...prev,
      additionalDentes: prev.additionalDentes.map((d, i) => (i === index ? { ...d, ...updates } : d)),
    }));
  };

  const handleToggleFaceAdditional = (denteIndex: number, face: FaceDente) => {
    setFormData(prev => {
      const dente = prev.additionalDentes[denteIndex];
      const faces = dente.faces.includes(face)
        ? dente.faces.filter(f => f !== face)
        : [...dente.faces, face];
      return {
        ...prev,
        additionalDentes: prev.additionalDentes.map((d, i) => (i === denteIndex ? { ...d, faces } : d)),
      };
    });
  };

  const handleRemoveDente = (index: number) => {
    setFormData(prev => {
      const updated = prev.dentes.filter((_, i) => i !== index);
      const shouldDisableBulk = updated.length <= 1;
      return {
        ...prev,
        dentes: updated,
        bulkSelection: shouldDisableBulk ? false : prev.bulkSelection,
        bulkTypes: shouldDisableBulk ? [] : prev.bulkTypes,
      };
    });
  };

  const handleUpdateDente = (index: number, updates: Partial<DenteProcedimento>) => {
    setFormData(prev => ({
      ...prev,
      dentes: prev.dentes.map((dente, i) => (i === index ? { ...dente, ...updates } : dente)),
    }));
  };

  const handleToggleFace = (denteIndex: number, face: FaceDente) => {
    setFormData(prev => {
      const dente = prev.dentes[denteIndex];
      const faces = dente.faces.includes(face)
        ? dente.faces.filter(f => f !== face)
        : [...dente.faces, face];
      return {
        ...prev,
        dentes: prev.dentes.map((d, i) => (i === denteIndex ? { ...d, faces } : d)),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      alert('ID do paciente não encontrado.');
      return;
    }
    if (formData.serviceIds.length === 0) {
      alert('Por favor, selecione pelo menos um serviço.');
      return;
    }

    // Se estiver editando, usar onEditProcedimento
    if (editingProc && onEditProcedimento) {
      const valorCentavos = Math.round(parseFloat(formData.valorCentavos.replace(',', '.')) * 100) || 0;
      const selectedDentes: DenteProcedimento[] = formData.bulkSelection
        ? formData.additionalDentes
        : formData.dentes;

      try {
        const updateData: Partial<ProcedimentoOdontologico> = {
          procedimento: formData.procedimento.trim(),
          valorCentavos,
          dentes: selectedDentes,
          profissionalId: formData.profissionalId,
          estado: formData.estado,
          realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
          gerarPagamentoFinanceiro: formData.gerarPagamentoFinanceiro,
          observacoes: (formData.observacoes || '').trim() || undefined,
        };

        if (formData.bulkSelection && formData.bulkTypes.length > 0) {
          (updateData as any).selectionTypes = formData.bulkTypes;
        }

        await onEditProcedimento(editingProc.id, updateData);
        setIsModalOpen(false);
        setEditingProc(null);
        setSelectedTooth(null);
        setFormData({
          procedimento: '',
          serviceIds: [],
          valorCentavos: '',
          dentes: [],
          additionalDentes: [],
          profissionalId: '',
          estado: 'a_realizar',
          realizadoEm: '',
          gerarPagamentoFinanceiro: false,
          observacoes: '',
          bulkSelection: false,
          bulkTypes: [],
        });
      } catch (error) {
        console.error('Erro ao editar procedimento:', error);
        alert('Erro ao editar procedimento. Por favor, tente novamente.');
      }
      return;
    }

    // Se estiver no contexto de orçamento, apenas adicionar à lista do orçamento sem salvar como procedimento
    if (isOrcamentoModalOpen) {
      const valorCentavos = Math.round(parseFloat(formData.valorCentavos.replace(',', '.')) * 100) || 0;
      const selectedDentes: DenteProcedimento[] = formData.bulkSelection
        ? formData.additionalDentes
        : formData.dentes;

      // Se for seleção em lote, criar um único procedimento agregado
      if (formData.bulkSelection && formData.bulkTypes.length > 0) {
        const novoProcedimento: ProcedimentoOdontologico & { valorEditadoString?: string } = {
          id: `temp-${Date.now()}`,
          companyId,
          patientId: patientId || '',
          procedimento: formData.procedimento.trim(),
          valorCentavos,
          dentes: [],
          profissionalId: formData.profissionalId || '',
          estado: formData.estado,
          realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
          gerarPagamentoFinanceiro: false,
          observacoes: (formData.observacoes || '').trim() || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          selectionTypes: formData.bulkTypes,
          valorEditadoString: formData.valorCentavos || (valorCentavos / 100).toFixed(2).replace('.', ','),
        };
        setOrcamentoProcedimentos(prev => [...prev, novoProcedimento]);
        
        // Adicionar também os dentes adicionais se houver
        if (formData.additionalDentes.length > 0) {
          formData.additionalDentes.forEach(d => {
            const proc: ProcedimentoOdontologico & { valorEditadoString?: string } = {
              id: `temp-${Date.now()}-${d.numero}`,
              companyId,
              patientId: patientId || '',
              procedimento: formData.procedimento.trim(),
              valorCentavos,
              dentes: [{ numero: d.numero, faces: d.faces || [] }],
              profissionalId: formData.profissionalId || '',
              estado: formData.estado,
              realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
              gerarPagamentoFinanceiro: false,
              observacoes: (formData.observacoes || '').trim() || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
              valorEditadoString: formData.valorCentavos || (valorCentavos / 100).toFixed(2).replace('.', ','),
            };
            setOrcamentoProcedimentos(prev => [...prev, proc]);
          });
        }
      } else if (selectedDentes.length > 1) {
        // Múltiplos dentes - criar um procedimento por dente
        selectedDentes.forEach(d => {
          const proc: ProcedimentoOdontologico & { valorEditadoString?: string } = {
            id: `temp-${Date.now()}-${d.numero}`,
            companyId,
            patientId: patientId || '',
            procedimento: formData.procedimento.trim(),
            valorCentavos,
            dentes: [{ numero: d.numero, faces: d.faces || [] }],
            profissionalId: formData.profissionalId || '',
            estado: formData.estado,
            realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
            gerarPagamentoFinanceiro: false,
            observacoes: (formData.observacoes || '').trim() || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            valorEditadoString: formData.valorCentavos || (valorCentavos / 100).toFixed(2).replace('.', ','),
          };
          setOrcamentoProcedimentos(prev => [...prev, proc]);
        });
      } else {
        // Procedimento único
        const novoProcedimento: ProcedimentoOdontologico & { valorEditadoString?: string } = {
          id: `temp-${Date.now()}`,
          companyId,
          patientId: patientId || '',
          procedimento: formData.procedimento.trim(),
          valorCentavos,
          dentes: selectedDentes.length === 1 ? selectedDentes : [],
          profissionalId: formData.profissionalId || '',
          estado: formData.estado,
          realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
          gerarPagamentoFinanceiro: false,
          observacoes: (formData.observacoes || '').trim() || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          valorEditadoString: formData.valorCentavos || (valorCentavos / 100).toFixed(2).replace('.', ','),
        };
        setOrcamentoProcedimentos(prev => [...prev, novoProcedimento]);
      }
      
      setIsModalOpen(false);
      setSelectedTooth(null);
      setFormData({
        procedimento: '',
        serviceIds: [],
        valorCentavos: '',
        dentes: [],
        additionalDentes: [],
        profissionalId: '',
        estado: 'a_realizar',
        realizadoEm: '',
        gerarPagamentoFinanceiro: false,
        observacoes: '',
        bulkSelection: false,
        bulkTypes: [],
      });
      return;
    }

    const selectedDentes: DenteProcedimento[] = formData.bulkSelection
      ? formData.additionalDentes
      : formData.dentes;
    // Seleção de dentes e faces é opcional: não bloquear envio se vazio ou sem faces

    const valorCentavos = Math.round(parseFloat(formData.valorCentavos.replace(',', '.')) * 100) || 0;

    try {
      // Modo LOTE: criar apenas a entrada agregada (com selectionTypes) e,
      // se houver "dentes adicionais", criar entradas individuais apenas para eles.
      if (formData.bulkSelection && formData.bulkTypes.length > 0) {
        // 1) Agregado (agrupado)
        const aggregatedData: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'> = {
          companyId,
          patientId: patientId || '',
          procedimento: formData.procedimento.trim(),
          valorCentavos,
          dentes: [], // agrupado não precisa listar todos os dentes
          profissionalId: formData.profissionalId,
          selectionTypes: formData.bulkTypes,
          estado: formData.estado,
          realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
          gerarPagamentoFinanceiro: formData.gerarPagamentoFinanceiro,
          observacoes: (formData.observacoes || '').trim() || undefined,
        };
        await onAddProcedimento(aggregatedData);

        // 2) Entradas individuais apenas para os dentes adicionais (se houver)
        if (formData.additionalDentes.length > 0) {
          for (const d of formData.additionalDentes) {
            const perToothData: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'> = {
              companyId,
              patientId: patientId || '',
              procedimento: formData.procedimento.trim(),
              valorCentavos,
              dentes: [{ numero: d.numero, faces: d.faces || [] }],
              profissionalId: formData.profissionalId,
              estado: formData.estado,
              realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
              gerarPagamentoFinanceiro: formData.gerarPagamentoFinanceiro,
              observacoes: (formData.observacoes || '').trim() || undefined,
            };
            await onAddProcedimento(perToothData);
          }
        }
      } else {
        // Modo INDIVIDUAL: se houver vários dentes, criar um registro por dente; senão, único
        if (formData.dentes.length > 1) {
          for (const d of formData.dentes) {
            const perToothData: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'> = {
              companyId,
              patientId: patientId || '',
              procedimento: formData.procedimento.trim(),
              valorCentavos,
              dentes: [{ numero: d.numero, faces: d.faces || [] }],
              profissionalId: formData.profissionalId,
              estado: formData.estado,
              realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
              gerarPagamentoFinanceiro: formData.gerarPagamentoFinanceiro,
              observacoes: (formData.observacoes || '').trim() || undefined,
            };
            await onAddProcedimento(perToothData);
          }
        } else {
          const singleData: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'> = {
            companyId,
            patientId: patientId || '',
            procedimento: formData.procedimento.trim(),
            valorCentavos,
            dentes: formData.dentes.length === 1 ? formData.dentes : [],
            profissionalId: formData.profissionalId,
            estado: formData.estado,
            realizadoEm: formData.realizadoEm ? new Date(formData.realizadoEm) : undefined,
            gerarPagamentoFinanceiro: formData.gerarPagamentoFinanceiro,
            observacoes: (formData.observacoes || '').trim() || undefined,
          };
          await onAddProcedimento(singleData);
        }
      }
      setIsModalOpen(false);
      
      setEditingProc(null);
      setSelectedTooth(null);
      setFormData({
        procedimento: '',
        serviceIds: [],
        valorCentavos: '',
        dentes: [],
        additionalDentes: [],
        profissionalId: '',
        estado: 'a_realizar',
        realizadoEm: '',
        gerarPagamentoFinanceiro: false,
        observacoes: '',
        bulkSelection: false,
        bulkTypes: [],
      });
    } catch (error) {
      console.error('Erro ao salvar procedimento:', error);
      alert('Erro ao salvar procedimento. Tente novamente.');
    }
  };

  const getProcedimentosByTooth = (numero: number) => {
    return procedimentos.filter(p => p.dentes.some(d => d.numero === numero));
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  return (
    <div className="space-y-6">
      {/* Botão para adicionar novo procedimento - no topo */}
      <div className="flex justify-end -mt-2 mb-2">
        <Button
          onClick={() => {
            setSelectedTooth(null);
            setEditingProc(null);
            setFormData({
              procedimento: '',
              serviceIds: [],
              valorCentavos: '',
              dentes: [],
              additionalDentes: [],
              profissionalId: '',
              estado: 'a_realizar',
              realizadoEm: '',
              gerarPagamentoFinanceiro: false,
              observacoes: '',
              bulkSelection: false,
              bulkTypes: [],
            });
            setIsModalOpen(true);
          }}
          className={cn(
            "text-white shadow-lg transition-all duration-200 font-semibold px-5 py-2.5 text-sm",
            hasGradient
              ? isCustom && gradientColors
                ? ''
                : isVibrant
                ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-indigo-500/30'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-slate-500/30'
                      : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-slate-500/30'
          )}
          style={hasGradient && isCustom && gradientColors ? {
            background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
            boxShadow: `0 10px 15px -3px ${gradientColors.start}30, 0 4px 6px -2px ${gradientColors.start}20`,
          } : undefined}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Novo Procedimento
        </Button>
      </div>

      {/* Seletor de tipo de dentição */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-700 mb-2 sm:mb-0 block sm:inline">Tipo de Dentição:</span>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTipoDenticao('permanente')}
              className={`px-5 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${
              tipoDenticao === 'permanente'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Permanente
          </button>
          <button
            type="button"
            onClick={() => setTipoDenticao('decidua')}
              className={`px-5 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${
              tipoDenticao === 'decidua'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Decídua
          </button>
          </div>
        </div>
      </div>

      {/* Odontograma */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-6 overflow-visible">
        <div className="space-y-4 md:space-y-8 overflow-visible">
          {/* Arcada Superior */}
          <div>
            <div className="text-center mb-3 md:mb-5">
              <h3 className="text-base md:text-lg font-bold text-gray-900">Arcada Superior</h3>
            </div>
            <div className="flex flex-nowrap justify-center gap-0.5 md:gap-1 mb-2 pt-12 pb-20 md:pt-8 md:pb-25 overflow-visible" style={{ minHeight: 'auto' }}>
              {/* Superior Direita (Quadrante 1) - da direita para esquerda */}
              {dentes.superior_direita.map((numero, idx) => {
                const procedimentosDente = getProcedimentosByTooth(numero);
                const isDecidua = tipoDenticao === 'decidua';
                const overallIndex = isDecidua ? idx : idx; // 0..4 (decídua) | 0..7 (perm.)
                const offsetsArray = isDecidua ? OFFSETS_SUPERIOR_10 : OFFSETS_SUPERIOR_16;
                const rotationsArray = isDecidua ? ROTATIONS_SUPERIOR_10 : ROTATIONS_SUPERIOR_16;
                const translateY = offsetsArray[overallIndex] ?? 0;
                const rotateDeg = rotationsArray[overallIndex] ?? 0;
                return (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => handleToothClick(numero)}
                    onMouseEnter={() => setHoveredTooth(numero)}
                    onMouseLeave={() => setHoveredTooth(null)}
                    className={`w-[5.5vw] h-[11vw] max-w-7 max-h-14 md:max-w-none md:max-h-none md:w-[calc((100%-4rem)/16)] md:h-[calc((100%-4rem)/8)] lg:w-[calc((100%-4rem)/16)] lg:h-[calc((100%-4rem)/8)] border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ease-in-out relative flex-shrink-0 ${
                      procedimentosDente.length > 0
                        ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-400 shadow-md shadow-purple-200/50'
                        : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100/50'
                    }`}
                    title={`Dente ${numero}${procedimentosDente.length > 0 ? ` - ${procedimentosDente.length} procedimento(s)` : ''}`}
                    style={{ 
                      transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) ${hoveredTooth === numero ? 'scale(1.15)' : 'scale(1)'}`,
                      zIndex: hoveredTooth === numero ? 10 : 1
                    }}
                  >
                    <div className="w-[calc(100%-0.25rem)] h-[calc(100%-1.75rem)] max-w-7 max-h-12 md:max-w-none md:max-h-none md:w-full md:h-[calc(100%-1.5rem)] lg:w-full lg:h-[calc(100%-2rem)] mb-0.5 md:mb-1 flex items-center justify-center">
                      <ToothIcon numero={numero} hasProcedimentos={procedimentosDente.length > 0} />
                    </div>
                    <span className="text-[10px] md:text-sm lg:text-base font-bold text-gray-700 leading-none">{numero}</span>
                    {procedimentosDente.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-purple-600 text-white text-[10px] md:text-xs lg:text-sm font-bold rounded-full w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 flex items-center justify-center">
                        {procedimentosDente.length}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Superior Esquerda (Quadrante 2) - da esquerda para direita */}
              {dentes.superior_esquerda.map((numero, idx) => {
                const procedimentosDente = getProcedimentosByTooth(numero);
                const isDecidua = tipoDenticao === 'decidua';
                const overallIndex = isDecidua ? 5 + idx : 8 + idx; // 5..9 (decídua) | 8..15 (perm.)
                const offsetsArray = isDecidua ? OFFSETS_SUPERIOR_10 : OFFSETS_SUPERIOR_16;
                const rotationsArray = isDecidua ? ROTATIONS_SUPERIOR_10 : ROTATIONS_SUPERIOR_16;
                const translateY = offsetsArray[overallIndex] ?? 0;
                const rotateDeg = rotationsArray[overallIndex] ?? 0;
                return (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => handleToothClick(numero)}
                    onMouseEnter={() => setHoveredTooth(numero)}
                    onMouseLeave={() => setHoveredTooth(null)}
                    className={`w-[5.5vw] h-[11vw] max-w-7 max-h-14 md:max-w-none md:max-h-none md:w-[calc((100%-4rem)/16)] md:h-[calc((100%-4rem)/8)] lg:w-[calc((100%-4rem)/16)] lg:h-[calc((100%-4rem)/8)] border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ease-in-out relative flex-shrink-0 ${
                      procedimentosDente.length > 0
                        ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-400 shadow-md shadow-purple-200/50'
                        : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100/50'
                    }`}
                    title={`Dente ${numero}${procedimentosDente.length > 0 ? ` - ${procedimentosDente.length} procedimento(s)` : ''}`}
                    style={{ 
                      transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) ${hoveredTooth === numero ? 'scale(1.15)' : 'scale(1)'}`,
                      zIndex: hoveredTooth === numero ? 10 : 1
                    }}
                  >
                    <div className="w-[calc(100%-0.25rem)] h-[calc(100%-1.75rem)] max-w-7 max-h-12 md:max-w-none md:max-h-none md:w-full md:h-[calc(100%-1.5rem)] lg:w-full lg:h-[calc(100%-2rem)] mb-0.5 md:mb-1 flex items-center justify-center">
                      <ToothIcon numero={numero} hasProcedimentos={procedimentosDente.length > 0} />
                    </div>
                    <span className="text-[10px] md:text-sm lg:text-base font-bold text-gray-700 leading-none">{numero}</span>
                    {procedimentosDente.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-purple-600 text-white text-[10px] md:text-xs lg:text-sm font-bold rounded-full w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 flex items-center justify-center">
                        {procedimentosDente.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arcada Inferior */}
          <div className="mt-6 md:mt-8">
            <div className="text-center mb-3 md:mb-5">
              <h3 className="text-base md:text-lg font-bold text-gray-900"></h3>
            </div>
            <div className="flex flex-nowrap justify-center gap-0.5 md:gap-1 pt-16 pb-12 md:pt-12 md:pb-4 overflow-visible" style={{ minHeight: 'auto' }}>
              {/* Inferior Direita (Quadrante 4) - da direita para esquerda */}
              {dentes.inferior_direita.map((numero, idx) => {
                const procedimentosDente = getProcedimentosByTooth(numero);
                const isDecidua = tipoDenticao === 'decidua';
                const overallIndex = isDecidua ? idx : idx; // 0..4 (decídua) | 0..7 (perm.)
                const offsetsArray = isDecidua ? OFFSETS_INFERIOR_10 : OFFSETS_INFERIOR_16;
                const rotationsArray = isDecidua ? ROTATIONS_INFERIOR_10 : ROTATIONS_INFERIOR_16;
                const translateY = offsetsArray[overallIndex] ?? 0;
                const rotateDeg = rotationsArray[overallIndex] ?? 0;
                return (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => handleToothClick(numero)}
                    onMouseEnter={() => setHoveredTooth(numero)}
                    onMouseLeave={() => setHoveredTooth(null)}
                    className={`w-[5.5vw] h-[11vw] max-w-7 max-h-14 md:max-w-none md:max-h-none md:w-[calc((100%-4rem)/16)] md:h-[calc((100%-4rem)/8)] lg:w-[calc((100%-4rem)/16)] lg:h-[calc((100%-4rem)/8)] border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ease-in-out relative flex-shrink-0 ${
                      procedimentosDente.length > 0
                        ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-400 shadow-md shadow-purple-200/50'
                        : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100/50'
                    }`}
                    title={`Dente ${numero}${procedimentosDente.length > 0 ? ` - ${procedimentosDente.length} procedimento(s)` : ''}`}
                    style={{ 
                      transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) ${hoveredTooth === numero ? 'scale(1.15)' : 'scale(1)'}`,
                      zIndex: hoveredTooth === numero ? 10 : 1
                    }}
                  >
                    <div className="w-[calc(100%-0.25rem)] h-[calc(100%-1.75rem)] max-w-7 max-h-12 md:max-w-none md:max-h-none md:w-full md:h-[calc(100%-1.5rem)] lg:w-full lg:h-[calc(100%-2rem)] mb-0.5 md:mb-1 flex items-center justify-center">
                      <ToothIcon numero={numero} hasProcedimentos={procedimentosDente.length > 0} />
                    </div>
                    <span className="text-[10px] md:text-sm lg:text-base font-bold text-gray-700 leading-none">{numero}</span>
                    {procedimentosDente.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-purple-600 text-white text-[10px] md:text-xs lg:text-sm font-bold rounded-full w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 flex items-center justify-center">
                        {procedimentosDente.length}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Inferior Esquerda (Quadrante 3) - da esquerda para direita */}
              {dentes.inferior_esquerda.map((numero, idx) => {
                const procedimentosDente = getProcedimentosByTooth(numero);
                const isDecidua = tipoDenticao === 'decidua';
                const overallIndex = isDecidua ? 5 + idx : 8 + idx; // 5..9 (decídua) | 8..15 (perm.)
                const offsetsArray = isDecidua ? OFFSETS_INFERIOR_10 : OFFSETS_INFERIOR_16;
                const rotationsArray = isDecidua ? ROTATIONS_INFERIOR_10 : ROTATIONS_INFERIOR_16;
                const translateY = offsetsArray[overallIndex] ?? 0;
                const rotateDeg = rotationsArray[overallIndex] ?? 0;
                return (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => handleToothClick(numero)}
                    onMouseEnter={() => setHoveredTooth(numero)}
                    onMouseLeave={() => setHoveredTooth(null)}
                    className={`w-[5.5vw] h-[11vw] max-w-7 max-h-14 md:max-w-none md:max-h-none md:w-[calc((100%-4rem)/16)] md:h-[calc((100%-4rem)/8)] lg:w-[calc((100%-4rem)/16)] lg:h-[calc((100%-4rem)/8)] border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ease-in-out relative flex-shrink-0 ${
                      procedimentosDente.length > 0
                        ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-400 shadow-md shadow-purple-200/50'
                        : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100/50'
                    }`}
                    title={`Dente ${numero}${procedimentosDente.length > 0 ? ` - ${procedimentosDente.length} procedimento(s)` : ''}`}
                    style={{ 
                      marginTop: translateY,
                      transform: `rotate(${rotateDeg}deg) ${hoveredTooth === numero ? 'scale(1.15)' : 'scale(1)'}`,
                      zIndex: hoveredTooth === numero ? 10 : 1
                    }}
                  >
                    <div className="w-[calc(100%-0.25rem)] h-[calc(100%-1.75rem)] max-w-7 max-h-12 md:max-w-none md:max-h-none md:w-full md:h-[calc(100%-1.5rem)] lg:w-full lg:h-[calc(100%-2rem)] mb-0.5 md:mb-1 flex items-center justify-center">
                      <ToothIcon numero={numero} hasProcedimentos={procedimentosDente.length > 0} />
                    </div>
                    <span className="text-[10px] md:text-sm lg:text-base font-bold text-gray-700 leading-none">{numero}</span>
                    {procedimentosDente.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-purple-600 text-white text-[10px] md:text-xs lg:text-sm font-bold rounded-full w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 flex items-center justify-center">
                        {procedimentosDente.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-center mt-2 md:mt-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Arcada Inferior</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Ficha Geral - Tabela de Procedimentos */}
      <div className={cn(
        'rounded-2xl border-2 shadow-xl p-6 md:p-8 backdrop-blur-xl',
        hasGradient
          ? isCustom && gradientColors
            ? 'bg-white/90 border-white/40'
            : isVibrant
            ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
            : 'bg-white/90 border-white/40'
          : 'bg-white border-gray-200'
      )}
      style={
        hasGradient && isCustom && gradientColors
          ? {
              borderColor: `${gradientColors.start}40`,
              background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
            }
          : undefined
      }
      >
        {/* Header moderno com gradiente */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex items-center justify-between mb-6 pb-4 border-b relative overflow-hidden',
            hasGradient
              ? isCustom && gradientColors
                ? 'border-white/40'
                : isVibrant
                ? 'bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
                : 'bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 border-white/40'
              : 'bg-gradient-to-r from-slate-50 to-blue-50 border-gray-200'
          )}
          style={
            hasGradient && isCustom && gradientColors
              ? {
                  background: `linear-gradient(90deg, ${gradientColors.start}20 0%, ${gradientColors.middle}20 50%, ${gradientColors.end}20 100%)`,
                  borderColor: `${gradientColors.start}40`,
                }
              : undefined
          }
        >
          {/* Elemento decorativo */}
          <div
            className={cn(
              'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-16 -mt-16',
              hasGradient
                ? isCustom && gradientColors
                  ? ''
                  : isVibrant
                  ? 'bg-gradient-to-br from-indigo-400 to-pink-400'
                  : 'bg-gradient-to-br from-blue-400 to-indigo-400'
                : 'bg-gradient-to-br from-slate-400 to-blue-400'
            )}
            style={
              hasGradient && isCustom && gradientColors
                ? {
                    background: `radial-gradient(circle, ${gradientColors.start} 0%, transparent 70%)`,
                  }
                : undefined
            }
          />
          <div className="flex items-center gap-3 relative z-10">
            <div
              className={cn(
                'p-3 rounded-xl shadow-lg',
                hasGradient
                  ? isCustom && gradientColors
                    ? ''
                    : isVibrant
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : 'bg-gradient-to-br from-slate-500 to-blue-500'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
            >
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={cn(
                'text-xl font-bold',
                hasGradient 
                  ? isCustom && gradientColors
                    ? 'bg-clip-text text-transparent'
                    : isVibrant
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                    : 'text-slate-900'
                  : 'text-gray-900'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : undefined
              }
              >
                Ficha Geral
              </h3>
            </div>
          </div>
          <div className={cn(
            'text-sm font-semibold px-4 py-2 rounded-xl backdrop-blur-sm border shadow-sm relative z-10',
            hasGradient
              ? isCustom && gradientColors
                ? 'bg-white/80 border-white/50 text-slate-700'
                : 'bg-white/70 border-white/40 text-slate-700'
              : 'bg-white/90 border-gray-200/60 text-gray-700'
          )}>
            {procedimentos.length} {procedimentos.length === 1 ? 'procedimento' : 'procedimentos'}
          </div>
        </motion.div>
        {/* Filtros (exclusivos) */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterState('all')}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm',
              filterState === 'all'
                ? hasGradient
                  ? isCustom && gradientColors
                    ? 'text-white shadow-lg'
                    : isVibrant
                    ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-md shadow-indigo-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gradient-to-r from-slate-600 to-blue-600 text-white shadow-md shadow-slate-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            style={
              filterState === 'all' && hasGradient && isCustom && gradientColors
                ? {
                    background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                  }
                : undefined
            }
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterState('a_realizar')}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm',
              filterState === 'a_realizar'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            A Realizar
          </button>
          <button
            type="button"
            onClick={() => setFilterState('realizado')}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm',
              filterState === 'realizado'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Realizado
          </button>
          <button
            type="button"
            onClick={() => setFilterState('pre_existente')}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm',
              filterState === 'pre_existente'
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Pré-existente
          </button>
        </div>
        {/* Computar lista filtrada */}
        {(() => {
          // no-op IIFE apenas para limitar escopo de variáveis na JSX
          return null;
        })()}
        <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
          <div className="min-w-full">
              {((filterState === 'all' ? procedimentos : procedimentos.filter(p => p.estado === filterState))).length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className={cn(
                  'inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border-2 shadow-lg',
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'bg-white/80 border-white/50'
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-100/60 via-purple-100/60 to-pink-100/60 border-white/40'
                      : 'bg-slate-100/60 border-white/40'
                    : 'bg-gray-100 border-gray-200/60'
                )}
                style={
                  hasGradient && isCustom && gradientColors
                    ? {
                        backgroundColor: `${gradientColors.start}20`,
                        borderColor: `${gradientColors.start}50`,
                      }
                    : undefined
                }
                >
                  <Search className={cn(
                    'w-10 h-10',
                    hasGradient 
                      ? isCustom && gradientColors
                        ? 'text-slate-600'
                        : 'text-slate-500'
                      : 'text-gray-500'
                  )} />
                </div>
                <h3 className={cn(
                  'text-lg font-bold mb-2',
                  hasGradient 
                    ? isCustom && gradientColors
                      ? 'text-slate-800'
                      : 'text-slate-700'
                    : 'text-gray-700'
                )}>
                  Nenhum procedimento registrado
                </h3>
                <p className={cn(
                  'text-sm',
                  hasGradient 
                    ? isCustom && gradientColors
                      ? 'text-slate-600'
                      : 'text-slate-500'
                    : 'text-gray-500'
                )}>
                  Clique em um dente para adicionar um procedimento
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {(filterState === 'all' ? procedimentos : procedimentos.filter(p => p.estado === filterState)).map((proc) => {
                  const estadoLabels = {
                    a_realizar: 'A Realizar',
                    realizado: 'Realizado',
                    pre_existente: 'Pré-Existente',
                  };
                  const estadoStyles = {
                    a_realizar: 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 text-amber-800',
                    realizado: 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-200 text-green-800',
                    pre_existente: 'bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200 text-slate-800',
                  };
                  const dentesResumo = proc.dentes.map(d => `${d.numero}`).join(', ');
                  const selecaoLabel =
                    ((proc as any).selectionTypes && (proc as any).selectionTypes.length
                      ? ((proc as any).selectionTypes as Array<'ALL' | 'UPPER' | 'LOWER'>)
                          .map((t: 'ALL' | 'UPPER' | 'LOWER') => (t === 'ALL' ? 'Todos' : t === 'UPPER' ? 'Arcada Superior' : 'Arcada Inferior'))
                          .join(' + ')
                      : (proc as any).selectionType
                      ? (([(proc as any).selectionType] as Array<'ALL' | 'UPPER' | 'LOWER'>)
                          .map((t: 'ALL' | 'UPPER' | 'LOWER') => (t === 'ALL' ? 'Todos' : t === 'UPPER' ? 'Arcada Superior' : 'Arcada Inferior'))
                          .join(' + '))
                      : null);
                  const temOrcamento = procedimentoTemOrcamento(proc.id);
                  const quantidadeOrcamentos = contarOrcamentosPorProcedimento(proc.id);
                  
                  return (
                    <motion.div
                      key={proc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedProcDetails(proc)}
                      className={cn(
                        "group rounded-xl p-5 border-2 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer backdrop-blur-sm",
                        temOrcamento 
                          ? hasGradient
                            ? "border-blue-300/60 bg-blue-50/40 hover:border-blue-400/80"
                            : "border-blue-300 bg-blue-50/30 hover:border-blue-400"
                          : hasGradient
                          ? isCustom && gradientColors
                            ? "bg-white/90 border-white/60 hover:bg-white hover:border-white/80"
                            : "bg-white/95 border-white/60 hover:border-purple-300/60"
                          : "bg-white border-gray-200 hover:border-purple-300"
                      )}
                      style={
                        hasGradient && isCustom && gradientColors && !temOrcamento
                          ? {
                              borderColor: `${gradientColors.start}40`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className="font-semibold text-gray-900 text-base leading-tight">{proc.procedimento}</h4>
                              {temOrcamento && (
                                <Badge 
                                  className="bg-blue-100 text-blue-700 border-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-200 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const orcamentosIds = obterOrcamentosPorProcedimento(proc.id);
                                    if (onNavigateToOrcamentos && orcamentosIds.length > 0) {
                                      // Se houver múltiplos orçamentos, abre o primeiro
                                      onNavigateToOrcamentos(orcamentosIds[0]);
                                    } else if (onNavigateToOrcamentos) {
                                      onNavigateToOrcamentos();
                                    }
                                  }}
                                >
                                  <Wallet className="w-3 h-3" />
                                  {quantidadeOrcamentos > 1 ? `${quantidadeOrcamentos} orçamentos` : 'Orçado'}
                                </Badge>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${estadoStyles[proc.estado]} whitespace-nowrap`}>
                          {estadoLabels[proc.estado]}
                        </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900">{formatCurrency(proc.valorCentavos)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500">Dente:</span>
                              <span className="font-medium text-gray-900">{selecaoLabel || dentesResumo || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative flex-shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Abrir modal de orçamento com o procedimento clicado já selecionado
                              setProcedimentosSelecionadosParaOrcamento(new Set([proc.id]));
                              setIsOrcamentoModalOpen(true);
                            }}
                            className={cn(
                              'px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5',
                              hasGradient
                                ? isCustom && gradientColors
                                  ? ''
                                  : isVibrant
                                  ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-indigo-500/30 hover:shadow-indigo-500/40'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30 hover:shadow-blue-500/40'
                                : 'bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700 shadow-slate-500/30 hover:shadow-slate-500/40'
                            )}
                            style={
                              hasGradient && isCustom && gradientColors
                                ? {
                                    background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                                  }
                                : undefined
                            }
                            title="Orçar"
                          >
                            <FileText className="w-4 h-4" />
                            Orçar
                          </button>
                          <button
                            type="button"
                            data-menu-button-id={`menu-button-${proc.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === proc.id ? null : proc.id);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group-hover:bg-purple-50"
                            title="Ações"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500 group-hover:text-purple-600 transition-colors" />
                          </button>
                          {openMenuId === proc.id && (
                            <MenuPortal
                              onClose={() => setOpenMenuId(null)}
                              buttonId={`menu-button-${proc.id}`}
                            >
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className={cn(
                                  'rounded-xl shadow-2xl min-w-[200px] overflow-hidden border-2 backdrop-blur-xl',
                                  hasGradient
                                    ? isCustom && gradientColors
                                      ? 'bg-white/95 border-white/60'
                                      : 'bg-white/95 border-white/60'
                                    : 'bg-white border-gray-200'
                                )}
                                style={{
                                  borderColor: hasGradient && isCustom && gradientColors ? `${gradientColors.start}40` : undefined,
                                  boxShadow: hasGradient && isCustom && gradientColors
                                    ? `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px ${gradientColors.start}20`
                                    : undefined,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={cn(
                                  'py-2',
                                  hasGradient
                                    ? 'bg-gradient-to-br from-white/90 to-white/80'
                                    : 'bg-white'
                                )}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditProc(proc);
                                      setOpenMenuId(null);
                                    }}
                                    className={cn(
                                      'w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 my-1',
                                      hasGradient
                                        ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm'
                                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                    )}
                                  >
                                    <Edit className={cn(
                                      'w-4 h-4',
                                      hasGradient ? 'text-blue-600' : 'text-blue-600'
                                    )} />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!onEditProcedimento) return;
                                      
                                      const confirmar = window.confirm(
                                        'Tem certeza que deseja marcar este procedimento como "Realizado"?'
                                      );
                                      
                                      if (!confirmar) return;
                                      
                                      try {
                                        await onEditProcedimento(proc.id, { estado: 'realizado', realizadoEm: new Date() });
                                        setOpenMenuId(null);
                                      } catch (error) {
                                        console.error('Erro ao atualizar procedimento:', error);
                                        alert('Erro ao atualizar procedimento. Por favor, tente novamente.');
                                      }
                                    }}
                                    disabled={!onEditProcedimento}
                                    className={cn(
                                      'w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 my-1',
                                      onEditProcedimento
                                        ? hasGradient
                                          ? 'text-green-700 hover:bg-green-50 hover:shadow-sm'
                                          : 'text-green-700 hover:bg-green-50'
                                        : 'text-gray-400 cursor-not-allowed opacity-50'
                                    )}
                                  >
                                    <Check className={cn(
                                      'w-4 h-4',
                                      onEditProcedimento ? 'text-green-600' : 'text-gray-400'
                                    )} />
                                    <span>Concluir</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!onEditProcedimento) return;
                                      
                                      const confirmar = window.confirm(
                                        'Tem certeza que deseja marcar este procedimento como "A Realizar"?'
                                      );
                                      
                                      if (!confirmar) return;
                                      
                                      try {
                                        await onEditProcedimento(proc.id, { estado: 'a_realizar', realizadoEm: undefined });
                                        setOpenMenuId(null);
                                      } catch (error) {
                                        console.error('Erro ao atualizar procedimento:', error);
                                        alert('Erro ao atualizar procedimento. Por favor, tente novamente.');
                                      }
                                    }}
                                    disabled={!onEditProcedimento}
                                    className={cn(
                                      'w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 my-1',
                                      onEditProcedimento
                                        ? hasGradient
                                          ? 'text-amber-700 hover:bg-amber-50 hover:shadow-sm'
                                          : 'text-amber-700 hover:bg-amber-50'
                                        : 'text-gray-400 cursor-not-allowed opacity-50'
                                    )}
                                  >
                                    <span className="w-4 h-4 flex items-center justify-center">
                                      <span className="text-amber-600">⏳</span>
                                    </span>
                                    <span>A Realizar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!onEditProcedimento) return;
                                      
                                      const confirmar = window.confirm(
                                        'Tem certeza que deseja marcar este procedimento como "Pré-existente"?'
                                      );
                                      
                                      if (!confirmar) return;
                                      
                                      try {
                                        await onEditProcedimento(proc.id, { estado: 'pre_existente', realizadoEm: undefined });
                                        setOpenMenuId(null);
                                      } catch (error) {
                                        console.error('Erro ao atualizar procedimento:', error);
                                        alert('Erro ao atualizar procedimento. Por favor, tente novamente.');
                                      }
                                    }}
                                    disabled={!onEditProcedimento}
                                    className={cn(
                                      'w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 my-1',
                                      onEditProcedimento
                                        ? hasGradient
                                          ? 'text-slate-700 hover:bg-slate-50 hover:shadow-sm'
                                          : 'text-slate-700 hover:bg-slate-50'
                                        : 'text-gray-400 cursor-not-allowed opacity-50'
                                    )}
                                  >
                                    <span className="w-4 h-4 flex items-center justify-center">
                                      <span className="text-slate-600">📋</span>
                                    </span>
                                    <span>Pré-Existente</span>
                                  </button>
                                  {onDeleteProcedimento && (
                                    <>
                                      <div className={cn(
                                        'border-t my-2 mx-2',
                                        hasGradient
                                          ? 'border-gray-200/60'
                                          : 'border-gray-200'
                                      )} />
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!onDeleteProcedimento) return;
                                          if (confirm('Tem certeza que deseja excluir este procedimento?')) {
                                            try {
                                              await onDeleteProcedimento(proc.id);
                                              setOpenMenuId(null);
                                            } catch (error) {
                                              console.error('Erro ao excluir procedimento:', error);
                                              alert('Erro ao excluir procedimento. Por favor, tente novamente.');
                                            }
                                          }
                                        }}
                                        className={cn(
                                          'w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 my-1',
                                          hasGradient
                                            ? 'text-red-600 hover:bg-red-50 hover:shadow-sm'
                                            : 'text-red-600 hover:bg-red-50'
                                        )}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Excluir</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            </MenuPortal>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detalhes do Procedimento */}
      {selectedProcDetails && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Procedimento</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setSelectedProcDetails(null)}
                  >
                    Fechar
                  </button>
                </div>
                <div className="space-y-3 text-sm text-gray-800">
                  <div>
                    <span className="font-semibold">Procedimento: </span>
                    {selectedProcDetails.procedimento}
                  </div>
                  <div>
                    <span className="font-semibold">Valor: </span>
                    {formatCurrency(selectedProcDetails.valorCentavos)}
                  </div>
                  <div>
                    <span className="font-semibold">Estado: </span>
                    {selectedProcDetails.estado === 'a_realizar'
                      ? 'A Realizar'
                      : selectedProcDetails.estado === 'realizado'
                      ? 'Realizado'
                      : 'Pré-Existente'}
                  </div>
                  <div>
                    <span className="font-semibold">Dentes: </span>
                    {(() => {
                      const label = (() => {
                        const types = (selectedProcDetails as any).selectionTypes && (selectedProcDetails as any).selectionTypes.length
                          ? (selectedProcDetails as any).selectionTypes as Array<'ALL' | 'UPPER' | 'LOWER'>
                          : (selectedProcDetails as any).selectionType
                          ? [(selectedProcDetails as any).selectionType as 'ALL' | 'UPPER' | 'LOWER']
                          : [];
                        return types.length
                          ? types.map((t: 'ALL' | 'UPPER' | 'LOWER') => (t === 'ALL' ? 'Todos' : t === 'UPPER' ? 'Arcada Superior' : 'Arcada Inferior')).join(' + ')
                          : null;
                      })();
                      if (label) return label;
                      if (selectedProcDetails.dentes.length > 0) {
                        return selectedProcDetails.dentes
                          .map(d => (d.faces && d.faces.length > 0 ? `${d.numero} (${d.faces.join(', ')})` : `${d.numero}`))
                          .join(', ');
                      }
                      return '-';
                    })()}
                  </div>
                  <div>
                    <span className="font-semibold">Realizado em: </span>
                    {selectedProcDetails.realizadoEm
                      ? new Date(selectedProcDetails.realizadoEm).toLocaleDateString('pt-BR')
                      : '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Financeiro: </span>
                    {selectedProcDetails.gerarPagamentoFinanceiro ? 'Vinculado' : 'Não vinculado'}
                  </div>
                  <div>
                    <span className="font-semibold">Observações: </span>
                    {selectedProcDetails.observacoes || '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal para adicionar procedimento */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-w-4xl w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-2 duration-300 overflow-hidden">
              {/* Header fixo com gradiente moderno */}
              <div 
                className={cn(
                  "flex items-center justify-between px-6 py-6 md:p-7 md:pt-7 border-b flex-shrink-0 relative overflow-hidden",
                  hasGradient
                    ? isCustom && gradientColors
                      ? 'bg-white/90 border-white/40'
                      : isVibrant
                      ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 border-white/40'
                      : 'bg-white/90 border-white/40'
                    : 'border-gray-200 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50'
                )}
                style={isMobile ? { 
                  paddingTop: 'max(7rem, env(safe-area-inset-top, 0px) + 1.5rem)',
                  ...(hasGradient && isCustom && gradientColors ? {
                    borderColor: `${gradientColors.start}40`,
                    background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
                  } : undefined)
                } : (hasGradient && isCustom && gradientColors ? {
                  borderColor: `${gradientColors.start}40`,
                  background: `linear-gradient(135deg, ${gradientColors.start}10 0%, ${gradientColors.middle}10 50%, ${gradientColors.end}10 100%)`,
                } : undefined)}
              >
                <div 
                  className={cn(
                    "absolute inset-0",
                    hasGradient
                      ? isCustom && gradientColors
                        ? ''
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5'
                        : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
                      : 'bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5'
                  )}
                  style={hasGradient && isCustom && gradientColors ? {
                    background: `linear-gradient(90deg, ${gradientColors.start}05 0%, ${gradientColors.middle}05 50%, ${gradientColors.end}05 100%)`,
                  } : undefined}
                ></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div 
                    className={cn(
                      "p-3 rounded-2xl shadow-lg transform transition-transform duration-300 hover:scale-105",
                      hasGradient
                        ? isCustom && gradientColors
                          ? ''
                          : isVibrant
                          ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/30'
                          : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
                        : 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-slate-500/30'
                    )}
                    style={hasGradient && isCustom && gradientColors ? {
                      background: `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                      boxShadow: `0 10px 15px -3px ${gradientColors.start}30, 0 4px 6px -2px ${gradientColors.start}20`,
                    } : undefined}
                  >
                    <Plus className={`w-6 h-6 text-white transition-all duration-300 ${editingProc ? 'hidden opacity-0' : 'block opacity-100'}`} />
                    <Edit className={`w-6 h-6 text-white transition-all duration-300 ${editingProc ? 'block opacity-100' : 'hidden opacity-0'}`} />
                  </div>
                  <div>
                    <h2 
                      className={cn(
                        "text-2xl md:text-3xl font-bold",
                        hasGradient
                          ? isCustom && gradientColors
                            ? 'bg-clip-text text-transparent'
                            : isVibrant
                            ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                            : 'text-slate-900'
                          : 'text-slate-900'
                      )}
                      style={hasGradient && isCustom && gradientColors ? {
                        background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      } : undefined}
                    >
                      {editingProc ? 'Editar Procedimento' : 'Adicionar Procedimento'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1.5 font-medium">
                      {editingProc ? 'Modifique as informações do procedimento' : 'Preencha os dados do novo procedimento'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProc(null);
                    setSelectedTooth(null);
                  }}
                  className="p-2.5 rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md relative z-10"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-gray-50/80 to-white">
                <form onSubmit={handleSubmit} id="procedimento-form" className="space-y-7 md:space-y-8">
                {/* Seção: Informações Básicas */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-1 rounded-full bg-blue-600"></div>
                    <h3 className="text-lg font-bold text-gray-900">Informações Básicas</h3>
                  </div>
                  
                  {/* Procedimento e Valor em grid no mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    <div className="space-y-2.5 flex flex-col">
                      <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                        <span className="text-blue-600">📋</span>
                        Procedimento <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowServiceModal(true);
                          setServiceQuery('');
                        }}
                        className={cn(
                          'w-full rounded-2xl border-2 transition-all duration-300 text-left px-5 py-4.5 text-base group min-h-[60px] flex items-center',
                          'focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2',
                          formData.serviceIds.length > 0
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900 shadow-lg shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-200/50 transform hover:scale-[1.01]'
                            : 'border-gray-300 bg-white text-gray-500 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md hover:scale-[1.01]'
                        )}
                      >
                        {formData.serviceIds.length > 0 ? (
                          (() => {
                            const selectedServicesList = services.filter(s => formData.serviceIds.includes(s.id));
                            const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                            const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                            return (
                              <div className="flex flex-col gap-2">
                                <span className="font-bold text-gray-900 text-base">
                                  {selectedServicesList.length === 1 
                                    ? selectedServicesList[0].nome
                                    : `${selectedServicesList.length} serviços selecionados`}
                                </span>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold flex items-center gap-1.5">
                                    <span>💰</span>
                                    {formatCurrency(totalPrice)}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1.5">
                                    <span>⏱️</span>
                                    {totalDuration} min
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="flex items-center gap-2.5 text-gray-500 group-hover:text-blue-600 transition-colors">
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-medium">Selecione um ou mais serviços</span>
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2.5 flex flex-col">
                      <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                        <span className="text-green-600">💰</span>
                        Valor <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 font-bold z-10 text-lg group-focus-within:text-blue-600 transition-colors">R$</div>
                        <CurrencyInput
                          value={parseFloat(formData.valorCentavos.replace(',', '.')) || 0}
                          onKeyDown={(e) => {
                            // Tratar Backspace e Delete
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                              e.preventDefault();
                              const currentCentavos = Math.round(parseFloat(formData.valorCentavos.replace(',', '.')) * 100) || 0;
                              
                              // Dividir por 10 para remover o último dígito
                              const newCentavos = Math.floor(currentCentavos / 10);
                              
                              setFormData(prev => ({ ...prev, valorCentavos: (newCentavos / 100).toFixed(2).replace('.', ',') }));
                              return;
                            }
                            
                            // Permitir outras teclas de controle
                            if (e.key === 'Tab' || e.key === 'Enter' || 
                                e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                                (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
                              return;
                            }
                            
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                              return;
                            }
                            
                            // Obter valor atual em centavos
                            const currentCentavos = Math.round(parseFloat(formData.valorCentavos.replace(',', '.')) * 100) || 0;
                            
                            // Multiplicar por 10 e adicionar o novo dígito (permite números maiores)
                            const newCentavos = currentCentavos * 10 + parseInt(e.key);
                            
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, valorCentavos: (newCentavos / 100).toFixed(2).replace('.', ',') }));
                          }}
                          onValueChange={(value, name, values) => {
                            // Só usar onValueChange se contiver vírgula (entrada decimal) ou estiver vazio
                            if (!value || value.includes(',') || value.includes('.')) {
                              const floatValue = values?.float ?? 0;
                              setFormData(prev => ({ ...prev, valorCentavos: floatValue.toFixed(2).replace('.', ',') }));
                            }
                          }}
                          decimalsLimit={2}
                          decimalSeparator=","
                          groupSeparator=""
                          prefix=""
                          className="w-full rounded-2xl border-2 border-gray-300 pl-12 pr-5 py-4.5 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 bg-white transition-all duration-300 hover:border-blue-400 hover:shadow-md min-h-[60px]"
                          placeholder="0,00"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção: Dentes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                      <label className="block text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-purple-600">🦷</span>
                        Dentes do Procedimento
                      </label>
                    </div>
                    {formData.dentes.length > 0 && !formData.bulkSelection && (
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold text-purple-700 bg-purple-100">
                        {formData.dentes.length} {formData.dentes.length === 1 ? 'dente' : 'dentes'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {!formData.bulkSelection &&
                      formData.dentes.map((dente, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-2xl p-5 md:p-6 space-y-4 bg-white shadow-sm hover:shadow-lg hover:border-purple-400 transition-all duration-300 transform hover:scale-[1.01]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                Dente {index + 1}
                              </label>
                              <select
                                value={String(dente.numero)}
                                onChange={e =>
                                  {
                                    const value = e.target.value;
                                    if (value === 'ALL' || value === 'UPPER' || value === 'LOWER') {
                                      setFormData(prev => ({
                                        ...prev,
                                        bulkSelection: true,
                                        bulkTypes: Array.from(new Set([...(prev as any).bulkTypes || [], value as any])),
                                      }));
                                    } else {
                                      handleUpdateDente(index, { numero: parseInt(value) });
                                      setFormData(prev => ({ ...prev, bulkSelection: false, bulkTypes: [] }));
                                    }
                                  }
                                }
                                className="w-full rounded-2xl border-2 border-gray-300 p-4 text-base md:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 bg-white font-semibold transition-all duration-300 hover:border-purple-400 hover:shadow-md"
                              >
                                <optgroup label="Seleção Rápida">
                                  <option value="ALL">Todos</option>
                                  <option value="UPPER">Arcada Superior</option>
                                  <option value="LOWER">Arcada Inferior</option>
                                </optgroup>
                                {tipoDenticao === 'permanente' ? (
                                  <>
                                    <optgroup label="Superior Direita">
                                      {DENTES_PERMANENTES.superior_direita.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Superior Esquerda">
                                      {DENTES_PERMANENTES.superior_esquerda.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Inferior Esquerda">
                                      {DENTES_PERMANENTES.inferior_esquerda.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Inferior Direita">
                                      {DENTES_PERMANENTES.inferior_direita.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </>
                                ) : (
                                  <>
                                    <optgroup label="Superior Direita">
                                      {DENTES_DECIDUOS.superior_direita.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Superior Esquerda">
                                      {DENTES_DECIDUOS.superior_esquerda.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Inferior Esquerda">
                                      {DENTES_DECIDUOS.inferior_esquerda.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Inferior Direita">
                                      {DENTES_DECIDUOS.inferior_direita.map(n => (
                                        <option key={n} value={String(n)}>
                                          {n}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </>
                                )}
                              </select>
                            </div>
                            {formData.dentes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDente(index)}
                                className="mt-8 p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
                                title="Remover dente"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                          {!formData.bulkSelection && (
                            <div className="pt-4 border-t border-gray-200">
                            <label className="block text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                              <span className="text-purple-600">📍</span>
                              Faces do Dente {dente.numero}
                              </label>
                              <div className="grid grid-cols-3 md:flex md:flex-wrap gap-3">
                                {FACES.map(face => (
                                  <button
                                    key={face.value}
                                    type="button"
                                    onClick={() => handleToggleFace(index, face.value)}
                                    className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 touch-manipulation transform ${
                                      dente.faces.includes(face.value)
                                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-300/50 scale-105 hover:scale-110'
                                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md active:scale-95 hover:scale-105'
                                    }`}
                                  >
                                    <span className="font-bold">{face.value}</span>
                                    <span className="hidden md:inline ml-1.5 font-normal"> - {face.label.split(' - ')[1]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {formData.bulkSelection && formData.additionalDentes.length > 0 && (
                      <div className="space-y-3">
                        {formData.additionalDentes.map((dente, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4 space-y-3 bg-gray-50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                  Dente adicional {index + 1}
                                </label>
                                <select
                                  value={String(dente.numero)}
                                  onChange={e => {
                                    const value = parseInt(e.target.value);
                                    handleUpdateAdditionalDente(index, { numero: value });
                                  }}
                                  className="w-full rounded-lg border border-gray-300 p-2.5 md:p-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                  {tipoDenticao === 'permanente' ? (
                                    <>
                                      <optgroup label="Superior Direita">
                                        {DENTES_PERMANENTES.superior_direita.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Superior Esquerda">
                                        {DENTES_PERMANENTES.superior_esquerda.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Inferior Esquerda">
                                        {DENTES_PERMANENTES.inferior_esquerda.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Inferior Direita">
                                        {DENTES_PERMANENTES.inferior_direita.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                    </>
                                  ) : (
                                    <>
                                      <optgroup label="Superior Direita">
                                        {DENTES_DECIDUOS.superior_direita.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Superior Esquerda">
                                        {DENTES_DECIDUOS.superior_esquerda.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Inferior Esquerda">
                                        {DENTES_DECIDUOS.inferior_esquerda.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Inferior Direita">
                                        {DENTES_DECIDUOS.inferior_direita.map(n => (
                                          <option key={n} value={String(n)}>
                                            {n}
                                          </option>
                                        ))}
                                      </optgroup>
                                    </>
                                  )}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAdditionalDente(index)}
                                className="mt-7 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                title="Remover dente"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-2">
                                Faces do Dente {dente.numero}
                              </label>
                              <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2">
                                {FACES.map(face => (
                                  <button
                                    key={face.value}
                                    type="button"
                                    onClick={() => handleToggleFaceAdditional(index, face.value)}
                                    className={`px-3 py-2.5 md:py-1 rounded-lg text-xs font-medium transition-colors touch-manipulation ${
                                      dente.faces.includes(face.value)
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white border border-gray-300 text-gray-700 active:bg-gray-100'
                                    }`}
                                  >
                                    <span className="font-bold">{face.value}</span>
                                    <span className="hidden md:inline"> - {face.label.split(' - ')[1]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.bulkSelection ? (
                      <div className="border-2 border-dashed border-blue-400 rounded-2xl p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 space-y-5 shadow-lg">
                          <div>
                          <span className="text-base font-bold text-gray-900 flex items-center gap-3 mb-4">
                            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm shadow-md">📋</span>
                            <span>Seleção em lote</span>
                          </span>
                          <div className="flex flex-wrap gap-3">
                            {(['ALL','UPPER','LOWER'] as Array<'ALL'|'UPPER'|'LOWER'>).map(opt => (
                              <label key={opt} className="inline-flex items-center gap-3 px-5 py-3.5 bg-white border-2 border-gray-300 rounded-2xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-300 touch-manipulation active:scale-95 transform hover:scale-105">
                                <input
                                  type="checkbox"
                                  checked={formData.bulkTypes.includes(opt)}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setFormData(prev => {
                                      const set = new Set((prev as any).bulkTypes || []);
                                      if (checked) set.add(opt); else set.delete(opt);
                                      return { ...prev, bulkSelection: set.size > 0, bulkTypes: Array.from(set) as any };
                                    });
                                  }}
                                  className="w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm font-bold text-gray-900">
                                  {opt === 'ALL' ? 'Todos' : opt === 'UPPER' ? 'Superior' : 'Inferior'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-blue-200">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bulkSelection: false, bulkTypes: [] }))}
                            className="flex-1 px-5 py-3.5 text-sm font-bold text-blue-700 bg-white border-2 border-blue-400 rounded-2xl hover:bg-blue-50 hover:shadow-lg active:scale-95 transition-all duration-300 touch-manipulation transform hover:scale-[1.02]"
                          >
                            Selecionar individuais
                          </button>
                          <button
                            type="button"
                            onClick={handleAddAdditionalDente}
                            className="flex-1 px-5 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-2 border-blue-600 rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-95 transition-all duration-300 touch-manipulation transform hover:scale-[1.02] flex items-center justify-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            Adicionar dente
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddDente}
                        className="w-full px-5 py-4 text-base font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-2xl hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:border-blue-500 hover:shadow-lg active:scale-95 transition-all duration-300 touch-manipulation flex items-center justify-center gap-2.5 transform hover:scale-[1.02]"
                      >
                        <Plus className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-300" />
                        <span>Adicionar outro dente</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Seção: Configurações */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-1 rounded-full bg-indigo-600"></div>
                    <h3 className="text-lg font-bold text-gray-900">Configurações</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    <div className="space-y-2.5">
                      <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                        <span className="text-indigo-600">👨‍⚕️</span>
                        Profissional <span className="text-gray-500 text-xs font-normal">(opcional)</span>
                      </label>
                      <select
                        value={formData.profissionalId}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, profissionalId: e.target.value }))
                        }
                        className="w-full rounded-2xl border-2 border-gray-300 p-4 text-base md:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 bg-white font-semibold transition-all duration-300 hover:border-indigo-400 hover:shadow-md"
                      >
                        <option value="">Selecione o profissional (opcional)</option>
                        {professionals
                          .filter(p => p.ativo)
                          .map(prof => (
                            <option key={prof.id} value={prof.id}>
                              {prof.apelido}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-2.5">
                      <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                        <span className="text-orange-600">📊</span>
                        Estado <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.estado}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, estado: e.target.value as EstadoProcedimento }))
                        }
                        className="w-full rounded-2xl border-2 border-gray-300 p-4 text-base md:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 bg-white font-semibold transition-all duration-300 hover:border-orange-400 hover:shadow-md"
                        required
                      >
                        <option value="a_realizar">A Realizar</option>
                        <option value="realizado">Realizado</option>
                        <option value="pre_existente">Pré-Existente</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Realizado em */}
                {formData.estado === 'realizado' && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                      <span className="text-green-600">📅</span>
                      Realizado em (Data)
                    </label>
                    <input
                      type="date"
                      value={formData.realizadoEm}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, realizadoEm: e.target.value }))
                      }
                      className="w-full rounded-2xl border-2 border-gray-300 p-4 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 bg-white font-semibold transition-all duration-300 hover:border-green-400 hover:shadow-md"
                    />
                  </div>
                )}

                {/* Gerar pagamento financeiro */}
                <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-300 hover:border-green-400 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
                  <input
                    type="checkbox"
                    id="gerarPagamento"
                    checked={formData.gerarPagamentoFinanceiro}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        gerarPagamentoFinanceiro: e.target.checked,
                      }))
                    }
                    className="mt-1 w-5 h-5 md:w-5 md:h-5 text-green-600 border-gray-300 rounded-lg focus:ring-green-500 focus:ring-2 flex-shrink-0 cursor-pointer transition-all duration-200"
                  />
                  <label htmlFor="gerarPagamento" className="text-sm text-gray-900 cursor-pointer flex-1">
                    <span className="font-bold flex items-center gap-2.5 text-base">
                      <span className="text-xl">💰</span>
                      Gerar pagamento na aba "Financeiro"
                    </span>
                    <span className="block text-xs text-gray-600 mt-2 font-medium">
                      Vincula as informações ao Controle Financeiro automaticamente
                    </span>
                  </label>
                </div>

                {/* Observações */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                    <span className="text-gray-600">📝</span>
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, observacoes: e.target.value }))
                    }
                    className="w-full rounded-2xl border-2 border-gray-300 p-5 min-h-[140px] text-base md:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 focus:border-blue-500 resize-none bg-white transition-all duration-300 hover:border-gray-400 hover:shadow-md font-medium"
                    placeholder="Observações adicionais sobre o procedimento..."
                  />
                </div>
                </form>
                </div>

              {/* Botões fixos no bottom */}
              <div className="flex gap-4 p-6 md:p-7 border-t-2 border-gray-100 bg-gradient-to-b from-white to-gray-50/50 flex-shrink-0 shadow-2xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProc(null);
                      setSelectedTooth(null);
                      setFormData({
                        procedimento: '',
                        serviceIds: [],
                        valorCentavos: '',
                        dentes: [],
                        additionalDentes: [],
                        profissionalId: '',
                        estado: 'a_realizar',
                        realizadoEm: '',
                        gerarPagamentoFinanceiro: false,
                        observacoes: '',
                        bulkSelection: false,
                        bulkTypes: [],
                      });
                    }}
                    className="flex-1 h-14 md:h-12 text-base md:text-sm font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    Cancelar
                  </Button>
                <Button 
                  type="submit" 
                  form="procedimento-form"
                  className={cn(
                    "flex-1 h-14 md:h-12 text-white text-base md:text-sm font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform",
                    hasGradient
                      ? isCustom && gradientColors
                        ? 'shadow-xl hover:shadow-2xl'
                        : isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                      : 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 hover:from-slate-700 hover:via-gray-700 hover:to-slate-800 shadow-xl shadow-slate-500/40 hover:shadow-2xl hover:shadow-slate-500/50'
                  )}
                  style={hasGradient && isCustom && gradientColors ? {
                    background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    boxShadow: `0 20px 25px -5px ${gradientColors.start}40, 0 10px 10px -5px ${gradientColors.start}20`,
                  } : undefined}
                >
                  {editingProc ? (
                    <span className="flex items-center justify-center gap-2">
                      <span>💾</span>
                      Salvar Alterações
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>✨</span>
                      Adicionar Procedimento
                    </span>
                  )}
                  </Button>
                </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de seleção de serviços */}
      {showServiceModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1001] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-t-2xl md:rounded-lg shadow-xl max-w-lg w-full h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Selecionar Serviço</h3>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Busca */}
              <div className="p-4 border-b flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value)}
                    placeholder="Buscar serviço por nome"
                    className="pl-10 pr-4 py-3 text-base"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de serviços */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredServices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum serviço encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredServices.map((service) => {
                      const isSelected = formData.serviceIds.includes(service.id);
                      return (
                        <label
                          key={service.id}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer touch-manipulation',
                            'flex items-center gap-3',
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  serviceIds: [...prev.serviceIds, service.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  serviceIds: prev.serviceIds.filter(id => id !== service.id)
                                }));
                              }
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-gray-900 truncate">{service.nome}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                R$ {(service.precoCentavos / 100).toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {service.duracaoMin} min
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                {formData.serviceIds.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.serviceIds.length} serviço{formData.serviceIds.length !== 1 ? 's' : ''} selecionado{formData.serviceIds.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, serviceIds: [] }));
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-gray-900">
                        {(() => {
                          const selectedServicesList = services.filter(s => formData.serviceIds.includes(s.id));
                          const totalPrice = selectedServicesList.reduce((sum, s) => sum + (s.precoCentavos || 0), 0);
                          const totalDuration = selectedServicesList.reduce((sum, s) => sum + (s.duracaoMin || 0), 0);
                          return `R$ ${(totalPrice / 100).toFixed(2)} • ${totalDuration} min`;
                        })()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowServiceModal(false)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 md:h-10"
                    >
                      Confirmar
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500 mb-3">Selecione pelo menos um serviço</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowServiceModal(false)}
                      className="w-full h-12 md:h-10"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de Orçamento */}
      {isOrcamentoModalOpen && (
        <OrcamentoModal
          isOpen={isOrcamentoModalOpen}
          onClose={() => {
            setIsOrcamentoModalOpen(false);
            setProcedimentosSelecionadosParaOrcamento(new Set());
          }}
          companyId={companyId}
          patientId={patientId}
          procedimentos={procedimentos.filter(p => 
            // Incluir procedimentos selecionados (independente do estado) OU procedimentos a realizar
            procedimentosSelecionadosParaOrcamento.has(p.id) || p.estado === 'a_realizar'
          )}
          procedimentosSelecionadosIds={procedimentosSelecionadosParaOrcamento}
          onSave={() => {
            setIsOrcamentoModalOpen(false);
            setProcedimentosSelecionadosParaOrcamento(new Set());
          }}
        />
      )}
    </div>
  );
}
