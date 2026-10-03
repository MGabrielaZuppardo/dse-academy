"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { configurado, supabaseNoNavegador } from "@/lib/supabase/client";
import { FORMATOS, IDIOMAS, MAX_TEMAS, MODALIDADES, paraLinha, validar, type CadastroPalestrante } from "@/lib/palestrantes";

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

function Rotulo({ id, children, dica }: { id: string; children: ReactNode; dica?: string }) {
  return (
    <label htmlFor={id} className="block font-medium text-titulo">
      {children}
      {dica && <span className="block text-sm font-normal text-suave">{dica}</span>}
    </label>
  );
}

export function FormularioPalestrante() {
  const [estado, setEstado] = useState<"preenchendo" | "enviando" | "enviado">("preenchendo");
  const [erro, setErro] = useState<string | null>(null);

  if (!configurado()) {
    return <p role="alert" className="mt-6 rounded-lg border border-erro p-4 text-erro">O envio ainda não está configurado neste ambiente.</p>;
  }

  if (estado === "enviado") {
    return (
      <div role="status" className="mt-6 rounded-2xl border border-borda bg-superficie p-6">
        <h2 className="font-display text-xl font-semibold text-titulo">Cadastro recebido. Obrigado!</h2>
        <p className="mt-2 text-suave">A equipe da DSE vai analisar e, se aprovado, entraremos em contato pelo e-mail informado.</p>
      </div>
    );
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // Campo-isca: invisível para pessoas; robôs costumam preencher tudo. Finge sucesso e descarta.
    if (f.get("contato_alt")) { setEstado("enviado"); return; }

    const texto = (n: string) => String(f.get(n) ?? "");
    const cadastro: CadastroPalestrante = {
      nome: texto("nome"), email: texto("email"), cargo: texto("cargo"), empresa: texto("empresa"), bio: texto("bio"),
      linkedin: texto("linkedin"), site: texto("site"), temas: texto("temas"),
      formatos: f.getAll("formatos").map(String), modalidade: texto("modalidade"),
      cidade: texto("cidade"), uf: texto("uf"), idiomas: f.getAll("idiomas").map(String),
      linksAnteriores: texto("links_anteriores"), aceiteLgpd: f.get("aceite_lgpd") === "on", aceitePublicacao: f.get("aceite_publicacao") === "on",
    };

    const problema = validar(cadastro);
    if (problema) { setErro(problema); return; }

    setErro(null);
    setEstado("enviando");
    // Sem .select(): a tabela não é legível por visitantes anônimos, só o envio é permitido.
    const { error } = await supabaseNoNavegador().from("palestrantes").insert(paraLinha(cadastro));
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div><Rotulo id="nome">Nome *</Rotulo><input id="nome" name="nome" required maxLength={120} autoComplete="name" className={campo} /></div>
        <div><Rotulo id="email" dica="Não é exibido publicamente.">E-mail *</Rotulo><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={campo} /></div>
        <div><Rotulo id="cargo">Cargo</Rotulo><input id="cargo" name="cargo" maxLength={120} className={campo} /></div>
        <div><Rotulo id="empresa">Empresa</Rotulo><input id="empresa" name="empresa" maxLength={120} className={campo} /></div>
      </div>

      <div>
        <Rotulo id="bio" dica="De 20 a 800 caracteres. Pode aparecer na página pública, se você autorizar.">Mini bio *</Rotulo>
        <textarea id="bio" name="bio" required rows={4} minLength={20} maxLength={800} className={campo} />
      </div>

      <div>
        <Rotulo id="temas" dica={`Separe por vírgula. Até ${MAX_TEMAS} temas. Ex.: Spark, dbt, qualidade de dados`}>Temas que você apresenta *</Rotulo>
        <input id="temas" name="temas" required className={campo} />
      </div>

      <fieldset>
        <legend className="font-medium text-titulo">Formato *</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {FORMATOS.map(([v, r]) => <label key={v} className="flex items-center gap-2"><input type="checkbox" name="formatos" value={v} /> {r}</label>)}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-[2fr_2fr_1fr]">
        <fieldset>
          <legend className="font-medium text-titulo">Modalidade *</legend>
          <div className="mt-1 space-y-1">
            {MODALIDADES.map(([v, r]) => <label key={v} className="flex items-center gap-2"><input type="radio" name="modalidade" value={v} /> {r}</label>)}
          </div>
        </fieldset>
        <div><Rotulo id="cidade">Cidade</Rotulo><input id="cidade" name="cidade" maxLength={80} autoComplete="address-level2" className={campo} /></div>
        <div><Rotulo id="uf">UF</Rotulo><input id="uf" name="uf" maxLength={2} autoComplete="address-level1" className={`${campo} uppercase`} /></div>
      </div>

      <fieldset>
        <legend className="font-medium text-titulo">Idiomas *</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {IDIOMAS.map(([v, r]) => <label key={v} className="flex items-center gap-2"><input type="checkbox" name="idiomas" value={v} defaultChecked={v === "pt"} /> {r}</label>)}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div><Rotulo id="linkedin">LinkedIn</Rotulo><input id="linkedin" name="linkedin" inputMode="url" maxLength={300} placeholder="linkedin.com/in/seu-perfil" className={campo} /></div>
        <div><Rotulo id="site">Site ou portfólio</Rotulo><input id="site" name="site" inputMode="url" maxLength={300} className={campo} /></div>
      </div>

      <div>
        <Rotulo id="links_anteriores" dica="Gravações ou slides, um por linha ou separados por vírgula. Até 5.">Palestras anteriores</Rotulo>
        <textarea id="links_anteriores" name="links_anteriores" rows={2} className={campo} />
      </div>

      <div className="space-y-2 border-t border-borda pt-4">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="aceite_lgpd" className="mt-1" />
          <span>Concordo que a DSE Academy trate os dados deste formulário para avaliar e organizar meu convite como palestrante. *</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="aceite_publicacao" className="mt-1" />
          <span>Autorizo exibir meu nome, bio, temas e links na página pública de palestrantes (o e-mail nunca é exibido).</span>
        </label>
      </div>

      {erro && <p role="alert" className="font-medium text-erro">{erro}</p>}

      <button type="submit" disabled={enviando} className="rounded-lg bg-azul px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {enviando ? "Enviando…" : "Enviar cadastro"}
      </button>
    </form>
  );
}
