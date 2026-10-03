import type { Metadata } from "next";
import { carregarVagas } from "@/lib/vagas";
import { PerfilCliente } from "./perfil-cliente";

export const metadata: Metadata = {
  title: "Meu perfil",
  description: "Crie seu perfil na DSE Academy: área, nível e habilidades, para encontrar as vagas com mais aderência.",
};

export default function Pagina() {
  const { skills, vagas } = carregarVagas();
  return <PerfilCliente skills={skills} vagasNoAr={vagas.map((v) => v.id)} />;
}
