from datetime import date

import json

from app.exportar_json import TAXONOMIA_JSON, contexto_da_taxonomia, visiveis
from enrichment.taxonomia import Taxonomia, chave_skill


def vaga(**extra):
    base = {"id": "1", "contrato": "clt", "area": "engenharia_dados", "prazo": None}
    return {**base, **extra}


def test_mantem_vaga_normal_e_sem_prazo():
    assert visiveis([vaga()], date(2026, 10, 2)) == [vaga()]


def test_remove_banco_de_talentos_e_fora_do_escopo():
    vagas = [vaga(id="a", contrato="banco_talentos"), vaga(id="b", area="fora_do_escopo"), vaga(id="c")]
    assert [v["id"] for v in visiveis(vagas, date(2026, 10, 2))] == ["c"]


def test_remove_prazo_vencido_mas_mantem_o_do_proprio_dia():
    vagas = [vaga(id="vencida", prazo="2026-10-01T23:59:00"), vaga(id="hoje", prazo="2026-10-02T10:00:00"), vaga(id="futura", prazo="2026-11-01")]
    assert [v["id"] for v in visiveis(vagas, date(2026, 10, 2))] == ["hoje", "futura"]


def test_contexto_da_taxonomia_traz_sinonimos_e_pais_e_reconhece_o_nome_oficial_de_toda_skill():
    taxonomia = Taxonomia.carregar()
    c = contexto_da_taxonomia(taxonomia)
    assert set(c) == {"skills", "sinonimos", "pais"}
    # o perfil da pessoa guarda o nome oficial: ele tem que resolver para a própria skill
    for sid, nome in c["skills"].items():
        assert c["sinonimos"][chave_skill(nome)] == sid, nome
    assert c["pais"]["aws_glue"] == "aws"


def test_taxonomia_json_versionada_esta_em_dia_com_o_yaml():
    esperado = contexto_da_taxonomia(Taxonomia.carregar())
    atual = json.loads(TAXONOMIA_JSON.read_text(encoding="utf-8"))
    assert atual == esperado, "apps/web/src/dados/taxonomia.json desatualizado: rode  python -m app.exportar_json  e faça o commit"
