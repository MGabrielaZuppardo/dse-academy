"""Validação do token de sessão do Supabase (o mesmo JWT que o front usa)."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, settings

_bearer = HTTPBearer(auto_error=False)
_ALGORITMOS_ASSIMETRICOS = ["RS256", "ES256"]


@dataclass(frozen=True)
class Usuario:
    id: str
    email: str | None
    token: str  # repassado ao Supabase: a RLS do banco continua sendo quem autoriza


@lru_cache
def _jwks(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True)


def decodificar(token: str, cfg: Settings) -> dict:
    opcoes = {"require": ["exp", "sub"]}
    if cfg.supabase_jwt_secret:
        return jwt.decode(token, cfg.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated", options=opcoes)
    chave = _jwks(cfg.supabase_url).get_signing_key_from_jwt(token).key
    return jwt.decode(token, chave, algorithms=_ALGORITMOS_ASSIMETRICOS, audience="authenticated", options=opcoes)


def usuario_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    cfg: Settings = Depends(settings),
) -> Usuario:
    nao_autorizado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada.", headers={"WWW-Authenticate": "Bearer"})
    if cred is None:
        raise nao_autorizado
    try:
        claims = decodificar(cred.credentials, cfg)
    except jwt.PyJWTError:
        raise nao_autorizado from None
    return Usuario(id=claims["sub"], email=claims.get("email"), token=cred.credentials)
