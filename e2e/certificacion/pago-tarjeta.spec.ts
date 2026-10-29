import { expect, test, type Page } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación del COBRO CON TARJETA contra el sandbox de Stripe, en el navegador.
 *
 * <p>Se hace de punta a punta y no contra la API porque la tarjeta NO se teclea en nuestra web: el
 * pedido se paga en un Checkout HOSPEDADO de Stripe, al que se llega por redirección, y el cobro se
 * confirma al volver (`/checkout/return` → `POST /me/orders/{id}/payments/{pago}/confirm`). Probar
 * solo que se crea la sesión deja sin ejercer justo el tramo donde se pierde el dinero: la vuelta.
 *
 * <p><b>EL INTERRUPTOR DE SEGURIDAD.</b> Antes de escribir un solo dígito se comprueba que la sesión
 * de Stripe es de PRUEBA —su identificador empieza por `cs_test_`—. Si no lo es, la prueba FALLA y no
 * rellena nada. No es una precaución decorativa: las claves de producción y las de prueba se
 * configuran en la misma variable, y un despliegue con la clave equivocada convertiría esta
 * certificación en una compra real con una tarjeta inventada. Hoy no hay nada en modo productivo, y
 * el día que lo haya esta comprobación es lo que impide que la suite cobre de verdad.
 *
 * <p>Lo que se afirma:
 *   IMPORTE    lo que Stripe pide cobrar es lo que el checkout enseñó como total, al céntimo.
 *   MONEDA     la de liquidación del comprador (EUR navegando en euros).
 *   APROBADO   con la tarjeta de prueba que Stripe publica, el pedido termina PAID.
 *   RECHAZADO  con la tarjeta de rechazo, el pedido NO termina PAID y la tienda lo dice.
 *
 * <p>HUECO DECLARADO: PayPal no se certifica aquí. Necesita una cuenta de comprador del sandbox de
 * PayPal que no está en el repositorio. Mientras no exista, es un caso SIN EJECUTAR, no un aprobado.
 */

/** Tarjetas de prueba PUBLICADAS por Stripe. No son tarjetas de nadie. */
const TARJETA_OK = '4242424242424242'
const TARJETA_RECHAZADA = '4000000000000002'

/**
 * Lee un importe venga en el formato que venga.
 *
 * <p>Hace falta porque en esta pantalla conviven los dos: el escaparate escribe «1.234,56 €» cuando
 * se navega en euros y «$1,234.56» cuando se navega en dólares, y la pasarela siempre en
 * anglosajón. Un lector que dé por supuesto el español lee «$17.84» como 1.784 —y no falla, da otro
 * número—, que es exactamente lo que pasó la primera vez.
 *
 * <p>La regla que sirve para los dos: **el último separador es el decimal**, y solo si lo que queda
 * detrás son una o dos cifras. Si detrás hay tres, es un separador de millares («1.234», «58,496»).
 */
function aNumero(texto: string): number {
  const crudo = texto.replace(/[^\d.,-]/g, '')
  const ultimo = Math.max(crudo.lastIndexOf('.'), crudo.lastIndexOf(','))
  const decimales = ultimo >= 0 ? crudo.length - ultimo - 1 : 0
  const limpio = ultimo >= 0 && decimales > 0 && decimales < 3
    ? crudo.slice(0, ultimo).replace(/[.,]/g, '') + '.' + crudo.slice(ultimo + 1)
    : crudo.replace(/[.,]/g, '')
  const n = Number(limpio)
  expect(Number.isFinite(n), `no se puede leer un importe de «${texto}»`).toBe(true)
  return n
}

async function totalDelCheckout(page: Page): Promise<{ valor: number; simbolo: string }> {
  const fila = page.getByTestId('desglose-total')
  await fila.waitFor({ state: 'visible', timeout: 60_000 })
  const texto = (await fila.innerText()).split('\n').pop() ?? ''
  return { valor: aNumero(texto), simbolo: texto.includes('$') ? '$' : '€' }
}

/** El testigo vive en el almacenamiento del navegador, no en una cookie. */
async function testigo(page: Page): Promise<string> {
  const t = await page.evaluate(() => window.localStorage.getItem('nx-access-token'))
  expect(t, 'no hay testigo de sesión: ¿falló el acceso?').toBeTruthy()
  return t as string
}

