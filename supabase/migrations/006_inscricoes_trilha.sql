-- Inscrição das pessoas nas trilhas de estudo e o progresso em cada uma.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
-- Depende da 004_palestrantes.sql (função tocar_atualizado_em).
--
-- O conteúdo das trilhas NÃO fica no banco: é um JSON gerado pelo pipeline (trilhas/gerar.py) e publicado
-- com o site. Aqui só ficam duas coisas por pessoa: em quais trilhas ela se inscreveu e quais skills marcou
-- como concluídas. Cada pessoa lê e altera apenas as próprias linhas (RLS).

create table if not exists public.inscricoes_trilha (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trilha_id     text not null check (char_length(trilha_id) <= 60),
  concluidas    text[] not null default '{}' check (cardinality(concluidas) <= 100 and char_length(array_to_string(concluidas, ',')) <= 3000),  -- ids de skills
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, trilha_id)
);

alter table public.inscricoes_trilha enable row level security;

drop policy if exists "trilha: dono lê" on public.inscricoes_trilha;
drop policy if exists "trilha: dono cria" on public.inscricoes_trilha;
drop policy if exists "trilha: dono altera" on public.inscricoes_trilha;
drop policy if exists "trilha: dono remove" on public.inscricoes_trilha;
create policy "trilha: dono lê"     on public.inscricoes_trilha for select using (auth.uid() = user_id);
create policy "trilha: dono cria"   on public.inscricoes_trilha for insert with check (auth.uid() = user_id);
create policy "trilha: dono altera" on public.inscricoes_trilha for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trilha: dono remove" on public.inscricoes_trilha for delete using (auth.uid() = user_id);

drop trigger if exists inscricoes_trilha_atualizado_em on public.inscricoes_trilha;
create trigger inscricoes_trilha_atualizado_em before update on public.inscricoes_trilha
  for each row execute function public.tocar_atualizado_em();

-- Limite por pessoa, para ninguém usar a tabela como armazenamento genérico.
create or replace function public.limitar_inscricoes_trilha() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.inscricoes_trilha where user_id = new.user_id) >= 20 then
    raise exception 'limite de 20 trilhas atingido';
  end if;
  return new;
end $$;

drop trigger if exists limitar_inscricoes_trilha on public.inscricoes_trilha;
create trigger limitar_inscricoes_trilha before insert on public.inscricoes_trilha
  for each row execute function public.limitar_inscricoes_trilha();
