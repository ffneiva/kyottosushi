import { FotoPrato } from '@/components/Foto'
import { Reveal } from '@/components/Reveal'
import { Titulo } from '@/components/Titulo'
import CORES from '@/data/fotos-cardapio.json'
import { COMBOS, GRUPOS } from '@/lib/business'
import { centavos, emReais } from '@/lib/pedido'

const CORES_FOTO = CORES as Record<string, string>

/**
 * Os combos — grade de consulta, nunca carrossel: quem escolhe combo compara
 * preço, peças e quantas pessoas serve, lado a lado.
 */
export function Combos() {
  return (
    <section id="combos" data-tema="escuro" className="bg-sumi-2 py-28 text-washi sm:py-36">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <Titulo
            rotulo={GRUPOS.combos.nome}
            titulo="Para um, para dois, para a mesa inteira."
            kanji="cardapio"
            apoio={GRUPOS.combos.texto}
          />
          <a href="/cardapio" className="botao botao-shu w-fit" data-cursor="Montar">
            Montar meu pedido
          </a>
        </div>

        <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COMBOS.map((c, i) => (
            <Reveal as="li" key={c.id} delay={(i % 4) * 0.06}>
              <a href={`/cardapio#item-${c.id}`} className="group block h-full">
                <div className="relative">
                  <FotoPrato
                    nome={c.foto}
                    alt={c.nome}
                    grande
                    cor={CORES_FOTO[c.foto]}
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="aspect-square rounded-[1rem] [&_img]:transition-transform [&_img]:duration-[1200ms] group-hover:[&_img]:scale-[1.04]"
                  />
                  {c.serve && (
                    <span className="absolute top-3 left-3 rounded-full bg-sumi/85 px-3 py-1 font-mono text-[0.68rem] text-washi backdrop-blur">
                      serve {c.serve}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[1.4rem] leading-tight font-normal group-hover:text-kin">
                    {c.nome}
                  </h3>
                  <span className="shrink-0 font-mono text-sm text-kin tabular">
                    {emReais(centavos(c.preco))}
                  </span>
                </div>
                {c.descricao && (
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-nevoa">{c.descricao}</p>
                )}
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
