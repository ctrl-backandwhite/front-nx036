import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { slugsAPrerenderizar } from './fichas-a-prerenderizar';

/**
 * Cómo se genera el HTML de las rutas de «catalog».
 *
 * <p>Va PEGADO a las rutas del contexto y no en un fichero central a propósito: quien crea una pantalla
 * es quien sabe si su contenido es el mismo para todo el mundo —y entonces se escribe al construir— o
 * depende de quién mira —y entonces lo monta el navegador—. En un fichero central esa decisión se
 * olvida, y olvidarla del lado malo deja cacheado en el borde el esqueleto de una cuenta.
 *
 * <p>Va en un fichero aparte de `catalog.routes.ts` para que al construir el HTML no se arrastren los
 * componentes: aquí solo hay datos.
 *
 * <p>Qué se decide aquí, y por qué:
 * <ul>
 *   <li>La PORTADA se prerenderiza: es pública, la misma para todo el mundo y la primera que abre quien
 *       llega de fuera, así que conviene que llegue ya pintada.
 *   <li>El LISTADO lo monta el navegador: exige cuenta, sus filtros vienen en la dirección y su orden
 *       se baraja por visita. Un HTML escrito al construir se quedaría con una baraja fija para todos.
 *   <li>La FICHA se prerenderiza, pero SOLO UN SUBCONJUNTO. Ver el bloque de abajo.
 *   <li>FAVORITOS e HISTORIAL son de la cuenta: prerenderizarlos dejaría el esqueleto de una lista
 *       personal cacheado en el borde.
 * </ul>
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'catalog', renderMode: RenderMode.Client },

  /**
   * La FICHA: un subconjunto escrito al construir, el resto en el navegador.
   *
   * <p>El problema es de tamaño: hay 7.729 productos y el HTML de una ficha pesa entre 105 y 466 kB,
   * así que escribirlas todas serían del orden de 1,5 GB dentro de la imagen. Y no se arreglaría del
   * todo: el catálogo crece entre despliegues, y lo que se cargue mañana volvería a quedarse sin
   * etiquetas al compartirlo, que es justo el problema a resolver.
   *
   * <p>De ahí las dos mitades de esta declaración:
   * <ul>
   *   <li>`getPrerenderParams` elige las que MÁS SE COMPARTEN —las de la portada y las más vendidas—
   *       preguntándoselo al backend al compilar. El criterio y el porqué, en
   *       `fichas-a-prerenderizar.ts`.
   *   <li>`fallback: PrerenderFallback.Client` es la mitad que garantiza que no se rompe nada: toda
   *       ficha que quede fuera del subconjunto —incluidas las que se carguen DESPUÉS de compilar— se
   *       sirve como hasta ahora, con el esqueleto y montada por el navegador. Ninguna ficha deja de
   *       verse. Tiene que ser `Client` y no `Server`: aquí no hay servidor Node al que caer.
   * </ul>
   *
   * <p>Y convive con `seo-ficha.js`, que ya resuelve las etiquetas para compartir de las 7.729 en la
   * pasarela: para las que SÍ están prerenderizadas, la pasarela toma el HTML ya pintado como
   * plantilla en vez del esqueleto vacío, de modo que el robot recibe el `<head>` fresco Y el cuerpo
   * del producto. El detalle está escrito en `seo-ficha.js` y en `nginx.conf`.
   *
   * <p>OJO al declararla: una ruta con parámetro en `Prerender` SIN `getPrerenderParams` tumba la
   * compilación en seco con «getPrerenderParams is missing». Ya pasó una vez y dejó el repositorio sin
   * poder construirse; por eso las dos llaves van juntas y por eso `admin/browse/:slug` sigue en
   * `Client` en `app.routes.server.ts`, fuera del alcance del comodín.
   */
  {
    path: 'catalog/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: async () => (await slugsAPrerenderizar()).map((slug) => ({ slug })),
  },

  { path: 'favorites', renderMode: RenderMode.Client },
  { path: 'history', renderMode: RenderMode.Client },
];