/**
 * Deja UNA dirección española predeterminada y espera a la cotización.
 *
 * <p>Se espera a la RESPUESTA de `/shipping/quote` y no a que aparezca una fila: el resumen se pinta
 * por partes y leerlo a medias da un total que todavía no incluye impuestos ni arancel. Compararlo
 * después contra lo que pide Stripe acusaría de descuadre a un cobro correcto.
 */
async function preparaElCheckout(page: Page) {
  const alta = await page.request.post(`${BASE}/api/me/addresses`, {
    headers: { Authorization: `Bearer ${await testigo(page)}` },
    data: {
      label: 'cert-pago', fullName: 'Certificacion NX036', phone: '+34600000000',
      line1: 'Calle de la Certificacion 1', city: 'Madrid', postalCode: '28001',
      country: 'ES', isDefault: true,
    },
  })
  expect(alta.ok(), `no se pudo crear la dirección: ${alta.status()}`).toBe(true)

  const cotizacion = page.waitForResponse(
    (r) => r.url().includes('/shipping/quote') && r.status() === 200,
    { timeout: 60_000 },
  )
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  await cotizacion
  await page.getByTestId('desglose-envio').waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * Deja elegida la tarjeta, abriendo antes el desplegable si hace falta.
 *
 * <p>En el checkout el método de pago vive dentro de un desplegable cuyo rótulo YA DICE cuál está
 * elegido —«Método de pago · Tarjeta de crédito / débito»—, y los botones de los métodos no existen
 * en el árbol hasta abrirlo. Buscar el botón de la tarjeta sin abrir agota el tiempo contra una
 * pantalla que, además, ya tenía la tarjeta puesta.
 */
async function eligeLaTarjeta(page: Page) {
  const porAncla = page.getByTestId('metodo-tarjeta')
  if (await porAncla.count()) {
    await porAncla.click()
    return
  }
  const desplegable = page.getByRole('button', { name: /método de pago/i }).first()
  if (await desplegable.count()) {
    const yaEsTarjeta = /tarjeta/i.test(await desplegable.innerText())
    await desplegable.click()
    const opcion = page.getByRole('button', { name: /tarjeta de crédito/i }).first()
    if (await opcion.count()) {
      await opcion.click()
      return
    }
    expect(yaEsTarjeta, 'no hay forma de elegir la tarjeta ni venía elegida').toBe(true)
    await desplegable.click()
    return
  }
  await page.getByRole('button', { name: /tarjeta de crédito/i }).first().click()
}

/**
 * El botón de confirmar.
 *
 * <p>Sin ancla hay que ir por el selector: en el build desplegado el botón se pinta con un icono y
 * el rótulo dentro de una rama condicional, y sale del árbol de accesibilidad **sin nombre**, así
 * que por su texto no se encuentra aunque esté ahí.
 *
 * <p>Y hay que ACOTARLO al checkout. Coger «el último `button[type=submit]` de la página» pulsaba
 * el de suscribirse al boletín, que vive en el pie y también es de envío: el checkout no se movía y
 * la pantalla contestaba «Este campo es obligatorio» por el correo vacío del boletín, que no tiene
 * nada que ver con el pago. El botón del pago es el único a ancho completo.
 */
function botonDePagar(page: Page) {
  return page.getByTestId('confirmar-y-pagar')
    .or(page.locator('button[type="submit"].btn-primary.w-full'))
    .first()
}

/** Mete en la cesta el producto de la guía de bienvenida: estable en los dos entornos. */
async function llenaLaCesta(page: Page) {
  const r = await page.request.get(`${BASE}/api/catalog/welcome/examples?lang=es`)
  expect(r.ok(), 'no se pudieron leer los productos de la guía').toBe(true)
  const cuerpo = await r.json() as { examples?: { slug?: string; titulo?: string; title?: string }[] }
  const titulo = cuerpo.examples?.[0]?.titulo ?? cuerpo.examples?.[0]?.title
  expect(titulo, 'la guía no expone ningún producto con título').toBeTruthy()

  await page.goto(`${BASE}/catalog?q=${encodeURIComponent(titulo as string)}`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 60_000 })
  const anadir = page.getByRole('button', { name: /añadir al carrito/i }).first()
  await anadir.waitFor({ state: 'visible', timeout: 60_000 })
  await anadir.click()
  await expect(page.getByText(/añadido/i).first()).toBeVisible({ timeout: 30_000 })
}

