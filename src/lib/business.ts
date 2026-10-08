import type { Semana } from './hours.ts'

/**
 * TODO o conteúdo do site. Texto, preço, horário, cardápio, FAQ.
 *
 * É daqui que saem, ao mesmo tempo, a página, o JSON-LD que o Google indexa,
 * o llms.txt e as mensagens de WhatsApp. Mudar um preço é editar uma linha
 * deste arquivo e dar push — e `npm run cardapio:conferir` avisa quando o
 * preço do site diverge do app de pedidos.
 *
 * REGRA: nada aqui é inventado. Cada dado tem a fonte ao lado. O que precisa
 * de confirmação da casa está marcado `CONFIRMAR` e listado no DEPLOY.md.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Endereço do site
// ─────────────────────────────────────────────────────────────────────────────

/** Endereço público do site. Trocar aqui quando a marca tiver domínio próprio. */
export const SITE_URL = 'https://kyottosushi.abramdigital.com.br'

/**
 * Se o Google pode indexar.
 *
 * Desligado enquanto o site é apresentação num subdomínio que não é da marca:
 * indexado, ele competiria na busca com o domínio definitivo. Ao migrar, `true`.
 */
export const INDEXAVEL = false

// ─────────────────────────────────────────────────────────────────────────────
// A casa
// ─────────────────────────────────────────────────────────────────────────────

