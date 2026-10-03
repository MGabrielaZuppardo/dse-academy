"use client";

import { useState, type FormEvent } from "react";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { estiloBotao } from "@/lib/botoes";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

/** Logotipo do Google (o "G" colorido), conforme as diretrizes da marca. Decorativo: o texto do botão já diz o que ele faz. */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Login por link no e-mail (sem senha) ou com a conta Google. O link volta para `voltarPara` (padrão: /perfil, que leva ao onboarding no primeiro acesso). */
export function Entrar({ titulo = "Criar meu perfil", texto, voltarPara = "/perfil" }: { titulo?: string; texto?: string; voltarPara?: string }) {
  const [email, setEmail] = useState("");
  const [fase, setFase] = useState<"preenchendo" | "enviando" | "enviado">("preenchendo");
  const [erro, setErro] = useState<string | null>(null);
  const [indoParaGoogle, setIndoParaGoogle] = useState(false);

  // Mesmo retorno do link do e-mail: o supabase-js troca o ?code= da volta por sessão sozinho.
  async function entrarComGoogle() {
    setErro(null);
    setIndoParaGoogle(true);
    const { error } = await supabaseNoNavegador().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}${voltarPara}` },
    });
    if (error) { console.error(error); setErro("Não foi possível entrar com o Google agora. Tente de novo ou use o link por e-mail."); setIndoParaGoogle(false); }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErro("Informe um e-mail válido."); return; }
    setErro(null);
    setFase("enviando");
    const { error } = await supabaseNoNavegador().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}${voltarPara}` },
    });
    if (error) { console.error(error); setErro("Não foi possível enviar o link agora. Tente de novo em instantes."); setFase("preenchendo"); return; }
    setFase("enviado");
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-suave">
        {texto ?? "Entre com a sua conta Google ou receba um link de acesso no e-mail. Na primeira vez, o perfil é criado por você aqui mesmo."}
      </p>
      {fase === "enviado" ? (
        <div role="status" className="mt-6 rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="font-display text-xl font-semibold text-titulo">Confira seu e-mail</h2>
          <p className="mt-2 text-suave">Enviamos um link para <strong>{email.trim()}</strong>. Abra-o neste mesmo navegador para entrar.</p>
        </div>
      ) : (
        <div className="mt-6 max-w-md space-y-4 rounded-2xl border border-borda bg-superficie p-5">
          <button type="button" onClick={entrarComGoogle} disabled={indoParaGoogle} className={`w-full ${estiloBotao("secundario")}`}>
            <LogoGoogle />
            {indoParaGoogle ? "Abrindo o Google…" : "Entrar com o Google"}
          </button>
          <p className="flex items-center gap-3 text-sm text-suave" aria-hidden="true">
            <span className="h-px flex-1 bg-borda" />ou<span className="h-px flex-1 bg-borda" />
          </p>
        <form onSubmit={enviar} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-medium text-titulo">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </div>
          {erro && <p role="alert" className="font-medium text-erro">{erro}</p>}
          <button type="submit" disabled={fase === "enviando"} className={estiloBotao("primario")}>{fase === "enviando" ? "Enviando…" : "Receber link de acesso"}</button>
        </form>
        </div>
      )}
    </>
  );
}
