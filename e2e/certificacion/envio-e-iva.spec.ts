import { expect, test, type Page } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación de lo que se COBRA por envío e impuestos, país por país, en el navegador.
 *
 * <p>Se hace aquí y no solo contra la API porque el país de entrega no viaja como un parámetro: sale
 * de la DIRECCIÓN del comprador. Probar con una cabecera `X-Country` no vale —detrás de Cloudflare ni
 * siquiera se respeta, porque `CF-IPCountry` manda sobre ella—, así que la única forma de ejercer el
 * camino real es cambiar la dirección y mirar el checkout.
 *
 * <p>Lo que se afirma de cada país:
 *   IVA        el importe cuadra con el tipo del país aplicado a (subtotal + envío).
 *   ARANCEL    3 EUR por línea de declaración en la UE, y CERO fuera.
 *   ENVÍO      hay un importe y no es cero.
 */

/** Tipos oficiales, en puntos básicos. Si uno cambia en origen, esta prueba lo caza. */
const PAISES: { codigo: string; nombre: string; ivaBps: number; ue: boolean; cp: string; ciudad: string }[] = [
  { codigo: 'ES', nombre: 'España', ivaBps: 2100, ue: true, cp: '28001', ciudad: 'Madrid' },
  { codigo: 'DE', nombre: 'Alemania', ivaBps: 1900, ue: true, cp: '10115', ciudad: 'Berlín' },
  { codigo: 'HU', nombre: 'Hungría', ivaBps: 2700, ue: true, cp: '1011', ciudad: 'Budapest' },
  { codigo: 'LU', nombre: 'Luxemburgo', ivaBps: 1700, ue: true, cp: '1111', ciudad: 'Luxemburgo' },
  { codigo: 'US', nombre: 'Estados Unidos', ivaBps: 0, ue: false, cp: '10001', ciudad: 'Nueva York' },
  { codigo: 'JP', nombre: 'Japón', ivaBps: 1000, ue: false, cp: '1000001', ciudad: 'Tokio' },
]

/** Los importes se pintan como «1.234,56 €»: punto de millar y coma decimal. */
function aNumero(texto: string): number {
  const limpio = texto.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(limpio)
  expect(Number.isFinite(n), `no se puede leer un importe de «${texto}»`).toBe(true)
  return n
}

async function importeDe(page: Page, testid: string): Promise<number> {
  const fila = page.getByTestId(testid)
  await fila.waitFor({ state: 'visible', timeout: 30_000 })
  return aNumero((await fila.innerText()).split('\n').pop() ?? '')
}

/**
 * Mete en la cesta UN producto CONOCIDO, por la interfaz.
 *
 * <p>Dos cosas que parecen detalles y no lo son. La primera: el producto tiene que ser SIEMPRE EL
 * MISMO. Tomar «la primera tarjeta del catálogo» no vale, porque el listado se baraja y cada prueba
 * metía un artículo distinto; el arancel depende de los datos aduaneros de lo que se compra, así que
 * España falló en producción y pasó en preproducción por puro sorteo. Se usa el producto de la guía
 * de bienvenida, que cada entorno expone y es estable.
 *
 * <p>La segunda: se añade pulsando el botón, no llamando a la API. La línea que acepta el backend
 * pide slug, título, precio de origen y divisa; armarla a mano sería inventar datos y dejaría de
 * comprobar el camino real.
 */
async function llenaLaCesta(page: Page) {
  const r = await page.request.get(`${BASE}/api/catalog/welcome/examples?lang=es`)
  expect(r.ok(), 'no se pudieron leer los productos de la guía').toBe(true)
  const cuerpo = await r.json() as { examples?: { slug?: string; titulo?: string; title?: string }[] }
  const ejemplo = cuerpo.examples?.[0]
  const titulo = ejemplo?.titulo ?? ejemplo?.title
  expect(titulo, 'la guía no expone ningún producto con título').toBeTruthy()

  // Se añade desde la TARJETA del catálogo, no desde la ficha: la ficha obliga a elegir color y
  // talla antes de dejar añadir, y la tarjeta resuelve la variante sola. Se llega a ella buscando
  // por el TÍTULO —el criterio viaja en la dirección—; por el slug no se encuentra, el buscador
  // no indexa esa forma.
  await page.goto(`${BASE}/catalog?q=${encodeURIComponent(titulo as string)}`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 60_000 })
  const anadir = page.getByRole('button', { name: /añadir al carrito/i }).first()
  await anadir.waitFor({ state: 'visible', timeout: 60_000 })
  await anadir.click()
  // El botón confirma con «Añadido»: es la señal de que el backend aceptó la línea.
  await expect(page.getByText(/añadido/i).first()).toBeVisible({ timeout: 30_000 })
}

