import { useRef } from 'react'
import { FotoPrato } from '@/components/Foto'
import { Ja } from '@/components/Ja'
import { Titulo } from '@/components/Titulo'
import CORES from '@/data/fotos-cardapio.json'
import { useGsap } from '@/hooks/useGsap'
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery'
import { CRIACOES, GRUPOS } from '@/lib/business'
import { centavos, emReais } from '@/lib/pedido'

/**
 * As criações da casa — o que o Kyotto tem e o sushi delivery comum não tem:
 * temaki em cone de harumaki, sanduíche de arroz crocante, sushi no copo.
 *
 * No desktop, a seção é pinada e os cartões correm na horizontal conforme a
 * rolagem: o gesto lateral é o de "passar os pratos" no balcão. O
 * deslocamento é medido (largura da trilha − largura da tela), não chutado,
 * e é recalculado no resize pelo `invalidateOnRefresh`.
 *
 * No celular e com movimento reduzido, não há pin: a trilha é um carrossel
 * nativo com `scroll-snap`, que o polegar já sabe usar. Pinar numa tela de
 * bolso transforma a página num túnel.
 */
const CORES_FOTO = CORES as Record<string, string>

export function Criacoes() {
  const secaoRef = useRef<HTMLElement>(null)
  const trilhaRef = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktop()
  const reduzido = useReducedMotion()
  const pinar = desktop && !reduzido

  useGsap(
    (gsap) => {
      const trilha = trilhaRef.current
      if (!trilha) return
      const distancia = () => trilha.scrollWidth - window.innerWidth + 64
      gsap.to(trilha, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: secaoRef.current,
          start: 'top top',
          end: () => `+=${distancia()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      })
    },
    secaoRef,
    [pinar],
    pinar,
  )

  return (
    // O invólucro é do React; a seção dentro dele é do GSAP. O pin envolve a
    // seção num <div class="pin-spacer"> — sem o invólucro, esse div entraria
    // direto no <main>, e ao sair da home o React tentaria remover a seção de
    // um pai que não é mais o dela: "removeChild… is not a child of this node",
    // e a página seguinte caía no ErrorBoundary.
    <div>
      <section
        ref={secaoRef}
        id="criacoes"
        data-tema="claro"
        className="papel relative overflow-hidden py-24 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:py-10"
      >
        <div className="container-x grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end [&_h2]:lg:text-[clamp(2.2rem,4.4vw,3.8rem)]">
          <Titulo
            rotulo={GRUPOS.criacoes.nome}
            titulo="Sushi, do jeito que só a casa faz."
            kanji="itadakimasu"
          />
          <p className="max-w-[30rem] border-l-2 border-shu pl-5 text-[1.08rem] leading-relaxed text-tinta-2 lg:mb-3">
            {GRUPOS.criacoes.texto}
          </p>
        </div>

        <div
          className={
            pinar
              ? 'mt-8'
              : 'mt-12 overflow-x-auto overscroll-x-contain [scrollbar-width:none] snap-x snap-mandatory'
          }
          data-transbordo-intencional
        >
          <div ref={trilhaRef} className="flex w-max gap-5 px-5 sm:px-8 lg:gap-6 lg:px-14">
            {CRIACOES.map((prato, i) => (
              <article
                key={prato.foto}
                // No desktop a largura sai da ALTURA da tela: a seção é pinada e
                // precisa caber inteira em 100svh — título, foto 4:5 e legenda.
                className="group w-[78vw] max-w-[24rem] shrink-0 snap-center sm:w-[22rem] lg:w-[clamp(15rem,calc((100svh-26rem)*0.8),26rem)] lg:max-w-none"
              >
                <div className="relative">
                  <FotoPrato
                    nome={prato.foto}
                    alt={prato.nome}
                    grande
                    cor={CORES_FOTO[prato.foto]}
                    sizes="(min-width: 1024px) 26rem, 78vw"
                    className="aspect-[4/5] rounded-[1.1rem] [&_img]:transition-transform [&_img]:duration-[1200ms] group-hover:[&_img]:scale-[1.04]"
                  />
                  <span className="absolute top-4 left-4 rounded-full bg-sumi/85 px-3 py-1 font-mono text-[0.7rem] text-washi backdrop-blur">
                    {String(i + 1).padStart(2, '0')} / {String(CRIACOES.length).padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <h3 className="font-display text-[1.55rem] leading-tight font-normal tracking-[-0.015em]">
                    {prato.nome}
                  </h3>
                  <p className="mt-1.5 shrink-0 rounded-sm bg-sumi px-2 py-1 font-mono text-[0.72rem] whitespace-nowrap text-kin tabular">
                    {emReais(centavos(prato.preco))}
                  </p>
                </div>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-tinta">
                  {prato.chamada} {prato.descricao}.
                </p>
              </article>
            ))}
            <div className="flex w-[70vw] max-w-[20rem] shrink-0 snap-center flex-col justify-center gap-4 sm:w-[18rem]">
              <Ja termo="cardapio" className="text-4xl text-sumi/30" />
              <p className="font-display text-2xl leading-tight">E os combos, para dividir.</p>
              <a href="/cardapio" className="botao botao-linha w-fit" data-cursor="Abrir">
                Ver o cardápio
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
