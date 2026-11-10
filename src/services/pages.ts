import { supabase } from './supabase';
import type { LinkPage, PageLink, LinkPageWithLinks } from '@/types';
import { normalizeAlias, isValidAlias, isReservedRoute } from '@/utils/alias';
import { normalizeAvatarUrl } from '@/utils/pageLinkUrl';

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_code_available', { p_code: slug });
  if (error) return false;
  return data === true;
}

export async function getAllPages(): Promise<{ pages: LinkPage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('link_pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { pages: [], error: 'Não foi possível carregar suas páginas.' };
  return { pages: (data as LinkPage[]) || [], error: null };
}

export async function getPageById(id: string): Promise<{ page: LinkPageWithLinks | null; error: string | null }> {
  const { data: pageData, error: pageError } = await supabase
    .from('link_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (pageError || !pageData) return { page: null, error: 'Não foi possível carregar a página.' };

  const { data: linksData } = await supabase
    .from('page_links')
    .select('*')
    .eq('page_id', id)
    .order('position', { ascending: true });

  return {
    page: {
      ...pageData,
      page_links: (linksData as PageLink[]) || [],
    } as LinkPageWithLinks,
    error: null,
  };
}

export async function resolvePublicPage(slug: string): Promise<{ page: LinkPageWithLinks | null; error: string | null }> {
  const { data, error } = await supabase.rpc('resolve_public_page', { p_slug: slug });
  if (error || !data) return { page: null, error: 'Página não encontrada.' };

  const result = data as { status: string; page?: Record<string, unknown>; links?: Record<string, unknown>[] };
  if (result.status !== 'found' || !result.page) return { page: null, error: 'Página não encontrada.' };

  const p = result.page;
  const pageId = p.id as string;
  const page: LinkPageWithLinks = {
    id: pageId,
    slug: p.slug as string,
    title: p.title as string,
    description: (p.description as string) || null,
    avatar_url: (p.avatar_url as string) || null,
    created_at: '',
    is_active: true,
    owner_id: null,
    page_links: (result.links || []).map((l) => ({
      id: l.id as string,
      page_id: pageId,
      label: l.label as string,
      url: l.url as string,
      position: l.position as number,
      is_active: true,
    })),
  };

  return { page, error: null };
}

export async function createPage(params: {
  slug: string;
  title: string;
  description?: string;
  avatarUrl?: string;
}): Promise<{ page: LinkPage | null; error: string | null }> {
  const slug = normalizeAlias(params.slug);
  if (!isValidAlias(slug)) {
    return { page: null, error: 'O slug deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
  }
  if (isReservedRoute(slug)) {
    return { page: null, error: 'Este slug é uma rota reservada e não pode ser usado.' };
  }
  const available = await checkSlugAvailable(slug);
  if (!available) {
    return { page: null, error: 'Este slug já está em uso.' };
  }

  let avatarUrl: string | null = null;
  if (params.avatarUrl) {
    avatarUrl = normalizeAvatarUrl(params.avatarUrl);
    if (!avatarUrl) {
      return { page: null, error: 'URL do avatar inválida. Use apenas http:// ou https://.' };
    }
  }

  const { data, error } = await supabase
    .from('link_pages')
    .insert({
      slug,
      title: params.title,
      description: params.description || null,
      avatar_url: avatarUrl,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { page: null, error: 'Erro ao criar página.' };
  }

  return { page: data as LinkPage, error: null };
}

export async function updatePage(id: string, params: {
  title?: string;
  description?: string;
  avatarUrl?: string;
  slug?: string;
}): Promise<{ page: LinkPage | null; error: string | null }> {
  const updates: Record<string, unknown> = {};

  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description || null;

  if (params.avatarUrl !== undefined) {
    if (params.avatarUrl) {
      const normalized = normalizeAvatarUrl(params.avatarUrl);
      if (!normalized) {
        return { page: null, error: 'URL do avatar inválida. Use apenas http:// ou https://.' };
      }
      updates.avatar_url = normalized;
    } else {
      updates.avatar_url = null;
    }
  }

  if (params.slug !== undefined) {
    const slug = normalizeAlias(params.slug);
    if (!isValidAlias(slug)) {
      return { page: null, error: 'O slug deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
    }
    if (isReservedRoute(slug)) {
      return { page: null, error: 'Este slug é uma rota reservada e não pode ser usado.' };
    }
    const available = await checkSlugAvailable(slug);
    if (!available) {
      const { page: current } = await getPageById(id);
      if (current && current.slug !== slug) {
        return { page: null, error: 'Este slug já está em uso.' };
      }
    }
    updates.slug = slug;
  }

  const { data, error } = await supabase
    .from('link_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { page: null, error: 'Erro ao atualizar página.' };
  }

  return { page: data as LinkPage, error: null };
}

export async function deletePage(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('link_pages')
    .delete()
    .eq('id', id);
  return !error;
}

export async function togglePageActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('link_pages')
    .update({ is_active: active })
    .eq('id', id);
  return !error;
}

export async function addPageLink(pageId: string, label: string, url: string): Promise<{ link: PageLink | null; error: string | null }> {
  const { normalizePageLinkUrl } = await import('@/utils/pageLinkUrl');
  const normalizedUrl = normalizePageLinkUrl(url);
  if (!normalizedUrl) {
    return { link: null, error: 'URL inválida. Use http://, https://, mailto: ou tel:.' };
  }

  const { data: existing } = await supabase
    .from('page_links')
    .select('position')
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = existing && existing.length > 0 ? (existing[0] as PageLink).position + 1 : 0;

  const { data, error } = await supabase
    .from('page_links')
    .insert({
      page_id: pageId,
      label,
      url: normalizedUrl,
      position: nextPos,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { link: null, error: 'Erro ao adicionar link.' };
  return { link: data as PageLink, error: null };
}

export async function updatePageLink(id: string, updates: { label?: string; url?: string; is_active?: boolean }): Promise<{ error: string | null }> {
  const finalUpdates: Record<string, unknown> = {};

  if (updates.label !== undefined) finalUpdates.label = updates.label;
  if (updates.is_active !== undefined) finalUpdates.is_active = updates.is_active;

  if (updates.url !== undefined) {
    const { normalizePageLinkUrl } = await import('@/utils/pageLinkUrl');
    const normalizedUrl = normalizePageLinkUrl(updates.url);
    if (!normalizedUrl) {
      return { error: 'URL inválida. Use http://, https://, mailto: ou tel:.' };
    }
    finalUpdates.url = normalizedUrl;
  }

  const { error } = await supabase
    .from('page_links')
    .update(finalUpdates)
    .eq('id', id);
  return { error: error ? 'Erro ao atualizar link.' : null };
}

export async function deletePageLink(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('page_links')
    .delete()
    .eq('id', id);
  return !error;
}

export async function reorderPageLinks(pageId: string, orderedIds: string[]): Promise<boolean> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('page_links').update({ position: index }).eq('id', id)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}