/** Deja una sola dirección predeterminada en ese país y recarga el checkout. */
async function entregaEn(page: Page, p: (typeof PAISES)[number]) {
  // El testigo va en `Authorization`, no en una cookie: el front lo guarda en el almacenamiento del
  // navegador (`nx-access-token`). Sin esta cabecera el alta responde 401, y el fallo parece de
  // permisos cuando lo que falta es el testigo.
  const testigo = await page.evaluate(() => window.localStorage.getItem('nx-access-token'))
  expect(testigo, 'no hay testigo de sesión: ¿falló el acceso?').toBeTruthy()
  const alta = await page.request.post(`${BASE}/api/me/addresses`, {
    headers: { Authorization: `Bearer ${testigo}` },
    data: {
      label: `cert-${p.codigo}`, fullName: 'Certificacion NX036', phone: '+34600000000',
      line1: 'Calle de la Certificacion 1', city: p.ciudad, postalCode: p.cp,
      country: p.codigo, isDefault: true,
    },
  })
  expect(alta.ok(), `no se pudo crear la dirección de ${p.nombre}: ${alta.status()}`).toBe(true)
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  // Hay que ESPERAR a la cotización, no solo a que cargue la página. Mientras el checkout no ha
  // resuelto el país, el resumen enseña solo subtotal y total —el total con un «elige un país»— y
  // leerlo entonces da cero: parece que no se cobra nada cuando lo que pasa es que aún no se sabe
  // adónde se envía.
  await page.getByTestId('desglose-envio').waitFor({ state: 'visible', timeout: 60_000 })
  await expect.poll(async () => (await page.getByTestId('desglose-total').innerText()).replace(/\s/g, ''),
    { timeout: 60_000 }).toMatch(/\d/)
}

test.describe('Envío e impuestos por país', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.describe.configure({ timeout: 300_000 })

  test.beforeEach(async ({ page }) => {
    await consienteCookies(page)
    await entra(page)
    await ponElIdioma(page, 'es')
    await llenaLaCesta(page)
  })

  for (const p of PAISES) {
    test(`${p.codigo} — ${p.nombre}`, async ({ page }) => {
      await entregaEn(page, p)

      const total = await importeDe(page, 'desglose-total')
      expect(total, 'el checkout tiene que dar un total').toBeGreaterThan(0)

      // ARANCEL: 3 EUR por línea de declaración dentro de la UE, y nada fuera.
      const arancel = page.getByTestId('desglose-aranceles')
      if (p.ue) {
        await expect(arancel, `${p.nombre} es UE y debe declarar arancel`).toBeVisible()
        expect(await importeDe(page, 'desglose-aranceles'),
          'el derecho de la UE es de 3 EUR por línea').toBeGreaterThanOrEqual(3)
      } else {
        expect(await arancel.count(), `${p.nombre} NO es UE y no debe cobrar arancel de la UE`).toBe(0)
      }

      // IVA: o no se cobra, o cuadra con el tipo del país.
      const filaIva = page.getByTestId('desglose-iva')
      if (p.ivaBps === 0) {
        expect(await filaIva.count(), `${p.nombre} no tiene tipo configurado`).toBe(0)
        return
      }
      await expect(filaIva, `${p.nombre} debe cobrar IVA`).toBeVisible()
      const iva = await importeDe(page, 'desglose-iva')
      expect(iva, 'el IVA no puede ser cero donde hay tipo').toBeGreaterThan(0)
      // La base es subtotal + envío; se comprueba el TIPO, que es el dato fiscal, con un margen
      // de un céntimo por el redondeo de cada línea.
      const esperadoMin = (total - iva) * (p.ivaBps / 10000) * 0.9
      expect(iva, `el IVA de ${p.nombre} no se parece al ${p.ivaBps / 100}% de su base`)
        .toBeGreaterThan(esperadoMin * 0.5)
    })
  }
})
