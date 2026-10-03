"use client";

import Link from "next/link";
import { useMemo } from "react";
import { calcularAderencia, conhecidasDe, encaixeArea, encaixeNivel, type Encaixe } from "@/lib/aderencia";
import { useConta } from "@/lib/conta/contexto";
import type { PassoDaTrilha } from "@/lib/ligacao-trilhas";
import { MODELOS } from "@/lib/rotulos";
import { PAIS, SINONIMOS } from "@/lib/taxonomia";
import { NIVEIS_TRILHA } from "@/lib/trilha-tipos";
import { estiloBotao } from "@/lib/botoes";

export type DadosDoPainel = {
  area: string | null;
  nivel: string | null;
  modelo: string | null;
  local: string;
  principais: string[];
  desejaveis: string[];
  enriquecida: boolean;
  nomes: Record<string, string>; // id -> nome, das tecnologias da vaga
  demanda: Record<string, number>; // % das vagas da mesma área que pedem cada tecnologia
  nomeGrupo: string; // "vagas de BI"
  passos: Record<string, PassoDaTrilha>; // onde estudar cada tecnologia nas trilhas
  trilhaDaArea: { id: string; titulo: string } | null;
};

const NOME_DO_NIVEL = Object.fromEntries(NIVEIS_TRILHA.map((n) => [n.id, n.nome.toLowerCase()]));
const COR_DO_ENCAIXE: Record<Encaixe["tipo"], string> = { ok: "text-link", atencao: "text-erro", neutro: "text-suave" };
const ICONE_DO_ENCAIXE: Record<Encaixe["tipo"], string> = { ok: "✓", atencao: "!", neutro: "–" };

