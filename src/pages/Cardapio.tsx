import { useEffect, useState } from 'react'
import { FotoPrato } from '@/components/Foto'
import {
  IconeMais,
  IconeMenos,
  IconeSacola,
  IconeSetaDiagonal,
  IconeWhatsApp,
} from '@/components/Icones'
import { TopoPagina } from '@/components/TopoPagina'
import CORES from '@/data/fotos-cardapio.json'
import { registrar, registrarConversaoWhatsApp } from '@/lib/analytics'
import { CARDAPIO, CASA, GRUPOS, type Grupo, type Item } from '@/lib/business'
import {
  alterar,
  centavos,
  emReais,
  faltaParaMinimo,
  linhas,
  linkWhatsApp,
  mensagem,
  quantidadeTotal,
  SACOLA_VAZIA,
  type Sacola,
  totalCentavos,
  validar,
} from '@/lib/pedido'
import { cn } from '@/lib/utils'

const CORES_FOTO = CORES as Record<string, string>
const CHAVE = 'kyotto:sacola'
const ORDEM: Grupo[] = ['criacoes', 'combos', 'porcoes']

/**
 * A sacola sobrevive a um recarregamento — quem monta o pedido, sai para
 * perguntar à família o que querem e volta, encontra tudo lá. É conveniência
 * deste aparelho, e só: qualquer falha do armazenamento vira sacola vazia.
 */
function lerSacola(): Sacola {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, unknown>
    let s: Sacola = SACOLA_VAZIA
    for (const [id, q] of Object.entries(bruto)) if (typeof q === 'number') s = alterar(s, id, q)
    return s
  } catch {
    return SACOLA_VAZIA
  }
}

/**
 * /cardapio — o cardápio inteiro, com preço, e a sacola.
 *
 * O site não fecha pedido: a sacola vira uma mensagem pronta no WhatsApp da
 * casa, ou a pessoa segue para o app, que calcula a entrega. O que a sacola
 * garante é a conta certa e o pedido acima do mínimo antes de a conversa
 * começar.
 */
