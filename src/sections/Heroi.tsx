import { Cena3D } from '@/components/Cena3D'
import { SeloEstado } from '@/components/Estado'
import { IconeSetaDiagonal, IconeWhatsApp } from '@/components/Icones'
import { Ja } from '@/components/Ja'
import { Selo } from '@/components/Logo'
import { Magnetic } from '@/components/Magnetic'
import { registrar } from '@/lib/analytics'
import { CASA, TEXTO } from '@/lib/business'
import { cn } from '@/lib/utils'

/**
 * O herói.
 *
 * O `<h1>` é o LCP, e por isso é texto — nunca o canvas. A peça 3D (o nigiri
 * de salmão, o mesmo que o gato do selo segura) chega depois, por cima do
 * fundo, e o título já está lendo quando ela aparece.
 *
 * REGRA: o título só nasce escondido com a classe `heroi-armado`, aplicada
 * pelo React. Sem JavaScript, ou com erro antes daqui, ele aparece parado.
 */
export function Heroi({ pronto }: { pronto: boolean }) {
  const { heroi } = TEXTO

  const fatos = [
    { rotulo: 'Hoje', valor: <SeloEstado className="text-[0.95rem]" /> },
    { rotulo: 'Entrega', valor: CASA.regiao },
    { rotulo: 'Pedido mínimo', valor: `R$ ${CASA.pedidoMinimo},00` },
    { rotulo: 'Pagamento', valor: 'Dinheiro, cartão ou online' },
  ]

  return (
    <section
      data-tema="escuro"
      aria-labelledby="titulo-heroi"
      className={cn(
        'heroi-armado relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-sumi text-washi',
        pronto && 'heroi-pronto',
      )}
    >
      {/* O sol vermelho atrás do gato, no logo — aqui, atrás da peça. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(42% 50% at 74% 50%, rgba(201,21,25,0.30), transparent 68%), radial-gradient(60% 50% at 70% 95%, rgba(220,171,92,0.08), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="seigaiha absolute right-0 bottom-0 -z-10 h-[45%] w-[55%] text-kin opacity-[0.05] [mask-image:radial-gradient(ellipse_at_bottom_right,#000_20%,transparent_70%)]"
      />

      <Ja
        termo="bemVindo"
        vertical
        className="absolute top-32 right-5 hidden text-[1.1rem] tracking-[0.3em] text-kin/50 md:block lg:right-10"
      />

      <div className="container-x relative flex flex-1 flex-col justify-start pt-32 pb-10 sm:pt-36 lg:justify-center lg:pt-24">
        <div className="max-w-[40rem]">
          <div data-surge className="mb-7 flex items-center gap-4" style={{ ['--i' as string]: 0 }}>
            <Selo tamanho={160} prioridade className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
            <p className="rotulo text-kin">{heroi.sobretitulo}</p>
          </div>

          <h1
            id="titulo-heroi"
            className="text-[clamp(2.9rem,8.4vw,6.4rem)] leading-[0.94] font-light tracking-[-0.035em] [font-variation-settings:'opsz'_144]"
          >
            {heroi.titulo.map((linha, i) => (
              <span
                key={linha}
                data-linha
                // O padding-top dá ar ao acento: overflow-hidden recorta na
                // borda do padding, e sem ele o acento seria cortado.
                className="-mt-[0.14em] block overflow-hidden pt-[0.14em] pb-[0.06em]"
              >
                <span className={cn('block', i === 2 && 'text-shu italic')}>{linha}</span>
              </span>
            ))}
          </h1>

          <p
            data-surge
            className="mt-8 max-w-[34rem] text-[1.08rem] leading-relaxed text-nevoa"
            style={{ ['--i' as string]: 1 }}
          >
            {heroi.apoio}
          </p>

          <div
            data-surge
            className="mt-10 flex flex-wrap items-center gap-3"
            style={{ ['--i' as string]: 2 }}
          >
            <Magnetic>
              <a
                href={CASA.delivery}
                target="_blank"
                rel="noopener"
                onClick={() => registrar('delivery_clique', { origem: 'heroi' })}
                className="botao botao-shu min-h-[3.25rem] px-7"
                data-cursor="Pedir"
              >
                Pedir agora <IconeSetaDiagonal className="h-4 w-4" />
              </a>
            </Magnetic>
            <a href="/cardapio" className="botao botao-linha min-h-[3.25rem] px-6">
              <IconeWhatsApp className="h-5 w-5" /> Montar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* No celular, a peça ganha o próprio bloco abaixo do texto; no
          desktop, a coluna da direita. A máscara dissolve as bordas da
          ardósia na noite. */}
      <Cena3D className="relative -z-10 -mt-6 h-[40svh] w-full [mask-image:radial-gradient(ellipse_70%_62%_at_50%_52%,#000_58%,transparent_100%)] lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-[56%]" />

      {/* Informação de consulta: grade fixa, nunca marquise. */}
      <div
        data-surge
        className="relative border-t border-washi/10 bg-sumi/70 backdrop-blur-md"
        style={{ ['--i' as string]: 3 }}
      >
        <dl className="container-x grid grid-cols-2 gap-x-6 gap-y-4 py-5 lg:grid-cols-4">
          {fatos.map((f) => (
            <div key={f.rotulo}>
              <dt className="font-mono text-[0.66rem] tracking-[0.14em] text-kin uppercase">
                {f.rotulo}
              </dt>
              <dd className="mt-1.5 text-[0.95rem] font-medium">{f.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
