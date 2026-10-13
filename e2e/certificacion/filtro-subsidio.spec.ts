import { expect, test, type Page } from '@playwright/test'

import { aceptaCookies, BASE, consienteCookies, entra, ponElIdioma } from './sesion-certificada'

/**
 * Certificación del filtro de PORTE SUBVENCIONADO en el navegador, contra un entorno real.
 *
 * <p>QUÉ SE ROMPÍA. El interruptor decía «Envío gratis» y filtraba por `free_shipping`, una marca del
 * producto que está a FALSE en las 11.968 referencias activas de preproducción y en las 1.872 de
 * producción. Activarlo vaciaba la cuadrícula SIEMPRE, en los dos entornos, y no daba ningún error:
 * la pantalla decía «Mostrando 0 / 0», que es exactamente lo que diría un filtro legítimo que no
 * encuentra nada.
 *
 * <p>Por eso esto se certifica en el navegador y no por la API: lo que falló no fue la consulta sino
 * que nadie pulsó el interruptor contra datos reales. Y por eso no basta con «devuelve algo»: se
 * exige además que devuelva MENOS que el catálogo entero, porque un interruptor que no filtra nada
 * también devuelve algo.
 *
 * <p>Se lee el contador de la pantalla y no la respuesta de la API a propósito: el PRIMER listado
 * llega renderizado del servidor y no genera ninguna petición que espiar, así que esperar una
 * respuesta se agota sin que nada esté roto.
 */

const PARAMETRO = 'shippingSubsidy'

/** Lo que dice el contador «Mostrando N / M»: el total del listado con los filtros que haya puestos. */
async function totalDelListado(page: Page): Promise<number> {
  const contador = page.getByTestId('contador-del-catalogo')
  await contador.waitFor({ state: 'visible', timeout: 30_000 })
  const texto = await contador.innerText()
  const total = texto.split('/').pop()?.replace(/[^\d]/g, '') ?? ''
  expect(total, `el contador no trae un total legible: «${texto}»`).not.toBe('')
  return Number(total)
}

async function abreElCatalogo(page: Page): Promise<number> {
  await ponElIdioma(page, 'es')
  await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' })
  await aceptaCookies(page)
  await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 60_000 })
  return totalDelListado(page)
}

function interruptorDeSubsidio(page: Page) {
  return page.locator('nx-filtro-interruptor').filter({ hasText: /envío subvencionado/i }).first()
}

/** Espera a que el listado se rehaga: el contador deja de decir lo que decía. */
async function totalDistintoDe(page: Page, anterior: number): Promise<number> {
  await expect.poll(() => totalDelListado(page), { timeout: 60_000 }).not.toBe(anterior)
  return totalDelListado(page)
}

test.describe('Filtro de porte subvencionado', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.describe.configure({ timeout: 240_000 })

  test.beforeEach(async ({ page }) => {
    await consienteCookies(page)
    await entra(page)
  })

  test('devuelve productos, y menos que el catálogo entero', async ({ page }) => {
    const sinFiltrar = await abreElCatalogo(page)
    expect(sinFiltrar, 'el catálogo debe tener productos para que esto signifique algo')
      .toBeGreaterThan(0)

    await interruptorDeSubsidio(page).click()
    const conSubsidio = await totalDistintoDe(page, sinFiltrar)

    // LO QUE SE ROMPÍA: aquí salía 0, y en pantalla era indistinguible de «no hay ninguno».
    expect(conSubsidio, 'el filtro no puede dejar la cuadrícula vacía').toBeGreaterThan(0)
    // Y que de verdad FILTRE.
    expect(conSubsidio, 'con subvención tiene que haber menos que en total').toBeLessThan(sinFiltrar)

    // Y que se pinten: lo que importa es que el comprador los vea, no que la API los cuente.
    await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 30_000 })
  })

  /**
   * El criterio vive en la dirección para que un enlace compartido llegue con sus filtros puestos.
   * En este escaparate ya se perdió un criterio en una navegación descartada, en silencio.
   */
  test('el criterio queda en la dirección y sobrevive a recargar', async ({ page }) => {
    const sinFiltrar = await abreElCatalogo(page)
    await interruptorDeSubsidio(page).click()
    const alPulsar = await totalDistintoDe(page, sinFiltrar)

    await expect(page).toHaveURL(new RegExp(`${PARAMETRO}=1`))

    // Recargar la dirección tal cual: es lo que le pasa a quien recibe el enlace.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('nx-tarjeta-producto').first().waitFor({ state: 'visible', timeout: 60_000 })
    expect(await totalDelListado(page), 'el enlace compartido debe traer lo mismo').toBe(alPulsar)
  })
})
