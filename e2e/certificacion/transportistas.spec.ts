import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de que cada transportista cumple lo que su CONTRATO fija para cada línea.
 *
 * <p>Lo que se comprueba no es que el checkout pinte bien, sino que no ofrezca lo que el transportista
 * va a rechazar. Ninguno de estos fallos da un error al cotizar ni al cobrar: aparecen en el almacén
 * del transportista, con el pedido ya pagado. El contrato de cada línea está resumido, con sus citas,
 * en `docs/envios/CONTRATO-POR-CANAL.md`.
 *
 * <p>Tres cosas que hay que saber antes de lanzarla:
 *
 * <ul>
 * <li><b>UNA TANDA CADA VEZ por cuenta.</b> Cada caso cambia la cesta y la dirección predeterminada de
 *     la cuenta; dos tandas a la vez se pisan y la que pierde acusa al checkout de algo que no hizo.
 * <li><b>Entra UNA sola vez.</b> El backend limita los accesos y a partir del undécimo responde 429.
 * <li><b>Los productos son del entorno.</b> Los identificadores por defecto son de PREPRODUCCIÓN; en
 *     otro entorno se pasan por `CERT_PRODUCTOS`. Hace falta uno de ropa, uno que no lo sea, uno con
 *     batería y uno de calzado, porque lo que decide la línea es la partida arancelaria.
 * </ul>
 *
 * <p>Reino Unido se enciende para 4PX mientras dura la tanda —y se apaga al terminar, pase lo que
 * pase—: es el destino donde los dos transportistas tienen línea de ropa y línea general, así que es
 * donde se ve si compiten bien y si cada uno aplica SU régimen de impuestos.
 */

interface Producto {
  productId: string
  variantId: string
  slug: string
  precioCny: number
}

const PRODUCTOS: Record<'ropa' | 'bolso' | 'reloj' | 'calzado', Producto> = process.env['CERT_PRODUCTOS']
  ? JSON.parse(process.env['CERT_PRODUCTOS'])
  : {
      // 610990: camiseta. Entra en todas las líneas de ropa.
      ropa: { productId: '003fe26f-b631-48b3-93b6-56318903e856', variantId: '31628f7a-bf9d-4e96-b6ca-7a9a00c78d41', slug: 't-1061718934078', precioCny: 16.8 },
      // 420222: bolso. Mercancía general: ninguna línea de ropa lo admite.
      bolso: { productId: '001bcdfa-2957-4ae0-912c-f6b3dc938371', variantId: '7dc7ed5c-b66a-4858-93da-aed551029260', slug: 'bags-990211344081', precioCny: 32 },
      // 910211: reloj con pila. Solo puede ir por una línea 带电.
      reloj: { productId: '00319234-b2e0-4c5d-a433-5d988a595c9f', variantId: '718f4777-89b8-46d4-ba76-0bd87fddae24', slug: 'product-623411760038', precioCny: 48 },
      // 640299: calzado. La línea de ropa de YunExpress lo admite; las de 4PX, no.
      calzado: { productId: '00090ff4-57b9-4eca-ae99-77ea3af8a4f5', variantId: '06207ed1-dbe2-407f-ba85-8749622c72bb', slug: '96-598093055330', precioCny: 13.8 },
    }

const DIRECCIONES: Record<string, { ciudad: string; cp: string; linea: string }> = {
  ES: { ciudad: 'Madrid', cp: '28001', linea: 'Calle de la Certificacion 1' },
  RS: { ciudad: 'Belgrado', cp: '11000', linea: 'Knez Mihailova 1' },
  GB: { ciudad: 'London', cp: 'SW1A 1AA', linea: '1 Certification Street' },
}

interface Opcion {
  code: string
  carrierName: string
  amountUsdCents: number
}

interface Cotizacion {
  supported: boolean
  taxMode: string
  taxRateBps: number
  customsBlocked: boolean
  customsLimit: string
  options: Opcion[]
}

type Linea = [keyof typeof PRODUCTOS, number]

let page: Page
let api: APIRequestContext
let testigo = ''

const cabeceras = () => ({ Authorization: `Bearer ${testigo}` })

