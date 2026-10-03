"""Exporta as vagas em JSON para o front Next.js (apps/web/data/).

Uso:
    python -m app.exportar_json                 # grava em apps/web/data/
    python -m app.exportar_json --saida outro/  # outra pasta

Gera `vagas.json` (listagem, sem a descrição) e `descricoes.json` (id -> texto). São os mesmos dados do
site atual (app/dados.py); a diferença é o formato e que aqui já saem só as vagas visíveis, com a mesma
regra do front antigo: sem banco de talentos, sem "fora do escopo" e sem prazo de candidatura vencido.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path

from app.dados import DIR_ENRIQUECIDO, DIR_RAW, carregar_enriquecimentos, montar_vagas, ultimo_bruto
from enrichment.taxonomia import Taxonomia

SAIDA = Path("apps/web/data")
TAXONOMIA_JSON = Path("apps/web/src/dados/taxonomia.json")  # versionado: é conteúdo do projeto, não dado da Gupy


def visiveis(vagas: list[dict], hoje: date) -> list[dict]:
    limite = hoje.isoformat()
    return [
        v for v in vagas
        if v["contrato"] != "banco_talentos" and v["area"] != "fora_do_escopo" and not (v["prazo"] and v["prazo"][:10] < limite)
    ]


def contexto_da_taxonomia(taxonomia: Taxonomia) -> dict:
    """O que o front precisa para reconhecer as habilidades da pessoa e calcular a aderência às vagas."""
    return {
        "skills": {s.id: s.nome for s in taxonomia.skills.values()},
        "sinonimos": taxonomia.indice(),  # chave_skill(texto) -> id (inclui o nome oficial de cada skill)
        "pais": {s.id: s.pai for s in taxonomia.skills.values() if s.pai},  # quem sabe Glue também sabe AWS
    }


def exportar_taxonomia(destino: Path = TAXONOMIA_JSON) -> Path:
    """Grava skills, sinônimos e pais para o front reconhecer habilidades e calcular a aderência. Empacotado no JavaScript."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(contexto_da_taxonomia(Taxonomia.carregar()), ensure_ascii=False, indent=1, sort_keys=True) + chr(10)
    destino.write_text(texto, encoding="utf-8", newline=chr(10))
    return destino


def carregar_visiveis(
    dir_raw: Path = DIR_RAW, dir_enriquecido: Path = DIR_ENRIQUECIDO, hoje: date | None = None
) -> tuple[list[dict], datetime, Taxonomia]:
    """Última coleta já montada e filtrada: (vagas visíveis, quando foi coletada, taxonomia)."""
    arquivo = ultimo_bruto(dir_raw)
    coletada_em = datetime.fromtimestamp(arquivo.stat().st_mtime, timezone.utc)
    enriquecimentos = carregar_enriquecimentos(dir_enriquecido) if dir_enriquecido.exists() else {}
    taxonomia = Taxonomia.carregar()
    vagas = montar_vagas(json.loads(arquivo.read_text(encoding="utf-8")), enriquecimentos, coletada_em, taxonomia)
    return visiveis(vagas, hoje or date.today()), coletada_em, taxonomia


def exportar(saida: Path = SAIDA, dir_raw: Path = DIR_RAW, dir_enriquecido: Path = DIR_ENRIQUECIDO, hoje: date | None = None) -> dict:
    vagas, coletada_em, taxonomia = carregar_visiveis(dir_raw, dir_enriquecido, hoje)
    descricoes = {v["id"]: v.pop("descricao") for v in vagas}

    dados = {
        "coletada_em": coletada_em.isoformat(),
        "skills": contexto_da_taxonomia(taxonomia)["skills"],
        "vagas": vagas,
    }
    saida.mkdir(parents=True, exist_ok=True)
    (saida / "vagas.json").write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (saida / "descricoes.json").write_text(json.dumps(descricoes, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {"vagas": len(vagas), "saida": str(saida)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--saida", type=Path, default=SAIDA)
    args = parser.parse_args()
    resumo = exportar(args.saida)
    exportar_taxonomia()
    print(f"{resumo['vagas']} vagas exportadas para {resumo['saida']} e a taxonomia para {TAXONOMIA_JSON}")


if __name__ == "__main__":
    main()
