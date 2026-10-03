"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConta } from "@/lib/conta/contexto";
import { configurado, contaFake, supabaseNoNavegador } from "@/lib/supabase/client";

type Contagens = { artigos: number | null; palestras: number | null; trilhas: number | null };
type Tabela = "submissoes_artigos" | "palestrantes" | "inscricoes_trilha";

/** Quantas linhas a pessoa tem na tabela (a RLS já limita às dela). null quando não deu para contar. */
async function contar(tabela: Tabela): Promise<number | null> {
  const { count, error } = await supabaseNoNavegador().from(tabela).select("*", { count: "exact", head: true });
  if (error) { console.warn(`Contagem de ${tabela} indisponível:`, error.message); return null; }
  return count ?? 0;
}

/** Quadro do perfil com o resumo da atividade da pessoa: vagas salvas, trilhas iniciadas, artigos enviados e palestras cadastradas. */
export function ResumoAtividade() {
  const conta = useConta();
  const usuario = conta.usuario?.id;
  const [contagens, setContagens] = useState<Contagens | null>(null);

  useEffect(() => {
    if (!usuario || !configurado() || contaFake()) return;
    let vivo = true;
    void Promise.all([contar("submissoes_artigos"), contar("palestrantes"), contar("inscricoes_trilha")]).then(([artigos, palestras, trilhas]) => {
      if (vivo) setContagens({ artigos, palestras, trilhas });
    });
    return () => { vivo = false; };
  }, [usuario]);

  // Sem banco (conta de teste do desenvolvimento) não há o que contar: mostra "–" em vez de ficar carregando.
  const semBanco = !configurado() || contaFake();
  const valor = (n: number | null | undefined) => (n === undefined ? (semBanco ? "–" : "…") : n === null ? "–" : String(n));
  const itens = [
    { rotulo: conta.salvas.length === 1 ? "vaga salva" : "vagas salvas", n: conta.salvasIndisponiveis ? null : conta.salvas.length, href: "/vagas" },
    { rotulo: contagens?.trilhas === 1 ? "trilha iniciada" : "trilhas iniciadas", n: contagens ? contagens.trilhas : undefined, href: "/trilhas" },
    { rotulo: contagens?.artigos === 1 ? "artigo enviado" : "artigos enviados", n: contagens ? contagens.artigos : undefined, href: "/artigos/enviar" },
    { rotulo: contagens?.palestras === 1 ? "palestra cadastrada" : "palestras cadastradas", n: contagens ? contagens.palestras : undefined, href: "/palestrantes/cadastro" },
  ];

  return (
    <section aria-labelledby="atividade" className="mt-6">
      <h2 id="atividade" className="font-display text-xl font-semibold text-titulo">Sua atividade</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block h-full rounded-2xl border border-borda bg-superficie p-4 transition-colors hover:border-link">
              <span className="block font-display text-3xl font-bold text-titulo">{valor(i.n)}</span>
              <span className="mt-1 block text-sm text-suave">{i.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
