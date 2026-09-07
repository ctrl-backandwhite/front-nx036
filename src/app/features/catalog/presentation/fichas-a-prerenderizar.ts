import {
  API_INTERNA_POR_DEFECTO,
  VARIABLE_API_INTERNA,
  baseDelBackendAlConstruir,
} from '@core/config/backend-al-construir';

/**
 * QUÉ fichas se escriben al construir. Se resuelve UNA vez, durante la compilación.
 *
 * ── Por qué un subconjunto y no las 7.729 ────────────────────────────────────────────────────────
 *
 * Un HTML de ficha pesa entre 105 y 466 kB porque lleva dentro la respuesta del backend, para que el
 * navegador no la vuelva a pedir al hidratar. Las 7.729 serían del orden de 1,5 GB dentro de la
 * imagen, y además el catálogo CRECE entre despliegues: lo que se cargue mañana no estaría.
 *
 * La salida no es prerenderizarlo todo, es prerenderizar lo que se comparte. Un enlace de producto se
 * comparte desde donde se ve el producto, y donde se ven los productos sin haber entrado a la cuenta
 * es la PORTADA: el listado completo exige sesión. Con `fallback: PrerenderFallback.Client`, todo lo
 * que quede fuera se sigue viendo exactamente igual que hoy, y sus etiquetas para compartir las
 * resuelve la pasarela con `seo-ficha.js`. O sea: el subconjunto MEJORA unas fichas, no EMPEORA
 * ninguna.
 *
 * ── El orden en que se eligen, y por qué ese ────────────────────────────────────────────────────
 *
 *   1. Las de la PORTADA (`/api/catalog/home/sections`). Son las que ve quien llega de fuera sin
 *      cuenta, así que son las que más se abren y las que más se pegan en un mensaje. Van primero
 *      pase lo que pase: son unas 78 y salen de una sola petición.
 *   2. Las MÁS VENDIDAS (`/api/catalog/bestsellers`), en orden de ventas del mes, hasta llenar el
 *      cupo. Se ordena por VENTAS y no por valoración a propósito: la valoración de este catálogo se
 *      apoya en muy pocas reseñas —hay cientos de productos con un 5,00 exacto— así que ordenar por
 *      ella es casi ordenar al azar. Las ventas sí distinguen.
 *
 * Los dos extremos se solapan —la portada trae una sección de más vendidos— y por eso se quitan los
 * repetidos: sin ello el cupo se gastaría dos veces en el mismo producto.
 *
 * ── Por qué estos dos endpoints y no el listado ─────────────────────────────────────────────────
 *
 * `GET /api/catalog/products` —el listado— responde 401: es el único GET de `/api/catalog/**` que
 * exige sesión. Usarlo obligaría a meter credenciales en la compilación. `home/sections`,
 * `bestsellers`, `products/trending` y `products/newest` son públicos y responden 200 sin sesión
 * ninguna; se comprobó uno por uno contra el backend y en la política de seguridad del backend
 * (`BffSecurityConfig`), que solo marca `authenticated()` el listado.
 *
 * ── Si algo falla, no se rompe la compilación ───────────────────────────────────────────────────
 *
 * Sin backend accesible se devuelve la lista vacía y se AVISA por consola. Con la lista vacía, el
 * `fallback` deja las 7.729 fichas en manos del navegador: exactamente el comportamiento de antes de
 * este cambio. Lo que no puede pasar es que falle en silencio —es la trampa que ya costó una portada
 * vacía en esta misma casa— y por eso se escribe siempre una línea con la cuenta, salga bien o mal.
 */

/**
 * Cuántas fichas se escriben al construir si nadie dice otra cosa.
 *
 * ── Por qué 15 y no 300 ─────────────────────────────────────────────────────────────────────────
 *
 * Porque 300 no cabe HOY, y no por tamaño: por el límite de tasa del backend. El catálogo público
 * admite 100 peticiones por minuto y por IP —su defensa contra el volcado masivo— y el cubo se rellena
 * de una vez al acabar cada minuto, no poco a poco. Una ficha cuesta unas cuatro peticiones y el resto
 * de la compilación se lleva unas treinta, así que en una ventana entran del orden de quince fichas.
 * Pedir más no da más: da fichas con una página de error dentro, que es peor que no prerenderizarlas
 * (lo hizo, y está contado en `scripts/verifica-prerenderizado.mjs`).
 *
 * <p>O sea que este número NO es una medida de lo que conviene, es una medida de lo que deja el
 * backend. Lo que conviene son varios cientos: la portada sola son 78 fichas. Para llegar ahí hay que
 * eximir del límite al origen interno desde el que se compila —el que apunta `NEXADROP_API_INTERNA`—,
 * porque no es un extraño volcando el catálogo, somos nosotros. Es una decisión del backend, no de
 * aquí, y por eso este número se deja bajo y la variable a mano: el día que se exima, se sube sin
 * tocar código y la puerta de `verifica:prerender` avisa si no cabe.
 *
 * <p>En el clúster el reparto puede ser distinto —allí el que compila no comparte IP con el resto—,
 * así que el techo real de cada entorno se descubre subiendo la variable hasta que la puerta proteste.
 */
