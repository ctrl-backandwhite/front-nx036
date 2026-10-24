import { test, type Page } from '@playwright/test'
import { consienteCookies, entra, BASE } from './sesion-certificada'

/**
 * Certificación VISUAL del re-skin a la identidad de comercio (violeta + magenta + semánticos).
 *
 * No afirma píxeles: captura pantallas de las superficies clave en los DOS temas para revisar a ojo
 * que la tienda tiene color y es coherente. Se lanza contra el dev server con datos locales:
 *
 *   # públicas (no exigen sesión)
 *   CERT_BASE=http://localhost:3004 npx playwright test --config e2e/playwright.config.ts \
 *     certificacion/reskin-visual.spec.ts --project=escritorio -g "home|login"
 *
 *   # cliente (catálogo, ficha, carrito, checkout exigen sesión)
 *   CERT_BASE=http://localhost:3004 CERT_EMAIL=cert-cliente@local.test CERT_PASS=CertNx036Pass1 \
 *     npx playwright test ... -g "cliente"
 *
 *   # admin (styleguide)
 *   CERT_BASE=http://localhost:3004 CERT_EMAIL=admin@nx036.local CERT_PASS=CertNx036Pass1 \
 *     npx playwright test ... -g "styleguide"
 */

const SALIDA = 'e2e/resultados'

const TEMAS: readonly (readonly [tema: string, sufijo: string])[] = [
  ['nx036-pastel', 'claro'],
  ['nx036-pastel-dark', 'oscuro'],
]

/** Captura una ruta en los dos temas. Mantiene la sesión si ya se entró. */
async function capturaTemas(page: Page, ruta: string, nombre: string): Promise<void> {
  for (const [tema, sufijo] of TEMAS) {
    // La preferencia de tema vive en la cookie `nx036-theme`, que lee el armazón al arrancar.
    await page.context().addCookies([{ name: 'nx036-theme', value: tema, url: BASE }])
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'load' })
    // El websocket de recarga del dev server impide el `networkidle`; se espera con tope y se sigue.
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)
    await page.waitForTimeout(1_200)
    // Red de seguridad: forzar también el atributo por si el armazón no lo aplicó.
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SALIDA}/reskin-${nombre}-${sufijo}.png`, fullPage: true })
  }
}

async function pinta(page: Page, ruta: string, nombre: string): Promise<void> {
  await consienteCookies(page)
  await capturaTemas(page, ruta, nombre)
}

// ── Públicas ────────────────────────────────────────────────────────────────
const PUBLICAS: readonly (readonly [ruta: string, nombre: string])[] = [
  ['/', 'home'],
  ['/login', 'login'],
]
for (const [ruta, nombre] of PUBLICAS) {
  test(`re-skin · ${nombre} en claro y oscuro`, async ({ page }) => {
    await pinta(page, ruta, nombre)
  })
}

// ── Con sesión de cliente (catálogo/ficha/carrito/checkout exigen cuenta) ─────
test('re-skin · cliente: catálogo, ficha, carrito, checkout', async ({ page }) => {
  // Login + 4 rutas × 2 temas no caben en los 60 s por defecto de este proyecto.
  test.setTimeout(240_000)
  await consienteCookies(page)
  await entra(page)
  await capturaTemas(page, '/catalog', 'catalogo')

  // Ficha: se toma el primer producto del catálogo (su slug viaja en el enlace).
  await page.goto(`${BASE}/catalog`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)
  await page.waitForTimeout(1_500)
  const href = await page
    .locator('a[href*="/catalog/"]')
    .first()
    .getAttribute('href')
    .catch(() => null)
  if (href) await capturaTemas(page, href, 'ficha')

  await capturaTemas(page, '/cart', 'carrito')
  await capturaTemas(page, '/checkout', 'checkout')
})

// ── Con sesión de admin (styleguide + dashboard del panel) ────────────────────
test('re-skin · admin: styleguide y dashboard', async ({ page }) => {
  test.setTimeout(180_000)
  await consienteCookies(page)
  await entra(page)
  await capturaTemas(page, '/admin/styleguide', 'styleguide')
  // El dashboard enseña el sidebar con el ítem activo en azul y las tarjetas del panel.
  await capturaTemas(page, '/admin/dashboard', 'admin-dashboard')
})
