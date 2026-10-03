"use client";

import { useEffect, useState } from "react";
import { STATUS_ARTIGO } from "@/lib/admin/resumo";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { Carregando, Erro, SELECT } from "../ui";

type Artigo = {
  id: string; nome: string; email: string; titulo: string; resumo: string; tags: string[]; idioma: string;
  link_rascunho: string; perfil_medium: string | null; linkedin: string | null; data_desejada: string | null;
  status: string; criado_em: string;
};

const COLUNAS = "id,nome,email,titulo,resumo,tags,idioma,link_rascunho,perfil_medium,linkedin,data_desejada,status,criado_em";

export default function ArtigosAdmin() {
  const [itens, setItens] = useState<Artigo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void supabaseNoNavegador().from("submissoes_artigos").select(COLUNAS).order("criado_em", { ascending: false }).limit(200).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn(error.message); setErro("Não foi possível carregar os artigos."); return; }
      setItens(data as Artigo[]);
    });
    return () => { vivo = false; };
  }, []);

  async function mudar(id: string, status: string) {
    setAviso(null);
    const { error } = await supabaseNoNavegador().from("submissoes_artigos").update({ status }).eq("id", id);
    if (error) { console.warn(error.message); setAviso("Não foi possível alterar a situação. Tente de novo."); return; }
    setItens((atual) => atual && atual.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  if (erro) return <Erro texto={erro} />;
  if (!itens) return <Carregando />;
  const visiveis = filtro === "todos" ? itens : itens.filter((a) => a.status === filtro);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-titulo">Artigos enviados ({visiveis.length})</h2>
        <label className="text-sm text-suave">
          Situação{" "}
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={SELECT}>
            <option value="todos">Todas</option>
            {STATUS_ARTIGO.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
      </div>
      {aviso && <p role="alert" className="mt-3 font-medium text-erro">{aviso}</p>}
      {visiveis.length === 0 ? (
        <p className="mt-4 text-suave">Nenhum artigo nesta situação.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visiveis.map((a) => (
            <li key={a.id} className="rounded-2xl border border-borda bg-superficie p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-titulo">{a.titulo}</h3>
                  <p className="text-sm text-suave">{a.nome} · <a href={`mailto:${a.email}`} className="text-link underline">{a.email}</a> · {new Date(a.criado_em).toLocaleDateString("pt-BR")} · {a.idioma.toUpperCase()}</p>
                </div>
                <label className="text-sm text-suave">
                  <span className="sr-only">Situação do artigo {a.titulo}</span>
                  <select value={a.status} onChange={(e) => void mudar(a.id, e.target.value)} className={SELECT}>
                    {STATUS_ARTIGO.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-tinta">{a.resumo}</p>
              <p className="mt-2 text-sm text-suave">
                Tags: {a.tags.join(", ")}{a.data_desejada ? ` · publicar em ${new Date(a.data_desejada + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={a.link_rascunho} target="_blank" rel="noopener noreferrer" className="text-link underline">Abrir rascunho</a>
                {a.perfil_medium && <a href={a.perfil_medium} target="_blank" rel="noopener noreferrer" className="text-link underline">Perfil no Medium</a>}
                {a.linkedin && <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="text-link underline">LinkedIn</a>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
