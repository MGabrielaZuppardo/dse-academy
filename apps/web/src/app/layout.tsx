import type { Metadata } from "next";
import { IBM_Plex_Sans, Saira } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { LINKEDIN_URL, LINKTREE_URL } from "@/lib/contato";
import { AlternarTema } from "./alternar-tema";
import "./globals.css";

const saira = Saira({ variable: "--font-saira", subsets: ["latin"], weight: ["500", "600", "700"] });
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "DSE Academy · Vagas, artigos e palestrantes em dados", template: "%s · DSE Academy" },
  description: "Comunidade DSE Academy: vagas de engenharia, análise, ciência de dados e ML no Brasil, artigos e palestrantes.",
};

// Roda antes da primeira pintura (evita o "flash" do tema errado): usa a escolha salva ou, se não houver, a do sistema.
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("tema");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning className={`${saira.variable} ${plex.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-azul focus:px-3 focus:py-2 focus:text-white">
          Pular para o conteúdo
        </a>
        <header className="border-b border-white/10 bg-marinho text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="order-1 flex items-center gap-3 whitespace-nowrap" aria-label="DSE Academy, início">
              <Image src="/logo.png" alt="" width={44} height={44} />
              <span className="font-display leading-tight">
                <span className="block text-base font-bold tracking-wide">DSE ACADEMY</span>
                <span className="hidden text-xs tracking-wide text-azul-claro lg:block">DATA SCIENCE ENGINEERING COMMUNITY</span>
              </span>
            </Link>
            {/* No celular o menu desce para uma segunda linha; a partir de md fica ao lado da marca. */}
            <nav aria-label="Principal" className="order-3 flex w-full flex-wrap gap-x-4 gap-y-1 text-sm md:order-2 md:w-auto md:flex-1 md:justify-end">
              <Link href="/vagas" className="hover:text-azul-claro">Vagas</Link>
              <Link href="/trilhas" className="hover:text-azul-claro">Trilhas</Link>
              <Link href="/perfil" className="hover:text-azul-claro">Meu perfil</Link>
              <Link href="/artigos/enviar" className="hover:text-azul-claro">Enviar artigo</Link>
              <Link href="/palestrantes/cadastro" className="hover:text-azul-claro">Seja palestrante</Link>
            </nav>
            <div className="order-2 md:order-3"><AlternarTema /></div>
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-borda px-4 py-6 text-center text-sm text-suave">
          <p>Um projeto da comunidade DSE Academy, feito pela comunidade de dados para a comunidade de dados.</p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/#sobre-nos" className="text-link underline">Sobre nós</Link>
            <Link href="/contato" className="text-link underline">Fale conosco</Link>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="text-link underline">DSE Community no LinkedIn</a>
            <a href={LINKTREE_URL} target="_blank" rel="noopener noreferrer" className="text-link underline">Linktree</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
