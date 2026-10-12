import { expect, test, type Page, type Response } from '@playwright/test'

/**
 * Certificación de la BÚSQUEDA en el navegador, contra un entorno real.
 *
 * <p>Va por el navegador y no por la API porque es lo que se pidió, y porque hay cosas que solo
 * fallan aquí: el criterio vive en la dirección y una navegación descartada lo pierde en silencio
 * —ya pasó—, y el escaparate consulta en cada tecla, que es justo lo que destapó el fallo del
 * 12-oct-2026: «zapatilla» devolvía 1.591 productos y «zapatil», cero.
 *
 * <p>Se comprueban las cuatro formas de buscar, que fallan por motivos distintos:
 *   PALABRA A MEDIAS  mientras se teclea. Es donde se rompía.
 *   PALABRA ENTERA    el caso normal.
 *   FRASE             varias palabras: mide que combine sin diluirse.
 *   NOMBRE COMPLETO   el título entero de un producto real — tiene que salir ÉL.
 *   SINÓNIMO          un término que NO aparece en ningún título.
 *
 * <p>La cuenta se le pasa por variables de entorno; la crea y la borra el guion que lo lanza.
 */

const BASE = process.env['CERT_BASE'] ?? 'https://pre.nx036.com'
const CORREO = process.env['CERT_EMAIL'] ?? ''
const CLAVE = process.env['CERT_PASS'] ?? ''
/** El título exacto de un producto real del entorno, para la búsqueda por nombre completo. */
const NOMBRE_COMPLETO = process.env['CERT_NOMBRE'] ?? ''

interface Caso {
  idioma: string
  medias: string
  entera: string
  frase: string
  raiz: string
}

/**
 * Las frases están MEDIDAS contra el catálogo de preproducción, con las condiciones reales de
 * visibilidad (activo y con imagen espejada): entre 31 y 309 productos cada una. Importa porque la
 * primera frase española era «vestido de noche», con solo 4 productos visibles — y una certificación
 * que depende de cuatro fichas falla cuando el catálogo adelgaza, no cuando el buscador se rompe.
 */
const CASOS: Caso[] = [
  { idioma: 'es', medias: 'zapatil', entera: 'zapatillas', frase: 'vestido largo', raiz: 'zapatilla' },
  { idioma: 'en', medias: 'snea', entera: 'sneakers', frase: 'evening dress', raiz: 'sneaker' },
  { idioma: 'pt', medias: 'sapat', entera: 'sapato', frase: 'vestido longo', raiz: 'sapat' },
  { idioma: 'fr', medias: 'chauss', entera: 'chaussures', frase: 'robe de soirée', raiz: 'chauss' },
  { idioma: 'it', medias: 'scarp', entera: 'scarpe', frase: 'abito da sera', raiz: 'scarp' },
  { idioma: 'de', medias: 'schuh', entera: 'schuhe', frase: 'langes kleid', raiz: 'schuh' },
  { idioma: 'nl', medias: 'schoen', entera: 'schoenen', frase: 'lange jurk', raiz: 'schoen' },
  // El chino va por su propio campo del índice (`titleZh`, analizador cjk) y por eso se certifica
  // aparte: los 11.968 títulos lo tienen. No hay espacios entre palabras, así que «a medias» es
  // teclear 运动 esperando 运动鞋 —565 productos—, que se resuelve por bigramas del analizador.
  { idioma: 'zh', medias: '运动', entera: '运动鞋', frase: '长袖连衣裙', raiz: '运动鞋' },
]

/** Los sinónimos NO aparecen en ningún título: si salen resultados, es que el diccionario actúa. */
const SINONIMOS: [string, string][] = [['playera', 'camis'], ['tenis', 'zapatilla'], ['jeans', 'vaquer'],
  ['pollera', 'falda']]

/**
 * El aviso de cookies tapa la página y se come el primer clic. Se acepta como haría cualquiera: sin
 * esto, el botón de acceso recibía el clic del banner y el formulario no llegaba a enviarse nunca.
 */
async function aceptaCookies(page: Page) {
  const boton = page.getByRole('button', { name: /accept all|aceptar todo/i }).first()
  if (await boton.count()) {
    await boton.click({ timeout: 10_000 }).catch(() => undefined)
    await page.waitForTimeout(400)
  }
}

/**
 * Accede, reintentando el formulario ENTERO hasta que la navegación ocurra.
 *
 * <p>QUÉ SE ROMPÍA, y es lo que costó dos vueltas de diagnóstico. El escaparate se sirve renderizado
 * en el servidor y Angular lo hidrata después; la hidratación REINICIA los controles del formulario.
 * Rellenar el HTML servido y enviar deja el formulario en blanco, y la pantalla no dice nada: ni
 * alerta ni navegación, solo el tiempo agotándose. Y de forma intermitente, que es lo peor — de diez
 * casos, dos entraron y ocho no.
 *
 * <p>No basta con escribir y comprobar que el valor quedó: la hidratación puede llegar DESPUÉS de esa
 * comprobación y borrarlo antes del envío, que es exactamente lo que pasó al intentarlo así. Y no se
 * intenta detectar «cuándo ha hidratado» porque no hay una señal fiable en una compilación de
 * producción. Se reintenta el ciclo completo —escribir, escribir, enviar, ver si navega—: mientras la
 * página siga sin hidratar el intento no hace nada, y en cuanto hidrata entra a la primera.
 */
