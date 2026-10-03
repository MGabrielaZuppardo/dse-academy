import json

import httpx
import pytest

from enrichment.extractor import CotaEsgotada
from enrichment.taxonomia import Taxonomia
from trilhas.curadoria import NIVEIS, Curadoria, carregar_curadoria
from trilhas.demanda import AREAS_DE_TRILHA, Demanda, demanda_por_area
from trilhas.llm import cliente_openai_compat
from trilhas.montar import (
    _sanear_projetos, completar, conteudo_inicial, escolher_projetos, montar_prompt, montar_trilha,
    nivel_da_etapa, niveis_da_trilha, plano_sem_llm, validar_llm,
)
from trilhas.schema import PROJETOS_POR_ETAPA

TAX = Taxonomia.carregar()
IDS = ["sql", "python", "power_bi", "excel", "etl", "spark", "aws", "airflow", "git"]
NIVEIS_DEMO = {"sql": "basico", "python": "basico", "excel": "basico", "git": "basico", "power_bi": "basico", "etl": "basico",
               "spark": "intermediario", "aws": "intermediario", "airflow": "intermediario"}


def curadoria_demo(**extra) -> Curadoria:
    base = dict(
        niveis=NIVEIS_DEMO,
        projetos={sid: [{"titulo": f"{sid} projeto 1", "descricao": f"Primeira ideia com {sid} na prática."},
                        {"titulo": f"{sid} projeto 2", "descricao": f"Segunda ideia com {sid} na prática."}] for sid in IDS},
        projetos_gerais={n: [{"titulo": f"Geral {n} {i}", "descricao": f"Ideia geral número {i} do nível {n}."} for i in range(3)] for n in NIVEIS},
        recursos_skills={"sql": [{"titulo": "Doc", "url": "https://exemplo.org/sql", "idioma": "pt", "tipo": "documentação", "nivel": "basico"}]},
        recursos_gerais=[{"titulo": "Geral A", "url": "https://exemplo.org/a", "idioma": "pt", "tipo": "curso", "nivel": "intermediario"},
                         {"titulo": "Geral B", "url": "https://exemplo.org/b", "idioma": "en", "tipo": "curso", "nivel": "basico"}],
        recursos_areas={"bi": [{"titulo": "Área BI", "url": "https://exemplo.org/bi", "idioma": "pt", "tipo": "guia", "nivel": "basico"},
                               {"titulo": "Geral B de novo", "url": "https://exemplo.org/b", "idioma": "en", "tipo": "curso", "nivel": "basico"}]},
    )
    base.update(extra)
    return Curadoria(**base)


def vaga(area, *citadas):
    return {"area": area, "citadas": list(citadas)}


# ---------------------------------------------------------------- demanda

def test_demanda_conta_percentual_por_area_e_ignora_areas_sem_trilha():
    vagas = [vaga("bi", "power_bi", "sql")] * 3 + [vaga("bi", "sql")] + [vaga("negocio_com_dados", "excel")] * 50
    total, lista = demanda_por_area(vagas, TAX, minimo=2)["bi"]
    assert total == 4
    assert [(d.skill_id, d.vagas, d.pct) for d in lista] == [("sql", 4, 100), ("power_bi", 3, 75)]
    assert "negocio_com_dados" not in demanda_por_area(vagas, TAX, minimo=2)


def test_demanda_conta_a_skill_pai_uma_vez_por_vaga():
    vagas = [vaga("engenharia_dados", "aws_glue", "aws_s3")] * 2
    _, lista = demanda_por_area(vagas, TAX, minimo=1)["engenharia_dados"]
    assert {d.skill_id: d.vagas for d in lista}["aws"] == 2


def test_demanda_descarta_area_com_poucas_vagas():
    assert demanda_por_area([vaga("dba", "sql")] * 3, TAX, minimo=15) == {}


# ---------------------------------------------------------------- níveis

def test_niveis_da_trilha_promove_as_intermediarias_menos_pedidas_quando_falta_avancado():
    cur = curadoria_demo(niveis={"sql": "basico", "a": "intermediario", "b": "intermediario", "c": "intermediario", "d": "intermediario"})
    n = niveis_da_trilha([("sql", 90), ("a", 80), ("b", 70), ("c", 60), ("d", 50)], cur)
    assert n == {"sql": "basico", "a": "intermediario", "b": "intermediario", "c": "avancado", "d": "avancado"}


