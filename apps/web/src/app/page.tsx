import Image from "next/image";
import Link from "next/link";
import { GALERIA } from "@/lib/galeria";
import { carregarTrilhas } from "@/lib/trilhas";
import { carregarVagas } from "@/lib/vagas";
import { FundoCarrossel } from "./fundo-carrossel";

const COMUNIDADE = [
  { href: "/perfil", titulo: "Criar meu perfil", texto: "Entre com o e-mail, sem senha, e informe sua área, nível e habilidades." },
  { href: "/artigos/enviar", titulo: "Enviar um artigo", texto: "Mande seu texto para publicação no Medium da comunidade." },
  { href: "/palestrantes/cadastro", titulo: "Ser palestrante", texto: "Cadastre seus temas e entre no banco de palestrantes." },
] as const;

const LIDERES = [
  { nome: "Luan Silva", foto: "/equipe/luan-silva.jpg", largura: 445, altura: 676 },
  { nome: "Gabriela Zuppardo", foto: "/equipe/gabriela-zuppardo.jpg", largura: 434, altura: 658 },
] as const;

const botaoPrimario = "rounded-lg bg-white px-6 py-3 font-semibold text-marinho hover:bg-white/90";
const botaoSecundario = "rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:border-white hover:bg-white/10";

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
              Vagas, trilhas de estudo e comunidade para quem trabalha com dados.
            </h1>
            <p className="mt-5 text-lg text-white/90">
              A DSE Academy reúne as vagas abertas no Brasil e mostra o que o mercado realmente pede, para você saber o que estudar a seguir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vagas" className={botaoPrimario}>Ver vagas</Link>
              <Link href="/trilhas" className={botaoSecundario}>Trilhas de estudo</Link>
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

      <section aria-labelledby="comunidade" className="mt-12">
        <h2 id="comunidade" className="font-display text-2xl font-semibold text-titulo">Faça parte da comunidade</h2>
        <ul className="mt-4 divide-y divide-borda border-y border-borda">
          {COMUNIDADE.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="group flex items-center justify-between gap-4 py-4">
                <span>
                  <span className="block font-display text-lg font-semibold text-titulo group-hover:text-link">{c.titulo}</span>
                  <span className="block text-suave">{c.texto}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-suave group-hover:text-link">→</span>
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
