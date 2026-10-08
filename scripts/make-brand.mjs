/**
 * Gera os arquivos de marca: favicon, ícones e as artes de compartilhamento.
 *
 *   npm run brand
 *
 * Duas fontes: o selo da casa (assets-src/marca/selo-hd.png — o gato da sorte
 * em 1600 px, recuperado do arquivo de abertura do app deles) e a lista de
 * rotas (src/lib/routes.ts). Uma rota nova ganha a sua arte de WhatsApp sem
 * ninguém abrir um editor.
 *
 * As artes são renderizadas por um Chromium de verdade (o do Playwright), com
 * as fontes do próprio site: o título da prévia do WhatsApp sai na mesma
 * Fraunces da página, e o letreiro é o vetor em pincel da marca.
 *
 * Roda com --experimental-strip-types para importar os .ts sem build.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { LETREIRO } from '../src/lib/marca.ts'
import { ogArquivoDe, ROTAS } from '../src/lib/routes.ts'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PUBLIC = path.join(RAIZ, 'public')
const SELO = path.join(RAIZ, 'assets-src/marca/selo-hd.png')

const SUMI = '#15110e'
const WASHI = '#f4efe6'
const SHU = '#c91519'
const KIN = '#dcab5c'

/**
 * O rosto do gato, recortado do selo — o favicon.
 *
 * O selo inteiro a 16 px é uma mancha: o letreiro some e o gato não se
 * reconhece. O que sobrevive a 16 px é o rosto branco com a bandana preta
 * sobre o sol vermelho — que é justamente o que a clientela reconhece do
 * Instagram. Recortado aqui, a partir do selo em alta, e não à mão.
 */
