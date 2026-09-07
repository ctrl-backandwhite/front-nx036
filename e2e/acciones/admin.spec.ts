import { Page, expect, test } from '@playwright/test';
import { ANGULAR, abre, descartaElAvisoDeGalletas, vigilaLaConsola } from '../util/comparador';
import { ADMIN, entra, olvida } from '../util/sesion';
import { RUTAS_DE_PANEL } from '../util/rutas';
import {
  buscaEnElCatalogo,
  contadorDeResultados,
  elDialogo,
  esperaOtroTotal,
  lineasEnLaInsignia,
  peticionesDestructivas,
  sinErroresDeConsola,
  vigilaLasConsultasDelCatalogo,
  vigilaLasPeticiones,
} from '../util/acciones';

/**
 * Las ACCIONES de una cuenta de administración, ejecutadas de verdad en el navegador.
 *
 * <p>El panel es la mitad de la aplicación y hasta ahora solo se comprobaba que sus cuarenta pantallas
 * ABREN. Abrir no es poder trabajar: el defecto que motivó esta batería —el diálogo de confirmación sin
 * montar, con el que NINGÚN borrado funcionaba— vivía justo en ese hueco.
 *
 * <p>REGLA DURA — NO DESTRUIR DATOS. La base local es la que usa el titular para trabajar y aquí hay
 * 7.729 productos suyos. Todo lo destructivo se certifica HASTA la confirmación y se CANCELA, y lo que
 * prueba que cancelar cancela es que NO sale ninguna petición de borrado. Además, en las pruebas que
 * tocan botones de borrado se BLOQUEA en la red cualquier DELETE, para que ni un fallo del porte pueda
 * llevarse un dato por delante. Lo que sí se cambia y se DEVUELVE a su sitio: un importe del desglose y
 * la marca de «verificado».
 */

/** Las secciones del panel, sin las que llevan parámetro: esas necesitan un dato y se cubren aparte. */
const SECCIONES = RUTAS_DE_PANEL.filter((ruta) => !ruta.includes(':'));

