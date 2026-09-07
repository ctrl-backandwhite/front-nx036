import { Page, expect } from '@playwright/test';

/**
 * Piezas comunes de la certificación POR ACCIÓN.
 *
 * <p>Lo que distingue a esta batería de las demás: aquí no se comprueba que una pantalla ABRA, sino que
 * al hacer algo PASE algo. Por eso todo lo que hay aquí devuelve un EFECTO medible —un contador, un
 * importe, una petición que ha salido— y no un localizador: una prueba que termina en «el botón existe»
 * es exactamente la que dejó pasar que ninguna confirmación estuviera montada.
 */

/**
 * Cuántas consultas al catálogo hay EN VUELO en esta pestaña.
 *
 * <p>Hace falta para no confundir un resultado con un cargador. Mientras la consulta viaja, el
 * contador de la pantalla enseña «0 / 0», y una espera que solo mire si el número ha CAMBIADO se
 * queda con ese cero: la prueba acusaba a la búsqueda de no devolver nada mientras el servidor —
 * comprobado a mano contra la API— sí devolvía resultados. Se engancha una vez por pestaña y se
 * consulta antes de dar por bueno un número.
 */
const consultasEnVuelo = new WeakMap<Page, { cuantas: number }>();

export function vigilaLasConsultasDelCatalogo(page: Page): void {
  if (consultasEnVuelo.has(page)) {
    return;
  }
  const contador = { cuantas: 0 };
  consultasEnVuelo.set(page, contador);
  const esConsulta = (url: string) => /\/api\/(?:admin\/)?catalog\/products\?/.test(url);
  page.on('request', (peticion) => {
    if (esConsulta(peticion.url())) {
      contador.cuantas++;
    }
  });
  const termina = (url: string) => {
    if (esConsulta(url)) {
      contador.cuantas--;
    }
  };
  page.on('requestfinished', (peticion) => termina(peticion.url()));
  page.on('requestfailed', (peticion) => termina(peticion.url()));
}

/**
 * El «Mostrando N / T» que pintan tanto el catálogo del escaparate como el del panel.
 *
 * <p>Se lee del TEXTO de la página y se ancla en la palabra «Mostrando», no con un localizador de
 * texto. El motivo es una trampa que costó dos tandas: `locator('text=/Mostrando \d+ \/ \d+/')`
 * no cae necesariamente en el rótulo —su número va dentro de un `<strong>`, así que el nodo de texto
 * está partido en dos— y acababa resolviendo a un ANTECESOR cuyo texto trae otros números antes. La
 * prueba leía 7.729 en una pantalla que estaba enseñando 1.000, y acusaba al buscador de no hacer nada
 * teniendo delante los resultados de la búsqueda.
 */
export async function contadorDeResultados(page: Page): Promise<{ mostrados: number; total: number }> {
  const texto = await page.locator('body').innerText();
  const casa = texto.match(/Mostrando\s+([\d.,\u00a0\s]+?)\s*\/\s*([\d.,\u00a0]+)/);
  if (!casa) {
    throw new Error('la pantalla no enseña el contador «Mostrando N / T»');
  }
  const aNumero = (bruto: string) => Number(bruto.replace(/[^\d]/g, ''));
  return { mostrados: aNumero(casa[1]), total: aNumero(casa[2]) };
}

/**
 * Espera a que el TOTAL de resultados deje de ser el que era.
 *
 * <p>Se espera al número y no a la petición: lo que hay que certificar es que la pantalla enseña otra
 * cosa, no que el navegador haya hablado con el servidor. Una consulta que sale y no se pinta es
 * justo el fallo que se busca.
 */
export async function esperaOtroTotal(page: Page, totalAnterior: number, plazo = 30_000): Promise<number> {
  let confirmado = totalAnterior;
  let anteriorAsentado: number | null = null;
  await expect
    .poll(
      async () => {
        /* Se exige que el número se haya ASENTADO, y además DOS RONDAS SEGUIDAS.
         *
         * Mientras la consulta viaja, el contador de la pantalla pasa por «0 / 0»; quedarse con esa
         * primera lectura distinta daba por bueno un cero que no era el resultado de nada, y la prueba
         * acusaba a la búsqueda de no devolver nada mientras la API —comprobado a mano— devolvía mil.
         * Tres lecturas seguidas iguales, sin consultas en vuelo, y el mismo número otra vez en la
         * ronda siguiente: un cero de carga no sobrevive a eso. */
        const lecturas: number[] = [];
        for (let i = 0; i < 3; i++) {
          lecturas.push((await contadorDeResultados(page).catch(() => ({ total: totalAnterior }))).total);
          await page.waitForTimeout(250);
        }
        const estable = lecturas.every((n) => n === lecturas[0]) ? lecturas[0] : null;
        /* El CERO es el único número que hay que desconfiar: es lo que enseña el contador mientras la
         * consulta viaja. Un total distinto de cero vale aunque haya peticiones en vuelo — en el
         * escaparate el desplazamiento infinito está pidiendo páginas casi todo el rato, y exigir la
         * red en silencio dejaba la espera colgada para siempre sobre una pantalla que ya enseñaba el
         * resultado correcto. */
        const quietas = (consultasEnVuelo.get(page)?.cuantas ?? 0) === 0;
        const fiable = estable !== null && (estable > 0 || quietas) ? estable : null;
        confirmado = fiable !== null && fiable === anteriorAsentado ? fiable : totalAnterior;
        anteriorAsentado = fiable;
        return confirmado;
      },
      { timeout: plazo, message: `el número de resultados sigue siendo ${totalAnterior}` },
    )
    .not.toBe(totalAnterior);
  return confirmado;
}

