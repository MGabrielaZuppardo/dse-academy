import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, CONTRATOS, MODELOS, NOME_NIVEL, haQuanto, localDaVaga, slugDaVaga } from "@/lib/rotulos";
import { carregarVagas, descricaoDe } from "@/lib/vagas";

export function generateStaticParams() {
  return carregarVagas().vagas.map((v) => ({ id: slugDaVaga(v.id) }));
}

function acharVaga(slug: string) {
  const dados = carregarVagas();
  const vaga = dados.vagas.find((v) => slugDaVaga(v.id) === slug);
  return { vaga, skills: dados.skills };
}

export async function generateMetadata(props: PageProps<"/vagas/[id]">): Promise<Metadata> {
  const { vaga } = acharVaga((await props.params).id);
  if (!vaga) return { title: "Vaga não encontrada" };
  return {
    title: `${vaga.titulo} · ${vaga.empresa}`,
    description: `${vaga.titulo} na ${vaga.empresa}, ${localDaVaga(vaga)}.`,
  };
}

export default async function Pagina(props: PageProps<"/vagas/[id]">) {
  const { vaga, skills } = acharVaga((await props.params).id);
  if (!vaga) notFound();

  const descricao = descricaoDe(vaga.id);
  const fatos = [
    ["Local", localDaVaga(vaga)],
    ["Modelo", vaga.modelo ? MODELOS[vaga.modelo] ?? vaga.modelo : null],
    ["Contrato", vaga.contrato ? CONTRATOS[vaga.contrato] ?? vaga.contrato : null],
    ["Nível", vaga.senioridade ? NOME_NIVEL[vaga.senioridade] ?? null : null],
    ["Área", vaga.area ? AREAS[vaga.area] ?? null : null],
    ["Publicada", haQuanto(vaga.publicada_em)],
    ["Prazo", vaga.prazo ? new Date(vaga.prazo).toLocaleDateString("pt-BR") : null],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <article>
      <p><Link href="/vagas" className="text-link underline">← Todas as vagas</Link></p>
      <h1 className="mt-3 font-display text-3xl font-bold text-titulo">{vaga.titulo}</h1>
      <p className="mt-1 text-lg text-suave">{vaga.empresa}</p>

      <dl className="mt-5 grid gap-x-8 gap-y-2 rounded-2xl border border-borda bg-superficie p-4 sm:grid-cols-2">
        {fatos.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex gap-2"><dt className="font-medium text-titulo">{rotulo}:</dt><dd className="text-suave">{valor}</dd></div>
        ))}
      </dl>

      {vaga.citadas.length > 0 && (
        <section className="mt-6" aria-labelledby="stacks">
          <h2 id="stacks" className="font-display text-xl font-semibold text-titulo">Tecnologias citadas</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {vaga.citadas.map((id) => <li key={id} className="rounded-full bg-fundo px-3 py-1 text-titulo">{skills[id] ?? id}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="descricao">
        <h2 id="descricao" className="font-display text-xl font-semibold text-titulo">Descrição</h2>
        <p className="mt-2 max-w-3xl whitespace-pre-line text-tinta">{descricao || "A descrição não está disponível. Veja a vaga completa no link abaixo."}</p>
      </section>

      <a href={vaga.url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-block rounded-lg bg-azul px-5 py-2.5 font-semibold text-white hover:opacity-90">
        Candidatar-se na página da vaga
      </a>
      <p className="mt-2 text-sm text-suave">Você será levado ao site da empresa ou da Gupy, onde a candidatura é feita.</p>
    </article>
  );
}
