"use client";

import Link from "next/link";
import { useConta } from "@/lib/conta/contexto";
import { estiloBotao } from "@/lib/botoes";

/** Convite para entrar, mostrado só a quem está sem login: progresso e aderência às vagas são exclusivos de quem tem perfil. */
export function ConviteLogin({ titulo, texto, acao = "Entrar ou criar meu perfil", className = "" }: { titulo: string; texto: string; acao?: string; className?: string }) {
  const conta = useConta();
  if (conta.fase !== "visitante" || !conta.disponivel) return null;
  return (
    <aside className={`rounded-2xl border border-link/40 bg-superficie p-5 ${className}`}>
      <h2 className="font-display text-lg font-semibold text-titulo">{titulo}</h2>
      <p className="mt-1 text-suave">{texto}</p>
      <Link href="/perfil" className={`mt-4 ${estiloBotao("primario")}`}>{acao}</Link>
    </aside>
  );
}