async function entra(page: Page) {
  // `load` y no `domcontentloaded`: con el segundo la página aún no ha traído el JavaScript que la
  // hidrata. Y después, red en calma, que es cuando la hidratación ya ha tenido su oportunidad.
  await page.goto(`${BASE}/login`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  await aceptaCookies(page)
  // Los mismos selectores que usa `e2e/util/sesion.ts`: por rol y texto fallaba, porque el rótulo
  // del botón cambia con el idioma y el campo de correo no lleva etiqueta asociada.
  const correo = page.locator('input[type="email"]').first()
  const clave = page.locator('input[type="password"]').first()
  await expect(async () => {
    await correo.fill(CORREO)
    await clave.fill(CLAVE)
    await page.locator('button[type="submit"]').first().click()
    // Si las credenciales fueran malas la pantalla lo dice, y conviene leerlo: esperar solo la
    // navegación convierte un rechazo en «tiempo agotado» y manda a buscar donde no es.
    const rechazo = page.getByRole('alert').first()
    if (await rechazo.isVisible().catch(() => false)) {
      throw new Error(`el acceso fue rechazado: ${await rechazo.innerText()}`)
    }
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 })
  }).toPass({ timeout: 150_000 })
}

/**
 * Da por decidido el aviso de cookies ANTES de que arranque la aplicación.
 *
 * <p>No basta con pulsar el botón: su rótulo cambia con el idioma, y esta certificación recorre ocho.
 * El selector solo conocía «accept all» y «aceptar todo», así que en alemán, italiano, neerlandés y
 * chino el aviso se quedaba puesto tapando la página — y ya se comió una vez el clic de acceso. Se
 * siembra la decisión guardada (sin analítica ni publicidad, que es una respuesta legítima) y el aviso
 * no llega a aparecer. `aceptaCookies` queda como red por si el formato de la decisión cambia.
 */
async function consienteCookies(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('nx-cookie-consent', JSON.stringify({
        v: 1, ts: new Date().toISOString(), consent: { analytics: false, marketing: false },
      }))
    } catch {
      // Sin almacenamiento el aviso saldrá y lo retirará `aceptaCookies`.
    }
  })
}

/**
 * Fija el idioma COMO LO GUARDA LA APLICACIÓN: en la cookie `nx036-locale`.
 *
 * <p>Antes esto se intentaba con `?lang=xx` en la dirección, y ese parámetro NO existe: el idioma sale
 * de la cookie y, si no la hay, del idioma del navegador. La certificación habría buscado los siete
 * idiomas con el que trajera Playwright de serie (inglés), así que «chauss» o «scarp» no habrían
 * devuelto nada y el fallo habría apuntado al buscador en vez de a la prueba.
 */
async function ponElIdioma(page: Page, idioma: string) {
  await page.context().addCookies([{ name: 'nx036-locale', value: idioma, url: BASE }])
}

/**
 * La respuesta del catálogo que corresponde a ESTE término, ni a una pulsación intermedia.
 *
 * <p>Se compara el parámetro `q` ya decodificado y no la dirección en bruto, porque el término puede
 * llegar codificado de dos maneras —un espacio como `%20` o como `+`, y el chino entero en
 * porcentajes— y comparar cadenas crudas fallaría sin que nada lo explicara.
 */
function esLaDe(termino: string) {
  return (r: Response) => {
    if (!r.url().includes('/api/catalog/products')) {
      return false
    }
    try {
      return new URL(r.url()).searchParams.get('q') === termino
    } catch {
      return false
    }
  }
}

/** Cuántos productos dijo la API que hay. `items`, no `content`: ese nombre ya costó un diagnóstico. */
async function cuantosTrajo(r: Response): Promise<number> {
  if (!r.ok()) {
    throw new Error(`el catálogo respondió ${r.status()} a la búsqueda`)
  }
  const cuerpo = await r.json() as { totalElements?: number; items?: unknown[] }
  return cuerpo.totalElements ?? cuerpo.items?.length ?? 0
}

/**
 * Busca TECLEANDO, no navegando a la dirección: así se ejerce el camino real —el campo, su retardo y
 * la escritura del criterio en la URL—, que es donde ya se perdió una búsqueda en silencio.
 */
