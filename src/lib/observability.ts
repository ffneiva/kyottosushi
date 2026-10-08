/**
 * Observabilidade num site que não tem servidor.
 *
 * A pilha completa de APM não tem o que medir aqui: existe um bundle estático
 * na borda (S3 + Cloudflare) e nada mais. Não há segundo salto para correlacionar, host para
 * instrumentar nem latência de back-end para atribuir — traço distribuído sem
 * serviço distribuído é cerimônia sem sinal. E APM cobrado por host ou por
 * sessão custaria mais do que toda a infraestrutura junta, num site cuja
 * restrição dura é custo operacional zero.
 *
 * Sobram dois problemas reais, e cada um tem uma ferramenta certa:
 *
 * · **Erro que ninguém reporta.** Um `TypeError` que só acontece num navegador
 *   específico, numa tela específica. A pessoa fecha a aba, a casa perde o
 *   pedido e ninguém fica sabendo. É o caso do Sentry.
 *
 * · **Desempenho no aparelho real.** LCP, CLS e INP medidos em campo, e não num
 *   laboratório com fibra. Num site de delivery aberto no celular, na rede
 *   que a pessoa tiver, é essa a métrica que decide se a página chega a tempo.
 *   É o caso do Web Vitals.
 *
 * Os dois são opcionais e desligados por padrão: sem as variáveis de ambiente,
 * nem uma linha de código de terceiro é baixada.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const AMBIENTE = (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? 'production'

/**
 * Carrega o Sentry sob demanda, e só se houver DSN.
 *
 * O import é dinâmico por dois motivos. O óbvio: sem DSN o chunk nunca é
 * buscado, e quem visita o site não paga por uma ferramenta que só interessa a
 * quem o mantém. O menos óbvio: mesmo com DSN, o carregamento acontece depois
 * do primeiro render, então o monitoramento nunca atrasa o conteúdo — que é a
 * inversão exata do que a maioria das instalações de APM faz.
 */
export function iniciarObservabilidade(): void {
  if (!DSN) return

  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: AMBIENTE,
        // Amostragem baixa de propósito: o interesse aqui é erro, não perfil de
        // performance — para isso já existe o Web Vitals, que é de graça.
        tracesSampleRate: 0.05,
        // Sem replay de sessão: a sacola tem nome e endereço de quem pede, e
        // gravar a tela seria desproporcional ao que se ganha em diagnóstico.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        beforeSend(evento) {
          // Extensão de navegador quebrando na página do usuário não é bug
          // deste site, e enche a cota gratuita em uma tarde.
          const arquivo = evento.exception?.values?.[0]?.stacktrace?.frames?.at(-1)?.filename
          if (
            arquivo?.startsWith('chrome-extension://') ||
            arquivo?.startsWith('moz-extension://')
          ) {
            return null
          }
          return evento
        },
      })
    })
    .catch(() => {
      // Bloqueador de anúncio derrubou o chunk. O site continua funcionando;
      // ficar sem telemetria é o resultado correto, não um erro a propagar.
    })
}

/**
 * Web Vitals no console em desenvolvimento e para o gtag em produção.
 *
 * A métrica só é útil se chegar em algum lugar. Sem uma conta de analytics
 * configurada, ela é impressa no console — o que já basta para inspecionar um
 * regressão local antes do deploy.
 */
export function medirWebVitals(): void {
  import('web-vitals')
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const reportar = (metrica: { name: string; value: number; rating: string; id: string }) => {
        if (import.meta.env.DEV) {
          console.warn(
            `[web-vitals] ${metrica.name}: ${metrica.value.toFixed(1)} (${metrica.rating})`,
          )
          return
        }

        // `gtag` só existe se a tag do Google tiver sido carregada (ver
        // lib/analytics.ts). Sem ela, a métrica é descartada em silêncio.
        const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
        gtag?.('event', metrica.name, {
          event_category: 'Web Vitals',
          // O GA4 só aceita inteiros aqui; CLS é fracionário e vira milésimos.
          value: Math.round(metrica.name === 'CLS' ? metrica.value * 1000 : metrica.value),
          metric_id: metrica.id,
          metric_rating: metrica.rating,
          non_interaction: true,
        })
      }

      onCLS(reportar)
      onINP(reportar)
      onLCP(reportar)
      onFCP(reportar)
      onTTFB(reportar)
    })
    .catch(() => {
      /* idem: telemetria ausente não é falha do site */
    })
}