def test_niveis_da_trilha_nao_mexe_se_ja_ha_avancado_ou_se_ha_poucas_intermediarias():
    cur = curadoria_demo(niveis={"sql": "basico", "a": "intermediario", "k": "avancado"})
    assert niveis_da_trilha([("sql", 9), ("a", 8), ("k", 7)], cur) == {"sql": "basico", "a": "intermediario", "k": "avancado"}
    cur2 = curadoria_demo(niveis={"sql": "basico", "a": "intermediario", "b": "intermediario"})
    assert "avancado" not in niveis_da_trilha([("sql", 9), ("a", 8), ("b", 7)], cur2).values()


def test_nivel_da_etapa_e_o_mais_comum_e_no_empate_o_mais_basico():
    n = {"a": "basico", "b": "basico", "c": "avancado", "d": "intermediario"}
    assert nivel_da_etapa(["a", "b", "c"], n) == "basico"
    assert nivel_da_etapa(["c", "d"], n) == "intermediario"
    assert nivel_da_etapa(["a", "c"], n) == "basico"  # empate


# ---------------------------------------------------------------- validação da saída do LLM

def etapa(titulo="Etapa A", skills=("sql",), nivel="avancado", projetos=None):
    return {"titulo": titulo, "objetivo": "Aprender o essencial da área.", "nivel": nivel, "semanas": 3,
            "projetos": projetos or [], "skills": list(skills)}


def resposta(etapas, descricao="Trilha baseada nas vagas."):
    return json.dumps({"descricao": descricao, "etapas": etapas})


def test_validar_aceita_json_em_bloco_de_codigo_e_remove_ids_invalidos_e_repetidos():
    bruto = "```json\n" + resposta([
        etapa("Etapa A", ["sql", "inventada"]), etapa("Etapa B", ["python", "sql"]), etapa("Etapa C", ["spark"]),
    ]) + "\n```"
    t = validar_llm(bruto, set(IDS), NIVEIS_DEMO)
    assert [e.skills for e in t.etapas] == [["sql"], ["python"], ["spark"]]


def test_validar_ignora_o_nivel_do_llm_recalcula_pelo_yaml_e_ordena_do_basico_ao_avancado():
    # o LLM manda o nível errado e as etapas fora de ordem
    bruto = resposta([etapa("Etapa C", ["spark", "aws"], nivel="basico"), etapa("Etapa A", ["sql", "python"], nivel="avancado"),
                      etapa("Etapa B", ["airflow"], nivel="basico")])
    t = validar_llm(bruto, set(IDS), NIVEIS_DEMO)
    assert [(e.titulo, e.nivel) for e in t.etapas] == [("Etapa A", "basico"), ("Etapa C", "intermediario"), ("Etapa B", "intermediario")]


def test_validar_descarta_etapa_que_ficou_vazia_e_falha_com_menos_de_3():
    ruim = resposta([etapa("Etapa A", ["sql"]), etapa("Etapa B", ["nao_existe"]), etapa("Etapa C", ["python"])])
    with pytest.raises(ValueError):
        validar_llm(ruim, set(IDS), NIVEIS_DEMO)


def test_validar_rejeita_formato_errado():
    with pytest.raises(Exception):
        validar_llm('{"descricao": "x"}', set(IDS), NIVEIS_DEMO)
    with pytest.raises(ValueError):  # JSONDecodeError é ValueError
        validar_llm("não é json", set(IDS), NIVEIS_DEMO)


def test_sanear_projetos_descarta_malformados_corta_o_excesso_e_limita_a_5():
    brutos = [{"titulo": "Bom projeto", "descricao": "Descrição boa o bastante."}, {"titulo": "x", "descricao": "curta"},
              "texto solto", {"titulo": 3, "descricao": "Descrição boa o bastante."}, {"titulo": "T" * 200, "descricao": "D" * 500}]
    saida = _sanear_projetos(brutos + [{"titulo": f"Mais {i}", "descricao": "Descrição boa o bastante."} for i in range(6)])
    assert len(saida) == PROJETOS_POR_ETAPA
    assert saida[0]["titulo"] == "Bom projeto"
    assert len(saida[1]["titulo"]) == 80 and len(saida[1]["descricao"]) == 300
    assert _sanear_projetos(None) == [] and _sanear_projetos("x") == []


