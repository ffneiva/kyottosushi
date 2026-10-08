import { useEffect, useRef, useState } from 'react'
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { CenaNigiri } from '@/scene/nigiri'

/**
 * O nigiri em WebGL — carregado sob demanda, pausado fora da tela.
 *
 * Três decisões:
 *
 * · **three.js por import dinâmico, disparado pela visibilidade.** O chunk
 *   (~700 kB) só é pedido quando a cena está a uma tela de distância — muito
 *   depois do primeiro paint. O LCP é o título, nunca o canvas.
 *
 * · **Monta uma vez e nunca desmonta.** Remontar recria o contexto WebGL e
 *   recozinha o ambiente — meio segundo de buraco a cada volta ao topo. O que
 *   liga e desliga é o laço de render.
 *
 * · **Three.js puro, sem React Three Fiber.** É uma peça só, sem árvore de
 *   objetos que mude com o estado do React: o reconciliador do R3F (~40 kB)
 *   não teria o que reconciliar. Uma classe com `iniciar`/`pausar`/`destruir`
 *   diz exatamente o que acontece, e quando.
 */
let suporte: boolean | null = null

function suportaWebGL(): boolean {
  if (suporte !== null) return suporte
  try {
    const canvas = document.createElement('canvas')
    suporte = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    suporte = false
  }
  return suporte
}

type Props = { className?: string }

export function Cena3D({ className }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cenaRef = useRef<CenaNigiri | null>(null)
  const desktop = useIsDesktop()
  const reduzido = useReducedMotion()
  const [pintou, setPintou] = useState(false)

  useEffect(() => {
    const caixa = caixaRef.current
    const canvas = canvasRef.current
    if (!caixa || !canvas || reduzido || !suportaWebGL()) return

    let cancelado = false
    let visivel = false
    let limpar: (() => void) | undefined

    const montar = () => {
      import('@/scene/nigiri')
        .then(({ CenaNigiri }) => {
          if (cancelado) return
          const cena = new CenaNigiri(canvas, { compacto: !desktop })
          cenaRef.current = cena

          const medir = () => {
            const { width, height } = caixa.getBoundingClientRect()
            cena.redimensionar(Math.max(1, width), Math.max(1, height))
          }
          medir()
          const ro = new ResizeObserver(medir)
          ro.observe(caixa)

          // A rolagem gira a peça e a afunda enquanto o herói sai de cena.
          const aoRolar = () => {
            const { top, height } = caixa.getBoundingClientRect()
            cena.definirRolagem(Math.min(1, Math.max(0, -top / Math.max(1, height))))
          }
          aoRolar()
          window.addEventListener('scroll', aoRolar, { passive: true })

          if (visivel) cena.iniciar()
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (cancelado) return
              setPintou(true)
            }),
          )

          limpar = () => {
            ro.disconnect()
            window.removeEventListener('scroll', aoRolar)
            cena.destruir()
            cenaRef.current = null
          }
        })
        .catch(() => {
          // Chunk bloqueado ou rede caiu: fica o fundo estático, que já é uma
          // composição completa. Nada a propagar.
        })
    }

    let montado = false
    const io = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting
        if (visivel && !montado) {
          montado = true
          montar()
        }
        if (visivel) cenaRef.current?.iniciar()
        else cenaRef.current?.pausar()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(caixa)

    // Aba em segundo plano: o rAF já para sozinho, mas o relógio da cena não.
    const aoTrocarAba = () => {
      if (document.hidden) cenaRef.current?.pausar()
      else if (visivel) cenaRef.current?.iniciar()
    }
    document.addEventListener('visibilitychange', aoTrocarAba)

    return () => {
      cancelado = true
      io.disconnect()
      document.removeEventListener('visibilitychange', aoTrocarAba)
      limpar?.()
    }
  }, [desktop, reduzido])

  return (
    <div ref={caixaRef} aria-hidden className={cn('pointer-events-none', className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          'h-full w-full transition-opacity duration-[1400ms] ease-[var(--ease-kyo)]',
          pintou ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}
