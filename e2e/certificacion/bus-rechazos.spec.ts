import { expect, test } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de que lo que producción RECHAZA al recibir un producto se ve en preproducción.
 *
 * <p>Hasta el 19-nov-2026 un producto que producción no podía aplicar acababa en una cola que nadie
 * leía: preproducción lo daba por «anunciado» y no existía en la tienda. Se midieron 146 así. Solo
 * lee: no reintenta ni re-anuncia nada. Necesita una cuenta de ADMINISTRADOR de preproducción.
 */
interface Anuncio { externalId: string; estado?: string; error?: string }

test('el panel enseña los productos que producción rechazó, con su motivo', async ({ browser }) => {
  test.setTimeout(240_000)
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
  const page = await contexto.newPage()
  await consienteCookies(page)
  await entra(page)
  await ponElIdioma(page, 'es')
  const testigo = (await page.evaluate(() => window.localStorage.getItem('nx-access-token'))) ?? ''
  expect(testigo).toBeTruthy()

  const r = await contexto.request.get(`${BASE}/api/admin/catalog/bus/anuncios-fallidos`, { headers: { Authorization: `Bearer ${testigo}` } })
  expect(r.ok(), `el listado de anuncios fallidos respondió ${r.status()}`).toBe(true)
  const lista = (await r.json()) as Anuncio[]
  const porEstado = new Map<string, number>()
  for (const a of lista) porEstado.set(a.estado ?? '(sin estado)', (porEstado.get(a.estado ?? '(sin estado)') ?? 0) + 1)
  console.log(`anuncios con problema: ${lista.length} → ${[...porEstado].map(([e, n]) => `${e}: ${n}`).join(', ')}`)
  for (const a of lista) {
    expect(['FALLIDO', 'RECHAZADO_EN_DESTINO'], `estado desconocido en ${a.externalId}`).toContain(a.estado)
    expect((a.error ?? '').length, `${a.externalId} no dice por qué`).toBeGreaterThan(0)
  }

  await page.goto(`${BASE}/admin/catalog`, { waitUntil: 'load' })
  await aceptaCookies(page)
  if (lista.length > 0) {
    await expect(page.getByText(new RegExp(`${lista.length} producto\\(s\\) no se han podido anunciar`)).first()).toBeVisible({ timeout: 60_000 })
  }
  await page.screenshot({ path: 'e2e/resultados/bus-rechazos.png' })
  await contexto.close()
})
