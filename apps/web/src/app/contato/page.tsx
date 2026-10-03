import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_CONTATO, LINKEDIN_URL, LINKTREE_URL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Fale conosco",
  description: "Fale com a equipe da DSE Academy por e-mail, pelo LinkedIn da DSE Community ou pelo Linktree.",
};

const cartao = "block h-full rounded-2xl border border-borda bg-superficie p-5 transition hover:border-link";

export default function Pagina() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Fale conosco</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Dúvidas, sugestões, parcerias ou pedidos sobre os seus dados (LGPD): escreva para a equipe da DSE Academy ou fale
        com a gente pelos canais da comunidade.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <a href={`mailto:${EMAIL_CONTATO}`} className={cartao}>
            <h2 className="font-display text-xl font-semibold text-titulo">E-mail</h2>
            <p className="mt-1 break-all text-link underline">{EMAIL_CONTATO}</p>
            <p className="mt-2 text-sm text-suave">Para qualquer assunto, inclusive pedidos de acesso, correção ou exclusão de dados.</p>
          </a>
        </li>
        <li>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={cartao}>
            <h2 className="font-display text-xl font-semibold text-titulo">DSE Community no LinkedIn</h2>
            <p className="mt-1 text-link underline">Abrir a página no LinkedIn</p>
            <p className="mt-2 text-sm text-suave">Novidades da comunidade, eventos e conteúdo. Abre em uma nova aba.</p>
          </a>
        </li>
        <li>
          <a href={LINKTREE_URL} target="_blank" rel="noopener noreferrer" className={cartao}>
            <h2 className="font-display text-xl font-semibold text-titulo">Links da comunidade</h2>
            <p className="mt-1 text-link underline">Abrir o Linktree da DSE</p>
            <p className="mt-2 text-sm text-suave">Todos os canais da DSE Brasil em um só lugar. Abre em uma nova aba.</p>
          </a>
        </li>
      </ul>

      <section className="mt-8" aria-labelledby="outras">
        <h2 id="outras" className="font-display text-xl font-semibold text-titulo">Quer participar?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-tinta">
          <li><Link href="/artigos/enviar" className="text-link underline">Envie um artigo</Link> para o Medium da comunidade.</li>
          <li><Link href="/palestrantes/cadastro" className="text-link underline">Cadastre-se como palestrante</Link>.</li>
        </ul>
      </section>
    </>
  );
}
