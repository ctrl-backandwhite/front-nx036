import { Page, expect, test } from '@playwright/test';
import {
  ANGULAR,
  abre,
  apartaAlAsistente,
  bajaAlFondo,
  descartaElAvisoDeGalletas,
  vigilaLaConsola,
} from '../util/comparador';
import { CLIENTE, entra, olvida } from '../util/sesion';
import {
  buscaEnElCatalogo,
  contadorDeResultados,
  elDialogo,
  eligeRegion,
  esperaLineasEnLaInsignia,
  esperaOtroTotal,
  lineasEnLaInsignia,
  peticionesDestructivas,
  regionActiva,
  sinErroresDeConsola,
  vigilaLasConsultasDelCatalogo,
  vigilaLasPeticiones,
} from '../util/acciones';

/**
 * Las ACCIONES de una cuenta de cliente, ejecutadas de verdad en el navegador.
 *
 * <p>Por qué existe esta batería: la certificación anterior comprobaba que las pantallas ABREN. Con eso
 * se dio por bueno un porte en el que el diálogo de confirmación no estaba montado en ninguna parte y
 * NINGUNA acción de borrado funcionaba —se pulsaba «Eliminar» y no pasaba nada— con 2.885 pruebas de
 * unidad en verde. Una pantalla que abre no prueba que se pueda hacer nada en ella.
 *
 * <p>Regla de escritura: cada prueba afirma un EFECTO OBSERVABLE —un contador que sube, un texto que
 * cambia, un valor que sobrevive a recargar, una petición que sale—. Nunca «el botón existe».
 *
 * <p>REGLA DURA: no se destruyen datos. La base local es la que usa el titular para trabajar. Lo
 * destructivo se certifica HASTA la confirmación y se CANCELA, comprobando además que al cancelar NO
 * sale ninguna petición de borrado. Lo único que se llega a borrar es lo que la propia prueba ha
 * creado.
 */

/** Un país con OTRA moneda y el MISMO idioma que España: sirve para aislar el cambio de divisa. */
const PAIS_DE_OTRA_MONEDA = 'México';
/** Un país con la MISMA moneda que España y otro idioma: aísla el cambio de idioma. */
const PAIS_DE_OTRO_IDIOMA = 'France';

