import { Selo } from '@/components/Logo'
import { Magnetic } from '@/components/Magnetic'
import { Perguntas } from '@/components/Perguntas'
import { Titulo } from '@/components/Titulo'
import { registrar } from '@/lib/analytics'
import { CASA, FAQ, TEXTO } from '@/lib/business'

/** As perguntas que chegam de verdade — horário, área, mínimo, pagamento. */
export function SecaoPerguntas() {
  return (
    <section id="perguntas" data-tema="claro" className="papel py-28 sm:py-36">
      <div className="container-x grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Titulo rotulo="Perguntas" titulo="Antes de você perguntar." kanji="perguntas" />
        <Perguntas itens={FAQ} />
      </div>
    </section>
  )
}

/** O fecho: a marca grande, uma frase, os dois caminhos. */
export function Fecho() {
  return (
    <section
      data-tema="escuro"
      aria-labelledby="titulo-fecho"
      className="relative overflow-hidden bg-sumi py-32 text-center text-washi sm:py-44"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(50% 60% at 50% 45%, rgba(201,21,25,0.18), transparent 70%)',
        }}
      />
      <div className="container-x relative flex flex-col items-center">
        <Selo tamanho={320} className="h-32 w-32 sm:h-40 sm:w-40" />
        <h2
          id="titulo-fecho"
          className="mt-12 text-[clamp(2.6rem,7vw,6rem)] leading-[0.95] font-light tracking-[-0.035em] [font-variation-settings:'opsz'_144]"
        >
          {TEXTO.fecho.titulo}
        </h2>
        <p className="mt-5 font-display text-[clamp(1.3rem,2.4vw,1.9rem)] text-kin italic">
          {TEXTO.fecho.texto}
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Magnetic>
            <a
              href={CASA.delivery}
              target="_blank"
              rel="noopener"
              onClick={() => registrar('delivery_clique', { origem: 'fecho' })}
              className="botao botao-shu min-h-[3.25rem] px-8"
              data-cursor="Pedir"
            >
              Pedir agora
            </a>
          </Magnetic>
          <a href="/cardapio" className="botao botao-linha min-h-[3.25rem] px-7">
            Ver o cardápio
          </a>
        </div>
      </div>
    </section>
  )
}
