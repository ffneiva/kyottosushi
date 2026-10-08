import { useEffect, useRef, useState } from 'react'
import type { Rota } from '@/lib/routes'

/**
 * Anuncia a troca de rota para leitores de tela e devolve o foco ao conteúdo.
 *
 * Numa SPA a página muda sem recarregar, e é exatamente isso que quebra a
 * navegação assistiva: o leitor de tela não percebe nada, e o foco do teclado
 * continua no link que foi clicado — que às vezes nem existe mais.
 *
 * A primeira montagem é pulada de propósito: numa carga direta o navegador já
 * anuncia a página, e repetir seria falar duas vezes.
 */
export function useRouteAnnounce(route: Rota) {
  const alvoRef = useRef<HTMLDivElement>(null)
  const [aviso, setAviso] = useState('')
  const primeira = useRef(true)

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }

    setAviso(`${route.rotulo}: ${route.titulo}`)
    alvoRef.current?.focus({ preventScroll: true })
  }, [route])

  return { alvoRef, aviso }
}
