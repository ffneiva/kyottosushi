import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { registrar } from '@/lib/analytics'
import { CASA } from '@/lib/business'
import { cn } from '@/lib/utils'
import { useEstado } from './Estado'
import { IconeSetaDiagonal } from './Icones'
import { Ja } from './Ja'
import { Logo } from './Logo'

/**
 * Cabeçalho e menu em tela cheia.
 *
 * O `motion` entra aqui só pela animação de SAÍDA do menu: quando o painel
 * fecha, o nó precisa continuar na árvore para animar, e CSS puro não faz
 * isso. A entrada é CSS (`.menu-painel`, `.menu-item`), mais barata e sem
 * depender da biblioteca.
 *
 * ── A cor do cabeçalho segue a seção embaixo dele ──
 *
 * O site alterna seções de noite (sumi) e de papel (washi). Um cabeçalho de
 * cor fixa some numa das duas. Cada seção declara `data-tema`, e o cabeçalho
 * consulta o que está sob ele a cada rolagem — um `elementsFromPoint` por
 * quadro, no máximo, que custa menos que um IntersectionObserver por seção.
 */
type Props = {
  aoNavegar: (destino: string) => void
  aoSecao: (id: string) => void
}

const LINKS = [
  { rotulo: 'Cardápio', destino: '/cardapio' },
  { rotulo: 'Criações', destino: '#criacoes' },
  { rotulo: 'Combos', destino: '#combos' },
  { rotulo: 'Como pedir', destino: '#como-pedir' },
] as const

function useTemaSobCabecalho() {
  const [claro, setClaro] = useState(false)
  useEffect(() => {
    let quadro = 0
    const medir = () => {
      quadro = 0
      const pilha = document.elementsFromPoint(window.innerWidth / 2, 36)
      const secao = pilha.find((el) => !el.closest('header'))?.closest<HTMLElement>('[data-tema]')
      setClaro(secao?.dataset.tema === 'claro')
    }
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir)
    }
    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar, { passive: true })
    // A rota troca sem rolagem — o tema precisa ser relido.
    window.addEventListener('popstate', agendar)
    const intervalo = window.setInterval(agendar, 800)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      window.removeEventListener('popstate', agendar)
      window.clearInterval(intervalo)
    }
  }, [])
  return claro
}

