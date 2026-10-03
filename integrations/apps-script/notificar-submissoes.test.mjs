// Roda o Apps Script em Node com os serviços do Google simulados: node --test integrations/apps-script
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function ambiente(props, falharEnvio = false) {
  const enviados = [];
  const erros = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null }) },
    ContentService: { createTextOutput: (t) => t },
    MailApp: { sendEmail: (m) => { if (falharEnvio) throw new Error("cota diária atingida"); enviados.push(m); } },
    console: { log() {}, warn() {}, error: (...a) => erros.push(a.join(" ")) },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("./notificar-submissoes.gs", import.meta.url), "utf8"), ctx);
  return { ctx, enviados, erros };
}

const evento = (extra = {}) => ({
  postData: { contents: JSON.stringify({ type: "INSERT", table: "submissoes_artigos", record: {
    id: "abc", titulo: "Spark na prática", nome: "Ana", email: "ana@exemplo.com", resumo: "Um resumo.", tags: ["spark", "dados"], bio: "Bio", ...extra } }) },
  parameter: { token: "segredo" },
});

test("com token certo envia o e-mail para o DESTINO", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "academydserec@gmail.com" });
  assert.equal(ctx.doPost(evento()), "ok");
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, "academydserec@gmail.com");
  assert.match(enviados[0].subject, /Novo artigo para o Medium: Spark na prática/);
  assert.match(enviados[0].body, /Tags: spark, dados/);
  assert.match(enviados[0].body, /Registro: abc/);
});

test("token errado ou ausente não envia nada", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  const e = evento(); e.parameter.token = "outro";
  assert.equal(ctx.doPost(e), "nao autorizado");
  assert.equal(ctx.doPost({ postData: e.postData, parameter: {} }), "nao autorizado");
  assert.equal(enviados.length, 0);
});

test("sem TOKEN configurado no script, recusa tudo", () => {
  const { ctx, enviados } = ambiente({ DESTINO: "x@y.com" });
  assert.equal(ctx.doPost(evento()), "nao autorizado");
  assert.equal(enviados.length, 0);
});

test("ignora eventos que não são INSERT e tabelas desconhecidas", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  const upd = evento(); upd.postData.contents = JSON.stringify({ type: "UPDATE", table: "submissoes_artigos", record: { id: "1" } });
  assert.equal(ctx.doPost(upd), "ignorado");
  const outra = evento(); outra.postData.contents = JSON.stringify({ type: "INSERT", table: "perfis", record: { id: "1" } });
  assert.equal(ctx.doPost(outra), "tabela desconhecida");
  assert.equal(enviados.length, 0);
});

test("quebra de linha no título não injeta cabeçalho no assunto", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  ctx.doPost(evento({ titulo: "Olá\r\nBcc: alguem@mal.com" }));
  assert.doesNotMatch(enviados[0].subject, /[\r\n]/);
});

test("conteúdo do formulário vai como texto puro (sem htmlBody)", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  ctx.doPost(evento({ resumo: "<script>alert(1)</script>" }));
  assert.equal(enviados[0].htmlBody, undefined);
});

test("palestrante: formata listas e booleanos", () => {
  const { ctx, enviados } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  ctx.doPost({ parameter: { token: "segredo" }, postData: { contents: JSON.stringify({ type: "INSERT", table: "palestrantes",
    record: { id: "p1", nome: "Bia", email: "b@x.com", temas: ["dbt", "Spark"], aceite_publicacao: true, cargo: null } }) } });
  assert.match(enviados[0].subject, /Novo cadastro de palestrante: Bia/);
  assert.match(enviados[0].body, /Temas: dbt, Spark/);
  assert.match(enviados[0].body, /Autorizou página pública: sim/);
  assert.doesNotMatch(enviados[0].body, /Cargo/);
});

test("doGet responde que está no ar sem revelar configuração", () => {
  const { ctx } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" });
  const r = ctx.doGet();
  assert.match(r, /no ar/);
  assert.doesNotMatch(r, /segredo|x@y\.com/);
});

test("falha ao enviar não derruba o script: responde erro e registra no log sem vazar o conteúdo", () => {
  const { ctx, enviados, erros } = ambiente({ TOKEN: "segredo", DESTINO: "x@y.com" }, true);
  assert.equal(ctx.doPost(evento({ resumo: "dado sensível do formulário" })), "erro ao enviar");
  assert.equal(enviados.length, 0);
  const log = erros.join(" | ");
  assert.match(log, /cota diária atingida/);
  assert.doesNotMatch(log, /dado sensível|segredo/);
});

test("sem TOKEN ou DESTINO configurados, registra o motivo no log", () => {
  const a = ambiente({ DESTINO: "x@y.com" });
  assert.equal(a.ctx.doPost(evento()), "nao autorizado");
  assert.match(a.erros.join(" "), /TOKEN/);
  const b = ambiente({ TOKEN: "segredo" });
  assert.equal(b.ctx.doPost(evento()), "sem destino");
  assert.match(b.erros.join(" "), /DESTINO/);
});