export const FICHAS_POR_DEFECTO = 15;

/** El nombre de la variable con la que el titular sube o baja el cupo sin tocar código. */
export const VARIABLE_CUANTAS_FICHAS = 'NEXADROP_FICHAS_PRERENDERIZADAS';

/** Tope por página de `bestsellers`: el backend recorta cualquier `size` mayor de 100. */
const POR_PAGINA = 100;

/** Lo que admite `perSection` en la portada: el backend lo recorta a 24. */
const POR_SECCION = 24;

/**
 * Idioma con el que se piden los títulos.
 *
 * <p>El HTML se escribe UNA vez y sirve para los ocho idiomas: el resto se aplica al hidratar, en el
 * navegador. Se elige el castellano porque es el idioma de referencia del catálogo —es en el que se
 * carga cada producto y del que salen las otras siete traducciones—, así que es el que menos huecos
 * tiene.
 */
const IDIOMA = 'es';

/** Cuánto se espera a cada petición. Generosa: es una compilación, no una visita. */
const PLAZO_MS = 20_000;

/** Lo mínimo que se necesita de la respuesta del backend. */
interface ProductoResumido {
  readonly slug?: unknown;
}

interface Pagina {
  readonly items?: readonly ProductoResumido[];
}

interface Portada {
  readonly sections?: readonly { readonly items?: readonly ProductoResumido[] }[];
}

/** Quien va a buscar el JSON. Se pasa por parámetro para poder probar sin red. */
export type LectorDeApi = (camino: string) => Promise<unknown>;

/**
 * Cuántas fichas hay que escribir, leído del entorno.
 *
 * <p>Se valida en vez de confiar: un valor con una letra de más se convertiría en `NaN` y la
 * compilación se quedaría sin ninguna ficha sin decir por qué. Ante un valor que no es un entero
 * mayor o igual que cero, se avisa y se usa el de por defecto.
 */
export function cuantasFichas(
  entorno: Readonly<Record<string, string | undefined>> = typeof process !== 'undefined'
    ? process.env
    : {},
  avisa: (mensaje: string) => void = console.warn,
): number {
  const declarado = entorno[VARIABLE_CUANTAS_FICHAS];
  if (declarado === undefined || declarado.trim() === '') {
    return FICHAS_POR_DEFECTO;
  }
  const valor = Number(declarado.trim());
  if (!Number.isInteger(valor) || valor < 0) {
    avisa(
      `[prerenderizado] ${VARIABLE_CUANTAS_FICHAS}="${declarado}" no es un entero mayor o igual que ` +
        `cero; se usan ${FICHAS_POR_DEFECTO}.`,
    );
    return FICHAS_POR_DEFECTO;
  }
  return valor;
}

/** Los `slug` que trae una respuesta, sin repetidos y sin lo que no sea texto con contenido. */
function slugsDe(candidatos: readonly ProductoResumido[] | undefined): string[] {
  return (candidatos ?? [])
    .map((producto) => producto?.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.trim() !== '');
}

/**
 * Elige los `slug`, en orden de prioridad y sin repetidos.
 *
 * <p>Toda la lógica vive aquí, con el lector inyectado, para poder probarla sin levantar un backend.
 */
export async function eligeLasFichas(lee: LectorDeApi, cupo: number): Promise<readonly string[]> {
  if (cupo <= 0) {
    return [];
  }

  const elegidas = new Set<string>();

  const anade = (slugs: readonly string[]): void => {
    for (const slug of slugs) {
      if (elegidas.size >= cupo) {
        return;
      }
      elegidas.add(slug);
    }
  };

  // 1) La portada. Una sola petición y son las fichas a las que más se llega desde fuera.
  const portada = (await lee(
    `/api/catalog/home/sections?lang=${IDIOMA}&perSection=${POR_SECCION}`,
  )) as Portada | null;
  for (const seccion of portada?.sections ?? []) {
    anade(slugsDe(seccion?.items));
  }

  // 2) Las más vendidas, de página en página, hasta llenar el cupo. Se para en cuanto una página
  //    vuelve vacía: quiere decir que se ha llegado al final del catálogo y seguir pidiendo sería
  //    girar en balde.
  for (let pagina = 0; elegidas.size < cupo; pagina++) {
    const lote = (await lee(
      `/api/catalog/bestsellers?lang=${IDIOMA}&page=${pagina}&size=${POR_PAGINA}`,
    )) as Pagina | null;
    const slugs = slugsDe(lote?.items);
    if (slugs.length === 0) {
      break;
    }
    anade(slugs);
  }

  return [...elegidas];
}

