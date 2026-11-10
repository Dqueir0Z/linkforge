import { describe, it, expect } from 'vitest';
import { normalizeUrl, isValidUrl } from './url';

describe('normalizeUrl', () => {
  it('aceita http e https e devolve a URL normalizada', () => {
    expect(normalizeUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('acrescenta https:// quando o usuário digita só o domínio', () => {
    expect(normalizeUrl('  github.com/Dqueir0Z  ')).toBe('https://github.com/Dqueir0Z');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'ftp://example.com',
  ])('rejeita protocolo perigoso ou não suportado: %s', (entrada) => {
    expect(normalizeUrl(entrada)).toBeNull();
  });

  it('rejeita URL com usuário e senha, que disfarça o destino real', () => {
    expect(normalizeUrl('https://google.com@evil-example.com')).toBeNull();
    expect(normalizeUrl('google.com@evil-example.com')).toBeNull();
    expect(normalizeUrl('https://user:pass@example.com')).toBeNull();
  });

  it('rejeita entradas vazias e hosts sem domínio', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
    expect(normalizeUrl('localhost')).toBeNull();
    expect(normalizeUrl('http://intranet')).toBeNull();
    expect(normalizeUrl('não é url')).toBeNull();
  });

  it('isValidUrl acompanha normalizeUrl', () => {
    expect(isValidUrl('example.com')).toBe(true);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});
