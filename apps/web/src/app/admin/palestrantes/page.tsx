"use client";

import { useEffect, useState } from "react";
import { STATUS_PALESTRANTE } from "@/lib/admin/resumo";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { Carregando, Erro, SELECT } from "../ui";

type Palestrante = {
  id: string; nome: string; email: string; cargo: string | null; empresa: string | null; bio: string; linkedin: string | null;
  temas: string[]; formatos: string[]; modalidade: string; cidade: string | null; uf: string | null;
  aceite_publicacao: boolean; status: string; criado_em: string;
};

const COLUNAS = "id,nome,email,cargo,empresa,bio,linkedin,temas,formatos,modalidade,cidade,uf,aceite_publicacao,status,criado_em";

export default function PalestrantesAdmin() {
  const [itens, setItens] = useState<Palestrante[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void supabaseNoNavegador().from("palestrantes").select(COLUNAS).order("criado_em", { ascending: false }).limit(200).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn(error.message); setErro("Não foi possível carregar os palestrantes."); return; }
      setItens(data as Palestrante[]);
    });
    return () => { vivo = false; };
  }, []);

  async function mudar(id: string, status: string) {
    setAviso(null);
    const { error } = await supabaseNoNavegador().from("palestrantes").update({ status }).eq("id", id);
    if (error) { console.warn(error.message); setAviso("Não foi possível alterar a situação. Tente de novo."); return; }
    setItens((atual) => atual && atual.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  if (erro) return <Erro texto={erro} />;
  if (!itens) return <Carregando />;
  const visiveis = filtro === "todos" ? itens : itens.filter((p) => p.status === filtro);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-titulo">Palestrantes cadastrados ({visiveis.length})</h2>
        <label className="text-sm text-suave">
          Situação{" "}
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={SELECT}>
            <option value="todos">Todas</option>
            {STATUS_PALESTRANTE.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
      </div>
      {aviso && <p role="alert" className="mt-3 font-medium text-erro">{aviso}</p>}
      {visiveis.length === 0 ? (
        <p className="mt-4 text-suave">Nenhum cadastro nesta situação.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visiveis.map((p) => (
            <li key={p.id} className="rounded-2xl border border-borda bg-superficie p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-titulo">{p.nome}</h3>
                  <p className="text-sm text-suave">
                    {[p.cargo, p.empresa].filter(Boolean).join(" · ") || "Sem cargo informado"} · <a href={`mailto:${p.email}`} className="text-link underline">{p.email}</a>
                  </p>
                </div>
                <label className="text-sm text-suave">
                  <span className="sr-only">Situação do cadastro de {p.nome}</span>
                  <select value={p.status} onChange={(e) => void mudar(p.id, e.target.value)} className={SELECT}>
                    {STATUS_PALESTRANTE.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-tinta">{p.bio}</p>
              <p className="mt-2 text-sm text-suave">
                Temas: {p.temas.join(", ")} · Formatos: {p.formatos.join(", ")} · {p.modalidade}
                {p.cidade ? ` · ${p.cidade}${p.uf ? `/${p.uf}` : ""}` : ""} · {p.aceite_publicacao ? "autoriza aparecer no site" : "não autorizou aparecer no site"}
              </p>
              {p.linkedin && <p className="mt-2 text-sm"><a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-link underline">LinkedIn</a></p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
