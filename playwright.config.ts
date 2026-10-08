import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta.
 *
 * Eles rodam contra o **build de produção**, servido pelo `vite preview`, e não
 * contra o dev server. A diferença importa: é no build que os HTML por rota são
 * gerados, que o JSON-LD é injetado e que os chunks são divididos — exatamente
 * as três coisas que estes testes verificam e que o dev server não produz.
 *
 * Dois projetos, um desktop e um celular, porque as duas experiências são
 * genuinamente diferentes neste site: a cena WebGL e a rolagem horizontal do
 * método só existem na primeira, e a maior parte do tráfego real chega pela
 * segunda.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
