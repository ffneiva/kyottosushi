/**
 * Fotos do cardápio: assets-src/cardapio/ → public/images/cardapio/.
 *
 *   npm run assets
 *
 * Cada foto sai em 360 px (a miniatura da lista) e 720 px (os cartões grandes
 * da home), em AVIF e WebP — os dois juntos cobrem todo navegador que roda o
 * resto do site, e dispensam o JPEG de reserva. O manifesto guarda a COR
 * dominante de cada foto, que pinta o quadro enquanto ela chega.
 *
 * Roda na máquina de quem mexe nas fotos, não no CI: o resultado é versionado
 * em public/images, e o build continua sendo só `vite build` — sem o sharp,
 * que é binário, pesado e lento em runner frio.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const RAIZ = path.resolve(import.meta.dirname, '..')
const ORIGEM = path.join(RAIZ, 'assets-src')
const DESTINO = path.join(RAIZ, 'public/images')

const hex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

/** Pula o que já está convertido e é mais novo que a origem. */
async function atualizado(origem, alvo) {
  if (!existsSync(alvo)) return false
  return (await stat(alvo)).mtimeMs >= (await stat(origem)).mtimeMs
}

async function cardapio() {
  const dir = path.join(ORIGEM, 'cardapio')
  const saida = path.join(DESTINO, 'cardapio')
  await mkdir(saida, { recursive: true })
  const cores = {}
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.jpg')).sort()

  for (const arquivo of arquivos) {
    const nome = path.parse(arquivo).name
    const entrada = path.join(dir, arquivo)
    for (const largura of [360, 720]) {
      const avif = path.join(saida, `${nome}-${largura}.avif`)
      if (await atualizado(entrada, avif)) continue
      const base = sharp(entrada).resize(largura, largura, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      await base.clone().avif({ quality: 48, effort: 5 }).toFile(avif)
      await base
        .clone()
        .webp({ quality: 68 })
        .toFile(path.join(saida, `${nome}-${largura}.webp`))
    }
    const { dominant } = await sharp(entrada).stats()
    cores[nome] = hex(dominant)
  }

  await writeFile(path.join(RAIZ, 'src/data/fotos-cardapio.json'), `${JSON.stringify(cores)}\n`)
  console.log(`  cardápio: ${arquivos.length} fotos`)
}

console.log('Imagens:')
await cardapio()
