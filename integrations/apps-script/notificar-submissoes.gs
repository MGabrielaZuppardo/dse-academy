/**
 * Avisa por e-mail quando chega um artigo (ou cadastro de palestrante) novo.
 *
 * Quem chama é o Database Webhook do Supabase (POST com o registro em JSON). O token vai na URL
 * (?token=...), só existe no painel do Supabase e nas Propriedades do script, nunca no site público.
 *
 * Propriedades do script (Configurações do projeto > Propriedades do script):
 *   TOKEN    segredo longo, igual ao da URL do webhook
 *   DESTINO  quem recebe os avisos: academydserec@gmail.com (mais de um: separe por vírgula)
 *
 * O e-mail sai da conta Google que implantou o script. Só texto puro: o conteúdo vem de formulários
 * públicos, então nada dele é interpretado como HTML.
 */

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
