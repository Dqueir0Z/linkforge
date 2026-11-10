import { describe, it, expect } from 'vitest';
import {
  normalizeAlias,
  isValidAlias,
  isReservedRoute,
  generateShortCode,
  suggestAliasFromUrl,
} from './alias';

describe('normalizeAlias', () => {
  it('converte texto livre em alias legível', () => {
    expect(normalizeAlias('Meu Portfólio')).toBe('meu-portfolio');
    expect(normalizeAlias('  Ação   Rápida!! ')).toBe('acao-rapida');
    expect(normalizeAlias('--a---b--')).toBe('a-b');
  });
});

describe('isValidAlias', () => {
  it('exige entre 3 e 50 caracteres depois de normalizar', () => {
    expect(isValidAlias('ab')).toBe(false);
    expect(isValidAlias('abc')).toBe(true);
    expect(isValidAlias('a'.repeat(50))).toBe(true);
    expect(isValidAlias('a'.repeat(51))).toBe(false);
  });

  it('não aceita alias que vira vazio', () => {
    expect(isValidAlias('!!!')).toBe(false);
  });
});

describe('isReservedRoute', () => {
  it('bloqueia rotas do próprio app, mesmo com maiúsculas ou espaços', () => {
    expect(isReservedRoute('links')).toBe(true);
    expect(isReservedRoute(' Login ')).toBe(true);
    expect(isReservedRoute('sobre')).toBe(true);
    expect(isReservedRoute('meu-projeto')).toBe(false);
  });
});

describe('generateShortCode', () => {
  it('gera códigos de 5 a 8 caracteres sem letras ambíguas (l, o, 0, 1)', () => {
    for (let i = 0; i < 500; i++) {
      const codigo = generateShortCode();
      expect(codigo).toMatch(/^[a-km-np-z2-9]{5,8}$/);
    }
  });
});

describe('suggestAliasFromUrl', () => {
  it('sugere o último trecho do caminho', () => {
    expect(suggestAliasFromUrl('https://example.com/blog/meu-artigo')).toBe('meu-artigo');
    expect(suggestAliasFromUrl('https://example.com/Promoção/')).toBe('promocao');
  });

  it('não sugere nada quando não há caminho útil', () => {
    expect(suggestAliasFromUrl('https://example.com')).toBeNull();
    expect(suggestAliasFromUrl('https://example.com/ab')).toBeNull();
    expect(suggestAliasFromUrl('não é url')).toBeNull();
  });
});
