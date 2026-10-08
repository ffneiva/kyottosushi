import { useEffect } from 'react'
import { registrar } from '@/lib/analytics'
import { INDEXAVEL } from '@/lib/business'
import { canonicalDe, type Rota } from '@/lib/routes'

/**
 * Mantém o `<head>` coerente na navegação pelo cliente.
 *
 * O HTML de cada rota já chega certo do servidor (ver vite.config.ts). Isto
 * cobre o outro caso: quem clica de uma página para outra sem recarregar.
 * Sem isto, a aba e o histórico ficariam com o título da página anterior.
 */
export function useRouteMeta(rota: Rota) {
  useEffect(() => {
    document.title = rota.titulo
    const set = (seletor: string, atributo: string, valor: string) =>
      document.head.querySelector(seletor)?.setAttribute(atributo, valor)

    set('meta[name="description"]', 'content', rota.descricao)
    set('link[rel="canonical"]', 'href', canonicalDe(rota))
    set('meta[property="og:title"]', 'content', rota.titulo)
    set('meta[property="og:description"]', 'content', rota.descricao)
    set('meta[property="og:url"]', 'content', canonicalDe(rota))
    set(
      'meta[name="robots"]',
      'content',
      !INDEXAVEL || rota.noindex
        ? 'noindex, follow'
        : 'index, follow, max-snippet:-1, max-image-preview:large',
    )
    registrar('rota_mudou', { rota: rota.path })
  }, [rota])
}
