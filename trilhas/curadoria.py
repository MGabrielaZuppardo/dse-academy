"""Conteúdo escrito por pessoas que alimenta as trilhas: recursos de estudo, nível de cada tecnologia e ideias de projeto.

Fica em arquivos YAML ao lado deste módulo (recursos.yaml, niveis.yaml, projetos.yaml) para que qualquer pessoa da
comunidade possa revisar e ampliar sem mexer em código.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

PASTA = Path(__file__).parent

NIVEIS = ("basico", "intermediario", "avancado")
NIVEL_PADRAO = "intermediario"  # tecnologia fora de niveis.yaml


@dataclass
class Curadoria:
    recursos_skills: dict[str, list[dict]] = field(default_factory=dict)
    recursos_gerais: list[dict] = field(default_factory=list)
    recursos_areas: dict[str, list[dict]] = field(default_factory=dict)
    niveis: dict[str, str] = field(default_factory=dict)  # skill id -> nível
    projetos: dict[str, list[dict]] = field(default_factory=dict)  # skill id -> ideias
    projetos_gerais: dict[str, list[dict]] = field(default_factory=dict)  # nível -> ideias

    def nivel(self, skill_id: str) -> str:
        return self.niveis.get(skill_id, NIVEL_PADRAO)


def _ler(nome: str, pasta: Path) -> dict:
    return yaml.safe_load((pasta / nome).read_text(encoding="utf-8")) or {}


def carregar_curadoria(pasta: Path = PASTA) -> Curadoria:
    recursos = _ler("recursos.yaml", pasta)
    niveis_yaml = _ler("niveis.yaml", pasta)
    projetos = _ler("projetos.yaml", pasta)
    geral = projetos.pop("geral", {})
    return Curadoria(
        recursos_skills=recursos.get("skills", {}),
        recursos_gerais=recursos.get("gerais", []),
        recursos_areas=recursos.get("areas", {}),
        niveis={sid: nivel for nivel, ids in niveis_yaml.items() for sid in ids},
        projetos=projetos,
        projetos_gerais=geral,
    )


def todos_os_recursos(c: Curadoria) -> list[tuple[str, dict]]:
    """(onde está, item) de todos os recursos, para a verificação de links."""
    itens = [("gerais", r) for r in c.recursos_gerais]
    itens += [(f"area:{a}", r) for a, rs in c.recursos_areas.items() for r in rs]
    itens += [(sid, r) for sid, rs in c.recursos_skills.items() for r in rs]
    return itens
