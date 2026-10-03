import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.main import app

SEGREDO = "segredo-de-teste-com-pelo-menos-32-bytes!!"


@pytest.fixture
def cliente():
    app.dependency_overrides[settings] = lambda: Settings(
        supabase_url="https://exemplo.supabase.co", supabase_anon_key="anon",
        supabase_jwt_secret=SEGREDO, origens_permitidas=("http://localhost:3000",),
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def token(**extra) -> str:
    claims = {"sub": "u-1", "email": "a@b.com", "aud": "authenticated", "exp": int(time.time()) + 600, **extra}
    return jwt.encode(claims, SEGREDO, algorithm="HS256")


def test_health_nao_exige_login(cliente):
    assert cliente.get("/health").json() == {"status": "ok"}


def test_me_sem_token_retorna_401(cliente):
    assert cliente.get("/me").status_code == 401


def test_me_com_token_valido(cliente):
    r = cliente.get("/me", headers={"Authorization": f"Bearer {token()}"})
    assert r.status_code == 200
    assert r.json() == {"id": "u-1", "email": "a@b.com"}


def test_token_expirado_retorna_401(cliente):
    r = cliente.get("/me", headers={"Authorization": f"Bearer {token(exp=int(time.time()) - 5)}"})
    assert r.status_code == 401


def test_token_de_outro_publico_retorna_401(cliente):
    r = cliente.get("/me", headers={"Authorization": f"Bearer {token(aud='anon')}"})
    assert r.status_code == 401


def test_token_assinado_com_outro_segredo_retorna_401(cliente):
    falso = jwt.encode({"sub": "u-1", "aud": "authenticated", "exp": int(time.time()) + 600}, "x" * 40, algorithm="HS256")
    assert cliente.get("/me", headers={"Authorization": f"Bearer {falso}"}).status_code == 401
