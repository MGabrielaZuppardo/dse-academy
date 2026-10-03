import assert from "node:assert/strict";
import { test } from "node:test";
import { BOTAO_ICONE, estiloBotao, type VarianteBotao } from "./botoes.ts";

const TODAS: VarianteBotao[] = ["primario", "secundario", "discreto", "perigo", "foto-primario", "foto-secundario"];

test("todo botão normal tem pelo menos 44 px de altura para tocar no celular", () => {
  for (const v of TODAS) assert.match(estiloBotao(v), /\bmin-h-11\b/, v);
});

test("o tamanho pequeno é só para ações secundárias dentro de listas", () => {
  assert.match(estiloBotao("secundario", "pequeno"), /\bmin-h-9\b/);
  assert.doesNotMatch(estiloBotao("secundario", "pequeno"), /min-h-11/);
});

test("cada variante tem a sua aparência e todas ficam desabilitáveis", () => {
  assert.match(estiloBotao("primario"), /bg-azul/);
  assert.match(estiloBotao("secundario"), /border-borda/);
  assert.match(estiloBotao("discreto"), /underline/);
  assert.match(estiloBotao("perigo"), /text-erro/);
  assert.match(estiloBotao("foto-primario"), /bg-white/);
  assert.match(estiloBotao("foto-secundario"), /border-white/);
  for (const v of TODAS) assert.match(estiloBotao(v), /disabled:opacity-60/, v);
});

test("não existem duas variantes com o mesmo estilo (a hierarquia visual é real)", () => {
  const estilos = TODAS.map((v) => estiloBotao(v));
  assert.equal(new Set(estilos).size, TODAS.length);
});

test("botão de ícone tem 40 px", () => {
  assert.match(BOTAO_ICONE, /h-10 w-10/);
});