def test_projetos_malformados_do_llm_nao_derrubam_a_trilha():
    bruto = resposta([etapa("Etapa A", ["sql"], projetos=[{"titulo": 1}, "x"]), etapa("Etapa B", ["python"]), etapa("Etapa C", ["spark"])])
    assert validar_llm(bruto, set(IDS), NIVEIS_DEMO).etapas[0].projetos == []


def test_completar_poe_as_sobras_numa_etapa_final_no_nivel_certo():
    t = validar_llm(resposta([etapa("Etapa A", ["sql"]), etapa("Etapa B", ["python"]), etapa("Etapa C", ["spark"])]), set(IDS), NIVEIS_DEMO)
    c = completar(t, ["sql", "python", "spark", "aws", "git"], NIVEIS_DEMO)
    assert c.etapas[-1].titulo == "Aprofundamento" or any(e.titulo == "Aprofundamento" for e in c.etapas)
    ap = next(e for e in c.etapas if e.titulo == "Aprofundamento")
    assert ap.skills == ["aws", "git"]
    ordem = [NIVEIS.index(e.nivel) for e in c.etapas]
    assert ordem == sorted(ordem)  # continua do básico ao avançado
    assert completar(c, ["sql", "python", "spark", "aws", "git"], NIVEIS_DEMO) == c


# ---------------------------------------------------------------- plano de reserva

def skills_demo():
    return [(sid, TAX.skills[sid].nome, 90 - 5 * i, NIVEIS_DEMO[sid]) for i, sid in enumerate(IDS)]


def test_plano_sem_llm_cobre_todas_as_skills_uma_vez_e_vai_do_basico_ao_avancado():
    t = plano_sem_llm("BI", 58, skills_demo())
    assert sorted(sid for e in t.etapas for sid in e.skills) == sorted(IDS)
    ordem = [NIVEIS.index(e.nivel) for e in t.etapas]
    assert ordem == sorted(ordem)
    assert all(NIVEIS_DEMO[sid] == e.nivel for e in t.etapas for sid in e.skills)  # nunca mistura níveis
    assert 1 <= len(t.etapas) <= 8


def test_plano_sem_llm_nao_passa_de_8_etapas_nem_de_12_tecnologias_por_etapa():
    muitas = [(f"s{i}", f"Skill {i}", 50, NIVEIS[i % 3]) for i in range(40)]  # as trilhas usam no máximo 25
    etapas = plano_sem_llm("X", 99, muitas).etapas
    assert len(etapas) <= 8 and all(len(e.skills) <= 12 for e in etapas)
    assert sorted(sid for e in etapas for sid in e.skills) == sorted(s[0] for s in muitas)


# ---------------------------------------------------------------- projetos e conteúdo inicial

def test_escolher_projetos_devolve_5_uma_ideia_de_cada_tecnologia_por_rodada():
    cur = curadoria_demo()
    p = escolher_projetos(["sql", "python", "excel"], "basico", cur, [], set())
    assert len(p) == PROJETOS_POR_ETAPA
    assert [x["titulo"] for x in p[:3]] == ["sql projeto 1", "python projeto 1", "excel projeto 1"]  # 1ª rodada
    assert [x["titulo"] for x in p[3:5]] == ["sql projeto 2", "python projeto 2"]  # 2ª rodada
    assert p[0]["skills"] == ["sql"]


def test_escolher_projetos_completa_com_as_gerais_do_nivel_e_nao_repete_na_trilha():
    cur = curadoria_demo()
    usados: set[str] = set()
    a = escolher_projetos(["sql"], "basico", cur, [], usados)  # só 2 ideias de sql: o resto vem das gerais
    assert len(a) == 5 and [x["titulo"] for x in a[2:]] == ["Geral basico 0", "Geral basico 1", "Geral basico 2"]
    b = escolher_projetos(["python"], "basico", cur, [], usados)  # as gerais do básico já foram usadas
    assert len(b) == 5 and not ({x["titulo"] for x in a} & {x["titulo"] for x in b})


def test_escolher_projetos_poe_as_ideias_do_llm_primeiro_sem_duplicar():
    cur = curadoria_demo()
    proprios = [{"titulo": "Ideia do LLM", "descricao": "Descrição da ideia do LLM."}, {"titulo": "SQL PROJETO 1", "descricao": "Igual a uma curada."}]
    p = escolher_projetos(["sql", "python"], "basico", cur, proprios, set())
    assert p[0]["titulo"] == "Ideia do LLM" and "skills" not in p[0]
    assert len({x["titulo"].lower() for x in p}) == len(p) == 5


