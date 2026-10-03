"""Quanto o mercado pede cada skill, por área. É daqui que vêm os números das trilhas (nada disso passa por LLM)."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from enrichment.taxonomia import Taxonomia

# Áreas que viram trilha. "negocio_com_dados" é função de negócio e "fora_do_escopo" nem entra no portal.
AREAS_DE_TRILHA = {
    "engenharia_dados": "Engenharia de Dados",
    "analise_dados": "Análise de Dados",
    "ciencia_dados": "Ciência de Dados",
    "ml_engineering": "Machine Learning",
    "analytics_engineering": "Analytics Engineering",
    "bi": "BI",
    "governanca_dados": "Governança de Dados",
    "dba": "Banco de Dados (DBA)",
    "gestao_dados": "Gestão de Dados",
}

MINIMO_VAGAS = 15  # abaixo disso o percentual não é confiável e a trilha não é gerada


@dataclass(frozen=True)
class Demanda:
    skill_id: str
    vagas: int
    pct: int  # % das vagas da área que citam a skill (inteiro, para exibir)


def demanda_por_area(vagas: list[dict], taxonomia: Taxonomia, minimo: int = MINIMO_VAGAS) -> dict[str, tuple[int, list[Demanda]]]:
    """area -> (total de vagas da área, skills ordenadas da mais pedida para a menos).

    Quem pede "AWS Glue" também pede "AWS": a skill-pai é contada uma vez por vaga, como no site atual.
    Áreas com menos de `minimo` vagas ficam de fora.
    """
    por_area: dict[str, list[set[str]]] = {}
    for v in vagas:
        area = v.get("area")
        if area not in AREAS_DE_TRILHA:
            continue
        skills = set()
        for sid in v["citadas"]:
            skills.add(sid)
            skill = taxonomia.skills.get(sid)
            if skill and skill.pai:
                skills.add(skill.pai)
        por_area.setdefault(area, []).append(skills)

    saida = {}
    for area, conjuntos in por_area.items():
        total = len(conjuntos)
        if total < minimo:
            continue
        contagem = Counter(sid for c in conjuntos for sid in c)
        ordenadas = sorted(contagem.items(), key=lambda kv: (-kv[1], kv[0]))
        saida[area] = (total, [Demanda(sid, n, round(100 * n / total)) for sid, n in ordenadas])
    return saida
