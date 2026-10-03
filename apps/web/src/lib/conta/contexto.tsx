"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { configurado } from "../supabase/client";
import type { ContaBackend } from "./backend.ts";
import { criarBackendMemoria } from "./backend-memoria.ts";
import { criarBackendSupabase } from "./backend-supabase.ts";
import {
  ESTADO_INICIAL, alternarNaLista, estaSalva, habilidadesDe, precisaDeOnboarding, reduzirConta,
  type EstadoConta, type PerfilConta, type ResumoDeVaga,
} from "./estado.ts";

export type ValorConta = EstadoConta & {
  /** false quando o site não tem Supabase configurado: não há como entrar. */
  disponivel: boolean;
  habilidades: string[];
  precisaDeOnboarding: boolean;
  estaSalva: (vagaId: string) => boolean;
  gravarPerfil: (perfil: PerfilConta) => Promise<void>;
  alternarSalva: (vaga: ResumoDeVaga) => Promise<boolean>; // devolve true se salvou, false se removeu; lança erro se o banco recusar
  sair: () => Promise<void>;
  excluirConta: () => Promise<void>;
};

const Contexto = createContext<ValorConta | null>(null);

function escolherBackend(): ContaBackend | null {
  if (process.env.NEXT_PUBLIC_CONTA_FAKE === "1" && process.env.NODE_ENV !== "production") return criarBackendMemoria();
  return configurado() ? criarBackendSupabase() : null;
}

export function ContaProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => escolherBackend(), []);
  const [estado, enviar] = useReducer(reduzirConta, backend, (b) => (b ? ESTADO_INICIAL : { ...ESTADO_INICIAL, fase: "visitante" as const }));
  const salvasAtuais = useRef(estado.salvas);
  useEffect(() => { salvasAtuais.current = estado.salvas; });

  // Sessão: avisa a cada login e logout.
  useEffect(() => {
    if (!backend) return;
    let cancelado = false;
    let cancelar = () => {};
    void backend.iniciar((u) => { if (!cancelado) enviar(u ? { tipo: "logou", usuario: u } : { tipo: "visitante" }); }).then((c) => {
      cancelar = c;
      if (cancelado) c();
    });
    return () => { cancelado = true; cancelar(); };
  }, [backend]);

  // Perfil e vagas salvas: lidos juntos assim que há uma pessoa logada. Falha em um não derruba o outro.
  const usuario = estado.usuario;
  useEffect(() => {
    if (!backend || !usuario) return;
    let vivo = true;
    void Promise.allSettled([backend.carregarPerfil(usuario), backend.listarSalvas(usuario)]).then(([perfil, salvas]) => {
      if (!vivo) return;
      if (perfil.status === "rejected") console.warn("Perfil indisponível:", perfil.reason);
      if (salvas.status === "rejected") console.warn("Vagas salvas indisponíveis:", salvas.reason);
      enviar({
        tipo: "dados",
        perfil: perfil.status === "fulfilled" ? perfil.value : null,
        perfilLido: perfil.status === "fulfilled",
        salvas: salvas.status === "fulfilled" ? salvas.value : null,
      });
    });
    return () => { vivo = false; };
  }, [backend, usuario]);

  const gravarPerfil = useCallback(async (perfil: PerfilConta) => {
    if (!backend || !usuario) throw new Error("É preciso entrar na conta.");
    await backend.gravarPerfil(usuario, perfil);
    enviar({ tipo: "perfil", perfil });
  }, [backend, usuario]);

  // Atualiza na hora (otimista) e desfaz se o banco recusar.
  const alternarSalva = useCallback(async (vaga: ResumoDeVaga) => {
    if (!backend || !usuario) throw new Error("É preciso entrar na conta.");
    const antes = salvasAtuais.current;
    const { salvas, adicionou } = alternarNaLista(antes, vaga);
    enviar({ tipo: "salvas", salvas });
    try {
      if (adicionou) await backend.salvar(usuario, vaga);
      else await backend.remover(usuario, vaga.vaga_id);
    } catch (erro) {
      enviar({ tipo: "salvas", salvas: antes });
      throw erro;
    }
    return adicionou;
  }, [backend, usuario]);

  const sair = useCallback(async () => {
    if (backend) await backend.sair();
    enviar({ tipo: "visitante" });
  }, [backend]);

  const excluirConta = useCallback(async () => {
    if (!backend) throw new Error("É preciso entrar na conta.");
    await backend.excluirConta();
    enviar({ tipo: "visitante" });
  }, [backend]);

  const valor = useMemo<ValorConta>(() => ({
    ...estado,
    disponivel: backend !== null,
    habilidades: habilidadesDe(estado),
    precisaDeOnboarding: precisaDeOnboarding(estado),
    estaSalva: (vagaId) => estaSalva(estado.salvas, vagaId),
    gravarPerfil, alternarSalva, sair, excluirConta,
  }), [estado, backend, gravarPerfil, alternarSalva, sair, excluirConta]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConta(): ValorConta {
  const v = useContext(Contexto);
  if (!v) throw new Error("useConta precisa estar dentro de <ContaProvider>.");
  return v;
}
