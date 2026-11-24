import { expect, test, type Page } from '@playwright/test'

import { BASE, aceptaCookies, consienteCookies, ponElIdioma } from './sesion-certificada'

/**
 * Certificación del seguimiento por fases: lo que ve el comprador en su pedido, que un aviso abre
 * ESE pedido, y la bandeja de incidencias de envío del panel.
 *
 * <p>Necesita un pedido con seguimiento ya servido por el backend y dos cuentas, una de comprador
 * (dueña del pedido) y una de administrador:
 *
 * <pre>
 * CERT_BASE=http://localhost:3004 CERT_PEDIDO=&lt;id&gt; \
 * CERT_EMAIL=… CERT_PASS=… CERT_ADMIN_EMAIL=… CERT_ADMIN_PASS=… \
 * npx playwright test --config e2e/playwright.config.ts seguimiento-por-fases
 * </pre>
 *
 * <p>No crea ni paga nada: solo lee. La única escritura es resolver una incidencia, y solo si se pide
 * con `CERT_RESUELVE=1`, porque en un entorno compartido esa incidencia puede ser de verdad.
 */

const PEDIDO = process.env['CERT_PEDIDO'] ?? ''
const COMPRADOR = { correo: process.env['CERT_EMAIL'] ?? '', clave: process.env['CERT_PASS'] ?? '' }
const ADMIN = { correo: process.env['CERT_ADMIN_EMAIL'] ?? '', clave: process.env['CERT_ADMIN_PASS'] ?? '' }
const CAPTURAS = 'e2e/resultados/seguimiento'

/** El mismo ciclo que `entra` de la sesión certificada, pero con la cuenta que se le pasa. */
async function entraCon(page: Page, cuenta: { correo: string; clave: string }) {
  // Sin esto la guía del asistente tapa la pantalla con un velo y se come los clics.
  await consienteCookies(page)
  await ponElIdioma(page, 'es')
  await page.goto(`${BASE}/login`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  await aceptaCookies(page)
  const correo = page.locator('input[type="email"]').first()
  const clave = page.locator('input[type="password"]').first()
  await expect(async () => {
    await correo.fill(cuenta.correo)
    await clave.fill(cuenta.clave)
    await page.locator('button[type="submit"]').first().click()
    const rechazo = page.getByRole('alert').first()
    if (await rechazo.isVisible().catch(() => false)) {
      throw new Error(`el acceso fue rechazado: ${await rechazo.innerText()}`)
    }
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 })
  }).toPass({ timeout: 150_000 })
}

test.describe('seguimiento por fases', () => {
  test.skip(!PEDIDO || !COMPRADOR.correo || !ADMIN.correo, 'faltan CERT_PEDIDO y las dos cuentas')

  test('el comprador ve la fase, el transportista, el enlace y el aviso de impuestos', async ({ page }, info) => {
    await entraCon(page, COMPRADOR)
    await page.goto(`${BASE}/orders/${PEDIDO}`, { waitUntil: 'load' })

    const fases = page.locator('[data-fase-del-envio]')
    await expect(fases.first()).toBeVisible()
    // Cada pastilla lleva el rótulo traducido, nunca la clave ni el nombre del enumerado.
    for (const texto of await fases.allInnerTexts()) {
      expect(texto.trim()).not.toMatch(/^(tracking\.|EN_|[A-Z_]{6,}$)/)
    }
    const enlace = page.getByRole('link', { name: /seguir en la web del transportista/i }).first()
    await expect(enlace).toHaveAttribute('href', /^https:\/\//)
    await expect(enlace).toHaveAttribute('target', '_blank')
    await expect(enlace).toHaveAttribute('rel', /noopener/)
    await expect(page.getByText(/los abonarás al recibir el paquete/i).first()).toBeVisible()
    // Sin desbordamiento horizontal: en el móvil una pastilla larga no puede empujar la página.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(desborda).toBe(false)
    await page.screenshot({ path: `${CAPTURAS}/pedido-${info.project.name}.png`, fullPage: true })
  })

  test('pulsar un aviso de envío abre ese pedido', async ({ page }, info) => {
    await entraCon(page, COMPRADOR)
    await page.goto(`${BASE}/notifications`, { waitUntil: 'load' })
    const aviso = page.getByText(/en reparto/i).first()
    await expect(aviso).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/buzon-${info.project.name}.png`, fullPage: true })
    await aviso.click()
    await expect(page).toHaveURL(new RegExp(`/orders/${PEDIDO}`), { timeout: 15_000 })
  })

  test('el panel lista las incidencias de envío y la ficha enseña cada bulto', async ({ page }, info) => {
    await entraCon(page, ADMIN)
    await page.goto(`${BASE}/admin/shipment-incidents`, { waitUntil: 'load' })
    await expect(page).toHaveURL(/\/admin\/shipment-incidents/)
    const filas = page.locator('[data-incidencia]')
    await expect(filas.first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${CAPTURAS}/incidencias-${info.project.name}.png`, fullPage: true })

    await page.goto(`${BASE}/admin/orders/${PEDIDO}`, { waitUntil: 'load' })
    await expect(page.getByRole('button', { name: /etiqueta/i }).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /anular/i }).first()).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/ficha-admin-${info.project.name}.png`, fullPage: true })

    if (process.env['CERT_RESUELVE'] === '1' && info.project.name === 'escritorio') {
      await page.goto(`${BASE}/admin/shipment-incidents`, { waitUntil: 'load' })
      await filas.first().getByRole('button', { name: /resolver/i }).click()
      await page.getByRole('dialog').locator('textarea, input[type="text"]').first().fill('Certificación local')
      await page.getByRole('dialog').getByRole('button', { name: /resolver|confirmar|aceptar/i }).last().click()
      await expect(page.getByText(/incidencia resuelta/i).first()).toBeVisible()
    }
  })
})
