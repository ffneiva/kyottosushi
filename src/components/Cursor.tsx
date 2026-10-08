import { useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from '@/hooks/useMediaQuery'

/**
 * Cursor da marca.
 *
 * Um ponto sólido que segue o mouse quase na hora e um anel que chega
 * atrasado — a diferença de latência entre os dois é o que dá sensação de
 * peso. Sobre qualquer elemento com `data-cursor="…"`, o anel cresce e o
 * rótulo aparece, então o cursor vira parte da interface em vez de enfeite.
 *
 * Escrito com um único `requestAnimationFrame` em vez de `gsap.quickTo`.
 * Seria o único uso de GSAP presente em TODAS as páginas, e ~30 linhas de
 * interpolação valem os 44 kB que a biblioteca custaria antes do primeiro
 * paint em /cardapio.
 *
 * O amortecimento é exponencial no tempo decorrido, não um passo fixo por
 * quadro: com passo fixo o cursor fica visivelmente mais rápido num monitor de
 * 144 Hz do que num de 60 Hz.
 *
 * Some em toque e para quem pediu movimento reduzido.
 */

/** Fração do caminho restante percorrida a cada quadro de 60 Hz. */
const VELOCIDADE_PONTO = 0.35
const VELOCIDADE_ANEL = 0.13

export function Cursor() {
  const pontoRef = useRef<HTMLDivElement>(null)
  const anelRef = useRef<HTMLDivElement>(null)
  const rotuloRef = useRef<HTMLDivElement>(null)
  const fino = useFinePointer()
  const reduzido = useReducedMotion()

  useEffect(() => {
    const ponto = pontoRef.current
    const anel = anelRef.current
    const rotulo = rotuloRef.current
    if (!ponto || !anel || !rotulo || !fino || reduzido) return

    document.documentElement.style.cursor = 'none'

    const alvo = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const posPonto = { ...alvo }
    const posAnel = { ...alvo }
    let escalaAlvo = 1
    let escala = 1
    let visivel = false
    let frame = 0
    let ultimo = performance.now()

    const laco = (agora: number) => {
      const delta = Math.min(0.064, (agora - ultimo) / 1000)
      ultimo = agora

      const kPonto = 1 - (1 - VELOCIDADE_PONTO) ** (delta * 60)
      const kAnel = 1 - (1 - VELOCIDADE_ANEL) ** (delta * 60)

      posPonto.x += (alvo.x - posPonto.x) * kPonto
      posPonto.y += (alvo.y - posPonto.y) * kPonto
      posAnel.x += (alvo.x - posAnel.x) * kAnel
      posAnel.y += (alvo.y - posAnel.y) * kAnel
      escala += (escalaAlvo - escala) * kAnel

      ponto.style.transform = `translate3d(${posPonto.x}px, ${posPonto.y}px, 0)`
      anel.style.transform = `translate3d(${posAnel.x}px, ${posAnel.y}px, 0) scale(${escala.toFixed(3)})`
      rotulo.style.transform = `translate3d(${posAnel.x}px, ${posAnel.y}px, 0) translate(-50%, -50%)`

      frame = requestAnimationFrame(laco)
    }

    const aoMover = (e: PointerEvent) => {
      alvo.x = e.clientX
      alvo.y = e.clientY
      if (!visivel) {
        visivel = true
        ponto.style.opacity = '1'
        anel.style.opacity = '1'
      }
    }

    /**
     * O estado do cursor sai de três fontes, nesta ordem: um elemento com
     * `data-cursor` (rótulo explícito), a peça 3D sob o ponteiro (a cena avisa
     * pelo evento `kyotto:peca`, porque o canvas não recebe eventos) e, por
     * fim, qualquer elemento interativo.
     */
    let ultimoAlvo: HTMLElement | null = null
    let rotuloDaCena: string | null = null

    const comRotulo = (texto: string) => {
      rotulo.textContent = texto
      escalaAlvo = 3.4
      rotulo.style.opacity = '1'
      ponto.style.opacity = '0'
      // Com rótulo, o anel vira um disco no vermelho da casa, texto em creme.
      anel.style.borderColor = 'rgba(201,21,25,0)'
      anel.style.backgroundColor = 'rgba(201,21,25,0.95)'
    }

    const aplicar = () => {
      const el = ultimoAlvo
      const marcado = el?.closest<HTMLElement>('[data-cursor]')
      const interativo = el?.closest('a, button, [role="button"], input, textarea, select, summary')

      if (marcado?.dataset.cursor) {
        comRotulo(marcado.dataset.cursor)
      } else if (interativo) {
        anel.style.backgroundColor = 'rgba(201,21,25,0)'
        escalaAlvo = 1.9
        rotulo.style.opacity = '0'
        ponto.style.opacity = visivel ? '0.5' : '0'
        anel.style.borderColor = 'rgba(201,21,25,0.9)'
      } else if (rotuloDaCena) {
        comRotulo(rotuloDaCena)
      } else {
        escalaAlvo = 1
        rotulo.style.opacity = '0'
        ponto.style.opacity = visivel ? '1' : '0'
        anel.style.borderColor = 'rgba(163,152,137,0.6)'
        anel.style.backgroundColor = 'rgba(201,21,25,0)'
      }
    }

    const aoPassar = (e: PointerEvent) => {
      ultimoAlvo = e.target as HTMLElement | null
      aplicar()
    }

    const aoPecaDaCena = (e: Event) => {
      rotuloDaCena = (e as CustomEvent<string | null>).detail
      aplicar()
    }

    const aoApertar = () => {
      escalaAlvo *= 0.8
    }
    const aoSoltar = () => {
      escalaAlvo /= 0.8
    }
    const aoSair = () => {
      visivel = false
      ponto.style.opacity = '0'
      anel.style.opacity = '0'
      rotulo.style.opacity = '0'
    }

    window.addEventListener('pointermove', aoMover, { passive: true })
    window.addEventListener('pointerover', aoPassar, { passive: true })
    window.addEventListener('kyotto:peca', aoPecaDaCena)
    window.addEventListener('pointerdown', aoApertar)
    window.addEventListener('pointerup', aoSoltar)
    document.addEventListener('pointerleave', aoSair)
    frame = requestAnimationFrame(laco)

    return () => {
      cancelAnimationFrame(frame)
      document.documentElement.style.cursor = ''
      window.removeEventListener('pointermove', aoMover)
      window.removeEventListener('pointerover', aoPassar)
      window.removeEventListener('kyotto:peca', aoPecaDaCena)
      window.removeEventListener('pointerdown', aoApertar)
      window.removeEventListener('pointerup', aoSoltar)
      document.removeEventListener('pointerleave', aoSair)
    }
  }, [fino, reduzido])

  if (!fino || reduzido) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] hidden lg:block">
      <div
        ref={anelRef}
        className="absolute -top-5 -left-5 h-10 w-10 rounded-full border border-cinza/60 opacity-0 transition-[opacity,border-color,background-color] duration-300"
      />
      <div
        ref={rotuloRef}
        className="absolute top-0 left-0 font-mono text-[0.56rem] font-medium tracking-[0.12em] text-washi uppercase opacity-0 transition-opacity duration-300"
      />
      <div
        ref={pontoRef}
        className="absolute -top-[3px] -left-[3px] h-1.5 w-1.5 rounded-full bg-shu opacity-0 transition-opacity duration-300"
      />
    </div>
  )
}
