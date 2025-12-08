import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Funções utilitárias para cores dinâmicas
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  // Remove o # se presente
  hex = hex.replace('#', '');
  
  // Verifica se é hex válido
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return null;
  }
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  hex = hex.replace('#', '');
  
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return null;
  }
  
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function adjustHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  
  const newHue = (hsl.h + degrees) % 360;
  return hslToHex(newHue, hsl.s, hsl.l);
}

export function adjustSaturation(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  
  const newSaturation = Math.max(0, Math.min(100, hsl.s + percent));
  return hslToHex(hsl.h, newSaturation, hsl.l);
}

export function adjustLightness(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  
  const newLightness = Math.max(0, Math.min(100, hsl.l + percent));
  return hslToHex(hsl.h, hsl.s, newLightness);
}

export function hslToHex(h: number, s: number, l: number): string {
  h = h % 360;
  s = s / 100;
  l = l / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return rgbToHex(r, g, b);
}

// Gera cores para gradiente baseado em uma cor primária
export function generateGradientColors(primaryColor: string): {
  start: string;
  middle: string;
  end: string;
} {
  const hsl = hexToHsl(primaryColor);
  if (!hsl) {
    // Fallback para indigo se cor inválida
    return {
      start: '#6366f1',
      middle: '#8b5cf6',
      end: '#ec4899'
    };
  }
  
  // Gera cores para gradiente harmônico
  const start = hslToHex(hsl.h, Math.min(100, hsl.s + 10), Math.max(20, hsl.l - 10));
  const middle = hslToHex((hsl.h + 30) % 360, Math.min(100, hsl.s + 5), hsl.l);
  const end = hslToHex((hsl.h + 60) % 360, Math.min(100, hsl.s + 15), Math.min(90, hsl.l + 10));
  
  return { start, middle, end };
}

// Gera cores para gradiente baseado em duas cores primárias
export function generateGradientColorsWithTwoColors(color1: string, color2: string): {
  start: string;
  middle: string;
  end: string;
} {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);
  
  if (!hsl1 || !hsl2) {
    // Fallback se cores inválidas
    return {
      start: '#3b82f6',
      middle: '#06b6d4',
      end: '#10b981'
    };
  }
  
  // Gera gradiente usando as duas cores
  // A primeira cor é o start, a segunda é o end
  // O middle é uma cor intermediária entre as duas
  const middleH = (hsl1.h + hsl2.h) / 2;
  const middleS = (hsl1.s + hsl2.s) / 2;
  const middleL = (hsl1.l + hsl2.l) / 2;
  
  const start = color1;
  const middle = hslToHex(middleH, middleS, middleL);
  const end = color2;
  
  return { start, middle, end };
}

// Gera paleta de cores baseada em uma cor primária
export function generateColorPalette(primaryColor: string): {
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  background: string;
  foreground: string;
} {
  const hsl = hexToHsl(primaryColor);
  if (!hsl) {
    return {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      muted: '#e0e7ff',
      background: '#f0f9ff',
      foreground: '#1e293b'
    };
  }
  
  // Cores complementares e análogas
  const primary = primaryColor;
  const secondary = hslToHex((hsl.h + 30) % 360, Math.min(100, hsl.s + 10), hsl.l);
  const accent = hslToHex((hsl.h + 60) % 360, Math.min(100, hsl.s + 20), Math.min(90, hsl.l + 5));
  const muted = hslToHex(hsl.h, Math.max(10, hsl.s - 60), Math.min(95, hsl.l + 40));
  const background = hslToHex(hsl.h, Math.max(5, hsl.s - 80), Math.min(98, hsl.l + 50));
  const foreground = hslToHex(hsl.h, Math.min(100, hsl.s + 20), Math.max(10, hsl.l - 70));
  
  return {
    primary,
    secondary,
    accent,
    muted,
    background,
    foreground
  };
}

