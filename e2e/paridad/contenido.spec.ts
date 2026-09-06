import { expect, test } from '@playwright/test';
import {
  ANGULAR,
  REACT,
  abreEnAmbos,
  clavesSinTraducir,
  importes,
  textoVisible,
} from '../util/comparador';
import { RUTAS_PUBLICAS } from '../util/rutas';
import diccionarioEs from '../../src/app/shared/i18n/dictionary/es';

/** Las claves que el proyecto conoce. Si una aparece escrita en pantalla, es que falta su traducción. */
const CLAVES_CONOCIDAS: ReadonlySet<string> = new Set(Object.keys(diccionarioEs));

/**
 * Dimensión B: paridad de contenido.
 *
 * <p>Se compara lo que se LEE, no el marcado: dos aplicaciones distintas no van a generar el mismo HTML
 * y no tienen por qué. Lo que sí tiene que coincidir es lo que se ve, y sobre todo lo que se cobra.
 */

const sinParametro = (r: string) => !r.includes(':');
const IDIOMAS = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it', 'nl'] as const;

test.describe('paridad de contenido', () => {
  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    /**
     * Se comparan los ENCABEZADOS, no el texto entero.
     *
     * <p>Comparar todo el texto entre dos implementaciones distintas da más ruido que señal: un salto
     * de línea, un espacio o el orden de dos avisos lo rompen sin que nadie vea diferencia alguna en
     * la pantalla. Lo que sí tiene que coincidir es lo que la página DICE de sí misma, y eso son sus
     * títulos: si falta uno, falta una sección entera.
     */
    test(`${ruta} enseña las mismas secciones`, async ({ page }) => {
      const encabezados = async () =>
        (await page.locator('h1, h2').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).sort();

      await abre(page, `${REACT}${ruta}`);
      const enReact = await encabezados();
      await abre(page, `${ANGULAR}${ruta}`);
      const enAngular = await encabezados();

      const faltan = enReact.filter((h) => !enAngular.includes(h));
      expect(faltan, `${ruta} pierde secciones que el front anterior sí enseña`).toEqual([]);
    });

    /**
     * Los importes van aparte y se comparan AL CÉNTIMO. Es donde se esconden los fallos que importan:
     * una divisa mal formateada, un margen aplicado dos veces, un envío que no suma. Comparados dentro
     * del texto general se diluirían entre miles de caracteres.
     */
    test(`${ruta} enseña los mismos importes, al céntimo`, async ({ page }) => {
      const { react, angular } = await abreEnAmbos(page, ruta);
      expect(angular.importes, `los importes de ${ruta} no cuadran con los del React`).toEqual(
        react.importes,
      );
    });

    /**
     * La consola se compara CONTRA el React, no contra cero: el original tiene su propio nivel de
     * ruido y exigir silencio absoluto convertiría la certificación en una lista de falsos positivos.
     * Lo que no se tolera es que el porte añada errores nuevos.
     */
    test(`${ruta} no añade errores de consola`, async ({ page }) => {
      const { react, angular } = await abreEnAmbos(page, ruta);
      expect(
        angular.errores.length,
        `errores nuevos en ${ruta}: ${angular.errores.slice(0, 3).join(' · ')}`,
      ).toBeLessThanOrEqual(react.errores.length);
    });
  }

  /**
   * Ninguna pantalla puede enseñar una clave técnica en NINGUNO de los ocho idiomas.
   *
   * <p>Cuando falta una traducción, el servicio devuelve la clave misma —es deliberado: un hueco en
   * blanco pasa desapercibido en una revisión y un `login.title` escrito en la pantalla no—. Aquí es
   * donde eso se caza, y hay que mirarlo en los ocho: los huecos casi nunca están en español.
   */
  for (const idioma of IDIOMAS) {
    test(`ninguna pantalla enseña claves sin traducir en «${idioma}»`, async ({ page, context }) => {
      await context.addCookies([
        { name: 'nx036-locale', value: idioma, url: ANGULAR },
      ]);
      const encontradas: string[] = [];
      for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
        await abre(page, `${ANGULAR}${ruta}`);
        for (const clave of await clavesSinTraducir(page, CLAVES_CONOCIDAS)) {
          encontradas.push(`${ruta} → ${clave}`);
        }
      }
      expect(encontradas, `claves sin traducir en «${idioma}»`).toEqual([]);
    });
  }

  /**
   * Las divisas se escriben como corresponde al idioma, no a la anglosajona.
   *
   * <p>Ya pasó en producción: sin el idioma correcto, una cantidad en euros salía «EUR14.90» en vez de
   * «14,90 €». No es un detalle estético — es el precio, y leído del revés genera desconfianza.
   */
  test('los importes se escriben con el formato del idioma', async ({ page, context }) => {
    await context.addCookies([
      { name: 'nx036-locale', value: 'es', url: ANGULAR },
      { name: 'nx036-currency', value: 'EUR', url: ANGULAR },
    ]);
    await abre(page, `${ANGULAR}/pricing`);

    for (const importe of await importes(page)) {
      expect(importe, `«${importe}» está escrito a la anglosajona en un idioma que no lo es`)
        .not.toMatch(/^[A-Z]{3}\d/);
    }
  });

  test('el tema oscuro no deja texto ilegible', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abre(page, `${ANGULAR}/`);

    // Ya hubo dos incidencias de contraste por esto: texto del color del fondo sobre el que se pinta.
    const invisibles = await page.evaluate(() => {
      const fallos: string[] = [];
      for (const el of Array.from(document.querySelectorAll('p, span, h1, h2, h3, a, button, li'))) {
        const texto = (el.textContent ?? '').trim();
        if (!texto || el.children.length > 0) {
          continue;
        }
        const estilo = getComputedStyle(el);
        if (estilo.color === estilo.backgroundColor && estilo.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          fallos.push(texto.slice(0, 40));
        }
      }
      return fallos;
    });
    expect(invisibles, 'hay texto del mismo color que su fondo en tema oscuro').toEqual([]);
  });
});
