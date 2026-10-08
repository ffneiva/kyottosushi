import { expect, test } from '@playwright/test'
import { CASA } from '../../src/lib/business'
import { ROTAS } from '../../src/lib/routes'

/**
 * Navegação e HTML por rota — contra o build de produção, que é onde os HTML
 * por rota existem. O dev server serviria o mesmo index.html para tudo.
 */

for (const rota of ROTAS) {
  test(`${rota.path} chega com título, canonical e um único h1`, async ({ page, request }) => {
    // O HTML CRU, antes de qualquer JavaScript: é o que o robô do Google e o
    // leitor de link do WhatsApp leem.
    const html = await (await request.get(rota.path)).text()
    expect(html).toContain(`<title>${rota.titulo.replace(/&/g, '&amp;')}</title>`)
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/)
    expect(html).toContain('application/ld+json')

    await page.goto(rota.path)
    await expect(page.locator('h1')).toHaveCount(1)
  })
}

test('endereço inexistente mostra a página de 404 com noindex', async ({ page }) => {
  await page.goto('/uma-rota-que-nao-existe')
  await expect(page.locator('h1')).toContainText('Esse prato não está no cardápio')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('link interno navega sem recarregar a página', async ({ page }) => {
  await page.goto('/politica-de-privacidade')
  await page.evaluate(() => {
    ;(window as unknown as { marcador: boolean }).marcador = true
  })
  await page.locator('footer').getByRole('link', { name: 'Cardápio' }).click()
  await expect(page).toHaveURL(/\/cardapio$/)
  await expect(page.locator('h1')).toContainText('cardápio inteiro')
  expect(await page.evaluate(() => (window as unknown as { marcador?: boolean }).marcador)).toBe(
    true,
  )
  await expect(page).toHaveTitle(/Cardápio e preços/)
})

test('os botões de pedido apontam para o app e para o WhatsApp da casa', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator(`a[href="${CASA.delivery}"]:visible`).first()).toBeVisible()
  await expect(page.locator(`footer a[href^="https://wa.me/${CASA.whatsapp}"]`)).toHaveCount(1)
})

test('nenhum iframe de terceiro é carregado', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('o JSON-LD traz o Restaurant da casa', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const json = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1],
  )
  const restaurantes = json['@graph'].filter(
    (n: { '@type': string }) => n['@type'] === 'Restaurant',
  )
  expect(restaurantes).toHaveLength(1)
  expect(restaurantes[0].name).toBe(CASA.nome)
})

/**
 * Sair da home por clique, depois de rolar pela seção pinada.
 *
 * Bug real em produção: o pin do GSAP move a seção dos exclusivos para dentro
 * de um div próprio, e desmontar a home derrubava o React ("removeChild… is
 * not a child of this node"). Os outros testes nunca saíam da home clicando —
 * todos abriam a página de destino direto pela URL.
 */
for (const destino of ['/cardapio', '/politica-de-privacidade']) {
  test(`da home para ${destino} por clique, depois de rolar a página`, async ({ page }) => {
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto('/')
    await page.waitForTimeout(2200)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3))
    await page.waitForTimeout(800)
    await page.evaluate((d) => {
      const a = document.createElement('a')
      a.href = d
      document.body.appendChild(a)
      a.click()
    }, destino)
    await expect(page).toHaveURL(new RegExp(`${destino}$`))
    await expect(page.locator('h1')).not.toContainText('travou')
    await page.waitForTimeout(500)
    expect(erros).toEqual([])
  })
}

test('da home para o cardápio pelo botão do herói', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2200)
  // O botão do herói não para de se mexer (a animação de entrada e o
  // magnetismo): no runner lento do CI ele nunca fica "estável" para o
  // click() do Playwright. O evento de clique é o que importa aqui — é ele
  // que o roteador intercepta.
  await page
    .getByRole('link', { name: /Montar pelo WhatsApp/ })
    .first()
    .dispatchEvent('click')
  await page.waitForURL('**/cardapio')
  // O cardápio é carregado sob demanda; no CI isso passa dos 5 s padrão.
  await expect(page.locator('h1')).toContainText('cardápio inteiro', { timeout: 15000 })
})
