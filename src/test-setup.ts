import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { configure } from '@testing-library/dom';

/*
 * `beforeEach` se importa EXPLÍCITAMENTE, y no es estilo: este fichero lo compilaba también la
 * aplicación —`tsconfig.app.json` incluía `src/**` y solo excluía los `.spec.ts`—, donde los globales
 * de Vitest no existen. Mientras aquí solo hubo configuración y clases nadie lo notó; en cuanto entró
 * un `beforeEach`, `ng build` se cayó con «Cannot find name 'beforeEach'» y tumbó la construcción de
 * la imagen. Las pruebas y el lint pasaban: el único que lo veía era el build.
 *
 * Se arregla por los dos lados —la importación explícita aquí y la exclusión en `tsconfig.app.json`—
 * porque cada uno tapa un agujero distinto: la importación hace que el fichero sea correcto lo compile
 * quien lo compile, y la exclusión evita que la aplicación cargue con infraestructura de pruebas.
 */

/**
 * El plazo de las esperas asíncronas: cinco segundos en vez del segundo por defecto.
 *
 * <p>No es taparle la boca a nada. Las 348 pruebas corren en paralelo sobre la misma máquina, y lo que
 * esperan casi siempre encadena dos saltos —llega el dato, y después el formato con la divisa—. Con un
 * segundo de plazo, bajo carga fallaba una o dos pruebas DISTINTAS en cada pasada y todas ellas pasaban
 * en solitario: la firma de un plazo apurado, no de un defecto. El coste de subirlo es cero cuando todo
 * va bien —la espera termina en cuanto aparece lo esperado— y solo se nota en la prueba que ya falla.
 */
configure({ asyncUtilTimeout: 5000 });

/**
 * Preparación común de las pruebas.
 *
 * <p>`jest-dom` añade las comprobaciones que se leen como una frase (`toBeVisible`, `toHaveTextContent`)
 * en vez de obligar a comparar propiedades del DOM a mano.
 */

/**
 * Doble de `IntersectionObserver`.
 *
 * <p>El DOM simulado que usan las pruebas no lo trae, y sin él **cualquier componente con un bloque
 * `@defer (on viewport)` revienta al montarse**: no falla la comprobación, falla el montaje, con un
 * error que no menciona el diferido por ninguna parte. Como la norma de rendimiento del proyecto pide
 * diferir todo lo que queda bajo el pliegue, esto afecta a casi cada pantalla, y por eso vive aquí y no
 * repetido en cada fichero de prueba.
 *
 * <p>El doble avisa INMEDIATAMENTE de que lo observado está a la vista. Es la decisión correcta para una
 * prueba: lo que se quiere comprobar es qué se pinta cuando el bloque llega, no la mecánica del
 * navegador para decidir cuándo llega. Quien necesite comprobar el estado ANTES de que aparezca puede
 * sustituirlo en su propio fichero.
 */
