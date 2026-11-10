// Teste de integração das regras de segurança (RLS) contra um Supabase real.
//
// Use com o Supabase local (npx supabase start), nunca com um banco de produção:
// o script cria dois usuários de teste e alguns registros.
//
//   npm run test:rls
//
// Lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do ambiente ou do arquivo .env.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function lerEnv() {
  const env = { ...process.env };
  if (existsSync('.env')) {
    for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = lerEnv();
const URL_SUPABASE = env.VITE_SUPABASE_URL;
const CHAVE_ANON = env.VITE_SUPABASE_ANON_KEY;
if (!URL_SUPABASE || !CHAVE_ANON) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou crie o .env).');
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL_SUPABASE)) {
  console.error(`Recusado: ${URL_SUPABASE} não é o Supabase local. Este teste cria dados.`);
  process.exit(1);
}

const novoCliente = () =>
  createClient(URL_SUPABASE, CHAVE_ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let falhas = 0;
function verificar(descricao, condicao, detalhe = '') {
  console.log(`${condicao ? '✓' : '✗'} ${descricao}${!condicao && detalhe ? `  (${detalhe})` : ''}`);
  if (!condicao) falhas++;
}

const sufixo = randomBytes(4).toString('hex');

async function novoUsuario(nome) {
  const cliente = novoCliente();
  const { data, error } = await cliente.auth.signUp({
    email: `${nome}-${sufixo}@linkforge.test`,
    password: randomBytes(12).toString('base64url'),
  });
  if (error || !data.session) throw new Error(`cadastro de ${nome} falhou: ${error?.message ?? 'sem sessão'}`);
  return { cliente, id: data.user.id };
}

const ana = await novoUsuario('ana');
const bruno = await novoUsuario('bruno');
const visitante = novoCliente();

// --- Links -----------------------------------------------------------------
const codigo = `rls-${sufixo}`;
// Sem owner_id, como o front-end faz: o banco preenche com o usuário logado.
const { data: link, error: erroCriar } = await ana.cliente
  .from('links')
  .insert({ original_url: 'https://example.com/destino', short_code: codigo })
  .select()
  .single();
verificar('Ana cria um link e o banco registra ela como dona', !erroCriar && link?.owner_id === ana.id, erroCriar?.message);
if (!link) {
  console.error('\nSem o link da Ana não dá para testar o resto.');
  process.exit(1);
}

const { data: vistosPorBruno } = await bruno.cliente.from('links').select('id').eq('id', link.id);
verificar('Bruno não enxerga o link da Ana', vistosPorBruno?.length === 0);

const { data: alteradosPorBruno } = await bruno.cliente
  .from('links')
  .update({ original_url: 'https://golpe.example.com' })
  .eq('id', link.id)
  .select();
verificar('Bruno não consegue alterar o link da Ana', alteradosPorBruno?.length === 0);

const { data: apagadosPorBruno } = await bruno.cliente.from('links').delete().eq('id', link.id).select();
verificar('Bruno não consegue apagar o link da Ana', apagadosPorBruno?.length === 0);

const { error: erroDonoFalso } = await bruno.cliente
  .from('links')
  .insert({ original_url: 'https://example.com', short_code: `falso-${sufixo}`, owner_id: ana.id });
verificar('Bruno não cria link em nome da Ana', Boolean(erroDonoFalso));

const { data: vistosPorVisitante } = await visitante.from('links').select('id');
verificar('Visitante sem login não lista nenhum link', vistosPorVisitante?.length === 0);

const { error: erroInsertVisitante } = await visitante
  .from('links')
  .insert({ original_url: 'https://example.com', short_code: `anon-${sufixo}` });
verificar('Visitante sem login não cria link direto na tabela', Boolean(erroInsertVisitante));

// --- Redirecionamento público e cliques -------------------------------------
const { data: resolvido } = await visitante.rpc('resolve_short_link', { p_short_code: codigo });
verificar(
  'Visitante resolve o link curto pela função pública',
  resolvido?.status === 'found' && resolvido?.original_url === 'https://example.com/destino',
);

const { error: erroCliqueFalso } = await visitante.from('click_events').insert({ link_id: link.id });
verificar('Visitante não grava clique falso direto na tabela', Boolean(erroCliqueFalso));

const { data: linkDepois } = await ana.cliente.from('links').select('click_count').eq('id', link.id).single();
const { data: cliquesAna } = await ana.cliente.from('click_events').select('id').eq('link_id', link.id);
verificar('O clique foi contado uma vez para a Ana', linkDepois?.click_count === 1 && cliquesAna?.length === 1);

const { data: cliquesBruno } = await bruno.cliente.from('click_events').select('id').eq('link_id', link.id);
verificar('Bruno não vê o histórico de cliques da Ana', cliquesBruno?.length === 0);

await ana.cliente.from('links').update({ is_active: false }).eq('id', link.id);
const { data: inativo } = await visitante.rpc('resolve_short_link', { p_short_code: codigo });
verificar('Link desativado não redireciona', inativo?.status === 'inactive');

// --- Páginas públicas -------------------------------------------------------
const slug = `pagina-${sufixo}`;
const { data: pagina, error: erroPagina } = await ana.cliente
  .from('link_pages')
  .insert({ slug, title: 'Página da Ana' })
  .select()
  .single();
verificar('Ana cria uma página e o banco registra ela como dona', !erroPagina && pagina?.owner_id === ana.id, erroPagina?.message);
if (!pagina) {
  console.error('\nSem a página da Ana não dá para testar o resto.');
  process.exit(1);
}

const { error: erroItemAlheio } = await bruno.cliente
  .from('page_links')
  .insert({ page_id: pagina.id, label: 'Intruso', url: 'https://golpe.example.com' });
verificar('Bruno não adiciona link na página da Ana', Boolean(erroItemAlheio));

await ana.cliente.from('page_links').insert({ page_id: pagina.id, label: 'GitHub', url: 'https://github.com' });
const { data: publica } = await visitante.rpc('resolve_public_page', { p_slug: slug });
verificar(
  'Visitante abre a página pública sem ver o dono',
  publica?.status === 'found' && publica.links?.length === 1 && !('owner_id' in (publica.page ?? {})),
);

const { data: rotaLivre } = await visitante.rpc('check_code_available', { p_code: 'links' });
verificar('Rotas do app não podem virar alias', rotaLivre === false);

console.log(falhas === 0 ? '\nTodas as regras de segurança passaram.' : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
