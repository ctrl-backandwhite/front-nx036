import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ANGULAR, abre, apartaAlAsistente, bajaAlFondo, descartaElAvisoDeGalletas } from '../util/comparador';
import { CLARO, OSCURO, confirmaElTema, confirmaLaVersion, ponElTema } from '../util/tema';
import { CLIENTE, entra } from '../util/sesion';

/**
 * El texto se tiene que LEER, en los dos temas y en las dos anchuras.
 *
 * <p>QUÉ SE ROMPÍA, y por qué hacía falta una prueba nueva en vez de arreglar la que había.
 * `calidad/contenido.spec.ts` tenía un caso llamado «el tema oscuro no deja texto ilegible» con tres
 * agujeros, cada uno suficiente para no ver nada:
 *
 * <ul>
 *   <li>Ponía el tema con `emulateMedia`, que enciende la preferencia del sistema pero NO pone
 *       `data-theme`. Las correcciones del oscuro cuelgan de ese atributo, así que medía una rama
 *       sin ninguna de ellas.
 *   <li>Solo miraba la portada.
 *   <li>Solo marcaba `color === backgroundColor` EXACTO. Un gris sobre gris a 1,5:1 pasaba limpio,
 *       y casi todos los textos heredan un fondo transparente, así que ni siquiera entraban.
 * </ul>
 *
 * <p>Esta mide la RELACIÓN DE CONTRASTE real con axe, que es lo que de verdad importa y que además
 * compone la opacidad acumulada de los ancestros — las tres incidencias medidas contra
 * preproducción el 27-sep-2026 fueron `opacity-60` (4,25:1, en 83 sitios), `opacity-50` (3,21:1) y
 * `btn-ghost text-error` (1,03:1), y un medidor que lea `color` sin componer opacidad no ve
 * ninguna de las tres.
 *
 * <p>Umbral: WCAG 2.2 AA. 4,5:1 para texto normal y 3:1 para texto grande, que es el listón que el
 * proyecto ya se fijó por escrito en `src/styles-contraste.spec.ts`. No se sube a AAA: marcaría
 * media aplicación y pararía la entrega.
 *
 * <p>Lo que esta prueba NO puede ver, y va al guion manual: la lista desplegada de un `&lt;select&gt;`
 * nativo la pinta el sistema operativo, no la página.
 */

/** Las rutas públicas, que son las que se pueden medir sin sesión. */
const RUTAS = [
  '/',
  '/about',
  '/connect',
  '/contact',
  '/developers',
  '/login',
  '/register',
  '/password-reset',
  '/status',
] as const;

/**
 * Las que exigen sesión, y por qué van aparte.
 *
 * <p>`/catalog` estaba en la lista de arriba, y era un error MÍO: el dueño la hizo privada a
 * propósito, así que sin sesión redirige a `/login`. La prueba cargaba, medía el formulario de
 * acceso y lo apuntaba como «catálogo certificado». Daba verde midiendo otra pantalla — el mismo
 * defecto de fondo que el tema que no se aplicaba: una medida que no afirma QUÉ está midiendo.
 *
 * <p>Son además las pantallas con más color por centímetro —tarjetas, insignias, precios,
 * descuentos, tablas— o sea justo donde el contraste falla, y ninguna se había mirado nunca.
 */
const RUTAS_CON_SESION = [
  '/catalog',
  '/cart',
  '/favorites',
  '/orders',
  '/profile',
  '/wallet',
] as const;

/**
 * Lo que hoy NO cumple y todavía no se ha arreglado.
 *
 * <p>Existe para poder poner la batería en verde sin dejar de bloquear lo NUEVO, que es el patrón
 * que este repositorio ya usa en la lista `RUIDO` de `util/comparador.ts`. Con una vuelta de
 * tuerca: si una entrada deja de reproducir, la prueba también falla. Así la lista encoge sola en
 * vez de fosilizarse, que es lo que le pasa a toda lista de excepciones que solo puede crecer.
 *
 * <p>Se llena con lo que salga en la PRIMERA ejecución contra preproducción. Nace vacía a
 * propósito: si la batería pasa a la primera sobre una aplicación que el dueño dice que está rota,
 * es que está midiendo otra cosa.
 */
const DEUDA: readonly { ruta: string; tema: string; selector: string; porque: string }[] = [];

function esDeuda(ruta: string, tema: string, selector: string): boolean {
  return DEUDA.some((d) => d.ruta === ruta && d.tema === tema && selector.includes(d.selector));
}

/**
 * La hoja recién construida, para contrastarla con la que sirve el entorno.
 *
 * <p>Devuelve su CONTENIDO, no su nombre: el nombre lleva hash, pero el entorno construye con
 * otra configuración y dos hojas con las mismas reglas pueden salir con nombres distintos.
 *
 * <p>Obliga a construir antes de medir, y eso es a propósito: si no hay `dist`, no hay con qué
 * comparar y la batería no puede afirmar contra qué versión está midiendo.
 */
function hojaConstruida(): string {
  // `DIST_NAVEGADOR` permite apuntar a otra carpeta: CI construye donde quiere, y en local
  // sirve para medir sin tocar el `dist` del proyecto.
  const dir = process.env['DIST_NAVEGADOR'] ?? join(process.cwd(), 'dist/front-nx036/browser');
  if (!existsSync(dir)) {
    throw new Error('No hay dist: construye antes de medir, o no se sabe contra qué versión se mide.');
  }
  const hoja = readdirSync(dir).find((f) => /^styles-[A-Z0-9]+\.css$/.test(f));
  if (!hoja) throw new Error(`No encuentro la hoja de estilos en ${dir}.`);
  return readFileSync(join(dir, hoja), 'utf8');
}

