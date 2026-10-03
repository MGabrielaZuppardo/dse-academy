import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparPorNivel, jaSabe, progresso, rotuloDoRecurso, todasAsSkills, type EtapaTrilha, type Recurso, type Trilha } from "./trilha-tipos.ts";

const skill = (id: string, nome: string) => ({ id, nome, demanda_pct: 50, recursos: [] });
const etapa = (id: string, nivel: EtapaTrilha["nivel"], semanas: number, skills: ReturnType<typeof skill>[]): EtapaTrilha => ({
  id, titulo: id, objetivo: "o", nivel, semanas, skills,
  projetos: [1, 2, 3, 4, 5].map((n) => ({ titulo: `Projeto ${n}`, descricao: "Descrição do projeto." })),
});
const trilha: Trilha = {
  id: "bi", titulo: "Trilha de BI", area: "bi", descricao: "x", vagas_base: 58, semanas_total: 9, origem: "regras", conteudo_inicial: [],
  etapas: [
    etapa("bi-1", "basico", 3, [skill("sql", "SQL"), skill("power_bi", "Power BI")]),
    etapa("bi-2", "basico", 2, [skill("excel", "Excel")]),
    etapa("bi-3", "avancado", 4, [skill("dax", "DAX"), skill("aws_s3", "Amazon S3")]),
  ],
};

test("todasAsSkills junta as skills de todas as etapas", () => {
  assert.deepEqual(todasAsSkills(trilha).map((s) => s.id), ["sql", "power_bi", "excel", "dax", "aws_s3"]);
});

test("agruparPorNivel separa do básico ao avançado, numera pela trilha inteira e omite níveis vazios", () => {
  const g = agruparPorNivel(trilha);
  assert.deepEqual(g.map((x) => x.id), ["basico", "avancado"]); // sem intermediário
  assert.deepEqual(g[0].etapas.map((x) => x.numero), [1, 2]);
  assert.deepEqual(g[1].etapas.map((x) => x.numero), [3]);
  assert.deepEqual([g[0].semanas, g[0].tecnologias, g[1].semanas, g[1].tecnologias], [5, 3, 4, 2]);
  assert.equal(g[0].nome, "Básico");
});

test("jaSabe compara por nome ou id, sem acento, caixa ou separadores", () => {
  assert.deepEqual([...jaSabe(trilha, ["power-bi", "sql", "Rust"])].sort(), ["power_bi", "sql"]);
  assert.deepEqual([...jaSabe(trilha, ["aws_s3"])], ["aws_s3"]);
  assert.equal(jaSabe(trilha, []).size, 0);
});

test("progresso soma concluídas e perfil sem contar duas vezes", () => {
  assert.deepEqual(progresso(trilha, [], new Set()), { feitas: 0, total: 5, pct: 0 });
  assert.deepEqual(progresso(trilha, ["dax", "sql"], new Set(["sql"])), { feitas: 2, total: 5, pct: 40 });
  assert.deepEqual(progresso(trilha, ["sql", "power_bi", "excel", "dax", "aws_s3", "inexistente"], new Set()), { feitas: 5, total: 5, pct: 100 });
});

test("rotuloDoRecurso mostra tipo, idioma, gratuito e a licença só quando confirmada", () => {
  const base: Recurso = { titulo: "t", url: "https://x.org", idioma: "pt", tipo: "curso", nivel: "basico" };
  assert.deepEqual(rotuloDoRecurso(base), ["curso", "português", "gratuito"]);
  assert.deepEqual(rotuloDoRecurso({ ...base, idioma: "en", tipo: "repositório", licenca: "MIT" }), ["repositório", "inglês", "gratuito", "licença MIT"]);
});
