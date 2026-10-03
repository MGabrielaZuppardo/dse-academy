"use client";

import { useState, type FormEvent } from "react";
import { supabaseNoNavegador } from "@/lib/supabase/client";
import { estiloBotao } from "@/lib/botoes";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

/** Login por link no e-mail (sem senha). O link volta para `voltarPara` (padrão: /perfil, que leva ao onboarding no primeiro acesso). */
export function Entrar({ titulo = "Criar meu perfil", texto, voltarPara = "/perfil" }: { titulo?: string; texto?: string; voltarPara?: string }) {
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
      options: { emailRedirectTo: `${location.origin}${voltarPara}` },
    });
    if (error) { console.error(error); setErro("Não foi possível enviar o link agora. Tente de novo em instantes."); setFase("preenchendo"); return; }
    setFase("enviado");
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-titulo">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-suave">
        {texto ?? "Informe o seu e-mail e enviamos um link de acesso. Na primeira vez, o perfil é criado por você aqui mesmo."}
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
          <button type="submit" disabled={fase === "enviando"} className={estiloBotao("primario")}>{fase === "enviando" ? "Enviando…" : "Receber link de acesso"}</button>
        </form>
      )}
    </>
  );
}
