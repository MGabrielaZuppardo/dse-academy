"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { IDIOMAS_ARTIGO, MAX_TAGS, paraLinha, validar, type EnvioArtigo } from "@/lib/artigos";
import { configurado, supabaseNoNavegador } from "@/lib/supabase/client";
import { estiloBotao } from "@/lib/botoes";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

function Rotulo({ id, children, dica }: { id: string; children: ReactNode; dica?: string }) {
  return (
    <label htmlFor={id} className="block font-medium text-titulo">
      {children}
      {dica && <span className="block text-sm font-normal text-suave">{dica}</span>}
    </label>
  );
}

export function FormularioArtigo() {
  const [estado, setEstado] = useState<"preenchendo" | "enviando" | "enviado">("preenchendo");
  const [erro, setErro] = useState<string | null>(null);

  if (!configurado()) {
    return <p role="alert" className="mt-6 rounded-lg border border-erro p-4 text-erro">O envio ainda não está configurado neste ambiente.</p>;
  }

  if (estado === "enviado") {
    return (
      <div role="status" className="mt-6 rounded-2xl border border-borda bg-superficie p-6">
        <h2 className="font-display text-xl font-semibold text-titulo">Artigo recebido. Obrigado!</h2>
        <p className="mt-2 text-suave">A equipe da DSE vai revisar e entrar em contato pelo e-mail informado.</p>
      </div>
    );
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // Campo-isca: invisível para pessoas; robôs costumam preencher tudo. Finge sucesso e descarta.
    if (f.get("contato_alt")) { setEstado("enviado"); return; }

    const texto = (n: string) => String(f.get(n) ?? "");
    const envio: EnvioArtigo = {
      nome: texto("nome"), email: texto("email"), perfilMedium: texto("perfil_medium"), linkedin: texto("linkedin"), bio: texto("bio"),
      titulo: texto("titulo"), subtitulo: texto("subtitulo"), resumo: texto("resumo"), tags: texto("tags"), idioma: texto("idioma"),
      linkRascunho: texto("link_rascunho"), publicadoAntes: texto("publicado_antes"), dataDesejada: texto("data_desejada"),
      aceiteLgpd: f.get("aceite_lgpd") === "on", aceiteDireitos: f.get("aceite_direitos") === "on",
    };

    const problema = validar(envio);
    if (problema) { setErro(problema); return; }

    setErro(null);
    setEstado("enviando");
    // Sem .select(): a tabela não é legível por visitantes anônimos, só o envio é permitido.
    const { error } = await supabaseNoNavegador().from("submissoes_artigos").insert(paraLinha(envio));
    if (error) {
      console.error(error);
      setErro("Não foi possível enviar agora. Tente de novo em instantes.");
      setEstado("preenchendo");
      return;
    }
    setEstado("enviado");
  }

  const enviando = estado === "enviando";

  return (
    <form onSubmit={enviar} noValidate className="mt-6 space-y-5 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
      {/* Isca antiabuso: fora da tela e fora da navegação por teclado. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>Não preencha este campo<input name="contato_alt" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <h2 className="font-display text-lg font-semibold text-titulo">Sobre o artigo</h2>

      <div>
        <Rotulo id="titulo">Título *</Rotulo>
        <input id="titulo" name="titulo" required maxLength={150} className={campo} />
      </div>
      <div>
        <Rotulo id="subtitulo">Subtítulo</Rotulo>
        <input id="subtitulo" name="subtitulo" maxLength={200} className={campo} />
      </div>
      <div>
        <Rotulo id="resumo" dica="De 20 a 300 caracteres. Vai aparecer na chamada do artigo.">Resumo *</Rotulo>
        <textarea id="resumo" name="resumo" required rows={3} maxLength={300} className={campo} />
      </div>
      <div className="grid gap-5 sm:grid-cols-[3fr_1fr]">
        <div>
          <Rotulo id="tags" dica={`Separe por vírgula. Até ${MAX_TAGS} tags (limite do Medium). Ex.: Data Engineering, Spark`}>Tags *</Rotulo>
          <input id="tags" name="tags" required className={campo} />
        </div>
        <div>
          <Rotulo id="idioma">Idioma *</Rotulo>
          <select id="idioma" name="idioma" defaultValue="pt" className={campo}>
            {IDIOMAS_ARTIGO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Rotulo id="link_rascunho" dica="Google Docs ou rascunho do Medium, com permissão de leitura para quem tem o link.">Link do rascunho *</Rotulo>
        <input id="link_rascunho" name="link_rascunho" inputMode="url" required maxLength={500} className={campo} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Rotulo id="publicado_antes" dica="Se o texto já saiu em outro lugar, informe o link.">Já foi publicado antes?</Rotulo>
          <input id="publicado_antes" name="publicado_antes" inputMode="url" maxLength={300} className={campo} />
        </div>
        <div>
          <Rotulo id="data_desejada">Data desejada para publicar</Rotulo>
          <input id="data_desejada" name="data_desejada" type="date" className={campo} />
        </div>
      </div>

      <h2 className="border-t border-borda pt-4 font-display text-lg font-semibold text-titulo">Sobre você</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <div><Rotulo id="nome">Nome *</Rotulo><input id="nome" name="nome" required maxLength={120} autoComplete="name" className={campo} /></div>
        <div><Rotulo id="email" dica="Só a equipe da DSE vê.">E-mail *</Rotulo><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={campo} /></div>
        <div><Rotulo id="perfil_medium">Perfil no Medium</Rotulo><input id="perfil_medium" name="perfil_medium" inputMode="url" maxLength={300} placeholder="medium.com/@seu-usuario" className={campo} /></div>
        <div><Rotulo id="linkedin">LinkedIn</Rotulo><input id="linkedin" name="linkedin" inputMode="url" maxLength={300} placeholder="linkedin.com/in/seu-perfil" className={campo} /></div>
      </div>
      <div>
        <Rotulo id="bio" dica="De 20 a 500 caracteres. Usada na assinatura do artigo.">Mini bio *</Rotulo>
        <textarea id="bio" name="bio" required rows={3} maxLength={500} className={campo} />
      </div>

      <div className="space-y-2 border-t border-borda pt-4">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="aceite_direitos" className="mt-1" />
          <span>Sou autor(a) deste texto e autorizo a DSE Academy a publicá-lo no Medium da comunidade, com meu nome e minha bio. *</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="aceite_lgpd" className="mt-1" />
          <span>Concordo que a DSE Academy trate os dados deste formulário para revisar e publicar o artigo. *</span>
        </label>
      </div>

      {erro && <p role="alert" className="font-medium text-erro">{erro}</p>}

      <button type="submit" disabled={enviando} className={estiloBotao("primario")}>
        {enviando ? "Enviando…" : "Enviar artigo"}
      </button>
    </form>
  );
}
