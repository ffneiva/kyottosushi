import { CASA, type Item, itemPorId } from './business.ts'

/**
 * A sacola do site — o pedido montado aqui e entregue no WhatsApp da casa.
 *
 * O site não fecha pedido nem cobra: quem faz isso é o app de pedidos (ou a
 * casa, pelo WhatsApp). O que ele garante é que a lista chegue certa, somada
 * e acima do mínimo, para a conversa começar em "confirmado" e não num
 * interrogatório.
 *
 * Toda conta é feita em CENTAVOS inteiros. Em ponto flutuante, 3 × 44,91 dá
 * 134,73000000000002 — e um centavo a mais na mensagem é um cliente
 * desconfiado do resto.
 */

/** id do item → quantidade. */
export type Sacola = Readonly<Record<string, number>>

export const SACOLA_VAZIA: Sacola = {}

/** Limite por item: acima disso é encomenda, e se combina conversando. */
export const MAXIMO_POR_ITEM = 20

export const centavos = (reais: number) => Math.round(reais * 100)

export function alterar(sacola: Sacola, id: string, delta: number): Sacola {
  if (!itemPorId(id)) return sacola
  const atual = sacola[id] ?? 0
  const nova = Math.max(0, Math.min(MAXIMO_POR_ITEM, atual + delta))
  const resultado = { ...sacola }
  if (nova === 0) delete resultado[id]
  else resultado[id] = nova
  return resultado
}

export type Linha = { item: Item; quantidade: number; subtotalCentavos: number }

/** As linhas da sacola, na ordem do cardápio (não na ordem do clique). */
export function linhas(sacola: Sacola): Linha[] {
  return Object.entries(sacola)
    .map(([id, quantidade]) => ({ item: itemPorId(id), quantidade }))
    .filter((l): l is { item: Item; quantidade: number } => Boolean(l.item) && l.quantidade > 0)
    .map(({ item, quantidade }) => ({
      item,
      quantidade,
      subtotalCentavos: centavos(item.preco) * quantidade,
    }))
}

export function totalCentavos(sacola: Sacola): number {
  return linhas(sacola).reduce((soma, l) => soma + l.subtotalCentavos, 0)
}

export function quantidadeTotal(sacola: Sacola): number {
  return linhas(sacola).reduce((soma, l) => soma + l.quantidade, 0)
}

/** Quanto falta para o pedido mínimo, em centavos (0 se já passou). */
export function faltaParaMinimo(sacola: Sacola): number {
  return Math.max(0, centavos(CASA.pedidoMinimo) - totalCentavos(sacola))
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 13473 → "R$ 134,73" (com espaço comum, não o não separável do Intl). */
export function emReais(valorCentavos: number): string {
  return BRL.format(valorCentavos / 100).replace(/\s/g, ' ')
}

export type Dados = {
  nome: string
  endereco: string
  pagamento?: string
  observacao?: string
}

export type Validacao = { ok: true } | { ok: false; motivo: string }

export function validar(sacola: Sacola, dados: Dados): Validacao {
  if (quantidadeTotal(sacola) === 0) return { ok: false, motivo: 'A sacola está vazia.' }
  const falta = faltaParaMinimo(sacola)
  if (falta > 0) {
    return {
      ok: false,
      motivo: `O pedido mínimo é ${emReais(centavos(CASA.pedidoMinimo))} — faltam ${emReais(falta)}.`,
    }
  }
  if (!dados.nome.trim()) return { ok: false, motivo: 'Diga o seu nome.' }
  if (dados.endereco.trim().length < 8) {
    return { ok: false, motivo: 'Informe o endereço de entrega (rua, número e bairro).' }
  }
  return { ok: true }
}

/**
 * A mensagem que chega no WhatsApp da casa.
 *
 * Uma linha por item, como se anota um pedido na cozinha; o subtotal no fim;
 * e a pergunta da taxa de entrega explícita — ela depende do endereço, e o
 * site não sabe calculá-la. Sem emoji: alguns aparelhos de balcão ainda os
 * mostram como quadradinho.
 */
export function mensagem(sacola: Sacola, dados: Dados): string {
  const l = [
    'Olá, Kyotto! Quero fazer um pedido:',
    '',
    ...linhas(sacola).map(
      (x) => `${x.quantidade}x ${x.item.nome} — ${emReais(x.subtotalCentavos)}`,
    ),
    '',
    `Subtotal: ${emReais(totalCentavos(sacola))}`,
    '',
    `Nome: ${dados.nome.trim()}`,
    `Endereço: ${dados.endereco.trim()}`,
  ]
  if (dados.pagamento?.trim()) l.push(`Pagamento: ${dados.pagamento.trim()}`)
  if (dados.observacao?.trim()) l.push(`Observação: ${dados.observacao.trim()}`)
  l.push('', 'Qual fica a taxa de entrega para o meu endereço?')
  return l.join('\n')
}

export function linkWhatsApp(texto: string, numero: string = CASA.whatsapp): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
