"""Gera as trilhas de estudo em JSON para o front Next.js (apps/web/data/trilhas.json).

Uso:
    python -m trilhas.gerar                       # Groq se houver GROQ_API_KEY; senão, só regras
    python -m trilhas.gerar --provedor groq       # exige GROQ_API_KEY
    python -m trilhas.gerar --provedor ollama     # modelo local (Ollama rodando)
    python -m trilhas.gerar --provedor nenhum     # plano por regras, sem LLM
    python -m trilhas.gerar --areas bi,dba        # só algumas áreas

Uma trilha por área (poucas chamadas ao LLM, feitas em lote), não uma por pessoa. A personalização
(o que a pessoa já sabe) é calculada no navegador a partir do perfil, sem LLM.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from app.exportar_json import carregar_visiveis
from enrichment.extractor import ChamadaLLM, CotaEsgotada
from trilhas.demanda import AREAS_DE_TRILHA, demanda_por_area
from trilhas.curadoria import carregar_curadoria
from trilhas.llm import MODELO_GROQ, MODELO_OLLAMA, cliente_groq, cliente_ollama_compat
from trilhas.montar import montar_trilha

SAIDA = Path("apps/web/data")


def escolher_llm(provedor: str) -> tuple[ChamadaLLM | None, str]:
    """(cliente, rótulo do modelo para registrar no JSON)."""
    if provedor == "auto":
        provedor = "groq" if os.environ.get("GROQ_API_KEY", "").strip() else "nenhum"
    if provedor == "groq":
        return cliente_groq(), MODELO_GROQ
    if provedor == "ollama":
        return cliente_ollama_compat(), MODELO_OLLAMA
    return None, "regras"


def gerar(saida: Path = SAIDA, provedor: str = "auto", areas: set[str] | None = None) -> dict:
    vagas, coletada_em, taxonomia = carregar_visiveis()
    demanda = demanda_por_area(vagas, taxonomia)
    curadoria = carregar_curadoria()
    llm, modelo = escolher_llm(provedor)

    trilhas = []
    for area_id, area_nome in AREAS_DE_TRILHA.items():
        if area_id not in demanda or (areas and area_id not in areas):
            continue
        total, lista = demanda[area_id]
        try:
            trilhas.append(montar_trilha(area_id, area_nome, total, lista, taxonomia, curadoria, llm))
        except CotaEsgotada as e:
            logging.warning("cota do LLM esgotada (%s): as áreas restantes saem por regras", e)
            llm = None
            trilhas.append(montar_trilha(area_id, area_nome, total, lista, taxonomia, curadoria, None))

    saida.mkdir(parents=True, exist_ok=True)
    (saida / "trilhas.json").write_text(json.dumps({
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "coletada_em": coletada_em.isoformat(),
        "modelo": modelo,
        "trilhas": trilhas,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {"trilhas": len(trilhas), "por_llm": sum(t["origem"] == "llm" for t in trilhas), "modelo": modelo, "saida": str(saida)}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--provedor", choices=["auto", "groq", "ollama", "nenhum"], default="auto")
    parser.add_argument("--saida", type=Path, default=SAIDA)
    parser.add_argument("--areas", help="ids separados por vírgula (padrão: todas com vagas suficientes)")
    args = parser.parse_args()
    r = gerar(args.saida, args.provedor, set(args.areas.split(",")) if args.areas else None)
    print(f"{r['trilhas']} trilhas geradas ({r['por_llm']} pelo LLM, {r['trilhas'] - r['por_llm']} por regras) em {r['saida']}  [modelo: {r['modelo']}]")


if __name__ == "__main__":
    main()
