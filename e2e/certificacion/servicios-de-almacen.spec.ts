import { expect, test, type Page } from '@playwright/test'

import { BASE, aceptaCookies, consienteCookies, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de los servicios de almacén (etiquetado y reempaquetado) en el precio.
 *
 * <p>Abre el ajuste global del panel, lo pone a valores, comprueba que la ficha del producto sube su
 * total y que las filas del desglose cuentan el importe como «(global)», y vuelve a dejar los dos a 0.
 * Los dos globales se DEJAN A 0 SIEMPRE, también si la prueba falla: es un ajuste de precio de todo el
 * catálogo y un entorno compartido no puede quedarse con él puesto.
 *
 * <pre>
 * CERT_BASE=http://localhost:3004 CERT_SLUG=&lt;slug de la ficha&gt; \
 * CERT_ADMIN_EMAIL=… CERT_ADMIN_PASS=… \
 * npx playwright test --config e2e/playwright.config.ts servicios-de-almacen
 * </pre>
 */

const SLUG = process.env['CERT_SLUG'] ?? ''
const ADMIN = { correo: process.env['CERT_ADMIN_EMAIL'] ?? '', clave: process.env['CERT_ADMIN_PASS'] ?? '' }
const CAPTURAS = 'e2e/resultados/servicios-de-almacen'

async function entraComoAdmin(page: Page) {
  await consienteCookies(page)
  await ponElIdioma(page, 'es')
  await page.goto(`${BASE}/login`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  await aceptaCookies(page)
  const correo = page.locator('input[type="email"]').first()
  const clave = page.locator('input[type="password"]').first()
  await expect(async () => {
    await correo.fill(ADMIN.correo)
    await clave.fill(ADMIN.clave)
    await page.locator('button[type="submit"]').first().click()
    const rechazo = page.getByRole('alert').first()
    if (await rechazo.isVisible().catch(() => false)) {
      throw new Error(`el acceso fue rechazado: ${await rechazo.innerText()}`)
    }
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 })
  }).toPass({ timeout: 150_000 })
}

/** Pone los dos importes globales desde la tarjeta del panel de precios y espera al aviso de guardado. */
async function ponGlobales(page: Page, etiquetado: string, reempaquetado: string) {
  await page.goto(`${BASE}/admin/pricing`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  const campoE = page.locator('#almacen-etiquetado')
  const campoR = page.locator('#almacen-reempaquetado')
  const boton = page.getByTestId('almacen-guardar')
  await expect(campoE).toBeVisible({ timeout: 30_000 })
  // La hidratación puede reiniciar los campos: se reintenta el ciclo entero hasta que el botón se
  // habilita con lo tecleado, o hasta que ya estaba como se pedía.
  await expect(async () => {
    await campoE.fill(etiquetado)
    await campoR.fill(reempaquetado)
    if (await boton.isEnabled()) {
      await boton.click()
    }
    await page.reload({ waitUntil: 'load' })
    await expect(page.locator('#almacen-etiquetado')).toHaveValue(String(Number(etiquetado)), { timeout: 5_000 })
    await expect(page.locator('#almacen-reempaquetado')).toHaveValue(String(Number(reempaquetado)), { timeout: 5_000 })
  }).toPass({ timeout: 60_000 })
}

/** El texto del total del desglose y el de cada servicio, una vez dispara el bloque diferido. */
async function leeElDesglose(page: Page) {
  await page.goto(`${BASE}/catalog/${SLUG}`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  const caja = page.locator('nx-desglose-editable')
  await caja.scrollIntoViewIfNeeded().catch(() => undefined)
  await expect(caja).toBeVisible({ timeout: 30_000 })
  const fila = (rotulo: string) => caja.locator('div.flex.items-baseline', { hasText: rotulo }).first()
  return {
    caja,
    etiquetado: (await fila('Etiquetado').innerText()).replace(/\s+/g, ' ').trim(),
    reempaquetado: (await fila('Reempaquetado').innerText()).replace(/\s+/g, ' ').trim(),
    total: (await fila('Total').innerText()).replace(/\s+/g, ' ').trim(),
  }
}

/** «Total … 7,11 €» → 7.11. Vale para los ocho formatos de moneda que usa la tienda en esta prueba (es). */
function importeDe(texto: string): number {
  const cifra = texto.match(/(\d[\d.]*,\d{2})/)
  expect(cifra, `no hay importe en «${texto}»`).toBeTruthy()
  return Number(cifra![1].replace(/\./g, '').replace(',', '.'))
}

test.describe('servicios de almacén', () => {
  test.skip(!SLUG || !ADMIN.correo, 'faltan CERT_SLUG y la cuenta de administrador')

  test.afterAll(async ({ browser }) => {
    // Siempre a cero, haya pasado lo que haya pasado en la prueba.
    const contexto = await browser.newContext()
    const page = await contexto.newPage()
    try {
      await entraComoAdmin(page)
      await ponGlobales(page, '0', '0')
    } finally {
      await contexto.close()
    }
  })

  test('los globales suben el precio de la ficha y a 0 lo devuelven', async ({ page }, info) => {
    await entraComoAdmin(page)

    await ponGlobales(page, '0', '0')
    const antes = await leeElDesglose(page)
    const totalAntes = importeDe(antes.total)
    expect(antes.etiquetado).toContain('(global)')

    await ponGlobales(page, '20', '40')
    const despues = await leeElDesglose(page)
    await page.screenshot({ path: `${CAPTURAS}/ficha-con-servicios-${info.project.name}.png`, fullPage: true })
    expect(despues.etiquetado).toContain('(global)')
    expect(importeDe(despues.etiquetado)).toBeGreaterThan(0)
    expect(importeDe(despues.reempaquetado)).toBeGreaterThan(importeDe(despues.etiquetado))
    expect(importeDe(despues.total)).toBeGreaterThan(totalAntes)

    await ponGlobales(page, '0', '0')
    const final = await leeElDesglose(page)
    await page.screenshot({ path: `${CAPTURAS}/ficha-a-cero-${info.project.name}.png`, fullPage: true })
    expect(importeDe(final.total)).toBe(totalAntes)
  })
})
