/** Liga as tecnologias de uma vaga ao ponto certo das trilhas de estudo ("falta SQL? comece por aqui"). */

import type { NivelTrilha, Trilha } from "./trilha-tipos.ts";

export type PassoDaTrilha = {
  trilhaId: string;
  trilhaTitulo: string;
  etapaTitulo: string;
  nivel: NivelTrilha;
  href: string; // /trilhas/<id>#skill-<skill>: a página destaca a tecnologia
};

export const ancoraDaSkill = (skillId: string) => `skill-${skillId}`;

/** A trilha da área da vaga, se ela existir (áreas com poucas vagas não têm trilha). */
export function trilhaDaArea(area: string | null, trilhas: Trilha[]): Trilha | null {
  return area ? trilhas.find((t) => t.area === area) ?? null : null;
}

function acharNaTrilha(skillId: string, t: Trilha): PassoDaTrilha | null {
  for (const etapa of t.etapas) {
    if (etapa.skills.some((s) => s.id === skillId)) {
      return { trilhaId: t.id, trilhaTitulo: t.titulo, etapaTitulo: etapa.titulo, nivel: etapa.nivel, href: `/trilhas/${t.id}#${ancoraDaSkill(skillId)}` };
    }
  }
  return null;
}

/** Onde estudar a tecnologia: na trilha da área da vaga; se ela não estiver lá, na primeira trilha que a traga. */
export function passoDaSkill(skillId: string, area: string | null, trilhas: Trilha[]): PassoDaTrilha | null {
  const daArea = trilhaDaArea(area, trilhas);
  const ordem = daArea ? [daArea, ...trilhas.filter((t) => t !== daArea)] : trilhas;
  for (const t of ordem) {
    const passo = acharNaTrilha(skillId, t);
    if (passo) return passo;
  }
  return null;
}

export function passosDasStacks(stacks: string[], area: string | null, trilhas: Trilha[]): Record<string, PassoDaTrilha> {
  const saida: Record<string, PassoDaTrilha> = {};
  for (const id of stacks) {
    const passo = passoDaSkill(id, area, trilhas);
    if (passo) saida[id] = passo;
  }
  return saida;
}
