"use client";

import Link from "next/link";
import { useState } from "react";
import { useConta } from "@/lib/conta/contexto";
import type { ResumoDeVaga } from "@/lib/conta/estado";
import { estiloBotao } from "@/lib/botoes";

/** Guarda um resumo da vaga na conta (a vaga continua listada mesmo depois de sair da coleta). Exige login. */
export function BotaoSalvar({ vaga }: { vaga: ResumoDeVaga }) {
  const conta = useConta();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (conta.fase !== "logada") {
    return conta.disponivel && conta.fase === "visitante" ? (
      <Link href="/perfil" className={estiloBotao("secundario")}>Entre para salvar a vaga</Link>
    ) : null;
  }

  const salva = conta.estaSalva(vaga.vaga_id);
  async function alternar() {
    setOcupado(true);
    setErro(null);
    try {
      await conta.alternarSalva(vaga);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível atualizar suas vagas salvas. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button" onClick={alternar} disabled={ocupado} aria-pressed={salva}
        className={`${estiloBotao("secundario")}${salva ? " !border-link !bg-fundo" : ""}`}
      >
        {salva ? "✓ Vaga salva" : "Salvar vaga"}
      </button>
      {erro && <p role="alert" className="w-full font-medium text-erro">{erro}</p>}
    </>
  );
}
