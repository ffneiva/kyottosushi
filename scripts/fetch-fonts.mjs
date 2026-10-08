/**
 * Baixa as fontes do Google e imprime os @font-face já apontando para /fonts.
 *
 * Três famílias latinas (subsets latin + latin-ext) e uma japonesa — esta com
 * um tratamento diferente, que é o motivo de o script existir:
 *
 * Uma fonte japonesa inteira tem mais de 7 mil glifos e pesa alguns megabytes.
 * O site usa uns quarenta. A API do Google aceita `&text=` com exatamente os
 * caracteres desejados e devolve um woff2 só com eles — de ~4 MB para ~15 kB.
 * A lista vem de `KANJI_USADOS` em src/lib/kanji.ts, a mesma constante que os
 * componentes consultam: um kanji novo no site sem entrar lá apareceria em
 * fonte do sistema, e o teste unitário de kanji.ts pega isso antes.
 *
 *   npm run fonts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const OUT = path.join(RAIZ, 'public/fonts')

// O Google só devolve woff2 para User-Agents que reconhece.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const LATINAS = [
  { query: 'family=Fraunces:opsz,wght@9..144,300..600', slug: 'fraunces' },
  { query: 'family=Fraunces:ital,opsz,wght@1,9..144,300..500', slug: 'fraunces-italico' },
  { query: 'family=Hanken+Grotesk:wght@300..700', slug: 'hanken' },
  // Mono para rótulos e preços: números em coluna, registro de etiqueta.
  { query: 'family=JetBrains+Mono:wght@500', slug: 'mono' },
]

const SUBSETS = new Set(['latin', 'latin-ext'])

async function kanjiUsados() {
  const fonte = await readFile(path.join(RAIZ, 'src/lib/kanji.ts'), 'utf8')
  const bloco = fonte.match(/KANJI_USADOS\s*=\s*'([^']+)'/)?.[1]
  if (!bloco) throw new Error('KANJI_USADOS não encontrado em src/lib/kanji.ts')
  return [...new Set(bloco)].join('')
}

async function baixar(url, nome) {
  const bin = await fetch(url).then((r) => r.arrayBuffer())
  await writeFile(path.join(OUT, nome), Buffer.from(bin))
  console.log(`  ${nome}  ${(bin.byteLength / 1024).toFixed(1)} kB`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const blocos = []

  for (const { query, slug } of LATINAS) {
    const css = await fetch(`https://fonts.googleapis.com/css2?${query}&display=swap`, {
      headers: { 'User-Agent': UA },
    }).then((r) => r.text())

    for (const [, subset, bloco] of css.matchAll(
      /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[\s\S]*?\})/g,
    )) {
      if (!SUBSETS.has(subset)) continue
      const url = bloco.match(/url\((https:[^)]+)\)/)?.[1]
      if (!url) continue
      const nome = `${slug}-${subset}.woff2`
      await baixar(url, nome)
      blocos.push(bloco.replace(/src:\s*url\([^)]+\)/, `src: url(/fonts/${nome})`))
    }
  }

  const texto = await kanjiUsados()
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500&text=${encodeURIComponent(texto)}&display=swap`,
    { headers: { 'User-Agent': UA } },
  ).then((r) => r.text())

  for (const bloco of css.match(/@font-face\s*\{[\s\S]*?\}/g) ?? []) {
    const url = bloco.match(/url\((https:[^)]+)\)/)?.[1]
    const peso = bloco.match(/font-weight:\s*(\d+)/)?.[1]
    if (!url || !peso) continue
    const nome = `shippori-kanji-${peso}.woff2`
    await baixar(url, nome)
    blocos.push(bloco.replace(/src:\s*url\([^)]+\)/, `src: url(/fonts/${nome})`))
  }
  console.log(`\n  kanji incluídos (${[...texto].length}): ${texto}`)

  // O CSS é escrito direto, e não impresso para colar: o `unicode-range` da
  // fonte japonesa muda a cada kanji novo, e um passo manual esquecido deixa
  // o glifo novo fora do range — baixado, mas nunca usado.
  await writeFile(
    path.join(RAIZ, 'src/styles/fonts.css'),
    `/* Gerado por scripts/fetch-fonts.mjs — não editar à mão. */\n\n${blocos.join('\n\n')}\n`,
  )
  console.log('  → src/styles/fonts.css')
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
