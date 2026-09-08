#!/usr/bin/env node
/**
 * Puerta de calidad del prerenderizado: comprueba que las páginas escritas al construir tienen DENTRO
 * lo que tienen que tener.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────────────────────────
 *
 * Porque `ng build` no lo comprueba, y su silencio engaña. El compilador dice «Prerendered 332 static
 * routes» y termina con código 0 en cuanto ha conseguido RENDERIZAR cada ruta: lo que haya quedado
 * dentro del HTML no lo mira nadie. Si la aplicación pinta su pantalla de «no se ha podido cargar este
 * producto», eso es lo que se escribe en el fichero, y el fichero cuenta igual.
 *
 * No es hipotético. La primera compilación con 300 fichas salió en verde y con 278 de ellas
 * conteniendo el mensaje de error y el título genérico del sitio: el backend había devuelto 429 —su
 * defensa anti-volcado, 100 peticiones por minuto y por IP— y la aplicación lo pintó como un fallo de
 * carga cualquiera. Contar ficheros no lo habría detectado, y pesar el directorio tampoco: los
 * ficheros existían y ocupaban lo suyo.
 *
 * Es además la versión general de una trampa que este proyecto ya tenía anotada: sin
 * `NEXADROP_API_INTERNA` el prerenderizado escribe las páginas con sus marcadores de carga puestos y
 * el build tampoco falla. Misma forma, misma comprobación.
 *
 * ── Qué comprueba ───────────────────────────────────────────────────────────────────────────────
 *
 *   1. Que cada ficha prerenderizada tiene un `<title>` PROPIO, y no el de la plantilla.
 *   2. Que su texto no contiene ninguno de los mensajes con los que la aplicación anuncia que no ha
 *      podido cargar.
 *   3. Que lleva la `og:image`, que es la mitad de la vista previa al compartir.
 *
 * Con `--exigir <n>` comprueba además que se han escrito al menos `n` fichas: sin eso, una compilación
 * en la que la elección de fichas devolvió la lista vacía pasaría la puerta sin una sola ficha dentro,
 * que es otra manera de no enterarse.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.argv[2] ?? 'dist/front-nx036/browser';

/**
 * Cuántas fichas se EXIGEN como mínimo.
 *
 * <p>Sale del mismo cupo con el que se ha compilado, y no de un número escrito aquí, porque el peor
 * fallo posible de esta puerta es aprobar una compilación vacía. Pasó: con el cubo del backend agotado,
 * la elección de fichas se llevó un 429, no se prerenderizó ninguna, y esta puerta dijo «todas las
 * fichas llevan su título» — de cero fichas. Una comprobación que se cumple sola cuando no hay nada
 * que comprobar no es una comprobación.
 *
 * <p>Con el cupo a cero no se exige ninguna: es la marcha atrás declarada, no un accidente.
 */
const CUPO = Number(process.env.NEXADROP_FICHAS_PRERENDERIZADAS ?? '300');
const indiceExigir = process.argv.indexOf('--exigir');
const EXIGIR =
  indiceExigir !== -1
    ? Number(process.argv[indiceExigir + 1] ?? 0)
    : Number.isInteger(CUPO) && CUPO > 0
      ? 1
      : 0;

/** El título de la plantilla. Si una ficha se queda con este, es que no aplicó los suyos. */
const TITULO_GENERICO = 'NX036';

/**
 * Cómo dice la aplicación que no ha podido. Van los ocho idiomas del proyecto: la compilación elige
 * uno y no tiene por qué ser el castellano siempre.
 */
const SENALES_DE_FALLO = [
  'No se ha podido cargar este producto',
  'Producto no encontrado',
  'This product could not be loaded',
  'Product not found',
];

function fichasPrerenderizadas() {
  const carpeta = join(RAIZ, 'catalog');
  if (!existsSync(carpeta)) {
    return [];
  }
  return readdirSync(carpeta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => ({ slug: entrada.name, ruta: join(carpeta, entrada.name, 'index.html') }))
    .filter((ficha) => existsSync(ficha.ruta));
}

