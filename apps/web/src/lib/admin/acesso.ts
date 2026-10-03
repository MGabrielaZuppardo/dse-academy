"use client";

import { useEffect, useState } from "react";
import { useConta } from "@/lib/conta/contexto";
import { configurado, contaFake, supabaseNoNavegador } from "@/lib/supabase/client";

export type Acesso = "carregando" | "visitante" | "negado" | "permitido" | "indisponivel";

/** Pergunta ao Supabase (função is_admin) se a pessoa logada é admin. A proteção real é a RLS; isto só decide o que mostrar. */
export function useAcessoAdmin(): Acesso {
  const conta = useConta();
  const usuario = conta.usuario?.id;
  const [resposta, setResposta] = useState<{ para: string; admin: boolean | null } | null>(null);
  const semBanco = !configurado() || contaFake();

  useEffect(() => {
    if (!usuario || semBanco) return;
    let vivo = true;
    void supabaseNoNavegador().rpc("is_admin").then(({ data, error }) => {
      if (!vivo) return;
      if (error) console.warn("Não foi possível verificar o acesso de administração:", error.message);
      setResposta({ para: usuario, admin: error ? null : data === true });
    });
    return () => { vivo = false; };
  }, [usuario, semBanco]);

  if (semBanco || !conta.disponivel) return "indisponivel";
  if (conta.fase === "carregando") return "carregando";
  if (conta.fase === "visitante") return "visitante";
  if (!resposta || resposta.para !== usuario) return "carregando";
  if (resposta.admin === null) return "indisponivel";
  return resposta.admin ? "permitido" : "negado";
}
