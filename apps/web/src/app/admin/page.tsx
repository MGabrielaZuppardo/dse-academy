import { carregarTrilhas } from "@/lib/trilhas";
import { Painel } from "./painel";

export default function PaginaAdmin() {
  const titulos = Object.fromEntries(carregarTrilhas().trilhas.map((t) => [t.id, t.titulo]));
  return <Painel titulos={titulos} />;
}
