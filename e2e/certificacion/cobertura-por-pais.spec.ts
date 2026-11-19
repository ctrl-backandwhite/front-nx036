import { writeFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { BASE, consienteCookies, entra } from './sesion-certificada'

/**
 * Foto de lo que la tienda ofrece para enviar, país a país: qué canales y de qué transportista.
 *
 * <p>No afirma un resultado fijo: escribe la foto en `CERT_FOTO` para compararla antes y después de
 * un cambio en las reglas de envío. Lo único que exige es que ningún destino HABILITADO se quede sin
 * canal para mercancía general con partida, que es como se pierde una venta sin que nada falle.
 * Solo cotiza: no toca la cesta ni las direcciones.
 */
const BOLSO = { productId: '001bcdfa-2957-4ae0-912c-f6b3dc938371', variantId: '7dc7ed5c-b66a-4858-93da-aed551029260' }

test('cada destino habilitado ofrece al menos un canal para mercancía general', async ({ browser }) => {
  test.setTimeout(600_000)
  const contexto = await browser.newContext({ locale: 'es-ES' })
  const page = await contexto.newPage()
  await consienteCookies(page)
  await entra(page)
  const testigo = (await page.evaluate(() => window.localStorage.getItem('nx-access-token'))) ?? ''
  expect(testigo).toBeTruthy()
  const api = contexto.request
  const paises = (await (await api.get(`${BASE}/api/shipping/countries`)).json()) as { code?: string; countryCode?: string }[]
  const foto: Record<string, unknown> = {}
  const sinCanal: string[] = []
  for (const p of paises) {
    const codigo = (p.code ?? p.countryCode ?? '') as string
    if (!codigo) continue
    const r = await api.post(`${BASE}/api/shipping/quote`, {
      headers: { Authorization: `Bearer ${testigo}` },
      data: { country: codigo, items: [{ productId: BOLSO.productId, variantId: BOLSO.variantId, quantity: 1 }] },
    })
    if (!r.ok()) { foto[codigo] = { http: r.status() }; sinCanal.push(`${codigo}(http ${r.status()})`); continue }
    const c = (await r.json()) as { supported: boolean; shippingBlockedReason?: string; options?: { code: string; carrierName: string; amountUsdCents: number }[] }
    const opciones = (c.options ?? []).map((o) => `${o.carrierName}:${o.code}:${o.amountUsdCents}`)
    foto[codigo] = { supported: c.supported, motivo: c.shippingBlockedReason ?? null, opciones }
    if (!c.supported || opciones.length === 0) sinCanal.push(codigo)
    await page.waitForTimeout(700)
  }
  if (process.env['CERT_FOTO']) writeFileSync(process.env['CERT_FOTO'], JSON.stringify(foto, null, 1))
  console.log(`destinos: ${Object.keys(foto).length}; sin canal: ${sinCanal.join(', ') || 'ninguno'}`)
  await contexto.close()
  expect(sinCanal, `destinos habilitados sin canal: ${sinCanal.join(', ')}`).toEqual([])
})
