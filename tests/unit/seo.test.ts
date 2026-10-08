import { describe, expect, it } from 'vitest'
import { CARDAPIO, CASA, FAQ, SITE_URL } from '@/lib/business'
import { canonicalDe, NAO_ENCONTRADA, ogArquivoDe, ogUrlDe, ROTAS, rotaDe } from '@/lib/routes'
import { gerarJsonLd, gerarLlmsTxt } from '@/lib/seo'
import { cn, prefersReducedMotion } from '@/lib/utils'

type No = Record<string, unknown> & { '@type': string }
const grafo = (path: string) => gerarJsonLd(path)['@graph'] as No[]
const doTipo = (path: string, tipo: string) => grafo(path).filter((n) => n['@type'] === tipo)

describe('rotas', () => {
  it('encontra a rota ignorando barra final e caixa; o resto é 404', () => {
    expect(rotaDe('/Cardapio/').path).toBe('/cardapio')
    expect(rotaDe('/').path).toBe('/')
    expect(rotaDe('/nao-existe')).toBe(NAO_ENCONTRADA)
  })

  it('títulos e descrições únicos, e dentro do que o Google mostra', () => {
    expect(new Set(ROTAS.map((r) => r.titulo)).size).toBe(ROTAS.length)
    for (const r of ROTAS) {
      expect(r.titulo.length, r.path).toBeLessThanOrEqual(70)
      expect(r.descricao.length, r.path).toBeGreaterThan(80)
      expect(r.descricao.length, r.path).toBeLessThanOrEqual(200)
      expect(r.titulo, r.path).toContain('Kyotto')
    }
  })

  it('canonical absoluta e arte de compartilhamento por rota', () => {
    expect(canonicalDe(ROTAS[0])).toBe(`${SITE_URL}/`)
    expect(ogArquivoDe(ROTAS[0])).toBe('og.jpg')
    expect(ogArquivoDe(rotaDe('/cardapio'))).toBe('og-cardapio.jpg')
    expect(ogArquivoDe(rotaDe('/politica-de-privacidade'))).toBe('og.jpg')
    expect(ogUrlDe(rotaDe('/cardapio'))).toBe(`${SITE_URL}/og-cardapio.jpg`)
  })
})

describe('JSON-LD', () => {
  it('um Restaurant de delivery, com cidade, telefone e horário — sem rua inventada', () => {
    const [r] = doTipo('/', 'Restaurant')
    expect(r.telephone).toBe(`+${CASA.whatsapp}`)
    expect(r.address).toMatchObject({ addressLocality: 'Senador Canedo', addressRegion: 'GO' })
    if (!CASA.endereco) expect(r.address).not.toHaveProperty('streetAddress')
    expect(r.acceptsReservations).toBe(false)
    expect((r.openingHoursSpecification as unknown[]).length).toBe(7)
  })

  it('nenhuma nota autodeclarada', () => {
    for (const r of ROTAS)
      expect(JSON.stringify(gerarJsonLd(r.path))).not.toContain('aggregateRating')
  })

  it('FAQPage só na home; Menu só no cardápio, com todos os itens e preço positivo', () => {
    expect(doTipo('/', 'FAQPage')).toHaveLength(1)
    expect(doTipo('/cardapio', 'FAQPage')).toHaveLength(0)
    expect(doTipo('/', 'Menu')).toHaveLength(0)
    const [menu] = doTipo('/cardapio', 'Menu')
    const secoes = menu.hasMenuSection as { hasMenuItem: { offers: { price: string } }[] }[]
    const precos = secoes.flatMap((s) => s.hasMenuItem.map((i) => Number(i.offers.price)))
    expect(precos).toHaveLength(CARDAPIO.length)
    expect(precos.every((p) => p > 0)).toBe(true)
    const [faq] = doTipo('/', 'FAQPage')
    expect(faq.mainEntity).toHaveLength(FAQ.length)
  })

  it('trilha de navegação só nas páginas internas', () => {
    expect(doTipo('/', 'BreadcrumbList')).toHaveLength(0)
    const [t] = doTipo('/cardapio', 'BreadcrumbList')
    expect((t.itemListElement as { name: string }[]).map((i) => i.name)).toEqual([
      'Início',
      'Cardápio',
    ])
  })
})

describe('llms.txt', () => {
  const texto = gerarLlmsTxt()
  it('traz horário, mínimo, pedidos e cada item com preço', () => {
    expect(texto).toContain('Seg a dom: 18h–23h')
    expect(texto).toContain('Pedido mínimo: R$ 40,00')
    expect(texto).toContain(CASA.delivery)
    for (const i of CARDAPIO) expect(texto).toContain(i.nome)
    expect(texto).toContain('Monte Fuji — R$ 44,90')
  })
  it('avisa que não é o Kyoto de Goiânia, e não tem valor indefinido', () => {
    expect(texto).toMatch(/Não confundir com o "Kyoto"/)
    expect(texto).not.toMatch(/undefined|NaN|\[object/)
  })
})

describe('utilidades', () => {
  it('cn e movimento reduzido fora do navegador', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
    expect(prefersReducedMotion()).toBe(false)
  })
})
