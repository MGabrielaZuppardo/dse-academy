-- Artigos enviados para publicação no Medium da DSE.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
-- Depende da 003_admins.sql (is_admin) e da 004_palestrantes.sql (tocar_atualizado_em).
--
-- Mesma ideia dos palestrantes: qualquer pessoa ENVIA (logada ou não), sempre como "recebido";
-- só admin lê tudo e muda o status. Não há vitrine pública: os artigos saem pelo Medium.
--
-- AVISO POR E-MAIL (a configuração fica no painel, não aqui, porque a URL leva um segredo):
--   Dashboard > Database > Webhooks > Create a new hook
--     Name: notificar_submissoes_artigos   Table: public.submissoes_artigos   Events: Insert
--     Type: HTTP Request   Method: POST
--     URL: a URL do Apps Script terminada em  ?token=<o mesmo valor de TOKEN do script>
--   Repita para public.palestrantes se quiser aviso dos cadastros de palestrantes.
--   Passo a passo completo em integrations/apps-script/README.md.

create table if not exists public.submissoes_artigos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (char_length(nome) between 2 and 120),
  email          text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  perfil_medium  text check (char_length(perfil_medium) <= 300 and perfil_medium ~ '^https://'),
  linkedin       text check (char_length(linkedin) <= 300 and linkedin ~ '^https://'),
  bio            text not null check (char_length(bio) between 20 and 500),
  titulo         text not null check (char_length(titulo) between 5 and 150),
  subtitulo      text check (char_length(subtitulo) <= 200),
  resumo         text not null check (char_length(resumo) between 20 and 300),
  tags           text[] not null check (cardinality(tags) between 1 and 5 and char_length(array_to_string(tags, ',')) <= 300),  -- o Medium aceita até 5 tags
  idioma         text not null default 'pt' check (idioma in ('pt', 'en', 'es')),
  link_rascunho  text not null check (char_length(link_rascunho) <= 500 and link_rascunho ~ '^https://'),  -- Google Docs ou rascunho do Medium
  publicado_antes text check (char_length(publicado_antes) <= 300 and publicado_antes ~ '^https://'),      -- se já saiu em outro lugar
  data_desejada  date,
  aceite_lgpd    boolean not null check (aceite_lgpd),
  aceite_direitos boolean not null check (aceite_direitos),  -- é autor(a) e autoriza a publicação no Medium da DSE
  status         text not null default 'recebido' check (status in ('recebido', 'em_revisao', 'aprovado', 'publicado', 'recusado')),
  user_id        uuid references auth.users (id) on delete set null default auth.uid(),  -- null quando anônimo
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists submissoes_artigos_status_criado on public.submissoes_artigos (status, criado_em desc);

alter table public.submissoes_artigos enable row level security;

drop policy if exists "artigos: qualquer pessoa envia" on public.submissoes_artigos;
create policy "artigos: qualquer pessoa envia" on public.submissoes_artigos
  for insert to anon, authenticated
  with check (status = 'recebido' and user_id is not distinct from auth.uid());

drop policy if exists "artigos: admin lê" on public.submissoes_artigos;
drop policy if exists "artigos: admin altera" on public.submissoes_artigos;
drop policy if exists "artigos: admin remove" on public.submissoes_artigos;
drop policy if exists "artigos: dono lê" on public.submissoes_artigos;
create policy "artigos: admin lê"     on public.submissoes_artigos for select to authenticated using (public.is_admin());
create policy "artigos: admin altera" on public.submissoes_artigos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "artigos: admin remove" on public.submissoes_artigos for delete to authenticated using (public.is_admin());
create policy "artigos: dono lê"      on public.submissoes_artigos for select to authenticated using (user_id = auth.uid());

drop trigger if exists submissoes_artigos_atualizado_em on public.submissoes_artigos;
create trigger submissoes_artigos_atualizado_em before update on public.submissoes_artigos
  for each row execute function public.tocar_atualizado_em();
