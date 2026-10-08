import { type ReactNode, useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from '@/hooks/useMediaQuery'

/**
 * Elemento que é atraído pelo ponteiro.
 *
 * O efeito só faz sentido com mouse: no toque não existe "chegar perto", e o
 * elemento ficaria parado ocupando código. Por isso o hook é consultado antes
 * de qualquer listener ser criado.
 *
 * A força cai com a distância dentro do raio, o que dá a impressão de campo
 * magnético em vez de teletransporte. E a volta ao lugar tem transição, mas o
 * acompanhamento não: durante a perseguição, transição atrasaria o elemento em
 * relação ao ponteiro e o efeito viraria arrasto.
 */
type Props = { children: ReactNode; forca?: number; raio?: number; className?: string }

export function Magnetic({ children, forca = 0.35, raio = 110, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const fino = useFinePointer()
  const reduzido = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !fino || reduzido) return

    const aoMover = (e: PointerEvent) => {
      const caixa = el.getBoundingClientRect()
      const dx = e.clientX - (caixa.left + caixa.width / 2)
      const dy = e.clientY - (caixa.top + caixa.height / 2)
      const distancia = Math.hypot(dx, dy)

      if (distancia > raio) {
        el.style.transition = 'transform 600ms var(--ease-kyo)'
        el.style.transform = 'translate3d(0,0,0)'
        return
      }

      const queda = 1 - distancia / raio
      el.style.transition = 'none'
      el.style.transform = `translate3d(${dx * forca * queda}px, ${dy * forca * queda}px, 0)`
    }

    window.addEventListener('pointermove', aoMover, { passive: true })
    return () => window.removeEventListener('pointermove', aoMover)
  }, [fino, reduzido, forca, raio])

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-block', willChange: 'transform' }}
    >
      {children}
    </span>
  )
}