// Aplica cor customizada ao documento
export function applyCustomColor(color: string, color2?: string) {
  if (typeof document === 'undefined') return;
  
  const palette = generateColorPalette(color);
  const gradient = color2 
    ? generateGradientColorsWithTwoColors(color, color2)
    : generateGradientColors(color);
  const hsl = hexToHsl(color);
  
  if (!hsl) return;
  
  const root = document.documentElement;
  
  // Aplica variáveis CSS
  root.style.setProperty('--custom-primary', color);
  root.style.setProperty('--custom-primary-h', hsl.h.toString());
  root.style.setProperty('--custom-primary-s', `${hsl.s}%`);
  root.style.setProperty('--custom-primary-l', `${hsl.l}%`);
  
  // Cores do gradiente
  root.style.setProperty('--custom-gradient-start', gradient.start);
  root.style.setProperty('--custom-gradient-middle', gradient.middle);
  root.style.setProperty('--custom-gradient-end', gradient.end);
  
  // Paleta de cores
  root.style.setProperty('--custom-secondary', palette.secondary);
  root.style.setProperty('--custom-accent', palette.accent);
  root.style.setProperty('--custom-muted', palette.muted);
  
  // Background gradiente
  const rgb = hexToRgb(gradient.start);
  const rgbEnd = hexToRgb(gradient.end);
  if (rgb && rgbEnd) {
    root.style.setProperty(
      '--custom-page-background',
      `linear-gradient(135deg, ${palette.background} 0%, ${hslToHex(hsl.h, Math.max(5, hsl.s - 70), Math.min(96, hsl.l + 45))} 100%)`
    );
    root.style.setProperty(
      '--custom-page-background-image',
      `radial-gradient(circle at 18% -10%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) 0, transparent 55%), radial-gradient(circle at 90% 110%, rgba(${rgbEnd.r}, ${rgbEnd.g}, ${rgbEnd.b}, 0.28) 0, transparent 55%)`
    );
  }
  
  // Card background com gradiente
  root.style.setProperty(
    '--custom-card-background',
    `linear-gradient(150deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.78))`
  );
  
  // Card border e shadow
  if (rgb) {
    root.style.setProperty(
      '--custom-card-border',
      `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`
    );
    root.style.setProperty(
      '--custom-card-shadow',
      `0 22px 45px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
    );
  }
}

// Remove cor customizada
export function removeCustomColor() {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const customProps = [
    '--custom-primary',
    '--custom-primary-h',
    '--custom-primary-s',
    '--custom-primary-l',
    '--custom-gradient-start',
    '--custom-gradient-middle',
    '--custom-gradient-end',
    '--custom-secondary',
    '--custom-accent',
    '--custom-muted',
    '--custom-page-background',
    '--custom-page-background-image',
    '--custom-card-background',
    '--custom-card-border',
    '--custom-card-shadow'
  ];
  
  customProps.forEach(prop => {
    root.style.removeProperty(prop);
  });
}

// Obtém cores de gradiente baseado no tema
export function getGradientColors(
  themePreference: 'neutral' | 'vibrant' | 'custom',
  customColor?: string | null,
  customColor2?: string | null
): { start: string; middle: string; end: string } | null {
  if (themePreference === 'custom' && customColor) {
    if (customColor2) {
      return generateGradientColorsWithTwoColors(customColor, customColor2);
    }
    return generateGradientColors(customColor);
  } else if (themePreference === 'vibrant') {
    return {
      start: '#6366f1',
      middle: '#8b5cf6',
      end: '#ec4899'
    };
  }
  return null;
}

// Obtém estilo de gradiente para uso inline
export function getGradientStyle(
  themePreference: 'neutral' | 'vibrant' | 'custom',
  customColor?: string | null,
  direction: '90deg' | '135deg' = '135deg',
  customColor2?: string | null
): { background: string } | undefined {
  const gradient = getGradientColors(themePreference, customColor, customColor2);
  if (!gradient) return undefined;
  
  return {
    background: `linear-gradient(${direction}, ${gradient.start} 0%, ${gradient.middle} 50%, ${gradient.end} 100%)`,
  };
}

// Interface para feriados
export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'state';
  state?: string;
}

// Função para buscar feriados nacionais e estaduais
export async function fetchHolidays(year: number, state?: string): Promise<Holiday[]> {
  const holidays: Holiday[] = [];
  
  // Sempre incluir feriados nacionais (são fixos)
  holidays.push(...getDefaultNationalHolidays(year));
  
  // Tentar buscar feriados estaduais
  if (state) {
    // Primeiro, tentar buscar de uma lista estática conhecida
    const staticStateHolidays = getStaticStateHolidays(year, state);
    if (staticStateHolidays.length > 0) {
      holidays.push(...staticStateHolidays);
    }
    
    // Depois, tentar buscar via API
    try {
      // Usar API pública de Soluções Tecnológicas que não requer autenticação
      const url = `https://solucoes.dev.br/calc/api/api-feriados.php?ano=${year}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const text = await response.text();
        let data: any;
        
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.warn('Resposta da API não é JSON válido:', text.substring(0, 200));
          return holidays; // Retornar com feriados nacionais e estáticos já adicionados
        }
        
        console.log('[Feriados] Resposta da API:', data);
        
        // Tentar diferentes formatos de resposta
        let stateHolidays: any[] = [];
        
        // Formato 1: { feriados_estaduais: { "SP": [...] } }
        if (data.feriados_estaduais && typeof data.feriados_estaduais === 'object') {
          stateHolidays = data.feriados_estaduais[state] || data.feriados_estaduais[state.toUpperCase()] || [];
          console.log(`[Feriados] Encontrados ${stateHolidays.length} feriados estaduais no formato 1 para ${state}`);
        }
        
        // Formato 2: Array direto com propriedade estado
        if (stateHolidays.length === 0 && Array.isArray(data)) {
          stateHolidays = data.filter((f: any) => {
            const estado = f.estado || f.state || f.uf || f.Estado || f.UF;
            const matches = estado && (estado.toUpperCase() === state.toUpperCase() || estado === state);
            return matches;
          });
          console.log(`[Feriados] Encontrados ${stateHolidays.length} feriados estaduais no formato 2 para ${state}`);
        }
        
        // Formato 3: Objeto com chaves sendo os estados
        if (stateHolidays.length === 0 && typeof data === 'object' && !Array.isArray(data)) {
          const stateKey = Object.keys(data).find(key => key.toUpperCase() === state.toUpperCase());
          if (stateKey && Array.isArray(data[stateKey])) {
            stateHolidays = data[stateKey];
            console.log(`[Feriados] Encontrados ${stateHolidays.length} feriados estaduais no formato 3 para ${state}`);
          }
        }
        
        // Processar feriados estaduais encontrados
        stateHolidays.forEach((feriado: any) => {
          const date = feriado.data || feriado.date || feriado.dia || feriado.Data || feriado.data_feriado;
          const name = feriado.nome || feriado.name || feriado.descricao || feriado.Nome || feriado.Descricao || feriado.feriado;
          
          if (date && name) {
            // Normalizar formato de data para YYYY-MM-DD
            let normalizedDate = date;
            if (typeof date === 'string') {
              if (date.includes('/')) {
                const parts = date.split('/');
                if (parts.length === 2) {
                  // DD/MM
                  const [day, month] = parts;
                  normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                } else if (parts.length === 3) {
                  // DD/MM/YYYY
                  const [day, month, yearPart] = parts;
                  normalizedDate = `${yearPart}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Já está no formato YYYY-MM-DD
                normalizedDate = date;
              }
            }
            
            // Verificar se já não existe (evitar duplicatas com lista estática)
            const alreadyExists = holidays.some(h => h.date === normalizedDate && h.name === name.trim());
            if (!alreadyExists) {
              holidays.push({
                date: normalizedDate,
                name: name.trim(),
                type: 'state',
                state: state,
              });
            }
          }
        });
        
        console.log(`[Feriados] Total de feriados encontrados: ${holidays.length} (${holidays.filter(h => h.type === 'national').length} nacionais, ${holidays.filter(h => h.type === 'state').length} estaduais)`);
      } else {
        console.warn(`[Feriados] API retornou status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Não foi possível buscar feriados estaduais da API, usando apenas feriados nacionais e estáticos:', error);
      // Continuar apenas com feriados nacionais e estáticos
    }
  }
  
  return holidays;
}

// Função auxiliar para retornar feriados estaduais conhecidos
function getStaticStateHolidays(year: number, state: string): Holiday[] {
  const stateHolidays: Record<string, Array<{ day: number; month: number; name: string }>> = {
    'SP': [
      { day: 9, month: 7, name: 'Revolução Constitucionalista' },
    ],
    'RJ': [
      { day: 23, month: 4, name: 'São Jorge' },
      { day: 20, month: 11, name: 'Zumbi dos Palmares' },
    ],
    'MG': [
      { day: 21, month: 4, name: 'Data Magna de Minas Gerais' },
    ],
    'RS': [
      { day: 20, month: 9, name: 'Revolução Farroupilha' },
    ],
    'SC': [
      { day: 11, month: 8, name: 'Dia de Santa Catarina' },
    ],
    'PR': [
      { day: 19, month: 12, name: 'Emancipação do Paraná' },
    ],
    'BA': [
      { day: 2, month: 7, name: 'Independência da Bahia' },
    ],
    'CE': [
      { day: 25, month: 3, name: 'Data Magna do Ceará' },
    ],
    'PE': [
      { day: 6, month: 3, name: 'Revolução Pernambucana' },
    ],
    'PA': [
      { day: 15, month: 8, name: 'Adesão do Pará à Independência' },
    ],
    'AM': [
      { day: 5, month: 9, name: 'Elevação do Amazonas à categoria de província' },
    ],
    'GO': [
      { day: 5, month: 7, name: 'Dia Estadual do Goiano' },
    ],
    'ES': [
      { day: 23, month: 5, name: 'Dia do Capixaba' },
    ],
    'PB': [
      { day: 5, month: 8, name: 'Fundação do Estado' },
    ],
    'AL': [
      { day: 16, month: 9, name: 'Emancipação Política de Alagoas' },
    ],
    'SE': [
      { day: 8, month: 7, name: 'Emancipação Política de Sergipe' },
    ],
    'PI': [
      { day: 19, month: 10, name: 'Dia do Piauí' },
    ],
    'MA': [
      { day: 28, month: 7, name: 'Adesão do Maranhão à Independência' },
    ],
    'RN': [
      { day: 7, month: 9, name: 'Independência do Rio Grande do Norte' },
    ],
    'TO': [
      { day: 5, month: 10, name: 'Criação do Estado' },
    ],
    'AC': [
      { day: 15, month: 6, name: 'Aniversário do Estado' },
    ],
    'RO': [
      { day: 4, month: 1, name: 'Criação do Estado' },
    ],
    'RR': [
      { day: 5, month: 10, name: 'Criação do Estado' },
    ],
    'AP': [
      { day: 13, month: 9, name: 'Criação do Território' },
    ],
    'DF': [
      { day: 21, month: 4, name: 'Fundação de Brasília' },
    ],
    'MT': [
      { day: 20, month: 11, name: 'Dia da Consciência Negra' },
    ],
    'MS': [
      { day: 11, month: 10, name: 'Criação do Estado' },
    ],
  };
  
  const holidays = stateHolidays[state.toUpperCase()] || [];
  return holidays.map(h => ({
    date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
    name: h.name,
    type: 'state' as const,
    state: state,
  }));
}

// Função auxiliar para retornar feriados nacionais conhecidos em caso de falha da API
function getDefaultNationalHolidays(year: number): Holiday[] {
  return [
    { date: `${year}-01-01`, name: 'Confraternização Universal', type: 'national' },
    { date: `${year}-04-21`, name: 'Tiradentes', type: 'national' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador', type: 'national' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national' },
    { date: `${year}-11-02`, name: 'Finados', type: 'national' },
    { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national' },
    { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'national' },
    { date: `${year}-12-25`, name: 'Natal', type: 'national' },
  ];
}
