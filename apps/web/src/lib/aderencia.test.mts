import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularAderencia, conhecidasDe, demandaNaArea, encaixeArea, encaixeNivel, ordenarPorAderencia, stacksDaVaga, sugestoesDaArea } from "./aderencia.ts";
import type { Vaga } from "./rotulos.ts";

// Mini taxonomia: o índice usa a mesma chaveSkill do perfil (sem acento, caixa e separadores).
const sinonimos: Record<string, string> = { sql: "sql", python: "python", apachespark: "spark", spark: "spark", awsglue: "aws_glue", aws: "aws", powerbi: "power_bi" };
const pais: Record<string, string> = { aws_glue: "aws" };

const vaga = (extra: Partial<Vaga>): Vaga => ({
  id: "g:1", titulo: "t", empresa: "e", uf: null, cidade: null, modelo: null, contrato: "clt", pcd: false, publicada_em: "2026-10-01", prazo: null, url: "https://x",
  citadas: [], duplicatas: 0, enriquecida: false, area: "bi", senioridade: null, obrigatorias: [], desejaveis: [], salario: null, ...extra,
});

test("conhecidasDe reconhece pelo nome ou sinônimo, inclui a skill-pai e separa o que não reconhece", () => {
  const c = conhecidasDe(["Apache Spark", "  power-bi ", "AWS Glue", "Rust", ""], sinonimos, pais);
  assert.deepEqual([...c.ids].sort(), ["aws", "aws_glue", "power_bi", "spark"]);
  assert.deepEqual(c.naoReconhecidas, ["Rust"]);
  assert.equal(conhecidasDe([], sinonimos, pais).ids.size, 0);
});

test("stacksDaVaga usa as do LLM quando enriquecida e as citadas quando não", () => {
  assert.deepEqual(stacksDaVaga(vaga({ citadas: ["sql", "python"] })), { principais: ["sql", "python"], todas: ["sql", "python"] });
  assert.deepEqual(stacksDaVaga(vaga({ enriquecida: true, obrigatorias: ["sql"], desejaveis: ["spark"], citadas: ["python"] })), { principais: ["sql"], todas: ["sql", "spark"] });
});

test("calcularAderencia: percentual exibido e nota suavizada; sem stacks vale -1", () => {
  const a = calcularAderencia(["sql", "python", "spark", "aws"], new Set(["sql", "python", "x"]));
  assert.deepEqual(a, { tem: 2, total: 4, pct: 50, nota: 2 / 6 });
  assert.deepEqual(calcularAderencia([], new Set(["sql"])), { tem: 0, total: 0, pct: -1, nota: -1 });
});

test("a nota suavizada põe 6 de 8 (75%) à frente de 1 de 1 (100%)", () => {
  const seis = calcularAderencia(["a", "b", "c", "d", "e", "f", "g", "h"], new Set(["a", "b", "c", "d", "e", "f"]));
  const uma = calcularAderencia(["a"], new Set(["a"]));
  assert.ok(seis.nota > uma.nota);
  assert.ok(uma.pct > seis.pct); // mas o percentual exibido continua honesto
});

test("ordenarPorAderencia: maior nota primeiro, empate mantém a ordem recebida, sem stacks no fim", () => {
  const itens = [{ id: "a", nota: 0.2 }, { id: "b", nota: -1 }, { id: "c", nota: 0.5 }, { id: "d", nota: 0.2 }];
  assert.deepEqual(ordenarPorAderencia(itens, (x) => x.nota).map((x) => x.id), ["c", "a", "d", "b"]);
});

test("encaixeNivel cobre os casos do site antigo", () => {
  assert.equal(encaixeNivel("pleno", "pleno").tipo, "ok");
  assert.match(encaixeNivel("senior", "pleno").texto, /um nível acima/);
  assert.match(encaixeNivel("junior", "pleno").texto, /um nível abaixo/);
  assert.equal(encaixeNivel("especialista", "entrada").tipo, "atencao");
  assert.equal(encaixeNivel("pleno", null).tipo, "neutro");
  assert.equal(encaixeNivel(null, "pleno").tipo, "neutro");
});

test("encaixeArea compara a área da vaga com a de interesse", () => {
  assert.equal(encaixeArea("bi", "bi").tipo, "ok");
  assert.match(encaixeArea("bi", "dba").texto, /sua área de interesse é Banco de Dados/);
  assert.equal(encaixeArea(null, "bi").tipo, "neutro");
  assert.equal(encaixeArea("bi", null).tipo, "neutro");
});

test("demandaNaArea conta só as vagas da área que têm stacks, em % das vagas", () => {
  const vagas = [vaga({ area: "bi", citadas: ["sql", "power_bi"] }), vaga({ area: "bi", citadas: ["sql"] }), vaga({ area: "bi", citadas: [] }), vaga({ area: "dba", citadas: ["sql"] })];
  const d = demandaNaArea(vagas, "bi");
  assert.equal(d.total, 2); // a vaga sem stacks e a de outra área ficam de fora
  assert.deepEqual(d.pct, { sql: 100, power_bi: 50 });
  assert.equal(demandaNaArea(vagas, null).total, 3); // sem área: todas as que têm stacks
});

test("sugestoesDaArea devolve as mais pedidas; sem área, ignora a área de negócio", () => {
  const vagas = [vaga({ area: "bi", citadas: ["sql", "power_bi"] }), vaga({ area: "bi", citadas: ["sql"] }), vaga({ area: "negocio_com_dados", citadas: ["excel"] })];
  assert.deepEqual(sugestoesDaArea(vagas, "bi"), [{ id: "sql", pct: 100 }, { id: "power_bi", pct: 50 }]);
  assert.deepEqual(sugestoesDaArea(vagas, null).map((s) => s.id), ["sql", "power_bi"]); // "excel" é de negócio
  assert.equal(sugestoesDaArea(vagas, "bi", 1).length, 1);
});
