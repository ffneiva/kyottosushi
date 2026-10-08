import { useEffect, useState } from 'react'
import { CASA } from '@/lib/business'
import { type Estado, estadoDa } from '@/lib/hours'
import { cn } from '@/lib/utils'
import { Ja } from './Ja'

/**
 * A casa está aberta agora? Recalculado a cada 30 s.
 *
 * Uma página aberta às 22h55 não pode continuar dizendo "Aberto" depois das
 * 23h — é exatamente a hora em que alguém decide pedir por impulso.
 */
export function useEstado(): Estado {
  const [estado, setEstado] = useState(() => estadoDa(CASA.semana))
  useEffect(() => {
    const id = window.setInterval(() => setEstado(estadoDa(CASA.semana)), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return estado
}

/**
 * A plaquinha da porta de um restaurante no Japão — "eigyōchū" (aberto) ou
 * "junbichū" (em preparação) — com o rótulo em português ao lado.
 */
export function SeloEstado({ className }: { className?: string }) {
  const estado = useEstado()
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-sm', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.7rem] leading-none',
          estado.aberto ? 'bg-shu text-washi' : 'border border-washi/25 text-nevoa',
        )}
      >
        <Ja termo={estado.aberto ? 'aberto' : 'preparando'} />
      </span>
      <span className="text-nevoa">{estado.rotulo}</span>
    </span>
  )
}
