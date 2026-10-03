"use client";

import Image from "next/image";
import { useEffect, useReducer, useState } from "react";
import type { FotoDaGaleria } from "@/lib/galeria";

const INTERVALO_MS = 6000;

type Estado = { atual: number; maiorVista: number }; // maiorVista: a foto mais adiante já liberada para carregar
type Acao = { tipo: "ir"; indice: number } | { tipo: "avancar" };

/** Troca a foto e, na mesma atualização, libera o carregamento da seguinte (assim só a atual e a próxima baixam). */
function reduzir(total: number) {
  return (e: Estado, a: Acao): Estado => {
    const atual = a.tipo === "ir" ? a.indice : (e.atual + 1) % total;
    return { atual, maiorVista: Math.max(e.maiorVista, Math.min(atual + 1, total - 1)) };
  };
}

/**
 * Fotos como fundo de uma seção, trocando em carrossel. Deve ficar dentro de um elemento `relative isolate overflow-hidden`;
 * o conteúdo da seção precisa de `relative z-10` para ficar acima das fotos.
 *
 * Acessibilidade: o movimento automático pode ser pausado (botão), cada foto pode ser escolhida (bolinhas) e, para
 * quem pede menos movimento no sistema, nada troca sozinho. Só a foto visível tem texto alternativo.
 */
export function FundoCarrossel({ fotos }: { fotos: FotoDaGaleria[] }) {
  const [{ atual, maiorVista }, enviar] = useReducer(reduzir(fotos.length), { atual: 0, maiorVista: Math.min(1, fotos.length - 1) });
  const [rodando, setRodando] = useState(true);
  const [reduzMovimento, setReduzMovimento] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setReduzMovimento(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  const andando = rodando && !reduzMovimento;
  useEffect(() => {
    if (!andando) return;
    const id = setInterval(() => enviar({ tipo: "avancar" }), INTERVALO_MS);
    return () => clearInterval(id);
  }, [andando]);

  const foco = "focus-visible:outline-white";

  return (
    <>
      <div className="absolute inset-0 -z-10 bg-marinho">
        {fotos.map((f, i) =>
          i <= maiorVista ? (
            <Image
              key={f.arquivo} src={f.arquivo} alt={i === atual ? f.alt : ""} aria-hidden={i !== atual} fill
              sizes="(min-width: 1024px) 1024px, 100vw" priority={i === 0} quality={70}
              style={{ objectPosition: f.posicao ?? "center 35%" }}
              className={`object-cover transition-opacity duration-1000 motion-reduce:transition-none ${i === atual ? "opacity-100" : "opacity-0"}`}
            />
          ) : null,
        )}
        {/* Escurece só onde há texto (à esquerda no computador, em cima no celular) e deixa o resto da foto vivo.
            No celular o degradê é forte até 80% da altura, onde o texto termina; no computador, até 56% da largura.
            O texto fica sempre sobre a parte escura, o que mantém o contraste mínimo de 4,5:1 mesmo com fotos totalmente brancas. */}
        <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg, rgba(7,20,47,.9) 0%, rgba(7,20,47,.84) 80%, rgba(7,20,47,.4) 100%)" }} />
        <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(90deg, rgba(7,20,47,.93) 0%, rgba(7,20,47,.9) 56%, rgba(7,20,47,.08) 100%)" }} />
      </div>

      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between gap-3 sm:left-6 sm:right-6">
        <div role="group" aria-label="Escolher foto do fundo" className="flex items-center rounded-full bg-marinho/55 px-1 backdrop-blur-sm">
          {fotos.map((f, i) => (
            <button
              key={f.arquivo} type="button" onClick={() => enviar({ tipo: "ir", indice: i })}
              aria-label={`Mostrar foto ${i + 1} de ${fotos.length}`} aria-current={i === atual ? "true" : undefined}
              className={`grid h-6 w-6 place-items-center rounded-full ${foco}`}
            >
              <span className={`block h-2.5 w-2.5 rounded-full transition ${i === atual ? "scale-125 bg-white" : "bg-white/45 hover:bg-white/75"}`} />
            </button>
          ))}
        </div>
        {!reduzMovimento && (
          <button
            type="button" onClick={() => setRodando((r) => !r)} aria-pressed={!rodando}
            aria-label={rodando ? "Pausar a troca automática de fotos" : "Retomar a troca automática de fotos"}
            className={`grid h-9 w-9 place-items-center rounded-full border border-white/50 bg-marinho/55 text-white backdrop-blur-sm hover:border-white hover:bg-marinho/80 ${foco}`}
          >
            {rodando ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
            )}
          </button>
        )}
      </div>
    </>
  );
}
