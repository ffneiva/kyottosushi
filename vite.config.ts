import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { CASA, INDEXAVEL, SITE_URL } from './src/lib/business.ts'
import { resumoDaSemana } from './src/lib/hours.ts'
import { canonicalDe, NAO_ENCONTRADA, ogArquivoDe, ogUrlDe, ROTAS } from './src/lib/routes.ts'
import { gerarJsonLd, gerarLlmsTxt } from './src/lib/seo.ts'

/**
 * Diretiva de robôs.
 *
 * Enquanto o site vive no subdomínio de apresentação, ele fica FORA do índice
 * do Google (`INDEXAVEL` em business.ts). Não é timidez: um endereço que não é
 * da marca, indexado com os telefones e preços dela, competiria na busca com
 * o domínio definitivo quando ele existir — e a cópia antiga continuaria
 * aparecendo por meses. Virar a chave é uma linha.
 */
const ROBOTS_INDEX = 'index, follow, max-snippet:-1, max-image-preview:large'
const robotsDe = (noindex?: boolean) => (!INDEXAVEL || noindex ? 'noindex, follow' : ROBOTS_INDEX)

function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Versão por conteúdo para os arquivos de marca: `favicon.svg?v=3f9a1c2e`.
 *
 * Favicon, ícones, manifesto e arte de compartilhamento têm nome fixo — o
 * navegador procura /favicon.ico e o robô do WhatsApp guarda a URL do
 * og:image. Sem versão no endereço, trocar a arte não tem efeito: foi o que
 * aconteceu quando a marca mudou, e quem já tinha aberto o site continuou
 * vendo o favicon antigo. O hash muda só quando o arquivo muda.
 */
function versao(arquivo: string): string {
  const caminho = path.resolve(import.meta.dirname, 'public', arquivo)
  if (!existsSync(caminho)) return '0'
  return createHash('sha1').update(readFileSync(caminho)).digest('hex').slice(0, 8)
}

const ARQUIVOS_DE_MARCA = [
  'favicon.svg',
  'favicon-32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
] as const

/**
 * Reescreve o `<head>` do index.html para uma rota.
 *
 * É o mesmo trabalho para a home (no `transformIndexHtml`) e para as demais
 * rotas (no `generateBundle`) — uma função só impede que as duas divirjam.
 */
/**
 * O conteúdo do <noscript>, a partir de business.ts — horário, mínimo e
 * contatos escritos à mão no index.html envelheceriam sem ninguém notar.
 */
function noscript(): string {
  const horario = resumoDaSemana(CASA.semana)
    .map((l) => `${l.dias}, ${l.horario}`)
    .join(' · ')
  const estilo = 'color: #dcab5c'
  return `<noscript>
      <div style="padding: 3rem 1.5rem; font-family: Georgia, serif; color: #f4efe6; background: #15110e">
        <h1 style="font-size: 1.8rem; margin: 0 0 1rem">${escapar(CASA.nome)}</h1>
        <p>Sushi delivery em ${escapar(CASA.regiao)} — ${escapar(horario)}.</p>
        <p>Pedido mínimo de R$ ${CASA.pedidoMinimo},00. ${escapar(CASA.pagamento.join(', '))}.</p>
        <p>
          <a href="${CASA.delivery}" style="${estilo}">Pedir pelo app</a> ·
          <a href="https://wa.me/${CASA.whatsapp}" style="${estilo}">WhatsApp ${escapar(CASA.telefone)}</a> ·
          <a href="https://www.instagram.com/${CASA.instagram}/" style="${estilo}">@${CASA.instagram}</a>
        </p>
      </div>
    </noscript>`
}

function headDaRota(html: string, rota: (typeof ROTAS)[number]): string {
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, noscript())
  const titulo = escapar(rota.titulo)
  const descricao = escapar(rota.descricao)
  const canonica = canonicalDe(rota)
  const og = `${ogUrlDe(rota)}?v=${versao(ogArquivoDe(rota))}`
  for (const arquivo of ARQUIVOS_DE_MARCA) {
    html = html.replaceAll(`href="/${arquivo}"`, `href="/${arquivo}?v=${versao(arquivo)}"`)
  }
  const alt = escapar(rota.og ? rota.og.join(' ') : rota.titulo)

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${descricao}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonica}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${titulo}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${descricao}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonica}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${og}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${alt}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${titulo}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${descricao}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${og}$2`)
    .replace(/(<meta name="robots" content=")[^"]*(")/, `$1${robotsDe(rota.noindex)}$2`)
    .replace(
      /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(gerarJsonLd(rota.path))}$2`,
    )
}

