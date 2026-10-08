import { SITE_URL } from './business.ts'

/**
 * As rotas do site e o `<head>` de cada uma.
 *
 * Importado dos dois lados: pelo React e pelo vite.config.ts, que gera um HTML
 * estático por rota. Por isso não toca em `window` nem importa nada de DOM.
 */
export type Rota = {
  path: string
  rotulo: string
  titulo: string
  descricao: string
  noindex?: boolean
  /** As duas linhas grandes da arte de compartilhamento. */
  og?: readonly [string, string]
  ogNota?: string
  /** Foto de fundo da arte (assets-src/cardapio). */
  ogFoto?: string
}

export const ROTAS: Rota[] = [
  {
    path: '/',
    rotulo: 'Início',
    titulo: 'Kyotto Sushi · Sushi delivery em Senador Canedo',
    descricao:
      'Sushi delivery em Senador Canedo e região, todos os dias das 18h às 23h: combos, temakis e as criações da casa — Monte Fuji, Temaki Tokio e Sushi Burguer. Peça pelo app ou pelo WhatsApp.',
    og: ['Japanese experience,', 'na sua porta.'],
    ogNota: 'Sushi delivery · Senador Canedo · 18h às 23h',
    ogFoto: 'combo-sakura',
  },
  {
    path: '/cardapio',
    rotulo: 'Cardápio',
    titulo: 'Cardápio e preços · Kyotto Sushi, Senador Canedo',
    descricao:
      'O cardápio completo do Kyotto Sushi com preços: combos para uma, duas ou três pessoas, temakis, criações da casa e porções. Monte o pedido no site e envie pelo WhatsApp, ou peça pelo app.',
    og: ['O cardápio inteiro,', 'com preço.'],
    ogNota: 'Monte o pedido e envie pelo WhatsApp',
    ogFoto: 'combo-tsunami',
  },
  {
    path: '/politica-de-privacidade',
    rotulo: 'Privacidade',
    titulo: 'Política de privacidade · Kyotto Sushi',
    descricao:
      'Como o site do Kyotto Sushi trata dados: o que fica no seu aparelho, o que é enviado ao WhatsApp e o que não é coletado.',
  },
]

/**
 * Endereço inexistente — servido como 404 de verdade.
 * `noindex` evita o *soft 404*: uma URL errada devolvendo a home com 200.
 */
export const NAO_ENCONTRADA: Rota = {
  path: '/404',
  rotulo: 'Não encontrada',
  titulo: 'Página não encontrada · Kyotto Sushi',
  descricao: 'Este endereço não existe no site do Kyotto Sushi.',
  noindex: true,
}

function limpar(pathname: string): string {
  return pathname.replace(/\/+$/, '').toLowerCase() || '/'
}

export function rotaDe(pathname: string): Rota {
  return ROTAS.find((r) => r.path === limpar(pathname)) ?? NAO_ENCONTRADA
}

export function canonicalDe(rota: Rota): string {
  return rota.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${rota.path}`
}

/**
 * Arquivo da arte de compartilhamento — a MESMA função no gerador
 * (scripts/make-brand.mjs) e no plugin que escreve o `<head>`.
 */
export function ogArquivoDe(rota: Rota): string {
  if (!rota.og || rota.path === '/') return 'og.jpg'
  return `og-${rota.path.replace(/^\//, '').replace(/\//g, '-')}.jpg`
}

export function ogUrlDe(rota: Rota): string {
  return `${SITE_URL}/${ogArquivoDe(rota)}`
}
