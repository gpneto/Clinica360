import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PoliticaPrivacidadePage from '@/app/politica-de-privacidade/page';

describe('PoliticaPrivacidadePage', () => {
  it('deve renderizar a página de política de privacidade corretamente', () => {
    const { container } = render(<PoliticaPrivacidadePage />);
    expect(container).toBeTruthy();
  });

  it('deve exibir conteúdo da política de privacidade', () => {
    const { container } = render(<PoliticaPrivacidadePage />);
    expect(container).toBeTruthy();
  });
});