async function busca(page: Page, termino: string, idioma: string) {
  await ponElIdioma(page, idioma)
  await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  const campo = page.locator('input[type="search"]').first()
  await campo.waitFor({ state: 'visible', timeout: 30_000 })
  await campo.fill('')
  // La espera se arma ANTES de teclear: si se montara después, una respuesta rápida ya habría pasado.
  const respuesta = page.waitForResponse(esLaDe(termino), { timeout: 90_000 })
  await campo.type(termino, { delay: 45 })
  const cuanto = await cuantosTrajo(await respuesta)
  // Y DESPUÉS se espera a que la cuadrícula lo pinte. Lo que se certifica es que el comprador los ve,
  // no solo que la API los devuelve — para eso ya está la certificación por API.
  if (cuanto > 0) {
    await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 30_000 })
  }
  // El elemento del propio componente, no un selector genérico: `a[href*="/catalog/"]:has(img)`
  // contaría cualquier enlace con imagen que apunte al catálogo, y si el marcado cambia es mejor que
  // la certificación falle a que cuente otra cosa.
  const tarjetas = page.locator('nx-tarjeta-producto')
  const n = await tarjetas.count()
  // El TÍTULO, no la primera línea del texto de la tarjeta: en el DOM las cuatro insignias
  // («Verificado», «Nuevo»…) van ANTES del título, así que `innerText.split('\n')[0]` devolvía el
  // rótulo de una insignia en cuanto el producto llevaba alguna — y la prueba habría culpado al
  // buscador de no ordenar bien cuando lo que fallaba era de dónde se leía el nombre.
  const primero = n > 0 ? (await tarjetas.first().locator('p.line-clamp-2').first().innerText()).trim() : ''
  const titulos = (await tarjetas.locator('p.line-clamp-2').allInnerTexts()).map(t => t.trim().toLowerCase())
  const vacio = await page.getByText(/ningún producto|no products|nenhum produto|aucun produit/i).count()
  // El idioma que la página dice estar pintando. Sin comprobarlo, una prueba «en francés» que en
  // realidad corre en inglés devuelve cero y se interpreta como un fallo del buscador.
  const pintado = await page.evaluate(() => document.documentElement.lang)
  return { n, primero, titulos, vacio, pintado }
}

test.describe('Búsqueda en el escaparate', () => {
  // El tamaño se fija AQUÍ y no se hereda de ninguna configuración: lo que se certifica es el
  // buscador, no el diseño adaptable, y en el proyecto «movil» de `e2e/playwright.config.ts` la barra
  // de filtros se colapsa y el campo no está a la vista. Hoy esto corre sin esa configuración —no hay
  // ninguna en la raíz del repo—, y dejarlo al azar de qué config se encuentre es pedir un fallo
  // falso el día que alguien añada una.
  test.use({ viewport: { width: 1440, height: 900 } })
  // Cada caso accede y hace TRES búsquedas contra un entorno real. Con los 30 s de serie, los ocho
  // idiomas se cortaron en el acceso el 12-oct-2026 mientras el backend repoblaba el índice: el
  // fallo decía «tiempo agotado» y no tenía nada que ver con el buscador.
  test.describe.configure({ timeout: 240_000 })

  test.beforeEach(async ({ page }) => {
    await consienteCookies(page)
    await entra(page)
  })

  for (const c of CASOS) {
    test(`${c.idioma} — a medias, entera y frase`, async ({ page }) => {
      const medias = await busca(page, c.medias, c.idioma)
      expect(medias.pintado, `la página debe estar en ${c.idioma}`).toBe(c.idioma)
      expect(medias.vacio, `«${c.medias}» no debe decir que no hay nada`).toBe(0)
      expect(medias.n, `«${c.medias}» debe devolver productos`).toBeGreaterThan(0)

      const entera = await busca(page, c.entera, c.idioma)
      expect(entera.n, `«${c.entera}» debe devolver productos`).toBeGreaterThan(0)
      expect(entera.primero.toLowerCase()).toContain(c.raiz)

      const frase = await busca(page, c.frase, c.idioma)
      expect(frase.n, `la frase «${c.frase}» debe devolver productos`).toBeGreaterThan(0)
    })
  }

  /**
   * Se mira si ALGÚN resultado trae el término equivalente, no si lo trae el PRIMERO.
   *
   * <p>Porque el primero puede ser legítimamente otro: «jeans» aparece literal en 3 títulos de
   * preproducción y «playera» en otros 3. Al ser rarísimos su IDF es altísimo, así que esos tres se
   * colocan por delante de los 353 vaqueros y los 965 de camisetas que trae el diccionario. Exigirlo
   * en el primer puesto hacía fallar la certificación con los sinónimos funcionando perfectamente.
   */
  test('es — sinónimos que no están en ningún título', async ({ page }) => {
    for (const [termino, raiz] of SINONIMOS) {
      const r = await busca(page, termino, 'es')
      expect(r.n, `«${termino}» debe devolver productos`).toBeGreaterThan(0)
      expect(r.titulos.some(t => t.includes(raiz)), `«${termino}» debe traer algún ${raiz}`).toBe(true)
    }
  })

  test('es — el nombre completo de un producto lo trae a ÉL', async ({ page }) => {
    test.skip(!NOMBRE_COMPLETO, 'sin título de referencia')
    const r = await busca(page, NOMBRE_COMPLETO, 'es')
    expect(r.n).toBeGreaterThan(0)
    expect(r.primero.trim().toLowerCase()).toBe(NOMBRE_COMPLETO.trim().toLowerCase())
  })
})
