import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demandaNaArea, stacksDaVaga } from "@/lib/aderencia";
import { passosDasStacks, trilhaDaArea } from "@/lib/ligacao-trilhas";
import { AREAS, CONTRATOS, MODELOS, NOME_NIVEL, haQuanto, localDaVaga, slugDaVaga } from "@/lib/rotulos";
import { carregarTrilhas } from "@/lib/trilhas";
import { carregarVagas, descricaoDe } from "@/lib/vagas";
import { BotaoSalvar } from "./botao-salvar";
import { PainelAderencia } from "./painel-aderencia";
import { ReportarErro } from "./reportar-erro";
import { estiloBotao } from "@/lib/botoes";

export function generateStaticParams() {
  return carregarVagas().vagas.map((v) => ({ id: slugDaVaga(v.id) }));
}

function acharVaga(slug: string) {
  const dados = carregarVagas();
  const vaga = dados.vagas.find((v) => slugDaVaga(v.id) === slug);
  return { vaga, skills: dados.skills, vagas: dados.vagas };
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
  const { vaga, skills, vagas } = acharVaga((await props.params).id);
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

  // Tudo que o painel de aderência precisa e que dá para calcular já no build: demanda no mercado e onde estudar cada tecnologia.
  const { principais, todas } = stacksDaVaga(vaga);
  const ids = [...new Set(todas)];
  const demanda = demandaNaArea(vagas, vaga.area).pct;
  const trilhas = carregarTrilhas().trilhas;
  const trilhaArea = trilhaDaArea(vaga.area, trilhas);
  const nomes = Object.fromEntries(ids.map((id) => [id, skills[id] ?? id]));

  return (
    <article>
      <p><Link href="/vagas" className="text-link underline">← Todas as vagas</Link></p>
      <h1 className="mt-3 font-display text-3xl font-bold text-titulo">{vaga.titulo}</h1>
      <p className="mt-1 text-lg text-suave">{vaga.empresa}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={vaga.url} target="_blank" rel="noopener noreferrer" className={estiloBotao("primario")}>
          Candidatar-se na página da vaga
        </a>
        <BotaoSalvar vaga={{ vaga_id: vaga.id, titulo: vaga.titulo, empresa: vaga.empresa, url: vaga.url }} />
      </div>
      <p className="mt-2 text-sm text-suave">Você será levado ao site da empresa ou da Gupy, onde a candidatura é feita.</p>

      <dl className="mt-5 grid gap-x-8 gap-y-2 rounded-2xl border border-borda bg-superficie p-4 sm:grid-cols-2">
        {fatos.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex gap-2"><dt className="font-medium text-titulo">{rotulo}:</dt><dd className="text-suave">{valor}</dd></div>
        ))}
      </dl>

      <PainelAderencia
        d={{
          area: vaga.area, nivel: vaga.senioridade, modelo: vaga.modelo, local: localDaVaga(vaga),
          principais, desejaveis: vaga.desejaveis, enriquecida: vaga.enriquecida,
          nomes, demanda: Object.fromEntries(ids.map((id) => [id, demanda[id] ?? 0])),
          nomeGrupo: vaga.area && AREAS[vaga.area] ? `vagas de ${AREAS[vaga.area]}` : "vagas abertas",
          passos: passosDasStacks(ids, vaga.area, trilhas),
          trilhaDaArea: trilhaArea ? { id: trilhaArea.id, titulo: trilhaArea.titulo } : null,
        }}
      />

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
        <p className="mt-2 max-w-3xl whitespace-pre-line text-tinta">{descricao || "A descrição não está disponível. Veja a vaga completa no link acima."}</p>
      </section>

      <ReportarErro
        vaga={{ id: vaga.id, titulo: vaga.titulo, empresa: vaga.empresa, url: vaga.url }}
        stacks={ids.map((id) => ({ id, nome: skills[id] ?? id }))}
      />
    </article>
  );
}
