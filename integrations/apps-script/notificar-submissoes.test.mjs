// Roda o Apps Script em Node com os serviços do Google simulados: node --test integrations/apps-script
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function ambiente(props, falharEnvio = false, falharAgenda = false) {
  const enviados = [];
  const erros = [];
  const eventos = []; // eventos criados no Agenda simulado
  const gatilhos = [];
  const agenda = {
    getEventsForDay: (d) => eventos.filter((e) => e.dia && e.dia.getTime() === d.getTime()),
    getEvents: (ini, fim) => eventos.filter((e) => e.inicio >= ini && e.inicio < fim),
    createAllDayEvent: (titulo, data, opc) => {
      if (falharAgenda) throw new Error("Agenda indisponível");
      const e = { titulo, dia: data, inicio: data, todoDia: true, descricao: opc.description };
      eventos.push(e); return e;
    },
    createEvent: (titulo, inicio, fim, opc) => {
      const e = { titulo, inicio, fim, todoDia: false, descricao: opc.description, convidados: opc.guests, convites: opc.sendInvites, lembretes: [],
        removeAllReminders() { this.lembretes = []; }, addPopupReminder(m) { this.lembretes.push(m); } };
      eventos.push(e); return e;
    },
  };
  // Adaptação: o Apps Script devolve objetos com métodos getX(); aqui os eventos simulados ganham esses métodos ao serem lidos.
  const comoEventoDoGoogle = (e) => Object.assign(e, {
    getDescription: () => e.descricao || "", getTitle: () => e.titulo, isAllDayEvent: () => e.todoDia, getAllDayStartDate: () => e.dia,
  });
  const lerEventos = (lista) => lista.map(comoEventoDoGoogle);
  const agendaDoGoogle = {
    getEventsForDay: (d) => lerEventos(agenda.getEventsForDay(d)),
    getEvents: (i, f) => lerEventos(agenda.getEvents(i, f)),
    createAllDayEvent: (...a) => comoEventoDoGoogle(agenda.createAllDayEvent(...a)),
    createEvent: (...a) => comoEventoDoGoogle(agenda.createEvent(...a)),
  };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null }) },
    ContentService: { createTextOutput: (t) => t },
    MailApp: { sendEmail: (m) => { if (falharEnvio) throw new Error("cota diária atingida"); enviados.push(m); } },
    CalendarApp: { getDefaultCalendar: () => agendaDoGoogle },
    ScriptApp: {
      WeekDay: { MONDAY: "MONDAY" },
      getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.funcao, g })),
      deleteTrigger: (t) => { gatilhos.splice(gatilhos.indexOf(t.g), 1); },
      newTrigger: (funcao) => {
        const g = { funcao };
        const b = { timeBased: () => b, onWeekDay: (d) => { g.dia = d; return b; }, atHour: (h) => { g.hora = h; return b; }, create: () => { gatilhos.push(g); } };
        return b;
      },
    },
    console: { log() {}, warn() {}, error: (...a) => erros.push(a.join(" ")) },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("./notificar-submissoes.gs", import.meta.url), "utf8"), ctx);
  return { ctx, enviados, erros, eventos, gatilhos };
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

// ---------------------------------------------------------------------------
// Google Agenda
// ---------------------------------------------------------------------------

const PROPS = { TOKEN: "segredo", DESTINO: "academydserec@gmail.com" };

test("artigo novo vira evento de dia inteiro na data desejada, com a marca e os dados do autor", () => {
  const { ctx, eventos } = ambiente(PROPS);
  assert.equal(ctx.doPost(evento({ data_desejada: "2026-10-20", link_rascunho: "https://docs.google.com/x" })), "ok");
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].titulo, "Artigo: Spark na prática");
  assert.equal(eventos[0].dia.getFullYear(), 2026);
  assert.equal(eventos[0].dia.getMonth(), 9);
  assert.equal(eventos[0].dia.getDate(), 20);
  assert.match(eventos[0].descricao, /Ana <ana@exemplo\.com>/);
  assert.match(eventos[0].descricao, /Rascunho: https:\/\/docs\.google\.com\/x/);
  assert.match(eventos[0].descricao, /DSE-ARTIGO:abc/);
});

test("sem data desejada, o evento fica no dia do envio", () => {
  const { ctx, eventos } = ambiente(PROPS);
  ctx.doPost(evento({ criado_em: "2026-10-05T14:30:00+00:00" }));
  assert.equal(eventos[0].dia.getDate(), 5);
  assert.match(eventos[0].descricao, /marcado no dia do envio/);
});

test("o mesmo registro enviado duas vezes (webhook repetido) cria um evento só", () => {
  const { ctx, eventos } = ambiente(PROPS);
  ctx.doPost(evento({ data_desejada: "2026-10-20" }));
  ctx.doPost(evento({ data_desejada: "2026-10-20" }));
  assert.equal(eventos.length, 1);
});

