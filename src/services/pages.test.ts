import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('./supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

const { resolvePublicPage } = await import('./pages');

beforeEach(() => rpc.mockReset());

describe('resolvePublicPage', () => {
  it('monta a página pública com os links, ligando cada um à página', async () => {
    rpc.mockResolvedValue({
      data: {
        status: 'found',
        page: { id: 'p1', slug: 'diogo', title: 'Diogo', description: null, avatar_url: null },
        links: [
          { id: 'l1', label: 'GitHub', url: 'https://github.com', position: 0 },
          { id: 'l2', label: 'Blog', url: 'https://example.com', position: 1 },
        ],
      },
      error: null,
    });

    const { page, error } = await resolvePublicPage('diogo');

    expect(rpc).toHaveBeenCalledWith('resolve_public_page', { p_slug: 'diogo' });
    expect(error).toBeNull();
    expect(page?.title).toBe('Diogo');
    expect(page?.owner_id).toBeNull();
    expect(page?.page_links.map((l) => [l.label, l.page_id])).toEqual([
      ['GitHub', 'p1'],
      ['Blog', 'p1'],
    ]);
  });

  it('página inexistente vira "não encontrada"', async () => {
    rpc.mockResolvedValue({ data: { status: 'not_found' }, error: null });
    const { page, error } = await resolvePublicPage('nada');
    expect(page).toBeNull();
    expect(error).toBe('Página não encontrada.');
  });

  it('erro do banco também vira "não encontrada", sem expor detalhes', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { page, error } = await resolvePublicPage('diogo');
    expect(page).toBeNull();
    expect(error).toBe('Página não encontrada.');
  });
});
