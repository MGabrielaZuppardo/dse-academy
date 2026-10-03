-- Histórico dos números do painel de administração (/admin): evolução dia a dia.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende da 007_admin_resumo.sql.)
--
-- Não precisa de tabela nova nem de agendamento: todas as tabelas já guardam a data de criação de cada linha, então a
-- série é calculada na hora a partir delas. Quando alguém é removido (ex.: exclui a conta), o passado "encolhe" junto,
-- porque a linha deixa de existir; para o acompanhamento do piloto isso é aceitável.
--
-- Devolve só contagens por dia, nunca dados pessoais, e recusa quem não é admin.

create or replace function public.admin_historico(dias integer default 90) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  janela integer := least(greatest(coalesce(dias, 90), 7), 365);
  inicio date := current_date - (least(greatest(coalesce(dias, 90), 7), 365) - 1);
  resultado jsonb;
begin
  if not public.is_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'inicio', inicio,
    -- Quanto já existia antes do primeiro dia da janela (ponto de partida do acumulado).
    'base', jsonb_build_object(
      'usuarios',     (select count(*) from auth.users where created_at::date < inicio),
      'vagas_salvas', (select count(*) from public.vagas_salvas where salva_em::date < inicio),
      'inscricoes',   (select count(*) from public.inscricoes_trilha where criado_em::date < inicio),
      'artigos',      (select count(*) from public.submissoes_artigos where criado_em::date < inicio),
      'palestrantes', (select count(*) from public.palestrantes where criado_em::date < inicio),
      'reportes',     (select count(*) from public.reportes_vaga where criado_em::date < inicio)
    ),
    -- Novos por dia, com zero nos dias sem movimento.
    'dias', (
      select jsonb_agg(jsonb_build_object(
        'dia', d::date,
        'usuarios',     coalesce(u.n, 0),
        'vagas_salvas', coalesce(vs.n, 0),
        'inscricoes',   coalesce(i.n, 0),
        'artigos',      coalesce(a.n, 0),
        'palestrantes', coalesce(p.n, 0),
        'reportes',     coalesce(r.n, 0)
      ) order by d)
      from generate_series(inicio, current_date, interval '1 day') d
      left join (select created_at::date as dia, count(*) as n from auth.users group by 1) u on u.dia = d::date
      left join (select salva_em::date as dia, count(*) as n from public.vagas_salvas group by 1) vs on vs.dia = d::date
      left join (select criado_em::date as dia, count(*) as n from public.inscricoes_trilha group by 1) i on i.dia = d::date
      left join (select criado_em::date as dia, count(*) as n from public.submissoes_artigos group by 1) a on a.dia = d::date
      left join (select criado_em::date as dia, count(*) as n from public.palestrantes group by 1) p on p.dia = d::date
      left join (select criado_em::date as dia, count(*) as n from public.reportes_vaga group by 1) r on r.dia = d::date
    )
  ) into resultado;

  return resultado;
end $$;

revoke all on function public.admin_historico(integer) from public, anon;
grant execute on function public.admin_historico(integer) to authenticated;
