# Web (Next.js)

Front novo do portal. Lê e grava direto no Supabase com a chave pública; quem protege os dados é a RLS
(`supabase/migrations`). Next.js 16: `middleware` virou `proxy`, e a documentação da versão instalada fica em
`node_modules/next/dist/docs/`.

Os dados das vagas vêm do pipeline em Python. Gere os JSON antes (ficam em `apps/web/data/`, fora do git):

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
| `/vagas` | lista com busca e filtros (área, nível, modelo) |
| `/vagas/[id]` | detalhe da vaga (uma página estática por vaga) |
| `/trilhas`, `/trilhas/[id]` | trilhas por área, do básico ao avançado, com 5 ideias de mini-projeto por etapa e conteúdo gratuito; logada, a pessoa se inscreve e marca o progresso |
| `/perfil` | login por link no e-mail e criação/edição do perfil (área, nível, habilidades) |
| `/artigos/enviar` | formulário de artigos para o Medium |
| `/contato` | Fale conosco: e-mail oficial, LinkedIn da DSE Community e Linktree (também no rodapé) |
| `/palestrantes/cadastro` | formulário público de palestrantes (grava como "pendente") |

A lógica de validação do formulário está em `src/lib/palestrantes.ts` e espelha os `check` do banco.
