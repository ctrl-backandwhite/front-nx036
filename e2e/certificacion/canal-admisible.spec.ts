import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { BASE, consienteCookies, cotizacionDelCheckout, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de que ningún pedido puede salir por un canal que no admite su mercancía, y de que el
 * canal SE VE: el comprador en el checkout, el administrador en la ficha y en el listado.
 *
 * <p>Lo que se comprueba aquí no daba ningún error antes del 19-nov-2026: un producto sin partida
 * cotizaba y fallaba al emitir la guía con el pedido ya pagado; una cesta que ningún canal admitía se
 * podía pedir saltándose la web, y nacía con envío a 0 y sin canal.
 *
 * <p>Necesita una cuenta de ADMINISTRADOR. UNA TANDA CADA VEZ por cuenta. Si el servidor llegara a
 * crear un pedido que debía rechazar, el caso falla y el pedido queda en el entorno: hay que anularlo.
 */
const ROPA = { productId: '003fe26f-b631-48b3-93b6-56318903e856', variantId: '31628f7a-bf9d-4e96-b6ca-7a9a00c78d41', slug: 't-1061718934078', precioCny: 16.8 }
const RELOJ = { productId: '00319234-b2e0-4c5d-a433-5d988a595c9f', variantId: '718f4777-89b8-46d4-ba76-0bd87fddae24' }
// Producto de PREPRODUCCIÓN sin partida arancelaria; en otro entorno se pasa por CERT_SIN_PARTIDA.
const SIN_PARTIDA = process.env['CERT_SIN_PARTIDA']
  ? JSON.parse(process.env['CERT_SIN_PARTIDA'])
  : { productId: 'e4f898eb-2951-4e0b-9027-d01f284c75f8', variantId: '22871e6f-6895-4379-8bb7-666794bee213' }

interface Opcion { code: string; carrier?: string; carrierName: string; lineType?: string }
interface Cotizacion { supported: boolean; shippingBlockedReason?: string; options: Opcion[] }
interface Articulo { productId: string; variantId: string }

let page: Page
let api: APIRequestContext
let testigo = ''
const direcciones: Record<string, string> = {}
const cabeceras = () => ({ Authorization: `Bearer ${testigo}` })

async function cotiza(pais: string, articulo: Articulo): Promise<Cotizacion> {
  const r = await api.post(`${BASE}/api/shipping/quote`, { headers: cabeceras(), data: { country: pais, items: [{ ...articulo, quantity: 1 }] } })
  expect(r.ok(), `la cotización a ${pais} respondió ${r.status()}`).toBe(true)
  return (await r.json()) as Cotizacion
}

async function direccion(pais: string, ciudad: string, cp: string): Promise<string> {
  const r = await api.post(`${BASE}/api/me/addresses`, {
    headers: cabeceras(),
    data: { label: `cert-${pais}`, fullName: 'Certificacion NX036', phone: '+34600000000', line1: 'Calle de la Certificacion 1', city: ciudad, postalCode: cp, country: pais, isDefault: true },
  })
  expect(r.ok(), `no se pudo crear la dirección de ${pais}: ${r.status()}`).toBe(true)
  return ((await r.json()) as { id: string }).id
}

/** Intenta crear el pedido SALTÁNDOSE la web, que es justo el camino que antes no tenía freno. */
async function pide(articulo: Articulo, idDeDireccion: string) {
  return api.post(`${BASE}/api/me/orders/checkout`, {
    headers: { ...cabeceras(), 'Idempotency-Key': `cert-canal-${Date.now()}-${Math.random()}` },
    data: { items: [{ ...articulo, quantity: 1 }], paymentMethod: 'CARD', shippingAddressId: idDeDireccion },
  })
}

test.describe.configure({ mode: 'serial', timeout: 240_000 })

test.describe('Ningún pedido sale por un canal que no admite su mercancía', () => {
  test.beforeAll(async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
    page = await contexto.newPage()
    api = contexto.request
    await consienteCookies(page)
    await entra(page)
    await ponElIdioma(page, 'es')
    testigo = (await page.evaluate(() => window.localStorage.getItem('nx-access-token'))) ?? ''
    expect(testigo, 'no hay testigo de sesión').toBeTruthy()
    direcciones['RS'] = await direccion('RS', 'Belgrado', '11000')
    direcciones['ES'] = await direccion('ES', 'Madrid', '28001')
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

  test('cada opción cotizada dice de quién es y qué clase de línea es', async () => {
    const c = await cotiza('ES', ROPA)
    expect(c.supported).toBe(true)
    for (const o of c.options) {
      expect(['YUNEXPRESS', 'FOURPX'], `la opción ${o.code} no dice su transportista`).toContain(o.carrier)
      expect(['ROPA', 'GENERAL', 'CON_BATERIA'], `la opción ${o.code} no dice su clase de línea`).toContain(o.lineType)
    }
    expect(c.options.find((o) => o.code === 'FZZXR')?.lineType, 'FZZXR es la línea de ropa').toBe('ROPA')
    console.log(`ES ropa: ${c.options.map((o) => `${o.carrier}/${o.code}/${o.lineType}`).join(', ')}`)
  })

  test('el comprador ve la clase de línea y el transportista en el checkout', async () => {
    await api.delete(`${BASE}/api/me/cart`, { headers: cabeceras() })
    const cesta = await api.put(`${BASE}/api/me/cart`, {
      headers: cabeceras(),
      data: { productId: ROPA.productId, variantId: ROPA.variantId, slug: ROPA.slug, title: 'Certificación · ropa', unitPriceSource: ROPA.precioCny, sourceCurrency: 'CNY', quantity: 1 },
    })
    expect(cesta.ok()).toBe(true)
    await cotizacionDelCheckout<Cotizacion>(page)
    await expect(page.getByText(/Línea de ropa · YunExpress/).first()).toBeVisible({ timeout: 60_000 })
    await page.screenshot({ path: 'e2e/resultados/canal-admisible-checkout.png', fullPage: true })
  })

  test('una cesta que ningún canal admite: la cotización lo dice y el servidor NO crea el pedido', async () => {
    const c = await cotiza('RS', RELOJ)
    expect(c.supported).toBe(false)
    expect(c.shippingBlockedReason).toBe('SIN_CANAL_ADMISIBLE')
    const r = await pide(RELOJ, direcciones['RS'])
    const cuerpo = await r.text()
    console.log(`pedido con batería a Serbia: HTTP ${r.status()} ${cuerpo.slice(0, 160)}`)
    expect(r.status(), `el servidor respondió ${r.status()}: ${cuerpo.slice(0, 200)}`).toBe(422)
    expect(cuerpo).toContain('SHIPPING_NOT_AVAILABLE')
  })

  test('un producto sin partida arancelaria no cotiza, y el servidor NO crea el pedido', async () => {
    const c = await cotiza('ES', SIN_PARTIDA)
    expect(c.supported).toBe(false)
    expect(c.shippingBlockedReason).toBe('PRODUCTO_SIN_PARTIDA')
    expect(c.options ?? []).toEqual([])
    const r = await pide(SIN_PARTIDA, direcciones['ES'])
    const cuerpo = await r.text()
    console.log(`pedido sin partida a España: HTTP ${r.status()} ${cuerpo.slice(0, 160)}`)
    expect(r.status(), `el servidor respondió ${r.status()}: ${cuerpo.slice(0, 200)}`).toBe(422)
    expect(cuerpo).toContain('SHIPPING_PRODUCT_WITHOUT_CUSTOMS_CODE')
  })

  test('el panel enseña el canal de un pedido y filtra los que tienen problema', async () => {
    const conProblema = await api.get(`${BASE}/api/admin/orders?canalProblema=true&page=0&size=20`, { headers: cabeceras() })
    expect(conProblema.ok(), `el listado filtrado respondió ${conProblema.status()}`).toBe(true)
    const todos = await api.get(`${BASE}/api/admin/orders?page=0&size=20`, { headers: cabeceras() })
    expect(todos.ok()).toBe(true)
    // La página del listado trae la lista bajo una clave que ha cambiado de nombre alguna vez: se busca
    // la primera lista del cuerpo en vez de atarse a una.
    interface Fila { id: string; shippingCarrier?: string; shippingChannelCode?: string; canalAdmisible?: boolean }
    const cuerpo = (await todos.json()) as Record<string, unknown> | Fila[]
    const filas = (Array.isArray(cuerpo) ? cuerpo : (Object.values(cuerpo).find((v) => Array.isArray(v)) ?? [])) as Fila[]
    expect(filas.length, 'no hay pedidos en el entorno con los que comprobar la ficha').toBeGreaterThan(0)
    console.log(`panel: ${filas.length} pedidos; con problema de canal: ${JSON.stringify(await conProblema.json()).slice(0, 120)}`)
    const pedido = filas.find((f) => f.shippingChannelCode) ?? filas[0]
    await page.goto(`${BASE}/admin/orders/${pedido.id}`, { waitUntil: 'load' })
    await expect(page.getByTestId('canal-del-pedido')).toBeVisible({ timeout: 60_000 })
    const transportista = (await page.getByTestId('canal-transportista').innerText()).trim()
    const canal = (await page.getByTestId('canal-canal').innerText()).trim()
    console.log(`ficha ${pedido.id.slice(0, 8)}: transportista «${transportista}», canal «${canal.replace(/\s+/g, ' ')}», línea «${(await page.getByTestId('canal-linea').innerText()).trim()}»`)
    if (pedido.shippingChannelCode) expect(canal).toContain(pedido.shippingChannelCode)
    await page.screenshot({ path: 'e2e/resultados/canal-admisible-ficha.png', fullPage: true })
  })
})
