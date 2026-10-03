"""O que o LLM devolve para uma trilha. Tudo que sai dele passa por aqui antes de virar JSON do site."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Nível da etapa: calculado a partir do nível das tecnologias dentro dela (trilhas/niveis.yaml), nunca do que o LLM disser.
NivelEtapa = Literal["basico", "intermediario", "avancado"]

PROJETOS_POR_ETAPA = 5


class ProjetoLLM(BaseModel):
    titulo: str = Field(min_length=3, max_length=80)
    descricao: str = Field(min_length=10, max_length=300)


class EtapaLLM(BaseModel):
    titulo: str = Field(min_length=3, max_length=80)
    objetivo: str = Field(min_length=10, max_length=300)
    nivel: NivelEtapa
    semanas: int = Field(ge=1, le=12)
    projetos: list[ProjetoLLM] = Field(default_factory=list, max_length=PROJETOS_POR_ETAPA)
    skills: list[str] = Field(min_length=1, max_length=12)  # ids da taxonomia


class TrilhaLLM(BaseModel):
    descricao: str = Field(min_length=10, max_length=400)
    etapas: list[EtapaLLM] = Field(min_length=1, max_length=8)
