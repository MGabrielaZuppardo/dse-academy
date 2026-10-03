"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { configurado, supabaseNoNavegador } from "@/lib/supabase/client";
import { NIVEIS_TRILHA, agruparPorNivel, jaSabe, progresso, rotuloDoRecurso, type EtapaTrilha, type Recurso, type Trilha } from "@/lib/trilha-tipos";

type Conta =
  | { fase: "carregando" }
  | { fase: "visitante" }
  // semProgresso: não foi possível ler a inscrição (ex.: tabela ainda não criada ou banco fora do ar). A trilha segue visível.
  | { fase: "logada"; inscrita: boolean; concluidas: string[]; habilidades: string[]; semProgresso: boolean };

const botao = "rounded-lg bg-azul px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";
const NOME_DO_NIVEL = Object.fromEntries(NIVEIS_TRILHA.map((n) => [n.id, n.nome]));

function ItemDeRecurso({ r, mostrarNivel = false }: { r: Recurso; mostrarNivel?: boolean }) {
  return (
    <span>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-link underline">{r.titulo}</a>
      <span className="text-suave"> ({rotuloDoRecurso(r).join(", ")}{mostrarNivel ? `, nível ${NOME_DO_NIVEL[r.nivel].toLowerCase()}` : ""})</span>
    </span>
  );
}

/** Lista de links: os primeiros ficam à vista e o restante em "ver mais", para a página não virar um muro de links. */
function ListaDeRecursos({ recursos, visiveis, mostrarNivel = false }: { recursos: Recurso[]; visiveis: number; mostrarNivel?: boolean }) {
  const primeiros = recursos.slice(0, visiveis);
  const resto = recursos.slice(visiveis);
  return (
    <>
      <ul className="space-y-1.5">
        {primeiros.map((r) => <li key={r.url}><ItemDeRecurso r={r} mostrarNivel={mostrarNivel} /></li>)}
      </ul>
      {resto.length > 0 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-link underline">Ver mais {resto.length} {resto.length === 1 ? "conteúdo" : "conteúdos"}</summary>
          <ul className="mt-1.5 space-y-1.5">
            {resto.map((r) => <li key={r.url}><ItemDeRecurso r={r} mostrarNivel={mostrarNivel} /></li>)}
          </ul>
        </details>
      )}
    </>
  );
}

