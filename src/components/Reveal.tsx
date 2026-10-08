import {
  Fragment,
  type PointerEventHandler,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/**
 * Entrada por scroll, sem GSAP.
 *
 * No fundo isto é um `IntersectionObserver` mais uma transição CSS. Fazer o
 * mesmo com ScrollTrigger custaria 44 kB comprimidos carregados em TODA página
 * — inclusive no /cardapio, que é onde a pessoa chega com pressa de pedir.
 *
 * REGRA QUE NÃO SE QUEBRA: o estado escondido nunca sobrevive a uma falha.
 * Sem `IntersectionObserver`, o conteúdo nasce visível. Com movimento
 * reduzido, idem. Se o elemento nunca entrar na viewport ele continua
 * escondido — o que está correto, porque ninguém está olhando.
 */
const SUPORTA_IO = typeof window !== 'undefined' && 'IntersectionObserver' in window

/** Margem generosa: dispara um pouco antes de o elemento aparecer de fato. */
const MARGEM = '120px 0px -8% 0px'

function useEntrou(reduzido: boolean) {
  const ref = useRef<HTMLElement>(null)
  const [entrou, setEntrou] = useState(false)

  // Derivado, não guardado: sem suporte a IO ou com movimento reduzido o
  // conteúdo simplesmente já está visível, e `reduzido` pode mudar a qualquer
  // momento se a pessoa trocar a preferência do sistema.
  const visivel = reduzido || !SUPORTA_IO || entrou

  useEffect(() => {
    if (reduzido || !SUPORTA_IO) return
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEntrou(true)
          io.disconnect()
        }
      },
      { rootMargin: MARGEM },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [reduzido])

  return { ref, visivel }
}

type Props = {
  children: ReactNode
  className?: string
  /** Atraso em segundos — útil para escalonar irmãos. */
  delay?: number
  /** Deslocamento inicial em pixels. */
  y?: number
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'footer'
  /** Âncora de rolagem — é por ela que o menu do topo aponta para um cartão. */
  id?: string
  /**
   * Os dois manipuladores que `useBrilho()` devolve.
   *
   * Precisam estar declarados: espalhar `{...brilho}` num componente que não os
   * recebe é um erro que o TypeScript não pega em JSX e que não quebra nada —
   * o cartão simplesmente nunca acende, e ninguém descobre por quê.
   */
  onPointerMove?: PointerEventHandler<HTMLElement>
  onPointerLeave?: PointerEventHandler<HTMLElement>
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  as: Tag = 'div',
  id,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const reduzido = useReducedMotion()
  const { ref, visivel } = useEntrou(reduzido)

  return (
    <Tag
      // @ts-expect-error — a união de tags não estreita o tipo da ref, mas todas são HTMLElement
      ref={ref}
      id={id}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('motion-safe:transition-[opacity,transform]', className)}
      style={
        reduzido
          ? undefined
          : {
              opacity: visivel ? 1 : 0,
              transform: visivel ? 'none' : `translateY(${y}px)`,
              transitionDuration: '900ms',
              transitionTimingFunction: 'var(--ease-kyo)',
              transitionDelay: visivel ? `${delay}s` : '0s',
              willChange: visivel ? 'auto' : 'opacity, transform',
            }
      }
    >
      {children}
    </Tag>
  )
}

type SplitProps = {
  text: string
  className?: string
  /** Intervalo entre palavras, em segundos. */
  stagger?: number
}

/**
 * Título que sobe palavra por palavra por trás de uma máscara.
 *
 * Quebrar em palavras via JSX (em vez do SplitText do GSAP) mantém o texto
 * acessível ao leitor de tela e ao Google como uma frase só.
 *
 * Dois detalhes de CSS que já custaram bug em projeto anterior:
 *
 * · o `padding-top` dá ar para o acento. `overflow-hidden` recorta na borda da
 *   caixa de padding e, com line-height apertado, o acento de Á/Ê passa da
 *   altura de caixa — sem o padding, "TÊM" perderia o acento.
 *
 * · o espaço entre palavras fica FORA do inline-block. Dentro, o CSS descarta
 *   o espaço final da caixa e as palavras grudam.
 */
export function SplitHeading({ text, className, stagger = 0.06 }: SplitProps) {
  const reduzido = useReducedMotion()
  const { ref, visivel } = useEntrou(reduzido)
  const palavras = text.split(' ')

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={cn('inline', className)}>
      {palavras.map((palavra, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a frase é fixa e a posição da palavra é a identidade dela
        <Fragment key={`${palavra}-${i}`}>
          <span className="-mt-[0.22em] inline-block overflow-hidden pt-[0.22em] align-bottom">
            <span
              className="inline-block"
              style={
                reduzido
                  ? undefined
                  : {
                      transform: visivel ? 'none' : 'translateY(120%)',
                      transition: 'transform 1050ms cubic-bezier(0.16, 1, 0.3, 1)',
                      transitionDelay: visivel ? `${i * stagger}s` : '0s',
                    }
              }
            >
              {palavra}
            </span>
          </span>
          {i < palavras.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
}
