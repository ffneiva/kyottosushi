import { useRef } from 'react'
import { Selo } from '@/components/Logo'
import { useGsap } from '@/hooks/useGsap'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { TEXTO } from '@/lib/business'

/**
 * O manifesto: o texto acende palavra a palavra conforme a rolagem.
 *
 * É o único lugar da home onde o ritmo de leitura é imposto — e é de
 * propósito: a frase é o lema do próprio selo da casa, dito por extenso. O `scrub` amarra a opacidade de
 * cada palavra à posição do scroll, sem tempo próprio: quem rola rápido lê
 * rápido.
 *
 * Sem GSAP (movimento reduzido, chunk bloqueado), as palavras nascem acesas:
 * a opacidade baixa é aplicada PELO tween, nunca pelo CSS.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null)
  const reduzido = useReducedMotion()
  const palavras = TEXTO.manifesto.split(' ')

  useGsap(
    (gsap) => {
      gsap.fromTo(
        '[data-palavra]',
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 72%',
            end: 'bottom 55%',
            scrub: 0.6,
          },
        },
      )
    },
    ref,
    [],
    !reduzido,
  )

  return (
    <section
      ref={ref}
      data-tema="escuro"
      aria-label="Manifesto"
      className="relative bg-sumi py-32 text-washi sm:py-44"
    >
      <div className="container-x grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
        <Selo tamanho={320} className="h-24 w-24 lg:mt-2 lg:h-36 lg:w-36" />
        <p className="max-w-[24ch] font-display text-[clamp(2rem,4.6vw,4.1rem)] leading-[1.08] font-light tracking-[-0.025em] [font-variation-settings:'opsz'_144]">
          {palavras.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a frase é fixa; a posição é a identidade da palavra
            <span key={i}>
              <span data-palavra className={i < 4 ? 'text-shu' : undefined}>
                {p}
              </span>{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