/**
 * Esperar a que TERMINEN las animaciones antes de medir el color.
 *
 * <p>QUÉ SE ROMPÍA. En la primera medición limpia, axe acusó a ocho enlaces `link-primary` de
 * estar a 3,38:1 y 4,01:1. El color real de esos enlaces es #0c4a97 en claro y #3f93ec en oscuro:
 * 8,44:1 y 5,52:1, con holgura. Lo que axe midió fue su animación de entrada a media atenuación.
 *
 * <p>Es el mismo defecto que el de la versión servida, con otra cara: medir sin afirmar que lo
 * medido es el estado final. Un falso positivo así cuesta más que un fallo, porque la corrección
 * que invita a hacer —oscurecer un azul que estaba bien— empeora el diseño y encima no calla la
 * alarma.
 */
async function esperaAQueAsienten(page: import('@playwright/test').Page): Promise<void> {
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'), null, {
      timeout: 10_000,
    })
    .catch(() => {
      // Una animación en bucle —un indicador de carga— nunca termina. No se espera eternamente:
      // se mide igual, y si deja color ilegible saldrá como incidencia con su selector.
    });
}

for (const tema of [OSCURO, CLARO]) {
  for (const ruta of RUTAS) {
    test(`${ruta} se lee en tema ${tema === OSCURO ? 'oscuro' : 'claro'}`, async ({ page }) => {
      await ponElTema(page, ANGULAR, tema);
      await abre(page, `${ANGULAR}${ruta}`);
      await descartaElAvisoDeGalletas(page);
      await apartaAlAsistente(page);

      // Los guardianes van ANTES de medir. Sin el primero, un fallo al aplicar el tema se lee como
      // «todo bien»; sin el segundo, se diagnostica una versión que ya no está desplegada.
      await confirmaElTema(page, tema);
      await confirmaLaVersion(page, ANGULAR, hojaConstruida());

      // Lo diferido no existe hasta que entra en pantalla, y es justo donde vive medio escaparate.
      await bajaAlFondo(page);

      // Y lo último: que nada siga moviéndose. Medir un color a media transición inventa fallos.
      await esperaAQueAsienten(page);

      const resultado = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

      const fallos = resultado.violations
        .flatMap((v) => v.nodes)
        .map((n) => ({ selector: n.target.join(' '), detalle: n.failureSummary ?? '' }))
        .filter((f) => !esDeuda(ruta, tema, f.selector));

      // Lo que axe no puede decidir —fondo con imagen, solapamiento parcial— no se descarta en
      // silencio: se deja escrito para que lo mire una persona en la revisión manual.
      const aMano = resultado.incomplete.flatMap((v) => v.nodes).map((n) => n.target.join(' '));
      if (aMano.length) {
        await test.info().attach(`contraste-a-mano-${tema}`, {
          body: JSON.stringify({ ruta, tema, aMano }, null, 2),
          contentType: 'application/json',
        });
      }

      expect(fallos, fallos.map((f) => `${f.selector} — ${f.detalle}`).join('\n')).toEqual([]);
    });
  }
}

for (const tema of [OSCURO, CLARO]) {
  for (const ruta of RUTAS_CON_SESION) {
    test(`${ruta} se lee en tema ${tema === OSCURO ? 'oscuro' : 'claro'} (con sesión)`, async ({ page }) => {
      // Más tiempo que el minuto por defecto, y no por capricho: estas pagan el ACCESO además de
      // todo lo demás. Contra un entorno remoto, el acceso solo ya se lleva medio minuto —lleva un
      // `toPass` que reintenta el ciclo entero porque al hidratar Angular vacía el formulario— y
      // encima va el tema, la carga, la bajada al pie y el análisis de axe. Con 60 s se agotaban
      // las veinticuatro, y un agotamiento no dice nada sobre el contraste: solo gasta media hora.
      test.setTimeout(150_000);

      // EL ORDEN IMPORTA, y cuesta verlo. `entra()` toca el almacén del navegador —solo guarda y
      // repone las credenciales, a propósito— y por el camino se lleva la cookie del tema. Poniendo
      // el tema ANTES, el acceso lo borraba y la página salía con `data-theme` vacío: la prueba
      // fallaba en el guardián del tema, no en el contraste. Primero se entra, después se pide el
      // tema, y solo entonces se navega.
      await entra(page, ANGULAR, CLIENTE);
      await ponElTema(page, ANGULAR, tema);
      await abre(page, `${ANGULAR}${ruta}`);
      await descartaElAvisoDeGalletas(page);
      await apartaAlAsistente(page);

      await confirmaElTema(page, tema);
      await bajaAlFondo(page);
      await esperaAQueAsienten(page);

      const resultado = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const fallos = resultado.violations
        .flatMap((v) => v.nodes)
        .map((n) => ({ selector: n.target.join(' '), detalle: n.failureSummary ?? '' }))
        .filter((f) => !esDeuda(ruta, tema, f.selector));

      expect(fallos, fallos.map((f) => `${f.selector} — ${f.detalle}`).join('\n')).toEqual([]);
    });
  }
}

test('la deuda de contraste declarada sigue reproduciendo', async () => {
  // Una entrada que ya no falla es una entrada que hay que borrar. Sin esto, la lista se queda
  // llena de excepciones que ya no existen y deja de mirar cosas que sí importan.
  expect(DEUDA.filter((d) => !d.porque.trim()), 'toda deuda necesita su motivo escrito').toEqual([]);
});