export default function Cardapio() {
  const [sacola, setSacola] = useState<Sacola>(lerSacola)
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tentou, setTentou] = useState(false)
  const [sacolaNaTela, setSacolaNaTela] = useState(false)

  // A barra do celular leva até a sacola; com a sacola já na tela, ela só
  // cobriria o botão de enviar.
  useEffect(() => {
    const alvo = document.getElementById('sacola')
    if (!alvo) return
    const io = new IntersectionObserver(([e]) => setSacolaNaTela(e.isIntersecting), {
      rootMargin: '0px 0px -30% 0px',
    })
    io.observe(alvo)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(sacola))
    } catch {
      /* armazenamento bloqueado: a sacola vive só nesta aba */
    }
  }, [sacola])

  const mudar = (id: string, delta: number) => setSacola((s) => alterar(s, id, delta))
  const dados = { nome, endereco, pagamento, observacao }
  const validacao = validar(sacola, dados)
  const total = totalCentavos(sacola)
  const qtd = quantidadeTotal(sacola)
  const falta = faltaParaMinimo(sacola)
  const progresso = Math.min(1, total / centavos(CASA.pedidoMinimo))

  const enviar = () => {
    setTentou(true)
    if (!validacao.ok) return
    registrarConversaoWhatsApp('sacola')
    registrar('pedido_montado', { itens: qtd, total: total / 100 })
    window.open(linkWhatsApp(mensagem(sacola, dados)), '_blank', 'noopener')
  }

  return (
    <>
      <TopoPagina
        rotulo="Cardápio"
        titulo="O cardápio inteiro, com preço."
        kanji="cardapio"
        apoio={`Toque em + para montar o pedido: a soma aparece na hora, e o pedido sai pronto no WhatsApp da casa — ou siga para o app. Pedido mínimo de R$ ${CASA.pedidoMinimo},00.`}
      />

      <section data-tema="claro" className="papel pt-14 pb-40 lg:pb-28">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <div className="min-w-0">
            <nav aria-label="Grupos do cardápio" className="mb-10 flex flex-wrap gap-2">
              {ORDEM.map((g) => (
                <a
                  key={g}
                  href={`#grupo-${g}`}
                  className="rounded-full border border-sumi/15 px-4 py-2 text-sm font-medium hover:border-sumi/40"
                >
                  {GRUPOS[g].nome}
                </a>
              ))}
            </nav>

            {ORDEM.map((g) => (
              <section
                key={g}
                id={`grupo-${g}`}
                aria-labelledby={`t-${g}`}
                className="mb-16 scroll-mt-24"
              >
                <h2
                  id={`t-${g}`}
                  className="border-b border-sumi/15 pb-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-light tracking-[-0.02em]"
                >
                  {GRUPOS[g].nome}
                </h2>
                <p className="mt-3 mb-4 max-w-[52ch] text-tinta">{GRUPOS[g].texto}</p>
                <ul>
                  {CARDAPIO.filter((i) => i.grupo === g).map((item) => (
                    <ItemDoCardapio
                      key={item.id}
                      item={item}
                      quantidade={sacola[item.id] ?? 0}
                      mudar={mudar}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside id="sacola" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[1.5rem] bg-sumi p-6 text-washi sm:p-7">
              <p className="rotulo flex items-center gap-2 text-kin">
                <IconeSacola className="h-4 w-4" /> Sua sacola
              </p>

              {qtd === 0 ? (
                <p className="mt-5 text-nevoa">
                  Vazia por enquanto. Toque em Adicionar nos itens do cardápio.
                </p>
              ) : (
                <ul className="mt-5 flex flex-col gap-2.5">
                  {linhas(sacola).map((l) => (
                    <li
                      key={l.item.id}
                      className="flex items-baseline justify-between gap-3 text-[0.95rem]"
                    >
                      <span>
                        <span className="font-mono text-kin">{l.quantidade}×</span> {l.item.nome}
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular">
                        {emReais(l.subtotalCentavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 border-t border-washi/10 pt-5">
                <p className="flex items-baseline justify-between">
                  <span className="text-sm text-nevoa">Subtotal</span>
                  <span className="font-display text-3xl tabular">{emReais(total)}</span>
                </p>
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-washi/10"
                  role="progressbar"
                  aria-label="Progresso até o pedido mínimo"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progresso * 100)}
                >
                  <div
                    className={cn(
                      'h-full origin-left rounded-full transition-transform duration-500 ease-[var(--ease-kyo)]',
                      falta === 0 ? 'bg-matcha' : 'bg-shu',
                    )}
                    style={{ transform: `scaleX(${progresso})` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[0.7rem] text-cinza">
                  {falta === 0
                    ? 'Pedido mínimo atingido. A taxa de entrega depende do endereço.'
                    : `Faltam ${emReais(falta)} para o pedido mínimo de R$ ${CASA.pedidoMinimo},00.`}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Campo
                  rotulo="Seu nome"
                  valor={nome}
                  mudar={setNome}
                  auto="given-name"
                  erro={tentou && !nome.trim()}
                />
                <Campo
                  rotulo="Endereço de entrega"
                  valor={endereco}
                  mudar={setEndereco}
                  auto="street-address"
                  dica="Rua, número e bairro"
                  erro={tentou && endereco.trim().length < 8}
                />
                <fieldset>
                  <legend className="mb-2 font-mono text-[0.66rem] tracking-[0.14em] text-cinza uppercase">
                    Pagamento
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {['Dinheiro', 'Cartão'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={pagamento === p}
                        onClick={() => setPagamento(pagamento === p ? '' : p)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          pagamento === p
                            ? 'border-kin bg-kin text-sumi'
                            : 'border-washi/20 hover:border-washi/50',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Campo rotulo="Observação (opcional)" valor={observacao} mudar={setObservacao} />
              </div>

              <button
                type="button"
                onClick={enviar}
                className="botao botao-shu mt-6 w-full min-h-[3.3rem]"
                data-cursor="Enviar"
              >
                <IconeWhatsApp className="h-5 w-5" /> Enviar pelo WhatsApp
              </button>
              {tentou && !validacao.ok && (
                <p id="erro-sacola" role="alert" className="mt-3 text-sm text-kin">
                  {validacao.motivo}
                </p>
              )}
              <a
                href={CASA.delivery}
                target="_blank"
                rel="noopener"
                onClick={() => registrar('delivery_clique', { origem: 'sacola' })}
                className="mt-4 flex items-center justify-center gap-1.5 text-sm text-nevoa underline underline-offset-4 hover:text-washi"
              >
                Prefere pagar online? Peça pelo app <IconeSetaDiagonal className="h-3.5 w-3.5" />
              </a>
              <p className="mt-4 text-xs leading-relaxed text-cinza">
                O WhatsApp abre com a mensagem pronta; nada é enviado antes de você tocar em enviar
                lá. A casa confirma o pedido e a taxa de entrega na conversa.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* No celular a sacola fica no fim da página: esta barra diz o total e
          leva até ela. Some quando a sacola está vazia. */}
      {qtd > 0 && !sacolaNaTela && (
        <a
          href="#sacola"
          className="fixed inset-x-3 bottom-3 z-[140] flex items-center justify-between gap-4 rounded-2xl bg-shu px-5 py-4 text-washi shadow-[0_18px_40px_-14px_rgba(201,21,25,0.8)] lg:hidden"
        >
          <span className="flex items-center gap-2 font-semibold">
            <IconeSacola className="h-5 w-5" /> {qtd} {qtd === 1 ? 'item' : 'itens'}
          </span>
          <span className="font-mono tabular">{emReais(total)} · Ver sacola</span>
        </a>
      )}
    </>
  )
}

function ItemDoCardapio({
  item,
  quantidade,
  mudar,
}: {
  item: Item
  quantidade: number
  mudar: (id: string, delta: number) => void
}) {
  return (
    <li id={`item-${item.id}`} className="flex scroll-mt-28 gap-4 border-b border-sumi/10 py-5">
      <FotoPrato
        nome={item.foto}
        alt={item.nome}
        cor={CORES_FOTO[item.foto]}
        sizes="112px"
        className="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.05rem] leading-snug font-semibold">{item.nome}</h3>
          <span className="shrink-0 font-mono text-[0.92rem] tabular">
            {emReais(centavos(item.preco))}
          </span>
        </div>
        {item.descricao && (
          <p className="mt-1 text-[0.9rem] leading-relaxed text-tinta">{item.descricao}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="font-mono text-[0.7rem] text-tinta">
            {item.serve ? `serve ${item.serve} ${item.serve === 1 ? 'pessoa' : 'pessoas'}` : ''}
          </span>
          <span className="flex items-center gap-2">
            {quantidade > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => mudar(item.id, -1)}
                  aria-label={`Tirar uma unidade: ${item.nome}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-sumi/20 hover:border-sumi/50"
                >
                  <IconeMenos className="h-4 w-4" />
                </button>
                <output aria-live="polite" className="w-6 text-center font-mono tabular">
                  {quantidade}
                </output>
              </>
            )}
            <button
              type="button"
              onClick={() => mudar(item.id, 1)}
              aria-label={`Adicionar ${item.nome}`}
              className={cn(
                'grid h-9 place-items-center rounded-full transition-colors',
                quantidade > 0
                  ? 'w-9 bg-sumi text-washi'
                  : 'bg-shu px-4 text-sm font-semibold text-washi',
              )}
            >
              {quantidade > 0 ? <IconeMais className="h-4 w-4" /> : 'Adicionar'}
            </button>
          </span>
        </div>
      </div>
    </li>
  )
}

function Campo({
  rotulo,
  valor,
  mudar,
  auto,
  dica,
  erro = false,
}: {
  rotulo: string
  valor: string
  mudar: (v: string) => void
  auto?: string
  dica?: string
  erro?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.66rem] tracking-[0.14em] text-cinza uppercase">
        {rotulo}
      </span>
      <input
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        autoComplete={auto}
        placeholder={dica}
        aria-invalid={erro || undefined}
        aria-describedby={erro ? 'erro-sacola' : undefined}
        className={cn(
          'h-11 rounded-xl border bg-washi/[0.04] px-3.5 text-[0.95rem] text-washi outline-none placeholder:text-cinza focus:border-kin',
          erro ? 'border-shu' : 'border-washi/15',
        )}
      />
    </label>
  )
}
