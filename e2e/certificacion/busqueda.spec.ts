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

type Caso = { idioma: string; medias: string; entera: string; frase: string; raiz: string }

const CASOS: Caso[] = [
  { idioma: 'es', medias: 'zapatil', entera: 'zapatillas', frase: 'vestido de noche', raiz: 'zapatilla' },
  { idioma: 'en', medias: 'snea', entera: 'sneakers', frase: 'evening dress', raiz: 'sneaker' },
  { idioma: 'pt', medias: 'sapat', entera: 'sapato', frase: 'vestido longo', raiz: 'sapat' },
  { idioma: 'fr', medias: 'chauss', entera: 'chaussures', frase: 'robe de soirée', raiz: 'chauss' },
  { idioma: 'it', medias: 'scarp', entera: 'scarpe', frase: 'abito da sera', raiz: 'scarp' },
  { idioma: 'de', medias: 'schuh', entera: 'schuhe', frase: 'langes kleid', raiz: 'schuh' },
  { idioma: 'nl', medias: 'schoen', entera: 'schoenen', frase: 'lange jurk', raiz: 'schoen' },
]

/** Los sinónimos NO aparecen en ningún título: si salen resultados, es que el diccionario actúa. */
const SINONIMOS: [string, string][] = [['playera', 'camis'], ['tenis', 'zapatilla'], ['jeans', 'vaquer'],
  ['pollera', 'falda']]

async function entra(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/correo|email/i).first().fill(CORREO)
  await page.locator('input[type="password"]').first().fill(CLAVE)
  await page.getByRole('button', { name: /entrar|iniciar|acceder|log in/i }).first().click()
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 45_000 })
}

/**
 * Busca TECLEANDO, no navegando a la dirección: así se ejerce el camino real —el campo, su retardo y
 * la escritura del criterio en la URL—, que es donde ya se perdió una búsqueda en silencio.
 */
async function busca(page: Page, termino: string, idioma: string) {
  await page.goto(`${BASE}/catalog?lang=${idioma}`, { waitUntil: 'domcontentloaded' })
  const campo = page.locator('input[type="search"]').first()
  await campo.waitFor({ state: 'visible', timeout: 30_000 })
  await campo.fill('')
  await campo.type(termino, { delay: 45 })
  await page.waitForTimeout(2500)
  const tarjetas = page.locator('article, [data-producto], a[href*="/catalog/"]:has(img)')
  const n = await tarjetas.count()
  const primero = n > 0 ? ((await tarjetas.first().innerText()).split('\n')[0] ?? '') : ''
  const vacio = await page.getByText(/ningún producto|no products|nenhum produto|aucun produit/i).count()
  return { n, primero, vacio }
}

test.describe('Búsqueda en el escaparate', () => {
  test.beforeEach(async ({ page }) => { await entra(page) })

  for (const c of CASOS) {
    test(`${c.idioma} — a medias, entera y frase`, async ({ page }) => {
      const medias = await busca(page, c.medias, c.idioma)
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
