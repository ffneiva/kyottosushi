import { expect, type Page, test } from '@playwright/test'

/** A sacola do cardápio: soma, mínimo, validação, mensagem e persistência. */

/** Troca o window.open por um registro, para ler o link que abriria. */
async function capturarAberturas(page: Page) {
  await page.addInitScript(() => {
    ;(window as unknown as { abriu: string[] }).abriu = []
    window.open = ((url: string) => {
      ;(window as unknown as { abriu: string[] }).abriu.push(url)
      return null
    }) as typeof window.open
  })
}

const aberturas = (page: Page) =>
  page.evaluate(() => (window as unknown as { abriu: string[] }).abriu)

test('abaixo do mínimo o pedido não sai, e a tela diz quanto falta', async ({ page }) => {
  await capturarAberturas(page)
  await page.goto('/cardapio')
  await page.getByRole('button', { name: 'Adicionar Kyotto Experience' }).click()
  const sacola = page.locator('#sacola')
  await expect(sacola).toContainText('R$ 29,90')
  await expect(sacola).toContainText('Faltam R$ 10,10')
  await sacola.getByRole('button', { name: /Enviar pelo WhatsApp/ }).click()
  await expect(page.getByRole('alert')).toContainText('mínimo')
  expect(await aberturas(page)).toEqual([])
})

test('o pedido completo vira uma mensagem somada no WhatsApp da casa', async ({ page }) => {
  await capturarAberturas(page)
  await page.goto('/cardapio')
  const sakura = page.getByRole('button', { name: 'Adicionar Combo Sakura' })
  await sakura.click()
  await sakura.click()
  await page.getByRole('button', { name: 'Adicionar Monte Fuji' }).click()

  const sacola = page.locator('#sacola')
  await expect(sacola).toContainText('R$ 180,72')
  await sacola.getByLabel('Seu nome').fill('Ana')
  await sacola.getByLabel('Endereço de entrega').fill('Rua 5, 120, Centro')
  await sacola.getByRole('button', { name: 'Cartão' }).click()
  await sacola.getByRole('button', { name: /Enviar pelo WhatsApp/ }).click()

  const abriu = await aberturas(page)
  expect(abriu).toHaveLength(1)
  expect(abriu[0]).toMatch(/^https:\/\/wa\.me\/5562993198480\?text=/)
  const texto = decodeURIComponent(abriu[0].split('text=')[1])
  expect(texto).toContain('2x Combo Sakura — R$ 135,82')
  expect(texto).toContain('1x Monte Fuji — R$ 44,90')
  expect(texto).toContain('Subtotal: R$ 180,72')
  expect(texto).toContain('Pagamento: Cartão')
})

test('a sacola sobrevive a recarregar a página, e o "−" tira o item', async ({ page }) => {
  await page.goto('/cardapio')
  await page.getByRole('button', { name: 'Adicionar Haru' }).click()
  await page.reload()
  const sacola = page.locator('#sacola')
  await expect(sacola).toContainText('Haru')
  await page.getByRole('button', { name: 'Tirar uma unidade: Haru' }).click()
  await expect(sacola).toContainText('Vazia por enquanto')
})

test('o link de um combo na home abre o cardápio no item', async ({ page }) => {
  await page.goto('/')
  await page.locator('a[href="/cardapio#item-combo-umi"]').click()
  await expect(page).toHaveURL(/\/cardapio#item-combo-umi$/)
  await expect(page.locator('#item-combo-umi')).toBeInViewport()
})
