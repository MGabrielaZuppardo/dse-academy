import type { Metadata } from "next";
import { FormularioPalestrante } from "./formulario";

export const metadata: Metadata = {
  title: "Cadastro de palestrantes",
  description: "Cadastre seus temas e contatos para participar dos eventos da comunidade DSE Academy.",
};

export default function Pagina() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Cadastro de palestrantes</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Conte sobre você e os temas que gostaria de apresentar. A equipe da DSE analisa cada cadastro e entra em contato
        quando houver um evento que combine com o seu perfil.
      </p>
      <FormularioPalestrante />
    </>
  );
}
