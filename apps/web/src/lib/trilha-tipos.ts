/** Tipos e cálculos das trilhas de estudo. O JSON é gerado por `python -m trilhas.gerar`. */

import { chaveSkill } from "./perfil.ts";

export type NivelTrilha = "basico" | "intermediario" | "avancado";

export const NIVEIS_TRILHA: { id: NivelTrilha; nome: string; resumo: string }[] = [
  { id: "basico", nome: "Básico", resumo: "Os fundamentos para começar: linguagens, SQL, planilhas, BI, versionamento e os bancos de dados mais comuns." },
  { id: "intermediario", nome: "Intermediário", resumo: "O que times de dados usam no dia a dia: nuvem, orquestração, processamento, qualidade e modelos de ML." },
  { id: "avancado", nome: "Avançado", resumo: "Escala, arquitetura e especialização: streaming, infraestrutura, deep learning, LLMs e MLOps." },
];

export type Recurso = {
  titulo: string;
  url: string;
  idioma: "pt" | "en";
  tipo: string;
  nivel: NivelTrilha; // nível do conteúdo
  licenca?: string; // só quando a licença do repositório foi confirmada (SPDX)
};

export type SkillTrilha = { id: string; nome: string; demanda_pct: number; recursos: Recurso[] };

export type Projeto = { titulo: string; descricao: string; skills?: string[] };

export type EtapaTrilha = {
  id: string;
  titulo: string;
  objetivo: string;
  nivel: NivelTrilha;
  semanas: number;
  projetos: Projeto[];
  skills: SkillTrilha[];
};

export type Trilha = {
  id: string;
  titulo: string;
  area: string;
  descricao: string;
  vagas_base: number;
  semanas_total: number;
  origem: "llm" | "regras";
  conteudo_inicial: Recurso[];
  etapas: EtapaTrilha[];
};

export type DadosTrilhas = { gerado_em: string; coletada_em: string; modelo: string; trilhas: Trilha[] };

export function todasAsSkills(t: Trilha): SkillTrilha[] {
  return t.etapas.flatMap((e) => e.skills);
}

export type GrupoDeNivel = {
  id: NivelTrilha;
  nome: string;
  resumo: string;
  etapas: { etapa: EtapaTrilha; numero: number }[]; // numero = posição na trilha inteira (1, 2, 3...)
  semanas: number;
  tecnologias: number;
};

/** Etapas agrupadas do básico ao avançado, numeradas na ordem da trilha. Níveis sem etapa não aparecem. */
export function agruparPorNivel(t: Trilha): GrupoDeNivel[] {
  return NIVEIS_TRILHA.map((n) => {
    const etapas = t.etapas.map((etapa, i) => ({ etapa, numero: i + 1 })).filter((x) => x.etapa.nivel === n.id);
    return {
      ...n,
      etapas,
      semanas: etapas.reduce((soma, x) => soma + x.etapa.semanas, 0),
      tecnologias: etapas.reduce((soma, x) => soma + x.etapa.skills.length, 0),
    };
  }).filter((g) => g.etapas.length > 0);
}

/** Ids das skills da trilha que a pessoa já declarou no perfil (compara pelo nome ou id, sem acento e caixa). */
export function jaSabe(t: Trilha, habilidades: string[]): Set<string> {
  const minhas = new Set(habilidades.map(chaveSkill));
  return new Set(todasAsSkills(t).filter((s) => minhas.has(chaveSkill(s.nome)) || minhas.has(chaveSkill(s.id))).map((s) => s.id));
}

/** Progresso = concluídas marcadas na trilha + o que já está no perfil, sem contar duas vezes. */
export function progresso(t: Trilha, concluidas: string[], sabe: Set<string>): { feitas: number; total: number; pct: number } {
  const ids = todasAsSkills(t).map((s) => s.id);
  const feitas = ids.filter((id) => sabe.has(id) || concluidas.includes(id)).length;
  return { feitas, total: ids.length, pct: ids.length ? Math.round((100 * feitas) / ids.length) : 0 };
}

/** Etiqueta curta do tipo de conteúdo para exibir ao lado do link. */
export function rotuloDoRecurso(r: Recurso): string[] {
  return [r.tipo, r.idioma === "pt" ? "português" : "inglês", "gratuito", ...(r.licenca ? [`licença ${r.licenca}`] : [])];
}
