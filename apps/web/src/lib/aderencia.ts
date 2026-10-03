/** Aderência da pessoa às vagas. Porta a lógica do site antigo (app/web/app.js), em funções puras. */

import { chaveSkill } from "./perfil.ts";
import { AREAS, NOME_NIVEL, type Vaga } from "./rotulos.ts";

/** "1 de 1" (100%) não pode passar à frente de "6 de 8" (75%), que diz muito mais: a nota soma 2 ao total. */
export const SUAVIZACAO_ADERENCIA = 2;

const AREA_DE_NEGOCIO = "negocio_com_dados"; // aparece na busca, mas não entra nos rankings de "todas as áreas"

export type Conhecidas = { ids: Set<string>; naoReconhecidas: string[] };

/** Habilidades digitadas ou salvas -> ids da taxonomia, incluindo as skills-pai (quem sabe Glue também sabe AWS). */
export function conhecidasDe(habilidades: string[], sinonimos: Record<string, string>, pais: Record<string, string>): Conhecidas {
  const ids = new Set<string>();
  const naoReconhecidas: string[] = [];
  for (const bruta of habilidades) {
    const h = bruta.trim();
    if (!h) continue;
    const id = sinonimos[chaveSkill(h)];
    if (!id) { naoReconhecidas.push(h); continue; }
    for (let atual: string | undefined = id, n = 0; atual && n < 10; atual = pais[atual], n++) ids.add(atual);
  }
  return { ids, naoReconhecidas };
}

type DadosDeStacks = Pick<Vaga, "enriquecida" | "obrigatorias" | "desejaveis" | "citadas">;

/** Stacks da vaga: as do LLM quando ela foi enriquecida; senão, as encontradas por palavra-chave na descrição. */
export function stacksDaVaga(v: DadosDeStacks): { principais: string[]; todas: string[] } {
  return v.enriquecida
    ? { principais: v.obrigatorias, todas: [...v.obrigatorias, ...v.desejaveis] }
    : { principais: v.citadas, todas: v.citadas };
}

export type Aderencia = { tem: number; total: number; pct: number; nota: number };

/** pct e nota valem -1 quando a vaga não tem stacks identificadas (vão para o fim da ordenação). */
export function calcularAderencia(principais: string[], conhecidas: Set<string>): Aderencia {
  const tem = principais.filter((id) => conhecidas.has(id)).length;
  const total = principais.length;
  return { tem, total, pct: total ? Math.round((100 * tem) / total) : -1, nota: total ? tem / (total + SUAVIZACAO_ADERENCIA) : -1 };
}

/** Do mais aderente ao menos; o empate mantém a ordem recebida (que costuma ser a da data de publicação). */
export function ordenarPorAderencia<T>(itens: T[], notaDe: (item: T) => number): T[] {
  return itens.map((item, i) => ({ item, i, nota: notaDe(item) })).sort((a, b) => b.nota - a.nota || a.i - b.i).map((x) => x.item);
}

export type Encaixe = { tipo: "ok" | "atencao" | "neutro"; texto: string };

const ORDEM_NIVEL = ["entrada", "junior", "pleno", "senior", "especialista"];

export function encaixeNivel(nivelDaVaga: string | null, alvo: string | null): Encaixe {
  if (!alvo) return { tipo: "neutro", texto: "Você não informou o nível que busca." };
  if (!nivelDaVaga) return { tipo: "neutro", texto: "A vaga não deixa o nível claro." };
  const da = NOME_NIVEL[nivelDaVaga] ?? nivelDaVaga;
  const buscado = NOME_NIVEL[alvo] ?? alvo;
  if (nivelDaVaga === alvo) return { tipo: "ok", texto: `A vaga é ${da}, o nível que você busca.` };
  const diferenca = ORDEM_NIVEL.indexOf(nivelDaVaga) - ORDEM_NIVEL.indexOf(alvo);
  if (ORDEM_NIVEL.includes(nivelDaVaga) && ORDEM_NIVEL.includes(alvo) && Math.abs(diferenca) === 1) {
    return { tipo: "atencao", texto: `A vaga é ${da}, um nível ${diferenca > 0 ? "acima" : "abaixo"} do que você busca (${buscado}).` };
  }
  return { tipo: "atencao", texto: `A vaga é ${da}; você busca ${buscado}.` };
}

export function encaixeArea(areaDaVaga: string | null, alvo: string | null): Encaixe {
  if (!alvo) return { tipo: "neutro", texto: "Você não informou a área de interesse." };
  if (!areaDaVaga) return { tipo: "neutro", texto: "Não identificamos a área da vaga pelo título." };
  const da = AREAS[areaDaVaga] ?? areaDaVaga;
  if (areaDaVaga === alvo) return { tipo: "ok", texto: `A vaga é de ${da}, a sua área de interesse.` };
  return { tipo: "atencao", texto: `A vaga é de ${da}; sua área de interesse é ${AREAS[alvo] ?? alvo}.` };
}

/** Quanto cada tecnologia é pedida nas vagas da mesma área (as que têm stacks), em % das vagas. Ordena o "o que falta". */
export function demandaNaArea(vagas: Vaga[], area: string | null): { pct: Record<string, number>; total: number } {
  const similares = vagas.filter((x) => stacksDaVaga(x).todas.length && (!area || x.area === area));
  const contagem: Record<string, number> = {};
  for (const x of similares) for (const id of stacksDaVaga(x).principais) contagem[id] = (contagem[id] ?? 0) + 1;
  const pct: Record<string, number> = {};
  for (const [id, n] of Object.entries(contagem)) pct[id] = similares.length ? Math.round((100 * n) / similares.length) : 0;
  return { pct, total: similares.length };
}

/** As tecnologias mais pedidas na área (ou em todas, sem área), para sugerir no onboarding. */
export function sugestoesDaArea(vagas: Vaga[], area: string | null, quantas = 12): { id: string; pct: number }[] {
  const pool = vagas.filter((v) => stacksDaVaga(v).todas.length && (area ? v.area === area : v.area !== AREA_DE_NEGOCIO));
  const contagem = new Map<string, number>();
  for (const v of pool) for (const id of stacksDaVaga(v).principais) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, quantas)
    .map(([id, n]) => ({ id, pct: Math.round((100 * n) / (pool.length || 1)) }));
}
