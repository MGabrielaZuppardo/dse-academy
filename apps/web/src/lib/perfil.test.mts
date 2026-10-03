import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicas, chaveSkill, paraLinha, validar } from "./perfil.ts";
import { haQuanto, localDaVaga, slugDaVaga } from "./rotulos.ts";

const skills = { spark: "Apache Spark", power_bi: "Power BI", sql: "SQL" };

test("chaveSkill ignora acento, caixa e separadores", () => {
  assert.equal(chaveSkill("Power-BI"), "powerbi");
  assert.equal(chaveSkill("Apache Spark"), "apachespark");
});

test("canonicas usa o nome oficial, aceita id, mantém o desconhecido e remove repetidos", () => {
  assert.deepEqual(canonicas("power bi, SPARK, apache spark, sql; Rust", skills), ["Power BI", "Apache Spark", "SQL", "Rust"]);
  assert.deepEqual(canonicas("power_bi", skills), ["Power BI"]);
  assert.deepEqual(canonicas("", skills), []);
});

test("paraLinha vira nulo o que está vazio", () => {
  const l = paraLinha({ nome: "  ", area: "", senioridade: "pleno", habilidades: "sql" }, skills);
  assert.deepEqual(l, { nome: null, area: null, senioridade: "pleno", habilidades: ["SQL"] });
});

test("validar limita nome e quantidade de habilidades", () => {
  assert.match(validar({ nome: "x".repeat(121), area: "", senioridade: "", habilidades: "" }, skills)!, /120/);
  const muitas = Array.from({ length: 101 }, (_, i) => `skill${i}`).join(",");
  assert.match(validar({ nome: "", area: "", senioridade: "", habilidades: muitas }, skills)!, /100/);
  assert.equal(validar({ nome: "Ana", area: "bi", senioridade: "junior", habilidades: "sql" }, skills), null);
});

test("localDaVaga e haQuanto", () => {
  assert.equal(localDaVaga({ cidade: "Recife", uf: "PE", modelo: "hibrido" }), "Recife, PE");
  assert.equal(localDaVaga({ cidade: null, uf: null, modelo: "remoto" }), "Brasil");
  assert.equal(localDaVaga({ cidade: null, uf: null, modelo: null }), "Local não informado");
  const agora = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(haQuanto("2026-10-02T01:00:00Z", agora), "hoje");
  assert.equal(haQuanto("2026-10-01T01:00:00Z", agora), "ontem");
  assert.equal(haQuanto("2026-09-22T12:00:00Z", agora), "há 10 dias");
  assert.equal(haQuanto("2026-07-01T12:00:00Z", agora), "há 3 meses");
});

test("slugDaVaga tira o ':' e mantém ids distintos distintos", () => {
  assert.equal(slugDaVaga("gupy:12467224"), "gupy-12467224");
  assert.notEqual(slugDaVaga("gupy:1"), slugDaVaga("gupy:2"));
});
