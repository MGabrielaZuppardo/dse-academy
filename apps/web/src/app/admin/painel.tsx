"use client";

import { useEffect, useState } from "react";
import { percentual, somar, STATUS_ARTIGO, STATUS_PALESTRANTE, type ResumoAdmin } from "@/lib/admin/resumo";
import { TIPOS_RELATO } from "@/lib/relato";
import { AREAS, NOME_NIVEL } from "@/lib/rotulos";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { HistoricoAdmin } from "./historico";
import { Barras, Carregando, Erro, Kpi, Quadro } from "./ui";

const NOME_TIPO: Record<string, string> = Object.fromEntries(TIPOS_RELATO);

function porRotulo(valores: Record<string, number>, rotulos: readonly (readonly [string, string])[]) {
  return rotulos.map(([id, nome]) => ({ nome, n: valores[id] ?? 0 }));
}

export function Painel({ titulos }: { titulos: Record<string, string> }) {
  const [resumo, setResumo] = useState<ResumoAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void supabaseNoNavegador().rpc("admin_resumo").then(({ data, error }) => {
      if (!vivo) return;
      if (error) {
        console.warn("admin_resumo indisponível:", error.message);
        setErro(error.code === "42883" || error.code === "PGRST202"
          ? "Os números ainda não estão disponíveis: falta aplicar a migration 007 no Supabase."
          : "Não foi possível carregar os números agora.");
        return;
      }
      setResumo(data as ResumoAdmin);
    });
    return () => { vivo = false; };
  }, []);

  if (erro) return <Erro texto={erro} />;
  if (!resumo) return <Carregando />;

  const { usuarios: u, artigos, palestrantes, reportes, vagas_salvas: salvas } = resumo;
  const pendentesArtigos = (artigos.por_status.recebido ?? 0) + (artigos.por_status.em_revisao ?? 0);
  const pendentesPalestrantes = palestrantes.por_status.pendente ?? 0;
  const inscricoes = resumo.trilhas.reduce((a, t) => a + t.inscritos, 0);

  return (
    <div className="space-y-6">
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi valor={u.total} rotulo="pessoas cadastradas" detalhe={`${u.novos_7d} nos últimos 7 dias`} />
        <Kpi valor={`${percentual(u.com_perfil, u.total)}%`} rotulo="com perfil preenchido" detalhe={`${u.com_perfil} de ${u.total}`} />
        <Kpi valor={salvas.total} rotulo="vagas salvas" detalhe={`por ${salvas.pessoas} ${salvas.pessoas === 1 ? "pessoa" : "pessoas"}`} />
        <Kpi valor={inscricoes} rotulo="inscrições em trilhas" />
      </section>

      <section aria-label="Pendências" className="grid gap-3 sm:grid-cols-3">
        <Kpi valor={pendentesArtigos} rotulo="artigos para revisar" detalhe={`${artigos.total} no total`} />
        <Kpi valor={pendentesPalestrantes} rotulo="palestrantes para aprovar" detalhe={`${palestrantes.total} no total`} />
        <Kpi valor={reportes.total} rotulo="relatos de erro em vagas" />
      </section>

      <Quadro id="historico" titulo="Evolução ao longo do tempo">
        <HistoricoAdmin />
      </Quadro>

      <div className="grid gap-6 lg:grid-cols-2">
        <Quadro id="areas" titulo="Área de interesse">
          <Barras itens={resumo.areas.map((a) => ({ nome: AREAS[a.nome] ?? a.nome, n: a.n }))} vazio="Ninguém informou a área ainda." />
        </Quadro>
        <Quadro id="niveis" titulo="Nível">
          <Barras itens={resumo.senioridades.map((a) => ({ nome: NOME_NIVEL[a.nome] ?? a.nome, n: a.n }))} vazio="Ninguém informou o nível ainda." />
        </Quadro>
        <Quadro id="trilhas" titulo="Trilhas mais seguidas">
          <Barras itens={resumo.trilhas.map((t) => ({ nome: titulos[t.trilha_id] ?? t.trilha_id, n: t.inscritos }))} vazio="Ninguém iniciou uma trilha ainda." />
        </Quadro>
        <Quadro id="artigos-status" titulo="Artigos por situação">
          <Barras itens={porRotulo(artigos.por_status, STATUS_ARTIGO)} vazio="Nenhum artigo enviado." />
        </Quadro>
        <Quadro id="palestrantes-status" titulo="Palestrantes por situação">
          <Barras itens={porRotulo(palestrantes.por_status, STATUS_PALESTRANTE)} vazio="Nenhum cadastro de palestrante." />
        </Quadro>
        <Quadro id="relatos" titulo="Relatos de erro por tipo">
          <Barras itens={Object.entries(reportes.por_tipo).map(([id, n]) => ({ nome: NOME_TIPO[id] ?? id, n }))} vazio="Nenhum relato recebido." />
          {somar(reportes.por_tipo) > 0 && reportes.vagas_mais_reportadas.length > 0 && (
            <>
              <h3 className="mt-4 font-medium text-titulo">Vagas mais relatadas</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-tinta">
                {reportes.vagas_mais_reportadas.map((v) => (
                  <li key={v.vaga_id}>{v.titulo ?? v.vaga_id}{v.empresa ? ` · ${v.empresa}` : ""} <span className="text-suave">({v.n})</span></li>
                ))}
              </ol>
            </>
          )}
        </Quadro>
      </div>
      <p className="text-sm text-suave">Atualizado em {new Date(resumo.gerado_em).toLocaleString("pt-BR")}. Só totais: nenhum dado pessoal aparece neste painel.</p>
    </div>
  );
}
