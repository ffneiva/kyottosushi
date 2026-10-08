import type { ReactNode } from 'react'
import type { TERMOS } from '@/lib/kanji'
import { cn } from '@/lib/utils'
import { Ja } from './Ja'
import { SplitHeading } from './Reveal'

type Props = {
  rotulo: string
  titulo: string
  /** Termo japonês que acompanha a seção, em tipo grande e discreto. */
  kanji?: keyof typeof TERMOS
  apoio?: ReactNode
  className?: string
  /** Nível do título — h2 nas seções da home, h1 no topo das páginas. */
  nivel?: 1 | 2
  centro?: boolean
}

/**
 * O cabeçalho de seção: rótulo em mono, título grande em serifa, e o termo
 * japonês ao lado — o sentido dele está no `title` (ver <Ja>) e no próprio
 * título em português, então para o leitor de tela ele é decorativo.
 */
export function Titulo({
  rotulo,
  titulo,
  kanji,
  apoio,
  className,
  nivel = 2,
  centro = false,
}: Props) {
  const Tag = nivel === 1 ? 'h1' : 'h2'
  return (
    <header className={cn('relative', centro && 'text-center', className)}>
      <p
        className={cn('rotulo mb-5 flex items-center gap-3 opacity-75', centro && 'justify-center')}
      >
        <span aria-hidden className="h-px w-8 bg-current opacity-50" />
        {rotulo}
      </p>
      <div className={cn('flex items-start gap-6', centro && 'justify-center')}>
        <Tag className="max-w-[18ch] text-[clamp(2.3rem,5.6vw,4.6rem)] leading-[0.98] font-light tracking-[-0.025em] [font-variation-settings:'opsz'_144]">
          <SplitHeading text={titulo} />
        </Tag>
        {kanji && (
          <Ja
            termo={kanji}
            vertical
            // Dourado sobre a noite; sobre o papel, sumi — dourado em fundo claro
            // não tem contraste.
            className="mt-2 hidden text-[1.35rem] leading-none text-kin opacity-90 sm:block in-data-[tema=claro]:text-sumi/55"
          />
        )}
      </div>
      {apoio && (
        <div
          className={cn(
            'mt-6 max-w-[54ch] text-[1.05rem] leading-relaxed opacity-80',
            centro && 'mx-auto',
          )}
        >
          {apoio}
        </div>
      )}
    </header>
  )
}
