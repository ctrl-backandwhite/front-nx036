import { Page, expect, test } from '@playwright/test';
import {
  ANGULAR,
  abre,
  apartaAlAsistente,
  descartaElAvisoDeGalletas,
  sinDesplazamientoHorizontal,
  vigilaLaConsola,
} from '../util/comparador';
import { ADMIN, CLIENTE, entra, olvida } from '../util/sesion';
import { buscaEnElCatalogo, erroresGraves } from '../util/acciones';

/**
 * Cómo se PRESENTA la aplicación: que lo prerenderizado llegue con contenido, que hidrate sin
 * quejarse, que no se vea rota y que las transiciones acompañen en vez de estorbar.
 *
 * <p>Por qué existe aparte de las baterías de acciones: aquéllas comprueban que las cosas FUNCIONAN
 * —se pulsa, cambia el estado, el backend recibe lo que debe—. Nada de eso se entera de que la
 * portada llega sin precios porque el prerenderizado corrió sin backend, de que los iconos salen
 * gigantes medio segundo porque su hoja de estilos la inyecta el JavaScript, o de que el catálogo
 * entero parpadea al teclear en el buscador. Son defectos que solo se ven mirando, y por eso se
 * miden aquí.
 */

/**
 * Lo público, que se prerenderiza: su HTML tiene que traer el contenido ya escrito.
 *
 * <p>El catálogo NO está aquí aunque también se prerenderice: nginx sirve su HTML, pero la guarda de
 * ruta manda al acceso a quien llega sin sesión. Mirarlo como anónimo certifica la pantalla de
 * entrada creyendo que se mira el catálogo.
 */
const PRERENDERIZADAS = [{ ruta: '/', nombre: 'portada' }] as const;

/** Lo que exige sesión: se pinta en el navegador, así que aquí se mira que cargue y se vea. */
const CON_SESION = [
  { ruta: '/catalog', nombre: 'catálogo' },
  { ruta: '/account', nombre: 'cuenta' },
  { ruta: '/orders', nombre: 'pedidos' },
  { ruta: '/cart', nombre: 'cesta' },
] as const;

const DEL_PANEL = [
  { ruta: '/admin', nombre: 'panel' },
  { ruta: '/admin/catalog', nombre: 'catálogo del panel' },
  { ruta: '/admin/orders', nombre: 'pedidos del panel' },
] as const;

/**
 * Avisos de hidratación de Angular. No son ruido: cada uno significa que el navegador ha tirado el
 * HTML que venía del prerenderizado y ha vuelto a pintar ese trozo, que es justo lo que se paga por
 * prerenderizar. Se ven como un parpadeo y cuestan el trabajo dos veces.
 */
const HIDRATACION = /NG050[0-9]|hydrat/i;

/** Textos de espera. Si siguen ahí con la pantalla asentada, no se ha cargado: se ha rendido. */
const MARCADORES_DE_CARGA = ['Cargando…', 'Cargando...', 'Loading…', '{{', '[object Object]'];

async function textoDeLaPantalla(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

/**
 * Lo que el navegador recibe ANTES de ejecutar una línea de JavaScript.
 *
 * <p>Se pide con `fetch` desde una pestaña ya abierta y no con `page.goto`, porque lo que interesa es
 * el fichero que sirve nginx, no el resultado de haberlo hidratado.
 */
async function htmlServido(page: Page, ruta: string): Promise<string> {
  return page.evaluate(async (url: string) => (await fetch(url)).text(), `${ANGULAR}${ruta}`);
}

test.describe('presentación · lo prerenderizado llega escrito', () => {
  for (const pantalla of PRERENDERIZADAS) {
    /**
     * El fallo que esto vigila NO rompe el build: si el prerenderizado corre sin backend accesible,
     * las peticiones fallan en silencio y las páginas se escriben con sus marcadores de carga. Sale
     * una web que parece prerenderizada y no lo está.
     */
    test(`${pantalla.nombre}: el HTML servido trae contenido, no marcadores de carga`, async ({ page }) => {
      await abre(page, `${ANGULAR}/`);
      const html = await htmlServido(page, pantalla.ruta);
      const texto = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      expect(texto.length, 'HTML servido casi vacío: el prerenderizado no trajo datos').toBeGreaterThan(1500);
      for (const marcador of MARCADORES_DE_CARGA) {
        expect(html, `el HTML servido lleva «${marcador}» dentro`).not.toContain(marcador);
      }
    });
  }

  test('la portada servida ya trae precios', async ({ page }) => {
    await abre(page, `${ANGULAR}/`);
    const html = await htmlServido(page, '/');

    /*
     * Un importe con su símbolo: es el dato que desaparece cuando el prerenderizado corre sin
     * backend. Se aceptan las DOS colocaciones del símbolo —«3,52 €» y «$3.52»— porque el
     * prerenderizado se hace sin sesión y sale en la divisa por defecto, que hoy es el dólar;
     * exigir solo el euro convertía una divisa legítima en un fallo de la certificación.
     */
    expect(html, 'ni un precio en el HTML servido').toMatch(
      /\d+[.,]\d{2}\s*(€|&euro;)|(\$|US\$)\s*\d+[.,]\d{2}/,
    );
  });
});

test.describe('presentación · hidratación sin quejas', () => {
  for (const pantalla of PRERENDERIZADAS) {
    test(`${pantalla.nombre}: hidrata sin avisos y sin perder el contenido`, async ({ page }) => {
      const errores = vigilaLaConsola(page);
      await abre(page, `${ANGULAR}${pantalla.ruta}`);
      await descartaElAvisoDeGalletas(page);

      const texto = await textoDeLaPantalla(page);
      expect(texto.length, 'la pantalla se ha quedado en blanco tras hidratar').toBeGreaterThan(500);
      expect(
        errores.filter((e) => HIDRATACION.test(e)),
        'avisos de hidratación: el navegador ha tirado el HTML prerenderizado',
      ).toEqual([]);
      expect(erroresGraves(errores)).toEqual([]);
    });
  }
});

test.describe('presentación · no se ve rota', () => {
  for (const pantalla of [...PRERENDERIZADAS, ...CON_SESION]) {
    const privada = !PRERENDERIZADAS.some((p) => p.ruta === pantalla.ruta);

    test(`${pantalla.nombre}: sin desbordar, sin marcadores y con estilos puestos`, async ({ page }) => {
      if (privada) await entra(page, ANGULAR, CLIENTE);
      await abre(page, `${ANGULAR}${pantalla.ruta}`);
      await descartaElAvisoDeGalletas(page);
      await apartaAlAsistente(page);

      await sinDesplazamientoHorizontal(page);

      const texto = await textoDeLaPantalla(page);
      for (const marcador of MARCADORES_DE_CARGA) {
        expect(texto, `sigue enseñando «${marcador}» con la pantalla asentada`).not.toContain(marcador);
      }

      /**
       * Un icono sin su hoja de estilos se pinta con el tamaño de la fuente del sistema y sale
       * GIGANTE. Pasó de verdad en el primer render de las fichas. Se mide el icono, que es donde se
       * nota, y no un cuadro cualquiera de la maqueta.
       */
      const iconosEnormes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('svg[data-icon], fa-icon svg'))
          .map((el) => Math.round(el.getBoundingClientRect().height))
          .filter((alto) => alto > 64),
      );
      expect(iconosEnormes, 'iconos pintados sin su hoja de estilos').toEqual([]);

      if (privada) olvida(ANGULAR, CLIENTE.correo);
    });
  }
});

