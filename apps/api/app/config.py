"""Configuração da API, lida das variáveis de ambiente (ou do .env na raiz do repositório)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_anon_key: str
    # Projetos novos assinam o JWT com chave assimétrica (JWKS). Projetos antigos usam um segredo
    # HS256: se SUPABASE_JWT_SECRET estiver definido, ele tem prioridade.
    supabase_jwt_secret: str
    origens_permitidas: tuple[str, ...]


@lru_cache
def settings() -> Settings:
    origens = os.environ.get("API_ORIGENS_PERMITIDAS", "http://localhost:3000")
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL", "").rstrip("/"),
        supabase_anon_key=os.environ.get("SUPABASE_ANON_KEY", ""),
        supabase_jwt_secret=os.environ.get("SUPABASE_JWT_SECRET", ""),
        origens_permitidas=tuple(o.strip() for o in origens.split(",") if o.strip()),
    )
