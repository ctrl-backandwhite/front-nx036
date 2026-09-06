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
 * <p>Cuando falta una clave, el servicio devuelve la clave misma: se ve `login.title` escrito donde
 * debería ir un texto. Es deliberado —un hueco en blanco pasa desapercibido en una revisión y esto no—,
 * y por eso la certificación lo busca en los OCHO idiomas.
 */
export async function clavesSinTraducir(page: Page): Promise<string[]> {
  const texto = await page.locator('body').innerText();
  const patron = /\b[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*){1,4}\b/g;
  const candidatas = texto.match(patron) ?? [];
  // Los nombres de fichero y los dominios también casan con el patrón: se descartan por su final.
  const finalesInocentes = /\.(com|net|org|es|io|dev|local|test|png|jpg|jpeg|webp|svg|pdf|json|ts|js|css|html)$/i;
  return [...new Set(candidatas.filter((c) => !finalesInocentes.test(c)))];
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
 * <p>Se espera a `networkidle` y no a `load` porque lo que se compara es la pantalla ya asentada: el
 * React pide sus datos después de montar, y comparar antes mediría quién es más rápido, no quién enseña
 * lo mismo.
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
    const respuesta = await page.goto(`${base}${ruta}`, { waitUntil: 'networkidle' });
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
 * Comprueba que lo que se pulsa se puede pulsar con un dedo.
 *
 * <p>44 píxeles es el mínimo recomendado por las guías de accesibilidad táctil. Se miran los elementos
 * visibles e interactivos; los ocultos y los de tamaño cero no cuentan.
 */
export async function objetivosTactilesSuficientes(page: Page, minimo = 44): Promise<string[]> {
  return page.evaluate((min) => {
    const fallos: string[] = [];
    const seleccion = 'a, button, [role="button"], input[type="checkbox"], input[type="radio"], select';
    for (const el of Array.from(document.querySelectorAll(seleccion))) {
      const caja = el.getBoundingClientRect();
      if (caja.width === 0 || caja.height === 0) {
        continue;
      }
      if (caja.height < min || caja.width < min) {
        const etiqueta = (el.textContent ?? '').trim().slice(0, 40) || el.getAttribute('aria-label') || el.tagName;
        fallos.push(`${etiqueta} (${Math.round(caja.width)}×${Math.round(caja.height)})`);
      }
    }
    return fallos;
  }, minimo);
}
