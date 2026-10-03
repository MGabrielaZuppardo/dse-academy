import assert from "node:assert/strict";
import { test } from "node:test";
import { ESTADO_INICIAL, alternarNaLista, estaSalva, habilidadesDe, precisaDeOnboarding, reduzirConta, type PerfilConta, type VagaSalva } from "./conta/estado.ts";

const ana = { id: "u1", email: "ana@exemplo.com" };
const perfil: PerfilConta = { nome: "Ana", area: "bi", senioridade: "junior", habilidades: ["SQL", "Power BI"] };
const salva = (id: string): VagaSalva => ({ vaga_id: id, titulo: "t", empresa: "e", url: "https://x", salva_em: "2026-10-01T10:00:00.000Z" });

test("começa carregando; visitante e login mudam a fase", () => {
  assert.equal(ESTADO_INICIAL.fase, "carregando");
  assert.equal(reduzirConta(ESTADO_INICIAL, { tipo: "visitante" }).fase, "visitante");
  const logada = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  assert.deepEqual([logada.fase, logada.usuario], ["logada", ana]);
});

test("a mesma pessoa logando de novo não zera o que já foi carregado; outra pessoa zera", () => {
  let e = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  e = reduzirConta(e, { tipo: "dados", perfil, perfilLido: true, salvas: [salva("a")] });
  const renovada = reduzirConta(e, { tipo: "logou", usuario: { ...ana } });
  assert.deepEqual([renovada.perfil, renovada.salvas.length], [perfil, 1]);
  const outra = reduzirConta(e, { tipo: "logou", usuario: { id: "u2", email: null } });
  assert.deepEqual([outra.perfil, outra.salvas, outra.perfilLido, outra.dadosProntos], [null, [], false, false]);
});

test("sair volta ao visitante sem restos da pessoa anterior", () => {
  let e = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  e = reduzirConta(e, { tipo: "dados", perfil, perfilLido: true, salvas: [salva("a")] });
  const v = reduzirConta(e, { tipo: "visitante" });
  assert.deepEqual([v.fase, v.usuario, v.perfil, v.salvas], ["visitante", null, null, []]);
});

test("dadosProntos separa carregando de falhou: a leitura do perfil falhar não é o mesmo que estar carregando", () => {
  const logada = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  assert.deepEqual([logada.dadosProntos, logada.perfilLido], [false, false]); // carregando
  const falhou = reduzirConta(logada, { tipo: "dados", perfil: null, perfilLido: false, salvas: [] });
  assert.deepEqual([falhou.dadosProntos, falhou.perfilLido], [true, false]); // terminou, mas sem perfil lido
});

test("dados com salvas nulo marca a lista como indisponível, mas segue com lista vazia", () => {
  const e = reduzirConta(reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana }), { tipo: "dados", perfil, perfilLido: true, salvas: null });
  assert.deepEqual([e.salvasIndisponiveis, e.salvas], [true, []]);
});

test("onboarding só quando o perfil foi lido e não existe; falha de leitura não dispara", () => {
  const logada = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  assert.equal(precisaDeOnboarding(logada), false); // ainda não leu
  assert.equal(precisaDeOnboarding(reduzirConta(logada, { tipo: "dados", perfil: null, perfilLido: true, salvas: [] })), true); // primeiro acesso
  assert.equal(precisaDeOnboarding(reduzirConta(logada, { tipo: "dados", perfil: null, perfilLido: false, salvas: [] })), false); // falhou ao ler
  assert.equal(precisaDeOnboarding(reduzirConta(logada, { tipo: "dados", perfil, perfilLido: true, salvas: [] })), false);
  assert.equal(precisaDeOnboarding(reduzirConta(ESTADO_INICIAL, { tipo: "visitante" })), false);
});

test("gravar o perfil atualiza as habilidades usadas na aderência", () => {
  let e = reduzirConta(ESTADO_INICIAL, { tipo: "logou", usuario: ana });
  assert.deepEqual(habilidadesDe(e), []);
  e = reduzirConta(e, { tipo: "perfil", perfil });
  assert.deepEqual(habilidadesDe(e), ["SQL", "Power BI"]);
  assert.equal(e.perfilLido, true);
});

test("alternarNaLista salva no topo, remove na segunda vez e não mexe nas outras", () => {
  const base = [salva("a")];
  const r1 = alternarNaLista(base, { vaga_id: "b", titulo: "T", empresa: "E", url: null }, new Date("2026-10-02T12:00:00Z"));
  assert.deepEqual([r1.adicionou, r1.salvas.map((s) => s.vaga_id)], [true, ["b", "a"]]);
  assert.equal(r1.salvas[0].salva_em, "2026-10-02T12:00:00.000Z");
  assert.equal(estaSalva(r1.salvas, "b"), true);
  const r2 = alternarNaLista(r1.salvas, { vaga_id: "b", titulo: null, empresa: null, url: null });
  assert.deepEqual([r2.adicionou, r2.salvas.map((s) => s.vaga_id)], [false, ["a"]]);
  assert.deepEqual(base.map((s) => s.vaga_id), ["a"]); // a lista original não é alterada
});
