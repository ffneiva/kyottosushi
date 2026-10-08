/**
 * Smoke test do servidor de desenvolvimento.
 *
 * `vite build` e `vite dev` resolvem módulos por caminhos diferentes: o build
 * passa pelo bundler, o dev pelo servidor de transformação sob demanda. Dá para
 * ter um build verde e um `npm run dev` que quebra no primeiro import — um
 * alias errado aparece como "Failed to resolve import", que nenhuma outra
 * verificação pega.
 *
 * Este script sobe o dev server de verdade, pede a página e percorre o grafo de
 * módulos a partir da entrada, falhando se qualquer import ficar sem resolver.
 *
 *   npm run check:dev
 */
import { createServer } from 'vite'

const ENTRADA = '/src/main.tsx'
const PORTA = 5199

/** Módulos que precisam necessariamente aparecer resolvidos no grafo. */
const OBRIGATORIOS = [
  '/src/App.tsx',
  '/src/components/Preloader.tsx',
  '/src/components/Cena3D.tsx',
  '/src/scene/nigiri.ts',
  '/src/sections/Heroi.tsx',
  '/src/pages/Cardapio.tsx',
  '/src/lib/business.ts',
  '/src/lib/pedido.ts',
  '/src/lib/marca.ts',
]

let falhas = 0
function conferir(nome, ok, detalhe = '') {
  if (!ok) falhas++
  console.log(`${ok ? '  ok ' : 'FALHA'}  ${nome}`)
  if (!ok && detalhe) console.log(`         ${detalhe}`)
}

const servidor = await createServer({
  server: { port: PORTA, strictPort: true, host: '127.0.0.1' },
  logLevel: 'error',
})

try {
  await servidor.listen()
  const base = `http://127.0.0.1:${PORTA}`
  console.log('\n── servidor de desenvolvimento ──────────────────────────')

  const resposta = await fetch(`${base}/`)
  conferir('GET / responde 200', resposta.status === 200, `veio ${resposta.status}`)
  const corpo = await resposta.text()
  conferir('HTML traz o script de entrada', corpo.includes(ENTRADA))

  // Transforma o grafo a partir da entrada. É aqui que um alias quebrado
  // aparece: o Vite responde com um erro de import-analysis, não com 404.
  const vistos = new Set()
  const fila = [ENTRADA]

  while (fila.length) {
    const url = fila.shift()
    if (vistos.has(url)) continue
    vistos.add(url)

    const res = await fetch(base + url)
    if (res.status !== 200) {
      conferir(`${url} responde 200`, false, `veio ${res.status}`)
      continue
    }

    const codigo = await res.text()
    if (/Failed to resolve import/.test(codigo)) {
      conferir(`${url} sem import quebrado`, false, codigo.slice(0, 300))
      continue
    }

    // Segue só os módulos do próprio projeto; node_modules não interessa aqui.
    // O `import(...)` dinâmico entra junto — é justamente por ele que a cena
    // 3D e o GSAP são carregados, e um erro ali só apareceria em produção.
    for (const m of codigo.matchAll(/(?:from|import\()\s*"(\/src\/[^"]+)"/g)) {
      fila.push(m[1].split('?')[0])
    }
  }

  conferir(`grafo transformado sem erros (${vistos.size} módulos)`, true)

  for (const mod of OBRIGATORIOS) {
    conferir(`${mod} está no grafo`, vistos.has(mod), 'não foi alcançado a partir da entrada')
  }
} finally {
  await servidor.close()
}

console.log('')
console.log(
  falhas === 0 ? '✅ O dev server sobe e resolve tudo.' : `❌ ${falhas} verificação(ões) falharam.`,
)
process.exit(falhas === 0 ? 0 : 1)
