"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Entrar } from "@/components/entrar";
import { useConta } from "@/lib/conta/contexto";
import { jaPulouOnboarding } from "@/lib/onboarding";
import { canonicas, paraLinha, validar } from "@/lib/perfil";
import { AREAS, NIVEIS, slugDaVaga } from "@/lib/rotulos";
import { estiloBotao } from "@/lib/botoes";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

export function PerfilCliente({ skills, vagasNoAr }: { skills: Record<string, string>; vagasNoAr: string[] }) {
  const conta = useConta();
  const router = useRouter();
  const desviarParaOnboarding = conta.precisaDeOnboarding && !jaPulouOnboarding();

  useEffect(() => {
    if (desviarParaOnboarding) router.replace("/boas-vindas");
  }, [desviarParaOnboarding, router]);

  if (!conta.disponivel) {
    return <p role="alert" className="rounded-lg border border-erro p-4 text-erro">O login ainda não está configurado neste ambiente.</p>;
  }
  if (conta.fase === "carregando" || (conta.fase === "logada" && !conta.dadosProntos) || desviarParaOnboarding) {
    return <p role="status" className="text-suave">Carregando…</p>;
  }
  if (conta.fase === "visitante") return <Entrar />;
  if (!conta.perfilLido && conta.perfil === null && conta.dadosProntos && !conta.precisaDeOnboarding) {
    // A leitura do perfil falhou: não mostramos o formulário vazio, para a pessoa não sobrescrever o que já tem guardado.
    return (
      <p role="alert" className="rounded-lg border border-erro p-4 text-erro">
        Não foi possível carregar o seu perfil agora. Recarregue a página em instantes.
      </p>
    );
  }
  return (
    <>
      <EditarPerfil skills={skills} />
      <VagasSalvas vagasNoAr={vagasNoAr} />
      <ContaAcoes />
    </>
  );
}

function EditarPerfil({ skills }: { skills: Record<string, string> }) {
  const conta = useConta();
  const inicial = conta.perfil;
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [area, setArea] = useState(inicial?.area ?? "");
  const [senioridade, setSenioridade] = useState(inicial?.senioridade ?? "");
  const [habilidades, setHabilidades] = useState((inicial?.habilidades ?? []).join(", "));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const form = { nome, area, senioridade, habilidades };
    const problema = validar(form, skills);
    if (problema) { setMensagem({ tipo: "erro", texto: problema }); return; }
    setSalvando(true);
    setMensagem(null);
    const linha = paraLinha(form, skills);
    try {
      await conta.gravarPerfil(linha);
      setHabilidades(linha.habilidades.join(", "));
      setMensagem({ tipo: "ok", texto: "Perfil salvo." });
    } catch (erro) {
      console.error(erro);
      setMensagem({ tipo: "erro", texto: "Não foi possível salvar agora. Tente de novo." });
    } finally {
      setSalvando(false);
    }
  }

  const sugestoes = Object.values(skills);
  const atuais = canonicas(habilidades, skills);

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Meu perfil</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Você entrou como <strong>{conta.usuario?.email}</strong>. Suas habilidades, área e nível são usados para calcular a sua aderência às vagas e
        para mostrar o que estudar nas <Link href="/trilhas" className="text-link underline">trilhas</Link>.{" "}
        <Link href="/boas-vindas" className="text-link underline">Refazer a configuração guiada</Link>.
      </p>

      <form onSubmit={salvar} noValidate className="mt-6 space-y-5 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
        <div>
          <label htmlFor="nome" className="block font-medium text-titulo">Nome</label>
          <input id="nome" value={nome} maxLength={120} autoComplete="name" onChange={(e) => setNome(e.target.value)} className={campo} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="area" className="block font-medium text-titulo">Área de interesse</label>
            <select id="area" value={area} onChange={(e) => setArea(e.target.value)} className={campo}>
              <option value="">Não informada</option>
              {Object.entries(AREAS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="senioridade" className="block font-medium text-titulo">Nível</label>
            <select id="senioridade" value={senioridade} onChange={(e) => setSenioridade(e.target.value)} className={campo}>
              <option value="">Não informado</option>
              {NIVEIS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="habilidades" className="block font-medium text-titulo">
            Minhas habilidades
            <span className="block text-sm font-normal text-suave">Separe por vírgula. Reconhecemos nomes como &quot;spark&quot; ou &quot;power bi&quot; e usamos o nome oficial.</span>
          </label>
          <input id="habilidades" list="lista-skills" value={habilidades} onChange={(e) => setHabilidades(e.target.value)} className={campo} />
          <datalist id="lista-skills">{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>
          {atuais.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Habilidades reconhecidas">
              {atuais.map((s) => <li key={s} className="rounded-full bg-fundo px-3 py-1 text-titulo">{s}</li>)}
            </ul>
          )}
        </div>

        {mensagem && <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? "font-medium text-erro" : "font-medium text-link"}>{mensagem.texto}</p>}
        <button type="submit" disabled={salvando} className={estiloBotao("primario")}>{salvando ? "Salvando…" : "Salvar perfil"}</button>
      </form>
    </>
  );
}