/**
 * Injeta o JSON-LD e acerta o `<head>` da home.
 *
 * O schema sai de business.ts — a mesma fonte da página —, então telefone,
 * horário e endereço não têm como divergir entre o que o visitante lê e o que
 * o Google indexa. E chega estático no HTML, sem depender de o robô executar
 * JavaScript.
 */
function headPlugin(): Plugin {
  return {
    name: 'kyotto-head',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const comScript = html.replace(
          '</head>',
          '    <script type="application/ld+json"></script>\n  </head>',
        )
        return headDaRota(comScript, ROTAS[0])
      },
    },
  }
}

/**
 * Um HTML estático por rota, a partir do index.html já construído.
 *
 * Sem isto, /cardapio e /politica-de-privacidade seriam servidos com o `<head>`
 * da home: mesmo título, mesma prévia no WhatsApp, mesma canonical. O app
 * continua sendo uma SPA — mesmo bundle, mesmo CSS —, só o `<head>` muda por
 * arquivo. A regra de reescrita da Cloudflare reescreve `/rota` para `/rota/index.html`.
 */
function rotasEstaticasPlugin(): Plugin {
  return {
    name: 'kyotto-rotas-estaticas',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opcoes, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') return
      const base = String(index.source)

      for (const rota of [...ROTAS, NAO_ENCONTRADA]) {
        if (rota.path === '/') continue
        this.emitFile({
          type: 'asset',
          fileName:
            rota.path === '/404' ? '404.html' : `${rota.path.replace(/^\//, '')}/index.html`,
          source: headDaRota(base, rota),
        })
      }
    },
  }
}

/**
 * Data do último commit — o `lastmod` do sitemap.
 *
 * Não o relógio do build: um redeploy sem mudança nenhuma marcaria todas as
 * páginas como alteradas hoje, e um sitemap que diz isso toda semana é um
 * sitemap que o Google aprende a ignorar.
 */
function dataDoUltimoCommit(): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8' })
      .trim()
      .slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** sitemap.xml, robots.txt e llms.txt — gerados, nunca escritos à mão. */
function seoPlugin(): Plugin {
  return {
    name: 'kyotto-seo',
    apply: 'build',
    generateBundle() {
      const lastmod = dataDoUltimoCommit()
      const urls = ROTAS.filter((r) => !r.noindex)
        .map(
          (r) =>
            `  <url>\n    <loc>${canonicalDe(r)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
        )
        .join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })

      // O robots.txt acompanha a chave INDEXAVEL. Com ela desligada, o
      // `Disallow` não é o mecanismo que tira a página do índice — isso é o
      // `noindex` do HTML, que o robô só lê se puder rastrear. Por isso o
      // rastreio fica liberado nos dois casos, e só a indicação do sitemap
      // some (o arquivo continua sendo gerado, pronto para quando a chave
      // virar).
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: INDEXAVEL
          ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
          : 'User-agent: *\nAllow: /\n',
      })

      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: gerarLlmsTxt() })
    },
  }
}

/**
 * O `vite preview` imitando a borda (S3 + Cloudflare).
 *
 * Sem isto, o preview faz fallback de SPA: /cardapio devolve o index.html da
 * HOME, e os testes de ponta a ponta mediriam um site que não é o que vai ao
 * ar. Aqui a regra é a mesma da regra de reescrita da Cloudflare:
 * caminho sem extensão vira `<caminho>/index.html`, e o que não existe
 * responde o 404.html com status 404 de verdade.
 */
function previewComoABordaPlugin(): Plugin {
  return {
    name: 'kyotto-preview-borda',
    configurePreviewServer(servidor) {
      const dist = path.resolve(import.meta.dirname, 'dist')
      servidor.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://x')
        const caminho = url.pathname.replace(/\/+$/, '').toLowerCase()
        if (caminho === '' || path.extname(caminho)) return next()
        const arquivo = path.join(dist, caminho, 'index.html')
        if (existsSync(arquivo)) {
          req.url = `${caminho}/index.html${url.search}`
          return next()
        }
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(path.join(dist, '404.html')))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    headPlugin(),
    rotasEstaticasPlugin(),
    seoPlugin(),
    previewComoABordaPlugin(),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    // O único chunk grande é o do three.js, carregado sob demanda depois que a
    // página já está interativa.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // O three.js NÃO entra aqui de propósito: como manualChunk ele vira
        // chunk compartilhado e ganha <link rel="modulepreload"> no HTML — os
        // ~700 kB seriam baixados no primeiro paint. O gsap é o oposto: usado
        // desde a primeira rolagem, e muda muito menos que o código do site.
        manualChunks(id) {
          if (id.includes('node_modules/gsap')) return 'gsap'
        },
      },
    },
  },
})