/** Lo que el servidor ofrece para esas líneas en ese país, con la opción indicada si se elige una. */
async function cotiza(pais: string, lineas: Linea[], opcion?: string): Promise<Cotizacion> {
  const r = await api.post(`${BASE}/api/shipping/quote`, {
    headers: cabeceras(),
    data: {
      country: pais,
      items: lineas.map(([tipo, cantidad]) => ({
        productId: PRODUCTOS[tipo].productId,
        variantId: PRODUCTOS[tipo].variantId,
        quantity: cantidad,
      })),
      shippingOptionCode: opcion,
    },
  })
  expect(r.ok(), `la cotización a ${pais} respondió ${r.status()}`).toBe(true)
  return (await r.json()) as Cotizacion
}

const codigos = (c: Cotizacion) => c.options.map((o) => o.code)
const de = (c: Cotizacion, transportista: string) => c.options.filter((o) => o.carrierName === transportista)

/** Deja la cesta EXACTAMENTE con esas líneas y la dirección predeterminada en ese país. */
async function preparaElCheckout(pais: string, lineas: Linea[]) {
  await api.delete(`${BASE}/api/me/cart`, { headers: cabeceras() })
  for (const [tipo, cantidad] of lineas) {
    const p = PRODUCTOS[tipo]
    const r = await api.put(`${BASE}/api/me/cart`, {
      headers: cabeceras(),
      data: {
        productId: p.productId, variantId: p.variantId, slug: p.slug, title: `Certificación · ${tipo}`,
        unitPriceSource: p.precioCny, sourceCurrency: 'CNY', quantity: cantidad,
      },
    })
    expect(r.ok(), `no se pudo poner «${tipo}» en la cesta: ${r.status()}`).toBe(true)
  }
  const d = DIRECCIONES[pais]
  const alta = await api.post(`${BASE}/api/me/addresses`, {
    headers: cabeceras(),
    data: {
      label: `cert-${pais}`, fullName: 'Certificacion NX036', phone: '+34600000000',
      line1: d.linea, city: d.ciudad, postalCode: d.cp, country: pais, isDefault: true,
    },
  })
  expect(alta.ok(), `no se pudo crear la dirección de ${pais}: ${alta.status()}`).toBe(true)
}

/** Abre el checkout y espera a la RESPUESTA de la cotización, no a que aparezca una fila. */
async function abreElCheckout(): Promise<Cotizacion> {
  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/shipping/quote') && r.status() === 200, { timeout: 60_000 })
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  return (await (await respuesta).json()) as Cotizacion
}

/** Las direcciones `cert-…` de tandas anteriores: se acumulan y acaban tapando el checkout. */
async function limpiaLasDireccionesDeCertificacion() {
  const r = await api.get(`${BASE}/api/me/addresses`, { headers: cabeceras() })
  if (!r.ok()) return
  const direcciones = (await r.json()) as { id: string; label?: string }[]
  for (const d of direcciones.filter((x) => (x.label ?? '').startsWith('cert-'))) {
    await api.delete(`${BASE}/api/me/addresses/${d.id}`, { headers: cabeceras() })
  }
}

async function cobertura4pxEnReinoUnido(habilitado: boolean) {
  const r = await api.put(`${BASE}/api/admin/carrier-coverage/FOURPX/GB`, {
    headers: cabeceras(),
    data: { countryName: 'Reino Unido', zone: 'EU', baseCents: 499, perKgCents: 350, etaMinDays: 6, etaMaxDays: 10, enabled: habilitado },
  })
  expect(r.ok(), `no se pudo ${habilitado ? 'encender' : 'apagar'} Reino Unido para 4PX: ${r.status()}`).toBe(true)
}

test.describe.configure({ mode: 'serial', timeout: 240_000 })

