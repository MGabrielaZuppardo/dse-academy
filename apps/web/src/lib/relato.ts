/** Relato de erro numa vaga ("Algo errado nesta vaga?"). Espelha os checks de supabase/migrations/002_reportes_vaga.sql. */

export const TIPOS_RELATO = [
  ["stack_errada", "Tecnologia identificada errada"],
  ["nao_e_vaga_de_dados", "Não é uma vaga de dados"],
  ["senioridade_errada", "Nível errado"],
  ["vaga_encerrada", "A vaga já foi encerrada"],
  ["outro", "Outro problema"],
] as const;

export const MAX_DETALHE = 500;
export const MAX_STACKS_RELATO = 30;

export type DadosDaVagaRelatada = { id: string; titulo: string; empresa: string; url: string };
export type FormularioRelato = { tipo: string; stacks: string[]; detalhe: string };

export type LinhaRelato = {
  vaga_id: string;
  titulo: string | null;
  empresa: string | null;
  url: string | null;
  tipo: string;
  stacks: string[];
  detalhe: string | null;
};

/** Devolve a linha do banco ou uma mensagem de erro em português. */
export function montarRelato(vaga: DadosDaVagaRelatada, f: FormularioRelato): { linha: LinhaRelato } | { erro: string } {
  if (!TIPOS_RELATO.some(([id]) => id === f.tipo)) return { erro: "Escolha o que está errado." };
  const detalhe = f.detalhe.trim();
  if (detalhe.length > MAX_DETALHE) return { erro: `Os detalhes podem ter no máximo ${MAX_DETALHE} caracteres.` };
  return {
    linha: {
      vaga_id: vaga.id,
      titulo: vaga.titulo || null,
      empresa: vaga.empresa || null,
      url: vaga.url || null,
      tipo: f.tipo,
      stacks: f.tipo === "stack_errada" ? f.stacks.slice(0, MAX_STACKS_RELATO) : [], // só faz sentido nesse tipo
      detalhe: detalhe || null,
    },
  };
}