/**
 * Lector real: `fetch` contra el backend interno, con plazo y con paciencia ante un 429.
 *
 * <p>Lo del 429 no es defensivo por si acaso: pasa. El backend limita el catálogo público a 100
 * peticiones por minuto y por IP —su defensa contra el volcado masivo— y la compilación ANTERIOR deja
 * el cubo vacío. Sin esperar, la primera petición de esta se lleva el 429, no se elige ninguna ficha y
 * la compilación sale sin prerenderizar nada; se vio compilando dos veces seguidas.
 *
 * <p>La espera sale del `Retry-After` que manda el propio backend, que es quien sabe cuándo se rellena
 * el cubo. Se topa, porque una espera sin límite convertiría un backend atascado en una compilación
 * colgada para siempre.
 */
function lectorHttp(base: string): LectorDeApi {
  return async (camino) => {
    for (let intento = 0; ; intento++) {
      const respuesta = await fetch(`${base}${camino}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(PLAZO_MS),
      });
      if (respuesta.ok) {
        return respuesta.json();
      }
      if (respuesta.status !== 429 || intento >= INTENTOS_ANTE_429) {
        throw new Error(`${respuesta.status} ${respuesta.statusText} en ${camino}`);
      }
      await esperaUnPoco(respuesta, intento);
    }
  };
}

/**
 * Cuántas veces se insiste ante un 429, y cuánto se espera como mucho en cada una.
 *
 * <p>Los dos números salen de un plazo que no ponemos nosotros: `@angular/build` aborta la EXTRACCIÓN
 * DE RUTAS a los 30 segundos —`AbortSignal.timeout(30_000)` en su `routes-extractor-worker`— y esta
 * función corre dentro de ese plazo. Se comprobó por las malas: respetando el `Retry-After` del
 * backend al pie de la letra, la compilación se cayó entera con «Routes extraction was aborted».
 *
 * <p>Tres esperas de cuatro segundos son doce, y las cuatro peticiones que hace esto ocupan un par
 * más: cabe con holgura. Insistir más no serviría de nada, porque el plazo se acabaría igual.
 */
const INTENTOS_ANTE_429 = 3;
const ESPERA_MAXIMA_MS = 4_000;

function esperaUnPoco(respuesta: Response, intento: number): Promise<void> {
  const declarada = Number(respuesta.headers.get('Retry-After'));
  const segundos = Number.isFinite(declarada) && declarada > 0 ? declarada : intento + 1;
  return new Promise((sigue) => setTimeout(sigue, Math.min(segundos * 1000, ESPERA_MAXIMA_MS)));
}

/**
 * Lo que llama la ruta. Devuelve los `slug` que hay que escribir al construir.
 *
 * <p>Escribe SIEMPRE una línea con la cuenta. Es la única defensa contra el fallo característico de
 * este montaje: una compilación que sale en verde y sin ninguna ficha dentro.
 */
export async function slugsAPrerenderizar(
  lee: LectorDeApi = lectorHttp(baseDelBackendAlConstruir()),
  cupo: number = cuantasFichas(),
  registra: (mensaje: string) => void = console.log,
  avisa: (mensaje: string) => void = console.warn,
): Promise<readonly string[]> {
  if (cupo === 0) {
    registra(
      `[prerenderizado] ${VARIABLE_CUANTAS_FICHAS}=0: ninguna ficha se escribe al construir. Todas ` +
        'se montan en el navegador, como antes.',
    );
    return [];
  }

  const empezo = Date.now();
  try {
    const slugs = await eligeLasFichas(lee, cupo);
    const segundos = ((Date.now() - empezo) / 1000).toFixed(1);
    if (slugs.length === 0) {
      avisa(
        '[prerenderizado] el backend no ha devuelto ninguna ficha. Se compila sin ninguna ' +
          'prerenderizada: se ven todas igual, pero sin la mejora. Revisa el catálogo del backend.',
      );
    } else {
      registra(
        `[prerenderizado] ${slugs.length} fichas de producto elegidas en ${segundos} s ` +
          `(cupo ${cupo}, ${VARIABLE_CUANTAS_FICHAS} para cambiarlo).`,
      );
    }
    return slugs;
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    avisa(
      `[prerenderizado] NO se ha podido consultar el backend (${motivo}). No se prerenderiza ninguna ` +
        `ficha: se ven todas igual, pero sin la mejora al compartirlas. Comprueba ` +
        `${VARIABLE_API_INTERNA} (por defecto ${API_INTERNA_POR_DEFECTO}).`,
    );
    return [];
  }
}