export function Nav({ aoNavegar, aoSecao }: Props) {
  const [aberto, setAberto] = useState(false)
  const [encolhido, setEncolhido] = useState(false)
  const [escondido, setEscondido] = useState(false)
  const claro = useTemaSobCabecalho()
  const estado = useEstado()
  const botaoRef = useRef<HTMLButtonElement>(null)

  /**
   * Recua ao descer, volta ao subir — com acúmulo de direção, e não pelo
   * último evento: o Lenis chega ao destino com um ricochete de alguns pixels,
   * e reagir a ele revelava a barra no fim de toda descida.
   */
  useEffect(() => {
    let anterior = window.scrollY
    let acumulado = 0
    const aoRolar = () => {
      const y = window.scrollY
      setEncolhido(y > 24)
      const mov = y - anterior
      anterior = y
      if (Math.sign(mov) !== Math.sign(acumulado)) acumulado = 0
      acumulado += mov
      if (acumulado > 28) setEscondido(y > 320)
      else if (acumulado < -28) setEscondido(false)
    }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const botao = botaoRef.current
    /**
     * O menu é um diálogo modal: o foco entra nele, o Tab circula só entre o
     * botão de fechar e os links do menu, e ao fechar o foco volta ao botão.
     * Sem isto, quem navega por teclado tabularia pelo conteúdo escondido
     * atrás do painel.
     */
    const focaveis = () => [
      ...(botao ? [botao] : []),
      ...document.querySelectorAll<HTMLElement>('#menu-completo a'),
    ]
    requestAnimationFrame(() => focaveis()[1]?.focus())
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
      if (e.key !== 'Tab') return
      const lista = focaveis()
      if (!lista.length) return
      const i = lista.indexOf(document.activeElement as HTMLElement)
      const proximo = e.shiftKey ? (i <= 0 ? lista.length - 1 : i - 1) : (i + 1) % lista.length
      e.preventDefault()
      lista[proximo].focus()
    }
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', aoTeclar)
      botao?.focus()
    }
  }, [aberto])

  const ir = (destino: string) => {
    setAberto(false)
    if (destino.startsWith('#')) aoSecao(destino.slice(1))
    else aoNavegar(destino)
  }

  const tinta = aberto ? 'text-washi' : claro ? 'text-sumi' : 'text-washi'

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[200] transition-[transform,background-color,padding,color] duration-500 ease-[var(--ease-kyo)]',
          tinta,
          encolhido && !aberto
            ? cn('py-2.5 backdrop-blur-xl', claro ? 'bg-washi/80' : 'bg-sumi/75')
            : 'py-5',
          escondido && !aberto && '-translate-y-full',
        )}
      >
        <div className="container-x flex items-center justify-between gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              ir('/')
            }}
            aria-label={`${CASA.nome} — início`}
          >
            <Logo compacto={encolhido} claro={claro && !aberto} />
          </a>

          <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.rotulo}
                href={l.destino.startsWith('#') ? `/${l.destino}` : l.destino}
                onClick={(e) => {
                  e.preventDefault()
                  ir(l.destino)
                }}
                className="group relative text-[0.95rem] font-medium"
              >
                {l.rotulo}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-500 ease-[var(--ease-kyo)] group-hover:origin-left group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-2 text-xs font-medium opacity-80 xl:inline-flex"
              title="Calculado agora, no horário de Brasília"
            >
              <span
                className={cn(
                  'pulso relative h-1.5 w-1.5 rounded-full',
                  estado.aberto ? 'bg-matcha' : 'bg-cinza',
                )}
              />
              {estado.rotulo}
            </span>
            <a
              href={CASA.delivery}
              target="_blank"
              rel="noopener"
              onClick={() => registrar('delivery_clique', { origem: 'cabecalho' })}
              className="botao botao-shu hidden min-h-10 px-5 text-sm sm:inline-flex"
              data-cursor="Pedir"
            >
              Pedir agora
            </a>
            <button
              ref={botaoRef}
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              aria-controls="menu-completo"
              aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-current/25 lg:hidden"
            >
              <span
                className={cn(
                  'absolute h-px w-4 bg-current transition-transform duration-500 ease-[var(--ease-kyo)]',
                  aberto ? 'rotate-45' : '-translate-y-[3px]',
                )}
              />
              <span
                className={cn(
                  'absolute h-px w-4 bg-current transition-transform duration-500 ease-[var(--ease-kyo)]',
                  aberto ? '-rotate-45' : 'translate-y-[3px]',
                )}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {aberto && (
          <motion.div
            id="menu-completo"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="menu-painel fixed inset-0 z-[190] flex flex-col bg-sumi pt-28 pb-10 text-washi"
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <div className="container-x flex flex-1 flex-col justify-between gap-10">
              <nav aria-label="Menu completo">
                <ul className="flex flex-col gap-1">
                  {LINKS.map((l, i) => (
                    <li key={l.rotulo} className="menu-item" style={{ ['--i' as string]: i }}>
                      <a
                        href={l.destino.startsWith('#') ? `/${l.destino}` : l.destino}
                        onClick={(e) => {
                          e.preventDefault()
                          ir(l.destino)
                        }}
                        className="font-display text-[2.6rem] leading-[1.15] font-light tracking-[-0.02em]"
                      >
                        {l.rotulo}
                      </a>
                    </li>
                  ))}
                  <li className="menu-item" style={{ ['--i' as string]: 4 }}>
                    <a
                      href={CASA.delivery}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-3 font-display text-[2.6rem] leading-[1.15] font-light tracking-[-0.02em] text-shu"
                    >
                      Pedir agora <IconeSetaDiagonal className="h-6 w-6" />
                    </a>
                  </li>
                </ul>
              </nav>
              <div
                className="menu-item flex items-end justify-between"
                style={{ ['--i' as string]: 6 }}
              >
                <p className="text-sm text-cinza">{estado.rotulo}</p>
                <Ja termo="bemVindo" vertical className="text-2xl text-hinoki/60" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
