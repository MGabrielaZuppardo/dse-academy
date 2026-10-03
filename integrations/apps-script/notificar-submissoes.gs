/**
 * Avisa por e-mail quando chega um artigo (ou cadastro de palestrante) novo.
 *
 * Quem chama é o Database Webhook do Supabase (POST com o registro em JSON). O token vai na URL
 * (?token=...), só existe no painel do Supabase e nas Propriedades do script, nunca no site público.
 *
 * Propriedades do script (Configurações do projeto > Propriedades do script):
 *   TOKEN    segredo longo, igual ao da URL do webhook
 *   DESTINO  quem recebe os avisos: academydserec@gmail.com (mais de um: separe por vírgula)
 *   LEMBRETE_PARA  (opcional) quem é convidado para o lembrete de segunda-feira; padrão: gabrielamzuppardo@gmail.com
 *
 * Artigos também entram no Google Agenda da conta que implantou o script (veja registrarNoCalendario e lembreteSemanal).
 *
 * O e-mail sai da conta Google que implantou o script. Só texto puro: o conteúdo vem de formulários
 * públicos, então nada dele é interpretado como HTML.
 */

/** Marca na descrição dos eventos de artigo: evita duplicar (webhook repetido) e permite achar os da semana. */
var MARCA_ARTIGO = 'DSE-ARTIGO:';
var LEMBRETE_PADRAO = 'gabrielamzuppardo@gmail.com';
var TITULO_LEMBRETE = 'Revisar os posts da semana no Medium';

var ROTULOS = {
  submissoes_artigos: {
    assunto: 'Novo artigo para o Medium',
    campos: [
      ['titulo', 'Título'], ['subtitulo', 'Subtítulo'], ['resumo', 'Resumo'], ['tags', 'Tags'], ['idioma', 'Idioma'],
      ['link_rascunho', 'Rascunho'], ['publicado_antes', 'Já publicado em'], ['data_desejada', 'Data desejada'],
      ['nome', 'Autor(a)'], ['email', 'E-mail'], ['perfil_medium', 'Perfil no Medium'], ['linkedin', 'LinkedIn'], ['bio', 'Mini bio']
    ],
    titulo: 'titulo'
  },
  palestrantes: {
    assunto: 'Novo cadastro de palestrante',
    campos: [
      ['nome', 'Nome'], ['email', 'E-mail'], ['cargo', 'Cargo'], ['empresa', 'Empresa'], ['bio', 'Mini bio'],
      ['temas', 'Temas'], ['formatos', 'Formatos'], ['modalidade', 'Modalidade'], ['cidade', 'Cidade'], ['uf', 'UF'],
      ['idiomas', 'Idiomas'], ['linkedin', 'LinkedIn'], ['site', 'Site'], ['links_anteriores', 'Palestras anteriores'],
      ['aceite_publicacao', 'Autorizou página pública']
    ],
    titulo: 'nome'
  }
};

/** Teste de "está no ar": abra a URL /exec no navegador. Não revela nenhuma configuração nem envia e-mail. */
function doGet() {
  return resposta('DSE Academy: aviso por e-mail no ar');
}

