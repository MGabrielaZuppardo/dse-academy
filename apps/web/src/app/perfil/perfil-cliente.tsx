"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { canonicas, paraLinha, validar, type LinhaPerfil } from "@/lib/perfil";
import { AREAS, NIVEIS } from "@/lib/rotulos";
import { configurado, supabaseNoNavegador } from "@/lib/supabase/client";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";
const botao = "rounded-lg bg-azul px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";

type Estado = { fase: "carregando" } | { fase: "visitante" } | { fase: "logada"; usuario: User; perfil: LinhaPerfil | null };

export function PerfilCliente({ skills }: { skills: Record<string, string> }) {
  const ok = configurado();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });

  useEffect(() => {
    if (!ok) return;
    const sb = supabaseNoNavegador();
    let ativo = true;

    async function carregar(usuario: User | null) {
      if (!usuario) { if (ativo) setEstado({ fase: "visitante" }); return; }
      const { data, error } = await sb.from("perfis").select("nome, area, senioridade, habilidades").eq("id", usuario.id).maybeSingle();
      if (!ativo) return;
      if (error) console.error(error);
      setEstado({ fase: "logada", usuario, perfil: data });
    }

    // Cobre o retorno do link do e-mail (?code=...), que o supabase-js troca por sessão sozinho.
    const { data: ouvinte } = sb.auth.onAuthStateChange((_evento, sessao) => { void carregar(sessao?.user ?? null); });
    void sb.auth.getSession().then(({ data }) => carregar(data.session?.user ?? null));
    return () => { ativo = false; ouvinte.subscription.unsubscribe(); };
  }, [ok]);

  if (!ok) {
    return <p role="alert" className="rounded-lg border border-erro p-4 text-erro">O login ainda não está configurado neste ambiente.</p>;
  }
  if (estado.fase === "carregando") return <p role="status" className="text-suave">Carregando…</p>;
  if (estado.fase === "visitante") return <Entrar />;
  return <EditarPerfil usuario={estado.usuario} inicial={estado.perfil} skills={skills} />;
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [fase, setFase] = useState<"preenchendo" | "enviando" | "enviado">("preenchendo");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErro("Informe um e-mail válido."); return; }
    setErro(null);
    setFase("enviando");
    const { error } = await supabaseNoNavegador().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/perfil` },
    });
    if (error) { console.error(error); setErro("Não foi possível enviar o link agora. Tente de novo em instantes."); setFase("preenchendo"); return; }
    setFase("enviado");
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">Criar meu perfil</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Entre com o seu e-mail, sem senha: enviamos um link de acesso. Na primeira vez, o perfil é criado por você aqui mesmo.
      </p>
      {fase === "enviado" ? (
        <div role="status" className="mt-6 rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="font-display text-xl font-semibold text-titulo">Confira seu e-mail</h2>
          <p className="mt-2 text-suave">Enviamos um link para <strong>{email.trim()}</strong>. Abra-o neste mesmo navegador para entrar.</p>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="mt-6 max-w-md space-y-4 rounded-2xl border border-borda bg-superficie p-5">
          <div>
            <label htmlFor="email" className="block font-medium text-titulo">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </div>
          {erro && <p role="alert" className="font-medium text-erro">{erro}</p>}
          <button type="submit" disabled={fase === "enviando"} className={botao}>{fase === "enviando" ? "Enviando…" : "Receber link de acesso"}</button>
        </form>
      )}
    </>
  );
}

function EditarPerfil({ usuario, inicial, skills }: { usuario: User; inicial: LinhaPerfil | null; skills: Record<string, string> }) {
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
    const { error } = await supabaseNoNavegador().from("perfis").upsert({ id: usuario.id, ...linha, atualizado_em: new Date().toISOString() });
    setSalvando(false);
    if (error) { console.error(error); setMensagem({ tipo: "erro", texto: "Não foi possível salvar agora. Tente de novo." }); return; }
    setHabilidades(linha.habilidades.join(", "));
    setMensagem({ tipo: "ok", texto: "Perfil salvo." });
  }

  async function sair() { await supabaseNoNavegador().auth.signOut(); }

  async function excluir() {
    if (!confirm("Excluir sua conta e todos os seus dados? Essa ação não pode ser desfeita.")) return;
    const sb = supabaseNoNavegador();
    const { error } = await sb.rpc("excluir_minha_conta");
    if (error) { console.error(error); setMensagem({ tipo: "erro", texto: "Não foi possível excluir a conta agora. Tente de novo." }); return; }
    await sb.auth.signOut();
  }

  const sugestoes = Object.values(skills);
  const atuais = canonicas(habilidades, skills);

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">{inicial ? "Meu perfil" : "Criar meu perfil"}</h1>
      <p className="mt-2 max-w-2xl text-suave">Você entrou como <strong>{usuario.email}</strong>. {inicial ? "" : "Preencha o que quiser; tudo é opcional e pode mudar depois."}</p>

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
        <button type="submit" disabled={salvando} className={botao}>{salvando ? "Salvando…" : "Salvar perfil"}</button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <button type="button" onClick={sair} className="rounded-lg border border-borda px-4 py-2 text-suave hover:border-link">Sair</button>
        <button type="button" onClick={excluir} className="text-erro underline">Excluir minha conta e meus dados</button>
      </div>
    </>
  );
}