test("palestrante não cria evento no Agenda", () => {
  const { ctx, eventos } = ambiente(PROPS);
  ctx.doPost({ parameter: { token: "segredo" }, postData: { contents: JSON.stringify({ type: "INSERT", table: "palestrantes", record: { id: "p1", nome: "Bia", email: "b@x.com" } }) } });
  assert.equal(eventos.length, 0);
});

test("falha no Agenda não impede o e-mail nem a resposta ok, e o log não vaza o conteúdo", () => {
  const { ctx, enviados, erros } = ambiente(PROPS, false, true);
  assert.equal(ctx.doPost(evento({ resumo: "dado sensível" })), "ok");
  assert.equal(enviados.length, 1);
  assert.match(erros.join(" "), /Agenda indisponível/);
  assert.doesNotMatch(erros.join(" "), /dado sensível/);
});

test("título com quebra de linha não vira várias linhas no título do evento", () => {
  const { ctx, eventos } = ambiente(PROPS);
  ctx.doPost(evento({ titulo: "Linha 1\nLinha 2", data_desejada: "2026-10-20" }));
  assert.doesNotMatch(eventos[0].titulo, /[\r\n]/);
});

test("semanaDe começa na segunda-feira, inclusive quando o dia é domingo", () => {
  const { ctx } = ambiente(PROPS);
  const quarta = ctx.semanaDe(new Date(2026, 9, 7)); // quarta, 07/10/2026
  assert.equal(quarta.inicio.getDate(), 5);
  assert.equal(quarta.fim.getDate(), 12);
  const domingo = ctx.semanaDe(new Date(2026, 9, 11));
  assert.equal(domingo.inicio.getDate(), 5);
  const segunda = ctx.semanaDe(new Date(2026, 9, 5));
  assert.equal(segunda.inicio.getDate(), 5);
});

test("lembrete semanal convida a Gabriela, às 9h de segunda, listando os artigos da semana", () => {
  const { ctx, eventos } = ambiente(PROPS);
  const hoje = new Date();
  const seg = ctx.semanaDoLembrete(hoje).inicio;
  const dia = (n) => `${seg.getFullYear()}-${String(seg.getMonth() + 1).padStart(2, "0")}-${String(seg.getDate() + n).padStart(2, "0")}`;
  const nova = (d) => ctx.registrarNoCalendario({ id: "x" + d, titulo: "Artigo " + d, nome: "Ana", data_desejada: dia(d) });
  nova(1); nova(3);
  assert.equal(eventos.length, 2);

  assert.equal(ctx.lembreteSemanal(), true);
  const lembrete = eventos.find((e) => e.titulo === "Revisar os posts da semana no Medium");
  assert.ok(lembrete);
  assert.equal(lembrete.convidados, "gabrielamzuppardo@gmail.com");
  assert.equal(lembrete.convites, true);
  assert.equal(lembrete.inicio.getHours(), 9);
  assert.equal(lembrete.inicio.getDay(), 1); // segunda-feira
  assert.deepEqual(lembrete.lembretes, [10]);
  assert.match(lembrete.descricao, /Artigo 1/);
  assert.match(lembrete.descricao, /Artigo 3/);
});

test("lembrete semanal não duplica e usa LEMBRETE_PARA quando definido", () => {
  const { ctx, eventos } = ambiente({ ...PROPS, LEMBRETE_PARA: "outra@pessoa.com" });
  assert.equal(ctx.lembreteSemanal(), true);
  assert.equal(ctx.lembreteSemanal(), false);
  assert.equal(eventos.filter((e) => e.titulo === "Revisar os posts da semana no Medium").length, 1);
  assert.equal(eventos[0].convidados, "outra@pessoa.com");
});

test("semana sem artigos: o lembrete avisa que não há nada agendado", () => {
  const { ctx, eventos } = ambiente(PROPS);
  ctx.lembreteSemanal();
  assert.match(eventos[0].descricao, /Nenhum artigo agendado/);
});

test("instalarGatilhos cria um gatilho de segunda-feira e não duplica ao rodar de novo", () => {
  const { ctx, gatilhos } = ambiente(PROPS);
  ctx.instalarGatilhos();
  ctx.instalarGatilhos();
  assert.equal(gatilhos.length, 1);
  assert.equal(gatilhos[0].funcao, "lembreteSemanal");
  assert.equal(gatilhos[0].dia, "MONDAY");
  assert.equal(gatilhos[0].hora, 8);
});

test("semanaDoLembrete: no fim de semana aponta para a próxima segunda-feira", () => {
  const { ctx } = ambiente(PROPS);
  assert.equal(ctx.semanaDoLembrete(new Date(2026, 9, 3)).inicio.getDate(), 5); // sábado 03/10 -> segunda 05/10
  assert.equal(ctx.semanaDoLembrete(new Date(2026, 9, 4)).inicio.getDate(), 5); // domingo 04/10 -> segunda 05/10
  assert.equal(ctx.semanaDoLembrete(new Date(2026, 9, 5)).inicio.getDate(), 5); // segunda
  assert.equal(ctx.semanaDoLembrete(new Date(2026, 9, 9)).inicio.getDate(), 5); // sexta
});
