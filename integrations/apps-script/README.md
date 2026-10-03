# Aviso por e-mail (Google Apps Script)

Quando alguém envia um artigo ou um cadastro de palestrante, o Supabase chama este script e ele manda o e-mail.
Os dados já ficam salvos no banco; o e-mail é só o aviso. Se o e-mail falhar, nada se perde.

```
Formulário ─► Supabase (tabela) ─► Database Webhook ─► Apps Script ─► e-mail
                                    (token na URL)     (confere o token)
```

Custo: zero. O e-mail sai da conta Google que publica o script. Contas Gmail comuns têm um limite diário de envios
(na casa de uma centena por dia; confira a cota atual do Google), o que sobra para o piloto.

## Configuração (uma vez)

1. **Quem envia é a conta Google logada no editor.** Para os avisos saírem de `academydserec@gmail.com`, abra uma
   **janela anônima**, entre em <https://script.google.com> só com essa conta (confira o ícone no canto superior
   direito) e crie um **Novo projeto**. Faça todo o resto desta lista nessa mesma janela.
2. Cole o conteúdo de [`notificar-submissoes.gs`](notificar-submissoes.gs) no editor (apagando o que veio).
3. **Configurações do projeto (engrenagem) > Propriedades do script > Adicionar**:
   | Propriedade | Valor |
   |---|---|
   | `TOKEN` | um segredo longo e aleatório (ex.: saída de `openssl rand -hex 24`). Guarde, você vai usar no passo 6 |
   | `DESTINO` | `academydserec@gmail.com` (mais de um: separe por vírgula) |
4. No editor, escolha a função `testarEnvio` e clique em **Executar**. O Google pede autorização para enviar
   e-mail em seu nome; aceite (aparece "o Google não verificou este app", normal para um script seu: **Avançado >
   Acessar o projeto > Permitir**). Confira que o e-mail de teste chegou no `DESTINO` e que o rodapé dele mostra o
   remetente esperado.
5. **Implantar > Nova implantação > tipo "App da Web"**: executar como **Eu** (é isso que define o remetente), acesso
   **Qualquer pessoa**.
   Copie a URL que termina em `/exec`. (Qualquer pessoa pode chamar a URL, mas sem o `TOKEN` o script recusa.)
6. No Supabase: **Database > Webhooks > Create a new hook**
   - Name: `notificar_submissoes_artigos`, Table: `submissoes_artigos`, Events: **Insert**
   - Type: HTTP Request, Method: **POST**
   - URL: `<URL do passo 5>?token=<TOKEN do passo 3>`
   - Repita com Table `palestrantes` (nome `notificar_palestrantes`) se quiser aviso dos palestrantes.
7. Envie um artigo de teste pelo formulário e confira o e-mail.

## Remetente e destino são a mesma conta
Tudo fica centralizado em `academydserec@gmail.com`, desde os testes: é a conta que publica o script (remetente) e
também a que recebe os avisos (`DESTINO`). O e-mail enviado para si mesma cai normalmente na **Caixa de entrada**
(e também aparece em "Enviados"). Para incluir mais gente na equipe depois, basta acrescentar endereços em `DESTINO`,
separados por vírgula; não precisa reimplantar.

## O e-mail não chegou? Diagnóstico em 4 passos
A cadeia é: formulário → tabela no Supabase → webhook → Apps Script → Gmail. Siga a ordem e **pare no primeiro passo que falhar**.

1. **O formulário gravou?** Veja a linha em **Table Editor > `submissoes_artigos`** (ou `palestrantes`). Se não está lá, o
   problema é o envio do formulário, não o e-mail: confira o console do navegador (F12).
2. **O script está acessível?** Abra a URL `/exec` no navegador, sem token. Com a versão atual do script aparece
   "DSE Academy: aviso por e-mail no ar". Se pedir login do Google, a implantação está com acesso **"Somente eu"** (o
   padrão do Google): edite a implantação e escolha **"Qualquer pessoa"**.
3. **O script envia?** No editor, rode `testarEnvio`. Se o e-mail não chegar, veja **Execuções** (menu lateral): cada
   recusa e cada falha fica registrada ali (sem token e sem o conteúdo do formulário).
4. **O webhook chama o script?** No SQL Editor do Supabase:
   ```sql
   select created, status_code, content, error_msg
   from net._http_response order by created desc limit 5;
   ```

| Resposta (`content` / `status_code`) | Significa | O que fazer |
|---|---|---|
| `ok` | o script recebeu e mandou o e-mail | procure em Spam e em "Enviados" da conta que publicou |
| `nao autorizado` | `TOKEN` da URL diferente do das Propriedades do script | copie o mesmo valor nos dois lugares, sem espaços |
| `tabela desconhecida` | webhook em tabela diferente das duas aceitas | recrie o webhook em `submissoes_artigos` ou `palestrantes` |
| `sem destino` | falta a propriedade `DESTINO` | defina `DESTINO` nas Propriedades do script |
| `erro ao enviar` | o Google recusou o envio (cota diária ou autorização) | veja **Execuções**; rode `testarEnvio` para reautorizar |
| HTML de login do Google, 401 ou 403 | implantação com acesso "Somente eu" | reimplante com acesso **"Qualquer pessoa"** |
| 404 (página de erro do Google em HTML) | o Google **não encontrou o seu app**: a URL gravada no webhook ou no SQL é diferente da URL `/exec` que funciona (ID cortado, caractere a mais, espaço ou quebra de linha, URL de teste `/dev`) | confirme em **Execuções** do Apps Script: se **não há `doPost`** no horário do envio, o pedido não chegou ao script. Compare a URL gravada com a que abre no navegador mostrando "no ar" |
| nenhuma linha na consulta | o webhook não disparou | confira **Database > Webhooks**: tabela, evento **Insert**, método **POST** |

