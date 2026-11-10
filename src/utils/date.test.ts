import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isExpired,
  getLinkStatus,
  computeExpiration,
  localToUtc,
  utcToLocalInput,
  validateCustomExpiration,
  timeAgo,
} from './date';

const AGORA = new Date('2026-11-10T15:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isExpired', () => {
  it('link sem data de expiração nunca expira', () => {
    expect(isExpired(null)).toBe(false);
  });

  it('expira exatamente no instante marcado', () => {
    expect(isExpired('2026-11-10T15:00:00.000Z')).toBe(true);
    expect(isExpired('2026-11-10T15:00:01.000Z')).toBe(false);
  });
});

describe('getLinkStatus', () => {
  it('desativado tem prioridade sobre expirado', () => {
    expect(getLinkStatus(false, '2020-01-01T00:00:00.000Z')).toBe('inactive');
  });

  it('distingue ativo e expirado', () => {
    expect(getLinkStatus(true, null)).toBe('active');
    expect(getLinkStatus(true, '2020-01-01T00:00:00.000Z')).toBe('expired');
  });
});

describe('computeExpiration', () => {
  it('calcula os prazos prontos a partir de agora', () => {
    expect(computeExpiration('never')).toBeNull();
    expect(computeExpiration('24h')).toBe('2026-11-11T15:00:00.000Z');
    expect(computeExpiration('7d')).toBe('2026-11-17T15:00:00.000Z');
    expect(computeExpiration('30d')).toBe('2026-12-10T15:00:00.000Z');
  });

  it('data personalizada sem valor não gera expiração', () => {
    expect(computeExpiration('custom')).toBeNull();
  });
});

describe('conversão entre horário local e UTC', () => {
  it('ida e volta preservam o valor do campo datetime-local', () => {
    const campo = '2026-12-24T18:30';
    expect(utcToLocalInput(localToUtc(campo))).toBe(campo);
  });

  it('localToUtc devolve ISO em UTC', () => {
    expect(localToUtc('2026-12-24T18:30')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
  });
});

describe('validateCustomExpiration', () => {
  it('exige data preenchida, válida e no futuro', () => {
    expect(validateCustomExpiration('')).toBe('Selecione uma data de expiração.');
    expect(validateCustomExpiration('xyz')).toBe('Data de expiração inválida.');
    expect(validateCustomExpiration('2020-01-01T00:00')).toBe('A data de expiração deve ser no futuro.');
    expect(validateCustomExpiration('2030-01-01T00:00')).toBeNull();
  });
});

describe('timeAgo', () => {
  it('descreve o tempo decorrido em português', () => {
    expect(timeAgo('2026-11-10T14:59:30.000Z')).toBe('agora mesmo');
    expect(timeAgo('2026-11-10T14:45:00.000Z')).toBe('há 15 min');
    expect(timeAgo('2026-11-10T12:00:00.000Z')).toBe('há 3h');
    expect(timeAgo('2026-11-07T15:00:00.000Z')).toBe('há 3 dias');
  });
});