function VagasSalvas({ vagasNoAr }: { vagasNoAr: string[] }) {
  const conta = useConta();
  const [erro, setErro] = useState<string | null>(null);
  const noAr = new Set(vagasNoAr);

  async function remover(vagaId: string, titulo: string | null) {
    setErro(null);
    try {
      await conta.alternarSalva({ vaga_id: vagaId, titulo, empresa: null, url: null });
    } catch (e) {
      console.error(e);
      setErro("Não foi possível remover agora. Tente de novo.");
    }
  }

  return (
    <section aria-labelledby="salvas" className="mt-10">
      <h2 id="salvas" className="font-display text-2xl font-semibold text-titulo">Vagas salvas</h2>
      {conta.salvasIndisponiveis ? (
        <p className="mt-2 text-suave">Não foi possível carregar as suas vagas salvas agora. O resto do perfil continua funcionando.</p>
      ) : conta.salvas.length === 0 ? (
        <p className="mt-2 text-suave">Você ainda não salvou nenhuma vaga. Use &quot;Salvar vaga&quot; na página de uma vaga em <Link href="/vagas" className="text-link underline">Vagas</Link>.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {conta.salvas.map((s) => {
            const slug = slugDaVaga(s.vaga_id);
            const aberta = noAr.has(s.vaga_id);
            return (
              <li key={s.vaga_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borda bg-superficie p-4">
                <div>
                  {aberta ? (
                    <Link href={`/vagas/${slug}`} className="font-display text-lg font-semibold text-titulo hover:text-link">{s.titulo ?? "Vaga"}</Link>
                  ) : s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-display text-lg font-semibold text-titulo hover:text-link">{s.titulo ?? "Vaga"}</a>
                  ) : (
                    <span className="font-display text-lg font-semibold text-titulo">{s.titulo ?? "Vaga"}</span>
                  )}
                  <p className="text-sm text-suave">{[s.empresa, aberta ? null : "não está mais na lista atual"].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => remover(s.vaga_id, s.titulo)} className={estiloBotao("secundario", "pequeno")}>
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {erro && <p role="alert" className="mt-2 font-medium text-erro">{erro}</p>}
    </section>
  );
}

function ContaAcoes() {
  const conta = useConta();
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    if (!confirm("Excluir sua conta e todos os seus dados? Essa ação não pode ser desfeita.")) return;
    try { await conta.excluirConta(); } catch (e) { console.error(e); setErro("Não foi possível excluir a conta agora. Tente de novo."); }
  }

  return (
    <div className="mt-10 border-t border-borda pt-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button type="button" onClick={() => void conta.sair()} className={estiloBotao("secundario")}>Sair</button>
        <button type="button" onClick={excluir} className={estiloBotao("perigo")}>Excluir minha conta e meus dados</button>
      </div>
      {erro && <p role="alert" className="mt-2 font-medium text-erro">{erro}</p>}
    </div>
  );
}
