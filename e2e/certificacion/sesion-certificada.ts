import { expect, type Page } from '@playwright/test'

/**
 * Lo que comparten las certificaciones que entran como un comprador real: el entorno, el acceso y el
 * aviso de cookies.
 *
 * <p>Vive aparte porque entrar en este escaparate NO es trivial —la hidratación vacía el formulario—
 * y tener dos copias de ese apaño significa que la próxima certificación lo copie mal o lo omita.
 *
 * <p>La cuenta se le pasa por variables de entorno; la crea y la borra el guion que lo lanza.
 */

export const BASE = process.env['CERT_BASE'] ?? 'https://pre.nx036.com'
const CORREO = process.env['CERT_EMAIL'] ?? ''
const CLAVE = process.env['CERT_PASS'] ?? ''

/**
 * El aviso de cookies tapa la página y se come el primer clic. Se acepta como haría cualquiera: sin
 * esto, el botón de acceso recibía el clic del banner y el formulario no llegaba a enviarse nunca.
 */
export async function aceptaCookies(page: Page) {
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
export async function entra(page: Page) {
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
export async function consienteCookies(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('nx-cookie-consent', JSON.stringify({
        v: 1, ts: new Date().toISOString(), consent: { analytics: false, marketing: false },
      }))
      // Y la guía de bienvenida del asistente, que se pone EN MEDIO de la pantalla con un velo a
      // pantalla completa (`fixed inset-0`) y se come los clics de los filtros. No es un aviso que se
      // pueda ignorar: intercepta los eventos de puntero, así que Playwright reintenta el clic hasta
      // agotar el tiempo y el fallo sale como «no se pudo pulsar», sin mencionar al asistente.
      window.localStorage.setItem('nx036.welcome.v1', '1')
      window.localStorage.setItem('nx036.avatar.greeted', '1')
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
export async function ponElIdioma(page: Page, idioma: string) {
  await page.context().addCookies([{ name: 'nx036-locale', value: idioma, url: BASE }])
}
