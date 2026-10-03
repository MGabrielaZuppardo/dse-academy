import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarTrilhas } from "@/lib/trilhas";
import { TrilhaInterativa } from "./trilha-interativa";

export function generateStaticParams() {
  return carregarTrilhas().trilhas.map((t) => ({ id: t.id }));
}

export async function generateMetadata(props: PageProps<"/trilhas/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const trilha = carregarTrilhas().trilhas.find((t) => t.id === id);
  if (!trilha) return { title: "Trilha não encontrada" };
  return { title: trilha.titulo, description: `${trilha.descricao} Baseada em ${trilha.vagas_base} vagas abertas.` };
}

export default async function Pagina(props: PageProps<"/trilhas/[id]">) {
  const { id } = await props.params;
  const { trilhas, modelo } = carregarTrilhas();
  const trilha = trilhas.find((t) => t.id === id);
  if (!trilha) notFound();

  return (
    <>
      <p><Link href="/trilhas" className="text-link underline">← Todas as trilhas</Link></p>
      <TrilhaInterativa trilha={trilha} modelo={modelo} />
    </>
  );
}
