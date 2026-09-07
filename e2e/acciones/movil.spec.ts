import { Locator, Page, expect, test } from '@playwright/test';
import {
  ANGULAR,
  REACT,
  abre,
  apartaAlAsistente,
  bajaAlFondo,
  descartaElAvisoDeGalletas,
  objetivosTactilesPequenos,
  sinDesplazamientoHorizontal,
  vigilaLaConsola,
} from '../util/comparador';
import { ADMIN, CLIENTE, entra, olvida } from '../util/sesion';
import { RUTAS_DE_PANEL } from '../util/rutas';
import {
  buscaEnElCatalogo,
  contadorDeResultados,
  elDialogo,
  esperaOtroTotal,
  peticionesDestructivas,
  sinErroresDeConsola,
  vigilaLasConsultasDelCatalogo,
  vigilaLasPeticiones,
} from '../util/acciones';
import {
  abreElCajon,
  abreElMenuDelPanel,
  abreLosFiltros,
  cierraElCajon,
  cierraElMenuDelPanel,
  elCajon,
  elMenuDelPanel,
  eligeRegionEnElCajon,
  esperaLineasEnLaBarra,
  franjas,
  inventario,
  laBarraInferior,
  lineasEnLaBarra,
  noLoTapaLaBarra,
  preparaElMovil,
  pulsaLaPestana,
  regionEnElCajon,
  mideParaUnDedo,
  quienLoTapa,
  retrata,
  sePuedePulsar,
  soloElNombre,
} from '../util/movil';

/**
 * Las ACCIONES a la anchura de un MÓVIL, ejecutadas de verdad y con los gestos del móvil.
 *
 * <p>POR QUÉ ESTA BATERÍA EXISTE. `acciones/cliente.spec.ts` y `acciones/admin.spec.ts` certifican
 * las setenta acciones de la aplicación, pero las dos se SALTAN a propósito en el proyecto `movil`.
 * El motivo declarado era cierto —en el móvil los mismos controles viven en otros sitios— pero la
 * consecuencia es que el proyecto, que es MOBILE FIRST POR NORMA, tenía setenta comprobaciones sin
 * cubrir justo en la anchura que declara principal. Esto lo cierra.
 *
 * <p>Y no es la misma batería con otro `viewport`: la cesta baja a la BARRA DE PESTAÑAS, el selector
 * de región y el cierre de sesión se meten en el CAJÓN lateral, los filtros del catálogo arrancan
 * PLEGADOS detrás del rótulo «FILTROS» —y con ellos el buscador y el contador «Mostrando N / T», que
 * ni siquiera están en el texto de la página hasta que se despliegan— y el menú del panel se pliega
 * por debajo de 1.024 px, desplazado fuera de la pantalla. Cada prueba de aquí dice en su comentario
 * por qué ESE gesto es el del móvil.
 *
 * <p>Regla de escritura, la misma de las otras dos: cada prueba afirma un EFECTO OBSERVABLE —un
 * contador que sube, una petición que sale, un valor que sobrevive a recargar—. Nunca «el botón
 * existe».
 *
 * <p>Y una exigencia añadida que el escritorio no tiene: mientras se opera se comprueba lo ESTÉTICO
 * —que no haya que desplazarse en horizontal, que el control que se usa se pueda pulsar y que no lo
 * tape nada—. Un clic que necesitara `force: true` es un defecto, así que aquí no se usa nunca.
 *
 * <p>REGLA DURA — NO DESTRUIR DATOS. La base local es la que usa el titular. Lo destructivo se
 * certifica HASTA la confirmación y se CANCELA, comprobando que NO sale ninguna petición de borrado;
 * en las pruebas del panel se bloquea además cualquier DELETE en la red. Lo único que se borra es lo
 * que la propia prueba ha creado.
 */

/** Un país con OTRA moneda y el MISMO idioma que España: aísla el cambio de divisa. */
const PAIS_DE_OTRA_MONEDA = 'México';
/** Un país con la MISMA moneda que España y otro idioma: aísla el cambio de idioma. */
const PAIS_DE_OTRO_IDIOMA = 'France';

/** Las secciones del panel, sin las que llevan parámetro: esas necesitan un dato y se cubren aparte. */
const SECCIONES = RUTAS_DE_PANEL.filter((ruta) => !ruta.includes(':'));

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CLIENTE
// ═══════════════════════════════════════════════════════════════════════════════════════════════

