import { LETREIRO } from '@/lib/marca'
import { cn } from '@/lib/utils'

/**
 * O letreiro "KYOTTO" em pincel — vetor, pintado com `currentColor`.
 *
 * No logo da casa ele é creme sobre preto; aqui acompanha a cor do texto em
 * volta, e o mesmo componente serve sobre a noite e sobre o papel.
 */
export function Letreiro({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      viewBox={LETREIRO.viewBox}
      className={cn('block h-auto', className)}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <path d={LETREIRO.d} fillRule="evenodd" fill="currentColor" />
    </svg>
  )
}

/**
 * O selo da casa: o gato da sorte no círculo preto e vermelho.
 *
 * `prioridade` só no cabeçalho e na abertura, que aparecem no primeiro paint;
 * nos demais lugares ele chega sob demanda.
 */
export function Selo({
  className,
  tamanho = 320,
  prioridade = false,
  alt = '',
}: {
  className?: string
  tamanho?: 160 | 320
  prioridade?: boolean
  alt?: string
}) {
  return (
    <picture className={cn('block shrink-0', className)}>
      <source type="image/avif" srcSet={`/images/selo-${tamanho}.avif`} />
      <source type="image/webp" srcSet={`/images/selo-${tamanho}.webp`} />
      <img
        src="/images/selo.png"
        alt={alt}
        width={tamanho}
        height={tamanho}
        loading={prioridade ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full rounded-full"
      />
    </picture>
  )
}

/**
 * Selo + letreiro + "SUSHI", como no logo. `compacto` recolhe a linha de
 * baixo quando o cabeçalho encolhe.
 */
export function Logo({
  className,
  compacto = false,
  claro = false,
}: {
  className?: string
  compacto?: boolean
  /** Sobre o papel: o vermelho da marca. Sobre a noite: o tom legível. */
  claro?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Selo tamanho={160} prioridade className="h-11 w-11 sm:h-12 sm:w-12" />
      <span className="flex flex-col items-center leading-none">
        <Letreiro className="w-[6.4rem] sm:w-[7rem]" />
        <span
          className={cn(
            'font-display text-[0.7rem] font-bold tracking-[0.34em] transition-[opacity,max-height,margin] duration-500',
            claro ? 'text-shu' : 'text-shu-claro',
            compacto ? 'mt-0 max-h-0 opacity-0' : 'mt-1 max-h-4 opacity-100',
          )}
        >
          SUSHI
        </span>
      </span>
    </span>
  )
}
