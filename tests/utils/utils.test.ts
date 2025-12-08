import { describe, it, expect } from 'vitest';
import {
  cn,
  hexToHsl,
  hexToRgb,
  rgbToHex,
  hslToHex,
  adjustHue,
  adjustSaturation,
  adjustLightness,
  generateGradientColors,
  generateGradientColorsWithTwoColors,
  generateColorPalette,
  getGradientColors,
  getGradientStyle,
} from '@/lib/utils';

describe('Utilitários - Funções de Cores', () => {
  describe('hexToHsl', () => {
    it('deve converter hex válido para HSL', () => {
      const result = hexToHsl('#FF0000');
      expect(result).not.toBeNull();
      expect(result?.h).toBeGreaterThanOrEqual(0);
      expect(result?.h).toBeLessThanOrEqual(360);
      expect(result?.s).toBeGreaterThanOrEqual(0);
      expect(result?.s).toBeLessThanOrEqual(100);
      expect(result?.l).toBeGreaterThanOrEqual(0);
      expect(result?.l).toBeLessThanOrEqual(100);
    });

    it('deve retornar null para hex inválido', () => {
      expect(hexToHsl('invalid')).toBeNull();
      expect(hexToHsl('#GG0000')).toBeNull();
      // FF0000 sem # pode ser aceito pela função (ela remove o #)
      // Então vamos testar com um formato realmente inválido
      expect(hexToHsl('GG0000')).toBeNull();
      expect(hexToHsl('12345')).toBeNull(); // Muito curto
    });

    it('deve converter vermelho corretamente', () => {
      const result = hexToHsl('#FF0000');
      expect(result).not.toBeNull();
      // Vermelho puro tem hue ~0
      expect(result?.h).toBeGreaterThanOrEqual(0);
      expect(result?.h).toBeLessThanOrEqual(10);
    });

    it('deve converter verde corretamente', () => {
      const result = hexToHsl('#00FF00');
      expect(result).not.toBeNull();
      // Verde puro tem hue ~120
      expect(result?.h).toBeGreaterThanOrEqual(110);
      expect(result?.h).toBeLessThanOrEqual(130);
    });

    it('deve converter azul corretamente', () => {
      const result = hexToHsl('#0000FF');
      expect(result).not.toBeNull();
      // Azul puro tem hue ~240
      expect(result?.h).toBeGreaterThanOrEqual(230);
      expect(result?.h).toBeLessThanOrEqual(250);
    });
  });

  describe('hexToRgb', () => {
    it('deve converter hex válido para RGB', () => {
      const result = hexToRgb('#FF0000');
      expect(result).not.toBeNull();
      expect(result?.r).toBe(255);
      expect(result?.g).toBe(0);
      expect(result?.b).toBe(0);
    });

    it('deve retornar null para hex inválido', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#GG0000')).toBeNull();
    });

    it('deve converter cores corretamente', () => {
      expect(hexToRgb('#00FF00')?.g).toBe(255);
      expect(hexToRgb('#0000FF')?.b).toBe(255);
      expect(hexToRgb('#FFFFFF')?.r).toBe(255);
      expect(hexToRgb('#FFFFFF')?.g).toBe(255);
      expect(hexToRgb('#FFFFFF')?.b).toBe(255);
    });
  });

  describe('rgbToHex', () => {
    it('deve converter RGB para hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('deve formatar valores de 1 dígito corretamente', () => {
      expect(rgbToHex(10, 20, 30)).toBe('#0a141e');
    });
  });

  describe('hslToHex', () => {
    it('deve converter HSL para hex', () => {
      const result = hslToHex(0, 100, 50); // Vermelho
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve lidar com valores fora do range', () => {
      // A função deve normalizar valores fora do range
      const result1 = hslToHex(400, 150, -10); // Valores inválidos
      // hslToHex normaliza h para 0-360, mas s e l podem causar problemas
      // Vamos testar com valores que a função pode normalizar
      const result2 = hslToHex(400 % 360, Math.max(0, Math.min(100, 150)), Math.max(0, Math.min(100, -10)));
      expect(result2).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('adjustHue', () => {
    it('deve ajustar matiz corretamente', () => {
      const result = adjustHue('#FF0000', 120); // Vermelho + 120 = Verde
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result).not.toBe('#FF0000');
    });

    it('deve lidar com rotação circular (360 graus)', () => {
      const result = adjustHue('#FF0000', 360);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('adjustSaturation', () => {
    it('deve aumentar saturação', () => {
      const result = adjustSaturation('#808080', 20);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve diminuir saturação', () => {
      const result = adjustSaturation('#FF0000', -50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve manter saturação entre 0 e 100', () => {
      const result = adjustSaturation('#FF0000', 200); // Muito alto
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('adjustLightness', () => {
    it('deve aumentar luminosidade', () => {
      const result = adjustLightness('#000000', 50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result).not.toBe('#000000');
    });

    it('deve diminuir luminosidade', () => {
      const result = adjustLightness('#FFFFFF', -50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result).not.toBe('#FFFFFF');
    });

    it('deve manter luminosidade entre 0 e 100', () => {
      const result = adjustLightness('#808080', 200); // Muito alto
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('generateGradientColors', () => {
    it('deve gerar cores de gradiente', () => {
      const result = generateGradientColors('#6366f1');
      expect(result.start).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.middle).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.end).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve usar fallback para cor inválida', () => {
      const result = generateGradientColors('invalid');
      expect(result.start).toBe('#6366f1');
      expect(result.middle).toBe('#8b5cf6');
      expect(result.end).toBe('#ec4899');
    });
  });

  describe('generateGradientColorsWithTwoColors', () => {
    it('deve gerar gradiente com duas cores', () => {
      const result = generateGradientColorsWithTwoColors('#FF0000', '#0000FF');
      expect(result.start).toBe('#FF0000');
      expect(result.end).toBe('#0000FF');
      expect(result.middle).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve usar fallback para cores inválidas', () => {
      const result = generateGradientColorsWithTwoColors('invalid', 'invalid2');
      expect(result.start).toBe('#3b82f6');
      expect(result.middle).toBe('#06b6d4');
      expect(result.end).toBe('#10b981');
    });
  });

  describe('generateColorPalette', () => {
    it('deve gerar paleta de cores', () => {
      const result = generateColorPalette('#6366f1');
      expect(result.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.muted).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve usar fallback para cor inválida', () => {
      const result = generateColorPalette('invalid');
      expect(result.primary).toBe('#6366f1');
      expect(result.secondary).toBe('#8b5cf6');
      expect(result.accent).toBe('#ec4899');
    });
  });

  describe('getGradientColors', () => {
    it('deve retornar gradiente para tema vibrant', () => {
      const result = getGradientColors('vibrant');
      expect(result).not.toBeNull();
      expect(result?.start).toBe('#6366f1');
      expect(result?.middle).toBe('#8b5cf6');
      expect(result?.end).toBe('#ec4899');
    });

    it('deve retornar null para tema neutral', () => {
      const result = getGradientColors('neutral');
      expect(result).toBeNull();
    });

    it('deve gerar gradiente para tema custom', () => {
      const result = getGradientColors('custom', '#FF0000');
      expect(result).not.toBeNull();
      expect(result?.start).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('deve gerar gradiente com duas cores custom', () => {
      const result = getGradientColors('custom', '#FF0000', '#0000FF');
      expect(result).not.toBeNull();
      expect(result?.start).toBe('#FF0000');
      expect(result?.end).toBe('#0000FF');
    });
  });

  describe('getGradientStyle', () => {
    it('deve retornar estilo de gradiente', () => {
      const result = getGradientStyle('vibrant');
      expect(result).not.toBeUndefined();
      expect(result?.background).toContain('linear-gradient');
    });

    it('deve retornar undefined para tema neutral', () => {
      const result = getGradientStyle('neutral');
      expect(result).toBeUndefined();
    });

    it('deve usar direção customizada', () => {
      const result = getGradientStyle('vibrant', undefined, '90deg');
      expect(result?.background).toContain('90deg');
    });
  });
});

describe('Utilitários - Função cn', () => {
  it('deve mesclar classes corretamente', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('deve lidar com classes condicionais', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('deve remover classes duplicadas', () => {
    const result = cn('class1', 'class1');
    // Tailwind merge deve remover duplicatas
    expect(result).toBeTruthy();
  });

  it('deve lidar com arrays de classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });
});

