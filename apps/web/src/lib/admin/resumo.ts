/** Formato dos números do painel de administração (função `admin_resumo` do Supabase) e funções puras para exibi-los. */

export type Contagem = { nome: string; n: number };

export type ResumoAdmin = {
  gerado_em: string;
  usuarios: { total: number; novos_7d: number; novos_30d: number; com_perfil: number };
  cadastros_por_dia: { dia: string; n: number }[];
  areas: Contagem[];
  senioridades: Contagem[];
  vagas_salvas: { total: number; pessoas: number };
  trilhas: { trilha_id: string; inscritos: number; skills_concluidas: number }[];
  artigos: { total: number; por_status: Record<string, number> };
  palestrantes: { total: number; por_status: Record<string, number> };
  reportes: {
    total: number;
    por_tipo: Record<string, number>;
    vagas_mais_reportadas: { vaga_id: string; titulo: string | null; empresa: string | null; n: number }[];
  };
};

export const STATUS_ARTIGO = [
  ["recebido", "Recebido"],
  ["em_revisao", "Em revisão"],
  ["aprovado", "Aprovado"],
  ["publicado", "Publicado"],
  ["recusado", "Recusado"],
] as const;

export const STATUS_PALESTRANTE = [
  ["pendente", "Pendente"],
  ["aprovado", "Aprovado"],
  ["recusado", "Recusado"],
] as const;

/** Largura (0 a 100) da barra de um valor em relação ao maior da série. Valor positivo nunca some: mínimo de 4%. */
export function larguraDaBarra(n: number, maximo: number): number {
  if (!(maximo > 0) || !(n > 0)) return 0;
  return Math.max(4, Math.round((n / maximo) * 100));
}

/** Soma dos valores de um objeto de contagens (por status, por tipo). */
export function somar(contagens: Record<string, number>): number {
  return Object.values(contagens).reduce((a, b) => a + b, 0);
}

/** Percentual inteiro de `parte` em `total`; 0 quando não há total. */
export function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Dia "2026-10-03" em "03/10", sem passar por fuso horário (a data já vem como dia do calendário). */
export function diaCurto(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

/** Histórico dia a dia (função `admin_historico`): novos por dia e o ponto de partida do acumulado. */
export type Metrica = "usuarios" | "vagas_salvas" | "inscricoes" | "artigos" | "palestrantes" | "reportes";

export const METRICAS: readonly (readonly [Metrica, string, string])[] = [
  ["usuarios", "Pessoas", "pessoas cadastradas"],
  ["vagas_salvas", "Vagas salvas", "vagas salvas"],
  ["inscricoes", "Inscrições em trilhas", "inscrições em trilhas"],
  ["artigos", "Artigos", "artigos enviados"],
  ["palestrantes", "Palestrantes", "palestrantes cadastrados"],
  ["reportes", "Relatos de erro", "relatos de erro"],
];

export type Historico = {
  inicio: string;
  base: Record<Metrica, number>;
  dias: ({ dia: string } & Record<Metrica, number>)[];
};

export type PontoDaSerie = { dia: string; novos: number; total: number };

/** Novos por dia e total acumulado de uma métrica, mostrando só os últimos `ultimos` dias (o acumulado considera tudo antes). */
export function serieAcumulada(h: Historico, metrica: Metrica, ultimos: number): PontoDaSerie[] {
  let total = h.base[metrica];
  const todos = h.dias.map((d) => {
    total += d[metrica];
    return { dia: d.dia, novos: d[metrica], total };
  });
  return todos.slice(-Math.max(1, ultimos));
}