test.describe('acciones del cliente', () => {
  /**
   * Solo a la anchura de escritorio.
   *
   * <p>HUECO DECLARADO, no un descuido: en el móvil los mismos controles viven en otros sitios —la
   * cesta baja a la barra de pestañas, el selector de región y el cierre de sesión se meten en el
   * cajón, los filtros arrancan plegados— así que certificar las acciones ahí es otra batería con
   * otros gestos, no la misma con otro ancho. Lo que el móvil YA tiene certificado es su maqueta
   * (`paridad/movil.spec.ts`). Lo que queda sin cubrir es EJECUTAR estas acciones a 412 px.
   */
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'escritorio', 'las acciones se certifican a la anchura de escritorio');
  });

  /**
   * Lo que esta prueba ha creado y hay que deshacer pase lo que pase.
   *
   * <p>Va en un `afterEach` y no al final de cada prueba porque una prueba que FALLA no llega a su
   * última línea: la primera tanda dejó tres productos en la cesta del titular precisamente así. La
   * limpieza tiene que correr también —sobre todo— cuando algo se ha roto.
   */
  let enLaCesta: string | null = null;
  let marcadoFavorito: string | null = null;

  test.afterEach(async ({ page }) => {
    try {
      if (enLaCesta) {
        await vaciaLaCestaPorLaApi(page);
      }
      if (marcadoFavorito) {
        await desmarcaPorLaApi(page, marcadoFavorito);
      }
    } finally {
      enLaCesta = null;
      marcadoFavorito = null;
    }
  });

  /** El testigo de sesión que guarda el navegador, para poder llamar a la API como esa persona. */
  async function testigoDeSesion(page: Page): Promise<string> {
    return ((await page.evaluate(() => localStorage.getItem('nx-access-token'))) ?? '').replace(
      /^"|"$/g,
      '',
    );
  }

  /**
   * Vacía la cesta llamando a la API.
   *
   * <p>Antes se hacía pulsando «Eliminar» en la tabla, y esa limpieza no terminaba nunca: al borrar
   * una fila la tabla encoge, el botón de la siguiente se mueve, y Playwright reintenta el clic
   * durante sesenta segundos sobre un elemento que nunca está quieto. La prueba moría en su propio
   * `afterEach` y —lo peor— dejaba la cesta con lo que había metido.
   *
   * <p>El precio de no arreglarlo era acumulativo: cada pasada añadía una línea más, y al cabo de
   * varias el contador de la cesta ya venía en 10, con lo que pruebas que sí funcionaban empezaban a
   * fallar por un estado que ninguna de ellas había creado.
   *
   * <p>Se vacía ENTERA y no solo la línea creada: si una pasada anterior dejó restos, esta prueba se
   * los encuentra igual. La cuenta es de pruebas y su cesta no es de nadie.
   */
  async function vaciaLaCestaPorLaApi(page: Page): Promise<void> {
    const testigo = await testigoDeSesion(page);
    if (!testigo) {
      return;
    }
    await page.request
      .delete(`${ANGULAR}/api/me/cart`, { headers: { Authorization: `Bearer ${testigo}` } })
      .catch(() => null);
  }

  /**
   * Quita un favorito llamando a la API.
   *
   * <p>Se hace así —y no pulsando el corazón— porque desde «Mis favoritos» NO SE PUEDE desmarcar: es
   * uno de los defectos que esta batería encuentra. Si la limpieza usara la pantalla, cada pasada
   * dejaría favoritos nuevos en la cuenta del titular por culpa del mismo defecto que denuncia.
   */
  async function desmarcaPorLaApi(page: Page, enlace: string): Promise<void> {
    const testigo = await testigoDeSesion(page);
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

  /** Deja la pestaña en el catálogo, con sesión de cliente y sin el aviso de galletas tapando nada. */
  async function enElCatalogo(page: Page): Promise<void> {
    vigilaLasConsultasDelCatalogo(page);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/catalog`);
    await apartaAlAsistente(page);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await expect(page.locator('nx-tarjeta-producto').first()).toBeVisible();
  }

  /**
   * Añade a la cesta el primer producto que lo acepte y devuelve su título.
   *
   * <p>Se prueban varias tarjetas porque «no queda ninguna variante» es una respuesta legítima del
   * caso de uso: quedarse con la primera convertiría un producto agotado de la base local en un fallo
   * del porte.
   */
  async function anadeUnProducto(page: Page): Promise<string> {
    const tarjetas = page.locator('nx-tarjeta-producto');
    const cuantas = Math.min(await tarjetas.count(), 6);
    for (let i = 0; i < cuantas; i++) {
      const tarjeta = tarjetas.nth(i);
      const titulo = (await tarjeta.locator('p').first().innerText()).trim();
      await tarjeta.getByRole('button', { name: /Añadir al carrito/i }).click();
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

  /** Quita de la cesta la línea de un producto. Es la limpieza: cada prueba deja la cesta como estaba. */
  async function quitaDeLaCesta(page: Page, titulo: string): Promise<void> {
    await abre(page, `${ANGULAR}/cart`);
    await apartaAlAsistente(page);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    if (await fila.count()) {
      await fila.getByRole('button', { name: /^Eliminar$/i }).click();
      await expect(fila).toHaveCount(0);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Catálogo: buscar, filtrar y limpiar
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * BUSCAR. El efecto que lo prueba es que el TOTAL de resultados cambia: si la consulta no llegara al
   * backend, o llegara y no se pintara, el contador se quedaría en los 7.729 del catálogo entero.
   */
  test('buscar en el catálogo cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const antes = await contadorDeResultados(page);
    expect(antes.total, 'el catálogo llega vacío: no hay nada que buscar').toBeGreaterThan(0);

    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'la búsqueda no deja ningún resultado').toBeGreaterThan(0);
    expect(despues, 'la búsqueda devuelve MÁS que el catálogo entero').toBeLessThan(antes.total);
    // El criterio vive en la dirección: es lo que hace que una búsqueda se pueda compartir por enlace.
    expect(new URL(page.url()).searchParams.get('q')).toBe('vestido');
    sinErroresDeConsola(errores, 'buscar en el catálogo');
  });

  /**
   * FILTRAR. Se usa el precio máximo porque es un filtro numérico del backend: si se aplicara solo en
   * la pantalla, el total seguiría siendo el del catálogo entero aunque se vieran menos tarjetas.
   */
  test('aplicar un filtro de precio cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const antes = await contadorDeResultados(page);
    await page.locator('#filtro-precio-max').fill('5');
    await page.locator('#filtro-precio-max').blur();
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'con el filtro puesto salen MÁS productos que sin él').toBeLessThan(antes.total);
    expect(new URL(page.url()).searchParams.get('maxPrice')).toBe('5');
    sinErroresDeConsola(errores, 'aplicar un filtro');
  });

  /**
   * LIMPIAR. Se pone un filtro, se pulsa «Limpiar» y lo que se exige es volver al número de partida:
   * un «Limpiar» que borra la insignia pero no vuelve a pedir dejaría la lista filtrada para siempre.
   */
  test('«Limpiar» quita el filtro y devuelve el catálogo entero', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const antes = await contadorDeResultados(page);
    await page.locator('#filtro-precio-max').fill('5');
    await page.locator('#filtro-precio-max').blur();
    const filtrado = await esperaOtroTotal(page, antes.total);
    expect(filtrado).toBeLessThan(antes.total);

    await page.getByRole('button', { name: /^Limpiar$/ }).click();
    const limpio = await esperaOtroTotal(page, filtrado);

    expect(limpio, 'limpiar no devuelve el catálogo entero').toBe(antes.total);
    expect(new URL(page.url()).searchParams.get('maxPrice'), 'el filtro sigue en la dirección').toBeNull();
    sinErroresDeConsola(errores, 'limpiar los filtros');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Favoritos
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * FAVORITOS. La prueba de que funciona no es que el corazón se pinte: es que el producto SIGUE en la
   * lista después de recargar, porque eso solo puede venir del backend. Se marca y se desmarca, así
   * que la cuenta queda como estaba.
   */
  test('marcar un favorito lo guarda, y desmarcarlo lo quita, tras recargar', async ({ page }) => {
    /*
     * Plazo propio, y no por capricho: esta prueba hace CUATRO cargas de página —el catálogo, la
     * lista de favoritos y dos recargas—, y cada una espera a que la pantalla se asiente. Con la
     * portada y el catálogo en el tamaño que tienen hoy, cuatro cargas no caben en el minuto por
     * defecto y el resultado era un plazo agotado que parecía un defecto de favoritos.
     *
     * Las dos recargas son el sentido de la prueba —lo que se certifica es que el favorito SOBREVIVE,
     * o sea que se guardó en el servidor y no solo en la pantalla—, así que no se pueden quitar.
     * Cuando el peso de la portada baje, esto se puede volver a bajar.
     */
    test.setTimeout(150_000);
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    // Se busca una tarjeta que NO esté ya en favoritos: la cuenta de certificación puede tener los suyos.
    const candidata = page
      .locator('nx-tarjeta-producto')
      .filter({ has: page.getByRole('button', { name: 'Añadir a favoritos' }) })
      .first();
    await expect(candidata, 'todas las tarjetas están ya en favoritos').toBeVisible();
    const enlace = await candidata.locator('a').first().getAttribute('href');
    expect(enlace).toBeTruthy();
    marcadoFavorito = enlace;

    /* A partir de aquí la tarjeta se localiza por su ENLACE, que no cambia.
     *
     * Localizarla por el nombre de su botón parecía natural y era una trampa: al marcar el favorito el
     * botón pasa a llamarse «Quitar de favoritos», la tarjeta deja de encajar en el filtro y «.first()»
     * se va a la siguiente tarjeta sin marcar. La prueba acusaba al porte de no encender el corazón
     * mientras miraba otro producto. */
    const tarjeta = page.locator('nx-tarjeta-producto').filter({ has: page.locator(`a[href="${enlace}"]`) });
    await tarjeta.getByRole('button', { name: 'Añadir a favoritos' }).click();
    await expect(
      tarjeta.getByRole('button', { name: 'Quitar de favoritos' }),
      'el corazón no se enciende al marcar',
    ).toBeVisible();

    // El efecto de verdad: está en la lista de favoritos DE LA CUENTA, y sigue estando tras recargar.
    await abre(page, `${ANGULAR}/favorites`);
    await apartaAlAsistente(page);
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'el favorito marcado no aparece en la lista',
    ).toHaveCount(1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'el favorito no sobrevive a recargar: no se ha guardado en el servidor',
    ).toHaveCount(1);

    // Y se desmarca, que además devuelve la cuenta a su estado original.
    const enFavoritos = page.locator('nx-tarjeta-producto').filter({ has: page.locator(`a[href="${enlace}"]`) });
    await enFavoritos.getByRole('button', { name: 'Quitar de favoritos' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.locator(`nx-tarjeta-producto a[href="${enlace}"]`),
      'desmarcar el favorito no lo quita de la lista',
    ).toHaveCount(0);
    sinErroresDeConsola(errores, 'marcar y desmarcar un favorito');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Cesta
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /** AÑADIR A LA CESTA. Primero lo que importa: que el producto acabe DENTRO de la cesta. */
  test('añadir un producto desde la tarjeta lo mete en la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    await apartaAlAsistente(page);
    await expect(
      page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }),
      'el producto añadido no está en la cesta',
    ).toHaveCount(1);
    sinErroresDeConsola(errores, 'añadir a la cesta');
  });

  /**
   * Y aparte, el CONTADOR de la cabecera, que es otra cosa y se rompe por su cuenta.
   *
   * <p>Va en su propia prueba a propósito: si el contador y el contenido de la cesta comparten
   * comprobación, el fallo de uno esconde el acierto del otro y el informe no sabe decir cuál de las
   * dos mitades funciona.
   */
  test('añadir un producto a la cesta sube el contador del carrito', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const antes = await lineasEnLaInsignia(page);
    await anadeUnProducto(page);
    await esperaLineasEnLaInsignia(page, antes + 1);
    sinErroresDeConsola(errores, 'añadir a la cesta');
  });

  /** CAMBIAR LA CANTIDAD. El efecto es el número de la línea y, con él, el importe de esa línea. */
  test('cambiar la cantidad de una línea cambia la cantidad y el importe', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    await apartaAlAsistente(page);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    const cantidad = fila.locator('.join span').first();
    const importe = fila.locator('td').nth(3);

    const cantidadAntes = Number((await cantidad.innerText()).trim());
    const importeAntes = (await importe.innerText()).trim();

    await fila.getByRole('button', { name: 'Añadir una unidad' }).click();
    await expect(cantidad, 'la cantidad no sube al pulsar «+»').toHaveText(String(cantidadAntes + 1));
    await expect(importe, 'el importe de la línea no se recalcula').not.toHaveText(importeAntes);

    // Se deshace: bajar una unidad tiene que devolver la línea a lo que era.
    await fila.getByRole('button', { name: 'Quitar una unidad' }).click();
    await expect(cantidad, 'la cantidad no baja al pulsar «−»').toHaveText(String(cantidadAntes));

    await quitaDeLaCesta(page, titulo);
    sinErroresDeConsola(errores, 'cambiar la cantidad');
  });

  /**
   * QUITAR DE LA CESTA. Aquí sí se borra de verdad: es una línea que ha creado esta misma prueba.
   *
   * <p>No se apoya en la insignia de la cabecera —que tiene su propia prueba y su propio defecto—
   * sino en la tabla: si el borrado se midiera con el contador, un contador roto haría fallar a la
   * prueba del borrado y el informe acusaría a la acción equivocada.
   */
  test('quitar una línea la saca de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    await apartaAlAsistente(page);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    const cuantasAntes = await page.locator('nx-tabla-del-carrito tbody tr').count();
    await expect(fila).toHaveCount(1);
    await fila.getByRole('button', { name: /^Eliminar$/i }).click();

    await expect(fila, 'la línea sigue en la cesta después de eliminarla').toHaveCount(0);
    await expect(
      page.locator('nx-tabla-del-carrito tbody tr'),
      'la cesta no pierde exactamente una línea',
    ).toHaveCount(cuantasAntes - 1);
    enLaCesta = null;
    sinErroresDeConsola(errores, 'quitar una línea de la cesta');
  });

  /** GUARDAR PARA MÁS TARDE. El efecto es que la línea CAMBIA de lista, no que desaparezca. */
  test('guardar para más tarde mueve la línea a la lista guardada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await abre(page, `${ANGULAR}/cart`);
    await apartaAlAsistente(page);
    const fila = page.locator('nx-tabla-del-carrito tbody tr').filter({ hasText: titulo }).first();
    await fila.getByRole('button', { name: /Guardar para más tarde/i }).click();

    await expect(fila, 'la línea sigue en la cesta después de apartarla').toHaveCount(0);
    // La lista guardada está DIFERIDA «on viewport»: hasta que no se baja, ese marcado no existe.
    await bajaAlFondo(page);
    const guardada = page.locator('nx-lista-guardada tbody tr').filter({ hasText: titulo });
    await expect(guardada, 'la línea apartada no aparece en «Guardado para más tarde»').toHaveCount(1);

    // Limpieza: lo guardado se elimina, que es lo que esta prueba ha creado.
    await guardada.getByRole('button', { name: /^Eliminar$/i }).click();
    await expect(guardada, 'lo guardado no se puede eliminar').toHaveCount(0);
    sinErroresDeConsola(errores, 'guardar para más tarde');
  });

  /**
   * ABRIR LA CESTA desde el icono de la barra superior.
   *
   * <p>Lo que se exige es el EFECTO: que se vea lo que hay en la cesta. El porte lo resuelve navegando
   * a `/cart`; el front anterior abre un cajón lateral. Esa diferencia se anota como defecto aparte,
   * pero la acción en sí tiene que funcionar y aquí es donde se comprueba.
   */
  test('el icono de la cesta enseña el contenido de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await page.locator('#nx-cart-icon button').click();

    /* Se exige que la línea aparezca DENTRO de la cesta —su tabla o su cajón—, no en cualquier sitio.
     * Buscar el título suelto por la página no probaba nada: ese mismo título está en la tarjeta del
     * catálogo desde la que se acaba de añadir, así que la comprobación pasaba sin que el icono hiciera
     * absolutamente nada. */
    await expect(
      page.locator('nx-tabla-del-carrito, nx-cajon-del-carrito').filter({ hasText: titulo }),
      'pulsar el icono de la cesta no enseña lo que hay dentro',
    ).toHaveCount(1, { timeout: 20_000 });

    await quitaDeLaCesta(page, titulo);
    sinErroresDeConsola(errores, 'abrir la cesta');
  });

  /**
   * El icono de la cesta abre un CAJÓN encima, sin sacar del catálogo.
   *
   * <p>Es la diferencia entre mirar lo que llevas y perder dónde estabas: si el icono navegara a
   * `/cart`, volver al sitio exacto del listado —con su filtro y su desplazamiento— dejaría de ser
   * gratis.
   *
   * <p>Se afirma sobre el PANEL y no sobre `nx-cajon-del-carrito`: el elemento anfitrión de un
   * componente cuyo contenido es `position: fixed` mide 0×0, así que se da por invisible aunque el
   * cajón ocupe la pantalla entera. Afirmar sobre el anfitrión daba rojo con el cajón funcionando.
   */
  test('el icono de la cesta abre el cajón sin sacar de la página', async ({ page }) => {
    await enElCatalogo(page);
    const titulo = await anadeUnProducto(page);

    await page.locator('#nx-cart-icon button').click();

    const panel = page.locator('nx-cajon-del-carrito .fixed').first();
    await expect(panel, 'el icono de la cesta no abre el cajón').toBeVisible({ timeout: 15_000 });
    await expect(panel, 'el cajón no enseña lo que se acaba de añadir').toContainText(titulo);
    // Y sin haberse movido de sitio: el catálogo sigue debajo.
    expect(new URL(page.url()).pathname, 'el icono saca del catálogo en vez de abrir el cajón').toBe(
      '/catalog',
    );

    await quitaDeLaCesta(page, titulo);
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Divisa e idioma
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * CAMBIAR DE DIVISA. Se elige un país con OTRA moneda y el MISMO idioma, para que lo único que pueda
   * cambiar sea el dinero. El efecto es que los importes de la pantalla se escriben en la nueva moneda:
   * si solo cambiara la etiqueta del selector, los precios seguirían en la anterior.
   *
   * <p>Es exactamente lo que hace el front anterior: su selector llama a `setCurrency` y a continuación
   * a `window.location.reload()`, con el comentario «Currency change forces a soft reload so
   * server-rendered prices refresh via the X-Currency header». Los importes los formatea el servidor,
   * así que sin volver a pedirlos NO cambian.
   */
  test('cambiar de país cambia la moneda de los precios', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);

    const precio = page.locator('nx-etiqueta-precio').first();
    const antes = (await precio.innerText()).trim();
    const regionAntes = await regionActiva(page);

    await eligeRegion(page, PAIS_DE_OTRA_MONEDA);

    await expect
      .poll(() => regionActiva(page), { message: 'el selector no recoge el país elegido' })
      .not.toBe(regionAntes);
    expect(await regionActiva(page), 'el selector no pasa a la moneda del país elegido').toContain('MXN');
    await expect
      .poll(async () => (await precio.innerText()).trim(), {
        timeout: 20_000,
        message: `los precios siguen escritos como «${antes}»`,
      })
      .not.toBe(antes);
    sinErroresDeConsola(errores, 'cambiar de divisa');
  });

  /**
   * CAMBIAR DE IDIOMA. Se elige un país con la MISMA moneda que el español y otro idioma. El efecto es
   * que los textos de la interfaz se reescriben: «Filtros» pasa a «Filtres».
   */
  test('cambiar de país cambia el idioma de los textos', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElCatalogo(page);
    await expect(page.getByText('Filtros', { exact: true }).first()).toBeVisible();

    await eligeRegion(page, PAIS_DE_OTRO_IDIOMA);

    await expect(
      page.getByText('Filtres', { exact: true }).first(),
      'los textos no se reescriben en el idioma elegido',
    ).toBeVisible({ timeout: 20_000 });
    expect(await regionActiva(page), 'el selector no pasa al idioma elegido').toContain('FR');
    sinErroresDeConsola(errores, 'cambiar de idioma');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Boletín
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * SUSCRIBIRSE AL BOLETÍN. El alta se INTERCEPTA a propósito: lo que hay que certificar es que el
   * formulario recoge el correo y lo manda —«que salga la petición»—, y dejarla llegar apuntaría una
   * dirección de prueba en la base del titular, que después no se puede quitar desde la aplicación.
   * Así se comprueba lo mismo sin dejar rastro: sale la petición, con el correo dentro, y la pantalla
   * cambia al mensaje de hecho.
   */
  test('suscribirse al boletín manda el correo y lo confirma', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    const correo = `cert-boletin-${Date.now()}@local.test`;
    const enviados: string[] = [];

    await page.route('**/api/newsletter/subscribe', async (ruta) => {
      enviados.push(ruta.request().postData() ?? '');
      await ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subscribed: true, alreadySubscribed: false }),
      });
    });

    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await apartaAlAsistente(page);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await bajaAlFondo(page);

    const alta = page.locator('nx-alta-boletin').last();
    await alta.locator('input[type="email"]').fill(correo);
    await alta.getByRole('button', { name: /Suscribirse/i }).click();

    await expect
      .poll(() => enviados.length, { message: 'el alta en el boletín no manda ninguna petición' })
      .toBeGreaterThan(0);
    expect(enviados[0], 'la petición del boletín no lleva el correo tecleado').toContain(correo);
    await expect(
      alta.getByText(/Gracias|apuntad|suscri/i).first(),
      'la pantalla no confirma el alta',
    ).toBeVisible();
    sinErroresDeConsola(errores, 'suscribirse al boletín');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Cuenta
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * GUARDAR UN CAMBIO DEL PERFIL. Se toca la empresa, que no afecta a precios ni a envíos, y se
   * DEVUELVE a lo que estaba al terminar. Lo que prueba que se ha guardado no es el aviso verde: es
   * que el valor sigue ahí después de recargar, o sea, que ha ido y vuelto del servidor.
   */
  test('guardar un cambio del perfil lo deja guardado tras recargar', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/profile`);
    await apartaAlAsistente(page);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const empresa = page.locator('#perfil-empresa');
    await expect(empresa).toBeVisible();
    const original = await empresa.inputValue();
    const nuevo = `Cert E2E ${Date.now()}`;

    await empresa.fill(nuevo);
    await page.getByRole('button', { name: /Guardar cambios/i }).click();
    await expect(page.getByText('Perfil actualizado'), 'el perfil no confirma el guardado').toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#perfil-empresa'), 'el cambio del perfil no sobrevive a recargar').toHaveValue(
      nuevo,
    );

    // Se devuelve a como estaba: esta batería no deja rastro en los datos del titular.
    await page.locator('#perfil-empresa').fill(original);
    await page.getByRole('button', { name: /Guardar cambios/i }).click();
    await expect(page.getByText('Perfil actualizado')).toBeVisible();
    sinErroresDeConsola(errores, 'guardar el perfil');
  });

  /**
   * AÑADIR Y BORRAR UNA DIRECCIÓN, con su confirmación.
   *
   * <p>Aquí SÍ se llega a confirmar un borrado, y es la única acción destructiva que se completa en toda
   * la certificación: la dirección la ha creado esta misma prueba tres líneas antes. Al terminar, la
   * cuenta tiene exactamente las direcciones que tenía.
   */
  test('añadir una dirección y borrarla desde su confirmación', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/addresses`);
    await apartaAlAsistente(page);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    const tarjetas = page.locator('nx-tarjeta-de-direccion');
    const antes = await tarjetas.count();
    const etiqueta = `Cert E2E ${Date.now()}`;

    await page.getByRole('button', { name: /Agregar dirección|Añadir la primera/i }).first().click();
    await page.getByLabel('Etiqueta (Casa, Oficina…)').fill(etiqueta);
    await page.getByLabel('Nombre completo').fill('Certificación E2E');
    // El desplegable del país lleva su propio nombre accesible: el PRIMER «select» del formulario es
    // el prefijo del teléfono, y elegir ahí no rellenaría la dirección.
    await page.getByLabel('País (ISO)').selectOption('ES');
    await page.getByLabel('Dirección', { exact: true }).fill('Calle de la Certificación 1');
    await page.getByLabel('Ciudad').fill('Madrid');
    await page.getByLabel('Código postal').fill('28001');
    await page.getByRole('button', { name: /Guardar dirección/i }).click();

    await expect(tarjetas, 'la dirección nueva no aparece en la lista').toHaveCount(antes + 1);
    const mia = tarjetas.filter({ hasText: etiqueta });
    await expect(mia, 'la dirección guardada no lleva la etiqueta tecleada').toHaveCount(1);

    // Y ahora el borrado, con su diálogo: primero se comprueba que el diálogo DICE lo que debe.
    await mia.getByRole('button', { name: /^Eliminar$/ }).click();
    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar una dirección no pide confirmación').toBeVisible();
    await expect(dialogo).toContainText('¿Eliminar esta dirección?');
    await dialogo.getByRole('button', { name: /^Confirmar$/ }).click();

    await expect(mia, 'confirmar el borrado no quita la dirección').toHaveCount(0);
    await expect(tarjetas, 'la cuenta no vuelve a tener las direcciones que tenía').toHaveCount(antes);
    sinErroresDeConsola(errores, 'añadir y borrar una dirección');
  });

  /**
   * CANCELAR el borrado de una dirección que ya existía.
   *
   * <p>Es la mitad que nadie prueba y la que de verdad protege los datos: que al pulsar «Cancelar» no
   * salga NINGUNA petición de borrado. Se vigilan las peticiones y se afirma que no hubo DELETE.
   */
  test('cancelar el borrado de una dirección no manda nada al servidor', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/addresses`);
    await apartaAlAsistente(page);
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
    sinErroresDeConsola(errores, 'cancelar un borrado');
  });

  /**
   * CERRAR SESIÓN. El efecto no es que cambie el menú: es que ya no hay sesión. Se comprueba pidiendo
   * una zona privada, que tiene que rebotar al acceso.
   */
  test('cerrar sesión deja de haber sesión', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await apartaAlAsistente(page);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    /* Primero se comprueba que la pestaña TIENE sesión: sin esto, una sesión caducada pinta la
     * cabecera con «Iniciar sesión», el menú de la cuenta no existe y la prueba acusa al porte de un
     * fallo que es de la propia batería. */
    const menuDeLaCuenta = page.locator('header .dropdown > button').first();
    await expect(menuDeLaCuenta, 'la pestaña llega SIN sesión: no hay nada que cerrar').toBeVisible({
      timeout: 15_000,
    });
    await menuDeLaCuenta.click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('link', { name: /Iniciar sesión|Acceder/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // La sesión guardada ya no vale para nadie: se olvida para que la siguiente prueba entre de verdad.
    olvida(ANGULAR, CLIENTE.correo);

    await page.goto(`${ANGULAR}/orders`, { waitUntil: 'domcontentloaded' });
    await apartaAlAsistente(page);
    // Se espera al rebote: el guardia decide después de montar, y leer la dirección al instante
    // sorprendía a la aplicación a medio camino.
    await expect
      .poll(() => new URL(page.url()).pathname, {
        timeout: 20_000,
        message: 'con la sesión cerrada se sigue entrando en la zona privada',
      })
      .toContain('/login');
    sinErroresDeConsola(errores, 'cerrar sesión');
  });
});
