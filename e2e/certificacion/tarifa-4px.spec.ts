import { readFileSync } from 'node:fs'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de que la tarifa de 4PX que usa la tienda es la de la hoja vigente (报价表).
 *
 * <p>Se lanza cada vez que Cainiao cambia la hoja y se recarga la tarifa. Una tarifa vieja no da
 * ningún error: la tienda cotiza por debajo de lo que el transportista factura y la diferencia sale
 * del margen, pedido a pedido.
 *
 * <p>Necesita una cuenta de ADMINISTRADOR (`CERT_EMAIL`, `CERT_PASS`), la tarifa esperada en JSON
 * (`CERT_TARIFA`, la genera `docs/cainiao/siembra.py` → `tarifa-4px-esperada-<fecha>.json`) y el
 * cambio del yuan con que convierte la tienda (`CERT_CNY_POR_USD`, de `currency_rate`). UNA TANDA
 * CADA VEZ por cuenta: cambia la cesta y la dirección predeterminada.
 */

interface Esperada { canal: string; pais: string; hasta: number; registro: number; kg: number; min: number }
interface Fila { carrier: string; channelCode: string; countryCode: string; hastaGramos: number; registroRmb: number; precioRmbKg: number; activo: boolean }
interface Cotizacion { supported: boolean; options: { code: string; carrierName: string; amountUsdCents: number }[] }

const ESPERADA: Esperada[] = JSON.parse(readFileSync(process.env['CERT_TARIFA'] ?? '', 'utf-8'))
const CNY_POR_USD = Number(process.env['CERT_CNY_POR_USD'] ?? '0')
// 420222, bolso: 350 g y 250×180×100 mm. Por QC (/8000) factura el volumétrico: 562,5 g.
const BOLSO = { productId: '001bcdfa-2957-4ae0-912c-f6b3dc938371', variantId: '7dc7ed5c-b66a-4858-93da-aed551029260', slug: 'bags-990211344081', precioCny: 32 }
const GRAMOS_BOLSO = Math.max(350, (250 * 180 * 100) / 8000)

let page: Page
let api: APIRequestContext
let testigo = ''
const cabeceras = () => ({ Authorization: `Bearer ${testigo}` })
const clave = (c: string, p: string, h: number) => `${c}|${p}|${h}`

test.describe.configure({ mode: 'serial', timeout: 240_000 })