test.describe('Cada transportista cumple lo contratado en cada línea', () => {
  test.beforeAll(async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
    page = await contexto.newPage()
    api = contexto.request
    await consienteCookies(page)
    await entra(page)
    await ponElIdioma(page, 'es')
    testigo = (await page.evaluate(() => window.localStorage.getItem('nx-access-token'))) ?? ''
    expect(testigo, 'no hay testigo de sesión: ¿falló el acceso?').toBeTruthy()
    await limpiaLasDireccionesDeCertificacion()
    await cobertura4pxEnReinoUnido(true)
  })

  test.afterAll(async () => {
    // Pase lo que pase: un destino de prueba encendido se queda A LA VENTA.
    await cobertura4pxEnReinoUnido(false)
    await api.delete(`${BASE}/api/me/cart`, { headers: cabeceras() })
    await limpiaLasDireccionesDeCertificacion()
    await page.context().close()
  })

  // ───────────────────────────────────────────── YunExpress, en la UE

  test('YunExpress · España · ropa: se ofrece la línea de ropa, con impuestos incluidos', async () => {
    const c = await cotiza('ES', [['ropa', 1]])

    expect(c.supported).toBe(true)
    expect(codigos(c), 'la línea de ropa es la que le toca a una camiseta').toContain('FZZXR')
    expect([...new Set(c.options.map((o) => o.carrierName))], '4PX no tiene cobertura en la UE').toEqual(['YunExpress'])
    expect(c.taxMode).toBe('DDP')
    expect(c.taxRateBps, 'IVA de España').toBe(2100)
    expect(c.customsBlocked).toBe(false)
  })

  test('YunExpress · España · bolso: la línea de ropa NO se ofrece', async () => {
    const c = await cotiza('ES', [['bolso', 1]])

    expect(codigos(c), 'FZZXR es 服装专线: un bolso no entra').not.toContain('FZZXR')
    expect(codigos(c), 'pero sí la línea general').toContain('THPHR')
  })

  test('YunExpress · España · ropa y bolso juntos: manda el más restrictivo', async () => {
    const c = await cotiza('ES', [['ropa', 1], ['bolso', 1]])

    expect(codigos(c), 'basta un bolso en la bolsa para que la línea de ropa rechace la guía').not.toContain('FZZXR')
    expect(c.options.length).toBeGreaterThan(0)
  })

  test('YunExpress · España · calzado: la línea de ropa SÍ lo admite', async () => {
    const c = await cotiza('ES', [['calzado', 1]])

    expect(codigos(c), 'el calzado entró en FZZXR el 16-oct-2026').toContain('FZZXR')
  })

  test('YunExpress · España · con batería: solo queda la línea 带电', async () => {
    const c = await cotiza('ES', [['reloj', 1]])

    expect(c.supported).toBe(true)
    expect(codigos(c), 'THPHR, FZZXR, ZBZXRPH y DHZXRPH son 普货: ninguna acepta batería').toEqual(['THZXR'])
  })

  test('YunExpress · España · por encima de 150 EUR: se rechaza antes de pagar, y se dice', async () => {
    await preparaElCheckout('ES', [['bolso', 30]])

    const c = await abreElCheckout()

    expect(c.customsBlocked, 'en la UE no se vende por encima de la franquicia').toBe(true)
    // El límite que se enseña es el MÁS ESTRICTO de los dos en juego: los 150 EUR de la franquicia o
    // el tope de valor de la línea de YunExpress (155 USD), que al cambio queda por debajo.
    expect(['150 EUR', '155 USD'], 'el límite tiene que ser uno de los dos contratados').toContain(c.customsLimit)
    await expect(page.getByRole('alert').filter({ hasText: c.customsLimit }).first()).toBeVisible({ timeout: 30_000 })
  })

  // ───────────────────────────────────────────── 4PX, donde solo llega él

  test('4PX · Serbia · mercancía general: sale por QC, sin impuestos y avisándolo', async () => {
    await preparaElCheckout('RS', [['bolso', 1]])

    const c = await abreElCheckout()
    await page.getByTestId('desglose-envio').waitFor({ state: 'visible', timeout: 60_000 })

    expect([...new Set(c.options.map((o) => o.carrierName))]).toEqual(['4PX'])
    expect(codigos(c), 'QC es la línea general de 4PX a Serbia').toEqual(['QC'])
    expect(c.taxMode, '4PX no recauda el impuesto: lo paga el destinatario').toBe('DDU')
    expect(c.taxRateBps).toBe(0)
    expect(c.customsBlocked).toBe(false)
    await expect(page.getByText('4PX').first(), 'el comprador ve quién lleva su paquete').toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('desglose-impuestos-al-recibir')).toBeVisible()
    expect(await page.getByTestId('desglose-iva').count()).toBe(0)
  })

  test('4PX · Serbia · por encima de 50 EUR: su contrato no lo acepta, y se dice con SU límite', async () => {
    // «塞尔维亚：不接受超过50欧的包裹». El 11-nov-2026 el checkout cotizó aquí un pedido de 116 USD.
    await preparaElCheckout('RS', [['bolso', 8]])

    const c = await abreElCheckout()

    expect(c.customsBlocked, 'el transportista rechazaría el bulto con el pedido ya cobrado').toBe(true)
    expect(c.customsLimit, 'el límite que se enseña es el del transportista, no el del país').toBe('50 EUR')
    await expect(page.getByRole('alert').filter({ hasText: '50 EUR' }).first()).toBeVisible({ timeout: 30_000 })
  })

  test('4PX · Serbia · con batería: nadie puede llevarlo, y no se cobra un porte sin canal', async () => {
    const c = await cotiza('RS', [['reloj', 1]])

    expect(c.options, 'las líneas de 4PX son todas 普货').toEqual([])
    expect(c.supported, 'sin línea que lo admita, el destino no se sirve para ESTE pedido').toBe(false)
  })

  // ───────────────────────────────────────────── los dos a la vez

  test('Reino Unido · ropa: cotizan los dos y la lista sale ordenada por precio', async () => {
    const c = await cotiza('GB', [['ropa', 1]])

    expect(de(c, 'YunExpress').length, 'YunExpress cotiza').toBeGreaterThan(0)
    expect(de(c, '4PX').length, '4PX cotiza').toBeGreaterThan(0)
    // No se afirma que salga S1427: comparte plazo con O5, el enrutador se queda con la más barata
    // de las dos, y con el divisor /6000 de la línea de ropa gana O5. Que la línea de ropa admite
    // ropa lo comprueban las pruebas unitarias contra el contrato sembrado.
    const importes = c.options.map((o) => o.amountUsdCents)
    expect(importes, 'de más barata a más cara').toEqual([...importes].sort((a, b) => a - b))
  })

  test('Reino Unido · bolso: ninguna línea de ropa, de ninguno de los dos', async () => {
    const c = await cotiza('GB', [['bolso', 1]])

    expect(codigos(c)).not.toContain('FZZXR')
    for (const linea of ['S1427', 'S5234', 'S5537']) {
      expect(codigos(c), `${linea} es 服装专线`).not.toContain(linea)
    }
    expect(c.options.length, 'pero sigue habiendo por dónde enviarlo').toBeGreaterThan(0)
  })

  test('Reino Unido · calzado: lo admite la línea de ropa de YunExpress y NO la de 4PX', async () => {
    const c = await cotiza('GB', [['calzado', 1]])

    expect(de(c, '4PX').map((o) => o.code), 'el calzado no figura en «衣服、帽子、围巾、袜子、床上四件套»').not.toContain('S1427')
  })

  test('Reino Unido · el régimen de impuestos sigue al transportista elegido', async () => {
    const base = await cotiza('GB', [['bolso', 1]])
    const deYun = de(base, 'YunExpress')[0]
    const de4px = de(base, '4PX')[0]
    expect(deYun, 'hace falta una opción de YunExpress para comparar').toBeTruthy()
    expect(de4px, 'hace falta una opción de 4PX para comparar').toBeTruthy()

    const conYun = await cotiza('GB', [['bolso', 1]], deYun.code)
    const con4px = await cotiza('GB', [['bolso', 1]], de4px.code)

    expect(conYun.taxMode, 'YunExpress lleva este destino con el impuesto incluido').toBe('DDP')
    expect(conYun.taxRateBps).toBe(2000)
    expect(con4px.taxMode, 'el mismo pedido, por 4PX, va con el impuesto a cargo del destinatario').toBe('DDU')
    expect(con4px.taxRateBps).toBe(0)
  })

  test('Reino Unido · en el checkout cada opción dice quién la lleva', async () => {
    await preparaElCheckout('GB', [['bolso', 1]])

    const c = await abreElCheckout()
    await page.getByTestId('desglose-envio').waitFor({ state: 'visible', timeout: 60_000 })

    expect(new Set(c.options.map((o) => o.carrierName)).size, 'compiten los dos').toBe(2)
    await expect(page.getByText('YunExpress').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('4PX').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/transportistas-reino-unido.png', fullPage: true })
  })
})
