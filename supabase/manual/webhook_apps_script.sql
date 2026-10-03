-- Liga o Supabase ao Apps Script: a cada novo artigo ou cadastro de palestrante, avisa o script, que manda o e-mail.
--
-- Alternativa ao "Database > Webhooks" do painel (a mesma coisa feita por SQL). Use UM dos dois caminhos, não os dois,
-- senão o aviso chega em duplicidade.
--
-- NÃO é uma migration: contém a URL do seu script e o token, que são segredos. Por isso fica nesta pasta "manual" e
-- você cola o conteúdo no SQL Editor trocando as DUAS partes marcadas com COLE_AQUI. Nunca salve o arquivo com os
-- valores preenchidos, nem os envie para o GitHub.
--
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole > troque o valor de `url` > Run.
-- Depende de 004_palestrantes.sql e 005_submissoes_artigos.sql (as tabelas).

-- pg_net faz a chamada HTTP de forma assíncrona (não trava o envio do formulário).
create extension if not exists pg_net;

create or replace function public.notificar_apps_script() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  -- COLE_AQUI entre as aspas: a URL /exec do app da Web + ?token= + o TOKEN. Exemplo do formato:
  --   https://script.google.com/macros/s/XXXX/exec?token=SEU_TOKEN
  url text := 'COLE_AQUI_A_URL_EXEC_E_O_TOKEN';
begin
  perform net.http_post(
    url := url,
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'schema', tg_table_schema, 'record', to_jsonb(new)),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    -- O Apps Script pode levar vários segundos para responder (principalmente na primeira chamada depois de um tempo
    -- parado). Com o tempo-limite padrão curto, a chamada pode ser cortada antes de o script terminar de enviar o e-mail.
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  -- O aviso é um extra: se algo falhar aqui (extensão ausente, URL inválida), o cadastro da pessoa continua valendo.
  return new;
end $$;

drop trigger if exists notificar_submissoes_artigos on public.submissoes_artigos;
create trigger notificar_submissoes_artigos
  after insert on public.submissoes_artigos
  for each row execute function public.notificar_apps_script();

-- Remova as 4 linhas abaixo se NÃO quiser aviso dos cadastros de palestrantes.
drop trigger if exists notificar_palestrantes on public.palestrantes;
create trigger notificar_palestrantes
  after insert on public.palestrantes
  for each row execute function public.notificar_apps_script();

-- Para conferir depois de um envio:
--   select created, status_code, content, error_msg from net._http_response order by created desc limit 5;
-- Um 404 aqui significa que o Google NÃO encontrou o seu app: a URL gravada na função está diferente da URL /exec que
-- funciona. Confirme em "Execuções" no Apps Script: sem nenhuma linha de doPost no horário do envio, o pedido não chegou.
-- Para ver a URL gravada SEM mostrar o token (o resultado pode ser colado em conversas):
--   select regexp_replace(
--     substring(pg_get_functiondef('public.notificar_apps_script'::regproc) from 'url text := ''([^'']*)'''),
--     '(token=).*$', '\1<oculto>') as url_sem_o_token,
--     length(substring(pg_get_functiondef('public.notificar_apps_script'::regproc) from 'token=([^'']*)''')) as tamanho_do_token;
--
-- Para desligar:
--   drop trigger if exists notificar_submissoes_artigos on public.submissoes_artigos;
--   drop trigger if exists notificar_palestrantes on public.palestrantes;
