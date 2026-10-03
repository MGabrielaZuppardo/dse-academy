"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { MAX_DETALHE, TIPOS_RELATO, montarRelato, type DadosDaVagaRelatada } from "@/lib/relato";
import { configurado, supabaseNoNavegador } from "@/lib/supabase/client";
import { estiloBotao } from "@/lib/botoes";

const CHAVE = "dse:vagas-reportadas";

// Lembra neste navegador quais vagas a pessoa já reportou (só conveniência; o envio vai para o banco).
function jaReportou(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as string[]).includes(id); } catch { return false; }
}
function lembrar(id: string): void {
  try {
    const ids = (JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as string[]).filter((x) => x !== id);
    localStorage.setItem(CHAVE, JSON.stringify([...ids, id].slice(-200)));
  } catch { /* sem storage */ }
}

/** "Algo errado nesta vaga?": qualquer pessoa pode enviar, logada ou não (a tabela só aceita inserção). */
export function ReportarErro({ vaga, stacks }: { vaga: DadosDaVagaRelatada; stacks: { id: string; nome: string }[] }) {
  const [tipo, setTipo] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [detalhe, setDetalhe] = useState("");
  const [fase, setFase] = useState<"preenchendo" | "enviando" | "enviado">("preenchendo");
  const [erro, setErro] = useState<string | null>(null);
  // O servidor não sabe o que está no navegador: começa como "não reportou" e corrige no cliente, sem erro de hidratação.
  const anterior = useSyncExternalStore(() => () => {}, () => jaReportou(vaga.id), () => false);

  if (!configurado()) return null; // sem Supabase não há para onde enviar

  if (anterior || fase === "enviado") {
    return (
      <section className="mt-10 rounded-2xl border border-borda bg-superficie p-5">
        <h2 className="font-display text-lg font-semibold text-titulo">Algo errado nesta vaga?</h2>
        <p role="status" className="mt-1 text-suave">Você já enviou um relato sobre esta vaga. Obrigado por ajudar a melhorar o portal!</p>
      </section>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const r = montarRelato(vaga, { tipo, stacks: marcadas, detalhe });
    if ("erro" in r) { setErro(r.erro); return; }
    setErro(null);
    setFase("enviando");
    const { error } = await supabaseNoNavegador().from("reportes_vaga").insert(r.linha);
    if (error) { console.error(error); setErro("Não foi possível enviar agora. Tente de novo em instantes."); setFase("preenchendo"); return; }
    lembrar(vaga.id);
    setFase("enviado");
  }

  return (
    <section className="mt-10 rounded-2xl border border-borda bg-superficie p-5">
      <details>
        <summary className="cursor-pointer"><h2 className="inline font-display text-lg font-semibold text-titulo">Algo errado nesta vaga?</h2></summary>
        <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
          <fieldset>
            <legend className="font-medium text-titulo">O que está errado?</legend>
            <div className="mt-2 space-y-1">
              {TIPOS_RELATO.map(([id, rotulo]) => (
                <label key={id} className="flex items-center gap-2"><input type="radio" name="tipo" value={id} checked={tipo === id} onChange={() => setTipo(id)} /> {rotulo}</label>
              ))}
            </div>
          </fieldset>

          {tipo === "stack_errada" && stacks.length > 0 && (
            <fieldset>
              <legend className="font-medium text-titulo">Quais tecnologias estão erradas?</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {stacks.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={marcadas.includes(s.nome)} onChange={() => setMarcadas((m) => (m.includes(s.nome) ? m.filter((x) => x !== s.nome) : [...m, s.nome]))} /> {s.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="rep-detalhe" className="block font-medium text-titulo">Detalhes (opcional)</label>
            <textarea id="rep-detalhe" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={MAX_DETALHE} rows={3} placeholder="Ex.: a vaga pede Spark, não Snowflake"
              className="mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2" />
          </div>

          {erro && <p role="alert" className="font-medium text-erro">{erro}</p>}
          <button type="submit" disabled={fase === "enviando"} className={estiloBotao("primario")}>
            {fase === "enviando" ? "Enviando…" : "Enviar relato"}
          </button>
          <p className="text-sm text-suave">Não precisa entrar na conta; o relato é anônimo e ajuda a corrigir a identificação das vagas.{" "}
            <Link href="/contato" className="text-link underline">Fale conosco</Link> para outros assuntos.</p>
        </form>
      </details>
    </section>
  );
}
