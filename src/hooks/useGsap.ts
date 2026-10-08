import { type RefObject, useEffect } from 'react'
import { conectarAoLenis } from './useSmoothScroll'

/**
 * Roda uma animação GSAP com a biblioteca carregada sob demanda.
 *
 * O GSAP é necessário para o que depende da posição exata do scroll: o texto
 * que acende palavra a palavra e a seção pinada com rolagem horizontal. Nada
 * disso existe no /cardapio nem na política de privacidade — e importar a
 * biblioteca de forma estática obrigaria essas páginas a baixar ~44 kB
 * comprimidos antes do primeiro paint, para nunca usar.
 *
 * O import mora aqui dentro para que o bundler o mantenha num chunk separado,
 * buscado só quando este efeito roda de verdade. E como o `gsap.context` é
 * criado depois de um `await`, o hook precisa lidar com desmontagem no meio do
 * caminho — daí a bandeira `cancelado`.
 */
type Contexto = { revert: () => void }

type GsapModule = typeof import('gsap')['default']

export function useGsap(
  /** Recebe o gsap já com o ScrollTrigger registrado. Deve criar os tweens. */
  criar: (gsap: GsapModule) => void,
  scope: RefObject<HTMLElement | null>,
  deps: readonly unknown[],
  /** Quando falso, nada é carregado nem animado. */
  ativo = true,
) {
  // `criar` é recriada a cada render de propósito: quem chama o hook declara as
  // dependências reais em `deps`, porque só quem escreveu os tweens sabe o que
  // realmente os invalida. Incluir `criar` aqui recriaria todos os ScrollTrigger
  // a cada render — que é o bug que este comentário existe para evitar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: contrato explícito do hook
  useEffect(() => {
    if (!ativo) return

    let cancelado = false
    let ctx: Contexto | undefined
    let desconectar: (() => void) | undefined

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (cancelado) return
        gsap.registerPlugin(ScrollTrigger)

        // Sem isto, Lenis e ScrollTrigger leem a posição em quadros diferentes
        // e a seção pinada treme meio pixel a cada rolagem. A conexão vive aqui
        // — e não no hook do scroll — para que páginas sem animação de scroll
        // nunca precisem carregar o GSAP.
        desconectar = conectarAoLenis(ScrollTrigger.update)
        gsap.ticker.lagSmoothing(0)

        // Fontes trocam depois do primeiro paint e mudam a altura dos títulos;
        // sem reancorar, todo gatilho de scroll dispara no lugar errado.
        if ('fonts' in document) document.fonts.ready.then(() => ScrollTrigger.refresh())

        ctx = gsap.context(() => criar(gsap), scope)
      },
    )

    return () => {
      cancelado = true
      desconectar?.()
      ctx?.revert()
    }
  }, [ativo, ...deps])
}
