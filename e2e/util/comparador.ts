import { Page, expect } from '@playwright/test';

/**
 * Utilidades para certificar POR COMPARACIÓN: la misma dirección se abre en el frontend React y en el
 * Angular, contra el mismo backend, y se contrasta lo que sale.
 *
 * <p>La referencia no es un documento de requisitos —que envejece y se interpreta— sino la aplicación
 * que se está reemplazando y que sigue corriendo al lado. Cualquier diferencia que no esté declarada
 * aquí como esperable es un defecto del porte.
 */

export const REACT = process.env['URL_REACT'] ?? 'http://localhost:3003';
export const ANGULAR = process.env['URL_ANGULAR'] ?? 'http://localhost:3004';

/** Las dos presentaciones que hay que certificar. El proyecto es mobile first: el móvil va primero. */
export const PANTALLAS = [
  { nombre: 'movil', ancho: 375, alto: 812 },
  { nombre: 'escritorio', ancho: 1440, alto: 900 },
] as const;

/**
 * Diferencias que NO son defectos y hay que borrar antes de comparar.
 *
 * <p>Cada entrada tiene que estar justificada: es la lista de cosas ante las que la certificación
 * cierra los ojos, así que una entrada de más deja de mirar algo que sí importaba. Se normaliza lo que
 * cambia entre DOS VISITAS A LA MISMA aplicación, no lo que cambia entre las dos aplicaciones.
 */
const RUIDO: readonly { patron: RegExp; sustituto: string; porque: string }[] = [
  {
    patron: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    sustituto: '«id»',
    porque: 'Identificadores generados: distintos en cada alta, en las dos aplicaciones por igual.',
  },
  {
    patron: /\b\d{1,2}\/\d{1,2}\/\d{2,4}(,?\s+\d{1,2}:\d{2}(:\d{2})?)?/g,
    sustituto: '«fecha»',
    porque: 'Fechas y horas: avanzan entre una visita y la siguiente.',
  },
  {
    patron: /\bhace\s+\d+\s+\w+|\b\d+\s+(minutos?|horas?|días?)\s+(atrás|antes)/gi,
    sustituto: '«hace un rato»',
    porque: 'Antigüedades relativas: cambian con el reloj, no con la aplicación.',
  },
  {
    patron: /\s+/g,
    sustituto: ' ',
    porque: 'El espaciado del marcado no es contenido; comparar por él da falsos positivos.',
  },
];

/**
 * Abre una dirección y espera a que la pantalla se ASIENTE.
 *
 * <p>Sustituye a `networkidle`, que es lo que se usaba y que la propia documentación de Playwright
 * desaconseja. El motivo no es teórico: el front anterior, al rebotar al acceso desde una zona privada,
 * se queda pidiendo `/login.data` **en bucle**, así que la red no queda en reposo NUNCA. La espera
 * agotaba sus 60 segundos y seis pruebas se caían por un bucle de la aplicación de referencia, no por
 * nada del porte. Y al revés: en una pantalla con encuesta periódica, `networkidle` puede no cumplirse
 * jamás aunque todo esté pintado desde el primer segundo.
 *
 * <p>Lo que de verdad se quiere esperar es que **deje de cambiar lo que se ve**. Eso se mide: se lee el
 * tamaño del texto visible cada cuarto de segundo y se da por asentada cuando repite dos veces seguidas.
 * Con un tope, porque una página que nunca se estabiliza tiene que dar un resultado, no colgarse.
 */
export async function abre(page: Page, url: string) {
  const respuesta = await page.goto(url, { waitUntil: 'domcontentloaded' });
  const lee = () => page.evaluate(() => document.body?.innerText.length ?? 0).catch(() => 0);

  /* Una pantalla VACÍA no está asentada, está cargando.
   *
   * La primera versión solo miraba si el número repetía, y una página que todavía no había pintado nada
   * daba tres ceros seguidos y se daba por buena en 750 ms. El resultado fue peor que el problema que
   * venía a resolver: 49 pruebas comparando pantallas en blanco contra pantallas en blanco. Así que
   * primero se espera a que HAYA algo, y solo entonces se mira si ha dejado de cambiar. */
  const limite = Date.now() + 20_000;
  while (Date.now() < limite && (await lee()) === 0) {
    await page.waitForTimeout(200);
  }

  let anterior = -1;
  let iguales = 0;
  while (Date.now() < limite && iguales < 3) {
    await page.waitForTimeout(250);
    const actual = await lee();
    iguales = actual === anterior ? iguales + 1 : 0;
    anterior = actual;
  }
  return respuesta;
}


/** El texto visible de la página, con el ruido normalizado. */
export async function textoVisible(page: Page): Promise<string> {
  const bruto = await page.locator('body').innerText();
  return RUIDO.reduce((texto, r) => texto.replace(r.patron, r.sustituto), bruto).trim();
}

/**
 * Los importes de la página, tal como se ven.
 *
 * <p>Se extraen aparte del texto porque **se comparan al céntimo**: es exigencia del proyecto y es donde
 * se esconden los fallos que importan —una divisa mal formateada, un margen aplicado dos veces, un
 * envío que no suma. Comparar el texto entero los diluiría entre miles de caracteres.
 */
export async function importes(page: Page): Promise<string[]> {
  const texto = await page.locator('body').innerText();
  const patron = /(?:[€$£¥]\s?\d[\d.,]*|\d[\d.,]*\s?(?:[€$£¥]|EUR|USD|GBP|JPY|CNY))/g;
  return (texto.match(patron) ?? []).map((i) => i.replace(/\s+/g, ' ').trim());
}

