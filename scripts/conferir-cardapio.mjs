/**
 * Confere o cardápio do site contra o app de pedidos da casa.
 *
 *   npm run cardapio:conferir
 *
 * O cardápio do site é curado à mão em src/lib/business.ts (são 17 itens, e o
 * texto do app precisa de revisão antes de ir para a página). O risco disso é
 * o preço mudar no app e continuar velho no site — e preço errado no site é
 * cliente discutindo na entrega.
 *
 * Este script lê a página do Mata Foomi (o cardápio vem renderizado no HTML,
 * não há API pública), extrai nome e preço de cada item e aponta: item novo no
 * app, item que sumiu do app e preço diferente. Sai com código 1 se houver
 * divergência, para poder rodar num cron ou no CI.
 */
import { CARDAPIO } from '../src/lib/business.ts'

const URL_APP = 'https://matafoomi.com.br/kyottosushi'

const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const html = await fetch(URL_APP, { headers: { 'User-Agent': 'Mozilla/5.0 kyotto-site' } }).then(
  (r) => r.text(),
)

const noApp = new Map()
for (const [, id, nome] of html.matchAll(/id="item_name_(\d+)"[^>]*>([^<]+)</g)) {
  const preco = html.match(new RegExp(`priceItem_${id} = '([\\d.]+)'`))?.[1]
  if (preco) noApp.set(normalizar(nome), { nome: nome.trim(), preco: Number(preco) })
}

if (noApp.size === 0) {
  console.error('Nenhum item lido do app — o formato da página mudou. Conferir à mão.')
  process.exit(2)
}

let divergencias = 0
const vistos = new Set()
for (const item of CARDAPIO) {
  const chave = normalizar(item.nome)
  const app = noApp.get(chave)
  vistos.add(chave)
  if (!app) {
    console.log(`  SUMIU DO APP   ${item.nome}`)
    divergencias++
  } else if (Math.round(app.preco * 100) !== Math.round(item.preco * 100)) {
    console.log(
      `  PREÇO          ${item.nome}: site ${item.preco.toFixed(2)} · app ${app.preco.toFixed(2)}`,
    )
    divergencias++
  }
}
for (const [chave, app] of noApp) {
  if (!vistos.has(chave)) {
    console.log(`  NOVO NO APP    ${app.nome} (${app.preco.toFixed(2)})`)
    divergencias++
  }
}

console.log(
  divergencias === 0
    ? `✅ ${CARDAPIO.length} itens conferidos: site e app batem.`
    : `❌ ${divergencias} divergência(s). Ajuste src/lib/business.ts.`,
)
process.exit(divergencias === 0 ? 0 : 1)
