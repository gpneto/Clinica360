'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TipoMedida, Medicamento } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGradientColors } from '@/lib/utils';

// Função auxiliar para converter hex para RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [59, 130, 246]; // Fallback para azul padrão
}

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
        const getSignatureImageBase64 = httpsCallable(functions, 'getSignatureImageBase64');
        const result = await getSignatureImageBase64({ storagePath });
        const data = result.data as { base64?: string; error?: string };
        if (data?.base64) {
          return data.base64;
        }
      } catch (cloudFunctionError) {
        console.warn('Erro ao obter imagem via Cloud Function:', cloudFunctionError);
      }
    }

    // Método 2: Tentar usar getDownloadURL
    if (storagePath) {
      try {
        const { storage } = await import('@/lib/firebase');
        const { ref, getDownloadURL } = await import('firebase/storage');
        const storageRef = ref(storage, storagePath);
        const downloadURL = await getDownloadURL(storageRef);
        
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

    // Método 3: Tentar fetch direto
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

// Função auxiliar para processar assinatura: cor azul e alta qualidade
const processSignature = async (imageBase64: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Aumentar scale para melhor qualidade
        const scale = 2.5;
        // Aumentar tamanho máximo do canvas para melhor qualidade, mantendo proporção
        const maxWidth = 1200;
        const maxHeight = 450;
        
        // Calcular dimensões mantendo proporção original
        let canvasWidth = img.width * scale;
        let canvasHeight = img.height * scale;
        const aspectRatio = img.width / img.height;
        
        // Se exceder limites, ajustar mantendo proporção
        if (canvasWidth > maxWidth) {
          canvasWidth = maxWidth;
          canvasHeight = maxWidth / aspectRatio;
        }
        if (canvasHeight > maxHeight) {
          canvasHeight = maxHeight;
          canvasWidth = maxHeight * aspectRatio;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high'; // Alta qualidade para assinatura
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const blueR = 0;
        const blueG = 102;
        const blueB = 204;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a > 20) {
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
            if (luminance < 230) {
              const intensity = (255 - luminance) / 255;
              data[i] = Math.round(blueR * intensity);
              data[i + 1] = Math.round(blueG * intensity);
              data[i + 2] = Math.round(blueB * intensity);
              data[i + 3] = a;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        // Usar PNG com qualidade máxima para assinatura
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

// Função auxiliar para aplicar bordas arredondadas à imagem (otimizada para menor tamanho)
const applyRoundedCorners = async (imageBase64: string, radius: number, canvasSize: number): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Reduzir o tamanho do canvas para otimizar o tamanho do arquivo
        // 150px é suficiente para um logo de 28mm no PDF
        const optimizedSize = Math.min(canvasSize, 150);
        const canvas = document.createElement('canvas');
        canvas.width = optimizedSize;
        canvas.height = optimizedSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium'; // Reduzido de 'high' para 'medium'

        // Preencher o canvas com fundo branco antes de desenhar a imagem (importante para JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, optimizedSize, optimizedSize);

        const canvasRadius = (radius / 20) * optimizedSize;
        ctx.beginPath();
        ctx.moveTo(canvasRadius, 0);
        ctx.lineTo(optimizedSize - canvasRadius, 0);
        ctx.quadraticCurveTo(optimizedSize, 0, optimizedSize, canvasRadius);
        ctx.lineTo(optimizedSize, optimizedSize - canvasRadius);
        ctx.quadraticCurveTo(optimizedSize, optimizedSize, optimizedSize - canvasRadius, optimizedSize);
        ctx.lineTo(canvasRadius, optimizedSize);
        ctx.quadraticCurveTo(0, optimizedSize, 0, optimizedSize - canvasRadius);
        ctx.lineTo(0, canvasRadius);
        ctx.quadraticCurveTo(0, 0, canvasRadius, 0);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0, optimizedSize, optimizedSize);
        // Usar JPEG com qualidade 0.85 para reduzir drasticamente o tamanho (logo não precisa transparência)
        const roundedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
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

// Função auxiliar para renderizar uma via da receita
const renderReceitaVia = async (
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  maxWidth: number,
  company: { nome?: string; telefone?: string; email?: string; endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }; cnpj?: string; logoUrl?: string } | null,
  patient: { nome?: string; telefoneE164?: string; email?: string; dataNascimento?: Date } | null,
  professional: { id: string; apelido: string; signatureImageUrl?: string; cro?: string; croEstado?: string } | null,
  medicamentos: Medicamento[],
  observacoes: string | undefined,
  viaLabel: string,
  loadImageAsBase64: (url: string) => Promise<string | null>,
  applyRoundedCorners: (base64: string, radius: number, size: number) => Promise<string | null>,
  processSignature: (base64: string) => Promise<string | null>,
  themeColors?: { primary?: string; accent?: string; start?: string; middle?: string; end?: string }
) => {
  let yPos = margin;

  // Cores dinâmicas baseadas no tema do usuário
  const gradientColors = themeColors?.start && themeColors?.end 
    ? { start: themeColors.start, middle: themeColors.middle || themeColors.start, end: themeColors.end }
    : null;
  
  // Usar cor primária do tema ou cor padrão
  const primaryHex = themeColors?.primary || themeColors?.start || '#1e1e1e';
  const accentHex = themeColors?.accent || themeColors?.start || '#3b82f6';
  
  const primaryColor: [number, number, number] = hexToRgb(primaryHex);
  const secondaryColor: [number, number, number] = [100, 100, 100];
  const borderColor: [number, number, number] = [220, 220, 220];
  const redColor: [number, number, number] = [220, 38, 38];
  const lineColor: [number, number, number] = [230, 230, 230];
  const accentColor: [number, number, number] = hexToRgb(accentHex);
  const bgLight: [number, number, number] = [248, 250, 252]; // Cinza muito claro

  // Título RECEITUÁRIO CONTROLE ESPECIAL centralizado (mais moderno)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RECEITUÁRIO CONTROLE ESPECIAL', pageWidth / 2, yPos, { align: 'center' });
  
  // Linha decorativa abaixo do título
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, yPos + 2, pageWidth / 2 + 40, yPos + 2);
  
  yPos += 2;
  
  // Labels das vias no topo direito (badge moderno) - após o título para não sobrepor
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const viaText = viaLabel === 'VIA CLIENTE' ? '2ª VIA PACIENTE' : '1ª VIA FARMÁCIA';
  const badgeWidth = 35;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = yPos;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(badgeX, badgeY, badgeWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(viaText, pageWidth - margin - badgeWidth / 2, badgeY + 4.5, { align: 'center' });
  
  yPos += 8; // Espaçamento reduzido após o badge antes da caixa para aproximar a seção

  // Caixa IDENTIFICAÇÃO DO EMITENTE (ocupando toda a largura) - design moderno
  const emitenteBoxY = yPos;
  const emitenteBoxHeight = 34;
  const emitenteBoxWidth = maxWidth; // Ocupar toda a largura disponível
  
  // Fundo suave da caixa
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(margin, emitenteBoxY, emitenteBoxWidth, emitenteBoxHeight, 'F');
  
  // Borda moderna
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, emitenteBoxY, emitenteBoxWidth, emitenteBoxHeight);
  
  // Título da caixa com fundo colorido
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, emitenteBoxY, emitenteBoxWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('IDENTIFICAÇÃO DO EMITENTE', margin + emitenteBoxWidth / 2, emitenteBoxY + 5, { align: 'center' });
  
  // Logo da empresa dentro do quadrado (canto direito, centralizado verticalmente no conteúdo)
  const logoSize = 22; // Tamanho do logo em mm (reduzido para caber dentro)
  const logoSpacing = 3; // Espaçamento das bordas do quadrado
  const logoX = margin + emitenteBoxWidth - logoSpacing - logoSize / 2; // Canto direito
  // Centralizar no conteúdo (após o título de 7mm)
  const contentStartY = emitenteBoxY + 7; // Início do conteúdo após o título
  const contentHeight = emitenteBoxHeight - 7; // Altura do conteúdo (total - título)
  const logoY = contentStartY + contentHeight / 2; // Centralizado verticalmente no conteúdo
  const logoRadius = 4; // Raio das bordas arredondadas
  const logoCanvasSize = 150; // Reduzido de 400 para 150 para otimizar tamanho do arquivo
  
  if (company?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logoUrl);
      if (logoBase64) {
        // Aplicar bordas arredondadas à imagem com alta qualidade
        const roundedLogoBase64 = await applyRoundedCorners(logoBase64, logoRadius, logoCanvasSize);
        
        if (roundedLogoBase64) {
          // Adicionar a imagem com bordas arredondadas (sem 'FAST' para melhor qualidade)
          // Detectar formato da imagem (JPEG ou PNG) para otimizar
          const imageFormat = roundedLogoBase64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(roundedLogoBase64, imageFormat, logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        } else {
          // Fallback: adicionar imagem sem bordas arredondadas se falhar
          doc.addImage(logoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        }
      } else {
        // Fallback: círculo com inicial se falhar ao carregar logo
        const circleRadius = 11; // Aumentado para melhor visibilidade
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.5);
        doc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const companyName = company?.nome || 'Clínica';
        const initial = companyName.charAt(0).toUpperCase();
        const initialWidth = doc.getTextWidth(initial);
        doc.text(initial, logoX - initialWidth / 2, logoY + 3);
      }
    } catch (error) {
      console.error('Erro ao adicionar logo ao PDF:', error);
      // Fallback: círculo com inicial em caso de erro
      const circleRadius = 11; // Aumentado para melhor visibilidade
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.5);
      doc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const companyName = company?.nome || 'Clínica';
      const initial = companyName.charAt(0).toUpperCase();
      const initialWidth = doc.getTextWidth(initial);
      doc.text(initial, logoX - initialWidth / 2, logoY + 3);
    }
  } else {
    // Logo/Ícone simples (círculo com inicial) quando não há logo
    // Desenhar círculo maior e mais visível
    const circleRadius = 11; // Aumentado de 8 para 11 para melhor visibilidade
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw (preencher e desenhar borda)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const companyName = company?.nome || 'Clínica';
    const initial = companyName.charAt(0).toUpperCase();
    const initialWidth = doc.getTextWidth(initial);
    doc.text(initial, logoX - initialWidth / 2, logoY + 3);
  }
  
  yPos = emitenteBoxY + emitenteBoxHeight + 8;
  
  // Preencher dados do emitente na caixa (sem linhas, apenas informações) - layout moderno
  if (professional && company) {
    let emitenteY = emitenteBoxY + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    // Nome da Empresa (primeiro campo)
    if (company.nome) {
      doc.setFont('helvetica', 'bold');
      doc.text('Empresa:', margin + 5, emitenteY);
      doc.setFont('helvetica', 'normal');
      doc.text(company.nome, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Nome Completo do Profissional
    if (professional.apelido) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nome:', margin + 5, emitenteY);
      doc.setFont('helvetica', 'normal');
      doc.text(professional.apelido, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Endereço Completo e Telefone
    const enderecoCompleto = [
      company.endereco?.rua && company.endereco?.numero ? `${company.endereco.rua}, ${company.endereco.numero}` : company.endereco?.rua || '',
      company.endereco?.bairro || ''
    ].filter(Boolean).join(' - ');
    if (enderecoCompleto) {
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço:', margin + 5, emitenteY);
      doc.setFont('helvetica', 'normal');
      doc.text(enderecoCompleto, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Telefone
    if (company.telefone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', margin + 5, emitenteY);
      doc.setFont('helvetica', 'normal');
      doc.text(company.telefone, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Cidade, UF
    const cidadeUF = [
      company.endereco?.cidade || '',
      company.endereco?.estado || ''
    ].filter(Boolean).join(' - ');
    if (cidadeUF) {
      doc.setFont('helvetica', 'bold');
      doc.text('Cidade/UF:', margin + 5, emitenteY);
      doc.setFont('helvetica', 'normal');
      doc.text(cidadeUF, margin + 30, emitenteY);
    }
  }

  // Seção Paciente (sem linhas, apenas informações) - layout moderno
  yPos = emitenteBoxY + emitenteBoxHeight + 3;
  if (patient) {
    // Caixa moderna para informações do paciente
    const patientBoxHeight = 16;
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(margin, yPos, maxWidth, patientBoxHeight, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, maxWidth, patientBoxHeight);
    
    const patientY = yPos + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    if (patient.nome) {
      doc.text('Paciente:', margin + 5, patientY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.nome, margin + 25, patientY);
    }
    const enderecoY = patientY + 7;
    if (patient.telefoneE164) {
      doc.setFont('helvetica', 'bold');
      doc.text('Contato:', margin + 5, enderecoY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.telefoneE164, margin + 25, enderecoY);
    }
    yPos += patientBoxHeight + 4;
  }

  // Seção Prescrição (sem linhas, apenas informações) - layout moderno compacto
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PRESCRIÇÃO', margin, yPos);
  yPos += 5;
  
  // Preencher prescrição com cards modernos compactos
  medicamentos.forEach((med, index) => {
    // Mapeamento de códigos em inglês para português
    const medidaMapInglesParaPortugues: Record<string, TipoMedida> = {
      'tablet': 'comprimido',
      'box': 'caixa',
      'ampoule': 'ampola',
      'bottle': 'frasco',
      'package': 'pacote',
      'tube': 'tubo',
      'capsule': 'capsula',
      'tablets': 'comprimido',
      'boxes': 'caixa',
      'ampoules': 'ampola',
      'bottles': 'frasco',
      'packages': 'pacote',
      'tubes': 'tubo',
      'capsules': 'capsula',
    };
    
    // Converter medida de inglês para português se necessário
    let medidaPortugues: TipoMedida = med.medida;
    if (medidaMapInglesParaPortugues[med.medida.toLowerCase()]) {
      medidaPortugues = medidaMapInglesParaPortugues[med.medida.toLowerCase()];
    }
    
    // Labels em português para exibição
    const medidaLabels: Record<TipoMedida, string> = {
      'ampola': 'Ampola(s)',
      'caixa': 'Caixa(s)',
      'comprimido': 'Comprimido(s)',
      'frasco': 'Frasco(s)',
      'pacote': 'Pacote(s)',
      'tubo': 'Tubo(s)',
      'capsula': 'Cápsula(s)'
    };
    
    // Obter label em português, ou usar o valor original se não encontrar
    const medidaLabel = medidaLabels[medidaPortugues] || medidaLabels[med.medida as TipoMedida] || med.medida;
    
    // Card para cada medicamento - reduzido
    const cardHeight = 12;
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(margin, yPos - 2, maxWidth, cardHeight, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.15);
    doc.rect(margin, yPos - 2, maxWidth, cardHeight);
    
    // Número do medicamento (badge circular menor)
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    const circleX = margin + 6;
    const circleY = yPos + 2;
    const circleRadius = 3;
    // Desenhar círculo usando arco (360 graus)
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.circle(circleX, circleY, circleRadius, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(String(index + 1), circleX, circleY + 1, { align: 'center' });
    
    // Informações do medicamento - fontes menores
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(med.nome, margin + 14, yPos + 1.5);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const infoText = `${med.quantidade} ${medidaLabel} • ${med.posologia}`;
    // Quebrar texto se necessário
    const infoLines = doc.splitTextToSize(infoText, maxWidth - 20);
    doc.text(infoLines[0], margin + 14, yPos + 6);
    if (infoLines.length > 1) {
      doc.text(infoLines[1], margin + 14, yPos + 9);
    }
    
    yPos += cardHeight + 2; // Espaçamento reduzido entre cards
  });

  yPos += 4; // Espaçamento reduzido após prescrição

  // Assinatura do Profissional (antes das caixas de controle especial) - design moderno
  const signatureY = yPos;
  
  // Caixa moderna para assinatura - aumentada para não ficar apertada
  const signatureBoxHeight = professional?.signatureImageUrl ? 40 : 16;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(margin, signatureY, maxWidth, signatureBoxHeight, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, signatureY, maxWidth, signatureBoxHeight);
  
  // Linha superior decorativa
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY, pageWidth - margin, signatureY);
  
  if (professional?.signatureImageUrl) {
    try {
      const signatureBase64 = await loadImageAsBase64(professional.signatureImageUrl);
      if (signatureBase64) {
        const processedSignature = await processSignature(signatureBase64);
        const finalSignature = processedSignature || signatureBase64;
        const img = new Image();
        img.src = finalSignature;
        await new Promise((resolve) => {
          img.onload = () => {
            // Manter proporção original da assinatura para não distorcer
            // Usar as dimensões reais da imagem processada para calcular proporção exata
            const aspectRatio = img.width / img.height; // Proporção real da imagem (largura/altura)
            const maxWidth = 100; // Largura máxima em mm (aumentada para não ficar apertada)
            const minHeight = 12; // Altura mínima em mm para não ficar muito achatada
            const maxHeight = 25; // Altura máxima em mm
            
            // Calcular dimensões mantendo proporção original
            // Primeiro tentar pela largura máxima
            let imgWidth = maxWidth;
            let imgHeight = maxWidth / aspectRatio;
            
            // Garantir altura mínima - se ficar muito pequena, aumentar largura
            if (imgHeight < minHeight) {
              imgHeight = minHeight;
              imgWidth = minHeight * aspectRatio; // Ajustar largura para manter proporção
            }
            
            // Se a altura ficar muito grande, ajustar pela altura máxima
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = maxHeight * aspectRatio; // Ajustar largura para manter proporção
            }
            
            // Centralizar horizontalmente
            const imgX = pageWidth / 2 - imgWidth / 2;
            let imgY = signatureY + 4;
            
            // Calcular posição do texto com mais espaçamento
            let textY = imgY + imgHeight + 2;
            // Verificar se o texto está dentro da caixa
            if (textY > signatureY + signatureBoxHeight - 4) {
              // Se estiver saindo, ajustar a posição da imagem
              const ajuste = textY - (signatureY + signatureBoxHeight - 4);
              imgY = imgY - ajuste;
              textY = imgY + imgHeight + 2;
            }
            
            // Adicionar a imagem apenas uma vez
            doc.addImage(finalSignature, 'PNG', imgX, imgY, imgWidth, imgHeight);
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(professional.apelido, pageWidth / 2, textY, { align: 'center' });
            textY += 3.5; // Espaçamento adequado entre linhas
            
            // CRO e Estado (apenas para dentistas)
            if ((professional as any).cro && (professional as any).croEstado) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              const croText = `CRO ${(professional as any).cro}/${(professional as any).croEstado}`;
              doc.text(croText, pageWidth / 2, textY, { align: 'center' });
              textY += 3.5; // Espaçamento adequado entre linhas
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, textY, { align: 'center' });
            resolve(null);
          };
          img.onerror = resolve;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      // Fallback: apenas nome do profissional (centralizado)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(professional?.apelido || 'Profissional', pageWidth / 2, signatureY + 6, { align: 'center' });
      
      // CRO e Estado (apenas para dentistas)
      if ((professional as any).cro && (professional as any).croEstado) {
        doc.setFontSize(7);
        const croText = `CRO ${(professional as any).cro}/${(professional as any).croEstado}`;
        doc.text(croText, pageWidth / 2, signatureY + 9, { align: 'center' });
        doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 12, { align: 'center' });
      } else {
        doc.setFontSize(7);
        doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 9, { align: 'center' });
      }
    }
  } else {
    // Linha para assinatura manual (centralizada)
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.5);
    const lineWidth = 50; // Largura da linha reduzida
    doc.line(pageWidth / 2 - lineWidth / 2, signatureY + 3, pageWidth / 2 + lineWidth / 2, signatureY + 3);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(professional?.apelido || 'Profissional', pageWidth / 2, signatureY + 6, { align: 'center' });
    
    // CRO e Estado (apenas para dentistas)
    if ((professional as any).cro && (professional as any).croEstado) {
      doc.setFontSize(7);
      const croText = `CRO ${(professional as any).cro}/${(professional as any).croEstado}`;
      doc.text(croText, pageWidth / 2, signatureY + 9, { align: 'center' });
      doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 12, { align: 'center' });
    } else {
      doc.setFontSize(7);
      doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 9, { align: 'center' });
    }
  }

  // Linha inferior da caixa de assinatura
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, signatureY + signatureBoxHeight, pageWidth - margin, signatureY + signatureBoxHeight);

  // Seção inferior: duas caixas lado a lado (COMPRADOR e FORNECEDOR)
  // Calcular posição abaixo da assinatura
  const bottomBoxesY = signatureY + signatureBoxHeight + 8; // Espaço após a assinatura reduzido
  const boxWidth = (maxWidth - 5) / 2; // Metade da largura menos espaço entre caixas
  
  // Verificar se algum medicamento exige controle especial
  const temControleEspecial = medicamentos.some(med => med.exigeControleEspecial);
  
  // Sempre usar a mesma página - não adicionar nova página
  let finalBottomBoxesY = bottomBoxesY;
  
  if (temControleEspecial) {
    // Caixa esquerda - IDENTIFICAÇÃO DO COMPRADOR (design moderno)
    const compradorBoxX = margin;
    const compradorBoxHeight = 65; // Aumentada para acomodar 3 linhas de endereço
    
    // Fundo suave
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(compradorBoxX, finalBottomBoxesY, boxWidth, compradorBoxHeight, 'F');
    
    // Borda moderna
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(compradorBoxX, finalBottomBoxesY, boxWidth, compradorBoxHeight);
    
    // Título com fundo colorido
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(compradorBoxX, finalBottomBoxesY, boxWidth, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('IDENTIFICAÇÃO DO COMPRADOR', compradorBoxX + boxWidth / 2, finalBottomBoxesY + 5, { align: 'center' });
    
    let compradorY = finalBottomBoxesY + 11; // Mais espaço após o cabeçalho
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    
    // Encontrar primeiro medicamento com controle especial
    const medComControle = medicamentos.find(med => med.exigeControleEspecial);
    const info = medComControle?.controleEspecialInfo;
    
    // Configurar espessura das linhas para o campo COMPRADOR (mais grossas)
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.3); // Aumentado de 0.1 para 0.3
    
    // NOME - linha completa
    doc.text('NOME:', compradorBoxX + 3, compradorY);
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    if (info?.compradorNome) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorNome, compradorBoxX + 18, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    compradorY += 7;
    
    // Ident. e Órg. Emissor
    doc.text('Ident.:', compradorBoxX + 3, compradorY);
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + 40, compradorY + 1);
    if (info?.compradorIdent) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorIdent, compradorBoxX + 18, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    doc.text('Órg. Emissor:', compradorBoxX + 45, compradorY);
    doc.line(compradorBoxX + 65, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    if (info?.compradorOrgaoEmissor) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorOrgaoEmissor, compradorBoxX + 65, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    compradorY += 7;
    
    // End. - 3 linhas
    doc.text('End.:', compradorBoxX + 3, compradorY);
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    compradorY += 5;
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    compradorY += 5;
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    if (info?.compradorEndereco) {
      // Dividir o endereço em até 3 linhas se necessário
      const enderecoLines = doc.splitTextToSize(info.compradorEndereco, boxWidth - 25);
      let enderecoY = compradorY - 10;
      enderecoLines.slice(0, 3).forEach((line: string, idx: number) => {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(line, compradorBoxX + 18, enderecoY);
        enderecoY += 5;
      });
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    compradorY += 7;
    
    // Cidade, UF
    doc.text('Cidade:', compradorBoxX + 3, compradorY);
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + 50, compradorY + 1);
    if (info?.compradorCidade) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorCidade, compradorBoxX + 18, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    doc.text('UF:', compradorBoxX + 55, compradorY);
    doc.line(compradorBoxX + 62, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    if (info?.compradorUF) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorUF, compradorBoxX + 62, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    compradorY += 7;
    
    // Telefone
    doc.text('Telefone:', compradorBoxX + 3, compradorY);
    doc.line(compradorBoxX + 18, compradorY + 1, compradorBoxX + boxWidth - 3, compradorY + 1);
    if (info?.compradorTelefone) {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.compradorTelefone, compradorBoxX + 18, compradorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    
    // Caixa direita - IDENTIFICAÇÃO DO FORNECEDOR (design moderno)
    const fornecedorBoxX = margin + boxWidth + 5;
    const fornecedorBoxHeight = 65; // Mesma altura da caixa do comprador
    
    // Fundo suave
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(fornecedorBoxX, finalBottomBoxesY, boxWidth, fornecedorBoxHeight, 'F');
    
    // Borda moderna
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(fornecedorBoxX, finalBottomBoxesY, boxWidth, fornecedorBoxHeight);
    
    // Título com fundo colorido
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(fornecedorBoxX, finalBottomBoxesY, boxWidth, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('IDENTIFICAÇÃO DO FORNECEDOR', fornecedorBoxX + boxWidth / 2, finalBottomBoxesY + 5, { align: 'center' });
    
    // Espaço para assinatura/carimbo (parte superior da caixa direita)
    const assinaturaSpaceY = finalBottomBoxesY + 9;
    const assinaturaSpaceHeight = 20;
    
    // Linha para assinatura do farmacêutico
    let fornecedorY = finalBottomBoxesY + fornecedorBoxHeight - 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('ASSINATURA DO FARMACÊUTICO', fornecedorBoxX + 3, fornecedorY);
    
    // DATA - ao lado do texto "ASSINATURA DO FARMACÊUTICO"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DATA', fornecedorBoxX + boxWidth - 18, fornecedorY);
    
    fornecedorY += 4;
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.1);
    // Linha da assinatura
    doc.line(fornecedorBoxX + 3, fornecedorY + 1, fornecedorBoxX + boxWidth - 20, fornecedorY + 1);
    if (info?.farmaceuticoAssinatura) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(info.farmaceuticoAssinatura, fornecedorBoxX + 3, fornecedorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    
    // Linha da data
    doc.line(fornecedorBoxX + boxWidth - 18, fornecedorY + 1, fornecedorBoxX + boxWidth - 3, fornecedorY + 1);
    if (info?.farmaceuticoData) {
      const dataFormatada = format(new Date(info.farmaceuticoData), 'dd/MM/yyyy', { locale: ptBR });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(dataFormatada, fornecedorBoxX + boxWidth - 18, fornecedorY);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
  }


  // Rodapé
  const footerY = pageHeight - 5;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, footerY, { align: 'center' });
};

// Função para gerar PDF da Receita
export const generateReceitaPDF = async (
  company: { nome?: string; telefone?: string; email?: string; endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }; cnpj?: string; logoUrl?: string } | null,
  patient: { nome?: string; telefoneE164?: string; email?: string; dataNascimento?: Date } | null,
  professional: { id: string; apelido: string; signatureImageUrl?: string; cro?: string; croEstado?: string } | null,
  medicamentos: Medicamento[],
  observacoes?: string,
  companyId?: string,
  themePreference?: 'neutral' | 'vibrant' | 'custom',
  customColor?: string | null,
  customColor2?: string | null
) => {
  // Buscar configurações da empresa do Firestore se companyId for fornecido
  let companyInfo = company;
  if (companyId) {
    try {
      const settingsRef = doc(db, `companies/${companyId}/settings`, 'general');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data() as {
          nomeSalao?: string;
          telefoneSalao?: string;
          emailSalao?: string;
          enderecoSalao?: string;
        };
        // Parsear endereço se for string
        let enderecoParsed: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | undefined;
        if (settings.enderecoSalao) {
          // Tentar parsear endereço se for string
          const enderecoStr = settings.enderecoSalao;
          // Assumir formato simples: "Rua, Número, Bairro, Cidade - Estado, CEP"
          const parts = enderecoStr.split(',').map((p: string) => p.trim());
          enderecoParsed = {
            rua: parts[0] || undefined,
            numero: parts[1] || undefined,
            bairro: parts[2] || undefined,
            cidade: parts[3]?.split('-')[0]?.trim() || undefined,
            estado: parts[3]?.split('-')[1]?.trim() || undefined,
            cep: parts[4] || undefined,
          };
        }
        
        companyInfo = {
          nome: settings.nomeSalao || company?.nome,
          telefone: settings.telefoneSalao || company?.telefone,
          email: settings.emailSalao || company?.email,
          endereco: enderecoParsed || company?.endereco,
          cnpj: company?.cnpj,
          logoUrl: company?.logoUrl, // Logo vem do documento da empresa, não das settings
        };
      }
    } catch (error) {
      console.error('Erro ao buscar configurações da empresa:', error);
      // Usar company original se falhar
    }
  }

  // Obter cores do tema
  let themeColors: { primary?: string; accent?: string; start?: string; middle?: string; end?: string } | undefined;
  
  if (themePreference) {
    const gradientColors = getGradientColors(themePreference, customColor, customColor2);
    if (gradientColors) {
      themeColors = {
        primary: gradientColors.start,
        accent: gradientColors.start,
        start: gradientColors.start,
        middle: gradientColors.middle,
        end: gradientColors.end
      };
    } else if (themePreference === 'custom' && customColor) {
      // Se for custom mas não retornou gradiente, usar a cor customizada diretamente
      themeColors = {
        primary: customColor,
        accent: customColor,
        start: customColor,
        middle: customColor,
        end: customColor
      };
    } else if (themePreference === 'neutral') {
      // Para tema neutral, usar cores neutras suaves
      themeColors = {
        primary: '#475569',
        accent: '#64748b',
        start: '#64748b',
        middle: '#64748b',
        end: '#64748b'
      };
    }
  }
  
  // Se não houver cores definidas, usar cores neutras como fallback
  if (!themeColors) {
    themeColors = {
      primary: '#475569',
      accent: '#64748b',
      start: '#64748b',
      middle: '#64748b',
      end: '#64748b'
    };
  }

  const pdfDoc = new jsPDF();
  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);

  // Primeira via - FARMÁCIA
  await renderReceitaVia(
    pdfDoc,
    pageWidth,
    pageHeight,
    margin,
    maxWidth,
    companyInfo,
    patient,
    professional,
    medicamentos,
    observacoes,
    'VIA FARMÁCIA',
    loadImageAsBase64,
    applyRoundedCorners,
    processSignature,
    themeColors
  );

  // Segunda via - CLIENTE
  pdfDoc.addPage();
  await renderReceitaVia(
    pdfDoc,
    pageWidth,
    pageHeight,
    margin,
    maxWidth,
    companyInfo,
    patient,
    professional,
    medicamentos,
    observacoes,
    'VIA CLIENTE',
    loadImageAsBase64,
    applyRoundedCorners,
    processSignature,
    themeColors
  );

  // Salvar PDF
  const fileName = `receita-${patient?.nome?.replace(/\s+/g, '-') || 'paciente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdfDoc.save(fileName);
};

// Função para gerar PDF do Atestado
export const generateAtestadoPDF = async (
  company: { nome?: string; telefone?: string; email?: string; endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }; cnpj?: string; logoUrl?: string } | null,
  patient: { nome?: string; telefoneE164?: string; email?: string; dataNascimento?: Date } | null,
  professional: { id: string; apelido: string; signatureImageUrl?: string; cro?: string; croEstado?: string } | null,
  texto: string,
  diasAfastamento?: number,
  horasAfastamento?: number,
  tipoAfastamento?: 'dias' | 'horas',
  cid?: string,
  horaInicio?: string,
  horaFim?: string,
  companyId?: string,
  themePreference?: 'neutral' | 'vibrant' | 'custom',
  customColor?: string | null,
  customColor2?: string | null
) => {
  // Buscar configurações da empresa do Firestore se companyId for fornecido
  let companyInfo = company;
  console.log('=== ATESTADO: Buscando settings ===');
  console.log('companyId:', companyId);
  console.log('company original:', company);
  
  if (companyId) {
    try {
      const settingsRef = doc(db, `companies/${companyId}/settings`, 'general');
      const settingsSnap = await getDoc(settingsRef);
      console.log('Settings snap exists:', settingsSnap.exists());
      
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data() as {
          nomeSalao?: string;
          telefoneSalao?: string;
          emailSalao?: string;
          enderecoSalao?: string;
        };
        console.log('Settings completo:', settings);
        console.log('enderecoSalao (string):', settings.enderecoSalao);
        
        // Parsear endereço se for string
        let enderecoParsed: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | undefined;
        if (settings.enderecoSalao) {
          // Tentar parsear endereço se for string
          const enderecoStr = settings.enderecoSalao;
          console.log('Parsing enderecoSalao:', enderecoStr);
          // Assumir formato simples: "Rua, Número, Bairro, Cidade - Estado, CEP"
          const parts = enderecoStr.split(',').map((p: string) => p.trim());
          console.log('Parts após split:', parts);
          enderecoParsed = {
            rua: parts[0] || undefined,
            numero: parts[1] || undefined,
            bairro: parts[2] || undefined,
            cidade: parts[3]?.split('-')[0]?.trim() || undefined,
            estado: parts[3]?.split('-')[1]?.trim() || undefined,
            cep: parts[4] || undefined,
          };
          console.log('enderecoParsed (objeto):', enderecoParsed);
        } else {
          console.warn('⚠️ settings.enderecoSalao está vazio ou não existe!');
        }
        
        companyInfo = {
          nome: settings.nomeSalao || company?.nome,
          telefone: settings.telefoneSalao || company?.telefone,
          email: settings.emailSalao || company?.email,
          endereco: enderecoParsed || company?.endereco,
          cnpj: company?.cnpj,
          logoUrl: company?.logoUrl, // Logo vem do documento da empresa, não das settings
        };
        console.log('companyInfo final:', companyInfo);
        console.log('companyInfo.endereco:', companyInfo.endereco);
      } else {
        console.warn('⚠️ Settings document não existe para companyId:', companyId);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar configurações da empresa:', error);
      // Usar company original se falhar
    }
  } else {
    console.warn('⚠️ companyId não fornecido para generateAtestadoPDF');
  }

  // Debug: verificar dados da empresa ANTES de criar o PDF
  console.log('=== DEBUG ATESTADO PDF ===');
  console.log('company:', company);
  console.log('company?.endereco:', company?.endereco);
  console.log('companyInfo:', companyInfo);
  console.log('companyInfo?.endereco:', companyInfo?.endereco);
  console.log('companyId:', companyId);
  console.log('========================');

  // Obter cores do tema
  let themeColors: { primary?: string; accent?: string; start?: string; middle?: string; end?: string } | undefined;
  
  if (themePreference) {
    const gradientColors = getGradientColors(themePreference, customColor, customColor2);
    if (gradientColors) {
      themeColors = {
        primary: gradientColors.start,
        accent: gradientColors.start,
        start: gradientColors.start,
        middle: gradientColors.middle,
        end: gradientColors.end
      };
    } else if (themePreference === 'custom' && customColor) {
      // Se for custom mas não retornou gradiente, usar a cor customizada diretamente
      themeColors = {
        primary: customColor,
        accent: customColor,
        start: customColor,
        middle: customColor,
        end: customColor
      };
    } else if (themePreference === 'neutral') {
      // Para tema neutral, usar cores neutras suaves
      themeColors = {
        primary: '#475569',
        accent: '#64748b',
        start: '#64748b',
        middle: '#64748b',
        end: '#64748b'
      };
    }
  }
  
  // Se não houver cores definidas, usar cores neutras como fallback
  if (!themeColors) {
    themeColors = {
      primary: '#475569',
      accent: '#64748b',
      start: '#64748b',
      middle: '#64748b',
      end: '#64748b'
    };
  }

  const pdfDoc = new jsPDF();
  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Cores dinâmicas baseadas no tema do usuário
  const primaryHex = themeColors?.primary || themeColors?.start || '#1e1e1e';
  const accentHex = themeColors?.accent || themeColors?.start || '#3b82f6';
  
  const primaryColor: [number, number, number] = hexToRgb(primaryHex);
  const secondaryColor: [number, number, number] = [100, 100, 100];
  const borderColor: [number, number, number] = [220, 220, 220];
  const accentColor: [number, number, number] = hexToRgb(accentHex);
  const bgLight: [number, number, number] = [248, 250, 252]; // Cinza muito claro

  // Título ATESTADO MÉDICO centralizado (estilo moderno)
  pdfDoc.setFontSize(18);
  pdfDoc.setFont('helvetica', 'bold');
  pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdfDoc.text('ATESTADO MÉDICO', pageWidth / 2, yPos, { align: 'center' });
  
  // Linha decorativa abaixo do título
  pdfDoc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  pdfDoc.setLineWidth(0.5);
  pdfDoc.line(pageWidth / 2 - 40, yPos + 2, pageWidth / 2 + 40, yPos + 2);
  
  yPos += 10;

  // Caixa IDENTIFICAÇÃO DO EMITENTE (ocupando toda a largura) - design moderno
  const emitenteBoxY = yPos;
  const emitenteBoxHeight = 34;
  const emitenteBoxWidth = maxWidth;
  
  // Fundo suave da caixa
  pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdfDoc.rect(margin, emitenteBoxY, emitenteBoxWidth, emitenteBoxHeight, 'F');
  
  // Borda moderna
  pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdfDoc.setLineWidth(0.3);
  pdfDoc.rect(margin, emitenteBoxY, emitenteBoxWidth, emitenteBoxHeight);
  
  // Título da caixa com fundo colorido
  pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  pdfDoc.rect(margin, emitenteBoxY, emitenteBoxWidth, 7, 'F');
  pdfDoc.setFontSize(9);
  pdfDoc.setFont('helvetica', 'bold');
  pdfDoc.setTextColor(255, 255, 255);
  pdfDoc.text('IDENTIFICAÇÃO DO EMITENTE', margin + emitenteBoxWidth / 2, emitenteBoxY + 5, { align: 'center' });
  
  // Logo da empresa dentro do quadrado (canto direito, centralizado verticalmente no conteúdo)
  const logoSize = 22;
  const logoSpacing = 3;
  const logoX = margin + emitenteBoxWidth - logoSpacing - logoSize / 2;
  const contentStartY = emitenteBoxY + 7;
  const contentHeight = emitenteBoxHeight - 7;
  const logoY = contentStartY + contentHeight / 2;
  const logoRadius = 4;
  const logoCanvasSize = 150;
  
  if (companyInfo?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(companyInfo.logoUrl);
      if (logoBase64) {
        const roundedLogoBase64 = await applyRoundedCorners(logoBase64, logoRadius, logoCanvasSize);
        if (roundedLogoBase64) {
          const imageFormat = roundedLogoBase64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
          pdfDoc.addImage(roundedLogoBase64, imageFormat, logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        } else {
          pdfDoc.addImage(logoBase64, 'PNG', logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        }
      } else {
        // Fallback: círculo com inicial se falhar ao carregar logo
        const circleRadius = 11; // Aumentado para melhor visibilidade
        pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        pdfDoc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        pdfDoc.setLineWidth(0.5);
        pdfDoc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw
        pdfDoc.setTextColor(255, 255, 255);
        pdfDoc.setFontSize(10);
        pdfDoc.setFont('helvetica', 'bold');
        const companyName = companyInfo?.nome || 'Clínica';
        const initial = companyName.charAt(0).toUpperCase();
        const initialWidth = pdfDoc.getTextWidth(initial);
        pdfDoc.text(initial, logoX - initialWidth / 2, logoY + 3);
      }
    } catch (error) {
      console.error('Erro ao adicionar logo ao PDF:', error);
      // Fallback: círculo com inicial em caso de erro
      const circleRadius = 11; // Aumentado para melhor visibilidade
      pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      pdfDoc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'bold');
      const companyName = companyInfo?.nome || 'Clínica';
      const initial = companyName.charAt(0).toUpperCase();
      const initialWidth = pdfDoc.getTextWidth(initial);
      pdfDoc.text(initial, logoX - initialWidth / 2, logoY + 3);
    }
  } else {
    // Logo/Ícone simples (círculo com inicial) quando não há logo
    const circleRadius = 11; // Aumentado para melhor visibilidade
    pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    pdfDoc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.circle(logoX, logoY, circleRadius, 'FD'); // 'FD' = Fill and Draw
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'bold');
    const companyName = companyInfo?.nome || 'Clínica';
    const initial = companyName.charAt(0).toUpperCase();
    const initialWidth = pdfDoc.getTextWidth(initial);
    pdfDoc.text(initial, logoX - initialWidth / 2, logoY + 3);
  }
  
  yPos = emitenteBoxY + emitenteBoxHeight + 8;
  
  // Preencher dados do emitente na caixa (sem linhas, apenas informações) - layout moderno
  // Usar companyInfo se disponível, senão usar company original
  const companyParaUsar = companyInfo || company;
  
  console.log('Renderizando emitente - companyParaUsar:', companyParaUsar);
  console.log('Renderizando emitente - companyParaUsar.endereco:', companyParaUsar?.endereco);
  
  if (professional && companyParaUsar) {
    let emitenteY = emitenteBoxY + 12;
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(8.5);
    pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    // Nome da Empresa (primeiro campo)
    if (companyParaUsar.nome) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Empresa:', margin + 5, emitenteY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(companyParaUsar.nome, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Nome Completo do Profissional
    if (professional.apelido) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Nome:', margin + 5, emitenteY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(professional.apelido, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Endereço Completo e Telefone
    const enderecoParaUsar = companyParaUsar.endereco;
    console.log('enderecoParaUsar:', enderecoParaUsar);
    
    const enderecoCompleto = [
      enderecoParaUsar?.rua && enderecoParaUsar?.numero ? `${enderecoParaUsar.rua}, ${enderecoParaUsar.numero}` : enderecoParaUsar?.rua || '',
      enderecoParaUsar?.bairro || ''
    ].filter(Boolean).join(' - ');
    
    console.log('enderecoCompleto:', enderecoCompleto);
    
    if (enderecoCompleto) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Endereço:', margin + 5, emitenteY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(enderecoCompleto, margin + 25, emitenteY);
    } else {
      console.warn('enderecoCompleto está vazio! enderecoParaUsar:', enderecoParaUsar);
    }
    emitenteY += 6;
    
    // Telefone
    if (companyParaUsar.telefone) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Telefone:', margin + 5, emitenteY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(companyParaUsar.telefone, margin + 25, emitenteY);
    }
    emitenteY += 6;
    
    // Cidade, UF
    const cidadeUF = [
      enderecoParaUsar?.cidade || '',
      enderecoParaUsar?.estado || ''
    ].filter(Boolean).join(' - ');
    if (cidadeUF) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Cidade/UF:', margin + 5, emitenteY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(cidadeUF, margin + 30, emitenteY);
    }
  } else {
    console.warn('Não renderizando emitente - professional:', professional, 'companyParaUsar:', companyParaUsar);
  }

  // Seção Paciente (sem linhas, apenas informações) - layout moderno
  yPos = emitenteBoxY + emitenteBoxHeight + 3;
  if (patient) {
    const patientBoxHeight = 16;
    pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdfDoc.rect(margin, yPos, maxWidth, patientBoxHeight, 'F');
    pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdfDoc.setLineWidth(0.3);
    pdfDoc.rect(margin, yPos, maxWidth, patientBoxHeight);
    
    const patientY = yPos + 6;
    pdfDoc.setFontSize(9);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    if (patient.nome) {
      pdfDoc.text('Paciente:', margin + 5, patientY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(patient.nome, margin + 25, patientY);
    }
    const enderecoY = patientY + 7;
    if (patient.telefoneE164) {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Contato:', margin + 5, enderecoY);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(patient.telefoneE164, margin + 25, enderecoY);
    }
    yPos += patientBoxHeight + 4;
  }

  // Seção Texto do Atestado (caixa moderna)
  const textoBoxY = yPos;
  const textoBoxHeight = Math.min(60, pageHeight - yPos - 100); // Altura dinâmica, mas limitada
  
  pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdfDoc.rect(margin, textoBoxY, maxWidth, textoBoxHeight, 'F');
  pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdfDoc.setLineWidth(0.3);
  pdfDoc.rect(margin, textoBoxY, maxWidth, textoBoxHeight);
  
  // Título da caixa com fundo colorido
  pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  pdfDoc.rect(margin, textoBoxY, maxWidth, 7, 'F');
  pdfDoc.setFontSize(9);
  pdfDoc.setFont('helvetica', 'bold');
  pdfDoc.setTextColor(255, 255, 255);
  pdfDoc.text('ATESTADO', margin + maxWidth / 2, textoBoxY + 5, { align: 'center' });
  
  yPos = textoBoxY + 12;
  pdfDoc.setFontSize(10);
  pdfDoc.setFont('helvetica', 'normal');
  pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  const textoLines = pdfDoc.splitTextToSize(texto, maxWidth - 20);
  textoLines.forEach((line: string) => {
    if (yPos > textoBoxY + textoBoxHeight - 5) {
      // Se não couber, adicionar nova página
      pdfDoc.addPage();
      yPos = margin + 10;
      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    }
    pdfDoc.text(line, margin + 10, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Informações adicionais (CID e Afastamento) em caixas modernas
  if (cid || diasAfastamento || (tipoAfastamento === 'horas' && (horaInicio || horaFim))) {
    if (yPos > pageHeight - 80) {
      pdfDoc.addPage();
      yPos = margin;
    }
    
    // Caixa para CID (se informado)
    if (cid) {
      const cidBoxHeight = 12;
      pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      pdfDoc.rect(margin, yPos, maxWidth, cidBoxHeight, 'F');
      pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.rect(margin, yPos, maxWidth, cidBoxHeight);
      
      pdfDoc.setFontSize(9);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdfDoc.text(`CID: ${cid}`, margin + 5, yPos + 8);
      yPos += cidBoxHeight + 4;
    }

    // Caixa para Afastamento
    if (diasAfastamento || (tipoAfastamento === 'horas' && (horaInicio || horaFim))) {
      // Calcular altura da caixa baseado no conteúdo
      let afastamentoBoxHeight = 18;
      if (tipoAfastamento === 'horas' && (horaInicio || horaFim)) {
        afastamentoBoxHeight = 28; // Mais espaço para os horários
      }
      
      pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      pdfDoc.rect(margin, yPos, maxWidth, afastamentoBoxHeight, 'F');
      pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.rect(margin, yPos, maxWidth, afastamentoBoxHeight);
      
      // Título da caixa
      pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      pdfDoc.rect(margin, yPos, maxWidth, 7, 'F');
      pdfDoc.setFontSize(9);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.text('AFASTAMENTO', margin + maxWidth / 2, yPos + 5, { align: 'center' });
      
      let afastamentoY = yPos + 12;
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(9);
      pdfDoc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      if (tipoAfastamento === 'horas') {
        // Mostrar apenas os horários de atendimento
        if (horaInicio || horaFim) {
          pdfDoc.setFont('helvetica', 'bold');
          pdfDoc.text('Horário de Atendimento:', margin + 5, afastamentoY);
          afastamentoY += 5;
          pdfDoc.setFont('helvetica', 'normal');
          
          if (horaInicio && horaFim) {
            pdfDoc.text(`Das ${horaInicio} às ${horaFim}`, margin + 5, afastamentoY);
          } else if (horaInicio) {
            pdfDoc.text(`A partir das ${horaInicio}`, margin + 5, afastamentoY);
          } else if (horaFim) {
            pdfDoc.text(`Até às ${horaFim}`, margin + 5, afastamentoY);
          }
        }
      } else if (diasAfastamento) {
        pdfDoc.text(`${diasAfastamento} dia(s)`, margin + 5, afastamentoY);
      }
      
      yPos += afastamentoBoxHeight + 4;
    }
  }

  // Assinatura do Profissional (estilo moderno, centralizada)
  if (yPos > pageHeight - 60) {
    pdfDoc.addPage();
    yPos = margin;
  }

  const signatureY = yPos;
  const signatureBoxHeight = professional?.signatureImageUrl ? 40 : 16;
  
  // Caixa moderna para assinatura - aumentada para não ficar apertada
  pdfDoc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdfDoc.rect(margin, signatureY, maxWidth, signatureBoxHeight, 'F');
  pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdfDoc.setLineWidth(0.3);
  pdfDoc.rect(margin, signatureY, maxWidth, signatureBoxHeight);
  
  // Linha superior decorativa
  pdfDoc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  pdfDoc.setLineWidth(0.5);
  pdfDoc.line(margin, signatureY, pageWidth - margin, signatureY);

  if (professional?.signatureImageUrl) {
    try {
      const signatureBase64 = await loadImageAsBase64(professional.signatureImageUrl);
      if (signatureBase64) {
        const processedSignature = await processSignature(signatureBase64);
        const finalSignature = processedSignature || signatureBase64;
        const img = new Image();
        img.src = finalSignature;
        await new Promise((resolve) => {
          img.onload = () => {
            // Manter proporção original da assinatura para não distorcer
            // Usar as dimensões reais da imagem processada para calcular proporção exata
            const aspectRatio = img.width / img.height; // Proporção real da imagem (largura/altura)
            const maxWidth = 100; // Largura máxima em mm (aumentada para não ficar apertada)
            const minHeight = 12; // Altura mínima em mm para não ficar muito achatada
            const maxHeight = 25; // Altura máxima em mm
            
            // Calcular dimensões mantendo proporção original
            // Primeiro tentar pela largura máxima
            let imgWidth = maxWidth;
            let imgHeight = maxWidth / aspectRatio;
            
            // Garantir altura mínima - se ficar muito pequena, aumentar largura
            if (imgHeight < minHeight) {
              imgHeight = minHeight;
              imgWidth = minHeight * aspectRatio; // Ajustar largura para manter proporção
            }
            
            // Se a altura ficar muito grande, ajustar pela altura máxima
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = maxHeight * aspectRatio; // Ajustar largura para manter proporção
            }
            
            // Centralizar horizontalmente
            const imgX = pageWidth / 2 - imgWidth / 2;
            let imgY = signatureY + 4;
            
            // Calcular posição do texto com mais espaçamento
            let textY = imgY + imgHeight + 2;
            if (textY > signatureY + signatureBoxHeight - 4) {
              const ajuste = textY - (signatureY + signatureBoxHeight - 4);
              imgY = imgY - ajuste;
              textY = imgY + imgHeight + 2;
            }
            
            // Adicionar a imagem
            pdfDoc.addImage(finalSignature, 'PNG', imgX, imgY, imgWidth, imgHeight);
            pdfDoc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            pdfDoc.setFontSize(8);
            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.text(professional.apelido, pageWidth / 2, textY, { align: 'center' });
            textY += 3.5; // Espaçamento adequado entre linhas
            
            // CRO (se for dentista)
            if (professional.cro && professional.croEstado) {
              pdfDoc.setFont('helvetica', 'normal');
              pdfDoc.setFontSize(7);
              const croText = `CRO ${professional.cro}/${professional.croEstado}`;
              pdfDoc.text(croText, pageWidth / 2, textY, { align: 'center' });
              textY += 3.5; // Espaçamento adequado entre linhas
            }
            
            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setFontSize(7);
            pdfDoc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, textY, { align: 'center' });
            resolve(null);
          };
          img.onerror = resolve;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      // Fallback: apenas nome do profissional
      pdfDoc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      pdfDoc.setFontSize(8);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(professional?.apelido || 'Profissional', pageWidth / 2, signatureY + 6, { align: 'center' });
      
      if (professional?.cro && professional?.croEstado) {
        pdfDoc.setFontSize(7);
        const croText = `CRO ${professional.cro}/${professional.croEstado}`;
        pdfDoc.text(croText, pageWidth / 2, signatureY + 9, { align: 'center' });
        pdfDoc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 12, { align: 'center' });
      } else {
        pdfDoc.setFontSize(7);
        pdfDoc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 9, { align: 'center' });
      }
    }
  } else {
    // Linha para assinatura manual (centralizada)
    pdfDoc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdfDoc.setLineWidth(0.8);
    const lineWidth = 60;
    pdfDoc.line(pageWidth / 2 - lineWidth / 2, signatureY + 3, pageWidth / 2 + lineWidth / 2, signatureY + 3);
    pdfDoc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdfDoc.setFontSize(8);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.text(professional?.apelido || 'Profissional', pageWidth / 2, signatureY + 6, { align: 'center' });
    
    if (professional?.cro && professional?.croEstado) {
      pdfDoc.setFontSize(7);
      const croText = `CRO ${professional.cro}/${professional.croEstado}`;
      pdfDoc.text(croText, pageWidth / 2, signatureY + 9, { align: 'center' });
      pdfDoc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 12, { align: 'center' });
    } else {
      pdfDoc.setFontSize(7);
      pdfDoc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageWidth / 2, signatureY + 9, { align: 'center' });
    }
  }

  // Linha inferior da caixa de assinatura
  pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdfDoc.setLineWidth(0.3);
  pdfDoc.line(margin, signatureY + signatureBoxHeight, pageWidth - margin, signatureY + signatureBoxHeight);

  // Rodapé
  const footerY = pageHeight - 15;
  pdfDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdfDoc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  pdfDoc.setTextColor(150, 150, 150);
  pdfDoc.setFontSize(7);
  pdfDoc.setFont('helvetica', 'normal');
  pdfDoc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, footerY, { align: 'center' });

  // Salvar PDF
  const fileName = `atestado-${patient?.nome?.replace(/\s+/g, '-') || 'paciente'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdfDoc.save(fileName);
};