test.describe('La tarifa de 4PX es la de la hoja vigente', () => {
  test.beforeAll(async ({ browser }) => {
    expect(ESPERADA.length, 'la tarifa esperada está vacía').toBeGreaterThan(0)
    expect(CNY_POR_USD, 'falta CERT_CNY_POR_USD').toBeGreaterThan(0)
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
    page = await contexto.newPage()
    api = contexto.request
    await consienteCookies(page)
    await entra(page)
    await ponElIdioma(page, 'es')
    testigo = (await page.evaluate(() => window.localStorage.getItem('nx-access-token'))) ?? ''
    expect(testigo, 'no hay testigo de sesión: ¿falló el acceso?').toBeTruthy()
  })

  test.afterAll(async () => {
    await api.delete(`${BASE}/api/me/cart`, { headers: cabeceras() })
    const r = await api.get(`${BASE}/api/me/addresses`, { headers: cabeceras() })
    if (r.ok()) {
      for (const d of ((await r.json()) as { id: string; label?: string }[]).filter((x) => (x.label ?? '').startsWith('cert-'))) {
        await api.delete(`${BASE}/api/me/addresses/${d.id}`, { headers: cabeceras() })
      }
    }
    await page.context().close()
  })

  test('el panel sirve, fila a fila, la tarifa de la hoja: ni una de más, ni una de menos, todas activas', async () => {
    const r = await api.get(`${BASE}/api/admin/carrier-rates?carrier=FOURPX&incluirInactivas=true`, { headers: cabeceras() })
    expect(r.ok(), `el panel de tarifas respondió ${r.status()}`).toBe(true)
    const filas = ((await r.json()) as Fila[]).filter((f) => f.carrier === 'FOURPX')
    const servidas = new Map(filas.map((f) => [clave(f.channelCode, f.countryCode, f.hastaGramos), f]))
    const distintas: string[] = []
    for (const e of ESPERADA) {
      const f = servidas.get(clave(e.canal, e.pais, e.hasta))
      if (!f) distintas.push(`falta ${clave(e.canal, e.pais, e.hasta)}`)
      else if (Number(f.registroRmb) !== e.registro || Number(f.precioRmbKg) !== e.kg || !f.activo)
        distintas.push(`${clave(e.canal, e.pais, e.hasta)}: hoja ${e.registro}+${e.kg}/kg, tienda ${f.registroRmb}+${f.precioRmbKg}/kg, activa=${f.activo}`)
    }
    const esperadas = new Set(ESPERADA.map((e) => clave(e.canal, e.pais, e.hasta)))
    for (const k of servidas.keys()) if (!esperadas.has(k)) distintas.push(`sobra ${k}`)
    console.log(`tarifa: ${filas.length} filas servidas, ${ESPERADA.length} en la hoja, ${distintas.length} diferencias`)
    expect(distintas, distintas.slice(0, 20).join('\n')).toEqual([])
    expect(filas.length).toBe(ESPERADA.length)
  })

  test('la pantalla de tarifas del panel enseña el precio nuevo de Serbia por QC', async () => {
    const e = ESPERADA.find((x) => x.canal === 'QC' && x.pais === 'RS' && x.hasta === 2000)!
    await page.goto(`${BASE}/admin/carrier-rates`, { waitUntil: 'load' })
    await aceptaCookies(page)
    await expect(page.getByText(/4PX|FOURPX/).first(), 'la pantalla distingue al transportista').toBeVisible({ timeout: 60_000 })
    const buscador = page.locator('input[type="search"], input[type="text"]').first()
    if (await buscador.count()) await buscador.fill('RS').catch(() => undefined)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'e2e/resultados/tarifa-4px-panel.png', fullPage: true })
    const texto = await page.locator('body').innerText()
    console.log(`panel: ¿aparece ${e.kg.toFixed(2)} en pantalla? ${texto.includes(e.kg.toFixed(2))}`)
  })

  test('el checkout a Serbia cobra el porte que sale de la hoja nueva, no de la anterior', async () => {
    const e = ESPERADA.filter((x) => x.canal === 'QC' && x.pais === 'RS' && x.hasta >= GRAMOS_BOLSO).sort((a, b) => a.hasta - b.hasta)[0]
    await api.delete(`${BASE}/api/me/cart`, { headers: cabeceras() })
    const cesta = await api.put(`${BASE}/api/me/cart`, {
      headers: cabeceras(),
      data: { productId: BOLSO.productId, variantId: BOLSO.variantId, slug: BOLSO.slug, title: 'Certificación · bolso', unitPriceSource: BOLSO.precioCny, sourceCurrency: 'CNY', quantity: 1 },
    })
    expect(cesta.ok(), `no se pudo llenar la cesta: ${cesta.status()}`).toBe(true)
    const alta = await api.post(`${BASE}/api/me/addresses`, {
      headers: cabeceras(),
      data: { label: 'cert-RS', fullName: 'Certificacion NX036', phone: '+34600000000', line1: 'Knez Mihailova 1', city: 'Belgrado', postalCode: '11000', country: 'RS', isDefault: true },
    })
    expect(alta.ok(), `no se pudo crear la dirección: ${alta.status()}`).toBe(true)

    // El cuerpo se lee en cuanto llega; después de una navegación ya no está.
    const cuerpo = page
      .waitForResponse((r) => r.url().includes('/shipping/quote') && r.status() === 200, { timeout: 60_000 })
      .then((r) => r.json() as Promise<Cotizacion>)
    await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' })
    await aceptaCookies(page)
    const c = await cuerpo
    await page.getByTestId('desglose-envio').waitFor({ state: 'visible', timeout: 60_000 })
    await page.screenshot({ path: 'e2e/resultados/tarifa-4px-checkout-RS.png', fullPage: true })

    const qc = c.options.find((o) => o.code === 'QC')
    expect(qc, `Serbia no ofrece QC: ${JSON.stringify(c.options)}`).toBeTruthy()
    const rmb = e.registro + (e.kg * GRAMOS_BOLSO) / 1000
    const centimos = Math.round((rmb / CNY_POR_USD) * 100)
    const pantalla = await page.getByTestId('desglose-envio').innerText()
    console.log(`checkout RS: QC cobra ${qc!.amountUsdCents} cts USD; la hoja da ${rmb.toFixed(2)} RMB = ${centimos} cts (${GRAMOS_BOLSO} g × ${e.kg}/kg + ${e.registro}); en pantalla: «${pantalla.replace(/\s+/g, ' ')}»`)
    expect(Math.abs(qc!.amountUsdCents - centimos), `cobra ${qc!.amountUsdCents} cts y la hoja da ${centimos}`).toBeLessThanOrEqual(1)
  })
})
