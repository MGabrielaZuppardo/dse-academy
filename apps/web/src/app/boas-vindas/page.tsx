import type { Metadata } from "next";
import { sugestoesDaArea } from "@/lib/aderencia";
import { AREAS } from "@/lib/rotulos";
import { carregarVagas } from "@/lib/vagas";
import { Onboarding, type SugestaoSkill } from "./onboarding";

export const metadata: Metadata = {
  title: "Boas-vindas",
  description: "Três passos para configurar o seu perfil: área, nível e habilidades.",
};

export default function Pagina() {
  const { vagas, skills } = carregarVagas();
  // Tecnologias mais pedidas por área (e em todas, na chave ""), para sugerir no passo 3.
  const sugestoes: Record<string, SugestaoSkill[]> = {};
  for (const area of ["", ...Object.keys(AREAS)]) {
    sugestoes[area] = sugestoesDaArea(vagas, area || null).map((s) => ({ nome: skills[s.id] ?? s.id, pct: s.pct }));
  }
  return <Onboarding skills={skills} sugestoes={sugestoes} />;
}