def test_conteudo_inicial_junta_geral_e_area_sem_repetir_link_e_ordena_do_basico_ao_avancado():
    itens = conteudo_inicial("bi", curadoria_demo())
    assert [i["titulo"] for i in itens] == ["Geral B", "Área BI", "Geral A"]
    assert [i["titulo"] for i in conteudo_inicial("dba", curadoria_demo())] == ["Geral B", "Geral A"]


# ---------------------------------------------------------------- montagem

def demandas_demo():
    return [Demanda(sid, 10, p) for sid, _, p, _ in skills_demo()]


def test_montar_trilha_com_llm_valido_anexa_numeros_links_e_5_projetos_por_etapa():
    cur = curadoria_demo()
    llm = lambda s, p: resposta([etapa("Etapa A", ["sql", "python"]), etapa("Etapa B", ["spark"]), etapa("Etapa C", ["aws"])])
    t = montar_trilha("bi", "BI", 58, demandas_demo(), TAX, cur, llm)
    assert t["origem"] == "llm"
    sql = t["etapas"][0]["skills"][0]
    assert sql["demanda_pct"] == 90 and sql["recursos"] == cur.recursos_skills["sql"]
    assert {s["id"] for e in t["etapas"] for s in e["skills"]} == set(IDS)  # o que o LLM não encaixou não se perde
    assert all(len(e["projetos"]) == PROJETOS_POR_ETAPA for e in t["etapas"])
    ordem = [NIVEIS.index(e["nivel"]) for e in t["etapas"]]
    assert ordem == sorted(ordem)
    assert t["semanas_total"] == sum(e["semanas"] for e in t["etapas"])
    assert [c["titulo"] for c in t["conteudo_inicial"]] == ["Geral B", "Área BI", "Geral A"]


def test_montar_trilha_cai_para_regras_quando_o_llm_devolve_lixo():
    t = montar_trilha("bi", "BI", 58, demandas_demo(), TAX, curadoria_demo(), lambda s, p: "desculpe, não consegui")
    assert t["origem"] == "regras"
    assert {s["id"] for e in t["etapas"] for s in e["skills"]} == set(IDS)
    assert all(len(e["projetos"]) == PROJETOS_POR_ETAPA for e in t["etapas"])


def test_montar_trilha_sem_llm_e_cota_esgotada():
    assert montar_trilha("bi", "BI", 58, demandas_demo(), TAX, curadoria_demo(), None)["origem"] == "regras"

    def sem_cota(s, p):
        raise CotaEsgotada("acabou")

    with pytest.raises(CotaEsgotada):  # quem chama decide parar o lote
        montar_trilha("bi", "BI", 58, demandas_demo(), TAX, curadoria_demo(), sem_cota)


def test_prompt_so_tem_skills_da_taxonomia_numeros_e_niveis():
    p = montar_prompt("BI", 58, skills_demo())
    assert "sql | SQL | pedida em 90% das vagas | nível: básico" in p
    assert "spark | Apache Spark" in p and "nível: intermediário" in p
    assert "somente os ids listados" in p.lower()
    assert "5 ideias de mini-projeto" in p


# ---------------------------------------------------------------- cliente HTTP (Groq/Ollama)

def cliente(respostas, esperas):
    chamadas = []

    def tratar(request: httpx.Request) -> httpx.Response:
        chamadas.append(json.loads(request.content))
        assert request.headers["authorization"] == "Bearer chave"
        return respostas.pop(0)

    chamar = cliente_openai_compat("https://api.exemplo.com/v1", "chave", "modelo-x", transporte=httpx.MockTransport(tratar), dormir=esperas.append)
    return chamar, chamadas


def ok(texto='{"a": 1}'):
    return httpx.Response(200, json={"choices": [{"message": {"content": texto}}]})


def test_cliente_envia_modo_json_e_devolve_o_conteudo():
    chamar, chamadas = cliente([ok()], [])
    assert chamar("sys", "oi") == '{"a": 1}'
    assert chamadas[0]["response_format"] == {"type": "json_object"}
    assert chamadas[0]["model"] == "modelo-x"
    assert chamadas[0]["messages"][0] == {"role": "system", "content": "sys"}


