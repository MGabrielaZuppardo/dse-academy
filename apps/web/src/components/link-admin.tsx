"use client";

import Link from "next/link";
import { useAcessoAdmin } from "@/lib/admin/acesso";

/** Atalho para a administração no menu; só aparece para quem o Supabase confirma como admin. */
export function LinkAdmin() {
  return useAcessoAdmin() === "permitido" ? <Link href="/admin" className="hover:text-azul-claro">Administração</Link> : null;
}
