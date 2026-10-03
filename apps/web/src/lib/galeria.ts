/** Fotos de eventos da comunidade, exibidas como fundo da home (carrossel). `posicao` é o enquadramento do recorte
 *  (CSS object-position); o padrão "center 35%" mantém os rostos, que costumam ficar no terço de cima.
 *  Os arquivos ficam em public/galeria/ (JPEG, até 1200 px de largura). O texto alternativo descreve a cena, sem
 *  identificar pessoas. */

export type FotoDaGaleria = { arquivo: string; largura: number; altura: number; alt: string; posicao?: string };

export const GALERIA: FotoDaGaleria[] = [
  { arquivo: "/galeria/comunidade-data-talks.jpg", largura: 965, altura: 534, alt: "Foto de grupo com dezenas de participantes sorrindo atrás das letras gigantes DATA TALKS, em uma sala de evento." },
  { arquivo: "/galeria/palco-data-talks.jpg", largura: 1013, altura: 663, alt: "Nove pessoas lado a lado no palco do Data Talks, sorrindo e fazendo gestos para a câmera." },
  { arquivo: "/galeria/equipe-no-painel.jpg", largura: 980, altura: 644, alt: "Quatro pessoas posam sorrindo diante do painel do evento, com camisetas e moletons da DSE Academy e da DSE Girls." },
  { arquivo: "/galeria/painel-de-conversa.jpg", largura: 1003, altura: 673, alt: "Quatro pessoas sentadas a uma mesa durante um painel, uma delas usando um notebook." },
  { arquivo: "/galeria/camiseta-dse-community.jpg", largura: 445, altura: 676, alt: "Pessoa de costas, com camiseta preta da DSE Community, assistindo a um evento diante da plateia.", posicao: "center 58%" },
  { arquivo: "/galeria/palco-com-brindes.jpg", largura: 828, altura: 581, alt: "Oito pessoas no palco ao fim de um evento, algumas segurando brindes, diante de uma tela branca." },
  { arquivo: "/galeria/mesa-com-microfones.jpg", largura: 852, altura: 598, alt: "Quatro pessoas animadas ao redor de uma mesa, com microfones e sacolas de brindes de apoiadores do evento." },
];
