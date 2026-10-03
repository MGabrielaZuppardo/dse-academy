import assert from "node:assert/strict";
import { test } from "node:test";
import { montarRelato } from "./relato.ts";
import { passoDaSkill, passosDasStacks, trilhaDaArea } from "./ligacao-trilhas.ts";
import type { EtapaTrilha, Trilha } from "./trilha-tipos.ts";

const etapa = (id: string, nivel: EtapaTrilha["nivel"], skills: string[]): EtapaTrilha => ({
  id, titulo: `Etapa ${id}`, objetivo: "o", nivel, semanas: 2, projetos: [],
  skills: skills.map((s) => ({ id: s, nome: s.toUpperCase(), demanda_pct: 50, recursos: [] })),
});
const trilha = (area: string, etapas: EtapaTrilha[]): Trilha => ({
  id: area, titulo: `Trilha de ${area}`, area, descricao: "d", vagas_base: 10, semanas_total: 4, origem: "regras", conteudo_inicial: [], etapas,
});
const bi = trilha("bi", [etapa("bi-1", "basico", ["sql", "power_bi"]), etapa("bi-2", "avancado", ["dax"])]);
const dba = trilha("dba", [etapa("dba-1", "basico", ["sql", "postgresql"])]);

test("trilhaDaArea acha a trilha da área ou devolve nulo", () => {
  assert.equal(trilhaDaArea("bi", [dba, bi])?.id, "bi");
  assert.equal(trilhaDaArea("gestao_dados", [dba, bi]), null);
  assert.equal(trilhaDaArea(null, [dba, bi]), null);
});

test("passoDaSkill prefere a trilha da área da vaga, mesmo que outra também traga a skill", () => {
  const p = passoDaSkill("sql", "bi", [dba, bi])!;
  assert.equal(p.trilhaId, "bi");
  assert.equal(p.href, "/trilhas/bi#skill-sql");
  assert.equal(p.etapaTitulo, "Etapa bi-1");
  assert.equal(passoDaSkill("sql", "dba", [dba, bi])!.trilhaId, "dba");
});

test("passoDaSkill cai em outra trilha quando a da área não tem a skill, e nulo quando nenhuma tem", () => {
  assert.equal(passoDaSkill("postgresql", "bi", [dba, bi])!.trilhaId, "dba");
  assert.equal(passoDaSkill("kafka", "bi", [dba, bi]), null);
  assert.equal(passoDaSkill("sql", null, [dba, bi])!.trilhaId, "dba"); // sem área: a primeira que tiver
});

test("passosDasStacks devolve só as skills que existem em alguma trilha, com o nível da etapa", () => {
  const m = passosDasStacks(["sql", "dax", "kafka"], "bi", [bi, dba]);
  assert.deepEqual(Object.keys(m).sort(), ["dax", "sql"]);
  assert.equal(m.dax.nivel, "avancado");
});

const vaga = { id: "gupy:1", titulo: "Analista", empresa: "Acme", url: "https://x.org/v" };

test("montarRelato monta a linha do banco e só leva as stacks no tipo stack_errada", () => {
  const r = montarRelato(vaga, { tipo: "stack_errada", stacks: ["SQL", "Spark"], detalhe: "  não pede Spark  " });
  assert.ok("linha" in r);
  assert.deepEqual(r.linha, { vaga_id: "gupy:1", titulo: "Analista", empresa: "Acme", url: "https://x.org/v", tipo: "stack_errada", stacks: ["SQL", "Spark"], detalhe: "não pede Spark" });
  const outro = montarRelato(vaga, { tipo: "vaga_encerrada", stacks: ["SQL"], detalhe: "" });
  assert.ok("linha" in outro);
  assert.deepEqual([outro.linha.stacks, outro.linha.detalhe], [[], null]);
});

test("montarRelato recusa tipo inválido e detalhe grande demais, e corta stacks além de 30", () => {
  assert.ok("erro" in montarRelato(vaga, { tipo: "", stacks: [], detalhe: "" }));
  assert.ok("erro" in montarRelato(vaga, { tipo: "outro", stacks: [], detalhe: "x".repeat(501) }));
  const muitas = Array.from({ length: 40 }, (_, i) => `s${i}`);
  const r = montarRelato(vaga, { tipo: "stack_errada", stacks: muitas, detalhe: "" });
  assert.ok("linha" in r);
  assert.equal(r.linha.stacks.length, 30);
});
