"""API do Portal de Vagas em Dados · DSE Academy.

Fica ao lado do Supabase (auth e banco), não no lugar dele. É para o que o banco não faz bem:
gerar roadmaps com LLM sem expor a chave no navegador, validar saídas e orquestrar tarefas.
"""
from __future__ import annotations

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import supabase
from app.auth import Usuario, usuario_atual
from app.config import Settings, settings

app = FastAPI(title="Portal de Vagas · API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings().origens_permitidas),
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me")
def me(usuario: Usuario = Depends(usuario_atual)) -> dict[str, str | None]:
    return {"id": usuario.id, "email": usuario.email}


@app.get("/me/admin")
async def me_admin(usuario: Usuario = Depends(usuario_atual), cfg: Settings = Depends(settings)) -> dict[str, bool]:
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            return {"admin": await supabase.e_admin(cfg, usuario, http)}
    except httpx.HTTPError:
        raise HTTPException(502, "Não foi possível consultar o Supabase agora.") from None
