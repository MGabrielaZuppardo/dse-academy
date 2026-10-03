/**
 * Conta de mentira, só para DESENVOLVIMENTO: com NEXT_PUBLIC_CONTA_FAKE=1 o site abre como uma pessoa logada, sem Supabase,
 * para testar telas que dependem de login. O estado fica no sessionStorage (some ao fechar a aba). Nunca roda em produção.
 */

import type { ContaBackend } from "./backend.ts";
import type { PerfilConta, Usuario, VagaSalva } from "./estado.ts";

const CHAVE = "dse:conta-fake";
const USUARIO: Usuario = { id: "usuario-de-teste", email: "teste@exemplo.com" };

type Guardado = { logada: boolean; perfil: PerfilConta | null; salvas: VagaSalva[] };

function ler(): Guardado {
  try {
    return { logada: true, perfil: null, salvas: [], ...JSON.parse(sessionStorage.getItem(CHAVE) ?? "{}") };
  } catch {
    return { logada: true, perfil: null, salvas: [] };
  }
}
const gravar = (g: Guardado) => { try { sessionStorage.setItem(CHAVE, JSON.stringify(g)); } catch { /* sem storage: vale só nesta carga */ } };

export function criarBackendMemoria(): ContaBackend {
  if (process.env.NODE_ENV === "production") throw new Error("A conta de teste não pode ser usada em produção.");
  let aviso: ((u: Usuario | null) => void) | null = null;

  return {
    async iniciar(aoMudar) {
      aviso = aoMudar;
      aoMudar(ler().logada ? USUARIO : null);
      return () => { aviso = null; };
    },
    async carregarPerfil() { return ler().perfil; },
    async gravarPerfil(_u, perfil) { gravar({ ...ler(), perfil }); },
    async listarSalvas() { return ler().salvas; },
    async salvar(_u, vaga) {
      const g = ler();
      if (!g.salvas.some((s) => s.vaga_id === vaga.vaga_id)) gravar({ ...g, salvas: [{ ...vaga, salva_em: new Date().toISOString() }, ...g.salvas] });
    },
    async remover(_u, vagaId) { const g = ler(); gravar({ ...g, salvas: g.salvas.filter((s) => s.vaga_id !== vagaId) }); },
    async sair() { gravar({ ...ler(), logada: false }); aviso?.(null); },
    async excluirConta() { gravar({ logada: false, perfil: null, salvas: [] }); aviso?.(null); },
  };
}
