import { expect, test } from '@playwright/test'

/**
 * As regras de movimento e acessibilidade do AGENTS.md, verificadas.
 */

const PAGINAS = ['/', '/cardapio', '/politica-de-privacidade']

for (const caminho of PAGINAS) {
  test(`${caminho}: todo botão e link tem nome, e todo japonês tem lang="ja"`, async ({ page }) => {
    await page.goto(caminho)
    await page.waitForTimeout(600)
    const semNome = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href]')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .filter((el) => {
          const nome = (el.getAttribute('aria-label') ?? (el as HTMLElement).innerText ?? '').trim()
          return !nome && !el.querySelector('img[alt]:not([alt=""])')
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    )
    expect(semNome).toEqual([])

    const japonesSemLang = await page.evaluate(() => {
      const ruins: string[] = []
      const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (andar.nextNode()) {
        const no = andar.currentNode
        if (/[぀-ヿ一-鿿]/.test(no.textContent ?? '')) {
          if (!no.parentElement?.closest('[lang="ja"]')) ruins.push(no.textContent ?? '')
        }
      }
      return ruins
    })
    expect(japonesSemLang).toEqual([])
  })

  test(`${caminho}: nada vaza na horizontal em 320 px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto(caminho)
    await page.waitForTimeout(500)
    const largura = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(largura).toBeLessThanOrEqual(320)
  })
}

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' })

  test('sem abertura, sem cena 3D, e o título aparece de imediato', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    const opacidade = await page
      .locator('[data-linha] > span')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity)
    expect(opacidade).toBe('1')
    // A abertura (noren) não existe: nada fixo cobrindo a tela.
    await expect(page.locator('.noren-selo')).toHaveCount(0)
    await page.waitForTimeout(1500)
    const canvasPintado = await page.evaluate(() =>
      [...document.querySelectorAll('canvas')].some((c) => c.width > 300),
    )
    expect(canvasPintado).toBe(false)
  })
})

/**
 * Sem JavaScript, o <noscript> precisa trazer o essencial. O teste lê o HTML
 * cru: a opção `javaScriptEnabled: false` do Playwright só desliga a execução,
 * e o parser do Chromium continua sem renderizar o <noscript> — o teste
 * visual mediria o navegador, não o site.
 */
test('sem JavaScript, o noscript traz a cidade, o app e o WhatsApp', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const bloco = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? ''
  expect(bloco).toContain('Senador Canedo')
  expect(bloco).toContain('matafoomi.com.br/kyottosushi')
  expect(bloco).toContain('wa.me/')
})
