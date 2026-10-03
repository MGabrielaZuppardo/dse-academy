"""Monta uma trilha de estudo: números do mercado (determinísticos) + organização em etapas (LLM ou regras).

Princípios:
- Os percentuais e as skills vêm das vagas; o LLM não os inventa nem os altera.
- O LLM só recebe nomes, ids, percentuais e níveis da taxonomia, nunca texto de vagas (sem superfície para injeção).
- Tudo que o LLM devolve é validado; se vier inválido, a trilha sai do plano por regras.
- A divisão do básico ao avançado vem de trilhas/niveis.yaml: o nível de cada etapa é calculado a partir das
  tecnologias dentro dela, e as etapas são sempre ordenadas do básico para o avançado.
- Os links vêm de recursos.yaml (curados e verificados), nunca do LLM.
- Cada etapa termina com 5 ideias de mini-projeto: as do LLM (se houver) completadas com as de projetos.yaml.
"""

from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter

from pydantic import ValidationError

from enrichment.extractor import ChamadaLLM, CotaEsgotada
from enrichment.taxonomia import Taxonomia
from trilhas.curadoria import NIVEIS, NIVEL_PADRAO, Curadoria
from trilhas.demanda import Demanda
from trilhas.schema import PROJETOS_POR_ETAPA, EtapaLLM, TrilhaLLM

log = logging.getLogger(__name__)

TOP_SKILLS = 25  # quantas skills da área entram na trilha
SKILLS_POR_ETAPA = 6  # tamanho-alvo de uma etapa no plano por regras
MAX_ETAPAS = 8
ROTULO_NIVEL = {"basico": "básico", "intermediario": "intermediário", "avancado": "avançado"}

SYSTEM_PROMPT = (
    "Você é um mentor de carreira em dados no Brasil. Monta trilhas de estudo objetivas e realistas, do nível básico "
    "ao avançado, para quem está começando ou migrando de área. Responda SOMENTE com um objeto JSON válido, em "
    "português do Brasil, sem texto fora do JSON."
)

# (id, nome, % de vagas da área que pedem, nível)
SkillInfo = tuple[str, str, int, str]


def montar_prompt(area_nome: str, total_vagas: int, skills: list[SkillInfo]) -> str:
    linhas = "\n".join(f"- {sid} | {nome} | pedida em {pct}% das vagas | nível: {ROTULO_NIVEL[nivel]}" for sid, nome, pct, nivel in skills)
    return (
        f"Área: {area_nome} (análise de {total_vagas} vagas abertas no Brasil).\n\n"
        f"Skills mais pedidas (id | nome | demanda | nível sugerido):\n{linhas}\n\n"
        "Monte uma trilha de estudo com 4 a 8 etapas, do nível básico ao avançado, que cubra essas skills.\n"
        "Regras:\n"
        "- Em `skills`, use SOMENTE os ids listados acima, exatamente como estão escritos.\n"
        "- Cada id aparece em no máximo uma etapa. Agrupe de 2 a 6 skills por etapa, as que se estudam juntas.\n"
        "- Respeite o nível sugerido: as etapas do básico vêm primeiro, depois as do intermediário e por fim as do "
        "avançado. Não misture níveis na mesma etapa.\n"
        "- Dentro de cada nível, skills mais pedidas e fundamentais vêm antes.\n"
        "- `semanas`: inteiro de 1 a 12, para quem estuda cerca de 8 horas por semana.\n"
        "- `projetos`: 5 ideias de mini-projeto da etapa, concretas, diferentes entre si e possíveis de entregar em "
        "poucos dias, cada uma com `titulo` curto e `descricao` de uma ou duas frases.\n\n"
        'Formato: {"descricao": "...", "etapas": [{"titulo": "...", "objetivo": "...", "nivel": "basico", "semanas": 3, '
        '"projetos": [{"titulo": "...", "descricao": "..."}], "skills": ["id1", "id2"]}]}'
    )


def _extrair_json(texto: str) -> dict:
    """Aceita JSON puro ou embrulhado em ```json ... ``` (alguns modelos ignoram o modo JSON)."""
    limpo = texto.strip()
    cerca = re.match(r"^```(?:json)?\s*(.*?)\s*```$", limpo, re.DOTALL)
    return json.loads(cerca.group(1) if cerca else limpo)


def _sanear_projetos(brutos: object) -> list[dict]:
    """Descarta ideias malformadas e corta o que passar do limite, em vez de rejeitar a trilha inteira por causa delas."""
    saida = []
    for p in brutos if isinstance(brutos, list) else []:
        if not isinstance(p, dict) or not isinstance(p.get("titulo"), str) or not isinstance(p.get("descricao"), str):
            continue
        titulo, descricao = p["titulo"].strip()[:80], p["descricao"].strip()[:300]
        if len(titulo) >= 3 and len(descricao) >= 10:
            saida.append({"titulo": titulo, "descricao": descricao})
    return saida[:PROJETOS_POR_ETAPA]