export const CASA = {
  nome: 'Kyotto Sushi',
  // Fonte: o logo da casa.
  assinatura: 'Japanese Experience',
  lema: ['Frescor', 'Sabor', 'Tradição'] as const,
  cidade: 'Senador Canedo',
  uf: 'GO',
  // Fonte: bio do Instagram — "O melhor de Senador Canedo e região!".
  regiao: 'Senador Canedo e região',
  /**
   * Fonte: o cliente, (62) 9319-8480. CONFIRMAR o nono dígito: celulares de
   * Goiás têm 9 dígitos, e o número foi passado com 8. O wa.me aceita o
   * formato com o 9, que é o que está aqui.
   */
  whatsapp: '5562993198480',
  telefone: '(62) 99319-8480',
  instagram: 'kyotto_26',
  /** O app de pedidos da casa (Mata Foomi). */
  delivery: 'https://matafoomi.com.br/kyottosushi',
  /**
   * Fonte: app de pedidos (set. 2026) — todos os dias, 18h às 23h.
   * Índice 0 = domingo.
   */
  semana: Array.from({ length: 7 }, () => [['18:00', '23:00']] as const) as Semana,
  // Fonte: app de pedidos (set. 2026).
  pedidoMinimo: 40,
  pagamento: ['Dinheiro', 'Cartão', 'Pagamento online no app'],
  /**
   * O app registra "Rua Dom Emanuel, Centro", mas o CEP 75250-386 é da Av.
   * Dom Emanuel, no Conjunto Morada do Morro. CONFIRMAR antes de publicar um
   * endereço: até lá o site diz só a cidade — é delivery, e a pessoa não
   * precisa do endereço para pedir.
   */
  endereco: null as null | string,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Cardápio
// ─────────────────────────────────────────────────────────────────────────────

export type Grupo = 'criacoes' | 'combos' | 'porcoes'

export type Item = {
  id: string
  nome: string
  /** Composição, como a casa escreve no app (em caixa de frase). */
  descricao?: string
  preco: number
  /** "Serve até N pessoas", do app. */
  serve?: number
  grupo: Grupo
  /** Nome do arquivo em assets-src/cardapio (sem extensão). */
  foto: string
  /** Uma frase nossa, só nos pratos em destaque. */
  chamada?: string
}

export const GRUPOS: Record<Grupo, { nome: string; texto: string }> = {
  criacoes: {
    nome: 'Criações da casa',
    texto:
      'Os pratos que só existem aqui — temaki em cone de harumaki, sanduíche de arroz crocante, sushi no copo.',
  },
  combos: {
    nome: 'Combos',
    texto: 'Compare a composição, o preço e quantas pessoas cada um serve.',
  },
  porcoes: {
    nome: 'Porções',
    texto: 'Para acompanhar.',
  },
}

/**
 * Os 17 itens do app de pedidos (matafoomi.com.br/kyottosushi, set. 2026).
 * Preços, "serve" e composição são os do app. A ordem é a do site: primeiro
 * o que a casa tem de próprio.
 */
export const CARDAPIO: Item[] = [
  {
    id: 'monte-fuji',
    nome: 'Monte Fuji',
    descricao: 'Sanduíche de arroz crocante com tilápia empanada',
    preco: 44.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'monte-fuji',
    chamada: 'O sanduíche em que o pão é arroz crocante.',
  },
  {
    id: 'temaki-tokio',
    nome: 'Temaki Tokio',
    descricao: 'Cone de massa harumaki, arroz e patê de salmão',
    preco: 44.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'temaki-tokio',
    chamada: 'O cone é de harumaki, e não de alga.',
  },
  {
    id: 'sushi-burguer',
    nome: 'Sushi Burguer',
    descricao: 'Sanduíche de arroz crocante e patê de salmão com cream cheese',
    preco: 39.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'sushi-burguer',
    chamada: 'Hambúrguer, só que de sushi.',
  },
  {
    id: 'copo-da-felicidade-katana',
    nome: 'Copo da Felicidade Katana',
    descricao: 'Arroz japonês, manga, cream cheese e morango',
    preco: 34.99,
    serve: 1,
    grupo: 'criacoes',
    foto: 'copo-da-felicidade-katana',
    chamada: 'Sushi em camadas, no copo, com morango.',
  },
  {
    id: 'kyotto-blue',
    nome: 'Kyotto Blue',
    descricao: '6 rolinhos de couve com salmão e cream cheese e 6 rolinhos de massa harumaki',
    preco: 54.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'kyotto-blue',
    chamada: 'Couve e harumaki no mesmo prato.',
  },
  {
    id: 'haru',
    nome: 'Haru',
    descricao: 'Salmão maçaricado, camarão e gohan',
    preco: 54.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'haru',
    chamada: 'Salmão maçaricado e camarão.',
  },
  {
    id: 'hot-temaki',
    nome: 'Hot Temaki com Patê de Salmão',
    descricao: 'Temaki de patê de salmão com cream cheese',
    preco: 39.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'hot-temaki-com-pate-de-salmao',
    chamada: 'O temaki na versão hot.',
  },
  {
    id: 'kyotto-experience',
    nome: 'Kyotto Experience',
    descricao: '6 hot harumaki, 2 harumakis e 2 guiozas',
    preco: 29.9,
    serve: 1,
    grupo: 'criacoes',
    foto: 'kyotto-experience',
  },
  {
    // CONFIRMAR a descrição: no app ela repete a do Copo Katana, mas a foto
    // é outra peça. Sem composição até a casa confirmar.
    id: 'gorrama',
    nome: 'Gorrama',
    preco: 44.99,
    serve: 2,
    grupo: 'criacoes',
    foto: 'gorrama',
  },
  {
    id: 'combo-happy-sushi',
    nome: 'Combo Happy Sushi',
    descricao: '6 hots e 14 sushis',
    preco: 35,
    serve: 1,
    grupo: 'combos',
    foto: 'combo-happy-sushi',
  },
  {
    // CONFIRMAR a composição: no app a descrição é só "Combo Temu".
    id: 'combo-temu',
    nome: 'Combo Temu',
    preco: 44.91,
    serve: 2,
    grupo: 'combos',
    foto: 'combo-temu',
  },
  {
    id: 'combo-shogun',
    nome: 'Combo Shogun',
    descricao: '10 hots de massa harumaki, 16 sushis e 2 guiozas',
    preco: 56.9,
    serve: 1,
    grupo: 'combos',
    foto: 'combo-shogun',
  },
  {
    id: 'combo-sakura',
    nome: 'Combo Sakura',
    descricao: '5 hots, 4 niguiris de salmão, 4 gunkans de salmão, 4 gunkans de tilápia e 6 sushis',
    preco: 67.91,
    serve: 2,
    grupo: 'combos',
    foto: 'combo-sakura',
  },
  {
    id: 'combo-yokohama',
    nome: 'Combo Yokohama',
    descricao: '10 hots, 12 hots de massa harumaki, 4 de tilápia e 4 acarajés japoneses',
    preco: 79.9,
    grupo: 'combos',
    foto: 'combo-yokohama',
  },
  {
    id: 'combo-tsunami',
    nome: 'Combo Tsunami',
    descricao:
      '16 sushis, 3 gunkans de maracujá, 3 gunkans de pimenta biquinho, 4 harumakis de queijo e 6 guiozas',
    preco: 89.91,
    serve: 3,
    grupo: 'combos',
    foto: 'combo-tsunami',
  },
  {
    id: 'combo-umi',
    nome: 'Combo Umi',
    descricao: '2 temakis e 16 sushis',
    preco: 99.9,
    serve: 2,
    grupo: 'combos',
    foto: 'combo-umi',
  },
  {
    // O app registra "quantidade mínima: 100" neste item — erro de cadastro,
    // ignorado aqui. CONFIRMAR quantas unidades vêm na porção.
    id: 'porcao-de-guioza',
    nome: 'Porção de Guioza',
    preco: 30,
    grupo: 'porcoes',
    foto: 'porcao-de-guioza',
  },
]

export const itemPorId = (id: string) => CARDAPIO.find((i) => i.id === id)
export const CRIACOES = CARDAPIO.filter((i) => i.grupo === 'criacoes' && i.chamada)
export const COMBOS = CARDAPIO.filter((i) => i.grupo === 'combos')

/** Nomes que correm na faixa (marquee). */
export const FAIXA = [
  'Monte Fuji',
  'Temaki Tokio',
  'Sushi Burguer',
  'Hot roll',
  'Niguiri',
  'Gunkan',
  'Guioza',
  'Harumaki',
  'Copo da Felicidade',
  'Acarajé japonês',
  'Kyotto Blue',
  'Haru',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Texto das seções
// ─────────────────────────────────────────────────────────────────────────────

export const TEXTO = {
  heroi: {
    sobretitulo: 'Sushi delivery · Senador Canedo',
    titulo: ['Japanese', 'experience,', 'na sua porta.'],
    apoio:
      'Combos, temakis e as criações da casa — Monte Fuji, Temaki Tokio, Sushi Burguer — todas as noites, das 18h às 23h, em Senador Canedo e região.',
  },
  /** O lema do próprio logo, dito por extenso. */
  manifesto:
    'Frescor, sabor e tradição. Está escrito no selo, embaixo do gato da sorte. E a cozinha ainda inventa: temaki em cone de harumaki, sanduíche de arroz crocante, sushi em camadas no copo.',
  comoPedir: [
    {
      titulo: 'Escolha',
      texto: 'Monte o pedido aqui no site, com a soma na hora — ou abra o app da casa.',
    },
    {
      titulo: 'Peça',
      texto:
        'Pelo app, que já calcula a entrega pelo seu endereço, ou pelo WhatsApp, com a lista pronta.',
    },
    {
      titulo: 'Receba',
      texto: 'A casa prepara o pedido e entrega em Senador Canedo e região.',
    },
  ],
  fecho: {
    titulo: 'Hoje tem sushi.',
    texto: 'Das 18h às 23h, todos os dias.',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Perguntas
// ─────────────────────────────────────────────────────────────────────────────

export const FAQ = [
  {
    pergunta: 'Qual o horário?',
    resposta: 'Todos os dias, das 18h às 23h.',
  },
  {
    pergunta: 'Onde vocês entregam?',
    resposta:
      'Em Senador Canedo e região. A taxa depende do endereço: o app de pedidos calcula na hora, antes de você fechar o pedido.',
  },
  {
    pergunta: 'Tem pedido mínimo?',
    resposta: 'Sim, R$ 40,00 em produtos.',
  },
  {
    pergunta: 'Como eu pago?',
    resposta: 'Dinheiro, cartão ou pagamento online pelo app.',
  },
  {
    pergunta: 'Posso pedir pelo WhatsApp?',
    resposta:
      'Pode. Monte o pedido no cardápio do site e toque em "Enviar pelo WhatsApp": a lista chega pronta, com a soma, e a casa confirma a taxa de entrega para o seu endereço.',
  },
  {
    pergunta: 'Vocês são o Kyoto de Goiânia?',
    resposta:
      'Não. O Kyotto Sushi — com dois "t" — é de Senador Canedo, e o Instagram é o @kyotto_26.',
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Páginas de apoio
// ─────────────────────────────────────────────────────────────────────────────

export const NAO_ENCONTRADA_TEXTO = {
  rotulo: 'Página não encontrada',
  titulo: 'Esse prato não está no cardápio.',
  apoio: 'O endereço pode ter mudado ou ter sido digitado com um erro.',
} as const

/**
 * A política de privacidade — cada bloco corresponde a uma coisa que o código
 * faz de fato (ver lib/analytics, lib/observability, pages/Cardapio).
 */
export const PRIVACIDADE = [
  {
    titulo: 'O que este site guarda',
    texto:
      'Nada no servidor. O site é um conjunto de arquivos estáticos: não tem cadastro, login, banco de dados nem formulário que envie dados para nós. No seu aparelho fica só a sacola montada no cardápio, até você esvaziá-la ou limpar os dados do navegador, e a marca de que você já viu a abertura, que some ao fechar a aba. Nome e endereço digitados na sacola não são guardados.',
  },
  {
    titulo: 'Pedido pelo WhatsApp',
    texto:
      'A sacola monta uma mensagem no seu navegador e abre o WhatsApp com ela pronta. Nada é enviado antes de você tocar em "enviar" no próprio WhatsApp; a partir daí, a conversa é com a casa, pelas regras do WhatsApp.',
  },
  {
    titulo: 'Medição',
    texto:
      'Quando a medição de audiência estiver ligada, o site usa o Google Analytics 4, que não armazena endereços IP, para saber quantas pessoas visitam cada página e tocam em "pedir", e para medir a velocidade de carregamento no seu aparelho. Não há anúncio personalizado nem venda de dados.',
  },
  {
    titulo: 'Erros técnicos',
    texto:
      'Quando ligado, o Sentry registra erros de funcionamento do site (qual página, qual navegador, qual linha do código falhou) para que sejam corrigidos. Não grava a tela nem o que você digita.',
  },
  {
    titulo: 'App de pedidos',
    texto:
      'Os botões "Pedir agora" levam ao app de pedidos da casa (Mata Foomi). Lá vale a política de privacidade da plataforma.',
  },
  {
    titulo: 'Seus direitos',
    texto: `Pela LGPD, você pode pedir informação sobre dados seus que estejam com o ${CASA.nome}. Como o site não armazena dados pessoais, o pedido vai para a casa, pelo WhatsApp ${CASA.telefone}.`,
  },
] as const