test.describe('acciones del cliente en el móvil', () => {
  /** Solo a 412 px: son otros gestos, y a 1.440 px ni el cajón ni la barra de pestañas se pintan. */
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'movil', 'estas acciones son las del móvil: solo aplican a 412 px');
  });

  /**
   * Lo que esta batería haya creado, fuera — también si la prueba se ha roto por el camino.
   *
   * <p>Va en un `afterEach` y no al final de cada prueba por lo mismo que en las otras dos baterías:
   * una prueba que FALLA no llega a su última línea, y la cesta del titular no es sitio para restos.
   */
  let enLaCesta: string | null = null;
  let marcadoFavorito: string | null = null;

  test.afterEach(async ({ page }) => {
    try {
      if (enLaCesta) {
        await page.goto(`${ANGULAR}/cart`, { waitUntil: 'domcontentloaded' });
        const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: enLaCesta }).first();
        if (await fila.count()) {
          await fila.getByRole('button', { name: /^Eliminar$/i }).click();
          await expect(fila).toHaveCount(0, { timeout: 15_000 });
        }
      }
      if (marcadoFavorito) {
        await desmarcaPorLaApi(page, marcadoFavorito);
      }
    } finally {
      enLaCesta = null;
      marcadoFavorito = null;
    }
  });

  /** Quita un favorito por la API: desde «Mis favoritos» no siempre se puede desmarcar. */
  async function desmarcaPorLaApi(page: Page, enlace: string): Promise<void> {
    const testigo = ((await page.evaluate(() => localStorage.getItem('nx-access-token'))) ?? '').replace(
      /^"|"$/g,
      '',
    );
    if (!testigo) {
      return;
    }
    const cabeceras = { Authorization: `Bearer ${testigo}` };
    const lista = await page.request
      .get(`${ANGULAR}/api/me/favorites?size=100`, { headers: cabeceras })
      .catch(() => null);
    if (!lista?.ok()) {
      return;
    }
    const cuerpo = (await lista.json()) as { items?: { id: string; slug: string }[] };
    const babosa = enlace.split('/').pop();
    const suyo = (cuerpo.items ?? []).find((item) => item.slug === babosa);
    if (suyo) {
      await page.request.delete(`${ANGULAR}/api/me/favorites/${suyo.id}`, { headers: cabeceras });
    }
  }

  /** Deja la pestaña en el catálogo, con sesión, sin galletas y con la región de partida fijada. */
  async function enElCatalogo(page: Page): Promise<void> {
    vigilaLasConsultasDelCatalogo(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await expect(page.locator('nx-tarjeta-producto').first()).toBeVisible();
  }

  /**
   * Añade a la cesta el primer producto que lo acepte y devuelve su título.
   *
   * <p>Se prueban varias tarjetas porque «no queda ninguna variante» es una respuesta legítima: con
   * una sola, un producto agotado de la base local pasaría por defecto del porte.
   */
  async function anadeUnProducto(page: Page): Promise<string> {
    const tarjetas = page.locator('nx-tarjeta-producto');
    const cuantas = Math.min(await tarjetas.count(), 6);
    for (let i = 0; i < cuantas; i++) {
      const tarjeta = tarjetas.nth(i);
      const titulo = (await tarjeta.locator('p').first().innerText()).trim();
      const boton = tarjeta.getByRole('button', { name: /Añadir al carrito/i });
      // Sin `force`: si algo estuviera encima —la barra de pestañas, el asistente— tiene que salir rojo.
      await boton.scrollIntoViewIfNeeded();
      await boton.click();
      const confirmado = await tarjeta
        .getByRole('button', { name: /^Añadido$/i })
        .waitFor({ state: 'visible', timeout: 6_000 })
        .then(() => true)
        .catch(() => false);
      if (confirmado) {
        enLaCesta = titulo;
        return titulo;
      }
    }
    throw new Error('ninguna de las primeras tarjetas dejó añadir a la cesta');
  }

  /** Quita de la cesta la línea de un producto: cada prueba deja la cesta como estaba. */
  async function quitaDeLaCesta(page: Page, titulo: string): Promise<void> {
    await abre(page, `${ANGULAR}/cart`);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    if (await fila.count()) {
      await fila.getByRole('button', { name: /^Eliminar$/i }).click();
      await expect(fila).toHaveCount(0);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // El cajón de navegación: es el gesto que sustituye a media barra superior
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * ABRIR EL CAJÓN. Es la acción que en el escritorio NO EXISTE: allí los destinos secundarios de la
   * cuenta están en un desplegable de la barra y el botón de las tres barras lleva `md:hidden`.
   *
   * <p>El efecto observable no es que el cajón «aparezca»: es que desde él se LLEGA a un sitio al que
   * no se puede llegar de otra forma a esta anchura, y que al navegar el cajón se cierra solo.
   */
  test('el cajón de navegación se abre y lleva a una zona privada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    await abreElCajon(page);
    await expect(elCajon(page).getByRole('link', { name: /Pedidos/i }).first()).toBeVisible();
    await sePuedePulsar(page, elCajon(page).locator('a[href="/orders"]').first(), 'el enlace «Pedidos»');

    await page.waitForURL((url) => url.pathname === '/orders', { timeout: 20_000 });
    await expect(
      elCajon(page),
      'el cajón sigue abierto sobre la pantalla nueva: en el móvil eso desorienta',
    ).toBeHidden();
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'cliente-cajon-pedidos');
    sinErroresDeConsola(errores, 'abrir el cajón y navegar desde él');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Catálogo: buscar, filtrar y limpiar — todo detrás del rótulo «FILTROS»
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * BUSCAR. En el móvil el buscador NO está a la vista: vive dentro del panel plegado, así que el
   * gesto son dos —desplegar y escribir—. Y hasta desplegarlo, el rótulo «Mostrando N / T» tampoco
   * está en el texto de la página: una prueba copiada de escritorio ni siquiera podría leer el
   * contador que va a comparar.
   */
  test('buscar en el catálogo, con el buscador que está dentro de los filtros', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    expect(antes.total, 'el catálogo llega vacío: no hay nada que buscar').toBeGreaterThan(0);

    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'la búsqueda no deja ningún resultado').toBeGreaterThan(0);
    expect(despues, 'la búsqueda devuelve MÁS que el catálogo entero').toBeLessThan(antes.total);
    expect(new URL(page.url()).searchParams.get('q')).toBe('vestido');
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'cliente-buscar');
    sinErroresDeConsola(errores, 'buscar en el catálogo del móvil');
  });

  /**
   * FILTRAR. El rango de precio también está dentro del panel plegado. Se usa el máximo porque lo
   * resuelve el BACKEND: si el filtro se aplicara solo en la pantalla, el total no se movería.
   */
  test('aplicar un filtro de precio desde el panel desplegado', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    await page.locator('#filtro-precio-max').fill('5');
    await page.locator('#filtro-precio-max').blur();
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'con el filtro puesto salen MÁS productos que sin él').toBeLessThan(antes.total);
    expect(new URL(page.url()).searchParams.get('maxPrice')).toBe('5');
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'filtrar por precio en el móvil');
  });

  /**
   * LIMPIAR. El botón solo aparece con filtros puestos y, como todo lo demás, dentro del panel: son
   * tres gestos donde el escritorio tiene uno. Lo que se exige es volver al número de partida.
   */
  test('«Limpiar» quita el filtro y devuelve el catálogo entero', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    await page.locator('#filtro-precio-max').fill('5');
    await page.locator('#filtro-precio-max').blur();
    const filtrado = await esperaOtroTotal(page, antes.total);
    expect(filtrado).toBeLessThan(antes.total);

    await page.getByRole('button', { name: /^Limpiar$/ }).click();
    const limpio = await esperaOtroTotal(page, filtrado);

    expect(limpio, 'limpiar no devuelve el catálogo entero').toBe(antes.total);
    expect(new URL(page.url()).searchParams.get('maxPrice'), 'el filtro sigue en la dirección').toBeNull();
    sinErroresDeConsola(errores, 'limpiar los filtros en el móvil');
  });

  /**
   * DESPLAZAMIENTO INFINITO. Es propio del móvil: aquí no hay paginador con números, la lista crece
   * al bajar con el dedo. Se baja de verdad —con la rueda, que es lo que traduce el gesto— y el
   * efecto es que hay MÁS tarjetas que antes de bajar.
   */
  test('bajar con el dedo trae más productos: el desplazamiento infinito', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const antes = await page.locator('nx-tarjeta-producto').count();
    expect(antes, 'el catálogo llega vacío: no hay nada que desplazar').toBeGreaterThan(0);

    /* Se baja en varias tandas y con pausa, como haría un pulgar: de un salto al fondo, el disparador
     * de «se acerca el final» puede quedar por debajo de la ventana sin llegar a entrar en ella. */
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 2_400);
      await page.waitForTimeout(700);
    }

    await expect
      .poll(() => page.locator('nx-tarjeta-producto').count(), {
        timeout: 30_000,
        message: `bajando no aparece ningún producto más: siguen siendo ${antes}`,
      })
      .toBeGreaterThan(antes);
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'el desplazamiento infinito del catálogo');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Favoritos
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * FAVORITOS. El corazón está en la tarjeta, igual que en escritorio, pero aquí hay que comprobar
   * además que se puede tocar: en la rejilla de una columna la tarjeta es ancha y el corazón queda en
   * una esquina, donde suele acabar tapado por la insignia de descuento.
   */
  test('marcar un favorito lo guarda, y desmarcarlo lo quita, tras recargar', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const candidata = page
      .locator('nx-tarjeta-producto')
      .filter({ has: page.getByRole('button', { name: 'Añadir a favoritos' }) })
      .first();
    await expect(candidata, 'todas las tarjetas están ya en favoritos').toBeVisible();
    const enlace = await candidata.locator('a').first().getAttribute('href');
    expect(enlace).toBeTruthy();
    marcadoFavorito = enlace;

    /* La tarjeta se localiza por su ENLACE, que no cambia: al marcar, el botón pasa a llamarse
     * «Quitar de favoritos» y un filtro por el nombre del botón se iría a la tarjeta siguiente. */
    const tarjeta = page.locator('nx-tarjeta-producto').filter({ has: page.locator(`a[href="${enlace}"]`) });
    await sePuedePulsar(page, tarjeta.getByRole('button', { name: 'Añadir a favoritos' }), 'el corazón');
    await expect(
      tarjeta.getByRole('button', { name: 'Quitar de favoritos' }),
      'el corazón no se enciende al marcar',
    ).toBeVisible();

    await abre(page, `${ANGULAR}/favorites`);
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'el favorito marcado no aparece en la lista',
    ).toHaveCount(1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'el favorito no sobrevive a recargar: no se ha guardado en el servidor',
    ).toHaveCount(1);

    const enFavoritos = page.locator('nx-tarjeta-producto').filter({ has: page.locator(`a[href="${enlace}"]`) });
    await enFavoritos.getByRole('button', { name: 'Quitar de favoritos' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'desmarcar el favorito no lo quita de la lista',
    ).toHaveCount(0);
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'marcar y desmarcar un favorito en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Cesta
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /** AÑADIR A LA CESTA desde la tarjeta. Primero lo que importa: que acabe DENTRO de la cesta. */
  test('añadir un producto desde la tarjeta lo mete en la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    await expect(
      page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }),
      'el producto añadido no está en la cesta',
    ).toHaveCount(1);
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'cliente-cesta');
    sinErroresDeConsola(errores, 'añadir a la cesta en el móvil');
  });

  /**
   * EL CONTADOR — y aquí está la diferencia gruesa con el escritorio. En el móvil el icono del
   * carrito de la barra superior NO SE PINTA (`hidden md:inline-flex`): el contador que la persona ve
   * es el de la BARRA DE PESTAÑAS de abajo, `#nx-cart-icon-movil`. Una prueba escrita contra el de
   * arriba leería siempre cero y daría por bueno un contador roto.
   */
  test('añadir un producto sube el contador de la BARRA INFERIOR', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    await expect(laBarraInferior(page), 'la barra de pestañas no se pinta en el móvil').toBeVisible();
    const antes = await lineasEnLaBarra(page);
    await anadeUnProducto(page);
    await esperaLineasEnLaBarra(page, antes + 1);
    await retrata(page, 'cliente-barra-contador');
    sinErroresDeConsola(errores, 'el contador de la barra de pestañas');
  });

  /**
   * ABRIR LA CESTA desde la barra de pestañas. Es el gesto del móvil: no hay icono de cesta arriba,
   * hay una PESTAÑA abajo, en la zona que alcanza el pulgar. Lo que se exige es el efecto —ver lo que
   * hay dentro—, no que la pestaña exista.
   */
  test('la pestaña «Carrito» de la barra inferior enseña el contenido de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await pulsaLaPestana(page, '/cart', 'Carrito');

    await expect(
      page.locator('nx-tabla-del-carrito, nx-cajon-del-carrito').filter({ hasText: titulo }),
      'pulsar la pestaña del carrito no enseña lo que hay dentro',
    ).toHaveCount(1, { timeout: 20_000 });

    await quitaDeLaCesta(page, titulo);
    sinErroresDeConsola(errores, 'abrir la cesta desde la barra de pestañas');
  });

  /**
   * Y LA MISMA ACCIÓN, comparada con el front anterior a esta anchura.
   *
   * <p>En escritorio esto es un defecto anotado: allí el original abre un CAJÓN lateral y el porte
   * navega a `/cart`. En el móvil hay que preguntarlo otra vez y por separado, porque el original
   * TAMBIÉN tiene barra de pestañas: si allí la pestaña del carrito navega, entonces navegar es la
   * paridad correcta y exigir el cajón sería inventar un defecto. La prueba mira lo que hace el
   * original y exige lo mismo.
   */
  test('la pestaña del carrito se comporta como la del front anterior', async ({ page }) => {
    await preparaElMovil(page, REACT);
    await abre(page, `${REACT}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    const enElOriginal = await page
      .locator('nav.fixed.bottom-0 a[href="/cart"], nav.fixed.bottom-0 button')
      .first()
      .evaluate((el) => el.tagName.toLowerCase())
      .catch(() => 'ninguno');

    await preparaElMovil(page, ANGULAR);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    const enElPorte = await laBarraInferior(page)
      .locator('a[href="/cart"], button')
      .first()
      .evaluate((el) => el.tagName.toLowerCase())
      .catch(() => 'ninguno');

    expect(
      enElPorte,
      `en el original la cesta de la barra es un «${enElOriginal}» y en el porte un «${enElPorte}»`,
    ).toBe(enElOriginal);
  });

  /**
   * CAMBIAR LA CANTIDAD. La tabla de la cesta cabe en 412 px, pero los botones de más y menos son la
   * pieza que primero se queda pequeña al encoger: se mide, además de usarse.
   */
  test('cambiar la cantidad de una línea cambia la cantidad y el importe', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    const cantidad = fila.locator('.join span').first();
    const importe = fila.locator('td').nth(3);

    const cantidadAntes = Number((await cantidad.innerText()).trim());
    const importeAntes = (await importe.innerText()).trim();

    const mas = fila.getByRole('button', { name: 'Añadir una unidad' });
    await noLoTapaLaBarra(page, mas, 'el botón de añadir una unidad');
    await mas.click();
    await expect(cantidad, 'la cantidad no sube al pulsar «+»').toHaveText(String(cantidadAntes + 1));
    await expect(importe, 'el importe de la línea no se recalcula').not.toHaveText(importeAntes);

    await fila.getByRole('button', { name: 'Quitar una unidad' }).click();
    await expect(cantidad, 'la cantidad no baja al pulsar «−»').toHaveText(String(cantidadAntes));

    await quitaDeLaCesta(page, titulo);
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'cambiar la cantidad en el móvil');
  });

  /** QUITAR DE LA CESTA. Se borra de verdad: es una línea que ha creado esta misma prueba. */
  test('quitar una línea la saca de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    const cuantasAntes = await page.locator('nx-tabla-del-carrito tbody tr').count();
    await expect(fila).toHaveCount(1);
    const eliminar = fila.getByRole('button', { name: /^Eliminar$/i });
    await noLoTapaLaBarra(page, eliminar, 'el botón de eliminar la línea');
    await eliminar.click();

    await expect(fila, 'la línea sigue en la cesta después de eliminarla').toHaveCount(0);
    await expect(
      page.locator('nx-tabla-del-carrito tbody tr'),
      'la cesta no pierde exactamente una línea',
    ).toHaveCount(cuantasAntes - 1);
    enLaCesta = null;
    sinErroresDeConsola(errores, 'quitar una línea en el móvil');
  });

  /** GUARDAR PARA MÁS TARDE. La lista guardada está DIFERIDA: en el móvil hay que bajar mucho más. */
  test('guardar para más tarde mueve la línea a la lista guardada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    await fila.getByRole('button', { name: /Guardar para más tarde/i }).click();

    await expect(fila, 'la línea sigue en la cesta después de apartarla').toHaveCount(0);
    await bajaAlFondo(page);
    const guardada = page.locator('nx-lista-guardada tbody tr').filter({ hasText: titulo });
    await expect(guardada, 'la línea apartada no aparece en «Guardado para más tarde»').toHaveCount(1);

    /* Limpieza: se borra SOLO la línea que ha creado esta prueba. La lista guardada del titular tiene
     * lo suyo y ahí no se toca nada. */
    await guardada.getByRole('button', { name: /^Eliminar$/i }).click();
    await expect(guardada, 'lo guardado no se puede eliminar').toHaveCount(0);
    enLaCesta = null;
    sinErroresDeConsola(errores, 'guardar para más tarde en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Divisa e idioma: en el móvil los dos viven en el FONDO del cajón
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * CAMBIAR DE DIVISA. En el escritorio el selector está en la barra de arriba; aquí ese sitio lleva
   * `hidden sm:block` y el único que se puede tocar está en el fondo del cajón, con la lista abriendo
   * HACIA ARRIBA para no salirse de la pantalla. Son tres gestos —abrir el cajón, abrir la lista,
   * elegir— donde el escritorio tiene dos.
   */
  test('cambiar de país desde el cajón cambia la moneda de los precios', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const precio = page.locator('nx-etiqueta-precio').first();
    const antes = (await precio.innerText()).trim();

    await abreElCajon(page);
    const regionAntes = await regionEnElCajon(page);
    await eligeRegionEnElCajon(page, PAIS_DE_OTRA_MONEDA);

    await expect
      .poll(() => regionEnElCajon(page), { message: 'el selector del cajón no recoge el país elegido' })
      .not.toBe(regionAntes);
    expect(await regionEnElCajon(page), 'el selector no pasa a la moneda del país elegido').toContain('MXN');

    await cierraElCajon(page);
    await expect
      .poll(async () => (await precio.innerText()).trim(), {
        timeout: 25_000,
        message: `los precios siguen escritos como «${antes}»`,
      })
      .not.toBe(antes);
    await retrata(page, 'cliente-divisa');
    sinErroresDeConsola(errores, 'cambiar de divisa desde el cajón');
  });

  /**
   * CAMBIAR DE IDIOMA. Mismo sitio y mismo gesto; se elige un país con la MISMA moneda que España
   * para que lo único que pueda cambiar sea el texto. El efecto se mira en el rótulo de los filtros,
   * que en el móvil es además el botón que los despliega: «Filtros» pasa a «Filtres».
   */
  test('cambiar de país desde el cajón cambia el idioma de los textos', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    await expect(page.getByText('Filtros', { exact: true }).first()).toBeVisible();

    await abreElCajon(page);
    await eligeRegionEnElCajon(page, PAIS_DE_OTRO_IDIOMA);
    expect(await regionEnElCajon(page), 'el selector no pasa al idioma elegido').toContain('FR');
    await cierraElCajon(page);

    await expect(
      page.getByText('Filtres', { exact: true }).first(),
      'los textos no se reescriben en el idioma elegido',
    ).toBeVisible({ timeout: 25_000 });
    sinErroresDeConsola(errores, 'cambiar de idioma desde el cajón');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Boletín
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * SUSCRIBIRSE AL BOLETÍN. En el móvil el pie queda debajo de la barra de pestañas, así que hay que
   * comprobar dos cosas a la vez: que el alta funciona y que su botón NO cae detrás de la barra —el
   * pie reserva ese hueco con `pb-24` y si alguien lo quita, el formulario se vuelve intocable—.
   *
   * <p>El alta se INTERCEPTA: dejarla llegar apuntaría una dirección de prueba en la base del titular
   * que después no se puede quitar desde la aplicación.
   */
  test('suscribirse al boletín manda el correo, y su botón no queda bajo la barra', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    const correo = `cert-boletin-movil-${Date.now()}@local.test`;
    const enviados: string[] = [];

    await page.route('**/api/newsletter/subscribe', async (ruta) => {
      enviados.push(ruta.request().postData() ?? '');
      await ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subscribed: true, alreadySubscribed: false }),
      });
    });

    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await bajaAlFondo(page);

    /* PRIMERO: ¿se puede dar de alta a 412 px, siquiera?
     *
     * Medido en las dos aplicaciones: en el pie NO HAY NINGÚN campo de correo con caja a esta anchura
     * —el porte pinta `nx-alta-boletin` con 0×0 y el front anterior sus dos `input[type=email]`
     * también a 0×0—. O sea, el alta al boletín NO SE OFRECE en el móvil, y no es una diferencia del
     * porte: es cómo está el diseño en las dos. Se comprueba contra el original en vez de darlo por
     * hecho, porque si algún día el original sí lo ofreciera y el porte no, eso SÍ sería un defecto y
     * tiene que salir en rojo, no saltarse. */
    const camposVisibles = async () =>
      page.locator('footer input[type="email"], nx-alta-boletin input[type="email"]').evaluateAll(
        (campos) => campos.filter((c) => c.getBoundingClientRect().height > 0).length,
      );
    const enElPorte = await camposVisibles();

    await preparaElMovil(page, REACT);
    await abre(page, `${REACT}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await bajaAlFondo(page);
    const enElOriginal = await camposVisibles();

    expect(
      enElPorte,
      `el original ofrece ${enElOriginal} campo(s) de alta al boletín en el móvil y el porte ${enElPorte}`,
    ).toBeGreaterThanOrEqual(enElOriginal);
    test.skip(
      enElPorte === 0,
      'el alta al boletín NO SE OFRECE a 412 px en ninguna de las dos aplicaciones ' +
        '(cero campos de correo con caja en el pie): a esta anchura no hay acción que certificar',
    );

    const alta = page.locator('nx-alta-boletin:visible').last();
    await alta.locator('input[type="email"]').fill(correo);
    const boton = alta.getByRole('button', { name: /Suscribirse/i });
    await noLoTapaLaBarra(page, boton, 'el botón de suscribirse al boletín');
    await boton.click();

    await expect
      .poll(() => enviados.length, { message: 'el alta en el boletín no manda ninguna petición' })
      .toBeGreaterThan(0);
    expect(enviados[0], 'la petición del boletín no lleva el correo tecleado').toContain(correo);
    await expect(
      alta.getByText(/Gracias|apuntad|suscri/i).first(),
      'la pantalla no confirma el alta',
    ).toBeVisible();
    sinErroresDeConsola(errores, 'suscribirse al boletín en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Cuenta
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * GUARDAR UN CAMBIO DEL PERFIL. Se toca la empresa —que no afecta a precios ni a envíos— y se
   * DEVUELVE a lo que estaba. Lo que prueba el guardado es que el valor sobrevive a recargar.
   */
  test('guardar un cambio del perfil lo deja guardado tras recargar', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/profile`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const empresa = page.locator('#perfil-empresa');
    await expect(empresa).toBeVisible();
    const original = await empresa.inputValue();
    const nuevo = `Cert movil ${Date.now()}`;

    await empresa.fill(nuevo);
    const guardar = page.getByRole('button', { name: /Guardar cambios/i }).first();
    await noLoTapaLaBarra(page, guardar, 'el botón de guardar el perfil');
    await guardar.click();
    await expect(page.getByText('Perfil actualizado'), 'el perfil no confirma el guardado').toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#perfil-empresa'), 'el cambio del perfil no sobrevive a recargar').toHaveValue(
      nuevo,
    );

    // Se devuelve a como estaba: esta batería no deja rastro en los datos del titular.
    await page.locator('#perfil-empresa').fill(original);
    await page.getByRole('button', { name: /Guardar cambios/i }).first().click();
    await expect(page.getByText('Perfil actualizado')).toBeVisible();
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'cliente-perfil');
    sinErroresDeConsola(errores, 'guardar el perfil en el móvil');
  });

  /**
   * AÑADIR Y BORRAR UNA DIRECCIÓN, con su confirmación. Es la única acción destructiva que se COMPLETA
   * en toda la batería, y solo porque la dirección la ha creado esta misma prueba unas líneas antes.
   * El formulario es el sitio donde una pantalla estrecha se rompe primero: se mide el desborde.
   */
  test('añadir una dirección y borrarla desde su confirmación', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/addresses`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const tarjetas = page.locator('nx-tarjeta-de-direccion');
    const antes = await tarjetas.count();
    const etiqueta = `Cert movil ${Date.now()}`;

    await page.getByRole('button', { name: /Agregar dirección|Añadir la primera/i }).first().click();
    await sinDesplazamientoHorizontal(page);
    await page.getByLabel('Etiqueta (Casa, Oficina…)').fill(etiqueta);
    await page.getByLabel('Nombre completo').fill('Certificación móvil');
    await page.getByLabel('País (ISO)').selectOption('ES');
    await page.getByLabel('Dirección', { exact: true }).fill('Calle de la Certificación 1');
    await page.getByLabel('Ciudad').fill('Madrid');
    await page.getByLabel('Código postal').fill('28001');
    await page.getByRole('button', { name: /Guardar dirección/i }).click();

    await expect(tarjetas, 'la dirección nueva no aparece en la lista').toHaveCount(antes + 1);
    const mia = tarjetas.filter({ hasText: etiqueta });
    await expect(mia, 'la dirección guardada no lleva la etiqueta tecleada').toHaveCount(1);

    await mia.getByRole('button', { name: /^Eliminar$/ }).click();
    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar una dirección no pide confirmación').toBeVisible();
    await expect(dialogo).toContainText('¿Eliminar esta dirección?');
    // El diálogo es lo que peor cabe en 412 px: se mide con él abierto.
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'cliente-direccion-confirmacion');
    await dialogo.getByRole('button', { name: /^Confirmar$/ }).click();

    await expect(mia, 'confirmar el borrado no quita la dirección').toHaveCount(0);
    await expect(tarjetas, 'la cuenta no vuelve a tener las direcciones que tenía').toHaveCount(antes);
    sinErroresDeConsola(errores, 'añadir y borrar una dirección en el móvil');
  });

  /**
   * CANCELAR el borrado de una dirección que ya existía. Es la mitad que de verdad protege los datos:
   * al pulsar «Cancelar» no puede salir NINGUNA petición de borrado.
   */
  test('cancelar el borrado de una dirección no manda nada al servidor', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/addresses`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const tarjetas = page.locator('nx-tarjeta-de-direccion');
    const antes = await tarjetas.count();
    test.skip(antes === 0, 'la cuenta no tiene ninguna dirección: no hay borrado que cancelar');

    const peticiones = vigilaLasPeticiones(page);
    await tarjetas.first().getByRole('button', { name: /^Eliminar$/ }).click();

    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar una dirección no pide confirmación').toBeVisible();
    await expect(dialogo).toContainText('¿Eliminar esta dirección?');
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    await expect(dialogo, 'el diálogo no se cierra al cancelar').toBeHidden();
    await expect(tarjetas, 'cancelar el borrado se ha llevado la dirección por delante').toHaveCount(antes);
    expect(
      peticionesDestructivas(peticiones),
      'cancelar el borrado ha mandado una petición de borrado al servidor',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar un borrado en el móvil');
  });

  /**
   * CERRAR SESIÓN. En el escritorio el botón vive en el desplegable de la cuenta de la barra superior;
   * a 412 px ese desplegable lleva `hidden sm:block` y el único cierre de sesión que se puede tocar
   * está en el FONDO DEL CAJÓN. El efecto no es que cambie el menú: es que ya no hay sesión, y se
   * comprueba pidiendo una zona privada, que tiene que rebotar al acceso.
   */
  test('cerrar sesión desde el cajón deja de haber sesión', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    await abreElCajon(page);
    const salir = elCajon(page).getByRole('button', { name: 'Cerrar sesión' }).first();
    await expect(salir, 'la pestaña llega SIN sesión: no hay nada que cerrar').toBeVisible();
    await sePuedePulsar(page, salir, 'el botón de cerrar sesión del cajón');

    // La sesión guardada ya no vale para nadie: se olvida para que la siguiente prueba entre de verdad.
    olvida(ANGULAR, CLIENTE.correo);

    await page.goto(`${ANGULAR}/orders`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => new URL(page.url()).pathname, {
        timeout: 20_000,
        message: 'con la sesión cerrada se sigue entrando en la zona privada',
      })
      .toContain('/login');
    sinErroresDeConsola(errores, 'cerrar sesión desde el cajón');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ADMINISTRACIÓN
// ═══════════════════════════════════════════════════════════════════════════════════════════════

test.describe('acciones de administración en el móvil', () => {
  /** Solo a 412 px: por encima de 1.024 px el menú del panel deja de plegarse y el gesto desaparece. */
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'movil', 'estas acciones son las del móvil: solo aplican a 412 px');
  });

  let enLaCesta: string | null = null;
  let marcadoFavorito: string | null = null;

  test.afterEach(async ({ page }) => {
    try {
      if (enLaCesta) {
        await page.goto(`${ANGULAR}/cart`, { waitUntil: 'domcontentloaded' });
        const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: enLaCesta }).first();
        if (await fila.count()) {
          await fila.getByRole('button', { name: /^Eliminar$/i }).click();
          await expect(fila).toHaveCount(0, { timeout: 15_000 });
        }
      }
      if (marcadoFavorito) {
        await desmarcaPorLaApi(page, marcadoFavorito);
      }
    } finally {
      enLaCesta = null;
      marcadoFavorito = null;
    }
  });

  async function desmarcaPorLaApi(page: Page, enlace: string): Promise<void> {
    const testigo = ((await page.evaluate(() => localStorage.getItem('nx-access-token'))) ?? '').replace(
      /^"|"$/g,
      '',
    );
    if (!testigo) {
      return;
    }
    const cabeceras = { Authorization: `Bearer ${testigo}` };
    const lista = await page.request
      .get(`${ANGULAR}/api/me/favorites?size=100`, { headers: cabeceras })
      .catch(() => null);
    if (!lista?.ok()) {
      return;
    }
    const cuerpo = (await lista.json()) as { items?: { id: string; slug: string }[] };
    const babosa = enlace.split('/').pop();
    const suyo = (cuerpo.items ?? []).find((item) => item.slug === babosa);
    if (suyo) {
      await page.request.delete(`${ANGULAR}/api/me/favorites/${suyo.id}`, { headers: cabeceras });
    }
  }

  /** Deja la pestaña dentro del panel, con sesión de administración y la región de partida fijada. */
  async function enElPanel(page: Page, ruta = '/admin'): Promise<void> {
    vigilaLasConsultasDelCatalogo(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}${ruta}`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
  }

  /** El identificador del primer producto del listado del panel. Se resuelve contra la base. */
  async function primeraFicha(page: Page): Promise<string> {
    await enElPanel(page, '/admin/catalog');
    const enlace = await page.locator('table tbody tr a[href^="/admin/catalog/"]').first().getAttribute('href');
    expect(enlace, 'el listado del panel no trae ningún producto').toBeTruthy();
    return enlace as string;
  }

  /** El texto que se ve dentro de `<main>`: lo contenido, no el marco. */
  async function contenidoPrincipal(page: Page): Promise<string> {
    return page.evaluate(() => {
      const zona = document.querySelector('main') ?? document.body;
      return (zona instanceof HTMLElement ? zona.innerText : '').replace(/\s+/g, ' ').trim();
    });
  }

  /**
   * Corta de raíz cualquier borrado en la red.
   *
   * <p>Red de seguridad de la regla dura: las pruebas que pulsan un botón de borrar lo hacen para ver
   * el diálogo, y si el porte borrara sin preguntar, la petición no saldría de esta máquina.
   */
  async function prohibeBorrar(page: Page): Promise<void> {
    await page.route('**/api/**', async (ruta) => {
      const peticion = ruta.request();
      const destructiva =
        peticion.method() === 'DELETE' || (peticion.method() === 'POST' && /bulk-delete/.test(peticion.url()));
      if (destructiva) {
        await ruta.abort();
        return;
      }
      await ruta.continue();
    });
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Entrar y moverse por el panel plegado
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /** ENTRAR EN EL PANEL. El efecto es que el panel de control trae datos, no solo el marco. */
  test('entrar en el panel enseña el panel de control con contenido', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page);

    expect(new URL(page.url()).pathname, 'el panel rebota al acceso con una cuenta de administración').toBe(
      '/admin',
    );
    const contenido = await contenidoPrincipal(page);
    expect(contenido, 'el panel responde «no encontrada»').not.toMatch(/\b404\b|no encontrada|not found/i);
    expect(contenido.length, 'el panel de control llega en blanco').toBeGreaterThan(200);
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'admin-panel');
    sinErroresDeConsola(errores, 'entrar en el panel en el móvil');
  });

  /**
   * ABRIR EL MENÚ PLEGADO. Es la acción que en escritorio NO EXISTE: por encima de 1.024 px la barra
   * lateral está siempre puesta.
   *
   * <p>Y hace falta comprobarlo aparte porque el menú plegado no se ESCONDE, se DESPLAZA fuera con
   * `-translate-x-full`: sigue teniendo caja, así que una prueba descuidada podría «pulsar» sus
   * entradas a la izquierda del borde de la pantalla y dar verde sobre un menú inalcanzable. Aquí se
   * exige que entre en pantalla —posición ≥ 0— antes de tocarlo, y que se retire al cerrarlo.
   */
  test('el menú del panel se abre desde las tres barras y se retira al cerrarlo', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page);

    const antes = Math.round((await elMenuDelPanel(page).boundingBox())?.x ?? 0);
    expect(antes, 'el menú del panel llega ya desplegado: a 412 px debería estar plegado').toBeLessThan(0);

    await abreElMenuDelPanel(page);
    await expect(elMenuDelPanel(page).locator('a[href="/admin/catalog"]').first()).toBeVisible();
    await retrata(page, 'admin-menu-abierto');

    await cierraElMenuDelPanel(page);
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'abrir y cerrar el menú del panel');
  });

  /**
   * BUSCAR EN EL CATÁLOGO DEL PANEL. Aquí los filtros también arrancan plegados, pero con OTRO
   * componente que el del escaparate (`nx-barra-filtros` frente a `nx-barra-de-filtros`): el
   * buscador y el rótulo «Mostrando N / T» no están en la pantalla hasta desplegarlo.
   */
  test('buscar en el catálogo del panel cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    expect(antes.total, 'el catálogo del panel llega vacío').toBeGreaterThan(0);

    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'la búsqueda del panel no deja ningún resultado').toBeGreaterThan(0);
    expect(despues, 'la búsqueda del panel devuelve más que el catálogo entero').toBeLessThan(antes.total);
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'admin-catalogo-busqueda');
    sinErroresDeConsola(errores, 'buscar en el catálogo del panel en el móvil');
  });

  /** FILTRAR EN EL PANEL. Un filtro numérico que resuelve el backend: el total tiene que moverse. */
  test('filtrar por precio en el panel cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    const filtro = page.getByLabel(/Precio ≥/).first();
    await filtro.fill('900');
    await filtro.blur();
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'filtrar por precio mínimo no reduce el listado').toBeLessThan(antes.total);
    sinErroresDeConsola(errores, 'filtrar en el panel en el móvil');
  });

  /**
   * ABRIR UNA FICHA desde el listado. La tabla del panel es más ancha que la pantalla y vive dentro
   * de su propio contenedor con desplazamiento: se comprueba que el enlace se alcanza sin que la
   * PÁGINA se desplace en horizontal, que es la regla del proyecto.
   */
  test('abrir una ficha desde el listado del panel lleva a la ficha', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');
    await sinDesplazamientoHorizontal(page);

    const primeraFila = page.locator('table tbody tr').first();
    const enlace = primeraFila.locator('a[href^="/admin/catalog/"]').last();
    const titulo = (await enlace.innerText()).trim();
    await enlace.click();

    await page.waitForURL(/\/admin\/catalog\/[^/]+$/, { timeout: 20_000 });
    await expect(
      page.locator('nx-resumen-de-ficha'),
      'la ficha abierta desde el panel no trae su desglose',
    ).toBeVisible();
    if (titulo) {
      await expect(page.locator('main')).toContainText(titulo.slice(0, 30));
    }
    await sinDesplazamientoHorizontal(page);
    await retrata(page, 'admin-ficha');
    sinErroresDeConsola(errores, 'abrir una ficha desde el panel en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Edición del desglose: un gesto que en el móvil NO TIENE equivalente
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Edita un importe del desglose y lo DEVUELVE a su valor original.
   *
   * <p>HALLAZGO DEL PORTE A ESTA ANCHURA: la única forma de abrir el campo es un DOBLE CLIC
   * (`(dblclick)` en `nx-fila-de-yuanes`), y en una pantalla táctil no hay doble clic —dos toques
   * seguidos son un gesto de zoom—. No hay lápiz, ni pulsación larga, ni ninguna otra puerta. Aquí se
   * ejecuta con el doble clic que emula el navegador, así que lo que la prueba certifica es que la
   * EDICIÓN funciona; que el gesto para llegar a ella no existe en un móvil de verdad queda anotado
   * como defecto de accesibilidad táctil en el informe.
   *
   * <p>El importe se restaura al terminar: el recargo es una de las tres palancas del precio de venta.
   */
  async function certificaImporte(page: Page, etiqueta: string, campo: string): Promise<void> {
    const errores = vigilaLaConsola(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const fila = page.locator('nx-fila-de-yuanes').filter({ hasText: etiqueta }).first();
    await expect(fila, `la ficha no enseña la fila «${etiqueta}»`).toBeVisible();
    const antes = (await fila.innerText()).trim();

    await fila.locator('div').first().dblclick();
    const entrada = fila.locator(`input[aria-label="${campo}"]`);
    await expect(entrada, 'el doble clic no abre el campo de edición').toBeVisible();
    const original = await entrada.inputValue();
    const nuevo = String(Number(original || 0) + 7);

    await entrada.fill(nuevo);
    await expect(entrada, 'el campo no enseña el valor tecleado').toHaveValue(nuevo);
    await entrada.press('Enter');

    await expect
      .poll(async () => (await fila.innerText()).trim(), {
        timeout: 20_000,
        message: `«${etiqueta}» sigue enseñando «${antes}»: el importe no se ha guardado`,
      })
      .not.toBe(antes);

    await fila.locator('div').first().dblclick();
    const restaura = fila.locator(`input[aria-label="${campo}"]`);
    await expect(restaura).toBeVisible();
    await restaura.fill(original || '0');
    await restaura.press('Enter');
    await expect
      .poll(async () => (await fila.innerText()).trim(), {
        timeout: 20_000,
        message: `no se ha podido devolver «${etiqueta}» a «${antes}»`,
      })
      .toBe(antes);
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, `editar «${etiqueta}» en el móvil`);
  }

  test('editar el Recargo enseña lo tecleado y lo guarda', async ({ page }) => {
    await certificaImporte(page, 'Recargo', 'Recargo (CNY)');
  });

  test('editar el Subsidio de envío enseña lo tecleado y lo guarda', async ({ page }) => {
    await certificaImporte(page, 'Subsidio de envío', 'Subsidio de envío (CNY)');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Marca de «verificado»
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * MARCAR Y DESMARCAR «VERIFICADO». Se hacen las dos, así que el producto queda como estaba. En el
   * móvil la casilla es la pieza más pequeña de la ficha: se comprueba que no la tapa nada antes de
   * tocarla, porque este bloque cae cerca del fondo de la pantalla.
   */
  test('marcar y desmarcar «verificado» cambia el estado del producto', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    const enlace = await page.locator('nx-tarjeta-producto a').first().getAttribute('href');
    const slug = (enlace ?? '').split('/').pop();
    expect(slug, 'el catálogo no trae ningún producto que verificar').toBeTruthy();

    await abre(page, `${ANGULAR}/admin/browse/${slug}`);
    const panel = page.locator('nx-panel-de-origen');
    await expect(panel, 'la ficha vista por el panel no trae el bloque de origen').toBeVisible();
    const casilla = panel.locator('input[type="checkbox"]');
    await noLoTapaLaBarra(page, casilla, 'la casilla de «verificado»');
    const estabaMarcado = await casilla.isChecked();

    await casilla.setChecked(!estabaMarcado);
    await expect(
      panel.getByText(!estabaMarcado ? 'Sí' : 'No', { exact: true }),
      'el rótulo de «verificado» no cambia al marcarlo',
    ).toBeVisible({ timeout: 15_000 });

    await casilla.setChecked(estabaMarcado);
    await expect(
      panel.getByText(estabaMarcado ? 'Sí' : 'No', { exact: true }),
      'desmarcar «verificado» no devuelve el producto a su estado',
    ).toBeVisible({ timeout: 15_000 });
    await sinDesplazamientoHorizontal(page);
    sinErroresDeConsola(errores, 'marcar y desmarcar verificado en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Borrados: se abren, se leen y se CANCELAN
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * BORRAR EL PRODUCTO — cancelando. Además de la confirmación, en el móvil hay que comprobar que el
   * DIÁLOGO cabe: es la pieza que peor encaja en 412 px y la que, si se sale, deja el botón de
   * cancelar fuera de la pantalla —o sea, un borrado del que no se puede uno echar atrás—.
   */
  test('borrar el producto pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const peticiones = vigilaLasPeticiones(page);
    await page.locator('nx-cabecera-de-ficha').getByRole('button', { name: /^Eliminar$/ }).click();

    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar el producto no pide confirmación').toBeVisible();
    await expect(dialogo, 'la confirmación no explica lo que se va a borrar').toContainText(
      /Eliminar este producto/i,
    );
    await sinDesplazamientoHorizontal(page);
    const cancelar = dialogo.getByRole('button', { name: /^Cancelar$/ });
    await sePuedePulsar(page, cancelar, 'el botón de cancelar del diálogo');

    await expect(dialogo, 'el diálogo no se cierra al cancelar').toBeHidden();
    await expect(page.locator('nx-resumen-de-ficha'), 'cancelar se ha llevado la ficha por delante').toBeVisible();
    expect(
      peticionesDestructivas(peticiones),
      'cancelar el borrado del producto ha mandado una petición de borrado',
    ).toEqual([]);
    await retrata(page, 'admin-borrar-producto');
    sinErroresDeConsola(errores, 'cancelar el borrado del producto en el móvil');
  });

  /** BORRAR UNA VARIANTE — cancelando. Vive en la pestaña «Inventario», que está diferida. */
  test('borrar una variante pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    /* Las pestañas de la ficha se salen de 412 px y viven en una tira con desplazamiento propio:
     * hay que arrastrarla hasta «Inventario» antes de poder pulsarla. Lo hace `scrollIntoViewIfNeeded`,
     * que es lo que traduce el gesto de deslizar la tira con el dedo. */
    const pestana = page.getByRole('button', { name: 'Inventario', exact: true });
    await pestana.scrollIntoViewIfNeeded();
    await pestana.click();
    const gestor = page.locator('nx-gestor-de-variantes');
    await expect(gestor, 'la pestaña de inventario no monta el gestor de variantes').toBeVisible({
      timeout: 20_000,
    });
    const borrar = gestor.getByRole('button', { name: /^Eliminar$/ }).first();
    test.skip(
      (await borrar.count()) === 0,
      'este producto no tiene variantes en la base local: no hay variante que borrar',
    );

    const peticiones = vigilaLasPeticiones(page);
    await borrar.click();

    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar una variante no pide confirmación').toBeVisible();
    await expect(dialogo, 'la confirmación no dice qué variante se borra').toContainText(/Eliminar la variante/i);
    await sinDesplazamientoHorizontal(page);
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    await expect(dialogo, 'el diálogo no se cierra al cancelar').toBeHidden();
    expect(
      peticionesDestructivas(peticiones),
      'cancelar el borrado de la variante ha mandado una petición de borrado',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de una variante en el móvil');
  });

  /** BORRAR UNA IMAGEN — cancelando. La papelera es un objetivo diminuto sobre la miniatura. */
  test('borrar una imagen pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const galeria = page.locator('nx-galeria-de-ficha');
    await expect(galeria).toBeVisible();
    const papelera = galeria.getByRole('button', { name: 'Quitar imagen' }).first();
    test.skip((await papelera.count()) === 0, 'este producto no tiene imágenes: no hay imagen que borrar');

    const peticiones = vigilaLasPeticiones(page);
    await papelera.click();

    const dialogo = elDialogo(page);
    await expect(
      dialogo,
      'quitar una imagen NO pide confirmación: se borra en cuanto se pulsa la papelera',
    ).toBeVisible();
    await expect(dialogo).toContainText(/Quitar esta imagen/i);
    await sinDesplazamientoHorizontal(page);
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    expect(
      peticionesDestructivas(peticiones),
      'se ha intentado borrar la imagen sin haber confirmado nada',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de una imagen en el móvil');
  });

  /** BORRAR UN TRAMO DE PRECIO — cancelando. El tramo vive en la pestaña «Precios», diferida. */
  test('borrar un tramo de precio pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const pestana = page.getByRole('button', { name: 'Precios', exact: true });
    await pestana.scrollIntoViewIfNeeded();
    await pestana.click();
    const precios = page.locator('nx-precios-de-ficha');
    await expect(precios, 'la pestaña de precios no monta').toBeVisible({ timeout: 20_000 });
    // Se acota a la TABLA de tramos: los valores de variación llevan otra papelera con el mismo nombre.
    const papelera = precios.locator('table tbody tr td:last-child button').first();
    test.skip((await papelera.count()) === 0, 'este producto no tiene tramos de precio: no hay tramo que borrar');

    const peticiones = vigilaLasPeticiones(page);
    await papelera.click();

    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar un tramo de precio NO pide confirmación').toBeVisible();
    await sinDesplazamientoHorizontal(page);
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();
    expect(
      peticionesDestructivas(peticiones),
      'se ha intentado borrar el tramo sin haber confirmado nada',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de un tramo de precio en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Reordenar imágenes: el otro gesto sin equivalente táctil
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * REORDENAR ARRASTRANDO. Segundo HALLAZGO de accesibilidad táctil: la galería se reordena con
   * `draggable="true"`, o sea, con la API de arrastre de HTML5, que en un navegador táctil NO SE
   * DISPARA con el dedo —no hay `dragstart` desde un `touchstart`—. Aquí se ejecuta con el arrastre de
   * ratón que emula el navegador, así que lo que se certifica es que el REORDENADO funciona; que no
   * haya forma de hacerlo con el dedo, ni flechas de «subir/bajar» como alternativa, queda anotado.
   *
   * <p>El orden de la galería es un dato del titular —sale del orden de 1688— así que la petición que
   * lo guardaría se INTERCEPTA, y al recargar la ficha el orden original sigue intacto.
   */
  test('arrastrar una imagen reordena la galería y manda el orden nuevo', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    const cuerpos: string[] = [];
    await page.route('**/images/order', async (ruta) => {
      cuerpos.push(ruta.request().postData() ?? '');
      await ruta.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const fotos = page.locator('nx-galeria-de-ficha [draggable="true"]');
    test.skip((await fotos.count()) < 2, 'este producto tiene menos de dos imágenes: no hay nada que reordenar');

    const ordenAntes = await fotos
      .locator('img')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''));

    await fotos.nth(0).dragTo(fotos.nth(1));

    await expect
      .poll(() => cuerpos.length, {
        timeout: 15_000,
        message: 'arrastrar una imagen no manda el orden nuevo al servidor',
      })
      .toBeGreaterThan(0);

    const ordenDespues = await fotos
      .locator('img')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''));
    expect(ordenDespues, 'la galería no cambia de orden al soltar la imagen').not.toEqual(ordenAntes);

    // Y la prueba de que no se ha tocado nada: al volver a pedir la ficha, el orden es el de siempre.
    await page.unroute('**/images/order');
    await abre(page, `${ANGULAR}${ruta}`);
    const ordenGuardado = await page
      .locator('nx-galeria-de-ficha [draggable="true"] img')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''));
    expect(ordenGuardado, 'la prueba ha cambiado el orden de las imágenes del titular').toEqual(ordenAntes);
    sinErroresDeConsola(errores, 'reordenar imágenes arrastrando en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // El cliente que también es administrador
  // ───────────────────────────────────────────────────────────────────────────────────────────

  test('el administrador también puede buscar en el catálogo del escaparate', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    vigilaLasConsultasDelCatalogo(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    await abreLosFiltros(page);
    const antes = await contadorDeResultados(page);
    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);
    expect(despues).toBeGreaterThan(0);
    expect(despues).toBeLessThan(antes.total);
    sinErroresDeConsola(errores, 'buscar con la cuenta de administración en el móvil');
  });

  test('el administrador también puede marcar y desmarcar un favorito', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const sinMarcar = page
      .locator('nx-tarjeta-producto')
      .filter({ has: page.getByRole('button', { name: 'Añadir a favoritos' }) })
      .first();
    await expect(sinMarcar).toBeVisible();
    const enlace = await sinMarcar.locator('a').first().getAttribute('href');
    marcadoFavorito = enlace;

    const tarjeta = page.locator('nx-tarjeta-producto').filter({ has: page.locator(`a[href="${enlace}"]`) });
    await tarjeta.getByRole('button', { name: 'Añadir a favoritos' }).click();
    await abre(page, `${ANGULAR}/favorites`);
    await expect(page.locator(`nx-tarjeta-producto a[href="${enlace}"]`)).toHaveCount(1);

    await page
      .locator('nx-tarjeta-producto')
      .filter({ has: page.locator(`a[href="${enlace}"]`) })
      .getByRole('button', { name: 'Quitar de favoritos' })
      .click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator(`nx-tarjeta-producto a[href="${enlace}"]`)).toHaveCount(0);
    sinErroresDeConsola(errores, 'favoritos con la cuenta de administración en el móvil');
  });

  /**
   * La cuenta de administración también compra. El contador que se comprueba es el de la BARRA DE
   * PESTAÑAS: en el escaparate, a 412 px, el icono de la cabecera no se pinta.
   */
  test('el administrador también puede añadir y quitar de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const antes = await lineasEnLaBarra(page);
    const tarjetas = page.locator('nx-tarjeta-producto');
    let titulo = '';
    for (let i = 0; i < Math.min(await tarjetas.count(), 6) && !titulo; i++) {
      const tarjeta = tarjetas.nth(i);
      const candidato = (await tarjeta.locator('p').first().innerText()).trim();
      const boton = tarjeta.getByRole('button', { name: /Añadir al carrito/i });
      await boton.scrollIntoViewIfNeeded();
      await boton.click();
      const bien = await tarjeta
        .getByRole('button', { name: /^Añadido$/i })
        .waitFor({ state: 'visible', timeout: 6_000 })
        .then(() => true)
        .catch(() => false);
      titulo = bien ? candidato : '';
      enLaCesta = titulo || null;
    }
    expect(titulo, 'ninguna tarjeta dejó añadir a la cesta con la cuenta de administración').not.toBe('');

    await abre(page, `${ANGULAR}/cart`);
    const fila = page.locator('tbody tr').filter({ hasText: titulo }).first();
    await expect(fila).toHaveCount(1);
    await fila.getByRole('button', { name: /^Eliminar$/i }).click();
    await expect(fila).toHaveCount(0);
    enLaCesta = null;
    expect(await lineasEnLaBarra(page), 'el contador de la barra de pestañas no vuelve a su sitio').toBe(antes);
    sinErroresDeConsola(errores, 'cesta con la cuenta de administración en el móvil');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Recorrido de las secciones, navegando por el MENÚ PLEGADO
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Cada sección del panel, alcanzada ABRIENDO el menú plegado y pulsando su entrada.
   *
   * <p>Es lo que distingue esta batería de la de escritorio: allí la entrada del menú está siempre a
   * la vista y basta con pulsarla. Aquí hay que abrir el menú primero, la entrada puede quedar por
   * debajo del pliegue de una lista de treinta y siete, y al navegar el menú se cierra solo. Lo que se
   * exige a cada sección es contenido DENTRO de `<main>` —no en el marco, que ya trae el menú entero—,
   * que no sea la página de «no encontrada» y que no obligue a desplazarse en horizontal.
   */
  for (const seccion of SECCIONES) {
    test(`la sección ${seccion} se abre desde el menú plegado`, async ({ page }) => {
      const errores = vigilaLaConsola(page);
      await enElPanel(page);

      const entrada = elMenuDelPanel(page).locator(`a[href="${seccion}"]`).first();
      if (await entrada.count()) {
        await abreElMenuDelPanel(page);
        await entrada.scrollIntoViewIfNeeded();
        await entrada.click();
        await page.waitForURL((url) => url.pathname === seccion, { timeout: 20_000 });
      } else {
        // Sin entrada de menú no hay gesto que certificar; se llega por la dirección y queda dicho.
        await abre(page, `${ANGULAR}${seccion}`);
      }

      /* El umbral es MÁS BAJO que el de escritorio (120) y tiene que serlo.
       *
       * A 412 px el marco no aporta texto a `<main>` —no hay migas anchas ni rótulos auxiliares— así
       * que una sección legítimamente vacía escribe menos. Medido: `/admin/support` sin tickets da 117
       * caracteres («…Todos OPEN RESOLVED CLOSED No hay tickets») y el front anterior 123 en su
       * equivalente. Con el umbral del escritorio, una pantalla perfectamente pintada salía marcada
       * como «llega en blanco», que es justo el falso positivo que hace que se deje de mirar el
       * informe. */
      await expect
        .poll(async () => (await contenidoPrincipal(page)).length, {
          timeout: 20_000,
          message: `${seccion} llega en blanco`,
        })
        .toBeGreaterThan(80);
      const contenido = await contenidoPrincipal(page);
      /* «404» con límites de palabra: sin ellos, la partida arancelaria 640411 de «Grupos de
       * declaración» contiene la secuencia 404 y la sección salía marcada como página de error. */
      expect(contenido, `${seccion} responde «no encontrada»`).not.toMatch(
        /\b404\b|página no encontrada|page not found/i,
      );
      await sinDesplazamientoHorizontal(page);
      sinErroresDeConsola(errores, `abrir ${seccion} desde el menú plegado`);
    });
  }

  /**
   * CERRAR SESIÓN DESDE EL PANEL. El botón está al fondo de la barra lateral, así que en el móvil hay
   * que abrir el menú antes: sin abrirlo, el botón está desplazado fuera de la pantalla y ningún dedo
   * llega a él.
   */
  test('cerrar sesión desde el menú del panel deja de haber sesión', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page);

    await abreElMenuDelPanel(page);
    const salir = elMenuDelPanel(page).getByRole('button', { name: 'Cerrar sesión' }).first();
    await sePuedePulsar(page, salir, 'el botón de cerrar sesión del menú del panel');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 20_000 });
    olvida(ANGULAR, ADMIN.correo);

    await abre(page, `${ANGULAR}/admin`);
    expect(new URL(page.url()).pathname, 'con la sesión cerrada se sigue entrando en el panel').toContain(
      '/login',
    );
    sinErroresDeConsola(errores, 'cerrar sesión desde el menú del panel');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// LO ESTÉTICO: se comprueba en las MISMAS pantallas por las que se acaba de operar
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Las pantallas por las que pasa la certificación funcional de arriba. Se miran una a una contra el
 * front anterior a la MISMA anchura, porque la referencia es la aplicación que se reemplaza y no un
 * ideal: medir contra un ideal marcaba media aplicación —y también la del original—.
 */
const PANTALLAS_CERTIFICADAS: readonly string[] = [
  '/',
  '/catalog',
  '/cart',
  '/favorites',
  '/orders',
  '/profile',
  '/addresses',
  '/admin',
  '/admin/catalog',
];

test.describe('lo estético del móvil', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'movil', 'la maqueta del móvil solo se mide a 412 px');
  });

  /** El nombre del fichero del retrato. La portada no tiene nombre de ruta, así que se le pone uno. */
  const comoSeLlamaElRetrato = (ruta: string) => (ruta === '/' ? 'portada' : ruta.replace(/^\//, '').replace(/\//g, '-'));

  /** Deja la pestaña en una pantalla, con sesión de administración —que también es cliente—. */
  async function enLaPantalla(page: Page, base: string, ruta: string): Promise<void> {
    await preparaElMovil(page, base);
    await entra(page, base, ADMIN);
    await abre(page, `${base}${ruta}`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await bajaAlFondo(page);
  }

  /**
   * NINGUNA pantalla obliga a desplazarse en horizontal MIENTRAS SE OPERA.
   *
   * <p>Es distinto de lo que ya mide `paridad/movil.spec.ts`: aquella mira las rutas públicas recién
   * abiertas y sin sesión. Aquí se miran las pantallas de trabajo —cesta, pedidos, panel— con la
   * sesión puesta, sus tablas con datos de verdad y el cajón ABIERTO, que es el estado en el que un
   * desborde deja la aplicación intocable en lugar de solo fea.
   */
  for (const ruta of PANTALLAS_CERTIFICADAS) {
    test(`${ruta} no obliga a desplazarse en horizontal mientras se opera`, async ({ page }) => {
      await enLaPantalla(page, ANGULAR, ruta);
      await sinDesplazamientoHorizontal(page);

      // Y con el cajón —o el menú del panel— abierto encima, que es cuando más ancho pide la pantalla.
      const enElPanel = ruta.startsWith('/admin');
      await page.evaluate(() => window.scrollTo(0, 0));
      if (enElPanel) {
        await abreElMenuDelPanel(page);
      } else {
        await abreElCajon(page);
      }
      await sinDesplazamientoHorizontal(page);
      await retrata(page, `porte-${comoSeLlamaElRetrato(ruta)}-cajon`);
    });
  }

  /**
   * El porte no puede AÑADIR objetivos más difíciles de pulsar que los del original.
   *
   * <p>Se compara contra el front anterior a la misma anchura y por lo que ES el control, no por sus
   * medidas exactas: un píxel de diferencia lo convertiría en «un objetivo nuevo» y llenaría el
   * informe de falsos positivos. El mínimo es 24 píxeles, el del nivel AA que el proyecto se fija.
   */
  for (const ruta of PANTALLAS_CERTIFICADAS) {
    test(`${ruta} no empeora lo que se puede pulsar`, async ({ page }) => {
      await enLaPantalla(page, REACT, ruta);
      const enElOriginal = new Set((await objetivosTactilesPequenos(page)).map(soloElNombre));
      await retrata(page, `original-${comoSeLlamaElRetrato(ruta)}`);

      await enLaPantalla(page, ANGULAR, ruta);
      const nuevos = (await objetivosTactilesPequenos(page)).filter((x) => !enElOriginal.has(soloElNombre(x)));
      await retrata(page, `porte-${comoSeLlamaElRetrato(ruta)}`);

      expect(
        nuevos,
        `${ruta}: objetivos por debajo de 24 px que el original no tiene: ${nuevos.slice(0, 6).join(' · ')}`,
      ).toEqual([]);
    });
  }

  /**
   * Las mismas piezas y repartidas igual, como en `paridad/maqueta.spec.ts` pero en las pantallas de
   * TRABAJO, que son las que aquella no mira porque exigen sesión.
   */
  for (const ruta of PANTALLAS_CERTIFICADAS) {
    test(`${ruta} tiene las mismas piezas y reparte el espacio igual`, async ({ page }) => {
      await enLaPantalla(page, REACT, ruta);
      const piezasOriginal = await inventario(page);
      const franjasOriginal = await franjas(page);

      await enLaPantalla(page, ANGULAR, ruta);
      const piezasPorte = await inventario(page);
      const franjasPorte = await franjas(page);

      /* Los controles de formulario se comparan EXACTOS: un desplegable nativo de más significa que
       * la pantalla se portó con otro componente, que es justo lo que hay que cazar. Lo que depende de
       * los datos —una fila más de catálogo— se tolera. */
      for (const pieza of ['desplegables nativos', 'casillas', 'tablas']) {
        expect(
          piezasPorte[pieza],
          `${ruta}: hay ${piezasPorte[pieza]} «${pieza}» y el original tiene ${piezasOriginal[pieza]}`,
        ).toBe(piezasOriginal[pieza]);
      }

      /* Y el reparto: que no aparezca un bloque a media pantalla donde el original ocupa toda. Se
       * comparan CONJUNTOS y no listas ordenadas, porque el orden del marcado no coincide entre las
       * dos tecnologías y compararlo daría diferencias en cada pantalla. */
      const resume = (lista: string[]) => {
        const cuenta: Record<string, number> = {};
        for (const x of lista) {
          cuenta[x] = (cuenta[x] ?? 0) + 1;
        }
        return cuenta;
      };
      const original = resume(franjasOriginal);
      const porte = resume(franjasPorte);
      for (const clave of Object.keys(porte)) {
        if (!clave.includes(':medio') && !clave.includes(':un cuarto')) {
          continue;
        }
        expect(
          original[clave] ?? 0,
          `${ruta}: el porte tiene ${porte[clave]} «${clave}» y el original ${original[clave] ?? 0}`,
        ).toBeGreaterThan(0);
      }
    });
  }

  /**
   * LA BARRA DE PESTAÑAS NO PUEDE TAPAR EL BOTÓN PRINCIPAL de la pantalla.
   *
   * <p>Es el riesgo propio de esta maqueta y no lo mira ninguna otra prueba: la barra va
   * `fixed bottom-0` con `z-40`, así que cualquier acción que caiga en esa franja deja de ser
   * pulsable AUNQUE SE VEA PERFECTAMENTE. El hueco lo reserva el pie con `pb-24`; si alguien lo quita
   * al portar una pantalla, no se rompe nada visible: simplemente deja de poder pulsarse.
   */
  test('la barra de pestañas no tapa el botón principal de la cesta ni del perfil', async ({ page }) => {
    for (const [ruta, control, comoSeLlama] of [
      ['/profile', 'button:has-text("Guardar cambios")', 'el botón de guardar el perfil'],
      ['/cart', 'a[href="/catalog"], button:has-text("Ver catálogo")', 'la salida al catálogo de la cesta'],
    ] as const) {
      await enLaPantalla(page, ANGULAR, ruta);
      /* Solo lo que se VE: estas pantallas montan el mismo botón varias veces —una por pestaña, una
       * por tamaño— y quedarse con el primero del árbol caía en uno oculto, que ni se puede tapar ni
       * se puede pulsar. Lo que hay que comprobar es el que la persona tiene delante. */
      const objetivo: Locator = page.locator(control).locator('visible=true').first();
      if ((await objetivo.count()) === 0) {
        continue;
      }
      await noLoTapaLaBarra(page, objetivo, `${ruta}: ${comoSeLlama}`);
    }
  });

  /**
   * NADA PUEDE TAPAR LA PANTALLA ENTERA sin que el original haga lo mismo.
   *
   * <p>Esta prueba nace de lo que apareció al escribir la batería: al entrar por primera vez, el
   * asistente se planta con una capa `fixed inset-0 z-40 bg-black/20` que INTERCEPTA todos los toques
   * —Playwright no consigue pulsar ni el botón del menú— hasta que se le contesta. El front anterior
   * a la misma anchura no pone ninguna capa así. Se mide SIN la preparación que la aparta, que es
   * justo lo que ve quien llega por primera vez desde un móvil.
   */
  test('el porte no tapa la pantalla entera con nada que el original no tenga', async ({ page }) => {
    const capasQueTapan = (base: string) =>
      page.evaluate(
        () =>
          Array.from(document.querySelectorAll('div, aside, section'))
            .filter((e) => {
              const s = getComputedStyle(e);
              const c = e.getBoundingClientRect();
              return (
                s.position === 'fixed' &&
                s.pointerEvents !== 'none' &&
                c.width >= innerWidth * 0.9 &&
                c.height >= innerHeight * 0.9
              );
            })
            .map((e) => (e.getAttribute('data-testid') ?? e.className.toString()).slice(0, 60)),
        base,
      );

    // Sin `preparaElMovil`: es la primera visita de verdad, que es cuando esto ocurre.
    await abre(page, `${REACT}/`);
    await page.waitForTimeout(6_000);
    const enElOriginal = await capasQueTapan(REACT);

    await abre(page, `${ANGULAR}/`);
    await page.waitForTimeout(6_000);
    const enElPorte = await capasQueTapan(ANGULAR);
    await retrata(page, 'porte-capa-a-pantalla-completa');

    expect(
      enElPorte.length,
      `el porte pone ${enElPorte.length} capa(s) a pantalla completa que interceptan el toque ` +
        `(${enElPorte.join(' · ')}) y el original ${enElOriginal.length}`,
    ).toBeLessThanOrEqual(enElOriginal.length);
  });

  /**
   * EL CAJÓN ABIERTO tiene que dejar su propio contenido alcanzable.
   *
   * <p>Un cajón que se sale por abajo esconde justo lo que solo vive ahí en el móvil: el selector de
   * región y el cierre de sesión. Se comprueba que los dos caen DENTRO de la pantalla, que es la única
   * forma de saber que se pueden tocar.
   */
  test('el cajón deja alcanzables el selector de región y el cierre de sesión', async ({ page }) => {
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await abreElCajon(page);
    await retrata(page, 'porte-cajon-abierto');

    for (const [control, comoSeLlama] of [
      ['nx-selector-pais-moneda button[aria-haspopup="listbox"]', 'el selector de región'],
      ['button:has-text("Cerrar sesión")', 'el cierre de sesión'],
    ] as const) {
      const objetivo = elCajon(page).locator(control).first();
      await expect(objetivo, `${comoSeLlama} no está en el cajón`).toBeVisible();
      const caja = await objetivo.boundingBox();
      const alto = page.viewportSize()?.height ?? 0;
      expect(
        (caja?.y ?? 0) + (caja?.height ?? 0),
        `${comoSeLlama} se sale por debajo del cajón: no se puede tocar`,
      ).toBeLessThanOrEqual(alto);
    }
  });

  /**
   * LOS CONTROLES QUE SOLO EXISTEN EN EL MÓVIL tienen que medir para un dedo.
   *
   * <p>Son los que ninguna otra prueba mira, precisamente porque en escritorio no se pintan: el botón
   * de las tres barras, las pestañas de abajo, los enlaces del cajón, el selector de región y el
   * cierre de sesión del cajón, y el rótulo que despliega los filtros. Si alguno de estos se queda
   * corto, no es un detalle: es la ÚNICA puerta a esa función a esta anchura.
   *
   * <p>Se mide contra el nivel AA —24 px— que es el que el proyecto se fija, y se listan TODOS los que
   * no llegan en vez de parar en el primero: un informe que solo dice el primero obliga a repetir la
   * tanda tantas veces como defectos haya.
   *
   * <p>MEDIDO EL 7-SEP-2026, y conviene dejarlo escrito para que nadie persiga al porte por esto: los
   * enlaces del cajón dan 99×23,6 px en el porte y 100×23,6 px en el FRONT ANTERIOR. O sea, el hueco de
   * accesibilidad —medio píxel por debajo del mínimo AA— viene HEREDADO del diseño, no lo introduce el
   * porte. Esta prueba sigue en rojo a propósito: el encargo pide las dos cosas, que no se empeore lo
   * del original (se cumple) y que se llegue al nivel AA (no se llega, en ninguna de las dos).
   */
  test('los controles propios del móvil miden para un dedo', async ({ page }) => {
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const cortos: string[] = [];
    const mide = async (control: Locator, comoSeLlama: string) => {
      if ((await control.count()) === 0) {
        cortos.push(`${comoSeLlama}: no está`);
        return;
      }
      const caja = await control.first().boundingBox();
      const lado = Math.min(caja?.width ?? 0, caja?.height ?? 0);
      if (lado < 24) {
        cortos.push(`${comoSeLlama} (${(caja?.width ?? 0).toFixed(0)}×${(caja?.height ?? 0).toFixed(1)})`);
      }
    };

    await mide(page.getByRole('button', { name: 'Menú' }), 'el botón de las tres barras');
    await mide(page.locator('[aria-controls="filtros-del-catalogo"]'), 'el rótulo que despliega los filtros');
    for (const destino of ['/', '/catalog', '/cart', '/profile']) {
      await mide(laBarraInferior(page).locator(`a[href="${destino}"]`), `la pestaña ${destino}`);
    }

    await abreElCajon(page);
    for (const destino of ['/orders', '/favorites', '/history', '/wallet', '/affiliate']) {
      await mide(elCajon(page).locator(`a[href="${destino}"]`), `el enlace ${destino} del cajón`);
    }
    await mide(
      elCajon(page).locator('nx-selector-pais-moneda button[aria-haspopup="listbox"]'),
      'el selector de región del cajón',
    );
    await mide(elCajon(page).getByRole('button', { name: 'Cerrar sesión' }), 'el cierre de sesión del cajón');
    await mide(elCajon(page).getByRole('button', { name: 'Cerrar', exact: true }), 'el aspa del cajón');
    await retrata(page, 'porte-controles-del-movil');

    expect(cortos, `controles del móvil por debajo de 24 px: ${cortos.join(' · ')}`).toEqual([]);
  });

  /**
   * Y LO MISMO en el panel, donde el rótulo de los filtros usa OTRO componente.
   *
   * <p>Merece prueba propia porque son dos barras distintas —`nx-barra-de-filtros` en el escaparate y
   * `nx-barra-filtros` en el panel— que se pliegan igual pero no comparten código: la del escaparate
   * lleva `min-h-11` para el dedo y la del panel no, así que un arreglo en una no llega a la otra.
   *
   * <p>MEDIDO EL 7-SEP-2026: el rótulo del panel da 91,2×16,5 px en el porte y 86,5×16,5 px en el
   * FRONT ANTERIOR. Misma altura, o sea, otro hueco HEREDADO y no una regresión del porte. Duele más
   * que el del cajón porque a 412 px ese rótulo es la ÚNICA puerta a los filtros del panel: sin él no
   * se puede buscar ni filtrar en el catálogo de administración.
   */
  test('los controles propios del móvil en el panel miden para un dedo', async ({ page }) => {
    await preparaElMovil(page, ANGULAR);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/admin/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    await mideParaUnDedo(
      page.getByRole('button', { name: 'Abrir menú' }).first(),
      'el botón de las tres barras del panel',
    );
    await mideParaUnDedo(
      page.locator('nx-barra-filtros button[aria-expanded]').first(),
      'el rótulo que despliega los filtros del panel',
    );
    await retrata(page, 'porte-controles-del-panel');
  });

  /**
   * EL ASPA DEL MENÚ DEL PANEL: ¿la tapa el porte más que el original?
   *
   * <p>Existe porque escribiendo esta batería el aspa resultó INTOCABLE —la cabecera del contenido se
   * le pone encima: las dos capas declaran `z-40` y gana la última del árbol—. Parecía un defecto del
   * porte y NO LO ES: el front anterior tiene exactamente el mismo reparto de capas y el mismo aspa
   * tapada. Queda como comprobación comparativa para que no se pierda el hallazgo y para que, si
   * alguien arregla una de las dos aplicaciones, se vea en qué lado está la diferencia.
   */
  test('el aspa del menú del panel no la tapa nada que el original no tape', async ({ page }) => {
    const miraElAspa = async (base: string) => {
      await preparaElMovil(page, base);
      await entra(page, base, ADMIN);
      await abre(page, `${base}/admin`);
      await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
      await page.getByRole('button', { name: 'Abrir menú' }).first().click();
      await page.waitForTimeout(900);
      const aspa = page.locator('aside').getByRole('button', { name: 'Cerrar menú' }).first();
      return (await aspa.count()) ? quienLoTapa(aspa) : 'no hay aspa';
    };

    const enElOriginal = await miraElAspa(REACT);
    await retrata(page, 'original-admin-aspa');
    const enElPorte = await miraElAspa(ANGULAR);
    await retrata(page, 'porte-admin-aspa');

    expect(
      enElPorte === null || enElOriginal !== null,
      `el porte tapa el aspa del menú con «${enElPorte}» y el original no la tapa`,
    ).toBe(true);
  });
});