export function TrilhaInterativa({ trilha, modelo }: { trilha: Trilha; modelo: string }) {
  const ativo = configurado();
  const [conta, setConta] = useState<Conta>({ fase: ativo ? "carregando" : "visitante" });
  const [ocupada, setOcupada] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo) return;
    const sb = supabaseNoNavegador();
    let vivo = true;

    async function carregar(userId: string | null) {
      if (!userId) { if (vivo) setConta({ fase: "visitante" }); return; }
      const [insc, perfil] = await Promise.all([
        sb.from("inscricoes_trilha").select("concluidas").eq("trilha_id", trilha.id).maybeSingle(),
        sb.from("perfis").select("habilidades").eq("id", userId).maybeSingle(),
      ]);
      if (!vivo) return;
      // warn, e não error: é uma falha esperada enquanto a migration 006 não foi aplicada, e a tela trata o caso.
      if (insc.error) console.warn("Progresso da trilha indisponível:", insc.error.message);
      setConta({
        fase: "logada", inscrita: Boolean(insc.data), concluidas: insc.data?.concluidas ?? [],
        habilidades: perfil.data?.habilidades ?? [], semProgresso: Boolean(insc.error),
      });
    }

    const { data: ouvinte } = sb.auth.onAuthStateChange((_e, sessao) => { void carregar(sessao?.user.id ?? null); });
    void sb.auth.getSession().then(({ data }) => carregar(data.session?.user.id ?? null));
    return () => { vivo = false; ouvinte.subscription.unsubscribe(); };
  }, [ativo, trilha.id]);

  const logada = conta.fase === "logada" ? conta : null;
  const sabe = logada ? jaSabe(trilha, logada.habilidades) : new Set<string>();
  const concluidas = logada?.concluidas ?? [];
  const prog = progresso(trilha, concluidas, sabe);
  const grupos = agruparPorNivel(trilha);

  async function inscrever() {
    if (!logada) return;
    setOcupada(true); setAviso(null);
    const { error } = await supabaseNoNavegador().from("inscricoes_trilha").insert({ trilha_id: trilha.id });
    setOcupada(false);
    if (error) { console.error(error); setAviso("Não foi possível iniciar a trilha agora. Tente de novo."); return; }
    setConta({ ...logada, inscrita: true, concluidas: [] });
  }

  async function sair() {
    if (!logada || !confirm("Sair desta trilha? Seu progresso nela será apagado.")) return;
    setOcupada(true); setAviso(null);
    const { error } = await supabaseNoNavegador().from("inscricoes_trilha").delete().eq("trilha_id", trilha.id);
    setOcupada(false);
    if (error) { console.error(error); setAviso("Não foi possível sair da trilha agora. Tente de novo."); return; }
    setConta({ ...logada, inscrita: false, concluidas: [] });
  }

  async function alternar(skillId: string) {
    if (!logada?.inscrita) return;
    const anteriores = logada.concluidas;
    const novas = anteriores.includes(skillId) ? anteriores.filter((id) => id !== skillId) : [...anteriores, skillId];
    setConta({ ...logada, concluidas: novas }); // otimista: volta atrás se o banco recusar
    setAviso(null);
    const { error } = await supabaseNoNavegador().from("inscricoes_trilha").update({ concluidas: novas }).eq("trilha_id", trilha.id);
    if (error) { console.error(error); setConta({ ...logada, concluidas: anteriores }); setAviso("Não foi possível salvar essa marcação. Tente de novo."); }
  }

  function renderEtapa({ etapa, numero }: { etapa: EtapaTrilha; numero: number }) {
    return (
      <li key={etapa.id} className="rounded-2xl border border-borda bg-superficie p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-marinho text-sm font-semibold text-white" aria-hidden="true">{numero}</span>
          <h3 className="font-display text-xl font-semibold text-titulo"><span className="sr-only">Etapa {numero}: </span>{etapa.titulo}</h3>
          <span className="text-xs text-suave">{etapa.semanas} {etapa.semanas === 1 ? "semana" : "semanas"}</span>
        </div>
        <p className="mt-2 text-tinta">{etapa.objetivo}</p>

        <details className="mt-3 rounded-lg border border-borda px-3 py-2">
          <summary className="cursor-pointer font-medium text-titulo">{etapa.projetos.length} ideias de mini-projeto</summary>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {etapa.projetos.map((p) => (
              <li key={p.titulo}>
                <strong className="text-titulo">{p.titulo}.</strong> <span className="text-tinta">{p.descricao}</span>
              </li>
            ))}
          </ol>
        </details>

        <ul className="mt-4 space-y-4">
          {etapa.skills.map((s) => {
            const noPerfil = sabe.has(s.id);
            const feita = noPerfil || concluidas.includes(s.id);
            return (
              <li key={s.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <label className="flex items-center gap-2 font-medium text-titulo">
                    <input type="checkbox" checked={feita} disabled={noPerfil || !logada?.inscrita} onChange={() => void alternar(s.id)} />
                    {s.nome}
                  </label>
                  <span className="text-sm text-suave">{s.demanda_pct}% das vagas{noPerfil && " · já está no seu perfil"}</span>
                </div>
                {s.recursos.length > 0 && (
                  <div className="mt-1 pl-6 text-sm">
                    <ListaDeRecursos recursos={s.recursos} visiveis={4} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  return (
    <article className="mt-3">
      <h1 className="font-display text-3xl font-bold text-titulo">{trilha.titulo}</h1>
      <p className="mt-2 max-w-3xl text-suave">{trilha.descricao}</p>
      <p className="mt-2 text-sm text-suave">
        {trilha.etapas.length} etapas · cerca de {trilha.semanas_total} semanas (estudando ~8 h por semana) · baseada em {trilha.vagas_base} vagas abertas.{" "}
        {trilha.origem === "llm"
          ? `Etapas organizadas por IA (${modelo}) a partir dos números das vagas.`
          : "Etapas ordenadas automaticamente a partir dos números das vagas."}{" "}
        O percentual ao lado de cada tecnologia é a fatia das vagas da área que a citam. Todo o conteúdo indicado é gratuito.
      </p>

      <section aria-labelledby="progresso" className="mt-5 rounded-2xl border border-borda bg-superficie p-4">
        <h2 id="progresso" className="font-display text-lg font-semibold text-titulo">Seu progresso</h2>
        {conta.fase === "carregando" && <p role="status" className="mt-1 text-suave">Carregando…</p>}

        {conta.fase === "visitante" && (
          <p className="mt-1 text-suave">
            <Link href="/perfil" className="text-link underline">Entre ou crie seu perfil</Link> para iniciar esta trilha, marcar o que já estudou
            e ver o que você já sabe pelas habilidades do seu perfil.
          </p>
        )}

        {logada && (
          <>
            {logada.semProgresso && (
              <p role="status" className="mt-1 text-suave">
                Não foi possível carregar o seu progresso agora, então o acompanhamento está indisponível por enquanto.
                A trilha continua disponível abaixo; o que já está no seu perfil aparece marcado.
              </p>
            )}
            <div className="mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.pct} aria-label="Progresso na trilha">
              <div className="h-3 overflow-hidden rounded-full bg-fundo">
                <div className="h-full rounded-full bg-azul" style={{ width: `${prog.pct}%` }} />
              </div>
            </div>
            <p className="mt-2 text-sm text-suave">
              {prog.feitas} de {prog.total} tecnologias ({prog.pct}%)
              {sabe.size > 0 && ` · ${sabe.size} já estão no seu perfil`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3" hidden={logada.semProgresso}>
              {logada.inscrita ? (
                <button type="button" onClick={sair} disabled={ocupada} className="rounded-lg border border-borda px-4 py-2 text-sm text-suave hover:border-link disabled:opacity-60">
                  Sair desta trilha
                </button>
              ) : (
                <button type="button" onClick={inscrever} disabled={ocupada} className={botao}>Começar esta trilha</button>
              )}
              {!logada.inscrita && <span className="text-sm text-suave">Ao começar, você pode marcar cada tecnologia como concluída.</span>}
            </div>
          </>
        )}
        {aviso && <p role="alert" className="mt-2 font-medium text-erro">{aviso}</p>}
      </section>

      {trilha.conteudo_inicial.length > 0 && (
        <section aria-labelledby="comece" className="mt-6 rounded-2xl border border-borda bg-superficie p-5">
          <h2 id="comece" className="font-display text-xl font-semibold text-titulo">Comece por aqui: conteúdo gratuito e aberto</h2>
          <p className="mt-1 text-sm text-suave">
            {trilha.conteudo_inicial.length} cursos, livros, repositórios, bases de dados e ferramentas de prática, do básico ao avançado.
            Os que têm licença confirmada aparecem com ela. Além destes, cada tecnologia abaixo tem os seus próprios materiais.
          </p>
          <div className="mt-3 text-sm">
            <ListaDeRecursos recursos={trilha.conteudo_inicial} visiveis={8} mostrarNivel />
          </div>
        </section>
      )}

      <nav aria-label="Níveis da trilha" className="mt-6">
        <ul className="grid gap-3 sm:grid-cols-3">
          {grupos.map((g) => (
            <li key={g.id} className="rounded-2xl border border-borda bg-superficie p-4">
              <a href={`#nivel-${g.id}`} className="font-display text-lg font-semibold text-titulo hover:text-link">Nível {g.nome.toLowerCase()}</a>
              <p className="mt-1 text-sm text-suave">{g.etapas.length} {g.etapas.length === 1 ? "etapa" : "etapas"} · {g.tecnologias} tecnologias · cerca de {g.semanas} {g.semanas === 1 ? "semana" : "semanas"}</p>
            </li>
          ))}
        </ul>
      </nav>

      {grupos.map((g) => (
        <section key={g.id} id={`nivel-${g.id}`} aria-labelledby={`titulo-${g.id}`} className="mt-8 scroll-mt-4">
          <h2 id={`titulo-${g.id}`} className="font-display text-2xl font-bold text-titulo">Nível {g.nome.toLowerCase()}</h2>
          <p className="mt-1 max-w-3xl text-suave">{g.resumo}</p>
          <ol className="mt-4 space-y-5">{g.etapas.map(renderEtapa)}</ol>
        </section>
      ))}
    </article>
  );
}
