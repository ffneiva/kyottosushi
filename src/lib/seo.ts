import { CARDAPIO, CASA, FAQ, GRUPOS, SITE_URL } from './business.ts'
import { especificacaoDeHorario, resumoDaSemana } from './hours.ts'
import { canonicalDe, ROTAS } from './routes.ts'

/**
 * Dados estruturados (JSON-LD) e llms.txt — ambos derivados de business.ts.
 *
 * A casa é um `Restaurant` de delivery: `areaServed` diz onde entrega, e o
 * endereço traz só cidade e estado enquanto a rua não for confirmada (ver
 * `CASA.endereco`). Um endereço errado no dado estruturado é pior que um
 * endereço ausente: o Google o mostra no mapa.
 *
 * Nenhum `aggregateRating`: a casa ainda não tem avaliações públicas, e nota
 * autodeclarada o Google não mostra e pode punir.
 */
const ID_CASA = `${SITE_URL}/#restaurante`
const ID_MENU = `${SITE_URL}/cardapio#menu`

function noDaCasa() {
  return {
    '@type': 'Restaurant',
    '@id': ID_CASA,
    name: CASA.nome,
    slogan: CASA.lema.join(' · '),
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/og.jpg`,
    telephone: `+${CASA.whatsapp}`,
    servesCuisine: ['Japonesa', 'Sushi'],
    priceRange: 'R$ 30–100',
    acceptsReservations: false,
    paymentAccepted: CASA.pagamento.join(', '),
    address: {
      '@type': 'PostalAddress',
      addressLocality: CASA.cidade,
      addressRegion: CASA.uf,
      addressCountry: 'BR',
      ...(CASA.endereco ? { streetAddress: CASA.endereco } : {}),
    },
    areaServed: { '@type': 'City', name: `${CASA.cidade} - ${CASA.uf}` },
    openingHoursSpecification: especificacaoDeHorario(CASA.semana),
    hasMenu: `${SITE_URL}/cardapio`,
    potentialAction: { '@type': 'OrderAction', target: CASA.delivery },
    sameAs: [`https://www.instagram.com/${CASA.instagram}/`],
  }
}

function noDoMenu() {
  const grupos = Object.entries(GRUPOS) as Array<[keyof typeof GRUPOS, { nome: string }]>
  return {
    '@type': 'Menu',
    '@id': ID_MENU,
    name: `Cardápio ${CASA.nome}`,
    inLanguage: 'pt-BR',
    hasMenuSection: grupos.map(([grupo, { nome }]) => ({
      '@type': 'MenuSection',
      name: nome,
      hasMenuItem: CARDAPIO.filter((i) => i.grupo === grupo).map((i) => ({
        '@type': 'MenuItem',
        name: i.nome,
        ...(i.descricao ? { description: i.descricao } : {}),
        image: `${SITE_URL}/images/cardapio/${i.foto}-720.webp`,
        offers: { '@type': 'Offer', price: i.preco.toFixed(2), priceCurrency: 'BRL' },
      })),
    })),
  }
}

function noDoFaq() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQ.map((p) => ({
      '@type': 'Question',
      name: p.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: p.resposta },
    })),
  }
}

function trilha(path: string) {
  const rota = ROTAS.find((r) => r.path === path)
  if (!rota || path === '/') return null
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: rota.rotulo, item: canonicalDe(rota) },
    ],
  }
}

/**
 * O grafo de uma rota. Cada página só declara o que mostra: FAQ na home,
 * Menu no cardápio (que é onde ele aparece inteiro).
 */
export function gerarJsonLd(path = '/') {
  const grafo: Record<string, unknown>[] = [noDaCasa()]
  if (path === '/') grafo.push(noDoFaq())
  if (path === '/cardapio') grafo.push(noDoMenu())
  const b = trilha(path)
  if (b) grafo.push(b)
  return { '@context': 'https://schema.org', '@graph': grafo }
}

/** llms.txt — o site resumido para assistentes de IA, com os dados da página. */
export function gerarLlmsTxt(): string {
  const l: string[] = [
    `# ${CASA.nome}`,
    '',
    `> Sushi delivery em ${CASA.regiao} (${CASA.uf}). ${CASA.assinatura} — ${CASA.lema.join(', ')}.`,
    '',
    'Não confundir com o "Kyoto" (um "t") de Goiânia: são empresas diferentes.',
    '',
    '## Funcionamento',
    '',
    ...resumoDaSemana(CASA.semana).map((x) => `- ${x.dias}: ${x.horario}`),
    `- Pedido mínimo: R$ ${CASA.pedidoMinimo},00`,
    `- Pagamento: ${CASA.pagamento.join(', ')}`,
    `- Pedidos: ${CASA.delivery}`,
    `- WhatsApp: ${CASA.telefone}`,
    `- Instagram: @${CASA.instagram}`,
    '',
    '## Cardápio',
    '',
  ]
  for (const [grupo, { nome }] of Object.entries(GRUPOS)) {
    l.push(`### ${nome}`, '')
    for (const i of CARDAPIO.filter((x) => x.grupo === grupo)) {
      const preco = i.preco.toFixed(2).replace('.', ',')
      l.push(`- ${i.nome} — R$ ${preco}${i.descricao ? ` (${i.descricao})` : ''}`)
    }
    l.push('')
  }
  l.push('## Perguntas frequentes', '')
  for (const p of FAQ) l.push(`**${p.pergunta}**`, p.resposta, '')
  return `${l.join('\n').trim()}\n`
}
