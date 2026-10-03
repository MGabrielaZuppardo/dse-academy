-- Valida as tabelas do site no Supabase (somente leitura, não altera nada).
-- Dashboard > SQL Editor > cole este arquivo > Run. Cada bloco devolve uma tabela de resultado:
-- rode um de cada vez (o editor mostra só o resultado do último comando).

-- 1) Quais tabelas existem e se a RLS está ligada (esperado: as 8 abaixo, todas com rls_ligada = true).
select c.relname as tabela, c.relrowsecurity as rls_ligada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('perfis','vagas_salvas','reportes_vaga','admins','palestrantes','submissoes_artigos','inscricoes_trilha')
order by 1;

-- 2) Políticas por tabela. Esperado em inscricoes_trilha: 4 ("dono lê/cria/altera/remove").
--    Tabela com RLS ligada e ZERO políticas bloqueia tudo (erro 42501).
select tablename as tabela, policyname as politica, cmd as comando, roles, qual as using_, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3) Tabelas esperadas que NÃO têm nenhuma política (deveria vir vazio).
select c.relname as tabela_sem_politica
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);

-- 4) Permissões (grants) para os papéis do site. 'authenticated' precisa de insert/select/update/delete
--    em inscricoes_trilha; 'anon' só deve inserir nos formulários públicos.
select table_name as tabela, grantee as papel, string_agg(privilege_type, ', ' order by privilege_type) as permissoes
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
  and table_name in ('perfis','vagas_salvas','reportes_vaga','admins','palestrantes','submissoes_artigos','inscricoes_trilha')
group by 1, 2 order by 1, 2;

-- 5) A coluna user_id de inscricoes_trilha precisa ter default auth.uid() (esperado: auth.uid()).
select column_name, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'inscricoes_trilha' and column_name = 'user_id';
