-- Banco de palestrantes: quem se cadastra no formulário público e quem a DSE aprova.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende da 003_admins.sql.)
--
-- Privacidade:
--   * qualquer pessoa pode ENVIAR um cadastro (logada ou não), sempre como "pendente";
--   * o site público só enxerga a view `palestrantes_publicos`: apenas cadastros aprovados
--     E com autorização de publicação, e SEM e-mail. O contato passa pela organização;
--   * só admin lê a tabela completa e muda o status.

create table if not exists public.palestrantes (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (char_length(nome) between 2 and 120),
  email            text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cargo            text check (char_length(cargo) <= 120),
  empresa          text check (char_length(empresa) <= 120),
  bio              text not null check (char_length(bio) between 20 and 800),
  linkedin         text check (char_length(linkedin) <= 300 and linkedin ~ '^https://'),
  site             text check (char_length(site) <= 300 and site ~ '^https://'),
  temas            text[] not null check (cardinality(temas) between 1 and 10 and char_length(array_to_string(temas, ',')) <= 600),
  formatos         text[] not null check (cardinality(formatos) >= 1 and formatos <@ array['palestra', 'workshop', 'painel', 'mentoria']),
  modalidade       text not null check (modalidade in ('remoto', 'presencial', 'ambos')),
  cidade           text check (char_length(cidade) <= 80),
  uf               text check (uf ~ '^[A-Z]{2}$'),
  idiomas          text[] not null default '{pt}' check (cardinality(idiomas) between 1 and 5 and idiomas <@ array['pt', 'en', 'es']),
  links_anteriores text[] not null default '{}' check (cardinality(links_anteriores) <= 5 and char_length(array_to_string(links_anteriores, ',')) <= 1500),
  aceite_lgpd      boolean not null check (aceite_lgpd),                -- obrigatório
  aceite_publicacao boolean not null default false,                      -- autoriza aparecer na página pública
  status           text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  user_id          uuid references auth.users (id) on delete set null default auth.uid(),  -- null quando anônimo
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists palestrantes_status_criado on public.palestrantes (status, criado_em desc);
create index if not exists palestrantes_temas on public.palestrantes using gin (temas);

alter table public.palestrantes enable row level security;

-- Envio: logada ou não, sempre como pendente e sem atribuir o cadastro a outra pessoa.
drop policy if exists "palestrantes: qualquer pessoa envia" on public.palestrantes;
create policy "palestrantes: qualquer pessoa envia" on public.palestrantes
  for insert to anon, authenticated
  with check (status = 'pendente' and user_id is not distinct from auth.uid());

-- Admin lê, aprova/recusa e remove.
drop policy if exists "palestrantes: admin lê" on public.palestrantes;
drop policy if exists "palestrantes: admin altera" on public.palestrantes;
drop policy if exists "palestrantes: admin remove" on public.palestrantes;
create policy "palestrantes: admin lê"     on public.palestrantes for select to authenticated using (public.is_admin());
create policy "palestrantes: admin altera" on public.palestrantes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "palestrantes: admin remove" on public.palestrantes for delete to authenticated using (public.is_admin());

-- A pessoa logada que enviou o cadastro pode ver o próprio (status incluído).
drop policy if exists "palestrantes: dono lê" on public.palestrantes;
create policy "palestrantes: dono lê" on public.palestrantes
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists palestrantes_atualizado_em on public.palestrantes;
create trigger palestrantes_atualizado_em before update on public.palestrantes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Vitrine pública: sem e-mail, só aprovados que autorizaram a publicação.
-- A view roda com os direitos do dono (security_invoker = false) de propósito: é ela que
-- expõe um subconjunto seguro das colunas, enquanto a tabela segue fechada.
-- ---------------------------------------------------------------------------
create or replace view public.palestrantes_publicos
with (security_invoker = false) as
  select id, nome, cargo, empresa, bio, linkedin, site, temas, formatos, modalidade, cidade, uf, idiomas
  from public.palestrantes
  where status = 'aprovado' and aceite_publicacao;

revoke all on public.palestrantes_publicos from public;
grant select on public.palestrantes_publicos to anon, authenticated;
