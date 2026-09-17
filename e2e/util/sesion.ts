import { BrowserContext, Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Las sesiones de certificación, abiertas UNA vez y repuestas después.
 *
 * <p>El backend LIMITA los accesos: a partir del undécimo en poco rato responde 429 y la pantalla se
 * queda donde está, sin decir por qué. Una batería que entra por el formulario en cada prueba deja de
 * medir la aplicación y pasa a medir el limitador — ya ocurrió, y se atribuyó a «carga de la máquina».
 *
 * <p>Por eso se guarda en DISCO y no solo en memoria: Playwright recicla el proceso de trabajo en
 * cuanto una prueba falla y vuelve a intentarla, y con él se perdía el mapa en memoria. Justo en la
 * tanda con fallos —la que más veces entra— es cuando hace falta que la sesión sobreviva.
 */

export const CLIENTE = { correo: 'cert-cliente@local.test', clave: 'CertLocal2026!' };
export const ADMIN = { correo: 'cert-admin@local.test', clave: 'CertLocal2026!' };

/**
 * La cuenta con papel OPERATOR: quien da soporte y procesa pedidos.
 *
 * <p>No existía y por eso NADA comprobaba en el navegador lo que ve ese papel. El panel dejaba entrar a
 * un operador en dieciocho pantallas que el backend reserva a administración —catálogo, proveedores,
 * precios, facturación, usuarios—, y se descubrió leyendo las rutas, no corriendo la certificación.
 * Misma contraseña que las otras dos; se creó a mano en la base local, como ellas, porque el alta por la
 * API exige CAPTCHA.
 */
export const OPERADOR = { correo: 'cert-operador@local.test', clave: 'CertLocal2026!' };

/**
 * Lo único que se guarda y se repone: las CREDENCIALES.
 *
 * <p>Antes se copiaba el almacén entero, y con él viajaban `nx036-country` —que decide el idioma y la
 * divisa— y la cesta de invitado. Una sola prueba que cambiara de país se lo heredaba a TODAS las
 * siguientes, que a partir de ahí se ejecutaban en inglés: los selectores escritos en español dejaban
 * de casar y sus pruebas se SALTABAN en vez de fallar. Así desapareció del recuento la que comprueba
 * que el recargo en lote no apunta al catálogo entero.
 *
 * <p>Una sesión es quién eres, no cómo tienes puesta la aplicación. Lo segundo lo pone cada prueba si
 * lo necesita, y empezar siempre igual es justo lo que la hace repetible.
 */
const CLAVES_DE_SESION = new Set(['nx-access-token', 'nx-refresh-token']);

type Cookies = Awaited<ReturnType<BrowserContext['storageState']>>['cookies'];

interface SesionGuardada {
  readonly cookies: Cookies;
  readonly almacen: Record<string, string>;
  readonly cuando: number;
}

/** Cuánto se da por buena una sesión guardada. Menos que la vida del testigo, con margen de sobra. */
const VIGENCIA_MS = 12 * 60 * 1000;

const CARPETA = join(__dirname, '..', 'resultados', 'sesiones');

function fichero(base: string, correo: string): string {
  return join(CARPETA, `${base.replace(/[^a-z0-9]/gi, '-')}-${correo.replace(/[^a-z0-9]/gi, '-')}.json`);
}

function lee(base: string, correo: string): SesionGuardada | null {
  const ruta = fichero(base, correo);
  if (!existsSync(ruta)) {
    return null;
  }
  try {
    const guardada = JSON.parse(readFileSync(ruta, 'utf8')) as SesionGuardada;
    return Date.now() - guardada.cuando < VIGENCIA_MS ? guardada : null;
  } catch {
    return null;
  }
}

function escribe(base: string, correo: string, sesion: SesionGuardada): void {
  mkdirSync(CARPETA, { recursive: true });
  writeFileSync(fichero(base, correo), JSON.stringify(sesion), 'utf8');
}

/**
 * Repone una sesión ya abierta en esta pestaña. El almacén local se pone ANTES de que arranque la
 * aplicación: hacerlo después la encontraría ya decidida a que no hay nadie.
 */
async function repone(page: Page, sesion: SesionGuardada): Promise<void> {
  await page.context().addCookies(sesion.cookies);
  await page.addInitScript((entradas: Record<string, string>) => {
    for (const [clave, valor] of Object.entries(entradas)) {
      try {
        localStorage.setItem(clave, valor);
      } catch {
        /* una ventana privada puede negarse; la prueba lo dirá por otro sitio */
      }
    }
  }, sesion.almacen);
}

/**
 * Entra con la cuenta indicada y deja la pestaña en la portada, con sesión.
 *
 * <p>La primera vez se entra POR EL FORMULARIO de verdad —es lo que certifica que recoge las
 * credenciales, las manda y guarda la sesión—; las siguientes se repone lo guardado.
 */
export async function entra(
  page: Page,
  base: string,
  cuenta: { correo: string; clave: string },
): Promise<void> {
  const guardada = lee(base, cuenta.correo);
  if (guardada && (await sigueViva(page, base, guardada))) {
    await repone(page, guardada);
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    return;
  }

  /*
   * Se VACÍA la pestaña antes de ir al formulario.
   *
   * <p>Sin esto, una prueba que entra dos veces sobre la misma pestaña —y las hay: la de la barra de
   * pestañas recorre dos pantallas— se encontraba con que la segunda vez la sesión guardada ya no
   * valía, tomaba el camino del formulario, y el token caducado SEGUÍA en el almacén del navegador.
   * `soloSinSesion` hace entonces lo que debe —no dejar entrar encima de una sesión abierta— y rebota
   * `/login` al catálogo, así que el campo de correo no aparecía nunca.
   *
   * <p>El fallo se leía como «el acceso no se puede usar en móvil», que es un defecto de la
   * aplicación, cuando lo que fallaba era el arnés.
   */
  await page.context().clearCookies();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* una ventana privada puede negarse; entonces no había nada que limpiar */
    }
  });

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(cuenta.correo);
  await page.locator('input[type="password"]').first().fill(cuenta.clave);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

  const estado = await page.context().storageState();
  const almacen: Record<string, string> = {};
  for (const origen of estado.origins) {
    for (const par of origen.localStorage) {
      if (CLAVES_DE_SESION.has(par.name)) {
        almacen[par.name] = par.value;
      }
    }
  }
  escribe(base, cuenta.correo, { cookies: estado.cookies, almacen, cuando: Date.now() });
}