/**
 * Chamado pelo webhook do Supabase. Cada recusa e cada falha vai para o log (Apps Script > Execuções),
 * sem nunca registrar o token nem o conteúdo do formulário.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var esperado = props.getProperty('TOKEN');
  var recebido = (e && e.parameter && e.parameter.token) || '';
  if (!esperado) { console.error('Propriedade TOKEN não definida no script'); return resposta('nao autorizado'); }
  if (!iguais(recebido, esperado)) { console.warn('Token ausente ou diferente do configurado'); return resposta('nao autorizado'); }

  var evento;
  try { evento = JSON.parse(e.postData.contents); } catch (err) { console.warn('Corpo da requisição não é JSON'); return resposta('json invalido'); }
  if (evento.type !== 'INSERT' || !evento.record) { console.log('Evento ignorado: ' + evento.type); return resposta('ignorado'); }

  var destino = props.getProperty('DESTINO');
  if (!destino) { console.error('Propriedade DESTINO não definida no script'); return resposta('sem destino'); }

  var mensagem = montarMensagem(evento.table, evento.record);
  if (!mensagem) { console.warn('Tabela desconhecida: ' + evento.table); return resposta('tabela desconhecida'); }

  try {
    MailApp.sendEmail({ to: destino, subject: mensagem.assunto, body: mensagem.corpo, name: 'Portal DSE Academy' });
  } catch (err) {
    console.error('Falha ao enviar o e-mail: ' + err);
    return resposta('erro ao enviar');
  }
  console.log('E-mail enviado: ' + evento.table);

  // O Agenda é um extra: se falhar, o e-mail já saiu e o cadastro continua valendo.
  if (evento.table === 'submissoes_artigos') {
    try { registrarNoCalendario(evento.record); } catch (err) { console.error('Falha ao criar o evento no Agenda: ' + err); }
  }
  return resposta('ok');
}

/** Pura (sem serviços do Google), para testar fora do Apps Script. */
function montarMensagem(tabela, registro) {
  var cfg = ROTULOS[tabela];
  if (!cfg) return null;
  var linhas = cfg.campos.map(function (c) {
    var v = registro[c[0]];
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
    if (Array.isArray(v)) v = v.join(', ');
    if (v === true) v = 'sim';
    if (v === false) v = 'não';
    return c[1] + ': ' + v;
  }).filter(Boolean);
  // Quebras de linha no assunto permitiriam injetar cabeçalhos de e-mail.
  var assunto = (cfg.assunto + ': ' + String(registro[cfg.titulo] || '')).replace(/[\r\n]+/g, ' ').slice(0, 150);
  var corpo = linhas.join('\n') + '\n\nRegistro: ' + registro.id + '\nRevise no painel do Supabase (Table Editor) ou no /admin do portal.';
  return { assunto: assunto, corpo: corpo };
}

/** Comparação sem sair no primeiro caractere diferente. */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function resposta(texto) {
  return ContentService.createTextOutput(texto);
}

/**
 * Rode uma vez no editor para autorizar o envio de e-mail e conferir remetente e destino antes de ligar o webhook.
 * O remetente é a conta Google logada no editor (a que implantou o script): o e-mail de teste diz qual é.
 */
function testarEnvio() {
  var destino = PropertiesService.getScriptProperties().getProperty('DESTINO');
  var m = montarMensagem('submissoes_artigos', {
    id: 'teste', titulo: 'Artigo de teste', nome: 'Teste', email: 'teste@exemplo.com', resumo: 'Só para conferir o envio.', tags: ['teste']
  });
  var remetente = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: destino, subject: m.assunto, name: 'Portal DSE Academy',
    body: m.corpo + '\n\n(Teste de envio. Remetente: ' + remetente + ' | Destino configurado: ' + destino + ')'
  });
}


// ---------------------------------------------------------------------------
// Google Agenda
// ---------------------------------------------------------------------------

/**
 * Dia do evento do artigo, como 'AAAA-MM-DD': a data desejada para publicar; se a pessoa não informou, o dia do envio.
 * Pura (sem serviços do Google), para testar fora do Apps Script.
 */
function diaDoEvento(registro, hoje) {
  var desejada = String(registro.data_desejada || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(desejada)) return desejada;
  var enviado = String(registro.criado_em || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(enviado)) return enviado.slice(0, 10);
  return formatarDia(hoje || new Date());
}

function formatarDia(d) {
  var m = String(d.getMonth() + 1), dia = String(d.getDate());
  return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
}

