import { expect, test, type Page } from '@playwright/test'

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

const CASOS: Caso[] = [
  { idioma: 'es', medias: 'zapatil', entera: 'zapatillas', frase: 'vestido de noche', raiz: 'zapatilla' },
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

async function entra(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  // Los mismos selectores que usa `e2e/util/sesion.ts`: por rol y texto fallaba, porque el rótulo
  // del botón cambia con el idioma y el campo de correo no lleva etiqueta asociada.
  await page.locator('input[type="email"]').first().fill(CORREO)
  await page.locator('input[type="password"]').first().fill(CLAVE)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 45_000 })
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
  await campo.type(termino, { delay: 45 })
  await page.waitForTimeout(2500)
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
  const vacio = await page.getByText(/ningún producto|no products|nenhum produto|aucun produit/i).count()
  // El idioma que la página dice estar pintando. Sin comprobarlo, una prueba «en francés» que en
  // realidad corre en inglés devuelve cero y se interpreta como un fallo del buscador.
  const pintado = await page.evaluate(() => document.documentElement.lang)
  return { n, primero, vacio, pintado }
}

test.describe('Búsqueda en el escaparate', () => {
  test.beforeEach(async ({ page }) => { await entra(page) })

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

  test('es — sinónimos que no están en ningún título', async ({ page }) => {
    for (const [termino, raiz] of SINONIMOS) {
      const r = await busca(page, termino, 'es')
      expect(r.n, `«${termino}» debe devolver productos`).toBeGreaterThan(0)
      expect(r.primero.toLowerCase(), `«${termino}» debe traer ${raiz}`).toContain(raiz)
    }
  })

  test('es — el nombre completo de un producto lo trae a ÉL', async ({ page }) => {
    test.skip(!NOMBRE_COMPLETO, 'sin título de referencia')
    const r = await busca(page, NOMBRE_COMPLETO, 'es')
    expect(r.n).toBeGreaterThan(0)
    expect(r.primero.trim().toLowerCase()).toBe(NOMBRE_COMPLETO.trim().toLowerCase())
  })
})