test.describe('presentación · las transiciones acompañan', () => {
  /**
   * Un segundo de fundido al cambiar de pantalla: es lo que hace que la navegación se lea como una
   * aplicación y no como recargas encadenadas.
   */
  test('cambiar de pantalla funde durante un segundo', async ({ page }) => {
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);

    /**
     * Se SONDEA en vez de leer una vez: el fundido dura un segundo y arranca cuando el enrutador
     * termina, no cuando se suelta el ratón. Una sola lectura justo después del clic cae antes de que
     * empiece y da la lista vacía, que es un falso negativo, no un defecto.
     */
    const duraciones: number[] = [];
    await page.getByRole('link', { name: /catálogo/i }).first().click();
    await expect
      .poll(
        async () => {
          const vistas = await page.evaluate(() =>
            document.getAnimations().map((a) => Number(a.effect?.getTiming().duration ?? 0)),
          );
          duraciones.push(...vistas);
          return vistas.some((d) => d >= 800 && d <= 1200);
        },
        { message: 'no arranca el fundido al cambiar de pantalla', timeout: 5_000, intervals: [100] },
      )
      .toBe(true);

    expect(duraciones.length, 'ninguna animación vista').toBeGreaterThan(0);
  });

  /**
   * Y NO funde al cambiar un filtro. Para el enrutador es una navegación; para quien mira, no: con el
   * fundido puesto, cada pausa al teclear en el buscador hacía desaparecer y reaparecer la lista
   * —y la propia caja de búsqueda, que va dentro— durante un segundo. Escribir tres palabras hacía
   * parpadear el catálogo tres veces y se leía como que se había roto.
   */
  test('cambiar un filtro NO funde la pantalla entera', async ({ page }) => {
    await entra(page, ANGULAR, CLIENTE);
    await abre(page, `${ANGULAR}/catalog`);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
    await expect(page.locator('nx-tarjeta-producto').first()).toBeVisible();
    // El fundido de la ENTRADA sí es legítimo: se le deja terminar antes de medir el del filtro.
    await page.waitForTimeout(1500);

    await buscaEnElCatalogo(page, 'vestido');

    const enMarcha = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    );
    expect(enMarcha, 'la pantalla se funde al cambiar un filtro').toBe(0);
  });
});

test.describe('presentación · el panel también', () => {
  for (const pantalla of DEL_PANEL) {
    test(`${pantalla.nombre}: carga, se ve y no se queja`, async ({ page }) => {
      const errores = vigilaLaConsola(page);
      await entra(page, ANGULAR, ADMIN);
      await abre(page, `${ANGULAR}${pantalla.ruta}`);
      await descartaElAvisoDeGalletas(page);

      const texto = await textoDeLaPantalla(page);
      expect(texto.length, 'la pantalla del panel se ha quedado en blanco').toBeGreaterThan(300);
      for (const marcador of MARCADORES_DE_CARGA) {
        expect(texto, `sigue enseñando «${marcador}»`).not.toContain(marcador);
      }
      await sinDesplazamientoHorizontal(page);
      expect(erroresGraves(errores)).toEqual([]);

      olvida(ANGULAR, ADMIN.correo);
    });
  }
});
