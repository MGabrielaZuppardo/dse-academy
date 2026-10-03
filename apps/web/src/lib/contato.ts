/** Canais de contato da DSE Academy, usados na página "Fale conosco" e no rodapé. */

export const EMAIL_CONTATO = process.env.NEXT_PUBLIC_CONTATO_EMAIL || "academydserec@gmail.com";

/** Só aceita https em linkedin.com (ou subdomínio): uma variável mal preenchida não vira link quebrado ou estranho. */
export function linkedinValido(url: string | undefined): string | null {
  try {
    const u = new URL(url ?? "");
    return u.protocol === "https:" && /(^|\.)linkedin\.com$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Só aceita https em linktr.ee (ou subdomínio), pelo mesmo motivo do LinkedIn. */
export function linktreeValido(url: string | undefined): string | null {
  try {
    const u = new URL(url ?? "");
    return u.protocol === "https:" && /(^|\.)linktr\.ee$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

const LINKEDIN_PADRAO = "https://www.linkedin.com/company/dse-community/";

/** Página da DSE Community no LinkedIn. NEXT_PUBLIC_LINKEDIN_URL sobrescreve o padrão; valor inválido cai no padrão. */
export const LINKEDIN_URL = linkedinValido(process.env.NEXT_PUBLIC_LINKEDIN_URL) ?? LINKEDIN_PADRAO;

const LINKTREE_PADRAO = "https://linktr.ee/dsebrasil";

/** Todos os links da comunidade num só lugar. NEXT_PUBLIC_LINKTREE_URL sobrescreve o padrão; valor inválido cai no padrão. */
export const LINKTREE_URL = linktreeValido(process.env.NEXT_PUBLIC_LINKTREE_URL) ?? LINKTREE_PADRAO;
