import assert from "node:assert/strict";
import { test } from "node:test";
import { lista, normalizarLink, paraLinha, validar, type CadastroPalestrante } from "./palestrantes.ts";

const valido: CadastroPalestrante = {
  nome: "Ana Souza", email: "ana@exemplo.com", cargo: "", empresa: "", bio: "Engenheira de dados há 8 anos, foco em plataformas.",
  linkedin: "linkedin.com/in/ana", site: "", temas: "Spark, dbt; Qualidade de dados\nspark", formatos: ["palestra"],
  modalidade: "remoto", cidade: "", uf: "sp", idiomas: ["pt"], linksAnteriores: "", aceiteLgpd: true, aceitePublicacao: false,
};

test("lista separa, limpa e remove repetidos sem diferenciar maiúsculas", () => {
  assert.deepEqual(lista("Spark, dbt;  Qualidade  de dados\nspark,,"), ["Spark", "dbt", "Qualidade de dados"]);
});

test("normalizarLink força https", () => {
  assert.equal(normalizarLink("linkedin.com/in/ana"), "https://linkedin.com/in/ana");
  assert.equal(normalizarLink("http://x.com"), "https://x.com");
  assert.equal(normalizarLink("  "), "");
});

test("cadastro válido passa e vira linha do banco", () => {
  assert.equal(validar(valido), null);
  const l = paraLinha(valido);
  assert.equal(l.uf, "SP");
  assert.equal(l.linkedin, "https://linkedin.com/in/ana");
  assert.equal(l.cargo, null);
  assert.deepEqual(l.temas, ["Spark", "dbt", "Qualidade de dados"]);
});

test("rejeita o que o banco rejeitaria", () => {
  assert.match(validar({ ...valido, email: "ana@" })!, /e-mail/);
  assert.match(validar({ ...valido, bio: "curta" })!, /bio/);
  assert.match(validar({ ...valido, temas: " , " })!, /tema/);
  assert.match(validar({ ...valido, temas: "a,b,c,d,e,f,g,h,i,j,k" })!, /no máximo 10/);
  assert.match(validar({ ...valido, formatos: [] })!, /formato/);
  assert.match(validar({ ...valido, aceiteLgpd: false })!, /tratamento dos dados/);
  assert.match(validar({ ...valido, uf: "SAO" })!, /2 letras/);
});
