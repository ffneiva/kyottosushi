/**
 * Google Analytics / Ads — carregado só se houver ID configurado.
 *
 * O ID entra por variável de ambiente (`VITE_GTAG_ID`), não pelo código: o
 * repositório é público, e um ID de medição no fonte é o tipo de coisa que
 * alguém cola no próprio site sem querer, poluindo o relatório.
 *
 * O bootstrap mora no bundle, e não num `<script>` inline: assim a CSP não
 * precisa de `'unsafe-inline'` em `script-src`.
 */
const GTAG_ID = import.meta.env.VITE_GTAG_ID as string | undefined

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let carregado = false

export function iniciarAnalytics(): void {
  if (!GTAG_ID || carregado || typeof document === 'undefined') return
  carregado = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  const gtag: Gtag = (...args) => {
    window.dataLayer?.push(args)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GTAG_ID, { anonymize_ip: true })
}

/**
 * Eventos que indicam intenção real — a lista é curta de propósito. Medir
 * tudo produz um relatório onde nada se destaca.
 */
type Evento = 'whatsapp_clique' | 'pedido_montado' | 'delivery_clique' | 'rota_mudou'

export function registrar(evento: Evento, dados?: Record<string, unknown>): void {
  window.gtag?.('event', evento, dados)
}

/** O clique no WhatsApp é a conversão do site: é onde o pedido é fechado. */
export function registrarConversaoWhatsApp(origem: string): void {
  registrar('whatsapp_clique', { origem })
}
