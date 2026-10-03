/** Estado da conta (login, perfil e vagas salvas) como um reducer puro, para ser testado sem React nem Supabase. */

export type Usuario = { id: string; email: string | null };

export type PerfilConta = { nome: string | null; area: string | null; senioridade: string | null; habilidades: string[] };

export type VagaSalva = { vaga_id: string; titulo: string | null; empresa: string | null; url: string | null; salva_em: string };

export type ResumoDeVaga = { vaga_id: string; titulo: string | null; empresa: string | null; url: string | null };

export type EstadoConta = {
  fase: "carregando" | "visitante" | "logada";
  usuario: Usuario | null;
  perfil: PerfilConta | null; // null: ainda não criou (primeiro acesso) ou não deu para ler
  dadosProntos: boolean; // true depois de tentar ler perfil e vagas salvas (com sucesso ou não)
  perfilLido: boolean; // true quando o perfil foi lido com sucesso (com ou sem linha)
  salvas: VagaSalva[];
  salvasIndisponiveis: boolean; // não deu para ler a lista (ex.: tabela ainda não criada); a tela segue funcionando
};

export type AcaoConta =
  | { tipo: "visitante" }
  | { tipo: "logou"; usuario: Usuario }
  // perfilLido=false: a leitura do perfil falhou (não confundir com "ainda não tem perfil"); salvas null: a leitura da lista falhou.
  | { tipo: "dados"; perfil: PerfilConta | null; perfilLido: boolean; salvas: VagaSalva[] | null }
  | { tipo: "perfil"; perfil: PerfilConta }
  | { tipo: "salvas"; salvas: VagaSalva[] };

export const ESTADO_INICIAL: EstadoConta = { fase: "carregando", usuario: null, perfil: null, dadosProntos: false, perfilLido: false, salvas: [], salvasIndisponiveis: false };

export function reduzirConta(e: EstadoConta, a: AcaoConta): EstadoConta {
  switch (a.tipo) {
    case "visitante":
      return { ...ESTADO_INICIAL, fase: "visitante" };
    case "logou":
      // Mesma pessoa de novo (ex.: renovação da sessão): mantém tudo, inclusive o objeto do usuário (evita recarregar os dados).
      return e.usuario?.id === a.usuario.id ? { ...e, fase: "logada" } : { ...ESTADO_INICIAL, fase: "logada", usuario: a.usuario };
    case "dados":
      return { ...e, perfil: a.perfil, dadosProntos: true, perfilLido: a.perfilLido, salvas: a.salvas ?? [], salvasIndisponiveis: a.salvas === null };
    case "perfil":
      return { ...e, perfil: a.perfil, dadosProntos: true, perfilLido: true };
    case "salvas":
      return { ...e, salvas: a.salvas };
  }
}

export const habilidadesDe = (e: EstadoConta): string[] => e.perfil?.habilidades ?? [];

export const estaSalva = (salvas: VagaSalva[], vagaId: string): boolean => salvas.some((s) => s.vaga_id === vagaId);

/** Salva ou remove (alternando). A salva mais recente fica primeiro. `adicionou` diz o que aconteceu. */
export function alternarNaLista(salvas: VagaSalva[], vaga: ResumoDeVaga, agora: Date = new Date()): { salvas: VagaSalva[]; adicionou: boolean } {
  if (estaSalva(salvas, vaga.vaga_id)) return { salvas: salvas.filter((s) => s.vaga_id !== vaga.vaga_id), adicionou: false };
  return { salvas: [{ ...vaga, salva_em: agora.toISOString() }, ...salvas], adicionou: true };
}

/** Primeiro acesso: logada, perfil lido e sem nenhuma linha. É quando o onboarding de 3 passos deve aparecer. */
export const precisaDeOnboarding = (e: EstadoConta): boolean => e.fase === "logada" && e.perfilLido && e.perfil === null;
