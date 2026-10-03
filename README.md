# Portal de Vagas em Dados · DSE Academy

Portal aberto e gratuito que reúne vagas de **engenharia, análise, ciência de dados, BI e ML no Brasil**,
identifica automaticamente a senioridade e as tecnologias pedidas em cada vaga e ajuda quem está buscando
emprego a entender **o que o mercado pede e o que falta no próprio perfil**.

Um projeto da comunidade DSE Academy, feito pela comunidade de dados para a comunidade de dados.

> **Dois sites convivem neste repositório.** O **site novo** (Next.js + Supabase, em `apps/web`) está no ar na Vercel:
> <https://dse-academy-chi.vercel.app>. Ele tem trilhas de estudo, aderência às vagas, formulários de artigo e de palestrante
> e o painel de administração. O **site antigo** (HTML/JS estático, em `app/`) segue sendo gerado pelo workflow semanal até o novo
> assumir tudo. Quase todo o texto abaixo descreve o site antigo e o pipeline de dados; o site novo está em
> [Site novo (Next.js + Supabase)](#site-novo-nextjs--supabase).

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como funciona](#como-funciona)
- [Tecnologias](#tecnologias)
- [Começando](#começando)
- [Configuração](#configuração)
- [Login e perfil do candidato](#login-e-perfil-do-candidato)
- [Automação e publicação](#automação-e-publicação)
- [Metodologia](#metodologia)
- [Enriquecimento com LLM (opcional)](#enriquecimento-com-llm-opcional)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Desenvolvimento](#desenvolvimento)
- [Fonte dos dados e uso responsável](#fonte-dos-dados-e-uso-responsável)
- [Site novo (Next.js + Supabase)](#site-novo-nextjs--supabase)
- [Roadmap](#roadmap)

---

## Funcionalidades

**Para quem busca vaga**

| Tela | O que faz |
|---|---|
| **Vagas** (`#/`) | Busca por cargo, empresa ou tecnologia, com filtros de senioridade, stacks, empresa e modelo de trabalho. Ordena por mais recentes, mais relevantes (quando há busca) ou **mais aderentes ao meu perfil**. |
| **Detalhe da vaga** (`#/vaga/<id>`) | Descrição completa, senioridade, modelo, contrato, stacks citadas e link para se candidatar na fonte original. |
| **Aderência à vaga** (`#/vaga/<id>/aderencia`) | Percentual das stacks da vaga que a pessoa já tem, o que falta (em ordem de prioridade no mercado) e o encaixe de nível e área. |
| **Perfil de competências** (`#/perfil` → `#/perfil/resultado`) | As skills mais pedidas por área e nível, com o percentual de vagas que citam cada uma, e o que priorizar a partir do que a pessoa já sabe. O resultado tem URL própria e pode ser compartilhado. |
| **Meu perfil** (`#/candidato`) | Vagas salvas e **Minhas skills**: etiquetas editáveis com autocompletar, cobertura das 10 skills mais pedidas na área de interesse e sugestões do que aprender. |
| **Entrar** (`#/entrar`) | Login por link no e-mail, sem senha. |
| **Política de privacidade** (`#/privacidade`) | Quais dados o portal trata, para quê, com quem, por quanto tempo e como exercer os direitos da LGPD. Link no rodapé, no login e em Meu perfil. |
| **Boas-vindas** (`#/boas-vindas`) | No primeiro login, 3 passos (área, nível e skills, com sugestões da área) que já deixam a busca ordenada por aderência. Pode ser pulado e refeito em Meu perfil. |
| **Algo errado nesta vaga?** (na página da vaga) | Relato de stack errada, vaga fora da área, senioridade errada ou vaga encerrada, sem precisar de login. |

**Por trás do portal**

- Coleta semanal automática das vagas, com trava contra coletas suspeitas
- Deduplicação de vagas republicadas e ocultação automática de vagas com prazo vencido
- Identificação de **99 skills** (sinônimos em português e inglês) em cada descrição
- Interface responsiva (desktop, tablet e celular), com foco em acessibilidade

---

## Como funciona

```
                   ┌──────────────────────────────────────────────┐
  Toda sexta,      │  GitHub Actions (.github/workflows/)         │
  02:00 (Brasília) │                                              │
                   │  1. testes                                   │
                   │  2. coleta da Gupy ──► data/raw/*.json       │
                   │  3. build do site ──► site/                  │
                   │  4. deploy ──► GitHub Pages                  │
                   └──────────────────────────────────────────────┘

  ingestion/gupy.py        coleta paginada, rate limit, retry, normalização, trava de coleta
          │
  enrichment/schema.py     VagaBruta normalizada + deduplicação de republicações
  enrichment/taxonomia.py  stacks por palavra-chave (taxonomy.yaml)
  enrichment/extractor.py  senioridade e área pelo título; LLM opcional
          │
  app/dados.py             junta coleta + stacks + enriquecimento ──► dados.js + descricoes.js
  app/build_site.py        copia app/web/ e gera site/ (dados.js, descricoes.js e config.js)
          │
  Navegador                busca, filtros, perfil de competências e aderência rodam no cliente
          │
  Supabase                 login (Auth) + perfis e vagas salvas (Postgres com Row Level Security)
```

O portal é um **site estático**: não há servidor próprio. Os dados das vagas são gerados no build e todos
os cálculos rodam no navegador. As descrições das vagas (cerca de 85% do volume) ficam em `descricoes.js`,
carregado em segundo plano depois que a página aparece: a abertura baixa só `dados.js` (~50 KB comprimido). Só o login e o perfil do candidato usam um serviço externo (Supabase).

---

## Tecnologias

| Camada | Escolha |
|---|---|
| Coleta e processamento | Python 3.13, `httpx`, `pydantic`, `pyyaml` |
| Enriquecimento opcional | `google-genai` (Gemini) ou Ollama local |
| Front-end | HTML, CSS e JavaScript sem framework |
| Conta do candidato | Supabase (Auth + Postgres) via `supabase-js` |
| Automação e hospedagem | GitHub Actions + GitHub Pages |
| Testes | `pytest` |

---

## Começando

**Requisitos:** Python 3.13 e Git.

```bash
git clone git@github.com:MGabrielaZuppardo/dse-academy.git
cd dse-academy

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS

pip install -r requirements.txt
```

**Rodar os testes**

```bash
python -m pytest -q
```

**Coletar as vagas** (grava em `data/raw/gupy_AAAAMMDD.json`)

```bash
python -m ingestion.gupy
```

**Gerar e abrir o site**

```bash
python -m app.build_site --servir
```

O site fica em `http://localhost:8765`. Use `--servir` sempre que for testar o login: o link enviado por
e-mail precisa voltar para um endereço `http://`. A opção `--abrir` abre o arquivo direto do disco, sem login.

---

## Configuração

Copie `.env.example` para `.env`. Todas as variáveis são opcionais: sem elas, o portal funciona em modo local.

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (`https://<projeto>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Chave **publishable/anon** do Supabase. É pública por design; **nunca** use a chave *secret*/*service_role* |
| `AUTH_PROVEDORES` | Provedores OAuth habilitados no Supabase, separados por vírgula (ex.: `github,google`) |
| `GEMINI_API_KEY` | Chave da API do Gemini, só para o enriquecimento com LLM |
| `GEMINI_MODEL` / `GEMINI_RPM` | Modelo e limite de requisições por minuto do Gemini |
| `OLLAMA_MODEL` / `OLLAMA_URL` | Modelo e endereço do Ollama local |
| `PRIVACIDADE_RESPONSAVEL` | Quem responde pelos dados (controlador), exibido na política de privacidade |
| `PRIVACIDADE_CONTATO` | E-mail para pedidos de privacidade (LGPD) |
| `PRIVACIDADE_REGIAO_DADOS` | Região do projeto Supabase (ex.: `São Paulo (sa-east-1)`) |

O `.env` nunca é versionado.

---

## Login e perfil do candidato

**Sem Supabase configurado**, o portal funciona em modo local: as vagas salvas ficam só no navegador.

**Com Supabase**, a pessoa entra com um link enviado ao e-mail (PKCE) e o perfil acompanha em qualquer aparelho.

### Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito). Para público brasileiro, prefira a região São Paulo.
2. Em **SQL Editor**, rode as migrações em ordem:
   [`001_perfil_candidato.sql`](supabase/migrations/001_perfil_candidato.sql) e
   [`002_reportes_vaga.sql`](supabase/migrations/002_reportes_vaga.sql).
3. Em **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:8765` (em produção, a URL do GitHub Pages)
   - **Redirect URLs:** `http://localhost:8765/**` e a URL do GitHub Pages com `/**`
4. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `.env`.
5. Para uso real, configure um SMTP próprio em **Authentication → Emails**: o envio padrão tem limite baixo por hora.

### Segurança e privacidade

- **Row Level Security:** cada pessoa só lê e altera as próprias linhas em `perfis` e `vagas_salvas`,
  mesmo com a chave pública no site. Inserções anônimas são recusadas.
- **Limite:** até 500 vagas salvas por pessoa.
- **Relatos de erro:** qualquer pessoa pode enviar, mas a tabela `reportes_vaga` não tem política de leitura:
  ninguém lê os relatos pelo site. Relatos de quem está logado ficam ligados à conta; os demais são anônimos.
- **LGPD:** são guardados só o e-mail, o que a pessoa preenche no perfil, as vagas que ela salva e os relatos que envia.
  Em *Meu perfil → Excluir minha conta*, a função `excluir_minha_conta()` apaga conta, perfil e vagas salvas.

---

## Automação e publicação

O workflow [`.github/workflows/pipeline.yml`](.github/workflows/pipeline.yml) roda **toda sexta às 02:00
(horário de Brasília)** e também sob demanda (*Actions → Coleta e publicação → Run workflow*):

1. roda os testes;
2. coleta as vagas com `--minimo 200`: se vierem menos de 200 vagas únicas, a coleta **não é gravada** e nada é publicado;
3. guarda o JSON bruto da coleta como artefato por 90 dias;
4. gera o site e publica no GitHub Pages.

Se qualquer etapa falhar, o site anterior continua no ar e o GitHub avisa por e-mail.

**Configuração única no GitHub**

- *Settings → Pages → Source:* **GitHub Actions**
- *Settings → Secrets and variables → Actions → Variables:* `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `PRIVACIDADE_RESPONSAVEL`, `PRIVACIDADE_CONTATO`, `PRIVACIDADE_REGIAO_DADOS` e, se usar, `AUTH_PROVEDORES`

---

## Metodologia

### Coleta

- Busca por 11 termos (`dados`, `engenheiro de dados`, `data engineer`, `analista de dados`, `cientista de dados`,
  `data scientist`, `analytics engineer`, `machine learning`, `mlops`, `BI`, `power bi`), 100 vagas por página,
  1 requisição por segundo, com nova tentativa em erros 429/5xx.
- Vagas repetidas entre termos são unificadas pelo id; vagas fora do Brasil são descartadas.
- Contrato, modelo de trabalho, UF e PcD vêm estruturados da fonte e são normalizados.
- O sufixo "(CÓPIA)" dos títulos e as entidades HTML das descrições (`&nbsp;`, `&amp;`) são limpos.

### Deduplicação

A mesma vaga republicada pela empresa (mesmo título, empresa e cidade, sem acento e caixa) conta uma vez só.
Fica a publicação aberta mais recente; banco de talentos só representa o grupo se não houver vaga aberta.

### Stacks por palavra-chave

- A [`taxonomy.yaml`](enrichment/taxonomy.yaml) tem **99 skills em 19 categorias**, com sinônimos em português e inglês.
- A busca ignora acento, caixa e separadores (`Power-BI` = `power bi` = `PowerBI`) e só casa palavras inteiras.
- **Hierarquia:** 20 skills têm uma skill-pai (ex.: Glue conta também como AWS; DAX, como Power BI).
- Termos que também são palavras comuns ficam fora da busca textual (ex.: "Informatica" × informática, "Iceberg", "Shell");
  a skill ainda é encontrada pelas formas longas (ex.: "Informatica PowerCenter").
- A linguagem R só conta como "R" maiúsculo isolado ("Python ou R"), nunca "R$" ou "P&R".

### Senioridade e área

- **Senioridade:** pelo título ("Estágio", "Jr", "Pleno", "III", "Sênior", "Especialista", "Coordenador"…) e pelo
  tipo de contrato (estágio, trainee, aprendiz). Níveis: Entrada, Júnior, Pleno, Sênior, Especialista e Gestão.
- **Área:** pelo título, em três camadas (`classificar_area` em `enrichment/extractor.py`):
  1. **Fora do escopo:** "dados" em outro sentido (privacidade e proteção de dados, redes e telecom, coleta ou
     processamento de dados). Essas vagas não aparecem no portal.
  2. **Áreas de dados:** Engenharia, Análise, Ciência, ML, Analytics Engineering, BI, Governança, DBA e Gestão,
     incluindo variações comuns ("Analista Dados JR", "Eng de Dados", "Arquiteto(a) de Dados", "Estagiário(a) - Dados").
  3. **Negócios com foco em dados:** funções de negócio que usam dados (comercial, RH, operações). Aparecem na busca
     com etiqueta própria e podem ser ocultadas no filtro, mas não entram nos rankings de "todas as áreas".

### Aderência

- **Aderência exibida:** `stacks da vaga que a pessoa tem ÷ stacks identificadas na vaga`.
- **Ordenação por aderência:** usa uma nota suavizada, `tem ÷ (total + 2)`, para que uma vaga com "1 de 1"
  (100%) não fique à frente de uma com "6 de 8" (75%), que diz mais. A constante é `SUAVIZACAO_ADERENCIA` em `app.js`.
- **O que falta:** ordenado pelo percentual de vagas da mesma área que citam cada skill.

### Perfil de competências

Percentual de vagas abertas (da área e do nível escolhidos) que citam cada skill. Amostras com menos de 20 vagas
recebem o aviso "amostra pequena".

### Revisando os relatos de erro

Os relatos chegam na tabela `reportes_vaga` e são lidos pelo painel do Supabase (*Table Editor* ou *SQL Editor*).
O arquivo da migração traz consultas prontas; as mais úteis:

```sql
-- stacks mais apontadas como erradas: candidatas a ajuste na taxonomy.yaml
select s as stack, count(*) from reportes_vaga, unnest(stacks) s
where tipo = 'stack_errada' group by s order by 2 desc;

-- títulos apontados como "não é vaga de dados": candidatos à camada 1 da classificação de área
select titulo, count(*) from reportes_vaga
where tipo = 'nao_e_vaga_de_dados' group by titulo order by 2 desc;
```

### Limitações conhecidas

- A busca por palavra-chave **não separa** obrigatória de desejável; vagas que listam alternativas ("AWS, Azure ou GCP")
  contam todas, o que reduz a aderência.
- Menções fora de contexto também contam (ex.: "formação em Estatística" conta como a skill Estatística).
- A classificação de área depende do título: títulos genéricos ou fora do padrão podem cair na área errada.
- A coleta é semanal: vagas encerradas antes do prazo informado podem aparecer por até uma semana.

---

## Enriquecimento com LLM (opcional)

Desligado por padrão. Quando usado, separa skills **obrigatórias** de **desejáveis**, identifica vagas fora do escopo,
vagas afirmativas e salário informado. Regras determinísticas ficam por cima da resposta do modelo: a skill precisa
estar escrita na vaga e a senioridade explícita no título prevalece.

```bash
# Gemini (requer GEMINI_API_KEY); amostra aleatória de 50 vagas
python -m enrichment.extractor data/raw/gupy_AAAAMMDD.json --limite 50

# todas as vagas (a saída é incremental: dá para retomar quando a cota diária acabar)
python -m enrichment.extractor data/raw/gupy_AAAAMMDD.json --limite 0

# Ollama local
python -m enrichment.extractor data/raw/gupy_AAAAMMDD.json --provedor ollama
```

O resultado vai para `data/enriched/*.jsonl` e é usado automaticamente no próximo build do site.

---

## Estrutura do repositório

```
.github/workflows/pipeline.yml   coleta semanal e publicação no GitHub Pages
app/
  build_site.py                  gera site/ e serve localmente (--servir)
  dados.py                       junta coleta, stacks e enriquecimento em dados.js
  web/                           front-end: index.html, styles.css, app.js, conta.js, logo
enrichment/
  schema.py                      modelos (Pydantic), enums e deduplicação
  taxonomy.yaml                  99 skills, sinônimos, hierarquia e termos ignorados
  taxonomia.py                   mapeamento e extração de skills por palavra-chave
  extractor.py                   regras de senioridade e área; extração com LLM
ingestion/
  gupy.py                        conector da Gupy
  greenhouse.py, lever.py        reservados para próximos conectores (vazios)
storage/repository.py            reservado para persistência em banco (vazio)
supabase/migrations/             tabelas, RLS, exclusão de conta e funções do painel de administração
supabase/manual/                 SQL que leva segredos ou só lê (webhook do e-mail, validação das tabelas)
integrations/apps-script/        aviso por e-mail dos formulários (Google Apps Script)
apps/web/                        site novo (Next.js)
apps/api/                        API (FastAPI)
trilhas/                         gerador das trilhas de estudo
tests/                           testes do conector, da taxonomia e do extrator
main.py                          atalho para a coleta da Gupy
```

Arquivos gerados e não versionados: `data/` (coletas e enriquecimentos), `site/` (build) e `.env`.

---

## Desenvolvimento

- **Testes:** `python -m pytest -q` (58 testes). Os testes do extrator usam um LLM simulado, sem chamadas externas.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) em português, com escopo
  (ex.: `feat(ingestion): …`, `test(taxonomia): …`, `ci: …`, `docs: …`).
- **Branches e PRs:** uma branch por funcionalidade (`feat/…`, `ci/…`, `docs/…`) e um PR para a `main`, com merge commit.
- **Antes de abrir um PR:** rode os testes e, se mexer no front-end, confira o site em `--servir` no desktop e no celular.

---

## Fonte dos dados e uso responsável

As vagas vêm do endpoint público que alimenta o portal de vagas da Gupy (`portal.gupy.io/api/job-search/jobs`), que **não é uma API documentada para terceiros**
e já mudou de endereço uma vez (o antigo, `employability-portal.gupy.io/api/v1/jobs`, passou a responder 404 em outubro de 2026).
Se a coleta voltar a falhar com 404, o primeiro passo é conferir qual endereço o portal público usa hoje.
A coleta é conservadora (1 requisição por segundo, User-Agent identificado, uma vez por semana) e não captura dados
pessoais de recrutadores ou candidatos. Cada vaga leva para o anúncio original.

> **Pendente:** revisar os termos de uso e o `robots.txt` da Gupy e registrar a conclusão aqui antes de divulgar o portal.
> Se os termos restringirem a republicação do texto, o portal pode exibir só título, empresa, stacks e o link para a vaga.

---

## Site novo (Next.js + Supabase)

Endereço: <https://dse-academy-chi.vercel.app>. O código fica em `apps/web` (detalhes em [apps/web/README.md](apps/web/README.md)).

```
apps/web/     Next.js (TypeScript, Tailwind): o site que as pessoas usam
apps/api/     FastAPI: tarefas de servidor (LLM com Groq, validação). Valida o JWT do Supabase. Ainda não é usada pelo site
supabase/     migrations SQL (perfis, RLS, admins, palestrantes, artigos, trilhas, painel de administração)
integrations/ aviso por e-mail dos formulários, via Google Apps Script
ingestion/ enrichment/ trilhas/ app/   pipeline de coleta e geração de dados (e o site antigo)
```

O site fala **direto com o Supabase** usando a chave pública, e a RLS é a única fonte de autorização. Por isso o piloto roda só com
o front na Vercel e o Supabase; a API FastAPI fica para quando houver tarefas de servidor.

### O que o site novo faz

| Área | O que tem |
|---|---|
| Visitante | vagas com busca e filtros, trilhas de estudo (leitura), formulários de artigo e de palestrante, contato |
| Com login (link no e-mail) | perfil (área, nível, habilidades), **aderência** a cada vaga e ordenação por aderência, vagas salvas, relato de erro, **progresso nas trilhas**, quadro "Sua atividade" |
| Administração (`/admin`) | dashboards e **histórico** (pessoas, vagas salvas, inscrições, artigos, palestrantes, relatos), lista de artigos e de palestrantes com troca de situação, relatos de erro das vagas |

### Publicação (Vercel)

- Projeto importado do GitHub, **Root Directory `apps/web`**, branch `main`. Cada merge no `main` publica de novo.
- Variáveis de ambiente (Vercel → Settings → Environment Variables). As `NEXT_PUBLIC_*` são gravadas no build: depois de mudar uma, faça novo deploy.

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave **publishable** (pública por design; nunca a *secret*/*service_role*) |
| `NEXT_PUBLIC_CONTATO_EMAIL`, `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_LINKTREE_URL` | contatos exibidos em "Fale conosco" e no rodapé |
| `NEXT_PUBLIC_CONTA_FAKE` | **não criar**: só para desenvolvimento |

- Supabase → Authentication → URL Configuration: **Site URL** com o endereço da Vercel e, em **Redirect URLs**, o mesmo endereço com `/**`
  (e `http://localhost:3000/**` para testes). Sem isso o link de login volta para o endereço errado.

### Dados das vagas e das trilhas

O site novo lê `apps/web/data/vagas.json`, `descricoes.json` e `trilhas.json`, gerados pelo pipeline (`python -m app.exportar_json` e
`python -m trilhas.gerar`). **Esses arquivos estão no `.gitignore` (`data/`), então não vão para a Vercel**: enquanto não forem
versionados ou gerados no deploy, o site publicado abre sem vagas e sem trilhas. Ver o [Roadmap](#roadmap).

### Banco de dados (migrations)

Rode no SQL Editor do Supabase, em ordem:

| Arquivo | O que cria |
|---|---|
| `001_perfil_candidato.sql` | perfis, vagas salvas, exclusão de conta |
| `002_reportes_vaga.sql` | relatos de erro das vagas |
| `003_admins.sql` | tabela `admins` e a função `is_admin()` |
| `004_palestrantes.sql` | cadastro de palestrantes (com aprovação) |
| `005_submissoes_artigos.sql` | artigos enviados |
| `006_inscricoes_trilha.sql` | inscrição e progresso nas trilhas |
| `007_admin_resumo.sql` | `admin_resumo()`: totais do painel, sem dados pessoais |
| `008_admin_historico.sql` | `admin_historico()`: evolução dia a dia, calculada pelas datas de criação |

Em `supabase/manual/`: `webhook_apps_script.sql` (liga o Supabase ao e-mail de aviso) e `validar_tabelas.sql` (consultas só de leitura para
conferir tabelas, políticas e permissões).

### Administração

- Para dar acesso, a pessoa entra no site uma vez e, no SQL Editor:
  `insert into public.admins (user_id) select id from auth.users where email = 'pessoa@exemplo.com';`
- A tela só decide o que mostrar; quem protege é o banco (as funções e as políticas checam `is_admin()`). A rota `/admin` não é indexada.
- O histórico vem das datas de criação das linhas: quem apaga a conta deixa de aparecer no passado.

### Aviso por e-mail dos formulários

Artigo ou palestrante enviado → linha no Supabase → gatilho (`pg_net`) → Google Apps Script → e-mail para a conta oficial da DSE.
O token fica na URL do webhook e na propriedade `TOKEN` do script, e precisa ser igual nos dois lados (se não for, o script responde
`nao autorizado`). Passo a passo em [integrations/apps-script/README.md](integrations/apps-script/README.md).

### Trilhas de estudo

Uma trilha por área (8 hoje; áreas com menos de 15 vagas ficam de fora), gerada em lote por `python -m trilhas.gerar`:

1. **Os números vêm das vagas**: `trilhas/demanda.py` conta quanto cada tecnologia é pedida na área. Nada disso passa por LLM.
2. **Divisão do básico ao avançado**: `trilhas/niveis.yaml` diz em que nível cada tecnologia entra. O nível de cada etapa é calculado a
   partir das tecnologias dentro dela (nunca do que o LLM disser), e a trilha é sempre exibida em três blocos: básico, intermediário e
   avançado. Se uma área não tiver nenhuma tecnologia avançada entre as mais pedidas, as intermediárias menos pedidas (as mais
   especializadas) sobem para avançado, para a trilha sempre ter os três níveis.
3. **O LLM só organiza** as etapas, via Groq (modelos abertos, `GROQ_API_KEY`) ou Ollama local. Ele recebe só nomes, ids, percentuais e
   níveis da taxonomia, nunca texto de vagas. A resposta é validada: ids inventados ou repetidos caem, o que ele esquecer vai para uma
   etapa de aprofundamento e, se vier inutilizável ou a cota acabar, a trilha sai de um plano por regras.
4. **Cinco ideias de mini-projeto por etapa**: as do LLM (se houver) completadas com as de `trilhas/projetos.yaml`, uma de cada
   tecnologia da etapa por rodada, sem repetir título na mesma trilha.
5. **Conteúdo gratuito e aberto** em `trilhas/recursos.yaml`: conteúdo geral e por área ("Comece por aqui", no topo da trilha) e por
   tecnologia. O LLM não escolhe links. Todos responderam HTTP 200 ao entrar; a licença só aparece quando a API do GitHub a confirma.
   Revalide com `python -m trilhas.verificar_links`.
6. **A personalização é no navegador**: o que a pessoa já sabe vem das habilidades do perfil; o progresso fica na tabela
   `inscricoes_trilha` (migration 006), com RLS por usuário.

Para ampliar o conteúdo basta editar os três YAML (há testes que validam ids, links https, níveis e tamanhos).

## Roadmap

- [ ] **Levar os dados das vagas e das trilhas para a Vercel** (hoje o site publicado abre sem eles): fazer o workflow gerar os JSON e versioná-los
- [ ] Ativar o GitHub Pages (o job de publicação do site antigo falha com 404 sem isso) ou aposentar o site antigo
- [ ] Revisar os termos de uso da Gupy (ver acima)
- [ ] Página de política de privacidade no site novo; preencher `PRIVACIDADE_*` e revisar com apoio jurídico
- [ ] SMTP próprio para os e-mails de login
- [ ] Trocar o token do Apps Script (o usado nos testes apareceu em conversa) e apagar os envios de teste
- [ ] Rodar `python -m trilhas.gerar` com `GROQ_API_KEY` e revisar as trilhas
- [ ] Migrar as últimas telas do site antigo (perfil de competências) para o Next.js
- [ ] Avaliação manual de uma amostra (acurácia de senioridade, precisão e revocação das skills)
- [ ] Conectores Greenhouse e Lever
- [ ] Agente conversacional sobre os dados das vagas (adiado)

**Licença:** ainda não definida.
