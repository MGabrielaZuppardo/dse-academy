"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Entrar } from "@/components/entrar";
import { useAcessoAdmin } from "@/lib/admin/acesso";
import { Carregando } from "./ui";

const ABAS = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/artigos", rotulo: "Artigos" },
  { href: "/admin/palestrantes", rotulo: "Palestrantes" },
  { href: "/admin/reportes", rotulo: "Relatos de vagas" },
] as const;

/** Porta da área de administração: só mostra o conteúdo a quem o Supabase confirma como admin. */
export function PortalAdmin({ children }: { children: ReactNode }) {
  const acesso = useAcessoAdmin();
  const caminho = usePathname();

  if (acesso === "carregando") return <Carregando />;
  if (acesso === "visitante") return <Entrar titulo="Administração" texto="Entre com o seu e-mail para acessar a área de administração." voltarPara="/admin" />;
  if (acesso === "indisponivel") return <p className="text-suave">A administração está indisponível neste momento. Tente novamente em instantes.</p>;
  if (acesso === "negado") {
    return (
      <>
        <h1 className="font-display text-3xl font-bold text-titulo">Acesso restrito</h1>
        <p className="mt-2 max-w-2xl text-suave">Esta área é só para a equipe da DSE Academy. Se você deveria ter acesso, peça para a equipe liberar o seu e-mail.</p>
        <Link href="/" className="mt-4 inline-block text-link underline">Voltar para o início</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Administração</h1>
      <nav aria-label="Administração" className="mt-4 flex flex-wrap gap-2">
        {ABAS.map((a) => {
          const ativa = caminho === a.href;
          return (
            <Link
              key={a.href} href={a.href} aria-current={ativa ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg border px-4 font-medium ${ativa ? "border-transparent bg-azul text-white" : "border-borda bg-superficie text-titulo hover:border-link"}`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6">{children}</div>
    </>
  );
}