def niveis_da_trilha(skills: list[tuple[str, int]], curadoria: Curadoria) -> dict[str, str]:
    """Nível de cada tecnologia desta trilha: o de niveis.yaml, com um ajuste para a trilha sempre ter os 3 níveis.

    `skills` = (id, % de demanda), da mais pedida para a menos. Se nenhuma tecnologia da área é avançada, as
    intermediárias menos pedidas (as mais especializadas da área) sobem para avançado, para a trilha não terminar
    no intermediário. Só acontece com pelo menos 4 intermediárias."""
    niveis = {sid: curadoria.nivel(sid) for sid, _ in skills}
    if "avancado" not in niveis.values():
        intermediarias = [sid for sid, _ in skills if niveis[sid] == "intermediario"]
        if len(intermediarias) >= 4:
            for sid in intermediarias[-max(2, len(intermediarias) // 4):]:
                niveis[sid] = "avancado"
    return niveis


def nivel_da_etapa(skill_ids: list[str], niveis: dict[str, str]) -> str:
    """Nível mais comum entre as tecnologias da etapa; em caso de empate, o mais básico."""
    contagem = Counter(niveis.get(sid, NIVEL_PADRAO) for sid in skill_ids)
    return max(NIVEIS, key=lambda n: (contagem[n], -NIVEIS.index(n)))


def validar_llm(texto: str, permitidos: set[str], niveis: dict[str, str]) -> TrilhaLLM:
    """Valida o formato e saneia o conteúdo: tira ids desconhecidos e repetidos, ideias malformadas e etapas vazias,
    recalcula o nível de cada etapa e as ordena do básico ao avançado. Levanta ValueError se sobrar menos de 3 etapas."""
    bruto = _extrair_json(texto)
    for etapa in bruto.get("etapas", []) if isinstance(bruto, dict) else []:
        if isinstance(etapa, dict):
            etapa["projetos"] = _sanear_projetos(etapa.get("projetos"))
            etapa["nivel"] = "basico"  # provisório: o nível real é calculado abaixo
    trilha = TrilhaLLM.model_validate(bruto)

    vistos: set[str] = set()
    etapas: list[EtapaLLM] = []
    for e in trilha.etapas:
        ids = []
        for sid in e.skills:
            if sid in permitidos and sid not in vistos:
                vistos.add(sid)
                ids.append(sid)
        if ids:
            etapas.append(e.model_copy(update={"skills": ids, "nivel": nivel_da_etapa(ids, niveis)}))
    if len(etapas) < 3:
        raise ValueError(f"o LLM devolveu só {len(etapas)} etapas utilizáveis")
    etapas.sort(key=lambda e: NIVEIS.index(e.nivel))  # estável: preserva a ordem dentro do nível
    return trilha.model_copy(update={"etapas": etapas})


def completar(trilha: TrilhaLLM, ordem: list[str], niveis: dict[str, str]) -> TrilhaLLM:
    """Skills da área que o LLM não encaixou vão para uma etapa final de aprofundamento (nenhuma se perde)."""
    usadas = {sid for e in trilha.etapas for sid in e.skills}
    sobras = [sid for sid in ordem if sid not in usadas][:12]
    if not sobras:
        return trilha
    extra = EtapaLLM(
        titulo="Aprofundamento", nivel=nivel_da_etapa(sobras, niveis), skills=sobras,
        semanas=min(12, max(2, math.ceil(len(sobras) / 2))),
        objetivo="Complete o repertório com outras tecnologias que o mercado também pede.",
    )
    etapas = sorted([*trilha.etapas, extra], key=lambda e: NIVEIS.index(e.nivel))
    return trilha.model_copy(update={"etapas": etapas})


def plano_sem_llm(area_nome: str, total_vagas: int, skills: list[SkillInfo]) -> TrilhaLLM:
    """Reserva por regras: separa as skills por nível (básico, intermediário, avançado) e fatia cada nível em etapas
    de até SKILLS_POR_ETAPA, mantendo a ordem de demanda. No máximo MAX_ETAPAS etapas no total."""
    por_nivel = {n: [s for s in skills if s[3] == n] for n in NIVEIS}
    tamanho = SKILLS_POR_ETAPA
    while sum(math.ceil(len(l) / tamanho) for l in por_nivel.values()) > MAX_ETAPAS:
        tamanho += 1

    etapas = []
    for nivel in NIVEIS:
        lista = por_nivel[nivel]
        if not lista:
            continue
        k = math.ceil(len(lista) / tamanho)
        fatia = math.ceil(len(lista) / k)
        for i in range(k):
            grupo = lista[i * fatia:(i + 1) * fatia]
            nomes = [n for _, n, _, _ in grupo]
            etapas.append(EtapaLLM(
                titulo=", ".join(nomes[:2]) + (" e mais" if len(nomes) > 2 else ""),
                objetivo=f"Aprender e praticar: {', '.join(nomes)}.",
                nivel=nivel, semanas=min(12, max(1, len(grupo))), skills=[sid for sid, _, _, _ in grupo],
            ))
    return TrilhaLLM(
        descricao=f"Baseada em {total_vagas} vagas abertas de {area_nome}: as tecnologias mais pedidas, do básico ao avançado.",
        etapas=etapas,
    )


def escolher_projetos(
    skill_ids: list[str], nivel: str, curadoria: Curadoria, proprios: list[dict], usados: set[str],
) -> list[dict]:
    """Até PROJETOS_POR_ETAPA ideias: primeiro as do LLM, depois uma de cada tecnologia da etapa por rodada (na ordem
    de demanda), por fim as gerais do nível. `usados` evita repetir título em outras etapas da mesma trilha."""
    escolhidos: list[dict] = []

    def adicionar(titulo: str, descricao: str, skills: list[str]) -> bool:
        chave = titulo.strip().lower()
        if chave in usados or len(escolhidos) >= PROJETOS_POR_ETAPA:
            return False
        usados.add(chave)
        item = {"titulo": titulo, "descricao": descricao}
        if skills:
            item["skills"] = skills
        escolhidos.append(item)
        return True

    for p in proprios:
        adicionar(p["titulo"], p["descricao"], [])
    rodada = 0
    while len(escolhidos) < PROJETOS_POR_ETAPA:
        havia = False
        for sid in skill_ids:
            ideias = curadoria.projetos.get(sid, [])
            if rodada < len(ideias):
                havia = True
                adicionar(ideias[rodada]["titulo"], ideias[rodada]["descricao"], [sid])
        if not havia:
            break
        rodada += 1
    for n in [nivel, *[x for x in NIVEIS if x != nivel]]:
        for p in curadoria.projetos_gerais.get(n, []):
            adicionar(p["titulo"], p["descricao"], [])
    return escolhidos


def conteudo_inicial(area_id: str, curadoria: Curadoria) -> list[dict]:
    """Conteúdo para começar: o geral (todas as áreas) e o da área, do mais básico ao mais avançado, sem repetir link."""
    vistos: set[str] = set()
    itens = []
    for r in [*curadoria.recursos_gerais, *curadoria.recursos_areas.get(area_id, [])]:
        if r["url"] not in vistos:
            vistos.add(r["url"])
            itens.append(r)
    return sorted(itens, key=lambda r: NIVEIS.index(r["nivel"]))


def montar_trilha(
    area_id: str, area_nome: str, total_vagas: int, demandas: list[Demanda], taxonomia: Taxonomia,
    curadoria: Curadoria, llm: ChamadaLLM | None,
) -> dict:
    """Devolve o dict final da trilha (o que vai para trilhas.json). Propaga CotaEsgotada para o chamador parar o lote."""
    top = [d for d in demandas if d.skill_id in taxonomia.skills][:TOP_SKILLS]
    niveis = niveis_da_trilha([(d.skill_id, d.pct) for d in top], curadoria)
    skills: list[SkillInfo] = [(d.skill_id, taxonomia.skills[d.skill_id].nome, d.pct, niveis[d.skill_id]) for d in top]
    ordem = [sid for sid, _, _, _ in skills]

    trilha, origem = None, "regras"
    if llm is not None:
        try:
            bruto = llm(SYSTEM_PROMPT, montar_prompt(area_nome, total_vagas, skills))
            trilha, origem = completar(validar_llm(bruto, set(ordem), niveis), ordem, niveis), "llm"
        except CotaEsgotada:
            raise
        except (ValueError, ValidationError, KeyError, AttributeError) as e:  # JSON quebrado, formato errado ou conteúdo inutilizável
            log.warning("%s: resposta do LLM descartada (%s); usando o plano por regras", area_id, str(e).splitlines()[0][:120])
    if trilha is None:
        trilha = plano_sem_llm(area_nome, total_vagas, skills)

    pct = {d.skill_id: d.pct for d in top}
    usados: set[str] = set()
    etapas = []
    for i, e in enumerate(trilha.etapas, 1):
        etapas.append({
            "id": f"{area_id}-{i}",
            "titulo": e.titulo,
            "objetivo": e.objetivo,
            "nivel": e.nivel,
            "semanas": e.semanas,
            "projetos": escolher_projetos(e.skills, e.nivel, curadoria, [p.model_dump() for p in e.projetos], usados),
            "skills": [
                {"id": sid, "nome": taxonomia.skills[sid].nome, "demanda_pct": pct[sid], "recursos": curadoria.recursos_skills.get(sid, [])}
                for sid in e.skills
            ],
        })
    return {
        "id": area_id,
        "titulo": f"Trilha de {area_nome}",
        "area": area_id,
        "descricao": trilha.descricao,
        "vagas_base": total_vagas,
        "semanas_total": sum(e["semanas"] for e in etapas),
        "origem": origem,
        "conteudo_inicial": conteudo_inicial(area_id, curadoria),
        "etapas": etapas,
    }
