import type { Metadata } from "next";
import Link from "next/link";
import { carregarTrilhas } from "@/lib/trilhas";

export const metadata: Metadata = {
  title: "Trilhas de estudo",
  description: "Trilhas de estudo por área de dados, montadas a partir do que as vagas abertas no Brasil realmente pedem.",
};

export default function Pagina() {
  const { trilhas } = carregarTrilhas();

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Trilhas de estudo</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Cada trilha parte das tecnologias que as vagas abertas mais pedem na área, ordenadas da base ao aprofundamento,
        com um mini-projeto e material gratuito em cada etapa. Entre na sua conta para acompanhar o progresso.
      </p>

      {trilhas.length === 0 ? (
        <p className="mt-6 text-suave">As trilhas ainda não foram geradas neste ambiente.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {trilhas.map((t) => (
            <li key={t.id}>
              <Link href={`/trilhas/${t.id}`} className="block h-full rounded-2xl border border-borda bg-superficie p-5 transition hover:border-link">
                <h2 className="font-display text-xl font-semibold text-titulo">{t.titulo}</h2>
                <p className="mt-1 text-sm text-suave">
                  {t.etapas.length} etapas, do básico ao avançado · cerca de {t.semanas_total} semanas · baseada em {t.vagas_base} vagas
                </p>
                <p className="mt-1 text-sm text-suave">
                  {t.conteudo_inicial.length + t.etapas.reduce((n, e) => n + e.skills.reduce((m, s) => m + s.recursos.length, 0), 0)} conteúdos gratuitos · {t.etapas.reduce((n, e) => n + e.projetos.length, 0)} ideias de mini-projeto
                </p>
                <p className="mt-3 flex flex-wrap gap-2 text-sm">
                  {t.etapas[0]?.skills.slice(0, 4).map((s) => (
                    <span key={s.id} className="rounded-full bg-fundo px-2.5 py-0.5 text-titulo">{s.nome}</span>
                  ))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
