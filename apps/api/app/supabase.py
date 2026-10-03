"""Cliente mínimo do PostgREST do Supabase, sempre com o token da própria pessoa.

Usar o token do usuário (e não a service key) faz a RLS valer também nas chamadas da API.
"""
from __future__ import annotations

import httpx

from app.auth import Usuario
from app.config import Settings


def _cabecalhos(cfg: Settings, usuario: Usuario) -> dict[str, str]:
    return {"apikey": cfg.supabase_anon_key, "Authorization": f"Bearer {usuario.token}"}


async def e_admin(cfg: Settings, usuario: Usuario, http: httpx.AsyncClient) -> bool:
    resposta = await http.post(f"{cfg.supabase_url}/rest/v1/rpc/is_admin", headers=_cabecalhos(cfg, usuario), json={})
    resposta.raise_for_status()
    return resposta.json() is True
