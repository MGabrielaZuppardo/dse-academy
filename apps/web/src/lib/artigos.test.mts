import assert from "node:assert/strict";
import { test } from "node:test";
import { paraLinha, validar, type EnvioArtigo } from "./artigos.ts";

const valido: EnvioArtigo = {
  nome: "Ana Souza", email: "ana@exemplo.com", perfilMedium: "medium.com/@ana", linkedin: "", bio: "Engenheira de dados há 8 anos, escrevo sobre plataformas.",
  titulo: "Spark na prática", subtitulo: "", resumo: "Como reduzimos o custo de um pipeline em 40%.", tags: "Spark, Data Engineering, spark",
  idioma: "pt", linkRascunho: "docs.google.com/document/d/abc", publicadoAntes: "", dataDesejada: "", aceiteLgpd: true, aceiteDireitos: true,
};

test("envio válido passa e vira linha do banco", () => {
  assert.equal(validar(valido), null);
  const l = paraLinha(valido);
  assert.equal(l.perfil_medium, "https://medium.com/@ana");
  assert.equal(l.link_rascunho, "https://docs.google.com/document/d/abc");
  assert.deepEqual(l.tags, ["Spark", "Data Engineering"]);
  assert.equal(l.subtitulo, null);
  assert.equal(l.data_desejada, null);
});

test("rejeita o que o banco rejeitaria", () => {
  assert.match(validar({ ...valido, titulo: "Oi" })!, /título/);
  assert.match(validar({ ...valido, resumo: "curto" })!, /resumo/);
  assert.match(validar({ ...valido, resumo: "x".repeat(301) })!, /300/);
  assert.match(validar({ ...valido, tags: "a,b,c,d,e,f" })!, /no máximo 5/);
  assert.match(validar({ ...valido, tags: " " })!, /tag/);
  assert.match(validar({ ...valido, linkRascunho: "  " })!, /rascunho/);
  assert.match(validar({ ...valido, dataDesejada: "15/10/2026" })!, /data/);
  assert.match(validar({ ...valido, aceiteDireitos: false })!, /autor/);
  assert.match(validar({ ...valido, aceiteLgpd: false })!, /tratamento dos dados/);
});
