const RESERVED_ROUTES = [
  'admin', 'api', 'links', 'about', 'login', 'dashboard', 'settings',
  'pages', '404', 'iniciar', 'meus-links', 'minhas-paginas', 'sobre',
  'p', 'qr', 'create', 'editar', 'novo',
  'signup', 'register', 'auth', 'logout',
];

const ALIAS_REGEX = /^[a-z0-9_-]+$/;

/**
 * Normalize human-friendly input into a valid alias.
 * "Meu Portfólio" → "meu-portfolio"
 * - Lowercase
 * - Strip accents
 * - Replace spaces with hyphens
 * - Collapse repeated hyphens
 * - Trim leading/trailing hyphens
 */
export function normalizeAlias(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip accents
    .replace(/[^a-z0-9\s_-]/g, '') // Remove invalid chars (keep spaces for hyphen conversion)
    .replace(/\s+/g, '-') // Spaces → hyphens
    .replace(/-+/g, '-') // Collapse repeated hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

export function isValidAlias(input: string): boolean {
  const alias = normalizeAlias(input);
  if (alias.length < 3 || alias.length > 50) return false;
  if (!ALIAS_REGEX.test(alias)) return false;
  return true;
}

export function isReservedRoute(code: string): boolean {
  return RESERVED_ROUTES.includes(normalizeAlias(code));
}

const CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';

export function generateShortCode(min = 5, max = 8): string {
  const len = min + Math.floor(Math.random() * (max - min + 1));
  let result = '';
  for (let i = 0; i < len; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export function suggestAliasFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // Take the last meaningful segment. URL.pathname keeps accents percent-encoded
    // ("Promo%C3%A7%C3%A3o"), so decode before stripping them.
    let segment = segments[segments.length - 1];
    try {
      segment = decodeURIComponent(segment);
    } catch {
      // Malformed escape sequence: keep the raw segment.
    }
    const suggestion = segment
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/^-+|-+$/g, '');

    if (suggestion.length < 3 || suggestion.length > 50) return null;
    if (!ALIAS_REGEX.test(suggestion)) return null;

    return suggestion;
  } catch {
    return null;
  }
}

export { RESERVED_ROUTES };
