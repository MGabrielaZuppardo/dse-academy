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

import { serieAcumulada, type Historico } from "./admin/resumo.ts";

const ZERO = { usuarios: 0, vagas_salvas: 0, inscricoes: 0, artigos: 0, palestrantes: 0, reportes: 0 };
const historico: Historico = {
  inicio: "2026-10-01",
  base: { ...ZERO, usuarios: 10 },
  dias: [
    { dia: "2026-10-01", ...ZERO, usuarios: 2 },
    { dia: "2026-10-02", ...ZERO },
    { dia: "2026-10-03", ...ZERO, usuarios: 3 },
  ],
};

test("o acumulado parte do que já existia antes da janela", () => {
  const s = serieAcumulada(historico, "usuarios", 30);
  assert.deepEqual(s.map((p) => p.total), [12, 12, 15]);
  assert.deepEqual(s.map((p) => p.novos), [2, 0, 3]);
});

test("mostrar só os últimos dias não perde o acumulado dos anteriores", () => {
  const s = serieAcumulada(historico, "usuarios", 2);
  assert.equal(s.length, 2);
  assert.equal(s[0].total, 12);
  assert.equal(s[1].total, 15);
});

test("métrica sem movimento fica parada no total inicial", () => {
  assert.deepEqual(serieAcumulada(historico, "artigos", 3).map((p) => p.total), [0, 0, 0]);
});
