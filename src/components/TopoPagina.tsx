import type { ReactNode } from 'react'
import type { TERMOS } from '@/lib/kanji'
import { cn } from '@/lib/utils'
import { Ja } from './Ja'
import { SplitHeading } from './Reveal'

type Props = {
  rotulo: string
  titulo: string
  kanji?: keyof typeof TERMOS
  apoio?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * O topo das páginas internas: noite, título grande, o termo japonês na borda.
 *
 * É mais baixo que o herói da home de propósito — quem abre /cardapio veio
 * consultar, e o conteúdo precisa começar na primeira dobra do celular.
 */
export function TopoPagina({ rotulo, titulo, kanji, apoio, children, className }: Props) {
  return (
    <section
      data-tema="escuro"
      className={cn(
        'relative overflow-hidden bg-sumi pt-36 pb-16 text-washi sm:pt-44 sm:pb-20',
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(40% 60% at 85% 20%, rgba(201,21,25,0.16), transparent 70%)',
        }}
      />
      {kanji && (
        <Ja
          termo={kanji}
          vertical
          className="absolute top-28 right-5 text-[clamp(2.5rem,7vw,5.5rem)] leading-none text-washi/[0.07] sm:right-10"
        />
      )}
      <div className="container-x relative">
        <p className="rotulo mb-6 flex items-center gap-3 text-kin">
          <span aria-hidden className="h-px w-8 bg-current" />
          {rotulo}
        </p>
        <h1 className="max-w-[20ch] text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.95] font-light tracking-[-0.035em] [font-variation-settings:'opsz'_144]">
          <SplitHeading text={titulo} />
        </h1>
        {apoio && (
          <div className="mt-7 max-w-[56ch] text-[1.08rem] leading-relaxed text-nevoa">{apoio}</div>
        )}
        {children}
      </div>
    </section>
  )
}
