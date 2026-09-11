import { RenderMode, ServerRoute } from '@angular/ssr';

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
   * La FICHA la monta el NAVEGADOR, y ya no se escribe al construir.
   *
   * <p>Desde que el detalle exige cuenta, prerenderizarlo sería contradecir la propia decisión: el HTML
   * escrito al compilar lo sirve nginx como fichero estático a quien pida la dirección, sin pasar por
   * ningún guardián —el guardián vive en el navegador y solo actúa DESPUÉS—. Es decir: la ficha
   * quedaría cerrada en la aplicación y abierta en el borde, cacheada en Cloudflare y servida a
   * cualquiera. Cerrar una pantalla y dejar su HTML público no es cerrarla.
   *
   * <p>Lo que se pierde, dicho claro: las fichas dejan de ser indexables y las etiquetas para compartir
   * de un enlace a producto dejan de resolverse solas. Es el precio de exigir cuenta para verlas, y es
   * una decisión de negocio, no técnica. Si algún día se quiere lo uno y lo otro, la vía es servir a los
   * robots una versión reducida —título, foto y precio— sin el resto de la ficha.
   *
   * <p>FAVORITOS e HISTORIAL son de la cuenta: prerenderizarlos dejaría el esqueleto de una lista
   * personal cacheado en el borde.
   */
  { path: 'catalog/:slug', renderMode: RenderMode.Client },

  { path: 'favorites', renderMode: RenderMode.Client },
  { path: 'history', renderMode: RenderMode.Client },
];
