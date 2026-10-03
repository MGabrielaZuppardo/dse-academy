"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TIPOS_RELATO } from "@/lib/relato";
import { slugDaVaga } from "@/lib/rotulos";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { Carregando, Erro, SELECT } from "../ui";

type Relato = {
  id: number; vaga_id: string; titulo: string | null; empresa: string | null; url: string | null;
  tipo: string; stacks: string[]; detalhe: string | null; criado_em: string;
};

const NOME_TIPO: Record<string, string> = Object.fromEntries(TIPOS_RELATO);

export default function ReportesAdmin() {
  const [itens, setItens] = useState<Relato[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    let vivo = true;
    void supabaseNoNavegador().from("reportes_vaga").select("id,vaga_id,titulo,empresa,url,tipo,stacks,detalhe,criado_em").order("criado_em", { ascending: false }).limit(200).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn(error.message); setErro("Não foi possível carregar os relatos."); return; }
      setItens(data as Relato[]);
    });
    return () => { vivo = false; };
  }, []);

  if (erro) return <Erro texto={erro} />;
  if (!itens) return <Carregando />;
  const visiveis = filtro === "todos" ? itens : itens.filter((r) => r.tipo === filtro);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-titulo">Relatos de erro em vagas ({visiveis.length})</h2>
        <label className="text-sm text-suave">
          Tipo{" "}
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={SELECT}>
            <option value="todos">Todos</option>
            {TIPOS_RELATO.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
      </div>
      {visiveis.length === 0 ? (
        <p className="mt-4 text-suave">Nenhum relato neste tipo.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visiveis.map((r) => (
            <li key={r.id} className="rounded-2xl border border-borda bg-superficie p-4">
              <p className="text-sm text-suave">{NOME_TIPO[r.tipo] ?? r.tipo} · {new Date(r.criado_em).toLocaleDateString("pt-BR")}</p>
              <h3 className="font-display text-lg font-semibold text-titulo">
                <Link href={`/vagas/${slugDaVaga(r.vaga_id)}`} className="hover:text-link">{r.titulo ?? r.vaga_id}</Link>
                {r.empresa && <span className="font-normal text-suave"> · {r.empresa}</span>}
              </h3>
              {r.stacks.length > 0 && <p className="mt-1 text-sm text-tinta">Tecnologias apontadas como erradas: {r.stacks.join(", ")}</p>}
              {r.detalhe && <p className="mt-1 text-tinta">{r.detalhe}</p>}
              {r.url && <p className="mt-1 text-sm"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-link underline">Abrir a vaga na origem</a></p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