async function recortarRosto() {
  const cx = 735
  const cy = 415
  const l = 690
  const rosto = await sharp(SELO)
    .flatten({ background: '#0c0a09' })
    .extract({ left: cx - l / 2, top: cy - l / 2, width: l, height: l })
    .png()
    .toBuffer()
  const mascara = Buffer.from(
    `<svg width="${l}" height="${l}"><circle cx="${l / 2}" cy="${l / 2}" r="${l / 2 - 2}" fill="#fff"/></svg>`,
  )
  return sharp(rosto)
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/**
 * O .ico que o navegador pede sozinho em /favicon.ico, mesmo com o SVG
 * declarado no <head> — sem ele, cada visita gera um 404 no log e baixa a
 * página de erro inteira. O formato ICO aceita PNG embutido desde o Vista:
 * um cabeçalho de 22 bytes e o PNG de 32 px, sem biblioteca.
 */
function icoDePng(png) {
  const cabecalho = Buffer.alloc(22)
  cabecalho.writeUInt16LE(0, 0) // reservado
  cabecalho.writeUInt16LE(1, 2) // tipo: ícone
  cabecalho.writeUInt16LE(1, 4) // uma imagem
  cabecalho.writeUInt8(32, 6) // largura
  cabecalho.writeUInt8(32, 7) // altura
  cabecalho.writeUInt8(0, 8) // paleta
  cabecalho.writeUInt8(0, 9) // reservado
  cabecalho.writeUInt16LE(1, 10) // planos
  cabecalho.writeUInt16LE(32, 12) // bits por pixel
  cabecalho.writeUInt32LE(png.length, 14) // tamanho do PNG
  cabecalho.writeUInt32LE(22, 18) // onde o PNG começa
  return Buffer.concat([cabecalho, png])
}

/**
 * O selo nos tamanhos usados pelas páginas (<Selo tamanho={…}>), em AVIF e
 * WebP, mais um PNG de reserva. Sai daqui, e não de um arquivo feito à mão,
 * para que trocar o selo seja trocar um arquivo só.
 */
async function selos() {
  for (const largura of [160, 320]) {
    const base = sharp(SELO).resize(largura)
    await base
      .clone()
      .avif({ quality: 60 })
      .toFile(path.join(PUBLIC, 'images', `selo-${largura}.avif`))
    await base
      .clone()
      .webp({ quality: 86 })
      .toFile(path.join(PUBLIC, 'images', `selo-${largura}.webp`))
  }
  await sharp(SELO)
    .resize(320)
    .png({ compressionLevel: 9, palette: true, colours: 160 })
    .toFile(path.join(PUBLIC, 'images', 'selo.png'))
  console.log('  images/selo-{160,320}.{avif,webp}, selo.png')
}

/**
 * Ícones: o rosto nos tamanhos de aba (16 a 64 px), o selo inteiro nos de
 * tela inicial (180 px ou mais), onde o letreiro é legível. Os de tela
 * inicial ganham fundo sumi até a borda — o sistema recorta em círculo ou
 * squircle.
 */
async function icones() {
  const ROSTO = await recortarRosto()
  const png = async (nome, origem, tamanho, { margem = 0, fundo = null } = {}) => {
    const interno = Math.round(tamanho * (1 - margem * 2))
    const imagem = await sharp(origem).resize(interno, interno).png().toBuffer()
    const off = Math.round((tamanho - interno) / 2)
    await sharp({
      create: {
        width: tamanho,
        height: tamanho,
        channels: 4,
        background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: imagem, left: off, top: off }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC, nome))
    console.log(`  ${nome}`)
  }
  await png('favicon-32.png', ROSTO, 32)
  await png('favicon-64.png', ROSTO, 64)
  await png('apple-touch-icon.png', SELO, 180, { margem: 0.06, fundo: SUMI })
  await png('icon-192.png', SELO, 192, { margem: 0.1, fundo: SUMI })
  await png('icon-512.png', SELO, 512, { margem: 0.1, fundo: SUMI })

  // O favicon.svg embute o PNG de 64 px do rosto: vetorizar o gato seria
  // desenhar outro gato. O SVG existe para o navegador escalar sem serrilhar
  // entre 16 e 64 px, e por ser o formato que ele prefere.
  await writeFile(
    path.join(PUBLIC, 'favicon.ico'),
    icoDePng(await readFile(path.join(PUBLIC, 'favicon-32.png'))),
  )
  console.log('  favicon.ico')

  const b64 = (await readFile(path.join(PUBLIC, 'favicon-64.png'))).toString('base64')
  await writeFile(
    path.join(PUBLIC, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image href="data:image/png;base64,${b64}" width="64" height="64"/></svg>`,
  )
  console.log('  favicon.svg')

  // O manifesto aponta os ícones com versão por conteúdo, pelo mesmo motivo
  // do <head> (ver vite.config.ts): nome fixo + cache longo = ícone velho na
  // tela inicial de quem instalou o site.
  const { createHash } = await import('node:crypto')
  const v = async (arquivo) =>
    createHash('sha1')
      .update(await readFile(path.join(PUBLIC, arquivo)))
      .digest('hex')
      .slice(0, 8)
  const versoes = { 192: await v('icon-192.png'), 512: await v('icon-512.png') }
  const manifesto = {
    name: 'Kyotto Sushi',
    short_name: 'Kyotto',
    description: 'Sushi delivery em Senador Canedo e região.',
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',
    background_color: SUMI,
    theme_color: SUMI,
    // "any" e "maskable" em entradas separadas: combinados, o sistema pode
    // usar o ícone com margem de segurança onde queria o cheio, e vice-versa.
    icons: ['any', 'maskable'].flatMap((purpose) =>
      [192, 512].map((l) => ({
        src: `/icon-${l}.png?v=${versoes[l]}`,
        sizes: `${l}x${l}`,
        type: 'image/png',
        purpose,
      })),
    ),
  }
  await writeFile(
    path.join(PUBLIC, 'site.webmanifest'),
    `${JSON.stringify(manifesto, null, 2)}
`,
  )
  console.log('  site.webmanifest')
}

async function fonteBase64(arquivo) {
  return (await readFile(path.join(PUBLIC, 'fonts', arquivo))).toString('base64')
}

async function artes() {
  const fraunces = await fonteBase64('fraunces-latin.woff2')
  const frauncesItalico = await fonteBase64('fraunces-italico-latin.woff2')
  const hanken = await fonteBase64('hanken-latin.woff2')
  const selo = `data:image/png;base64,${(await sharp(SELO).resize(260).png().toBuffer()).toString('base64')}`

  const fotoDe = async (rota) => {
    const bruto = await readFile(
      path.join(RAIZ, 'assets-src/cardapio', `${rota.ogFoto ?? 'combo-sakura'}.jpg`),
    )
    const jpg = await sharp(bruto)
      .resize(720, 630, { fit: 'cover' })
      .jpeg({ quality: 84 })
      .toBuffer()
    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  }

  const navegador = await chromium.launch()
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } })
  const feitas = new Set()

  for (const rota of ROTAS) {
    const arquivo = ogArquivoDe(rota)
    if (feitas.has(arquivo) || !rota.og) continue
    feitas.add(arquivo)
    const [linha1, linha2] = rota.og
    const foto = await fotoDe(rota)

    await pagina.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:F;src:url(data:font/woff2;base64,${fraunces}) format('woff2');font-weight:300 600}
      @font-face{font-family:F;font-style:italic;src:url(data:font/woff2;base64,${frauncesItalico}) format('woff2');font-weight:300 500}
      @font-face{font-family:H;src:url(data:font/woff2;base64,${hanken}) format('woff2');font-weight:300 700}
      *{margin:0;box-sizing:border-box}
      body{width:1200px;height:630px;background:${SUMI};color:${WASHI};font-family:H;position:relative;overflow:hidden}
      .sol{position:absolute;left:-120px;top:-160px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(201,21,25,.35),transparent 65%)}
      .foto{position:absolute;inset:0 0 0 auto;width:600px;background:url(${foto}) center/cover}
      .foto::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,${SUMI} 0%,rgba(21,17,14,.5) 32%,rgba(21,17,14,0) 65%)}
      .txt{position:absolute;left:72px;top:0;bottom:0;width:700px;display:flex;flex-direction:column;justify-content:center;gap:26px;padding-top:40px}
      h1{font-family:F;font-weight:300;font-size:74px;line-height:1.02;letter-spacing:-.02em;font-variation-settings:'opsz' 144}
      h1 em{font-style:italic;color:${SHU}}
      p{font-size:19px;letter-spacing:.12em;text-transform:uppercase;color:${KIN};font-weight:600;max-width:600px}
      .marca{position:absolute;left:72px;top:56px;display:flex;align-items:center;gap:20px}
      .marca img{width:96px;height:96px}
      .marca svg{width:220px;color:${WASHI}}
    </style></head><body>
      <div class="sol"></div>
      <div class="foto"></div>
      <div class="marca"><img src="${selo}"><svg viewBox="${LETREIRO.viewBox}"><path fill-rule="evenodd" fill="currentColor" d="${LETREIRO.d}"/></svg></div>
      <div class="txt"><h1>${linha1}<br><em>${linha2}</em></h1>${rota.ogNota ? `<p>${rota.ogNota}</p>` : ''}</div>
    </body></html>`)
    await pagina.evaluate(() => document.fonts.ready)
    const png = await pagina.screenshot({ type: 'png' })
    await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(PUBLIC, arquivo))
    console.log(`  ${arquivo}`)
  }
  await navegador.close()
}

console.log('Ícones:')
await icones()
await selos()
console.log('Artes de compartilhamento:')
await artes()
