import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Faixa que corre infinitamente.
 *
 * O truque é duplicar o conteúdo e transladar exatamente −50%: quando a
 * animação reinicia, a segunda cópia está no pixel em que a primeira começou,
 * e a emenda é invisível. Qualquer outro valor produz um salto perceptível.
 *
 * A duplicata leva `aria-hidden`: o leitor de tela deve ler a frase uma vez,
 * não duas. E a máscara nas pontas existe porque, sem ela, o texto "bate" na
 * borda da tela em vez de desaparecer — a faixa passa a parecer um bloco
 * cortado, não um fluxo contínuo.
 */
type Props = {
  children: ReactNode
  /** Segundos para percorrer um ciclo. Maior = mais lento. */
  duracao?: number
  className?: string
}

const MASCARA = 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)'

export function Marquee({ children, duracao = 34, className }: Props) {
  return (
    <div
      // O transbordo aqui é o efeito, não um defeito: a faixa é mais larga que
      // a tela por definição. O atributo diz isso ao teste de recorte
      // (tests/e2e/acessibilidade), que de outro modo apontaria a marquise
      // toda vez.
      data-transbordo-intencional
      className={cn('group relative flex overflow-hidden', className)}
      style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
    >
      {[0, 1].map((copia) => (
        <div
          key={copia}
          aria-hidden={copia === 1}
          className="flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{
            animation: `marquee-x ${duracao}s linear infinite`,
          }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
