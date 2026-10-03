/** Regras do perfil da pessoa. Espelham os checks de supabase/migrations/001_perfil_candidato.sql. */

import { lista } from "./texto.ts";

export const MAX_HABILIDADES = 100;

export type PerfilForm = { nome: string; area: string; senioridade: string; habilidades: string };

export type LinhaPerfil = { nome: string | null; area: string | null; senioridade: string | null; habilidades: string[] };

/** Mesma regra de enrichment/taxonomia.py::chave_skill: sem acento, minúsculas, sem espaços, hífen, _ e ponto. */
export function chaveSkill(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s\-_.]/g, "");
}

/** "apache spark" e "Spark" viram o nome oficial da skill quando existe; o que não existe fica como foi digitado. */
export function canonicas(texto: string, skills: Record<string, string>): string[] {
  const porChave = new Map<string, string>();
  for (const [id, nome] of Object.entries(skills)) {
    porChave.set(chaveSkill(nome), nome);
    porChave.set(chaveSkill(id), nome);
  }
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const item of lista(texto)) {
    const nome = porChave.get(chaveSkill(item)) ?? item;
    if (!vistos.has(chaveSkill(nome))) {
      vistos.add(chaveSkill(nome));
      saida.push(nome);
    }
  }
  return saida;
}

export function validar(p: PerfilForm, skills: Record<string, string>): string | null {
  if (p.nome.trim().length > 120) return "O nome pode ter no máximo 120 caracteres.";
  if (canonicas(p.habilidades, skills).length > MAX_HABILIDADES) return `Informe no máximo ${MAX_HABILIDADES} habilidades.`;
  return null;
}

export function paraLinha(p: PerfilForm, skills: Record<string, string>): LinhaPerfil {
  return {
    nome: p.nome.trim() || null,
    area: p.area || null,
    senioridade: p.senioridade || null,
    habilidades: canonicas(p.habilidades, skills),
  };
}