/**
 * Pulsa «pagar con tarjeta» y confirma, y devuelve la URL de Stripe a la que se redirige.
 *
 * <p>La redirección la hace el navegador saliendo de nuestro dominio, así que no vale esperar una
 * navegación «de Angular»: se espera a que la dirección sea de `checkout.stripe.com`.
 */
async function vaHastaStripe(page: Page): Promise<string> {
  // Por ancla si existe, y si no por el rótulo. No es cinturón y tirantes: el entorno sirve el
  // build DESPLEGADO, que es anterior a las anclas, y una certificación que solo sepa mirar el
  // código de hoy no se puede pasar contra lo que hay puesto. El rótulo basta porque la
  // certificación fija el idioma en español antes de empezar.
  await eligeLaTarjeta(page)
  const pagar = botonDePagar(page)
  await expect(pagar, 'el botón de pagar no se habilita').toBeEnabled({ timeout: 30_000 })
  await pagar.click()
  // O se sale a Stripe, o el backend esta en modo SIMULADO y vuelve directo con `mock=1`. Lo
  // segundo no es un fallo del cobro, es que ahi no hay pasarela que certificar: el caso sale
  // como SIN EJECUTAR. Darlo por bueno seria el hueco disfrazado de verde que esta suite prohibe.
  await page.waitForURL(/checkout\.stripe\.com|\/checkout\/return/, { timeout: 90_000 })
  if (!/checkout\.stripe\.com/.test(page.url())) {
    test.skip(/mock=1/.test(page.url()),
      'el backend tiene Stripe en modo simulado (STRIPE_ENABLED=false): no hay pasarela que certificar')
    throw new Error(`se esperaba la pasarela y se fue a ${page.url()}`)
  }
  return page.url()
}

/**
 * Comprueba que la sesión es de PRUEBA y que cobra lo que decía el checkout.
 *
 * <p>El importe se lee de la propia página de Stripe, que es la que el comprador ve: compararlo
 * contra lo que respondió nuestra API probaría que nuestra API es coherente consigo misma, que es
 * justo lo que no hace falta demostrar.
 */
async function apruebaLaSesion(page: Page, esperado: { valor: number; simbolo: string }) {
  expect(page.url(), 'la sesión de Stripe NO es de prueba: no se teclea ninguna tarjeta')
    .toMatch(/cs_test_/)

  // Stripe puede ofrecer pagar en la MONEDA LOCAL del comprador, con su comisión de conversión, y
  // la trae preseleccionada por delante de la del pedido. Para comparar con el checkout hay que
  // volver primero a la moneda en la que se abrió la sesión; comparar contra la local acusaría de
  // descuadre a un cobro correcto, porque son dos cifras distintas a propósito.
  let cobrado: number
  const monedas = page.getByRole('group', { name: /choose currency|elige|moneda/i })
  if (await monedas.count()) {
    const suya = monedas.getByRole('button')
      .filter({ hasText: esperado.simbolo === '$' ? /\$/ : /€/ }).first()
    await expect(suya, 'la pasarela no ofrece la moneda del pedido').toBeVisible({ timeout: 30_000 })
    // El importe se lee del PROPIO botón de la moneda y no de la línea del pedido: la línea sigue
    // escrita en la moneda local mientras no se cambie, y el cambio tarda en propagarse.
    cobrado = aNumero(await suya.innerText())
    await suya.click()
  } else {
    const linea = page.getByRole('listitem').first()
    await linea.waitFor({ state: 'visible', timeout: 60_000 })
    cobrado = aNumero((await linea.innerText()).split('\n').pop() ?? '')
  }
  expect(cobrado, `Stripe cobra ${cobrado} y el checkout decía ${esperado.valor}`)
    .toBeCloseTo(esperado.valor, 2)
}