class ObservadorDeVisibilidadFalso implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  // `scrollMargin` es parte de la interfaz desde una revisión reciente del estándar. No hace nada aquí
  // —el doble avisa siempre—, pero sin ella el tipo no cuadra y las pruebas ni compilan.
  readonly scrollMargin = '0px';
  readonly thresholds: readonly number[] = [0];

  constructor(private readonly avisa: IntersectionObserverCallback) {}

  observe(objetivo: Element): void {
    this.avisa(
      [
        {
          isIntersecting: true,
          intersectionRatio: 1,
          target: objetivo,
          time: 0,
          boundingClientRect: objetivo.getBoundingClientRect(),
          intersectionRect: objetivo.getBoundingClientRect(),
          rootBounds: null,
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {
    /* No hay nada que dejar de observar: el doble avisa una vez y termina. */
  }

  disconnect(): void {
    /* Igual que arriba. */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = ObservadorDeVisibilidadFalso as unknown as typeof IntersectionObserver;
}

/**
 * Doble de `matchMedia`, por el mismo motivo: el DOM simulado no lo trae y lo consultan las piezas que
 * respetan «reducir el movimiento», que en este proyecto son todas las que animan.
 */
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}

/**
 * Doble de `requestIdleCallback`.
 *
 * <p>Es la pieza que faltaba para que los bloques diferidos se pinten en las pruebas. Un
 * `@defer (hydrate on viewport)` que no declara disparador propio usa «cuando el navegador esté
 * ocioso», y el DOM simulado no trae esa función: el bloque se quedaba esperando un momento de reposo
 * que no llegaba nunca. El fallo se leía como «no encuentro este texto», que es exactamente la pista
 * que no ayuda.
 *
 * <p>Aquí el reposo llega enseguida, que es lo que interesa comprobar: qué se pinta cuando el bloque
 * entra, no cuánto tarda el navegador en decidirlo.
 */
if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = ((tarea: IdleRequestCallback) =>
    setTimeout(() => tarea({ didTimeout: false, timeRemaining: () => 50 }), 0) as unknown as number) as typeof globalThis.requestIdleCallback;
  globalThis.cancelIdleCallback = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelIdleCallback;
}

/**
 * Doble de `scrollIntoView`.
 *
 * <p>El DOM simulado no lo trae, y no falla al llamarlo: lanza. Lo usan las piezas que bajan la vista al
 * contenido nuevo —el chat al recibir respuesta, los hilos de soporte—, así que sin esto la prueba de
 * esas pantallas revienta con un «no es una función» que no menciona el desplazamiento.
 *
 * <p>No hace nada, y no debe: en una prueba no hay ventana que desplazar. Lo que se comprueba es qué se
 * pinta, no cuánto se ha bajado.
 */
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function desplazaHasta(): void {
    /* Sin efecto a propósito: ver la nota de arriba. */
  };
}

/**
 * Las preferencias vuelven a su estado de fábrica ANTES DE CADA PRUEBA.
 *
 * <p>DEFECTO QUE CIERRA ESTO, y costó dos vueltas del corredor de integración: el idioma, la moneda y el
 * tema viajan en COOKIE, y una cookie sobrevive al fichero de prueba que la escribió. Vitest reutiliza
 * el mismo DOM simulado para varios ficheros del mismo proceso, así que lo que uno deja puesto se lo
 * encuentra el siguiente.
 *
 * <p>No es teórico. `listado.page.spec.ts` cambia la moneda a MXN para comprobar que el listado se
 * recarga, y eso ESCRIBE la cookie. Cuando a continuación le tocaba a `ficha.page.spec.ts` en el mismo
 * proceso, su prueba equivalente arrancaba ya en MXN: cambiar a MXN no cambiaba nada, el recurso no se
 * volvía a pedir y la prueba se caía tras quince segundos con «expected 1 to be greater than 1». Aquí
 * pasaba —los ficheros caían en procesos distintos— y en el corredor, con dos núcleos y dos procesos,
 * no. Se reprodujo poniendo la cookie a mano: mismo mensaje, mismo plazo agotado.
 *
 * <p>La misma fuga tumbó antes la prueba del aspa de la ventana modal, que buscaba el rótulo en español
 * y solo lo encontraba si otro fichero había dejado el idioma puesto. Dos síntomas, una causa.
 *
 * <p>Va aquí y no en cada fichero porque el estado compartido no se arregla recordando limpiarlo: se
 * arregla en el único sitio por el que pasan todas. Las pruebas que necesitan un idioma o una moneda
 * concretos los fijan en su propio `beforeEach`, que corre DESPUÉS de este.
 */
const COOKIES_DE_PREFERENCIAS = ['nx036-locale', 'nx036-currency', 'nx036-theme', 'nx036-country'];

beforeEach(() => {
  for (const nombre of COOKIES_DE_PREFERENCIAS) {
    document.cookie = `${nombre}=; Path=/; Max-Age=0`;
  }
});
