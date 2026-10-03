/** Rótulos e tipos das vagas. Os ids são os mesmos do pipeline (enrichment/) e do site atual (app/web/app.js). */

export const NIVEIS = [
  ["entrada", "Entrada"],
  ["junior", "Júnior"],
  ["pleno", "Pleno"],
  ["senior", "Sênior"],
  ["especialista", "Especialista"],
  ["gestao", "Gestão"],
] as const;

export const AREAS: Record<string, string> = {
  engenharia_dados: "Engenharia de Dados",
  analise_dados: "Análise de Dados",
  ciencia_dados: "Ciência de Dados",
  ml_engineering: "Machine Learning",
  analytics_engineering: "Analytics Engineering",
  bi: "BI",
  governanca_dados: "Governança de Dados",
  dba: "Banco de Dados (DBA)",
  gestao_dados: "Gestão de Dados",
  negocio_com_dados: "Negócios com foco em dados",
};

export const MODELOS: Record<string, string> = { remoto: "Remoto", hibrido: "Híbrido", presencial: "Presencial" };

export const CONTRATOS: Record<string, string> = {
  clt: "CLT", pj: "PJ", estagio: "Estágio", trainee: "Trainee", aprendiz: "Aprendiz", temporario: "Temporário",
  cooperado: "Cooperado", autonomo: "Autônomo", terceirizado: "Terceirizado", banco_talentos: "Banco de talentos", outro: "Outro",
};

export const NOME_NIVEL: Record<string, string> = Object.fromEntries(NIVEIS);

export type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  uf: string | null;
  cidade: string | null;
  modelo: string | null;
  contrato: string | null;
  pcd: boolean;
  publicada_em: string;
  prazo: string | null;
  url: string;
  citadas: string[]; // ids de skills achadas na descrição
  duplicatas: number;
  enriquecida: boolean;
  area: string | null;
  senioridade: string | null;
  obrigatorias: string[];
  desejaveis: string[];
  salario: [number | null, number | null] | null;
};

export type DadosVagas = {
  coletada_em: string;
  skills: Record<string, string>; // id -> nome de exibição
  vagas: Vaga[];
};

export function localDaVaga(v: Pick<Vaga, "cidade" | "uf" | "modelo">): string {
  if (v.cidade && v.uf) return `${v.cidade}, ${v.uf}`;
  return v.uf || v.cidade || (v.modelo === "remoto" ? "Brasil" : "Local não informado");
}

export function haQuanto(iso: string, agora: number = Date.now()): string {
  const dias = Math.max(0, Math.floor((agora - Date.parse(iso)) / 864e5));
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

/** Identificador da vaga na URL: sem ":" (o id é "gupy:123"), que o Windows não aceita em nome de arquivo. */
export function slugDaVaga(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]+/g, "-");
}
