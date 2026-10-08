import { useEffect, useState } from 'react'
import { registrarConversaoWhatsApp } from '@/lib/analytics'
import { linkWhatsApp } from '@/lib/pedido'
import { cn } from '@/lib/utils'
import { IconeWhatsApp } from './Icones'

/**
 * O botão flutuante de WhatsApp.
 *
 * Só aparece depois da primeira dobra: no topo, o herói já tem os dois
 * caminhos de pedido, e um botão flutuante sobre a peça 3D competiria com
 * eles. No /cardapio ele some — lá a sacola é o caminho para o WhatsApp.
 */
export function WhatsAppFab({ oculto = false }: { oculto?: boolean }) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.6)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  if (oculto) return null

  return (
    <a
      href={linkWhatsApp('Olá, Kyotto! Vim pelo site.')}
      target="_blank"
      rel="noopener"
      onClick={() => registrarConversaoWhatsApp('flutuante')}
      aria-label="Falar com o Kyotto no WhatsApp"
      className={cn(
        'fixed right-4 bottom-4 z-[150] grid h-14 w-14 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-[0_14px_34px_-10px_rgba(31,122,77,0.8)] transition-[opacity,transform] duration-500 ease-[var(--ease-kyo)] hover:scale-105 sm:right-6 sm:bottom-6',
        visivel ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <IconeWhatsApp className="h-7 w-7" />
    </a>
  )
}
