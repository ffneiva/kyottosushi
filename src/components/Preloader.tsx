import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { Selo } from './Logo'

/**
 * A abertura: o noren.
 *
 * Noren é a cortina fendida pendurada na porta de um restaurante
 * japonês — ela está lá quando a casa está aberta, e é afastando as duas
 * metades que se entra. A abertura do site é esse gesto: o selo aparece, as
 * duas metades se abrem, a casa está servida. No centro, o selo do gato da sorte.
 *
 * Três regras:
 *
 * · **Só na home e só uma vez por sessão.** Quem chega por um link de
 *   /cardapio vindo do Instagram quer o cardápio, não uma cortina.
 * · **Curta.** ~1,9 s do primeiro quadro à página livre. Não espera fonte nem
 *   3D: o noren cobre a troca de fonte, e a cena 3D chega quando chegar.
 * · **Nunca prende a página.** Com movimento reduzido ela não existe; e se a
 *   animação não disparar por qualquer motivo, um temporizador libera tudo.
 */
const CHAVE = 'kyotto:abertura'

function jaViu(): boolean {
  try {
    return sessionStorage.getItem(CHAVE) === '1'
  } catch {
    // Armazenamento bloqueado (aba privada em alguns navegadores): mostrar de
    // novo é o erro menos grave.
    return false
  }
}

function marcarComoVista() {
  try {
    sessionStorage.setItem(CHAVE, '1')
  } catch {
    /* idem */
  }
}

export function devePreCarregar(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !jaViu()
}

type Props = { aoTerminar: () => void }

export function Preloader({ aoTerminar }: Props) {
  const reduzido = useReducedMotion()
  const [fase, setFase] = useState<'selo' | 'abrindo' | 'fim'>('selo')

  useEffect(() => {
    if (reduzido) {
      setFase('fim')
      aoTerminar()
      return
    }
    marcarComoVista()
    const abrir = window.setTimeout(() => setFase('abrindo'), 750)
    // O herói começa a entrar enquanto a cortina ainda corre: a página "já
    // está lá atrás" quando o noren se abre, em vez de aparecer depois.
    const liberar = window.setTimeout(aoTerminar, 1050)
    const fim = window.setTimeout(() => setFase('fim'), 1950)
    return () => {
      window.clearTimeout(abrir)
      window.clearTimeout(liberar)
      window.clearTimeout(fim)
    }
  }, [reduzido, aoTerminar])

  if (fase === 'fim') return null

  const metade =
    'absolute inset-y-0 w-1/2 bg-sumi-2 text-carvao seigaiha [--onda:rgba(201,21,25,0.10)]'

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[500] overflow-hidden ${fase === 'abrindo' ? 'noren-abrindo' : ''}`}
    >
      <div className={`noren-esq left-0 ${metade}`}>
        <div className="absolute inset-y-0 right-0 w-px bg-hinoki/20" />
      </div>
      <div className={`noren-dir right-0 ${metade}`} />
      <div className="absolute inset-0 grid place-items-center">
        <Selo tamanho={320} prioridade className="noren-selo h-36 w-36 sm:h-44 sm:w-44" />
      </div>
    </div>
  )
}