/** Cuántas líneas dice la insignia de la cesta. Sin insignia, cero. */
export async function lineasEnLaInsignia(page: Page): Promise<number> {
  const insignia = page.locator('#nx-cart-icon .badge');
  if ((await insignia.count()) === 0) {
    return 0;
  }
  const texto = (await insignia.first().innerText()).trim();
  return texto === '9+' ? 10 : Number(texto || 0);
}

/** Espera a que la insignia de la cesta marque el número pedido. */
export async function esperaLineasEnLaInsignia(page: Page, cuantas: number, plazo = 15_000): Promise<void> {
  await expect
    .poll(() => lineasEnLaInsignia(page), {
      timeout: plazo,
      message: `la insignia de la cesta no llega a ${cuantas}`,
    })
    .toBe(cuantas);
}

/**
 * Escribe en el buscador del catálogo.
 *
 * <p>El campo tiene un freno de 280 ms antes de avisar: se escribe y se espera al efecto, nunca a un
 * número de milisegundos elegido a ojo.
 */
export async function buscaEnElCatalogo(page: Page, texto: string): Promise<void> {
  const campo = page.locator('nx-campo-busqueda input[type="search"]').first();
  await campo.click();
  await campo.fill(texto);

  /* El criterio vive en la DIRECCIÓN: hasta que el texto no llega ahí, la consulta no ha salido.
   *
   * Y a veces no llega a la primera. Si la pantalla todavía estaba resolviendo su navegación inicial,
   * la que lanza el buscador se descarta y lo tecleado se queda solo en el campo: la prueba se pasaba
   * treinta segundos esperando un número que ya no iba a cambiar. Se comprueba que ha llegado y, si no,
   * se vuelve a escribir una vez. */
  const llego = async () =>
    page
      .waitForFunction((t) => new URL(location.href).searchParams.get('q') === t, texto, {
        timeout: 6_000,
      })
      .then(() => true)
      .catch(() => false);

  if (!(await llego())) {
    await campo.fill('');
    await campo.fill(texto);
    expect(await llego(), 'lo tecleado en el buscador no llega a la dirección').toBe(true);
  }
}

/**
 * Elige una región —país, moneda e idioma a la vez— en el selector de la barra superior.
 *
 * <p>Es UN solo control a propósito: en el proyecto la moneda y el idioma son una decisión sola. Para
 * certificar la divisa se elige un país con OTRA moneda y el MISMO idioma; para certificar el idioma,
 * uno con la misma moneda y otro idioma.
 */
export async function eligeRegion(page: Page, pais: string): Promise<void> {
  const boton = page.locator('nx-selector-pais-moneda button[aria-haspopup="listbox"]').first();
  await boton.click();
  const lista = page.locator('nx-selector-pais-moneda [role="listbox"]').first();
  await expect(lista).toBeVisible();
  await lista.locator('input').first().fill(pais);
  await lista.getByRole('button', { name: pais, exact: false }).first().click();
  await expect(lista).toBeHidden();
}

/** Lo que dice el botón del selector de región: bandera, moneda y, en escritorio, el idioma. */
export async function regionActiva(page: Page): Promise<string> {
  return (
    (await page
      .locator('nx-selector-pais-moneda button[aria-haspopup="listbox"]')
      .first()
      .getAttribute('title')) ?? ''
  );
}

/** Anota TODAS las peticiones que salgan, para poder afirmar después que algo NO se envió. */
export function vigilaLasPeticiones(page: Page): { metodo: string; url: string }[] {
  const peticiones: { metodo: string; url: string }[] = [];
  page.on('request', (peticion) => peticiones.push({ metodo: peticion.method(), url: peticion.url() }));
  return peticiones;
}

/**
 * Las peticiones que DESTRUIRÍAN datos.
 *
 * <p>Es la red de seguridad de la regla dura del encargo: las acciones de borrado se certifican hasta
 * la confirmación y se CANCELAN, y lo que prueba que cancelar cancela es que ninguna de estas salió.
 */
export function peticionesDestructivas(
  peticiones: readonly { metodo: string; url: string }[],
): { metodo: string; url: string }[] {
  return peticiones.filter(
    (p) => p.metodo === 'DELETE' || (p.metodo === 'POST' && /bulk-delete|\/delete\b/.test(p.url)),
  );
}

/**
 * Los errores de consola que cuentan como fallo.
 *
 * <p>Se descartan los de red por datos que no existen en la base local: lo que se busca es una excepción
 * de la aplicación, un componente que no monta, un manejador que revienta al pulsar.
 */
export function erroresGraves(errores: readonly string[]): string[] {
  return errores.filter((e) => !/40[0-9]|50[0-9]|Failed to load resource|net::ERR|favicon/i.test(e));
}

/** Afirma que la acción no ha dejado ningún error de JavaScript por el camino. */
export function sinErroresDeConsola(errores: readonly string[], quePasaba: string): void {
  const graves = erroresGraves(errores);
  expect(graves, `${quePasaba}: la consola lanzó ${graves.slice(0, 2).join(' · ')}`).toEqual([]);
}

/** El diálogo de la aplicación que esté vivo, si lo hay. */
export function elDialogo(page: Page) {
  return page.locator('[role="dialog"][aria-modal="true"]');
}