def test_cliente_repete_429_respeitando_retry_after():
    esperas = []
    chamar, chamadas = cliente([httpx.Response(429, headers={"retry-after": "7"}), ok()], esperas)
    assert chamar("s", "p") == '{"a": 1}'
    assert esperas == [7.0] and len(chamadas) == 2


def test_cliente_429_persistente_vira_cota_esgotada():
    chamar, _ = cliente([httpx.Response(429)] * 3, [])
    with pytest.raises(CotaEsgotada):
        chamar("s", "p")


def test_cliente_erro_4xx_nao_repete():
    chamar, chamadas = cliente([httpx.Response(401)], [])
    with pytest.raises(httpx.HTTPStatusError):
        chamar("s", "p")
    assert len(chamadas) == 1


# ---------------------------------------------------------------- integridade dos arquivos de conteúdo (YAML)

def test_recursos_yaml_estrutura_links_https_niveis_e_idiomas():
    c = carregar_curadoria()
    assert len(c.recursos_gerais) >= 10, "conteúdo geral muito pequeno"
    itens = [*c.recursos_gerais, *[r for rs in c.recursos_areas.values() for r in rs], *[r for rs in c.recursos_skills.values() for r in rs]]
    assert len(itens) >= 150
    for r in itens:
        assert r["url"].startswith("https://"), r
        assert r["titulo"] and r["tipo"] and r["idioma"] in ("pt", "en"), r
        assert r["nivel"] in NIVEIS, r
        assert "licenca" not in r or r["licenca"], r
    for sid in c.recursos_skills:
        assert sid in TAX.skills, f"{sid} não existe na taxonomia"
    for area in c.recursos_areas:
        assert area in AREAS_DE_TRILHA, f"{area} não é uma área de trilha"


def test_recursos_yaml_sem_link_repetido_dentro_de_uma_lista():
    c = carregar_curadoria()
    for nome, lista in [("gerais", c.recursos_gerais), *c.recursos_areas.items(), *c.recursos_skills.items()]:
        urls = [r["url"] for r in lista]
        assert len(urls) == len(set(urls)), f"link repetido em {nome}"


def test_as_tecnologias_basicas_tem_bastante_conteudo():
    c = carregar_curadoria()
    basicas = [sid for sid, n in c.niveis.items() if n == "basico" and sid in c.recursos_skills]
    for sid in ("sql", "python", "git", "excel", "estatistica", "power_bi"):
        assert sum(1 for r in c.recursos_skills[sid] if r["nivel"] == "basico") >= 3, f"{sid} com pouco conteúdo básico"
    assert len(basicas) >= 18


def test_niveis_yaml_so_tem_ids_da_taxonomia_sem_repeticao():
    c = carregar_curadoria()
    assert set(c.niveis.values()) == set(NIVEIS)
    for sid in c.niveis:
        assert sid in TAX.skills, f"{sid} não existe na taxonomia"
    import yaml
    bruto = yaml.safe_load((carregar_curadoria.__globals__["PASTA"] / "niveis.yaml").read_text(encoding="utf-8"))
    todos = [sid for ids in bruto.values() for sid in ids]
    assert len(todos) == len(set(todos)), "tecnologia em dois níveis"


def test_projetos_yaml_ideias_validas_para_o_schema_e_cobrindo_todas_as_tecnologias_com_nivel():
    c = carregar_curadoria()
    for n in NIVEIS:
        assert len(c.projetos_gerais[n]) >= 3, f"poucas ideias gerais no nível {n}"
    for sid, ideias in c.projetos.items():
        assert sid in TAX.skills, f"{sid} não existe na taxonomia"
        assert len(ideias) >= 2, f"{sid} com menos de 2 ideias"
        titulos = [i["titulo"].lower() for i in ideias]
        assert len(titulos) == len(set(titulos)), f"título repetido em {sid}"
    for ideia in [*[i for l in c.projetos.values() for i in l], *[i for l in c.projetos_gerais.values() for i in l]]:
        assert 3 <= len(ideia["titulo"]) <= 80, ideia
        assert 10 <= len(ideia["descricao"]) <= 300, ideia
    sem_ideias = [sid for sid in c.niveis if sid not in c.projetos]
    assert not sem_ideias, f"tecnologias com nível mas sem ideias de projeto: {sem_ideias}"


def test_todas_as_areas_de_trilha_existem():
    assert len(AREAS_DE_TRILHA) == 9