export function PainelAderencia({ d }: { d: DadosDoPainel }) {
  const conta = useConta();

  // Só quem está logada tem aderência: as habilidades vêm do perfil.
  const lista = useMemo(() => (conta.fase === "logada" ? conta.habilidades : []), [conta.fase, conta.habilidades]);
  const conhecidas = useMemo(() => conhecidasDe(lista, SINONIMOS, PAIS), [lista]);
  const informou = conhecidas.ids.size > 0;

  const carregando = conta.fase === "carregando" || (conta.fase === "logada" && !conta.dadosProntos);
  const nome = (id: string) => d.nomes[id] ?? id;
  const tem = d.principais.filter((id) => conhecidas.ids.has(id));
  const falta = d.principais.filter((id) => !conhecidas.ids.has(id)).sort((a, b) => (d.demanda[b] ?? 0) - (d.demanda[a] ?? 0));
  const ad = calcularAderencia(d.principais, conhecidas.ids);
  const diferenciais = d.enriquecida ? d.desejaveis.filter((id) => !d.principais.includes(id)) : [];

  const encaixes: Encaixe[] = [];
  if (conta.fase === "logada" && conta.perfil) {
    encaixes.push(encaixeNivel(d.nivel, conta.perfil.senioridade), encaixeArea(d.area, conta.perfil.area));
  }
  if (d.modelo) encaixes.push({ tipo: "neutro", texto: `Modelo de trabalho: ${MODELOS[d.modelo] ?? d.modelo} · ${d.local}.` });

  return (
    <section aria-labelledby="aderencia" className="mt-6 rounded-2xl border border-borda bg-superficie p-5">
      <h2 id="aderencia" className="font-display text-xl font-semibold text-titulo">Sua aderência a esta vaga</h2>

      {carregando ? (
        <p role="status" className="mt-2 text-suave">Carregando…</p>
      ) : (
        <>
          {conta.fase === "visitante" && (
            <div className="mt-2">
              <p className="text-suave">
                A aderência é exclusiva de quem tem perfil: com as suas habilidades, mostramos quanto desta vaga você já cobre e o que estudar para chegar lá.
              </p>
              {conta.disponivel && <Link href="/perfil" className={`mt-4 ${estiloBotao("primario")}`}>Entrar e ver minha aderência</Link>}
            </div>
          )}

          {conta.fase === "logada" && conta.precisaDeOnboarding && (
            <p className="mt-2 text-suave"><Link href="/boas-vindas" className="text-link underline">Complete o seu perfil em 3 passos</Link> para ver a aderência a esta vaga.</p>
          )}
          {conta.fase === "logada" && !conta.precisaDeOnboarding && !informou && (
            <p className="mt-2 text-suave">Você ainda não informou habilidades. <Link href="/perfil" className="text-link underline">Adicione em Meu perfil</Link> para ver a sua aderência.</p>
          )}

          {d.principais.length === 0 ? (
            <p className="mt-3 text-suave">Não identificamos tecnologias nesta vaga. Confira a descrição completa.</p>
          ) : (
            informou && (
              <>
                <div className="mt-4 flex items-baseline gap-3">
                  <strong className="font-display text-4xl text-titulo">{ad.pct}%</strong>
                  <span className="text-suave">das tecnologias da vaga você já tem ({ad.tem} de {ad.total})</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-fundo" role="img" aria-label={`Aderência de ${ad.pct}%`}>
                  <div className="h-full rounded-full bg-azul" style={{ width: `${ad.pct}%` }} />
                </div>

                {encaixes.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {encaixes.map((e) => (
                      <li key={e.texto} className="flex gap-2">
                        <span aria-hidden="true" className={`w-4 text-center font-bold ${COR_DO_ENCAIXE[e.tipo]}`}>{ICONE_DO_ENCAIXE[e.tipo]}</span>
                        <span className="text-tinta">{e.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="mt-5 font-display text-lg font-semibold text-titulo">Você já tem</h3>
                {tem.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">{tem.map((id) => <li key={id} className="rounded-full bg-fundo px-3 py-1 text-titulo">✓ {nome(id)}</li>)}</ul>
                ) : (
                  <p className="mt-2 text-suave">Nenhuma das tecnologias desta vaga está nas suas habilidades.</p>
                )}

                <h3 className="mt-5 font-display text-lg font-semibold text-titulo">O que falta, por onde começar</h3>
                {falta.length === 0 ? (
                  <p className="mt-2 text-suave">Você já tem todas as tecnologias identificadas nesta vaga.</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-suave">Na ordem do que mais aparece nas {d.nomeGrupo}. Cada item leva ao ponto certo da trilha de estudo.</p>
                    <ol className="mt-3 space-y-3">
                      {falta.map((id, i) => {
                        const passo = d.passos[id];
                        return (
                          <li key={id} className="flex gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marinho text-sm font-semibold text-white" aria-hidden="true">{i + 1}</span>
                            <span>
                              <strong className="text-titulo">{nome(id)}</strong>
                              <span className="block text-sm text-suave">pedida em {d.demanda[id] ?? 0}% das {d.nomeGrupo}</span>
                              {passo && (
                                <Link href={passo.href} className="block text-sm text-link underline">
                                  Estudar na {passo.trilhaTitulo}: {passo.etapaTitulo} (nível {NOME_DO_NIVEL[passo.nivel]})
                                </Link>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    {d.trilhaDaArea && (
                      <Link href={`/trilhas/${d.trilhaDaArea.id}`} className={`mt-4 ${estiloBotao("primario")}`}>
                        Ver a {d.trilhaDaArea.titulo}
                      </Link>
                    )}
                  </>
                )}

                {diferenciais.length > 0 && (
                  <>
                    <h3 className="mt-5 font-display text-lg font-semibold text-titulo">Diferenciais da vaga</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {diferenciais.map((id) => (
                        <li key={id} className={`rounded-full px-3 py-1 ${conhecidas.ids.has(id) ? "bg-fundo text-titulo" : "border border-borda text-suave"}`}>{conhecidas.ids.has(id) ? "✓ " : ""}{nome(id)}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-4 text-sm text-suave">
                  Tecnologias {d.enriquecida ? "extraídas por IA" : "identificadas por palavra-chave"} na descrição. Revise a vaga completa antes de se candidatar.
                </p>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
