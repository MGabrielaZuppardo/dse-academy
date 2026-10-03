import type { Metadata } from "next";
import { FormularioArtigo } from "./formulario";

export const metadata: Metadata = {
  title: "Enviar artigo",
  description: "Envie seu artigo para publicação no Medium da comunidade DSE Academy.",
};

export default function Pagina() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Enviar artigo para o Medium</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Tem um texto sobre dados, engenharia ou carreira? Envie o rascunho e a equipe da DSE revisa antes de publicar
        no Medium da comunidade. Seu envio fica salvo e a equipe é avisada por e-mail.
      </p>
      <FormularioArtigo />
    </>
  );
}
