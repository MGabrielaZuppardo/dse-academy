"use client";

import { useEffect, useState } from "react";
import { diaCurto, METRICAS, serieAcumulada, type Historico, type Metrica } from "@/lib/admin/resumo";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { Carregando, Erro, SELECT } from "./ui";

const PERIODOS = [7, 30, 90] as const;
const LARGURA = 600;
const ALTURA = 160;

/** Linha do total acumulado, com colunas dos novos por dia ao fundo. */
function Grafico({ pontos }: { pontos: { dia: string; novos: number; total: number }[] }) {
  const maxTotal = Math.max(1, ...pontos.map((p) => p.total));
  const minTotal = Math.min(...pontos.map((p) => p.total));
  const maxNovos = Math.max(1, ...pontos.map((p) => p.novos));
  const passo = LARGURA / pontos.length;
  const faixa = Math.max(1, maxTotal - minTotal);
  const y = (t: number) => ALTURA - 10 - ((t - minTotal) / faixa) * (ALTURA - 30);
  const linha = pontos.map((p, i) => `${(i * passo + passo / 2).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="mt-3 h-40 w-full" role="img" aria-label={`Evolução de ${diaCurto(pontos[0].dia)} a ${diaCurto(pontos[pontos.length - 1].dia)}: de ${pontos[0].total} para ${pontos[pontos.length - 1].total}.`}>
      {pontos.map((p, i) => {
        const h = (p.novos / maxNovos) * 40;
        return <rect key={p.dia} x={i * passo + 1} y={ALTURA - h} width={Math.max(1, passo - 2)} height={h} className="fill-azul" opacity="0.35"><title>{`${diaCurto(p.dia)}: +${p.novos} (total ${p.total})`}</title></rect>;
      })}
      <polyline points={linha} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-azul" />
    </svg>
  );
}

export function HistoricoAdmin() {
  const [metrica, setMetrica] = useState<Metrica>("usuarios");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>(30);
  const [dados, setDados] = useState<Historico | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void supabaseNoNavegador().rpc("admin_historico", { dias: 90 }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) {
        console.warn("admin_historico indisponível:", error.message);
        setErro(error.code === "42883" || error.code === "PGRST202"
          ? "O histórico ainda não está disponível: falta aplicar a migration 008 no Supabase."
          : "Não foi possível carregar o histórico agora.");
        return;
      }
      setDados(data as Historico);
    });
    return () => { vivo = false; };
  }, []);

  if (erro) return <Erro texto={erro} />;
  if (!dados) return <Carregando />;

  const nomeLongo = METRICAS.find(([id]) => id === metrica)?.[2] ?? "";
  const pontos = serieAcumulada(dados, metrica, periodo);
  const novosNoPeriodo = pontos.reduce((a, p) => a + p.novos, 0);
  const total = pontos[pontos.length - 1].total;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-suave">
          Indicador{" "}
          <select value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)} className={SELECT}>
            {METRICAS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Período" className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p} type="button" onClick={() => setPeriodo(p)} aria-pressed={periodo === p}
              className={`min-h-9 rounded-lg border px-3 text-sm font-medium ${periodo === p ? "border-transparent bg-azul text-white" : "border-borda bg-superficie text-titulo hover:border-link"}`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-tinta">
        <strong className="font-display text-2xl text-titulo">{total}</strong> {nomeLongo} no total · <strong className="text-titulo">+{novosNoPeriodo}</strong> nos últimos {periodo} dias
      </p>
      <Grafico pontos={pontos} />
      <div className="flex justify-between text-xs text-suave" aria-hidden="true">
        <span>{diaCurto(pontos[0].dia)}</span>
        <span>{diaCurto(pontos[pontos.length - 1].dia)}</span>
      </div>
      <p className="mt-2 text-xs text-suave">A linha mostra o total acumulado; as colunas, os novos de cada dia. Calculado a partir das datas de criação: quem apagou a conta deixa de aparecer no passado.</p>
    </>
  );
}
