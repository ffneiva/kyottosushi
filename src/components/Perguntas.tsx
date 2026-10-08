import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { IconeMais } from './Icones'

type Item = { pergunta: string; resposta: string }

/**
 * Acordeão de perguntas.
 *
 * A altura anima por `grid-template-rows: 0fr → 1fr`, e não por `height`:
 * animar altura força layout a cada quadro, e o `auto` não é interpolável.
 * Com a grade, o conteúdo mede a si mesmo e a transição é só de composição.
 *
 * A resposta fica no DOM mesmo fechada (só recolhida): o Google lê o FAQ que o
 * JSON-LD declara, e ele precisa estar no HTML da página, não só no dado.
 */
export function Perguntas({ itens }: { itens: readonly Item[] }) {
  const [aberta, setAberta] = useState<number | null>(0)
  const id = useId()

  return (
    <ul className={'border-t border-sumi/15'}>
      {itens.map((item, i) => {
        const estaAberta = aberta === i
        return (
          <li key={item.pergunta} className={'border-b border-sumi/15'}>
            <h3>
              <button
                type="button"
                id={`${id}-p${i}`}
                aria-expanded={estaAberta}
                aria-controls={`${id}-r${i}`}
                onClick={() => setAberta(estaAberta ? null : i)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[1.35rem] leading-snug font-normal tracking-[-0.01em] sm:text-[1.6rem]"
              >
                {item.pergunta}
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-[transform,background-color,color] duration-500 ease-[var(--ease-kyo)]',
                    'border-sumi/20',
                    estaAberta && 'rotate-45 border-kin bg-kin text-sumi',
                  )}
                >
                  <IconeMais className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <section
              id={`${id}-r${i}`}
              aria-labelledby={`${id}-p${i}`}
              className="grid transition-[grid-template-rows] duration-500 ease-[var(--ease-kyo)]"
              style={{ gridTemplateRows: estaAberta ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="max-w-[62ch] pb-7 text-[1.02rem] leading-relaxed opacity-80">
                  {item.resposta}
                </p>
              </div>
            </section>
          </li>
        )
      })}
    </ul>
  )
}
