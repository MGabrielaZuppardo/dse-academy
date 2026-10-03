import Image from "next/image";
import Link from "next/link";
import { GALERIA } from "@/lib/galeria";
import { carregarTrilhas } from "@/lib/trilhas";
import { carregarVagas } from "@/lib/vagas";
import { FundoCarrossel } from "./fundo-carrossel";
import { ConviteLogin } from "@/components/convite-login";
import { estiloBotao } from "@/lib/botoes";

// Ícones de traço (24x24), todos decorativos: o título do cartão já diz o que é.
const ICONES = {
  vagas: "M3 7h18v12H3zM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18",
  trilhas: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6",
  perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  artigo: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
  palestrante: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6",
  contato: "M4 5h16v14H4zM4 7l8 6 8-6",
} as const;

const OPCOES = [
  { href: "/vagas", icone: "vagas", titulo: "Vagas de dados", texto: "Vagas abertas no Brasil, com filtros por área, nível e modelo de trabalho.", acao: "Ver vagas" },
  { href: "/trilhas", icone: "trilhas", titulo: "Trilhas de estudo", texto: "Do básico ao avançado, com conteúdo aberto e mini projetos em cada etapa.", acao: "Começar a estudar" },
  { href: "/perfil", icone: "perfil", titulo: "Meu perfil", texto: "Informe suas habilidades, acompanhe seu progresso e veja o quanto você já combina com cada vaga.", acao: "Criar meu perfil" },
  { href: "/artigos/enviar", icone: "artigo", titulo: "Enviar um artigo", texto: "Mande seu texto para publicação no Medium da comunidade.", acao: "Enviar artigo" },
  { href: "/palestrantes/cadastro", icone: "palestrante", titulo: "Ser palestrante", texto: "Cadastre seus temas e entre no banco de palestrantes da DSE.", acao: "Me cadastrar" },
  { href: "/contato", icone: "contato", titulo: "Fale conosco", texto: "Dúvidas, parcerias e sugestões: fale com a equipe da Academy.", acao: "Entrar em contato" },
] as const;

const LIDERES = [
  { nome: "Luan Silva", foto: "/equipe/luan-silva.jpg", largura: 445, altura: 676 },
  { nome: "Gabriela Zuppardo", foto: "/equipe/gabriela-zuppardo.jpg", largura: 434, altura: 658 },
] as const;

export default function Home() {
  const { vagas, skills } = carregarVagas();
  const { trilhas } = carregarTrilhas();
  const numeros = [
    [vagas.length, "vagas abertas"],
    [trilhas.length, "trilhas de estudo"],
    [Object.keys(skills).length, "tecnologias mapeadas"],
  ].filter(([n]) => Number(n) > 0);

  return (
    <>
      <section aria-labelledby="titulo-home" className="relative isolate flex min-h-[26rem] items-center overflow-hidden rounded-3xl text-white sm:min-h-[30rem]">
        <FundoCarrossel fotos={GALERIA} />
        <div className="relative z-10 w-full px-6 pb-28 pt-10 sm:px-10 sm:pb-20 sm:pt-14">
          {/* Coluna estreita no computador: o texto fica sobre a parte escura do degradê e as pessoas aparecem na direita. */}
          <div className="md:max-w-[28rem] lg:max-w-[31rem]">
            <h1 id="titulo-home" className="font-display text-4xl font-bold leading-tight lg:text-5xl">
              Encontre vagas, saiba o que estudar e cresça na carreira em dados.
            </h1>
            <p className="mt-5 text-lg text-white/90">
              Vagas abertas no Brasil, trilhas de estudo gratuitas e uma comunidade para quem trabalha com dados: analista, engenheiro, cientista ou quem está começando.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vagas" className={estiloBotao("foto-primario")}>Ver vagas</Link>
              <Link href="/trilhas" className={estiloBotao("foto-secundario")}>Trilhas de estudo</Link>
            </div>
          </div>
        </div>
      </section>

      {numeros.length > 0 && (
        <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-borda py-6 text-center sm:text-left">
          {numeros.map(([n, rotulo]) => (
            <div key={rotulo}>
              <dd className="font-display text-3xl font-bold text-titulo sm:text-4xl">{n}</dd>
              <dt className="mt-1 text-sm text-suave">{rotulo}</dt>
            </div>
          ))}
        </dl>
      )}

      <ConviteLogin
        className="mt-8"
        titulo="Acompanhe seu progresso e seus matches"
        texto="Sem login você vê as vagas e a comunidade. Com um perfil, acompanha o avanço nas trilhas e descobre quais vagas combinam com o que você já sabe."
        acao="Criar meu perfil"
      />

      <section aria-labelledby="opcoes" className="mt-12">
        <h2 id="opcoes" className="font-display text-2xl font-semibold text-titulo">O que você encontra aqui</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OPCOES.map((o) => (
            <li key={o.href}>
              <Link
                href={o.href}
                className="group flex h-full flex-col rounded-2xl border border-borda bg-superficie p-6 transition duration-200 hover:-translate-y-0.5 hover:border-link hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-fundo text-link">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICONES[o.icone]} />
                  </svg>
                </span>
                <span className="mt-4 block font-display text-xl font-semibold text-titulo">{o.titulo}</span>
                <span className="mt-2 block text-suave">{o.texto}</span>
                <span className="mt-auto pt-5 text-sm font-semibold text-link">
                  {o.acao} <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="sobre-nos" aria-labelledby="titulo-sobre" className="mt-14 scroll-mt-6 border-t border-borda pt-10 text-center">
        <h2 id="titulo-sobre" className="font-display text-2xl font-semibold text-titulo">Sobre nós</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-tinta">
          DSE Academy: onde a criatividade se junta ao universo de dados e ajudamos vocês a embarcar nesse grande universo.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-suave">
          Um projeto da DSE, a Data Science Engineering Community, feito pela comunidade de dados para a comunidade de
          dados. Quem lidera a Academy:
        </p>
        <ul className="mt-8 flex justify-center gap-8 sm:gap-14">
          {LIDERES.map((l) => (
            <li key={l.nome} className="w-32 sm:w-40">
              <figure>
                {/* Recorte quadrado pelo topo, redondo: mostra o rosto, que fica no terço de cima das fotos. */}
                <Image
                  src={l.foto} alt={`Foto de ${l.nome}`} width={l.largura} height={l.altura} sizes="160px"
                  className="mx-auto aspect-square w-full rounded-full border-2 border-borda object-cover object-top"
                />
                <figcaption className="mt-3">
                  <span className="block font-display text-lg font-semibold leading-snug text-titulo">{l.nome}</span>
                  <span className="block text-sm text-suave">Líder da DSE Academy</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
