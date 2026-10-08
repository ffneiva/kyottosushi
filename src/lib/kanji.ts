/**
 * Todo texto japonês do site mora aqui — com leitura e sentido.
 *
 * Três motivos para não espalhar japonês pelos componentes:
 *
 * 1. **A fonte é recortada.** O arquivo de Shippori Mincho servido pelo site
 *    tem só os glifos de `KANJI_USADOS` (alguns kB em vez de ~4 MB; ver
 *    scripts/fetch-fonts.mjs). Um caractere fora da lista cairia na fonte do
 *    sistema, com outro desenho. O teste de kanji.test.ts falha se isso
 *    acontecer.
 *
 * 2. **Cada termo foi conferido.** Japonês de tradutor automático é o erro
 *    mais comum em restaurante japonês fora do Japão. Aqui cada entrada tem
 *    leitura e sentido, e nenhuma inventa uma grafia para "Kyotto", que não é
 *    romanização válida de nada.
 *
 * 3. **`lang="ja"` é obrigatório.** Pela unificação Han, o mesmo código
 *    Unicode tem desenho japonês e chinês; sem o atributo, o navegador pode
 *    escolher o chinês. O componente <Ja> aplica o atributo sempre.
 */
export type Termo = {
  ja: string
  /** Romanização Hepburn, com mácron. */
  leitura: string
  /** O sentido em português — vai no `title` e no texto para leitor de tela. */
  sentido: string
}

export const TERMOS = {
  bemVindo: {
    ja: 'いらっしゃいませ',
    leitura: 'irasshaimase',
    sentido: 'seja bem-vindo — o cumprimento do balcão a quem chega',
  },
  cardapio: { ja: 'お品書き', leitura: 'oshinagaki', sentido: 'cardápio' },
  aberto: { ja: '営業中', leitura: 'eigyōchū', sentido: 'aberto' },
  preparando: {
    ja: '準備中',
    leitura: 'junbichū',
    sentido: 'em preparação — a plaquinha de "fechado" no Japão',
  },
  entrega: { ja: '出前', leitura: 'demae', sentido: 'entrega em casa' },
  perguntas: { ja: 'よくある質問', leitura: 'yoku aru shitsumon', sentido: 'perguntas frequentes' },
  itadakimasu: {
    ja: 'いただきます',
    leitura: 'itadakimasu',
    sentido: 'dito antes de comer, em agradecimento',
  },
  obrigado: {
    ja: 'ごちそうさまでした',
    leitura: 'gochisōsama deshita',
    sentido: 'dito depois de comer: "foi um banquete"',
  },
} as const satisfies Record<string, Termo>

/**
 * Numerais dos passos de "Como pedir" — os formais (daiji): ichi, ni, san.
 *
 * Os comuns (um, dois, três em traços horizontais) em mincho são só traços, e
 * o "um" se lê como um hífen perdido. Os formais têm desenho próprio e dizem
 * o mesmo número.
 */
export const NUMERAIS = ['壱', '弐', '参'] as const

/**
 * Os glifos que a fonte recortada contém.
 *
 * É uma string literal, e não algo derivado de `TERMOS`, porque é lida por
 * expressão regular pelo script de fontes, que roda em Node sem transpilar
 * TypeScript. O teste garante que as duas listas nunca divergem.
 */
export const KANJI_USADOS =
  'いらっしゃませお品書き営業中準備出前よくある質問ただきますごちそうさまでした壱弐参'
