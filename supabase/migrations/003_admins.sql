-- Perfil de administração do portal.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
--
-- O papel NÃO fica em `perfis`: a política de perfis deixa a pessoa alterar a própria linha,
-- e ela poderia se promover a admin. A tabela `admins` não tem política de escrita para
-- anon/authenticated; só quem tem acesso ao painel do Supabase (service role) insere linhas.
--
-- Para tornar alguém admin (depois que a pessoa entrou no portal pelo menos uma vez):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com';

create table if not exists public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Sem políticas: o site não lê nem altera a tabela diretamente. Use public.is_admin().

-- Usada pelas políticas RLS das outras tabelas e pelo front/API (rpc) para saber se a pessoa é admin.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin lê os relatos de erro das vagas (hoje só dá para ler pelo painel do Supabase)
-- ---------------------------------------------------------------------------
drop policy if exists "reportes: admin lê" on public.reportes_vaga;
create policy "reportes: admin lê" on public.reportes_vaga
  for select to authenticated
  using (public.is_admin());
