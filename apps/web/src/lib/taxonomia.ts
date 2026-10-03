/** Taxonomia de skills empacotada no site (gerada por `python -m app.exportar_json`; um teste Python garante que está em dia). */

import dados from "@/dados/taxonomia.json";

export const SKILLS: Record<string, string> = dados.skills; // id -> nome de exibição
export const SINONIMOS: Record<string, string> = dados.sinonimos; // chaveSkill(texto) -> id (inclui o nome oficial)
export const PAIS: Record<string, string> = dados.pais; // skill -> skill mais ampla que também conta (Glue -> AWS)
