# API (FastAPI)

Fica ao lado do Supabase, não no lugar dele. Autenticação e dados continuam no Supabase; esta API é para o que o
banco não faz bem (gerar roadmaps com LLM sem expor a chave no navegador, validar e orquestrar).

**Regra de autorização:** a API valida o JWT do Supabase e repassa o token do usuário ao PostgREST
(`app/supabase.py`). Assim a RLS do banco continua sendo a única fonte de autorização; não duplicamos regras em Python.

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8000
```

Variáveis (lidas do `.env` da raiz do repositório): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_ORIGENS_PERMITIDAS`.
Projetos Supabase antigos que assinam o JWT com segredo HS256 também definem `SUPABASE_JWT_SECRET`; os novos usam JWKS
e não precisam dele.

| Rota | Auth | O que faz |
|---|---|---|
| `GET /health` | não | verificação de vida |
| `GET /me` | sim | id e e-mail da sessão |
| `GET /me/admin` | sim | `{admin: bool}`, via `rpc/is_admin` com o token da pessoa |
