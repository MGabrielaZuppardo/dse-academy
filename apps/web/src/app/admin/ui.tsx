import type { ReactNode } from "react";
import { larguraDaBarra } from "@/lib/admin/resumo";

export function Kpi({ valor, rotulo, detalhe }: { valor: number | string; rotulo: string; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-superficie p-4">
      <p className="font-display text-3xl font-bold text-titulo">{valor}</p>
      <p className="mt-1 text-sm text-suave">{rotulo}</p>
      {detalhe && <p className="mt-1 text-xs text-suave">{detalhe}</p>}
    </div>
  );
}

export function Quadro({ titulo, children, id }: { titulo: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-borda bg-superficie p-5">
      <h2 id={id} className="font-display text-lg font-semibold text-titulo">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Barras horizontais com o valor ao lado. Sem dados, mostra o texto `vazio`. */
export function Barras({ itens, vazio = "Ainda sem dados." }: { itens: { nome: string; n: number }[]; vazio?: string }) {
  const maximo = Math.max(0, ...itens.map((i) => i.n));
  if (itens.length === 0 || maximo === 0) return <p className="text-suave">{vazio}</p>;
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.nome}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-tinta">{i.nome}</span>
            <strong className="text-titulo">{i.n}</strong>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-fundo" aria-hidden="true">
            <div className="h-full rounded-full bg-azul" style={{ width: `${larguraDaBarra(i.n, maximo)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return <p role="status" className="text-suave">{texto}</p>;
}

export function Erro({ texto }: { texto: string }) {
  return <p role="alert" className="font-medium text-erro">{texto}</p>;
}

export const SELECT = "rounded-lg border border-borda bg-superficie px-2 py-1.5 text-sm text-titulo";
