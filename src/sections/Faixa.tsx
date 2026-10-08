import { Fragment } from 'react'
import { Marquee } from '@/components/Marquee'
import { FAIXA } from '@/lib/business'

/**
 * A faixa de peças — conteúdo de passeio, e por isso marquise.
 *
 * A lista inteira também existe como texto para o leitor de tela, uma vez:
 * a marquise duplica o conteúdo para o laço, e ler "Monte Fuji, Temaki Tokio…" duas
 * vezes seguidas seria ruído.
 */
export function Faixa() {
  return (
    <section
      data-tema="claro"
      aria-label="Algumas peças do cardápio"
      className="bg-shu py-5 text-washi"
    >
      <p className="sr-only">Algumas peças do cardápio: {FAIXA.join(', ')}.</p>
      <div aria-hidden>
        <Marquee duracao={42}>
          {FAIXA.map((peca) => (
            <Fragment key={peca}>
              <span className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-normal tracking-[-0.02em] whitespace-nowrap italic">
                {peca}
              </span>
              <span className="h-2 w-2 shrink-0 rotate-45 bg-washi/80" />
            </Fragment>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