test.describe('acciones de administración', () => {
  /**
   * Solo a la anchura de escritorio.
   *
   * <p>HUECO DECLARADO: el panel es una herramienta de escritorio —su menú lateral se pliega por debajo
   * de 1.024 px y el reordenado de imágenes es un gesto de puntero— así que certificar estas acciones a
   * 412 px sería otra batería con otros gestos. La MAQUETA del panel en móvil ya está certificada en
   * `flujo/panel-admin.spec.ts` y `paridad/movil.spec.ts`.
   */
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'escritorio', 'las acciones del panel se certifican en escritorio');
  });

  /**
   * Lo que la prueba haya metido en la cesta, fuera — también si la prueba se ha roto por el camino.
   * Una prueba que falla no llega a su última línea, y la cesta del titular no es sitio para restos.
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

  /**
   * Quita un favorito llamando a la API.
   *
   * <p>Se hace así —y no pulsando el corazón— porque desde «Mis favoritos» NO SE PUEDE desmarcar: es
   * uno de los defectos que esta batería encuentra. Si la limpieza usara la pantalla, cada pasada
   * dejaría favoritos nuevos en la cuenta del titular precisamente por culpa del defecto que está
   * denunciando.
   */
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

  /** Deja la pestaña dentro del panel, con sesión de administración. */
  async function enElPanel(page: Page, ruta = '/admin'): Promise<void> {
    vigilaLasConsultasDelCatalogo(page);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}${ruta}`);
    await descartaElAvisoDeGalletas(page);
  }

  /** El identificador del primer producto del listado del panel. Se resuelve contra la base, no se fija. */
  async function primeraFicha(page: Page): Promise<string> {
    await enElPanel(page, '/admin/catalog');
    const enlace = await page.locator('table tbody tr a[href^="/admin/catalog/"]').first().getAttribute('href');
    expect(enlace, 'el listado del panel no trae ningún producto').toBeTruthy();
    return enlace as string;
  }

  /** El texto que se ve dentro de `<main>`, que es lo contenido y no el marco. */
  async function contenidoPrincipal(page: Page): Promise<string> {
    return page.evaluate(() => {
      const zona = document.querySelector('main') ?? document.body;
      return (zona instanceof HTMLElement ? zona.innerText : '').replace(/\s+/g, ' ').trim();
    });
  }

  /**
   * Corta de raíz cualquier borrado en la red.
   *
   * <p>Es la red de seguridad de la regla dura: las pruebas que pulsan un botón de borrar lo hacen para
   * ver el diálogo, y si el porte tuviera el defecto de borrar sin preguntar, la petición no llegaría a
   * salir de esta máquina.
   */
  async function prohibeBorrar(page: Page): Promise<void> {
    await page.route('**/api/**', async (ruta) => {
      const peticion = ruta.request();
      const destructiva =
        peticion.method() === 'DELETE' ||
        (peticion.method() === 'POST' && /bulk-delete/.test(peticion.url()));
      if (destructiva) {
        await ruta.abort();
        return;
      }
      await ruta.continue();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Entrar y moverse por el panel
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /** ENTRAR EN EL PANEL. El efecto es que el panel de control trae datos, no solo el marco y el menú. */
  test('entrar en el panel enseña el panel de control con contenido', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page);

    expect(new URL(page.url()).pathname, 'el panel rebota al acceso con una cuenta de administración').toBe(
      '/admin',
    );
    const contenido = await contenidoPrincipal(page);
    expect(contenido, 'el panel responde «no encontrada»').not.toMatch(
      /\b404\b|no encontrada|not found/i,
    );
    expect(contenido.length, 'el panel de control llega en blanco').toBeGreaterThan(200);
    sinErroresDeConsola(errores, 'entrar en el panel');
  });

  /** BUSCAR EN EL CATÁLOGO DEL PANEL. El efecto es el mismo que en el escaparate: cambia el total. */
  test('buscar en el catálogo del panel cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');

    const antes = await contadorDeResultados(page);
    expect(antes.total, 'el catálogo del panel llega vacío').toBeGreaterThan(0);

    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'la búsqueda del panel no deja ningún resultado').toBeGreaterThan(0);
    expect(despues, 'la búsqueda del panel devuelve más que el catálogo entero').toBeLessThan(antes.total);
    sinErroresDeConsola(errores, 'buscar en el catálogo del panel');
  });

  /** FILTRAR EN EL PANEL. Un filtro numérico que resuelve el backend: el total tiene que moverse. */
  test('filtrar por precio en el panel cambia el número de resultados', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');

    const antes = await contadorDeResultados(page);
    const filtro = page.getByLabel(/Precio ≥/).first();
    await filtro.fill('900');
    await filtro.blur();
    const despues = await esperaOtroTotal(page, antes.total);

    expect(despues, 'filtrar por precio mínimo no reduce el listado').toBeLessThan(antes.total);
    sinErroresDeConsola(errores, 'filtrar en el panel');
  });

  /** ABRIR UNA FICHA DESDE EL PANEL. El efecto es llegar a la ficha con su contenido, no al listado. */
  test('abrir una ficha desde el listado del panel lleva a la ficha', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page, '/admin/catalog');

    const primeraFila = page.locator('table tbody tr').first();
    const titulo = (await primeraFila.locator('a[href^="/admin/catalog/"]').last().innerText()).trim();
    await primeraFila.locator('a[href^="/admin/catalog/"]').last().click();

    await page.waitForURL(/\/admin\/catalog\/[^/]+$/, { timeout: 20_000 });
    await expect(
      page.locator('nx-resumen-de-ficha'),
      'la ficha abierta desde el panel no trae su desglose',
    ).toBeVisible();
    if (titulo) {
      await expect(page.locator('main')).toContainText(titulo.slice(0, 30));
    }
    sinErroresDeConsola(errores, 'abrir una ficha desde el panel');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Edición con doble clic del desglose
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Edita con doble clic un importe del desglose y lo DEVUELVE a su valor original.
   *
   * <p>Se comprueban dos cosas distintas que se suelen confundir: que lo tecleado SE VE en el campo
   * —un campo atado a medias enseña el valor viejo mientras se escribe— y que se GUARDA, que aquí se
   * observa porque la ficha se vuelve a pedir al servidor tras guardar y llega con el importe nuevo.
   *
   * <p>El importe se restaura al terminar: el recargo es una de las tres palancas del precio de venta
   * y dejarlo movido cambiaría lo que pagan los clientes.
   */
  async function certificaImporte(page: Page, etiqueta: string, campo: string): Promise<void> {
    const errores = vigilaLaConsola(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    const fila = page.locator('nx-fila-de-yuanes').filter({ hasText: etiqueta }).first();
    await expect(fila, `la ficha no enseña la fila «${etiqueta}»`).toBeVisible();
    const antes = (await fila.innerText()).trim();

    // El doble clic va sobre la fila pintada, no sobre el anfitrión del componente.
    await fila.locator('div').first().dblclick();
    const entrada = fila.locator(`input[aria-label="${campo}"]`);
    await expect(entrada, 'el doble clic no abre el campo de edición').toBeVisible();
    const original = await entrada.inputValue();
    const nuevo = String(Number(original || 0) + 7);

    await entrada.fill(nuevo);
    // Lo tecleado tiene que VERSE: es la mitad del encargo y la que un campo mal atado suspende.
    await expect(entrada, 'el campo no enseña el valor tecleado').toHaveValue(nuevo);
    await entrada.press('Enter');

    await expect
      .poll(async () => (await fila.innerText()).trim(), {
        timeout: 20_000,
        message: `«${etiqueta}» sigue enseñando «${antes}»: el importe no se ha guardado`,
      })
      .not.toBe(antes);

    // Y se devuelve a su sitio.
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
    sinErroresDeConsola(errores, `editar «${etiqueta}» con doble clic`);
  }

  test('editar el Recargo con doble clic enseña lo tecleado y lo guarda', async ({ page }) => {
    await certificaImporte(page, 'Recargo', 'Recargo (CNY)');
  });

  test('editar el Subsidio de envío con doble clic enseña lo tecleado y lo guarda', async ({ page }) => {
    await certificaImporte(page, 'Subsidio de envío', 'Subsidio de envío (CNY)');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Marca de «verificado»
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * MARCAR Y DESMARCAR «VERIFICADO». Se hacen las dos, así que el producto queda como estaba. El efecto
   * es el rótulo de al lado —«Sí»/«No»—, que se pinta con lo que devuelve el servidor.
   */
  test('marcar y desmarcar «verificado» cambia el estado del producto', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    const enlace = await page.locator('nx-tarjeta-producto a').first().getAttribute('href');
    const slug = (enlace ?? '').split('/').pop();
    expect(slug, 'el catálogo no trae ningún producto que verificar').toBeTruthy();

    await abre(page, `${ANGULAR}/admin/browse/${slug}`);
    const panel = page.locator('nx-panel-de-origen');
    await expect(panel, 'la ficha vista por el panel no trae el bloque de origen').toBeVisible();
    const casilla = panel.locator('input[type="checkbox"]');
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
    sinErroresDeConsola(errores, 'marcar y desmarcar verificado');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Borrados: se abren, se leen y se CANCELAN
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * BORRAR EL PRODUCTO — cancelando. Se comprueba que el diálogo aparece, que DICE lo que debe, y que
   * al cancelar no sale ninguna petición de borrado. Nunca se confirma.
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
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    await expect(dialogo, 'el diálogo no se cierra al cancelar').toBeHidden();
    await expect(page.locator('nx-resumen-de-ficha'), 'cancelar se ha llevado la ficha por delante').toBeVisible();
    expect(
      peticionesDestructivas(peticiones),
      'cancelar el borrado del producto ha mandado una petición de borrado',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado del producto');
  });

  /**
   * BORRAR UNA VARIANTE — cancelando. Vive en la pestaña «Inventario», que está diferida: se abre la
   * pestaña y se espera a que el gestor se monte.
   */
  test('borrar una variante pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    await page.getByRole('button', { name: 'Inventario', exact: true }).click();
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
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    await expect(dialogo, 'el diálogo no se cierra al cancelar').toBeHidden();
    expect(
      peticionesDestructivas(peticiones),
      'cancelar el borrado de la variante ha mandado una petición de borrado',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de una variante');
  });

  /**
   * BORRAR UNA IMAGEN — cancelando.
   *
   * <p>Lo que se exige es lo mismo que al resto: que pulsar la papelera de una foto abra una
   * confirmación y que cancelarla no mande nada. El front anterior lo hace
   * (`admin.catalog.images.delete_confirm`). Los DELETE están bloqueados en la red antes de pulsar,
   * así que aunque el porte borre sin preguntar, la imagen del titular NO se pierde.
   */
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
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();

    expect(
      peticionesDestructivas(peticiones),
      'se ha intentado borrar la imagen sin haber confirmado nada',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de una imagen');
  });

  /**
   * BORRAR UN TRAMO DE PRECIO — cancelando.
   *
   * <p>Va con los otros borrados porque es el mismo gesto y la misma exigencia: el front anterior pide
   * confirmación (`admin.catalog.detail.tiers.delete_confirm`). El tramo vive en la pestaña «Precios»,
   * que está diferida. Los DELETE están bloqueados en la red antes de pulsar.
   */
  test('borrar un tramo de precio pide confirmación y cancelar no manda nada', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await prohibeBorrar(page);
    const ruta = await primeraFicha(page);
    await abre(page, `${ANGULAR}${ruta}`);

    await page.getByRole('button', { name: 'Precios', exact: true }).click();
    const precios = page.locator('nx-precios-de-ficha');
    await expect(precios, 'la pestaña de precios no monta').toBeVisible({ timeout: 20_000 });
    // Se acota a la TABLA de tramos: los valores de variación de más abajo llevan otra papelera con el
    // mismo nombre accesible, y confundirlas certificaría la confirmación equivocada.
    const papelera = precios.locator('table tbody tr td:last-child button').first();
    const cuantas = await papelera.count();
    test.skip(cuantas === 0, 'este producto no tiene tramos de precio: no hay tramo que borrar');

    const peticiones = vigilaLasPeticiones(page);
    await papelera.click();

    const dialogo = elDialogo(page);
    await expect(dialogo, 'borrar un tramo de precio NO pide confirmación').toBeVisible();
    await dialogo.getByRole('button', { name: /^Cancelar$/ }).click();
    expect(
      peticionesDestructivas(peticiones),
      'se ha intentado borrar el tramo sin haber confirmado nada',
    ).toEqual([]);
    sinErroresDeConsola(errores, 'cancelar el borrado de un tramo de precio');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Reordenar imágenes arrastrando
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * REORDENAR ARRASTRANDO. El orden de la galería es un dato del titular —sale del orden de 1688— así
   * que la petición que lo guardaría se INTERCEPTA: se contesta que sí sin dejarla llegar. Así se
   * certifican las dos mitades del gesto —que la galería se reordena y que el orden nuevo se manda—
   * y al recargar la ficha el orden original sigue intacto, que es la prueba de que no se ha tocado nada.
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

    const ordenAntes = await fotos.locator('img').evaluateAll((imgs) =>
      imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''),
    );

    await fotos.nth(0).dragTo(fotos.nth(1));

    await expect
      .poll(() => cuerpos.length, {
        timeout: 15_000,
        message: 'arrastrar una imagen no manda el orden nuevo al servidor',
      })
      .toBeGreaterThan(0);

    const ordenDespues = await fotos.locator('img').evaluateAll((imgs) =>
      imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''),
    );
    expect(ordenDespues, 'la galería no cambia de orden al soltar la imagen').not.toEqual(ordenAntes);

    // Y la prueba de que no se ha tocado nada: al volver a pedir la ficha, el orden es el de siempre.
    await page.unroute('**/images/order');
    await abre(page, `${ANGULAR}${ruta}`);
    const ordenGuardado = await page
      .locator('nx-galeria-de-ficha [draggable="true"] img')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute('src') ?? ''));
    expect(ordenGuardado, 'la prueba ha cambiado el orden de las imágenes del titular').toEqual(ordenAntes);
    sinErroresDeConsola(errores, 'reordenar imágenes arrastrando');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // El cliente que también es administrador
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /** La cuenta de administración también compra: se comprueba que las acciones de cliente le funcionan. */
  test('el administrador también puede buscar en el catálogo del escaparate', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    vigilaLasConsultasDelCatalogo(page);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);

    const antes = await contadorDeResultados(page);
    await buscaEnElCatalogo(page, 'vestido');
    const despues = await esperaOtroTotal(page, antes.total);
    expect(despues).toBeGreaterThan(0);
    expect(despues).toBeLessThan(antes.total);
    sinErroresDeConsola(errores, 'buscar con la cuenta de administración');
  });

  test('el administrador también puede marcar y desmarcar un favorito', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);

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
    sinErroresDeConsola(errores, 'favoritos con la cuenta de administración');
  });

  test('el administrador también puede añadir y quitar de la cesta', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, ADMIN);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);

    const antes = await lineasEnLaInsignia(page);
    const tarjetas = page.locator('nx-tarjeta-producto');
    let titulo = '';
    for (let i = 0; i < Math.min(await tarjetas.count(), 6) && !titulo; i++) {
      const tarjeta = tarjetas.nth(i);
      const candidato = (await tarjeta.locator('p').first().innerText()).trim();
      await tarjeta.getByRole('button', { name: /Añadir al carrito/i }).click();
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
    expect(await lineasEnLaInsignia(page), 'el contador de la cabecera no vuelve a su sitio').toBe(antes);
    sinErroresDeConsola(errores, 'cesta con la cuenta de administración');
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Recorrido de las secciones, navegando por el MENÚ
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Cada sección del panel, alcanzada PULSANDO su entrada del menú.
   *
   * <p>Es distinto de escribir la dirección: aquí se certifica además que el menú lleva a donde dice y
   * que la navegación dentro de la aplicación monta la pantalla. Lo que se exige a cada una es que
   * traiga contenido DENTRO de `<main>` —no en el marco, que ya trae veintitantas entradas de menú y
   * pasaría cualquier umbral— y que no sea la página de «no encontrada».
   */
  for (const seccion of SECCIONES) {
    test(`la sección ${seccion} se abre desde el menú y trae contenido`, async ({ page }) => {
      const errores = vigilaLaConsola(page);
      await enElPanel(page);

      const entrada = page.locator(`aside a[href="${seccion}"]`).first();
      if (await entrada.count()) {
        await entrada.click();
        await page.waitForURL((url) => url.pathname === seccion, { timeout: 20_000 });
      } else {
        // Sin entrada de menú no hay gesto que certificar; se llega por la dirección y queda dicho.
        await abre(page, `${ANGULAR}${seccion}`);
      }

      await expect
        .poll(async () => (await contenidoPrincipal(page)).length, {
          timeout: 20_000,
          message: `${seccion} llega en blanco`,
        })
        .toBeGreaterThan(120);
      const contenido = await contenidoPrincipal(page);
      /* «404» va con límites de palabra a propósito: sin ellos, la partida arancelaria 640411 de
       * «Grupos de declaración» contiene la secuencia 404 y la sección salía marcada como página de
       * error estando perfectamente pintada. Un detector que marca lo correcto acaba ignorándose. */
      expect(contenido, `${seccion} responde «no encontrada»`).not.toMatch(
        /\b404\b|página no encontrada|page not found/i,
      );
      sinErroresDeConsola(errores, `abrir ${seccion} desde el menú`);
    });
  }

  /** Y el cierre de sesión desde el panel, que tiene su propio botón en el menú lateral. */
  test('cerrar sesión desde el panel deja de haber sesión', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await enElPanel(page);

    await page.locator('aside').getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 20_000 });
    olvida(ANGULAR, ADMIN.correo);

    await abre(page, `${ANGULAR}/admin`);
    expect(new URL(page.url()).pathname, 'con la sesión cerrada se sigue entrando en el panel').toContain(
      '/login',
    );
    sinErroresDeConsola(errores, 'cerrar sesión desde el panel');
  });
});
