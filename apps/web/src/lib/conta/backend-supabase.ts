import { supabaseNoNavegador } from "../supabase/client";
import type { ContaBackend } from "./backend.ts";
import type { PerfilConta, Usuario } from "./estado.ts";

const comoUsuario = (u: { id: string; email?: string | null } | null | undefined): Usuario | null => (u ? { id: u.id, email: u.email ?? null } : null);

/** A segurança fica no banco (RLS): cada pessoa só lê e altera as próprias linhas, mesmo com a chave pública no navegador. */
export function criarBackendSupabase(): ContaBackend {
  return {
    async iniciar(aoMudar) {
      const sb = supabaseNoNavegador();
      // Cobre o retorno do link do e-mail (?code=...), que o supabase-js troca por sessão sozinho.
      const { data: ouvinte } = sb.auth.onAuthStateChange((_evento, sessao) => aoMudar(comoUsuario(sessao?.user)));
      const { data } = await sb.auth.getSession();
      aoMudar(comoUsuario(data.session?.user));
      return () => ouvinte.subscription.unsubscribe();
    },

    async carregarPerfil(usuario) {
      const { data, error } = await supabaseNoNavegador().from("perfis").select("nome, habilidades, area, senioridade").eq("id", usuario.id).maybeSingle();
      if (error) throw error;
      return data ? ({ nome: data.nome, area: data.area, senioridade: data.senioridade, habilidades: data.habilidades ?? [] } satisfies PerfilConta) : null;
    },

    async gravarPerfil(usuario, perfil) {
      const { error } = await supabaseNoNavegador().from("perfis").upsert({ id: usuario.id, ...perfil, atualizado_em: new Date().toISOString() });
      if (error) throw error;
    },

    async listarSalvas() {
      const { data, error } = await supabaseNoNavegador().from("vagas_salvas").select("vaga_id, titulo, empresa, url, salva_em").order("salva_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    async salvar(usuario, vaga) {
      const { error } = await supabaseNoNavegador().from("vagas_salvas").upsert({ user_id: usuario.id, ...vaga }, { onConflict: "user_id,vaga_id", ignoreDuplicates: true });
      if (error) throw error;
    },

    async remover(_usuario, vagaId) {
      const { error } = await supabaseNoNavegador().from("vagas_salvas").delete().eq("vaga_id", vagaId);
      if (error) throw error;
    },

    async sair() {
      const { error } = await supabaseNoNavegador().auth.signOut();
      if (error) throw error;
    },

    async excluirConta() {
      const sb = supabaseNoNavegador();
      const { error } = await sb.rpc("excluir_minha_conta");
      if (error) throw error;
      await sb.auth.signOut().catch(() => {});
    },
  };
}
