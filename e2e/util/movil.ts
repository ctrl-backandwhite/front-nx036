import { Locator, Page, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Las piezas que SOLO hacen falta a la anchura de un móvil.
 *
 * <p>Existen porque el móvil no es «lo mismo más estrecho»: los mismos controles viven en OTROS
 * SITIOS y se alcanzan con OTROS GESTOS. La cesta baja a la barra de pestañas, el selector de región y
 * el cierre de sesión se meten en el cajón lateral, los filtros del catálogo arrancan plegados detrás
 * del rótulo «Filtros» y el menú del panel se pliega por debajo de 1.024 px. Certificar las acciones
 * aquí no es repetir la batería de escritorio con otro `viewport`: es otra batería.
 *
 * <p>Se escriben aparte —y no dentro de `util/acciones.ts`— para no tocar la lógica de las dos
 * baterías que ya están certificadas.
 */

/** El cajón lateral del escaparate. Solo existe en el árbol mientras está abierto. */
const CAJON = 'div.fixed.inset-0.z-40.md\\:hidden';

/** La insignia del carrito en la BARRA DE PESTAÑAS: en móvil el icono de la cabecera no se pinta. */
const INSIGNIA_DE_LA_BARRA = '#nx-cart-icon-movil .badge';

/** Dónde se dejan los retratos de cada pantalla certificada. */
const CARPETA_DE_RETRATOS = join(__dirname, '..', 'resultados', 'movil');

/**
 * Deja la pestaña lista para operar en el móvil, ANTES de que arranque la aplicación.
 *
 * <p>Hace dos cosas y las dos son necesarias para que la certificación mida la aplicación y no el
 * ruido de la primera visita:
 *
 * <ul>
 *   <li>Da por vista la guía del asistente. Sin esto, el asistente se planta con una capa a pantalla
 *       completa (`fixed inset-0 z-40 bg-black/20`) que INTERCEPTA todos los toques: no se puede
 *       pulsar nada de la pantalla hasta contestarle. Se anota como defecto en su propia prueba
 *       —`el asistente no puede tapar la pantalla entera`— y aquí se aparta para que las demás
 *       midan lo que dicen medir y no la capa del asistente.
 *   <li>Fija la región de partida en España. La preferencia vive en COOKIES del navegador y sobrevive
 *       entre tandas: una pasada anterior que dejó Estados Unidos convierte «se ve “Filtros”» en un
 *       fallo que no es del porte. Partiendo de un sitio conocido, cambiar de región mide el cambio.
 * </ul>
 */
export async function preparaElMovil(page: Page, base: string): Promise<void> {
  const { origin } = new URL(base);
  await page.context().addCookies([
    { name: 'nx036-locale', value: 'es', url: origin },
    { name: 'nx036-currency', value: 'EUR', url: origin },
  ]);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('nx036.welcome.v1', '1');
    } catch {
      /* una ventana privada puede negarse; la prueba de la capa lo dirá por su cuenta */
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// El cajón de navegación del escaparate
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** El cajón lateral, con lo secundario de la cuenta, el selector de región y el cierre de sesión. */
export function elCajon(page: Page): Locator {
  return page.locator(CAJON);
}

/**
 * Abre el cajón desde el botón de las tres barras.
 *
 * <p>ESTE es el gesto del móvil: en escritorio ese botón no se pinta —`md:hidden`— y los mismos
 * destinos están repartidos entre la barra de arriba y el desplegable de la cuenta.
 */
export async function abreElCajon(page: Page): Promise<void> {
  await sePuedePulsar(page, page.getByRole('button', { name: 'Menú' }).first(), 'el botón del menú');
  await expect(elCajon(page), 'el botón de las tres barras no abre el cajón').toBeVisible();
}

/**
 * Cierra el cajón tocando FUERA, sobre su capa de fondo.
 *
 * <p>No por el aspa, y el motivo es una trampa que costó una tanda: el nombre accesible del aspa es
 * una TRADUCCIÓN —«Cerrar»— y las pruebas de región cambian el idioma antes de cerrar el cajón, así
 * que a partir de ahí el botón se llama «Fermer» y el localizador se queda esperando sesenta segundos
 * un botón que está delante. Tocar fuera es además lo que hace la mayoría, y no depende del idioma.
 */
export async function cierraElCajon(page: Page): Promise<void> {
  await elCajon(page).locator('[aria-hidden="true"]').first().click({ position: { x: 20, y: 300 } });
  await expect(elCajon(page), 'el cajón no se cierra al tocar fuera').toBeHidden();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// La barra de pestañas de abajo
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** La barra de pestañas del móvil: inicio, catálogo, carrito y cuenta, al alcance del pulgar. */
export function laBarraInferior(page: Page): Locator {
  return page.locator('nx-barra-inferior-movil nav');
}

/**
 * Cuántas líneas dice la insignia del carrito de la BARRA DE PESTAÑAS.
 *
 * <p>No sirve `lineasEnLaInsignia` de `util/acciones.ts`: esa lee `#nx-cart-icon`, que en el móvil
 * lleva `hidden md:inline-flex` y por tanto no tiene texto. Una prueba escrita contra ella daría
 * SIEMPRE cero y pasaría por «el contador no sube» sin haber mirado el contador que se ve.
 */
export async function lineasEnLaBarra(page: Page): Promise<number> {
  const insignia = page.locator(INSIGNIA_DE_LA_BARRA);
  if ((await insignia.count()) === 0) {
    return 0;
  }
  const texto = (await insignia.first().innerText()).trim();
  return texto === '9+' ? 10 : Number(texto || 0);
}

/** Espera a que la insignia de la barra de pestañas marque el número pedido. */
export async function esperaLineasEnLaBarra(page: Page, cuantas: number, plazo = 20_000): Promise<void> {
  await expect
    .poll(() => lineasEnLaBarra(page), {
      timeout: plazo,
      message: `la insignia del carrito de la barra de pestañas no llega a ${cuantas}`,
    })
    .toBe(cuantas);
}

/** Pulsa una pestaña de la barra de abajo. Es el gesto con el que se navega en el móvil. */
export async function pulsaLaPestana(page: Page, destino: string, comoSeLlama: string): Promise<void> {
  const pestana = laBarraInferior(page).locator(`a[href="${destino}"]`).first();
  await sePuedePulsar(page, pestana, `la pestaña «${comoSeLlama}»`);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Los filtros, que en el móvil arrancan PLEGADOS
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Despliega los filtros desde el rótulo «FILTROS».
 *
 * <p>Es el gesto propio del móvil y además es OBLIGATORIO para casi todo lo demás: plegados, el bloque
 * entero lleva `hidden`, así que el buscador, el rango de precio, «Limpiar» y hasta el rótulo
 * «Mostrando N / T» NO ESTÁN en el texto de la página. Una prueba de búsqueda copiada de escritorio no
 * falla por un defecto del porte: falla porque nunca abrió el panel.
 *
 * <p>Sirve para los dos listados —el del escaparate (`nx-barra-de-filtros`) y el del panel
 * (`nx-barra-filtros`)—, que se pliegan igual pero no comparten componente.
 */
export async function abreLosFiltros(page: Page): Promise<void> {
  const rotulo = page
    .locator('[aria-controls="filtros-del-catalogo"], nx-barra-filtros > div > div > button[aria-expanded]')
    .first();
  await expect(rotulo, 'el listado no ofrece el rótulo «Filtros» que despliega el panel').toBeVisible();
  if ((await rotulo.getAttribute('aria-expanded')) === 'false') {
    await rotulo.click();
  }
  await expect
    .poll(() => rotulo.getAttribute('aria-expanded'), {
      message: 'el rótulo «Filtros» no marca el panel como desplegado',
    })
    .toBe('true');
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// El selector de región, que en el móvil vive DENTRO del cajón
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Elige un país desde el selector del cajón.
 *
 * <p>En el escritorio el selector está en la barra de arriba; en el móvil ese sitio lleva
 * `hidden sm:block` y el único selector que se puede tocar es el del fondo del cajón, que además abre
 * su lista HACIA ARRIBA para no salirse de la pantalla. `eligeRegion` de `util/acciones.ts` resuelve
 * con `.first()` y a 412 px eso es el selector OCULTO de la cabecera: no falla, no hace nada.
 */
export async function eligeRegionEnElCajon(page: Page, pais: string): Promise<void> {
  const boton = elCajon(page).locator('nx-selector-pais-moneda button[aria-haspopup="listbox"]').first();
  await sePuedePulsar(page, boton, 'el selector de región del cajón');
  const lista = elCajon(page).locator('[role="listbox"]').first();
  await expect(lista, 'el selector del cajón no despliega su lista').toBeVisible();
  await lista.locator('input').first().fill(pais);
  await lista.getByRole('button', { name: pais, exact: false }).first().click();
  await expect(lista, 'la lista de regiones no se cierra al elegir').toBeHidden();
}

/** Lo que dice el botón del selector del cajón: bandera, país, moneda e idioma. */
export async function regionEnElCajon(page: Page): Promise<string> {
  return (
    (await elCajon(page)
      .locator('nx-selector-pais-moneda button[aria-haspopup="listbox"]')
      .first()
      .getAttribute('title')) ?? ''
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// El menú del panel de administración, plegado por debajo de 1.024 px
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** La barra lateral del panel. Existe siempre en el árbol; en móvil está DESPLAZADA fuera. */
export function elMenuDelPanel(page: Page): Locator {
  return page.locator('aside');
}

/**
 * Abre el menú del panel desde su botón de las tres barras.
 *
 * <p>Hace falta de verdad y no es una formalidad: por debajo de `lg` la barra lateral no se esconde,
 * se DESPLAZA fuera de la pantalla con `-translate-x-full`. Sigue teniendo caja —Playwright la ve
 * «visible»— así que una prueba que pulse una entrada sin abrir el menú estaría pulsando a la
 * izquierda del borde, donde ningún dedo llega. Certificar así daría verde sobre un menú inalcanzable.
 */
export async function abreElMenuDelPanel(page: Page): Promise<void> {
  await sePuedePulsar(
    page,
    page.getByRole('button', { name: 'Abrir menú' }).first(),
    'el botón del menú del panel',
  );
  await expect
    .poll(async () => Math.round((await elMenuDelPanel(page).boundingBox())?.x ?? -999), {
      timeout: 10_000,
      message: 'el menú del panel no entra en pantalla al pulsar las tres barras',
    })
    .toBeGreaterThanOrEqual(0);
}

/**
 * Y lo cierra tocando FUERA, sobre la capa de fondo.
 *
 * <p>No se cierra por su aspa a propósito, y merece explicación porque parece lo natural: a esta
 * anchura el aspa del menú está TAPADA por la cabecera del contenido —las dos capas declaran `z-40` y
 * la cabecera va después en el árbol, así que gana—. Se comprueba y se anota en su propia prueba
 * (`el aspa del menú del panel está tapada`), donde además se contrasta con el front anterior, que
 * tiene exactamente el mismo problema: no es un defecto del porte, es del diseño que hereda. Aquí se
 * usa el gesto que SÍ funciona, que es el que usaría cualquiera al ver que el aspa no responde.
 */
export async function cierraElMenuDelPanel(page: Page): Promise<void> {
  await page.locator('div.fixed.inset-0.z-30').first().click({ position: { x: 380, y: 400 } });
  await expect
    .poll(async () => Math.round((await elMenuDelPanel(page).boundingBox())?.x ?? 0), {
      timeout: 10_000,
      message: 'el menú del panel no se retira al tocar fuera',
    })
    .toBeLessThan(0);
}

/**
 * ¿Quién está encima del control, si es que hay alguien? Devuelve `null` si nada lo tapa.
 *
 * <p>Se usa para COMPARAR el porte con el front anterior: la pregunta que importa no es «¿esto está
 * tapado?» sino «¿lo tapa el porte y el original no?». Ya ha pasado —con el aspa del menú del panel—
 * que lo que parecía un defecto del porte estaba idéntico en la aplicación que se reemplaza.
 */
export async function quienLoTapa(control: Locator): Promise<string | null> {
  return control.evaluate((el) => {
    const c = el.getBoundingClientRect();
    const arriba = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2);
    if (!arriba || el.contains(arriba) || arriba.contains(el)) {
      return null;
    }
    return `${arriba.tagName.toLowerCase()}.${(arriba.className || '').toString().slice(0, 50)}`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo estético, comprobado MIENTRAS se opera
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Pulsa un control comprobando ANTES que ALGO NO LO TAPA.
 *
 * <p>Es la comprobación estética que el encargo pide explícitamente: un clic que necesita
 * `force: true` ES un defecto, porque significa que en la pantalla real hay una capa encima —la barra
 * de pestañas, el asistente, un cajón mal cerrado, una cabecera que gana el reparto de capas—. Aquí
 * se pregunta al navegador qué hay en el centro del control, que es lo que decide el toque, y después
 * se pulsa SIN forzar.
 *
 * <p>Lo que esta función NO mira es el TAMAÑO. Va aparte —`mideParaUnDedo`— a propósito: mezclarlos
 * hacía que una prueba de navegación fallara por medio píxel de altura de un enlace heredado del
 * diseño, y el informe acusaba a la acción equivocada. Un objetivo pequeño es un defecto estético que
 * se mide y se compara con el original; un objetivo TAPADO es un defecto funcional que impide operar.
 */
export async function sePuedePulsar(page: Page, control: Locator, comoSeLlama: string): Promise<void> {
  await expect(control, `${comoSeLlama}: no está en la pantalla`).toBeVisible();
  const caja = await control.boundingBox();
  expect(caja, `${comoSeLlama}: no tiene caja, no se puede tocar`).not.toBeNull();
  const { x, y, width, height } = caja as { x: number; y: number; width: number; height: number };

  const dentro = await page.evaluate(
    ({ cx, cy }) => cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight,
    { cx: x + width / 2, cy: y + height / 2 },
  );
  expect(dentro, `${comoSeLlama}: su centro cae fuera de la pantalla`).toBe(true);

  const quienEstaEncima = await control.evaluate((el) => {
    const c = el.getBoundingClientRect();
    const arriba = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2);
    if (!arriba || el.contains(arriba) || arriba.contains(el)) {
      return null;
    }
    return `${arriba.tagName.toLowerCase()}.${(arriba.className || '').toString().slice(0, 60)}`;
  });
  expect(quienEstaEncima, `${comoSeLlama}: lo tapa ${quienEstaEncima}`).toBeNull();

  // Sin `force`: si hiciera falta, es que algo de lo de arriba se ha escapado y tiene que salir en rojo.
  await control.click();
}

/**
 * ¿Da el control la medida mínima para un dedo? El proyecto se fija el nivel AA: 24 píxeles.
 *
 * <p>Se mide, y se DICE cuánto mide: un informe que solo dijera «pequeño» obliga a volver a abrir el
 * navegador para saber si falta medio píxel o veinte.
 */
export async function mideParaUnDedo(control: Locator, comoSeLlama: string, minimo = 24): Promise<void> {
  const caja = await control.boundingBox();
  expect(caja, `${comoSeLlama}: no tiene caja, no se puede tocar`).not.toBeNull();
  const { width, height } = caja as { width: number; height: number };
  expect(
    Math.min(width, height),
    `${comoSeLlama}: mide ${width.toFixed(1)}×${height.toFixed(1)} y el mínimo del nivel AA son ${minimo} px`,
  ).toBeGreaterThanOrEqual(minimo);
}

/** El nombre del objetivo, sin sus medidas: un píxel de diferencia no lo convierte en otro control. */
export const soloElNombre = (x: string): string => x.replace(/\s*\(\d+×\d+\)$/, '');


/**
 * Comprueba que NADA de lo importante queda debajo de la barra de pestañas.
 *
 * <p>Es el riesgo propio de esta maqueta: la barra va `fixed bottom-0` con `z-40`, así que cualquier
 * botón que caiga en esa franja deja de ser pulsable aunque se vea perfectamente. Se comprueba
 * preguntando al navegador quién está en el centro del control, que es lo que decide el toque.
 */
export async function noLoTapaLaBarra(page: Page, control: Locator, comoSeLlama: string): Promise<void> {
  await control.scrollIntoViewIfNeeded();

  /* Primero, que esté DENTRO de la pantalla. Un control que queda por debajo del borde no lo tapa la
   * barra: es que no se ve, y decir «lo tapa la barra» mandaría a mirar el sitio equivocado. */
  const caja = await control.boundingBox();
  const alto = page.viewportSize()?.height ?? 0;
  expect(caja, `${comoSeLlama}: no tiene caja, no se puede tocar`).not.toBeNull();
  expect((caja as { y: number }).y, `${comoSeLlama}: queda fuera de la pantalla`).toBeLessThan(alto);

  const tapado = await control.evaluate((el) => {
    const c = el.getBoundingClientRect();
    const arriba = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2);
    return arriba ? !!arriba.closest('nx-barra-inferior-movil') : false;
  });
  expect(tapado, `${comoSeLlama}: la barra de pestañas se le pone encima`).toBe(false);
}

/**
 * Guarda un retrato de la pantalla, para poder mirarla después.
 *
 * <p>Se retrata la página ENTERA salvo que sea desmesuradamente alta. El catálogo con desplazamiento
 * infinito llega a decenas de miles de píxeles: coser esa imagen tarda más que la propia prueba y deja
 * un fichero que nadie va a abrir. Por encima del tope se retrata lo que se ve, que es lo que hay que
 * mirar para juzgar la maqueta.
 */
export async function retrata(page: Page, nombre: string): Promise<void> {
  mkdirSync(CARPETA_DE_RETRATOS, { recursive: true });
  const alto = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
  await page
    .screenshot({ path: join(CARPETA_DE_RETRATOS, `${nombre}.png`), fullPage: alto <= 12_000 })
    .catch(() => undefined);
}
