"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConta } from "@/lib/conta/contexto";
import { marcarOnboardingPulado } from "@/lib/onboarding";
import { canonicas, chaveSkill } from "@/lib/perfil";
import { AREAS, NIVEIS } from "@/lib/rotulos";
import { estiloBotao } from "@/lib/botoes";

export type SugestaoSkill = { nome: string; pct: number };

const TOTAL_PASSOS = 3;

function OpcoesEmCartoes({ nome, opcoes, valor, aoEscolher }: { nome: string; opcoes: [string, string][]; valor: string; aoEscolher: (v: string) => void }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {opcoes.map(([id, rotulo]) => (
        <label key={id || "nenhuma"} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${valor === id ? "border-link bg-fundo" : "border-borda"}`}>
          <input type="radio" name={nome} value={id} checked={valor === id} onChange={() => aoEscolher(id)} />
          <span className="text-titulo">{rotulo}</span>
        </label>
      ))}
    </div>
  );
}

export function Onboarding({ skills, sugestoes }: { skills: Record<string, string>; sugestoes: Record<string, SugestaoSkill[]> }) {
  const conta = useConta();
  if (!conta.disponivel) return <p role="alert" className="rounded-lg border border-erro p-4 text-erro">O login ainda não está configurado neste ambiente.</p>;
  if (conta.fase === "carregando" || (conta.fase === "logada" && !conta.dadosProntos)) return <p role="status" className="text-suave">Carregando…</p>;
  if (conta.fase === "visitante") {
    return (
      <p className="text-suave">
        Para configurar o seu perfil, <Link href="/perfil" className="text-link underline">entre ou crie a sua conta</Link> primeiro.
      </p>
    );
  }
  // Só aqui o perfil já chegou: quem está refazendo a configuração começa do que já tem guardado.
  return <Passos skills={skills} sugestoes={sugestoes} />;
}

function Passos({ skills, sugestoes }: { skills: Record<string, string>; sugestoes: Record<string, SugestaoSkill[]> }) {
  const conta = useConta();
  const router = useRouter();
  const inicial = conta.perfil;
  const [passo, setPasso] = useState(1);
  const [area, setArea] = useState(() => (inicial?.area && AREAS[inicial.area] ? inicial.area : ""));
  const [nivel, setNivel] = useState(() => inicial?.senioridade ?? "");
  const [escolhidas, setEscolhidas] = useState<string[]>(() => inicial?.habilidades ?? []);
  const [outra, setOutra] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => { titulo.current?.focus({ preventScroll: true }); }, [passo]);

  const jaTem = new Set(escolhidas.map(chaveSkill));
  const lista = sugestoes[area] ?? sugestoes[""] ?? [];
  const nomesParaBusca = Object.values(skills).sort((a, b) => a.localeCompare(b, "pt-BR"));

  function alternar(nome: string) {
    setEscolhidas((atuais) => (atuais.some((s) => chaveSkill(s) === chaveSkill(nome)) ? atuais.filter((s) => chaveSkill(s) !== chaveSkill(nome)) : [...atuais, nome]));
  }

  function adicionarOutra(e: FormEvent) {
    e.preventDefault();
    if (!outra.trim()) return;
    setEscolhidas((atuais) => canonicas([...atuais, ...outra.split(/[,;\n]/)].join(","), skills));
    setOutra("");
  }

  async function terminar(pulou: boolean) {
    setSalvando(true);
    setErro(null);
    const atual = conta.perfil;
    try {
      // Mesmo pulando gravamos o perfil (com o que já havia), para o onboarding não voltar a cada visita.
      await conta.gravarPerfil(pulou
        ? { nome: atual?.nome ?? null, area: atual?.area ?? null, senioridade: atual?.senioridade ?? null, habilidades: atual?.habilidades ?? [] }
        : { nome: atual?.nome ?? null, area: area || null, senioridade: nivel || null, habilidades: canonicas(escolhidas.join(","), skills) });
      if (pulou) marcarOnboardingPulado();
      router.push("/vagas");
    } catch (e) {
      console.error(e);
      if (pulou) { marcarOnboardingPulado(); router.push("/vagas"); return; } // não trava quem só quer ver as vagas
      setErro("Não foi possível salvar agora. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm text-suave">
        <span className="font-display tracking-wide">BOAS-VINDAS</span>
        <span>Passo {passo} de {TOTAL_PASSOS}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-fundo" role="progressbar" aria-label="Progresso da configuração" aria-valuemin={1} aria-valuemax={TOTAL_PASSOS} aria-valuenow={passo}>
        <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${(100 * passo) / TOTAL_PASSOS}%` }} />
      </div>

      <section className="mt-6 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
        {passo === 1 && (
          <>
            <h1 ref={titulo} tabIndex={-1} className="font-display text-2xl font-bold text-titulo outline-none">Qual área você busca?</h1>
            <p className="mt-2 text-suave">Usamos isso para comparar você com as vagas certas e mostrar o que o mercado pede.</p>
            <fieldset>
              <legend className="sr-only">Área de interesse</legend>
              <OpcoesEmCartoes nome="area" valor={area} aoEscolher={setArea} opcoes={[...Object.entries(AREAS), ["", "Ainda não sei"]]} />
            </fieldset>
          </>
        )}
        {passo === 2 && (
          <>
            <h1 ref={titulo} tabIndex={-1} className="font-display text-2xl font-bold text-titulo outline-none">Em que nível?</h1>
            <p className="mt-2 text-suave">O nível das vagas que você quer encontrar agora.</p>
            <fieldset>
              <legend className="sr-only">Nível que você busca</legend>
              <OpcoesEmCartoes nome="nivel" valor={nivel} aoEscolher={setNivel} opcoes={[...NIVEIS.map(([id, n]): [string, string] => [id, n]), ["", "Ainda não sei"]]} />
            </fieldset>
          </>
        )}
        {passo === 3 && (
          <>
            <h1 ref={titulo} tabIndex={-1} className="font-display text-2xl font-bold text-titulo outline-none">O que você já sabe?</h1>
            <p className="mt-2 text-suave">Marque as tecnologias que você usa. É com elas que calculamos a sua aderência às vagas.</p>
            {lista.length > 0 && (
              <>
                <p className="mt-4 font-medium text-titulo">Mais pedidas{area ? ` em ${AREAS[area]}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lista.map((s) => {
                    const ligada = jaTem.has(chaveSkill(s.nome));
                    return (
                      <button
                        key={s.nome} type="button" aria-pressed={ligada} onClick={() => alternar(s.nome)}
                        className={`rounded-full border px-3 py-1 text-sm ${ligada ? "border-link bg-fundo font-semibold text-titulo" : "border-borda text-suave hover:border-link"}`}
                      >
                        {ligada ? "✓ " : "+ "}{s.nome} <span className="text-xs text-suave">{s.pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <form onSubmit={adicionarOutra} className="mt-4 flex gap-2">
              <label htmlFor="outra" className="sr-only">Adicionar outra tecnologia</label>
              <input id="outra" list="onb-skills" value={outra} onChange={(e) => setOutra(e.target.value)} autoComplete="off" placeholder="Outra tecnologia (ex.: Airflow, dbt)"
                className="w-full rounded-lg border border-borda bg-superficie px-3 py-2" />
              <datalist id="onb-skills">{nomesParaBusca.map((n) => <option key={n} value={n} />)}</datalist>
              <button type="submit" className={estiloBotao("secundario")}>Adicionar</button>
            </form>
            {escolhidas.length > 0 ? (
              <>
                <p className="mt-4 font-medium text-titulo">Suas tecnologias ({escolhidas.length})</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {escolhidas.map((s) => (
                    <li key={s} className="flex items-center gap-1 rounded-full bg-fundo py-1 pl-3 pr-1 text-sm text-titulo">
                      {s}
                      <button type="button" onClick={() => alternar(s)} aria-label={`Remover ${s}`} className="grid h-6 w-6 place-items-center rounded-full text-suave hover:text-erro">×</button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-suave">Nenhuma ainda. Você pode continuar assim e preencher depois em Meu perfil.</p>
            )}
          </>
        )}
      </section>

      {erro && <p role="alert" className="mt-3 font-medium text-erro">{erro}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => void terminar(true)} disabled={salvando} className={estiloBotao("discreto")}>Pular por agora</button>
        <div className="flex gap-3">
          {passo > 1 && <button type="button" onClick={() => setPasso(passo - 1)} disabled={salvando} className={estiloBotao("secundario")}>Voltar</button>}
          {passo < TOTAL_PASSOS ? (
            <button type="button" onClick={() => setPasso(passo + 1)} className={estiloBotao("primario")}>Continuar</button>
          ) : (
            <button type="button" onClick={() => void terminar(false)} disabled={salvando} className={estiloBotao("primario")}>{salvando ? "Salvando…" : "Concluir e ver vagas"}</button>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-suave">Você pode mudar tudo isso depois em Meu perfil.</p>
    </div>
  );
}
