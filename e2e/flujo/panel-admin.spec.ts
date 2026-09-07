import { Page, expect, test } from '@playwright/test';
import { ANGULAR, REACT, abre, vigilaLaConsola } from '../util/comparador';
import { RUTAS_DE_PANEL } from '../util/rutas';

/**
 * El PANEL, recorrido entero con una cuenta de administración.
 *
 * <p>Es la mitad de la aplicación que ninguna otra batería toca. Las de paridad solo entran donde no
 * hace falta sesión, y el recorrido con sesión se limitaba a comprobar que `/admin` abre. Cuarenta
 * pantallas de gestión —catálogo, pedidos, precios, aranceles, divisas, usuarios— no las miraba nadie.
 *
 * <p>Lo que se exige a cada una es lo mínimo que no puede fallar: que abra con la cuenta que toca, que
 * no rebote al acceso, que traiga contenido y que no lance errores. No se afirma QUÉ dice cada
 * pantalla, porque eso depende de los datos que haya en la base; se afirma que funciona.
 *
 * <p>La sesión se abre UNA vez y se reutiliza. El backend limita los accesos —a partir del undécimo en
 * poco rato responde 429— y con cuarenta pantallas entrar en cada una convertiría esta batería en una
 * medición del limitador.
 */
const ADMIN = { correo: 'cert-admin@local.test', clave: 'CertLocal2026!' };

/**
 * Rutas sin parámetro: las que llevan `:algo` necesitan un dato real y se cubren en otra batería.
 *
 * <p>La lista sale de `rutas.ts`, que se extrajo del enrutador del front anterior. Aun así se quedó
 * corta —faltaba `/admin/browse`, que respondía 404— así que conviene revisarla contra el original
 * cuando se añada una pantalla, en vez de darla por completa.
 */
const RUTAS = RUTAS_DE_PANEL.filter((r) => !r.includes(':'));


const guardadas = new Map<string, { cookies: unknown[]; almacen: Record<string, string> }>();

async function entraComoAdmin(page: Page, base: string): Promise<void> {
  const guardada = guardadas.get(base);
  if (guardada) {
    await page.context().addCookies(guardada.cookies as never);
    await page.addInitScript((entradas: Record<string, string>) => {
      for (const [k, v] of Object.entries(entradas)) {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* una ventana privada puede negarse */
        }
      }
    }, guardada.almacen);
    return;
  }

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(ADMIN.correo);
  await page.locator('input[type="password"]').first().fill(ADMIN.clave);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });

  const estado = await page.context().storageState();
  const almacen: Record<string, string> = {};
  for (const origen of estado.origins) {
    for (const par of origen.localStorage) {
      almacen[par.name] = par.value;
    }
  }
  guardadas.set(base, { cookies: estado.cookies, almacen });
}

for (const front of [{ nombre: 'Angular', base: ANGULAR }, { nombre: 'React', base: REACT }] as const) {
  test.describe(`${front.nombre} · panel de administración`, () => {
    for (const ruta of RUTAS) {
      test(`${ruta} abre`, async ({ page }) => {
        const errores = vigilaLaConsola(page);
        await entraComoAdmin(page, front.base);
        await abre(page, `${front.base}${ruta}`);

        expect(new URL(page.url()).pathname, `${ruta} rebota al acceso con una cuenta de administración`)
          .not.toBe('/login');

        /* Se mide el CONTENIDO, no la página entera.
         *
         * Antes se contaba el texto del `body` con un umbral de 120 caracteres, y el menú lateral del
         * panel —con sus veintitantas entradas— ya los supera de sobra. Resultado: cuarenta pantallas
         * en verde, y entre ellas el propio panel de control, que llegaba EN BLANCO, y una ruta que
         * respondía 404. Se estaba certificando que el marco monta, que no es lo que se quería saber.
         *
         * Es el mismo error que ya se cometió con el prerenderizado, y por eso queda escrito: cuando
         * una prueba mide el contenedor en vez de lo contenido, da verde justo en el caso que importa. */
        const contenido = await page.evaluate(() => {
          const zona = document.querySelector('main') ?? document.body;
          return (zona instanceof HTMLElement ? zona.innerText : '').replace(/\s+/g, ' ').trim();
        });

        expect(contenido, `${ruta} responde «no encontrada»`).not.toMatch(
          /404|página no encontrada|not found/i,
        );
        expect(contenido.length, `${ruta} llega en blanco`).toBeGreaterThan(120);

        /* Los errores de red por datos que no existen en la base local no cuentan: lo que se busca son
         * los que rompen la pantalla —una excepción de la aplicación, un componente que no monta—. */
        const graves = errores.filter(
          (e) => !/40[0-9]|50[0-9]|Failed to load resource|net::ERR/i.test(e),
        );
        expect(graves, `${ruta} lanza errores: ${graves.slice(0, 2).join(' · ')}`).toEqual([]);
      });
    }
  });
}