/** 'AAAA-MM-DD' em Date no fuso do script (meia-noite desse dia). */
function dataDoDia(dia) {
  var p = dia.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Pura: título, descrição e dia do evento. Texto puro; nada vindo do formulário é interpretado. */
function montarEvento(registro, hoje) {
  var titulo = ('Artigo: ' + String(registro.titulo || 'sem título')).replace(/[\r\n]+/g, ' ').slice(0, 150);
  var linhas = [
    registro.data_desejada ? 'Data desejada para publicar.' : 'Sem data desejada: marcado no dia do envio.',
    'Autor(a): ' + (registro.nome || '') + (registro.email ? ' <' + registro.email + '>' : ''),
    registro.link_rascunho ? 'Rascunho: ' + registro.link_rascunho : null,
    registro.perfil_medium ? 'Perfil no Medium: ' + registro.perfil_medium : null,
    registro.resumo ? 'Resumo: ' + registro.resumo : null,
    '',
    'Revise no /admin do portal.',
    MARCA_ARTIGO + registro.id
  ].filter(function (l) { return l !== null; });
  return { titulo: titulo, descricao: linhas.join('\n'), dia: diaDoEvento(registro, hoje) };
}

/**
 * Cria um evento de dia inteiro no Agenda da conta que implantou o script (a academydserec@gmail.com).
 * Idempotente: se já existir um evento com a marca deste registro nesse dia, não cria outro.
 */
function registrarNoCalendario(registro) {
  var ev = montarEvento(registro);
  var data = dataDoDia(ev.dia);
  var agenda = CalendarApp.getDefaultCalendar();
  var marca = MARCA_ARTIGO + registro.id;
  var existentes = agenda.getEventsForDay(data).filter(function (e) { return e.getDescription().indexOf(marca) !== -1; });
  if (existentes.length > 0) { console.log('Evento do artigo já existe no Agenda'); return false; }
  agenda.createAllDayEvent(ev.titulo, data, { description: ev.descricao });
  console.log('Evento criado no Agenda para ' + ev.dia);
  return true;
}

/** Segunda-feira da semana de `d` (meia-noite) e a segunda seguinte. Pura. */
function semanaDe(d) {
  var seg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diasDesdeSegunda = (seg.getDay() + 6) % 7; // domingo conta como 6
  seg.setDate(seg.getDate() - diasDesdeSegunda);
  var fim = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 7);
  return { inicio: seg, fim: fim };
}

/** Pura: texto do lembrete com os artigos da semana. */
function descricaoDoLembrete(artigos) {
  var cab = 'Hora de conferir no Medium os posts desta semana.';
  if (!artigos.length) return cab + '\n\nNenhum artigo agendado para esta semana no Agenda.';
  return cab + '\n\nArtigos agendados para esta semana:\n' + artigos.map(function (a) { return '- ' + a.dia + ' · ' + a.titulo; }).join('\n');
}

/**
 * Toda segunda-feira (gatilho criado por instalarGatilhos): cria no Agenda da DSE o evento "Revisar os posts da semana
 * no Medium", às 9h, convidando a pessoa de LEMBRETE_PARA (o convite chega por e-mail e vira notificação no Agenda dela).
 * A descrição lista os artigos marcados para a semana. Não duplica se o evento da semana já existir.
 */
function lembreteSemanal() {
  var props = PropertiesService.getScriptProperties();
  var convidada = props.getProperty('LEMBRETE_PARA') || LEMBRETE_PADRAO;
  var agenda = CalendarApp.getDefaultCalendar();
  var semana = semanaDe(new Date());

  var artigos = agenda.getEvents(semana.inicio, semana.fim)
    .filter(function (e) { return e.isAllDayEvent() && e.getDescription().indexOf(MARCA_ARTIGO) !== -1; })
    .map(function (e) { return { dia: formatarDia(e.getAllDayStartDate()), titulo: e.getTitle().replace(/^Artigo:\s*/, '') }; })
    .sort(function (a, b) { return a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0; });

  var inicio = new Date(semana.inicio.getFullYear(), semana.inicio.getMonth(), semana.inicio.getDate(), 9, 0);
  var fim = new Date(inicio.getTime() + 30 * 60 * 1000);
  var jaExiste = agenda.getEvents(inicio, fim).some(function (e) { return e.getTitle() === TITULO_LEMBRETE; });
  if (jaExiste) { console.log('Lembrete desta semana já existe'); return false; }

  var evento = agenda.createEvent(TITULO_LEMBRETE, inicio, fim, {
    description: descricaoDoLembrete(artigos),
    guests: convidada,
    sendInvites: true
  });
  evento.removeAllReminders();
  evento.addPopupReminder(10);
  console.log('Lembrete semanal criado com ' + artigos.length + ' artigo(s)');
  return true;
}

/**
 * Rode UMA vez no editor: cria o gatilho que executa lembreteSemanal toda segunda-feira, por volta das 8h.
 * Pode rodar de novo sem medo: remove o gatilho anterior antes de criar outro.
 */
function instalarGatilhos() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'lembreteSemanal') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('lembreteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}

/** Rode no editor para autorizar o Agenda e ver o resultado sem esperar uma segunda-feira (cria o evento desta semana). */
function testarLembrete() {
  lembreteSemanal();
}
