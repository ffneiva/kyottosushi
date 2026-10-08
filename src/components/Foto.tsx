import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Foto de prato do cardápio: AVIF com WebP de reserva, 360 px (e 720 px nos
 * destaques). Enquanto não chega, o quadro mostra a cor dominante da própria
 * foto — passada por quem chama, que já tem o manifesto carregado.
 *
 * As dimensões são sempre explícitas: sem elas a lista do cardápio pularia a
 * cada foto que chega, e o CLS do celular iria para o vermelho.
 */
type FotoPratoProps = {
  nome: string
  alt: string
  /** Tem a versão de 720 px (ver assets-src/cardapio/destaques.txt). */
  grande?: boolean
  sizes?: string
  cor?: string
  className?: string
  prioridade?: boolean
}

export function FotoPrato({
  nome,
  alt,
  grande = false,
  sizes = '(min-width: 1024px) 180px, 40vw',
  cor,
  className,
  prioridade = false,
}: FotoPratoProps) {
  const [carregou, setCarregou] = useState(false)
  const base = `/images/cardapio/${nome}`
  const srcset = (ext: string) =>
    grande ? `${base}-360.${ext} 360w, ${base}-720.${ext} 720w` : `${base}-360.${ext} 360w`

  return (
    <picture
      className={cn('block overflow-hidden', className)}
      style={{ backgroundColor: cor ?? 'color-mix(in oklab, currentColor 8%, transparent)' }}
    >
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src={`${base}-360.webp`}
        alt={alt}
        width={360}
        height={360}
        loading={prioridade ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setCarregou(true)}
        className={cn(
          'h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-kyo)]',
          carregou ? 'opacity-100' : 'opacity-0',
        )}
      />
    </picture>
  )
}