**A fonte da verdade é o log do Apps Script, junto com o `net._http_response`.** Abra **Execuções** (ícone de lista no menu
lateral): cada chamada do webhook que chega aparece como uma execução de `doPost`, e o log diz o que aconteceu:
"E-mail enviado" (deu certo), "Token ausente ou diferente do configurado" (o token do SQL não é igual ao da propriedade
`TOKEN`), "Propriedade DESTINO não definida" ou "Falha ao enviar o e-mail" (veja a mensagem). **Sem nenhuma execução de
`doPost` no horário do envio, o pedido não chegou ao script** (um 404 na `net._http_response` confirma: a URL gravada está
errada). Não confunda com `testarEnvio`: ele roda no editor, não pelo webhook, e o e-mail dele chega mesmo com o webhook quebrado.

Para testar o script sem o Supabase (troque a URL e o token pelos seus):
```bash
curl -L -H "Content-Type: application/json" -d '{"type":"INSERT","table":"submissoes_artigos","record":{"id":"teste","titulo":"Teste via curl","nome":"Teste"}}' "SUA_URL_EXEC?token=SEU_TOKEN"
```
Deve responder `ok` e o e-mail chega no `DESTINO`.

**Depois de colar uma versão nova do código** no editor, é preciso **Implantar > Gerenciar implantações > editar >
Nova versão**; senão a URL continua servindo o código antigo.

## Google Agenda: artigos fixos no dia e lembrete de segunda-feira

Além do e-mail, cada **artigo** novo vira um evento de **dia inteiro** no Google Agenda da conta que implantou o script
(academydserec@gmail.com):

- **Quando:** na **data desejada** para publicar; se a pessoa não informou, no dia do envio.
- **O que tem:** título (`Artigo: ...`), autor(a) com e-mail, link do rascunho, perfil no Medium e resumo.
- **Sem duplicar:** a descrição leva a marca `DSE-ARTIGO:<id>`; se o webhook repetir, o evento não é criado de novo.
- Cadastros de palestrante **não** vão para o Agenda.
- Se o Agenda falhar, o e-mail já saiu e o cadastro continua valendo (a falha fica no log).

**Lembrete semanal:** toda **segunda-feira, perto das 8h**, o script cria no Agenda da DSE o evento
**"Revisar os posts da semana no Medium"**, às **19h (7 da noite)**, e **convida gabrielamzuppardo@gmail.com** (chega convite por e-mail e
notificação no Agenda dela, com alerta 10 minutos antes). A descrição lista os artigos marcados para aquela semana.
Para convidar outra pessoa, crie a propriedade `LEMBRETE_PARA` (e-mails separados por vírgula).

### Ligar (uma vez)
1. Cole o código novo de [`notificar-submissoes.gs`](notificar-submissoes.gs) no editor do Apps Script e salve.
2. **Fuso horário:** *Configurações do projeto > Fuso horário* = `(GMT-03:00) Brasília`. Sem isso o "19h" e o dia do evento saem no fuso errado.
3. No editor, escolha a função **`instalarGatilhos`** e clique em **Executar**. O Google pede autorização nova (agora inclui o **Agenda**):
   *Revisar permissões > escolher a conta > Avançado > Acessar (não seguro) > Permitir*. Isso cria o gatilho de segunda-feira.
4. Escolha **`testarLembrete`** e execute: cria o lembrete desta semana, e o convite deve chegar em gabrielamzuppardo@gmail.com.
   Rodar de novo no mesmo dia não duplica.
5. **Implante uma nova versão** (a seção abaixo): a autorização do Agenda também vale para o webhook.
6. Envie um artigo de teste pelo site com uma data desejada e confira o evento no Agenda; depois apague o evento e a linha de teste.

## Mudou o código do script?
Depois de editar, é preciso **Implantar > Gerenciar implantações > editar > Nova versão**, senão a URL continua
servindo a versão antiga. A URL se mantém.

## Segurança
- O `TOKEN` só existe nas propriedades do script e na URL do webhook (no painel do Supabase). Não vai para o site.
- O e-mail é texto puro; o conteúdo dos formulários nunca é tratado como HTML.
- Se o token vazar, troque o valor em `TOKEN` e atualize a URL do webhook.

## Testes
```bash
node --test integrations/apps-script/notificar-submissoes.test.mjs
```
Rodam o script em Node com os serviços do Google simulados (token, tipos de evento, assunto, formatação, eventos do Agenda e lembrete semanal).
