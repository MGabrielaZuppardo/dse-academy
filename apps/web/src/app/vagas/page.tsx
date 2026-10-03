import type { Metadata } from "next";
import { stacksDaVaga } from "@/lib/aderencia";
import { haQuanto, localDaVaga } from "@/lib/rotulos";
import { carregarVagas } from "@/lib/vagas";
import { ListaVagas, type ItemVaga } from "./lista";

export const metadata: Metadata = {
  title: "Vagas em dados",
  description: "Vagas de engenharia, análise, ciência de dados, BI e ML no Brasil, com senioridade e tecnologias identificadas.",
};

export default function Pagina() {
  const { vagas, skills, coletada_em } = carregarVagas();
  const itens: ItemVaga[] = vagas
    .slice()
    .sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))
    .map((v) => ({
      id: v.id,
      titulo: v.titulo,
      empresa: v.empresa,
      url: v.url,
      local: localDaVaga(v),
      modelo: v.modelo,
      area: v.area,
      senioridade: v.senioridade,
      stacks: v.citadas.map((id) => skills[id] ?? id),
      principais: stacksDaVaga(v).principais,
      publicada: haQuanto(v.publicada_em),
    }));

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Vagas em dados</h1>
      <p className="mt-2 max-w-2xl text-suave">
        {itens.length > 0
          ? `${itens.length} vagas abertas, coletadas em ${new Date(coletada_em).toLocaleDateString("pt-BR")}. Clique em uma vaga para ver os detalhes.`
          : "As vagas ainda não foram carregadas neste ambiente."}
      </p>
      <ListaVagas itens={itens} />
    </>
  );
}
