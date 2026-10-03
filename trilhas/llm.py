"""Clientes de LLM para as trilhas: modelos abertos via API compatível com a da OpenAI (Groq, Ollama).

Mesmo contrato do enrichment/extractor.py: `ChamadaLLM = (system_prompt, prompt) -> texto JSON`.

- groq:   hospeda modelos abertos (Llama, Qwen, gpt-oss). Requer GROQ_API_KEY. Modelo por GROQ_MODEL.
          Modelos disponíveis e limites da camada gratuita mudam: https://console.groq.com/docs/models
- ollama: local e gratuito. Requer o Ollama rodando (ele expõe /v1). Modelo por OLLAMA_MODEL.
"""

from __future__ import annotations

import os
import time
from typing import Callable

import httpx
from dotenv import load_dotenv

from enrichment.extractor import ChamadaLLM, CotaEsgotada

load_dotenv()

GROQ_URL = os.environ.get("GROQ_URL") or "https://api.groq.com/openai/v1"
MODELO_GROQ = os.environ.get("GROQ_MODEL") or "openai/gpt-oss-120b"
OLLAMA_URL = os.environ.get("OLLAMA_URL") or "http://localhost:11434"
MODELO_OLLAMA = os.environ.get("OLLAMA_MODEL") or "qwen2.5:7b"

MAX_TOKENS_RESPOSTA = 3000
TENTATIVAS = 3


def cliente_openai_compat(
    base_url: str,
    api_key: str,
    modelo: str,
    *,
    transporte: httpx.BaseTransport | None = None,
    dormir: Callable[[float], None] = time.sleep,
) -> ChamadaLLM:
    """POST {base_url}/chat/completions em modo JSON. 429 e 5xx são repetidos com espera; 429 persistente
    levanta CotaEsgotada (provavelmente acabou a cota: o lote deve parar de chamar o LLM)."""
    client = httpx.Client(base_url=base_url.rstrip("/"), timeout=120, transport=transporte, headers={"Authorization": f"Bearer {api_key}"})

    def chamar(system_prompt: str, prompt: str) -> str:
        corpo = {
            "model": modelo,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": MAX_TOKENS_RESPOSTA,
        }
        for tentativa in range(1, TENTATIVAS + 1):
            r = client.post("/chat/completions", json=corpo)
            if r.status_code == 429 or r.status_code >= 500:
                if tentativa == TENTATIVAS:
                    if r.status_code == 429:
                        raise CotaEsgotada(f"429 persistente em {base_url}")
                    r.raise_for_status()
                try:
                    espera = min(float(r.headers.get("retry-after", "")), 60)
                except ValueError:
                    espera = 2.0 ** tentativa
                dormir(espera)
                continue
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        raise RuntimeError("inalcançável")

    return chamar


def cliente_groq(modelo: str = MODELO_GROQ) -> ChamadaLLM:
    chave = os.environ.get("GROQ_API_KEY", "").strip()
    if not chave:
        raise SystemExit("Defina GROQ_API_KEY no .env (crie a chave em https://console.groq.com/keys).")
    return cliente_openai_compat(GROQ_URL, chave, modelo)


def cliente_ollama_compat(modelo: str = MODELO_OLLAMA, url: str = OLLAMA_URL) -> ChamadaLLM:
    return cliente_openai_compat(url.rstrip("/") + "/v1", "ollama", modelo)