/** Rellena el formulario hospedado de Stripe. Sus campos son de la página, no de un iframe. */
async function pagaCon(page: Page, numero: string) {
  // Por el NOMBRE accesible, no por el identificador: los identificadores internos de la pasarela
  // (#cardNumber y compañía) no están en la versión que sirve hoy; los rótulos sí.
  await page.getByRole('textbox', { name: /card number/i }).fill(numero)
  await page.getByRole('textbox', { name: /expiration/i }).fill('12 / 34')
  await page.getByRole('textbox', { name: /cvc/i }).fill('123')
  const titular = page.getByRole('textbox', { name: /cardholder name/i })
  if (await titular.count()) {
    await titular.fill('Certificacion NX036')
  }
  const pais = page.getByRole('combobox', { name: /country or region/i })
  if (await pais.count()) {
    await pais.selectOption({ label: 'Spain' }).catch(() => undefined)
  }
  const cp = page.getByRole('textbox', { name: /postal code|zip/i })
  if (await cp.count()) {
    await cp.fill('28001')
  }
  await page.getByTestId('hosted-payment-submit-button')
    .or(page.locator('.SubmitButton'))
    .first().click()
}

/** Pregunta por el pedido a la API: la pantalla puede decir misa, lo que manda es el estado. */
async function estadoDelPedido(page: Page, idDePedido: string): Promise<string> {
  const r = await page.request.get(`${BASE}/api/me/orders/${idDePedido}`, {
    headers: { Authorization: `Bearer ${await testigo(page)}` },
  })
  expect(r.ok(), `no se pudo leer el pedido ${idDePedido}: ${r.status()}`).toBe(true)
  return (await r.json() as { status?: string }).status ?? ''
}

test.describe('Cobro con tarjeta (sandbox de Stripe)', () => {
  test.describe.configure({ timeout: 300_000 })

  test.beforeEach(async ({ page }) => {
    await consienteCookies(page)
    await entra(page)
    await ponElIdioma(page, 'es')
    await llenaLaCesta(page)
    await preparaElCheckout(page)
  })

  test('tarjeta aceptada — el pedido termina pagado', async ({ page }) => {
    const total = await totalDelCheckout(page)
    expect(total.valor, 'el checkout tiene que dar un total').toBeGreaterThan(0)

    await vaHastaStripe(page)
    await apruebaLaSesion(page, total)
    await pagaCon(page, TARJETA_OK)

    // La vuelta confirma del lado del servidor; el identificador del pedido viaja en la dirección.
    await page.waitForURL(/\/checkout\/return/, { timeout: 120_000 })
    const idDePedido = new URL(page.url()).searchParams.get('orderId') ?? ''
    expect(idDePedido, 'la vuelta no trae el pedido en la dirección').not.toBe('')

    // El encabezado de nivel 1, no «un encabezado»: el pie de página trae los suyos y la búsqueda
    // sale ambigua. Y pasa por tres estados —confirmando, confirmado, error—, así que se espera al
    // definitivo en vez de leer el primero que aparezca, que siempre es «Confirmando tu pago…».
    const titulo = page.getByRole('heading', { level: 1 })
    await expect.poll(async () => (await titulo.innerText()).trim(), { timeout: 120_000 })
      .toMatch(/pago confirmado|payment confirmed|no pudimos|couldn/i)
    await expect(titulo, 'la tienda no pudo confirmar el pago').toContainText(
      /pago confirmado|payment confirmed/i)
    await expect.poll(() => estadoDelPedido(page, idDePedido), { timeout: 60_000 })
      .toBe('PAID')
  })

  test('tarjeta rechazada — el pedido NO se paga y la pasarela lo dice', async ({ page }) => {
    const total = await totalDelCheckout(page)
    await vaHastaStripe(page)
    await apruebaLaSesion(page, total)
    await pagaCon(page, TARJETA_RECHAZADA)

    // Stripe rechaza EN SU PÁGINA y no redirige: el comprador se queda ahí con el aviso. Que no
    // vuelva es parte de lo que se certifica — si volviera, nuestra confirmación tendría que
    // rechazarlo, y ese es otro caso.
    await expect(page.locator('body'), 'Stripe no avisó del rechazo')
      .toContainText(/declin|rechaz|no se pudo|try again|otra tarjeta/i, { timeout: 90_000 })
    expect(page.url(), 'una tarjeta rechazada NO puede devolver al comprador como si hubiera pagado')
      .not.toMatch(/\/checkout\/return/)
  })
})
