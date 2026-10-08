import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Cursor } from '@/components/Cursor'
import { Footer } from '@/components/Footer'
import { Nav } from '@/components/Nav'
import { devePreCarregar, Preloader } from '@/components/Preloader'
import { WhatsAppFab } from '@/components/WhatsAppFab'
import { useRouteAnnounce } from '@/hooks/useRouteAnnounce'
import { useRouteMeta } from '@/hooks/useRouteMeta'
import { scrollToSection, useSmoothScroll } from '@/hooks/useSmoothScroll'
import { ROTAS, rotaDe } from '@/lib/routes'
import { prefersReducedMotion } from '@/lib/utils'
import { NaoEncontrada } from '@/pages/NaoEncontrada'
import { Combos } from '@/sections/Combos'
import { ComoPedir } from '@/sections/ComoPedir'
import { Criacoes } from '@/sections/Criacoes'
import { Faixa } from '@/sections/Faixa'
import { Fecho, SecaoPerguntas } from '@/sections/Fecho'
import { Heroi } from '@/sections/Heroi'
import { Manifesto } from '@/sections/Manifesto'

/*
 * As páginas internas saem do bundle da home: quem abre só a home não baixa a
 * sacola nem a política de privacidade.
 */
const Cardapio = lazy(() => import('@/pages/Cardapio'))
const Privacidade = lazy(() => import('@/pages/Privacidade'))

/**
 * Rola até a âncora assim que ela existir.
 *
 * A página de destino pode ser carregada sob demanda (o /cardapio é um chunk
 * próprio): no quadro seguinte à navegação, `#item-combo-umi` ainda não está no
 * DOM. Tenta por até 3 s, quadro a quadro, e desiste em silêncio — a pessoa
 * continua no topo da página certa, que é o pior caso aceitável.
 */
function rolarQuandoExistir(id: string, inicio = performance.now()) {
  if (document.getElementById(id)) {
    requestAnimationFrame(() => scrollToSection(id))
    return
  }
  if (performance.now() - inicio < 3000) requestAnimationFrame(() => rolarQuandoExistir(id, inicio))
}

/**
 * Roteador de ~40 linhas sobre a History API.
 *
 * Quatro telas não justificam os ~15 kB do react-router. As rotas e seus
 * metadados vivem em lib/routes.ts, que o build também lê para gerar um HTML
 * estático por rota.
 */
function useCaminho() {
  const [caminho, setCaminho] = useState(() => window.location.pathname)

  useEffect(() => {
    const aoVoltar = () => setCaminho(window.location.pathname)
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  const navegar = useCallback((destino: string) => {
    const [semAncora, ancora] = destino.split('#')
    // A query (?origem=instagram) vai para a URL, mas não para o estado da
    // rota: quem a lê é a página, no primeiro render.
    const novo = semAncora.split('?')[0] || window.location.pathname
    const mesmaUrl = semAncora === window.location.pathname + window.location.search
    if (mesmaUrl && !ancora) return

    const trocar = () => {
      window.history.pushState({}, '', destino)
      // flushSync: a View Transition fotografa o DOM "depois" no fim deste
      // callback — o React precisa ter pintado a rota nova até lá.
      flushSync(() => setCaminho(novo))
      if (ancora) rolarQuandoExistir(ancora)
      else window.scrollTo({ top: 0, behavior: 'instant' })
    }

    // View Transitions API: a troca de página vira um corte suave, sem
    // biblioteca. Onde não existe (Firefox antigo) ou com movimento reduzido,
    // a troca é instantânea — que é o comportamento correto, não um fallback.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (doc.startViewTransition && !prefersReducedMotion()) doc.startViewTransition(trocar)
    else trocar()
  }, [])

  return { caminho, navegar }
}

/**
 * Intercepta cliques em links internos.
 *
 * Qualquer `<a href="/cardapio">` do site navega sem recarregar, sem que cada
 * componente precise de um `onClick`. Fica de fora o que o navegador deve
 * tratar sozinho: link externo, `target`, download, clique com Ctrl/Cmd/Shift
 * ou botão do meio (abrir em outra aba).
 */
function useLinksInternos(navegar: (destino: string) => void) {
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const a = (e.target as Element | null)?.closest('a')
      if (!a || a.target || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const conhecida = ROTAS.some(
        (r) =>
          r.path === url.pathname.replace(/\/+$/, '') || (r.path === '/' && url.pathname === '/'),
      )
      if (!conhecida) return
      e.preventDefault()
      navegar(url.pathname + url.search + url.hash)
    }
    document.addEventListener('click', aoClicar)
    return () => document.removeEventListener('click', aoClicar)
  }, [navegar])
}

export default function App() {
  const { caminho, navegar } = useCaminho()
  const rota = rotaDe(caminho)
  const home = rota.path === '/'

  useRouteMeta(rota)
  useSmoothScroll()
  useLinksInternos(navegar)
  const { alvoRef, aviso } = useRouteAnnounce(rota)

  // Decidido uma vez, no primeiro render: só a home, só a primeira visita.
  const [abertura] = useState(() => home && devePreCarregar())
  const [pronto, setPronto] = useState(!abertura)
  const aoTerminar = useCallback(() => setPronto(true), [])

  const irParaSecao = useCallback(
    (id: string) => {
      if (document.getElementById(id)) scrollToSection(id)
      else navegar(`/#${id}`)
    },
    [navegar],
  )

  // Âncora na URL de entrada (/#combos vindo de outra página ou de um link).
  useEffect(() => {
    const ancora = window.location.hash.slice(1)
    if (ancora) rolarQuandoExistir(ancora)
  }, [])

  return (
    <>
      {abertura && <Preloader aoTerminar={aoTerminar} />}
      <Cursor />

      <a
        href="#conteudo"
        className="sr-only rounded-full bg-kin px-5 py-2 font-mono text-xs text-sumi focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300]"
      >
        Pular para o conteúdo
      </a>
      <p aria-live="polite" role="status" className="sr-only">
        {aviso}
      </p>

      <Nav aoNavegar={navegar} aoSecao={irParaSecao} />

      <div ref={alvoRef} tabIndex={-1} className="outline-none">
        <main id="conteudo">
          {home && (
            <>
              {/* A ordem é o argumento:
                    Heroi      — quem é, o que faz, e os dois jeitos de pedir
                    Faixa      — o que tem na caixa, de passagem
                    Manifesto  — o lema do selo, por extenso
                    Criacoes   — o motivo de pedir daqui e não do vizinho
                    Combos     — o que se pede para dividir, com preço
                    ComoPedir  — o caminho, sem dúvida sobre taxa e mínimo
                    Perguntas  — o resto das dúvidas
                    Fecho      — o chamado final */}
              <Heroi pronto={pronto} />
              <Faixa />
              <Manifesto />
              <Criacoes />
              <Combos />
              <ComoPedir />
              <SecaoPerguntas />
              <Fecho />
            </>
          )}

          <Suspense fallback={<div className="min-h-[100svh] bg-sumi" />}>
            {rota.path === '/cardapio' && <Cardapio />}
            {rota.path === '/politica-de-privacidade' && <Privacidade />}
          </Suspense>
          {rota.path === '/404' && <NaoEncontrada />}
        </main>
      </div>

      <Footer />
      <WhatsAppFab oculto={rota.path === '/cardapio'} />
    </>
  )
}
