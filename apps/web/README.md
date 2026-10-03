# Web (Next.js)

Front novo do portal. Lê e grava direto no Supabase com a chave pública; quem protege os dados é a RLS
(`supabase/migrations`). Next.js 16: `middleware` virou `proxy`, e a documentação da versão instalada fica em
`node_modules/next/dist/docs/`.

Os dados das vagas vêm do pipeline em Python. Gere os JSON antes (ficam em `apps/web/data/`, que está no `.gitignore`: **não vão para a Vercel** até serem versionados ou gerados no deploy, e sem eles o site publicado abre sem vagas e sem trilhas):

```bash
python -m ingestion.gupy            # coleta (se ainda não tiver data/raw/)
python -m app.exportar_json         # escreve apps/web/data/vagas.json e descricoes.json
python -m trilhas.gerar             # escreve apps/web/data/trilhas.json (Groq se houver GROQ_API_KEY; senão, regras)
```

```bash
cd apps/web
npm install
cp .env.example .env.local      # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                     # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

| Rota | O que é |
|---|---|
| `/` | início |
| `/vagas` | lista com busca e filtros; logada, mostra a **aderência** de cada vaga ao perfil, ordena pelas mais aderentes e permite salvar |
| `/vagas/[id]` | detalhe da vaga (uma página estática por vaga): aderência ao perfil, **o que falta com link para a etapa certa da trilha**, salvar e "algo errado nesta vaga?" |
| `/trilhas`, `/trilhas/[id]` | trilhas por área, do básico ao avançado, com 5 ideias de mini-projeto por etapa e conteúdo gratuito; logada, a pessoa se inscreve e marca o progresso |
| `/perfil` | login por link no e-mail, edição do perfil (área, nível, habilidades) e vagas salvas |
| `/boas-vindas` | onboarding de 3 passos (área, nível, habilidades); abre sozinho no primeiro acesso |
| `/artigos/enviar` | formulário de artigos para o Medium |
| `/contato` | Fale conosco: e-mail oficial, LinkedIn da DSE Community e Linktree (também no rodapé) |
| `/palestrantes/cadastro` | formulário público de palestrantes (grava como "pendente") |
| `/admin` | **só admins**: painel com totais e histórico, e abas de artigos, palestrantes e relatos de vagas (`/admin/artigos`, `/admin/palestrantes`, `/admin/reportes`) |

A lógica de validação do formulário está em `src/lib/palestrantes.ts` e espelha os `check` do banco.

## Aderência e ligação com as trilhas

- **Aderência** = % das tecnologias principais da vaga que a pessoa já tem; skills-filhas contam para as mães (Glue vale AWS). A lógica
  está em `src/lib/aderencia.ts` (funções puras, com testes) e reconhece sinônimos pela taxonomia empacotada em
  `src/dados/taxonomia.json`, **gerada** por `python -m app.exportar_json` (um teste Python falha se ela ficar desatualizada em relação a
  `enrichment/taxonomy.yaml`).
- **Vaga -> trilha**: cada tecnologia que falta aponta para `/trilhas/<área>#skill-<id>`, na trilha da área da vaga (ou na primeira que a tenha);
  a página da trilha destaca a tecnologia. Veja `src/lib/ligacao-trilhas.ts`.
- A conta (login, perfil, vagas salvas) fica em um provedor compartilhado, `src/lib/conta/`, com o estado em um reducer testável.

### Conta de teste (só desenvolvimento)
Para testar telas que exigem login sem Supabase, defina `NEXT_PUBLIC_CONTA_FAKE=1` no `.env.local` e reinicie o `npm run dev`: o site abre
como uma pessoa logada, com o estado no `sessionStorage`. **Nunca vale em produção** (`NODE_ENV=production` recusa) e não deve ir para
nenhum ambiente publicado.

## Administração

- Acesso: tabela `admins` (preenchida só pelo SQL Editor) e função `is_admin()`. A tela consulta `is_admin()` para decidir o que mostrar (`src/lib/admin/acesso.ts`);
  quem protege os dados é o banco.
- Números do painel: `admin_resumo()` (migration 007) e `admin_historico()` (008) devolvem só contagens. O cálculo do gráfico de evolução está em
  `src/lib/admin/resumo.ts` (funções puras, com testes).
- Listas de artigos e palestrantes usam as políticas de admin das migrations 004 e 005 e trocam a situação com `update`.
- O link "Administração" no menu só aparece para admins; a rota tem `noindex`.

## Publicação

Vercel, com **Root Directory `apps/web`**. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e, opcionais,
`NEXT_PUBLIC_CONTATO_EMAIL`, `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_LINKTREE_URL`. As `NEXT_PUBLIC_*` são gravadas no build. Veja o
[README da raiz](../../README.md#site-novo-nextjs--supabase).

## Botões e estilos

Os estilos de botão ficam em `src/lib/botoes.ts` (`estiloBotao(variante, tamanho)` e `BOTAO_ICONE`), com altura mínima de 44 px. Use sempre esse módulo
em vez de repetir classes.
