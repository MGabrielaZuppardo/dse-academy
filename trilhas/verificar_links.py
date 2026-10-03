"""Confere se os links de trilhas/recursos.yaml ainda respondem.

Uso:  python -m trilhas.verificar_links
Sai com código 1 se algum link falhar. Alguns sites bloqueiam robôs (403): confira esses no navegador antes de remover.
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor

import httpx

from trilhas.curadoria import carregar_curadoria, todos_os_recursos

_CABECALHOS = {"User-Agent": "Mozilla/5.0 (verificacao de links - dse-academy)"}


def _checar(item: tuple[str, str]) -> tuple[str, str, str]:
    sid, url = item
    try:
        r = httpx.get(url, headers=_CABECALHOS, follow_redirects=True, timeout=20)
        return sid, url, "ok" if r.status_code == 200 else f"HTTP {r.status_code}"
    except httpx.HTTPError as e:
        return sid, url, type(e).__name__


def main() -> int:
    itens = [(onde, r["url"]) for onde, r in todos_os_recursos(carregar_curadoria())]
    with ThreadPoolExecutor(8) as pool:
        resultados = list(pool.map(_checar, itens))
    ruins = [r for r in resultados if r[2] != "ok"]
    for sid, url, motivo in ruins:
        print(f"FALHOU  {sid:18} {motivo:12} {url}")
    print(f"{len(resultados) - len(ruins)} de {len(resultados)} links ok")
    return 1 if ruins else 0


if __name__ == "__main__":
    sys.exit(main())
