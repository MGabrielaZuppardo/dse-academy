/** Regras do cadastro de palestrantes. Espelham os checks de supabase/migrations/004_palestrantes.sql. */

import { lista, normalizarLink } from "./texto.ts";

export { lista, normalizarLink };

export const FORMATOS = [
  ["palestra", "Palestra"],
  ["workshop", "Workshop"],
  ["painel", "Painel"],
  ["mentoria", "Mentoria"],
] as const;

export const MODALIDADES = [
  ["remoto", "Remoto"],
  ["presencial", "Presencial"],
  ["ambos", "Remoto ou presencial"],
] as const;

export const IDIOMAS = [
  ["pt", "Português"],
  ["en", "Inglês"],
  ["es", "Espanhol"],
] as const;

export const MAX_TEMAS = 10;

export type CadastroPalestrante = {
  nome: string;
  email: string;
  cargo: string;
  empresa: string;
  bio: string;
  linkedin: string;
  site: string;
  temas: string;
  formatos: string[];
  modalidade: string;
  cidade: string;
  uf: string;
  idiomas: string[];
  linksAnteriores: string;
  aceiteLgpd: boolean;
  aceitePublicacao: boolean;
};

export type LinhaPalestrante = {
  nome: string;
  email: string;
  cargo: string | null;
  empresa: string | null;
  bio: string;
  linkedin: string | null;
  site: string | null;
  temas: string[];
  formatos: string[];
  modalidade: string;
  cidade: string | null;
  uf: string | null;
  idiomas: string[];
  links_anteriores: string[];
  aceite_lgpd: boolean;
  aceite_publicacao: boolean;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Devolve a primeira mensagem de erro (em português) ou null quando o cadastro está válido. */
export function validar(c: CadastroPalestrante): string | null {
  if (c.nome.trim().length < 2) return "Informe seu nome.";
  if (!EMAIL.test(c.email.trim()) || c.email.trim().length > 254) return "Informe um e-mail válido.";
  const bio = c.bio.trim().length;
  if (bio < 20) return "Conte um pouco mais na mini bio (mínimo de 20 caracteres).";
  if (bio > 800) return "A mini bio pode ter no máximo 800 caracteres.";
  const temas = lista(c.temas);
  if (temas.length === 0) return "Informe ao menos um tema.";
  if (temas.length > MAX_TEMAS) return `Informe no máximo ${MAX_TEMAS} temas.`;
  if (c.formatos.length === 0) return "Escolha ao menos um formato.";
  if (!c.modalidade) return "Escolha a modalidade.";
  if (c.idiomas.length === 0) return "Escolha ao menos um idioma.";
  if (c.uf && !/^[A-Za-z]{2}$/.test(c.uf.trim())) return "O estado deve ter 2 letras (ex.: SP).";
  if (lista(c.linksAnteriores).length > 5) return "Informe no máximo 5 links de palestras anteriores.";
  if (!c.aceiteLgpd) return "É preciso concordar com o tratamento dos dados para enviar.";
  return null;
}

export function paraLinha(c: CadastroPalestrante): LinhaPalestrante {
  const vazioParaNulo = (s: string) => s.trim() || null;
  const link = (s: string) => normalizarLink(s) || null;
  return {
    nome: c.nome.trim(),
    email: c.email.trim(),
    cargo: vazioParaNulo(c.cargo),
    empresa: vazioParaNulo(c.empresa),
    bio: c.bio.trim(),
    linkedin: link(c.linkedin),
    site: link(c.site),
    temas: lista(c.temas),
    formatos: c.formatos,
    modalidade: c.modalidade,
    cidade: vazioParaNulo(c.cidade),
    uf: c.uf.trim() ? c.uf.trim().toUpperCase() : null,
    idiomas: c.idiomas,
    links_anteriores: lista(c.linksAnteriores).map(normalizarLink),
    aceite_lgpd: c.aceiteLgpd,
    aceite_publicacao: c.aceitePublicacao,
  };
}
