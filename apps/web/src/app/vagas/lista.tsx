"use client";

import { ConviteLogin } from "@/components/convite-login";
import Link from "next/link";
import { useMemo, useState } from "react";
import { calcularAderencia, conhecidasDe, ordenarPorAderencia } from "@/lib/aderencia";
import { useConta } from "@/lib/conta/contexto";
import { AREAS, MODELOS, NIVEIS, NOME_NIVEL, slugDaVaga } from "@/lib/rotulos";
import { PAIS, SINONIMOS } from "@/lib/taxonomia";
import { norm } from "@/lib/texto";
import { BOTAO_ICONE, estiloBotao } from "@/lib/botoes";

export type ItemVaga = {
  id: string;
  titulo: string;
  empresa: string;
  url: string;
  local: string;
  modelo: string | null;
  area: string | null;
  senioridade: string | null;
  stacks: string[]; // nomes, para exibir e buscar
  principais: string[]; // ids, para calcular a aderência
  publicada: string;
};

const POR_PAGINA = 20;
const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

export function ListaVagas({ itens }: { itens: ItemVaga[] }) {
  const conta = useConta();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState("");
  const [modelo, setModelo] = useState("");
  const [escolhida, setEscolhida] = useState<"recentes" | "aderentes" | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const conhecidas = useMemo(() => conhecidasDe(conta.fase === "logada" ? conta.habilidades : [], SINONIMOS, PAIS), [conta.fase, conta.habilidades]);
  const temPerfil = conta.fase === "logada" && conhecidas.ids.size > 0;
  // Quem tem habilidades vê as vagas mais aderentes primeiro, a menos que escolha outra ordem.
  const ordem = escolhida ?? (temPerfil ? "aderentes" : "recentes");
  const porAderencia = ordem === "aderentes" && temPerfil;

  const aderencias = useMemo(() => {
    const m = new Map<string, ReturnType<typeof calcularAderencia>>();
    if (temPerfil) for (const v of itens) m.set(v.id, calcularAderencia(v.principais, conhecidas.ids));
    return m;
  }, [itens, temPerfil, conhecidas]);

  const filtradas = useMemo(() => {
    const termos = norm(q).split(/\s+/).filter(Boolean);
    const lista = itens.filter((v) => {
      if (area && v.area !== area) return false;
      if (nivel && v.senioridade !== nivel) return false;
      if (modelo && v.modelo !== modelo) return false;
      if (!termos.length) return true;
      const texto = norm(`${v.titulo} ${v.empresa} ${v.stacks.join(" ")}`);
      return termos.every((t) => texto.includes(t));
    });
    return porAderencia ? ordenarPorAderencia(lista, (v) => aderencias.get(v.id)?.nota ?? -1) : lista;
  }, [itens, q, area, nivel, modelo, porAderencia, aderencias]);

  const mudou = (f: () => void) => { f(); setLimite(POR_PAGINA); };

  async function alternarSalva(v: ItemVaga) {
    setErroSalvar(null);
    try {
      await conta.alternarSalva({ vaga_id: v.id, titulo: v.titulo, empresa: v.empresa, url: v.url });
    } catch (e) {
      console.error(e);
      setErroSalvar("Não foi possível atualizar suas vagas salvas. Tente de novo.");
    }
  }

  return (
    <div className="mt-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-2xl border border-borda bg-superficie p-4 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <label htmlFor="q" className="block font-medium text-titulo">Buscar por cargo, empresa ou tecnologia</label>
          <input id="q" type="search" value={q} onChange={(e) => mudou(() => setQ(e.target.value))} placeholder="ex.: engenheiro de dados spark" className={campo} />
        </div>
        <div>
          <label htmlFor="area" className="block font-medium text-titulo">Área</label>
          <select id="area" value={area} onChange={(e) => mudou(() => setArea(e.target.value))} className={campo}>
            <option value="">Todas</option>
            {Object.entries(AREAS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nivel" className="block font-medium text-titulo">Nível</label>
          <select id="nivel" value={nivel} onChange={(e) => mudou(() => setNivel(e.target.value))} className={campo}>
            <option value="">Todos</option>
            {NIVEIS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="modelo" className="block font-medium text-titulo">Modelo</label>
          <select id="modelo" value={modelo} onChange={(e) => mudou(() => setModelo(e.target.value))} className={campo}>
            <option value="">Todos</option>
            {Object.entries(MODELOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        {temPerfil && (
          <div>
            <label htmlFor="ordem" className="block font-medium text-titulo">Ordenar por</label>
            <select id="ordem" value={ordem} onChange={(e) => mudou(() => setEscolhida(e.target.value as "recentes" | "aderentes"))} className={campo}>
              <option value="aderentes">Mais aderentes ao meu perfil</option>
              <option value="recentes">Mais recentes</option>
            </select>
          </div>
        )}
        <div className={`flex items-end ${temPerfil ? "sm:col-span-4" : ""}`}>
          <button type="button" onClick={() => mudou(() => { setQ(""); setArea(""); setNivel(""); setModelo(""); })} className={estiloBotao("secundario")}>
            Limpar filtros
          </button>
        </div>
      </form>

      {conta.fase === "logada" && conta.dadosProntos && !temPerfil && (
        <p className="mt-4 text-sm text-suave">
          <Link href={conta.precisaDeOnboarding ? "/boas-vindas" : "/perfil"} className="text-link underline">Informe suas habilidades</Link> para ver a aderência de cada vaga e ordenar pelas que mais combinam com você.
        </p>
      )}
      <ConviteLogin
        className="mt-4"
        titulo="Veja quais vagas combinam com você"
        texto="Crie seu perfil para ver a aderência de cada vaga, ordenar pelas que mais combinam e salvar as favoritas."
      />

      <p role="status" aria-live="polite" className="mt-4 text-sm text-suave">
        {filtradas.length === 0 ? "Nenhuma vaga encontrada com esses filtros." : `${filtradas.length} ${filtradas.length === 1 ? "vaga" : "vagas"}${porAderencia ? ", das mais aderentes ao meu perfil para as menos" : ""}`}
      </p>
      {porAderencia && (
        <p className="mt-1 text-sm text-suave">
          A ordem pesa quantas tecnologias você já tem, e não só o percentual: uma vaga que pede apenas 1 tecnologia não passa à frente de uma que pede 8 das quais você tem 4.
        </p>
      )}
      {erroSalvar && <p role="alert" className="mt-1 font-medium text-erro">{erroSalvar}</p>}

      <ul className="mt-2 space-y-3">
        {filtradas.slice(0, limite).map((v) => {
          const ad = aderencias.get(v.id);
          const salva = conta.estaSalva(v.id);
          return (
            <li key={v.id} className="relative">
              <Link href={`/vagas/${slugDaVaga(v.id)}`} className={`block rounded-2xl border border-borda bg-superficie p-4 transition hover:border-link ${conta.fase === "logada" ? "pr-16" : ""}`}>
                <h2 className="font-display text-lg font-semibold text-titulo">{v.titulo}</h2>
                <p className="text-suave">
                  {v.empresa} · {v.local}{v.modelo ? ` · ${MODELOS[v.modelo] ?? v.modelo}` : ""} · {v.publicada}
                </p>
                <p className="mt-2 flex flex-wrap gap-2 text-sm">
                  {ad && (ad.pct >= 0
                    ? <span className="rounded-full border border-link px-2.5 py-0.5 font-semibold text-link">Aderência {ad.pct}% ({ad.tem} de {ad.total})</span>
                    : <span className="rounded-full border border-borda px-2.5 py-0.5 text-suave">Sem tecnologias identificadas</span>)}
                  {v.senioridade && <span className="rounded-full bg-marinho px-2.5 py-0.5 text-white">{NOME_NIVEL[v.senioridade] ?? "Nível não identificado"}</span>}
                  {v.area && AREAS[v.area] && <span className="rounded-full border border-borda px-2.5 py-0.5 text-suave">{AREAS[v.area]}</span>}
                  {v.stacks.slice(0, 6).map((s) => <span key={s} className="rounded-full bg-fundo px-2.5 py-0.5 text-titulo">{s}</span>)}
                  {v.stacks.length > 6 && <span className="px-1 py-0.5 text-suave">+{v.stacks.length - 6}</span>}
                </p>
              </Link>
              {conta.fase === "logada" && (
                <button
                  type="button" onClick={() => void alternarSalva(v)} aria-pressed={salva} aria-label={salva ? `Remover ${v.titulo} das vagas salvas` : `Salvar vaga ${v.titulo}`}
                  className={`${BOTAO_ICONE} absolute right-3 top-3 ${salva ? "border-link bg-fundo text-link" : "border-borda bg-superficie text-suave hover:border-link hover:text-link"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={salva ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {filtradas.length > limite && (
        <button type="button" onClick={() => setLimite(limite + POR_PAGINA)} className={`mt-4 ${estiloBotao("primario")}`}>
          Mostrar mais vagas
        </button>
      )}
    </div>
  );
}
