import { IconeSetaDiagonal, IconeWhatsApp } from '@/components/Icones'
import { Reveal } from '@/components/Reveal'
import { Titulo } from '@/components/Titulo'
import { registrar } from '@/lib/analytics'
import { CASA, TEXTO } from '@/lib/business'
import { resumoDaSemana } from '@/lib/hours'
import { NUMERAIS } from '@/lib/kanji'

/**
 * Como pedir — os dois caminhos, lado a lado.
 *
 * O app calcula a taxa pelo endereço e aceita pagamento online; o WhatsApp é
 * para quem prefere conversar. Nenhum prazo de entrega é prometido aqui: o
 * tempo depende da noite e do bairro, e quem informa o número daquele momento
 * é o app.
 */
export function ComoPedir() {
  const info = [
    {
      rotulo: 'Horário',
      valor: resumoDaSemana(CASA.semana)
        .map((l) => `${l.dias}, ${l.horario}`)
        .join(' · '),
    },
    { rotulo: 'Entrega', valor: `${CASA.regiao} — taxa calculada pelo endereço, no app` },
    { rotulo: 'Pedido mínimo', valor: `R$ ${CASA.pedidoMinimo},00` },
    { rotulo: 'Pagamento', valor: CASA.pagamento.join(', ') },
  ]

  return (
    <section id="como-pedir" data-tema="claro" className="papel py-28 sm:py-36">
      <div className="container-x">
        <Titulo rotulo="Como pedir" titulo="Três passos até o sushi chegar." kanji="entrega" />

        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {TEXTO.comoPedir.map((p, i) => (
            <Reveal
              as="li"
              key={p.titulo}
              delay={i * 0.08}
              className="border-t border-sumi/20 pt-6"
            >
              <p className="flex items-center gap-3 text-shu">
                <span lang="ja" aria-hidden className="font-ja text-3xl">
                  {NUMERAIS[i]}
                </span>
                <span className="font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
              </p>
              <h3 className="mt-4 font-display text-3xl font-normal">{p.titulo}</h3>
              <p className="mt-3 max-w-[32ch] leading-relaxed text-tinta">{p.texto}</p>
            </Reveal>
          ))}
        </ol>

        <div className="mt-20 grid gap-10 rounded-[1.5rem] bg-sumi p-8 text-washi sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <dl className="grid gap-6 sm:grid-cols-2">
            {info.map((x) => (
              <div key={x.rotulo}>
                <dt className="font-mono text-[0.68rem] tracking-[0.14em] text-kin uppercase">
                  {x.rotulo}
                </dt>
                <dd className="mt-1.5 leading-relaxed">{x.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-3">
            <a
              href={CASA.delivery}
              target="_blank"
              rel="noopener"
              onClick={() => registrar('delivery_clique', { origem: 'como-pedir' })}
              className="botao botao-shu min-h-[3.25rem] px-7"
            >
              Pedir pelo app <IconeSetaDiagonal className="h-4 w-4" />
            </a>
            <a href="/cardapio" className="botao botao-linha min-h-[3.25rem] px-7">
              <IconeWhatsApp className="h-5 w-5" /> Montar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