/**
 * ¿El testigo guardado sigue valiendo?
 *
 * <p>Se pregunta al backend en vez de fiarse del reloj. Una tanda larga agota el testigo por el camino
 * y, si además el servidor ROTA el de refresco, la primera pestaña que lo use lo invalida para todas
 * las demás: a partir de ahí la aplicación se pinta sin sesión y las pruebas empiezan a acusar al
 * porte de cosas que no ha hecho —«no aparece el menú de la cuenta», «no rebota al acceso»—. Comprobarlo
 * cuesta una petición y evita una tanda entera de rojos falsos.
 */
async function sigueViva(
  page: Page,
  base: string,
  guardada: SesionGuardada,
): Promise<boolean> {
  const testigo = (guardada.almacen['nx-access-token'] ?? '').replace(/^"|"$/g, '');
  if (!testigo) {
    return false;
  }
  const respuesta = await page.request
    .get(`${base}/api/me/profile`, { headers: { Authorization: `Bearer ${testigo}` } })
    .catch(() => null);
  return !!respuesta && respuesta.ok();
}

/** Olvida la sesión guardada: hace falta después de certificar el cierre de sesión. */
export function olvida(base: string, correo: string): void {
  try {
    const ruta = fichero(base, correo);
    if (existsSync(ruta)) {
      writeFileSync(ruta, JSON.stringify({ cookies: [], almacen: {}, cuando: 0 }), 'utf8');
    }
  } catch {
    /* si no se puede borrar, la siguiente prueba entrará por el formulario: es correcto igualmente */
  }
}
