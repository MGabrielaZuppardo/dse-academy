-- Números do painel de administração (/admin): só totais e contagens, nunca dados pessoais.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende da 001 a 006.)
--
-- Por que uma função e não políticas de leitura nas tabelas: o painel precisa contar pessoas, perfis, vagas salvas
-- e inscrições em trilhas, e as políticas dessas tabelas deixam cada pessoa ler só o que é dela. Em vez de abrir a leitura
-- das linhas para o admin, esta função devolve apenas agregados e recusa quem não é admin.
--
-- Para tornar alguém admin (depois que a pessoa entrou no site pelo menos uma vez):
--   insert into public.admins (user_id) select id from auth.users where email = 'pessoa@exemplo.com';

create or replace function public.admin_resumo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  resultado jsonb;
begin
  if not public.is_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'gerado_em', now(),

    'usuarios', jsonb_build_object(
      'total',          (select count(*) from auth.users),
      'novos_7d',       (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'novos_30d',      (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'com_perfil',     (select count(*) from public.perfis where cardinality(habilidades) > 0 or area is not null)
    ),

    -- Cadastros por dia nos últimos 30 dias (dias sem cadastro entram com zero).
    'cadastros_por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') d
      left join (select created_at::date as dia, count(*) as n from auth.users group by 1) c on c.dia = d::date
    ),

    'areas', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', area, 'n', n) order by n desc), '[]'::jsonb)
      from (select area, count(*) as n from public.perfis where area is not null group by area) t
    ),
    'senioridades', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', senioridade, 'n', n) order by n desc), '[]'::jsonb)
      from (select senioridade, count(*) as n from public.perfis where senioridade is not null group by senioridade) t
    ),

    'vagas_salvas', jsonb_build_object(
      'total',   (select count(*) from public.vagas_salvas),
      'pessoas', (select count(distinct user_id) from public.vagas_salvas)
    ),

    'trilhas', (
      select coalesce(jsonb_agg(jsonb_build_object('trilha_id', trilha_id, 'inscritos', inscritos, 'skills_concluidas', concluidas) order by inscritos desc), '[]'::jsonb)
      from (
        select trilha_id, count(*) as inscritos, coalesce(sum(cardinality(concluidas)), 0) as concluidas
        from public.inscricoes_trilha group by trilha_id
      ) t
    ),

    'artigos', jsonb_build_object(
      'total',      (select count(*) from public.submissoes_artigos),
      'por_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) as n from public.submissoes_artigos group by status) t)
    ),
    'palestrantes', jsonb_build_object(
      'total',      (select count(*) from public.palestrantes),
      'por_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) as n from public.palestrantes group by status) t)
    ),

    'reportes', jsonb_build_object(
      'total',    (select count(*) from public.reportes_vaga),
      'por_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (select tipo, count(*) as n from public.reportes_vaga group by tipo) t),
      'vagas_mais_reportadas', (
        select coalesce(jsonb_agg(jsonb_build_object('vaga_id', vaga_id, 'titulo', titulo, 'empresa', empresa, 'n', n) order by n desc), '[]'::jsonb)
        from (
          select vaga_id, max(titulo) as titulo, max(empresa) as empresa, count(*) as n
          from public.reportes_vaga group by vaga_id order by count(*) desc limit 5
        ) t
      )
    )
  ) into resultado;

  return resultado;
end $$;

revoke all on function public.admin_resumo() from public, anon;
grant execute on function public.admin_resumo() to authenticated;