/**
 * Las claves de traducción sin traducir que se hayan colado en la pantalla.
 *
 * <p>Cuando falta una clave, el servicio devuelve la CLAVE misma: se ve `login.title` escrito donde
 * debería ir un texto. Es deliberado —un hueco en blanco pasa desapercibido en una revisión y esto no—
 * y aquí es donde se caza, en los ocho idiomas: los huecos casi nunca están en español.
 *
 * <p>Solo se marca lo que ADEMÁS existe en el diccionario. La primera versión buscaba cualquier cosa
 * con forma de `algo.algo` y señalaba `shop.sync`, `catalog.read` y `orders.write` en la página de
 * desarrolladores: no eran claves sin traducir, eran los ÁMBITOS de la API, que se documentan a
 * propósito. Un detector que marca lo correcto acaba ignorándose entero, así que la pregunta correcta
 * no es «¿esto parece una clave?» sino «¿esto ES una de nuestras claves, escrita donde debería ir su
 * traducción?».
 */
export async function clavesSinTraducir(page: Page, conocidas: ReadonlySet<string>): Promise<string[]> {
  const texto = await page.locator('body').innerText();
  const candidatas = texto.match(/\b[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*){1,4}\b/g) ?? [];
  return [...new Set(candidatas.filter((c) => conocidas.has(c)))];
}

/** Los errores de JavaScript que la página haya lanzado. Se engancha ANTES de navegar. */
export function vigilaLaConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errores.push(m.text());
    }
  });
  page.on('pageerror', (e) => errores.push(e.message));
  return errores;
}

/**
 * Abre la misma dirección en los dos frontends y devuelve lo observado en cada uno.
 *
 * <p>Se espera a que la pantalla se ASIENTE y no al final de la carga porque lo que se compara es la
 * pantalla ya pintada: el front anterior pide sus datos después de montar, y comparar antes mediría
 * quién es más rápido, no quién enseña lo mismo.
 */
export async function abreEnAmbos(
  page: Page,
  ruta: string,
): Promise<{
  react: { texto: string; importes: string[]; estado: number; errores: string[] };
  angular: { texto: string; importes: string[]; estado: number; errores: string[] };
}> {
  const observa = async (base: string) => {
    const errores = vigilaLaConsola(page);
    const respuesta = await abre(page, `${base}${ruta}`);
    return {
      texto: await textoVisible(page),
      importes: await importes(page),
      estado: respuesta?.status() ?? 0,
      errores,
    };
  };
  return { react: await observa(REACT), angular: await observa(ANGULAR) };
}

/**
 * Comprueba que la página no obliga a desplazarse en horizontal.
 *
 * <p>Es la comprobación que delata un diseño pensado para el escritorio y encogido después: una tabla
 * sin contenedor propio, una imagen con ancho fijo, una rejilla que no baja a una columna. Se tolera un
 * píxel de holgura por los redondeos del navegador.
 */
export async function sinDesplazamientoHorizontal(page: Page): Promise<void> {
  const desborde = await page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth - d.clientWidth;
  });
  expect(desborde, 'la página se desplaza en horizontal').toBeLessThanOrEqual(1);
}

/**
 * Baja hasta el fondo y espera a que se monte lo que estaba diferido.
 *
 * <p>Hace falta porque el porte difiere todo lo que está por debajo del pliegue —el pie, entre otras
 * cosas— con `@defer (on viewport)`, y eso significa que hasta que no se baja, ese marcado NO EXISTE.
 * Comparar sin bajar medía una pantalla con pie contra otra sin él, y el resultado dependía de cuál de
 * las dos hubiera terminado antes: tres enlaces del pie aparecían como «objetivos que el original no
 * tenía» en dos rutas, y al ir a mirarlos a mano no estaban en ninguna de las dos.
 *
 * <p>Se vuelve arriba al terminar para que la siguiente medida no dependa de dónde quedó la anterior.
 */
export async function bajaAlFondo(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1_200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

/**
 * Los objetivos táctiles que se quedan por debajo del mínimo.
 *
 * <p>El mínimo es 24 píxeles, que es lo que exige el nivel AA de las guías de accesibilidad —el que el
 * proyecto se ha fijado—. Los 44 píxeles de la primera versión son la recomendación del nivel AAA, y
 * medir contra ella marcaba como defecto media aplicación, incluida la del front anterior.
 *
 * <p>Se excluyen los ENLACES EN LÍNEA dentro de un bloque de texto, que las propias guías excluyen: un
 * enlace en medio de un párrafo no es un botón, y exigirle 24 píxeles de alto obligaría a romper la
 * línea. Se reconocen porque su padre tiene más texto que el propio enlace.
 */
export async function objetivosTactilesPequenos(page: Page, minimo = 24): Promise<string[]> {
  return page.evaluate((min) => {
    const fallos: string[] = [];
    const seleccion = 'a, button, [role="button"], input[type="checkbox"], input[type="radio"], select';
    for (const el of Array.from(document.querySelectorAll(seleccion))) {
      const caja = el.getBoundingClientRect();
      if (caja.width === 0 || caja.height === 0) {
        continue;
      }
      const propio = (el.textContent ?? '').trim();
      const delPadre = (el.parentElement?.textContent ?? '').trim();
      const esEnlaceEnTexto = el.tagName === 'A' && propio.length > 0 && delPadre.length > propio.length + 12;
      if (esEnlaceEnTexto) {
        continue;
      }
      if (caja.height < min || caja.width < min) {
        const etiqueta = propio.slice(0, 30) || el.getAttribute('aria-label') || el.tagName;
        fallos.push(`${etiqueta} (${Math.round(caja.width)}×${Math.round(caja.height)})`);
      }
    }
    return fallos;
  }, minimo);
}
