import { describe, expect, it } from 'vitest'
import { CARDAPIO, CASA } from '@/lib/business'
import {
  alterar,
  centavos,
  emReais,
  faltaParaMinimo,
  linhas,
  linkWhatsApp,
  MAXIMO_POR_ITEM,
  mensagem,
  quantidadeTotal,
  SACOLA_VAZIA,
  type Sacola,
  totalCentavos,
  validar,
} from '@/lib/pedido'

const dados = { nome: 'Ana', endereco: 'Rua 5, 120, Centro', pagamento: 'Cartão' }

function com(...pares: Array<[string, number]>): Sacola {
  return pares.reduce<Sacola>((s, [id, q]) => alterar(s, id, q), SACOLA_VAZIA)
}

describe('sacola', () => {
  it('soma, tira e remove o item ao chegar a zero', () => {
    let s = alterar(SACOLA_VAZIA, 'monte-fuji', 1)
    s = alterar(s, 'monte-fuji', 1)
    expect(s).toEqual({ 'monte-fuji': 2 })
    s = alterar(s, 'monte-fuji', -5)
    expect(s).toEqual({})
  })

  it('ignora item que não existe e respeita o máximo por item', () => {
    expect(alterar(SACOLA_VAZIA, 'pizza', 1)).toBe(SACOLA_VAZIA)
    expect(alterar(SACOLA_VAZIA, 'haru', 999)).toEqual({ haru: MAXIMO_POR_ITEM })
  })

  it('não altera a sacola original (imutável)', () => {
    const s = com(['haru', 1])
    alterar(s, 'haru', 1)
    expect(s).toEqual({ haru: 1 })
  })

  it('linhas seguem a ordem da sacola e trazem o subtotal', () => {
    const l = linhas(com(['combo-temu', 3]))
    expect(l).toHaveLength(1)
    expect(l[0].subtotalCentavos).toBe(13473)
  })
})

describe('conta em centavos', () => {
  it('nenhuma combinação de item e quantidade tem erro de ponto flutuante', () => {
    for (const item of CARDAPIO) {
      for (let q = 1; q <= MAXIMO_POR_ITEM; q++) {
        const total = totalCentavos(com([item.id, q]))
        expect(Number.isInteger(total)).toBe(true)
        expect(total).toBe(Math.round(item.preco * 100) * q)
        expect(emReais(total)).toMatch(/^R\$ \d{1,3}(\.\d{3})*,\d{2}$/)
      }
    }
  })

  it('pares de itens somam exatamente', () => {
    for (const a of CARDAPIO) {
      for (const b of CARDAPIO) {
        if (a.id === b.id) continue
        expect(totalCentavos(com([a.id, 1], [b.id, 2]))).toBe(
          centavos(a.preco) + 2 * centavos(b.preco),
        )
      }
    }
  })

  it('formata em reais', () => {
    expect(emReais(4000)).toBe('R$ 40,00')
    expect(emReais(123456)).toBe('R$ 1.234,56')
  })
})

describe('pedido mínimo', () => {
  it('calcula o que falta e zera ao passar', () => {
    expect(faltaParaMinimo(SACOLA_VAZIA)).toBe(centavos(CASA.pedidoMinimo))
    expect(faltaParaMinimo(com(['combo-happy-sushi', 1]))).toBe(500)
    expect(faltaParaMinimo(com(['combo-happy-sushi', 2]))).toBe(0)
  })

  it('todo item sozinho: válido se e só se passa do mínimo', () => {
    for (const item of CARDAPIO) {
      const r = validar(com([item.id, 1]), dados)
      expect(r.ok, item.nome).toBe(item.preco >= CASA.pedidoMinimo)
    }
  })
})

describe('validação', () => {
  const cheia = com(['combo-umi', 1])
  it.each([
    [SACOLA_VAZIA, dados, /vazia/],
    [com(['kyotto-experience', 1]), dados, /mínimo/],
    [cheia, { ...dados, nome: ' ' }, /nome/],
    [cheia, { ...dados, endereco: 'Rua' }, /endereço/],
  ] as const)('recusa %#', (sacola, d, motivo) => {
    const r = validar(sacola, d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(motivo)
  })

  it('aceita um pedido completo', () => {
    expect(validar(cheia, dados)).toEqual({ ok: true })
  })
})

describe('mensagem', () => {
  it('uma linha por item, subtotal e a pergunta da taxa', () => {
    const s = com(['combo-sakura', 2], ['monte-fuji', 1])
    expect(mensagem(s, { ...dados, observacao: 'sem cebolinha' })).toBe(
      [
        'Olá, Kyotto! Quero fazer um pedido:',
        '',
        '2x Combo Sakura — R$ 135,82',
        '1x Monte Fuji — R$ 44,90',
        '',
        'Subtotal: R$ 180,72',
        '',
        'Nome: Ana',
        'Endereço: Rua 5, 120, Centro',
        'Pagamento: Cartão',
        'Observação: sem cebolinha',
        '',
        'Qual fica a taxa de entrega para o meu endereço?',
      ].join('\n'),
    )
  })

  it('sem pagamento e sem observação, as linhas somem', () => {
    const t = mensagem(com(['haru', 1]), { nome: 'Ana', endereco: 'Rua 5, 120, Centro' })
    expect(t).not.toContain('Pagamento')
    expect(t).not.toContain('Observação')
    expect(quantidadeTotal(com(['haru', 3]))).toBe(3)
  })

  it('o link codifica acento, travessão e quebra de linha', () => {
    expect(linkWhatsApp('Olá\n1x Haru — R$ 54,90', '5562993198480')).toBe(
      'https://wa.me/5562993198480?text=Ol%C3%A1%0A1x%20Haru%20%E2%80%94%20R%24%2054%2C90',
    )
  })
})

describe('cardápio', () => {
  it('ids únicos, preço positivo, grupo válido e foto para todo item', () => {
    expect(new Set(CARDAPIO.map((i) => i.id)).size).toBe(CARDAPIO.length)
    for (const i of CARDAPIO) {
      expect(i.preco, i.nome).toBeGreaterThan(0)
      expect(['criacoes', 'combos', 'porcoes']).toContain(i.grupo)
      expect(i.foto.length).toBeGreaterThan(2)
    }
  })
})
