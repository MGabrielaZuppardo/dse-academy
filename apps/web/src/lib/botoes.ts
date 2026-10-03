/**
 * Estilo único dos botões do site (também para links com cara de botão). Um lugar só, para a hierarquia ficar igual em todas as telas:
 *
 *  - primario:   a ação principal da tela (uma por contexto). Azul.
 *  - secundario: ação alternativa. Contorno.
 *  - discreto:   ação de baixa importância, em forma de texto sublinhado ("Pular por agora").
 *  - perigo:     ação destrutiva, em texto vermelho sublinhado ("Excluir minha conta").
 *  - foto-primario / foto-secundario: os mesmos papéis sobre fotos escuras (destaque da home).
 *
 * Todo botão "normal" tem pelo menos 44 px de altura, o tamanho confortável para tocar no celular.
 */

export type VarianteBotao = "primario" | "secundario" | "discreto" | "perigo" | "foto-primario" | "foto-secundario";
export type TamanhoBotao = "normal" | "pequeno";

const BASE = "inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const TAMANHO: Record<TamanhoBotao, string> = {
  normal: "min-h-11 px-5 py-2",
  pequeno: "min-h-9 px-3 py-1.5 text-sm",
};

const VARIANTE: Record<VarianteBotao, string> = {
  primario: "rounded-lg bg-azul font-semibold text-white hover:opacity-90",
  secundario: "rounded-lg border border-borda bg-superficie font-semibold text-titulo hover:border-link",
  discreto: "rounded-lg font-medium text-suave underline hover:text-link",
  perigo: "rounded-lg font-medium text-erro underline hover:opacity-80",
  "foto-primario": "rounded-lg bg-white font-semibold text-marinho hover:bg-white/90",
  "foto-secundario": "rounded-lg border border-white/60 font-semibold text-white hover:border-white hover:bg-white/10",
};

export function estiloBotao(variante: VarianteBotao, tamanho: TamanhoBotao = "normal"): string {
  return `${BASE} ${TAMANHO[tamanho]} ${VARIANTE[variante]}`;
}

/** Botão só com ícone (tema, pausar, salvar): 40 px, redondo. A cor e a borda ficam por conta de quem usa. */
export const BOTAO_ICONE = "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors";
