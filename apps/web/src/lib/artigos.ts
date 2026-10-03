/** Regras do envio de artigos. Espelham os checks de supabase/migrations/005_submissoes_artigos.sql. */

import { lista, normalizarLink } from "./texto.ts";

export const IDIOMAS_ARTIGO = [
  ["pt", "Português"],
  ["en", "Inglês"],
  ["es", "Espanhol"],
] as const;

export const MAX_TAGS = 5; // limite do Medium

export type EnvioArtigo = {
  nome: string;
  email: string;
  perfilMedium: string;
  linkedin: string;
  bio: string;
  titulo: string;
  subtitulo: string;
  resumo: string;
  tags: string;
  idioma: string;
  linkRascunho: string;
  publicadoAntes: string;
  dataDesejada: string;
  aceiteLgpd: boolean;
  aceiteDireitos: boolean;
};

export type LinhaArtigo = {
  nome: string;
  email: string;
  perfil_medium: string | null;
  linkedin: string | null;
  bio: string;
  titulo: string;
  subtitulo: string | null;
  resumo: string;
  tags: string[];
  idioma: string;
  link_rascunho: string;
  publicado_antes: string | null;
  data_desejada: string | null;
  aceite_lgpd: boolean;
  aceite_direitos: boolean;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Devolve a primeira mensagem de erro (em português) ou null quando o envio está válido. */
export function validar(a: EnvioArtigo): string | null {
  if (a.nome.trim().length < 2) return "Informe seu nome.";
  if (!EMAIL.test(a.email.trim()) || a.email.trim().length > 254) return "Informe um e-mail válido.";
  const bio = a.bio.trim().length;
  if (bio < 20) return "Conte um pouco mais na mini bio (mínimo de 20 caracteres).";
  if (bio > 500) return "A mini bio pode ter no máximo 500 caracteres.";
  const titulo = a.titulo.trim().length;
  if (titulo < 5) return "Informe o título do artigo.";
  if (titulo > 150) return "O título pode ter no máximo 150 caracteres.";
  if (a.subtitulo.trim().length > 200) return "O subtítulo pode ter no máximo 200 caracteres.";
  const resumo = a.resumo.trim().length;
  if (resumo < 20) return "Escreva um resumo um pouco maior (mínimo de 20 caracteres).";
  if (resumo > 300) return "O resumo pode ter no máximo 300 caracteres.";
  const tags = lista(a.tags);
  if (tags.length === 0) return "Informe ao menos uma tag.";
  if (tags.length > MAX_TAGS) return `Informe no máximo ${MAX_TAGS} tags (limite do Medium).`;
  if (!a.idioma) return "Escolha o idioma do artigo.";
  if (!a.linkRascunho.trim()) return "Informe o link do rascunho (Google Docs ou rascunho do Medium).";
  if (a.dataDesejada && !DATA.test(a.dataDesejada)) return "Informe a data desejada no formato correto.";
  if (!a.aceiteDireitos) return "Confirme que você é autor(a) do texto e autoriza a publicação.";
  if (!a.aceiteLgpd) return "É preciso concordar com o tratamento dos dados para enviar.";
  return null;
}

export function paraLinha(a: EnvioArtigo): LinhaArtigo {
  const vazioParaNulo = (s: string) => s.trim() || null;
  const link = (s: string) => normalizarLink(s) || null;
  return {
    nome: a.nome.trim(),
    email: a.email.trim(),
    perfil_medium: link(a.perfilMedium),
    linkedin: link(a.linkedin),
    bio: a.bio.trim(),
    titulo: a.titulo.trim(),
    subtitulo: vazioParaNulo(a.subtitulo),
    resumo: a.resumo.trim(),
    tags: lista(a.tags),
    idioma: a.idioma,
    link_rascunho: normalizarLink(a.linkRascunho),
    publicado_antes: link(a.publicadoAntes),
    data_desejada: vazioParaNulo(a.dataDesejada),
    aceite_lgpd: a.aceiteLgpd,
    aceite_direitos: a.aceiteDireitos,
  };
}
