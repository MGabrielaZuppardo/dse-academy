"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AREAS, MODELOS, NIVEIS, NOME_NIVEL, slugDaVaga } from "@/lib/rotulos";
import { norm } from "@/lib/texto";

export type ItemVaga = {
  id: string;
  titulo: string;
  empresa: string;
  local: string;
  modelo: string | null;
  area: string | null;
  senioridade: string | null;
  stacks: string[];
  publicada: string;
};

const POR_PAGINA = 20;
const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

export function ListaVagas({ itens }: { itens: ItemVaga[] }) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState("");
  const [modelo, setModelo] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  const filtradas = useMemo(() => {
    const termos = norm(q).split(/\s+/).filter(Boolean);
    return itens.filter((v) => {
      if (area && v.area !== area) return false;
      if (nivel && v.senioridade !== nivel) return false;
      if (modelo && v.modelo !== modelo) return false;
      if (!termos.length) return true;
      const texto = norm(`${v.titulo} ${v.empresa} ${v.stacks.join(" ")}`);
      return termos.every((t) => texto.includes(t));
    });
  }, [itens, q, area, nivel, modelo]);

  const mudou = (f: () => void) => { f(); setLimite(POR_PAGINA); };

  return (
    <div className="mt-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-2xl border border-borda bg-superficie p-4 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <label htmlFor="q" className="block font-medium text-titulo">Buscar por cargo, empresa ou tecnologia</label>
          <input id="q" type="search" value={q} onChange={(e) => mudou(() => setQ(e.target.value))} placeholder="ex.: engenheiro de dados spark" className={campo} />
        </div>
        <div>
          <label htmlFor="area" className="block font-medium text-titulo">Área</label>
          <select id="area" value={area} onChange={(e) => mudou(() => setArea(e.target.value))} className={campo}>
            <option value="">Todas</option>
            {Object.entries(AREAS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nivel" className="block font-medium text-titulo">Nível</label>
          <select id="nivel" value={nivel} onChange={(e) => mudou(() => setNivel(e.target.value))} className={campo}>
            <option value="">Todos</option>
            {NIVEIS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="modelo" className="block font-medium text-titulo">Modelo</label>
          <select id="modelo" value={modelo} onChange={(e) => mudou(() => setModelo(e.target.value))} className={campo}>
            <option value="">Todos</option>
            {Object.entries(MODELOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={() => mudou(() => { setQ(""); setArea(""); setNivel(""); setModelo(""); })} className="rounded-lg border border-borda px-4 py-2 text-suave hover:border-link">
            Limpar filtros
          </button>
        </div>
      </form>

      <p role="status" aria-live="polite" className="mt-4 text-sm text-suave">
        {filtradas.length === 0 ? "Nenhuma vaga encontrada com esses filtros." : `${filtradas.length} ${filtradas.length === 1 ? "vaga" : "vagas"}`}
      </p>

      <ul className="mt-2 space-y-3">
        {filtradas.slice(0, limite).map((v) => (
          <li key={v.id}>
            <Link href={`/vagas/${slugDaVaga(v.id)}`} className="block rounded-2xl border border-borda bg-superficie p-4 transition hover:border-link">
              <h2 className="font-display text-lg font-semibold text-titulo">{v.titulo}</h2>
              <p className="text-suave">
                {v.empresa} · {v.local}{v.modelo ? ` · ${MODELOS[v.modelo] ?? v.modelo}` : ""} · {v.publicada}
              </p>
              <p className="mt-2 flex flex-wrap gap-2 text-sm">
                {v.senioridade && <span className="rounded-full bg-marinho px-2.5 py-0.5 text-white">{NOME_NIVEL[v.senioridade] ?? "Nível não identificado"}</span>}
                {v.area && AREAS[v.area] && <span className="rounded-full border border-borda px-2.5 py-0.5 text-suave">{AREAS[v.area]}</span>}
                {v.stacks.slice(0, 6).map((s) => <span key={s} className="rounded-full bg-fundo px-2.5 py-0.5 text-titulo">{s}</span>)}
                {v.stacks.length > 6 && <span className="px-1 py-0.5 text-suave">+{v.stacks.length - 6}</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {filtradas.length > limite && (
        <button type="button" onClick={() => setLimite(limite + POR_PAGINA)} className="mt-4 rounded-lg bg-azul px-5 py-2.5 font-semibold text-white hover:opacity-90">
          Mostrar mais vagas
        </button>
      )}
    </div>
  );
}
