/** O que a conta precisa de um servidor. Duas implementações: Supabase (de verdade) e memória (só para desenvolvimento). */

import type { PerfilConta, ResumoDeVaga, Usuario, VagaSalva } from "./estado.ts";

export interface ContaBackend {
  /** Avisa a cada mudança de sessão (null = ninguém logado). Devolve a função que cancela o aviso. */
  iniciar(aoMudar: (usuario: Usuario | null) => void): Promise<() => void>;
  /** null quando a pessoa ainda não tem perfil; lança erro se não deu para ler. */
  carregarPerfil(usuario: Usuario): Promise<PerfilConta | null>;
  gravarPerfil(usuario: Usuario, perfil: PerfilConta): Promise<void>;
  listarSalvas(usuario: Usuario): Promise<VagaSalva[]>;
  salvar(usuario: Usuario, vaga: ResumoDeVaga): Promise<void>;
  remover(usuario: Usuario, vagaId: string): Promise<void>;
  sair(): Promise<void>;
  excluirConta(): Promise<void>;
}
