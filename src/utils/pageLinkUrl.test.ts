import { describe, it, expect } from 'vitest';
import { normalizePageLinkUrl, normalizeAvatarUrl } from './pageLinkUrl';

describe('normalizePageLinkUrl', () => {
  it('aceita http, https, mailto e tel', () => {
    expect(normalizePageLinkUrl('instagram.com/meuperfil')).toBe('https://instagram.com/meuperfil');
    expect(normalizePageLinkUrl('mailto:contato@example.com')).toBe('mailto:contato@example.com');
    expect(normalizePageLinkUrl('tel:+5511999999999')).toBe('tel:+5511999999999');
  });

  it.each(['javascript:alert(1)', 'data:text/html,oi', 'file:///c:/x', 'vbscript:x'])(
    'rejeita protocolo perigoso: %s',
    (entrada) => {
      expect(normalizePageLinkUrl(entrada)).toBeNull();
    },
  );

  it('rejeita URL com usuário embutido', () => {
    expect(normalizePageLinkUrl('https://banco.com@golpe.com')).toBeNull();
  });
});

describe('normalizeAvatarUrl', () => {
  it('aceita só http e https', () => {
    expect(normalizeAvatarUrl('https://example.com/foto.png')).toBe('https://example.com/foto.png');
    expect(normalizeAvatarUrl('mailto:a@b.com')).toBeNull();
    expect(normalizeAvatarUrl('javascript:alert(1)')).toBeNull();
  });

  it('campo vazio não é avatar', () => {
    expect(normalizeAvatarUrl('')).toBeNull();
  });
});
