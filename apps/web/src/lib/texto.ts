/** Utilidades de texto compartilhadas pelos formulários. */

/** Separa por vírgula, ponto e vírgula ou quebra de linha; tira vazios e repetidos (sem diferenciar maiúsculas). */
export function lista(texto: string): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of texto.split(/[,;\n]/)) {
    const item = bruto.trim().replace(/\s+/g, " ");
    if (item && !vistos.has(item.toLowerCase())) {
      vistos.add(item.toLowerCase());
      saida.push(item);
    }
  }
  return saida;
}

/** O banco exige https:// nos links; quem digita "linkedin.com/in/x" não precisa saber disso. */
export function normalizarLink(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  return "https://" + u.replace(/^(http:\/\/|\/\/)/i, "");
}

/** Minúsculas e sem acento, para buscar sem se importar com "Análise" x "analise". */
export function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