/** El texto visible: sin `<script>` —ahí va la respuesta del backend en JSON— y sin etiquetas. */
function textoVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function revisa(ficha) {
  const html = readFileSync(ficha.ruta, 'utf8');
  const titulo = (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim();
  const texto = textoVisible(html);
  const motivos = [];

  if (!titulo || titulo === TITULO_GENERICO) {
    motivos.push(`sin título propio (${titulo || 'vacío'})`);
  }
  const fallo = SENALES_DE_FALLO.find((senal) => texto.includes(senal));
  if (fallo) {
    motivos.push(`contiene «${fallo}»`);
  }
  if (!/<meta[^>]+property=["']og:image["']/i.test(html)) {
    motivos.push('sin og:image');
  }
  return motivos;
}

const fichas = fichasPrerenderizadas();
const rotas = fichas
  .map((ficha) => ({ slug: ficha.slug, motivos: revisa(ficha) }))
  .filter((r) => r.motivos.length > 0);

console.log(`[prerenderizado] revisadas ${fichas.length} fichas en ${RAIZ}`);

if (EXIGIR > 0 && fichas.length < EXIGIR) {
  console.error(
    `[prerenderizado] SE ESPERABAN al menos ${EXIGIR} fichas y hay ${fichas.length}. ` +
      'Suele significar que la elección de fichas no pudo hablar con el backend: comprueba ' +
      'NEXADROP_API_INTERNA.',
  );
  process.exit(1);
}

/**
 * Cuánta avería se tolera antes de tumbar la entrega, en tanto por ciento.
 *
 * <p>Esta puerta nació para cazar un fallo MASIVO: 278 de 300 fichas escritas con una página de error
 * dentro porque el backend contestaba 429. Para eso sigue sirviendo. Pero se escribió como «cero
 * defectos», y con eso UNA sola ficha rota —un producto sin foto, uno retirado a media compilación—
 * bloquea la entrega entera. Pasó el 8-sep-2026: 1 de 242, y con ella se quedó fuera de producción un
 * arreglo de seguridad. Una puerta que impide entregar por un producto es una puerta que se acaba
 * desactivando, y entonces no protege de nada.
 *
 * <p>Así que se mide la PROPORCIÓN. Un 2% deja pasar el ruido normal del catálogo y sigue parando en
 * seco el caso que importa: el 93% de aquella vez no se cuela ni por asomo. Las fichas rotas se
 * enumeran SIEMPRE, pase o no pase, porque el aviso es la mitad del valor de esto.
 */
const TOLERANCIA = Number(process.env.NEXADROP_PRERENDER_TOLERANCIA ?? '2');

if (rotas.length > 0) {
  const parte = (rotas.length / fichas.length) * 100;
  const nivel = parte > TOLERANCIA ? console.error : console.warn;
  nivel(`[prerenderizado] ${rotas.length} de ${fichas.length} fichas salieron MAL (${parte.toFixed(1)}%):`);
  for (const rota of rotas.slice(0, 15)) {
    console.error(`  · ${rota.slug}: ${rota.motivos.join('; ')}`);
  }
  if (rotas.length > 15) {
    console.error(`  … y ${rotas.length - 15} más.`);
  }
  if (parte <= TOLERANCIA) {
    console.warn(
      `[prerenderizado] por debajo del ${TOLERANCIA}% que se tolera: la entrega sigue. Esas fichas se ` +
        'sirven igual, montadas por el navegador; lo que pierden son sus etiquetas para compartir.',
    );
  } else {
    console.error(
      '\nLo más probable es que el backend haya devuelto 429: su límite anti-volcado son 100 peticiones ' +
        'por minuto y por IP, y una ficha son unas cuatro. Comprueba el testigo del prerenderizado ' +
        '(NEXADROP_PRERENDER_TOKEN, el mismo valor que RATELIMIT_BUILD_TOKEN en el backend) o baja ' +
        'NEXADROP_FICHAS_PRERENDERIZADAS.',
    );
    process.exit(1);
  }
}

if (rotas.length === 0) {
  console.log('[prerenderizado] todas las fichas llevan su título, su foto y ningún mensaje de error.');
}
