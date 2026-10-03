import assert from "node:assert/strict";
import { test } from "node:test";
import { diaCurto, larguraDaBarra, percentual, somar } from "./admin/resumo.ts";

test("a barra do maior valor ocupa tudo e as outras são proporcionais", () => {
  assert.equal(larguraDaBarra(10, 10), 100);
  assert.equal(larguraDaBarra(5, 10), 50);
});

test("valor positivo pequeno ainda aparece; zero ou série vazia não desenha barra", () => {
  assert.equal(larguraDaBarra(1, 1000), 4);
  assert.equal(larguraDaBarra(0, 10), 0);
  assert.equal(larguraDaBarra(3, 0), 0);
});

test("somar e percentual tratam objetos vazios e total zero", () => {
  assert.equal(somar({ recebido: 2, publicado: 3 }), 5);
  assert.equal(somar({}), 0);
  assert.equal(percentual(1, 4), 25);
  assert.equal(percentual(1, 0), 0);
});

test("diaCurto mostra dia/mês", () => {
  assert.equal(diaCurto("2026-10-03"), "03/10");
  assert.equal(diaCurto("sem-formato"), "sem-formato");
});
