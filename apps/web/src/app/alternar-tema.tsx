"use client";

import { useSyncExternalStore } from "react";

type Tema = "light" | "dark";

/** O tema vive no atributo data-theme do <html> (definido pelo script do layout). Aqui só lemos e alteramos. */
function assinar(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observador.disconnect();
}

const temaAtual = (): Tema => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const temaNoServidor = (): Tema => "light";

export function AlternarTema() {
  const tema = useSyncExternalStore(assinar, temaAtual, temaNoServidor);
  const escuro = tema === "dark";

  function alternar() {
    const novo: Tema = escuro ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("tema", novo); } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label="Modo escuro"
      title={escuro ? "Voltar ao modo claro" : "Usar o modo escuro"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 text-white hover:border-azul-claro hover:text-azul-claro"
    >
      {escuro ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
