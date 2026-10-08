import { TERMOS } from '@/lib/kanji'
import { cn } from '@/lib/utils'

type Props = {
  termo: keyof typeof TERMOS
  className?: string
  /** Texto vertical (tategaki). */
  vertical?: boolean
  /**
   * Decorativo: esconde do leitor de tela.
   *
   * Quase sempre é o caso — o kanji acompanha um título em português que já
   * diz a mesma coisa, e ler "oshinagaki, cardápio" antes de "Cardápio" seria
   * ruído. Quando o termo é o único rótulo (o selo de "aberto"), passe `false`.
   */
  decorativo?: boolean
}

/**
 * Um termo japonês, sempre com `lang="ja"`.
 *
 * O atributo não é detalhe: pela unificação Han, o mesmo código Unicode tem
 * desenho japonês e chinês, e sem ele o navegador pode escolher o chinês. O
 * `title` mostra leitura e sentido a quem passa o mouse — quem não lê japonês
 * fica sabendo o que está vendo, e quem lê confere que não é enfeite errado.
 */
export function Ja({ termo, className, vertical = false, decorativo = true }: Props) {
  const { ja, leitura, sentido } = TERMOS[termo]

  const kanji = (
    <span
      lang="ja"
      title={`${leitura} — ${sentido}`}
      aria-hidden="true"
      className={cn(vertical && 'tategaki', className)}
    >
      {ja}
    </span>
  )
  if (decorativo) return kanji
  // Quando o termo é o único rótulo, o leitor de tela ouve o sentido em
  // português — e não uma leitura em japonês que ninguém pediu.
  return (
    <>
      {kanji}
      <span className="sr-only">{sentido}</span>
    </>
  )
}
