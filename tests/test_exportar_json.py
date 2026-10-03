from datetime import date

from app.exportar_json import visiveis


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
