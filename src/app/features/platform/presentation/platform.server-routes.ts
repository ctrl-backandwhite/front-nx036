import { RenderMode, ServerRoute } from '@angular/ssr';
import { TIPOS_DE_DOCUMENTO_LEGAL } from '../domain/model/documento-legal';

/**
 * Cómo se genera el HTML de las rutas de «platform».
 *
 * <p>Va PEGADO a las rutas del contexto y no en un fichero central a propósito: quien crea una pantalla
 * es quien sabe si su contenido es el mismo para todo el mundo —y entonces se escribe al construir— o
 * depende de quién mira —y entonces lo monta el navegador. En un fichero central, esa decisión se
 * olvida, y olvidarla del lado malo deja el esqueleto de una cuenta cacheado en el borde.
 *
 * <p>Va en un fichero aparte de `platform.routes.ts` para que al construir el HTML no se arrastren los
 * componentes: aquí solo hay datos.
 *
 * <p>ESTE contexto es el que más se prerenderiza de todos, y por eso todo está escrito explícitamente
 * aunque el comodín de `app.routes.server.ts` ya lo haría por defecto: son las páginas que ve un
 * buscador y las primeras que abre alguien que llega de fuera. Escribirlo deja constancia de la
 * decisión y hace que un cambio futuro tenga que ser deliberado.
 */
export const rutasDeServidor: ServerRoute[] = [
  // ── Escaparate público: mismo HTML para todo el mundo, escrito al construir ────────────────
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'connect', renderMode: RenderMode.Prerender },
  { path: 'conectar', renderMode: RenderMode.Prerender },
  { path: 'developers', renderMode: RenderMode.Prerender },

  /**
   * El estado del servicio TAMBIÉN se prerenderiza, y no es contradictorio: lo que se escribe al
   * construir es la página —cabecera, lista de componentes, textos—, y la comprobación la hace el
   * navegador al abrirla. Si se midiera al construir, el HTML diría «operativo» para siempre.
   */
  { path: 'status', renderMode: RenderMode.Prerender },

  { path: 'legal', renderMode: RenderMode.Prerender },

  /**
   * Los cinco documentos legales se escriben uno a uno.
   *
   * <p>Una ruta con parámetro no se puede prerenderizar sin saber qué valores existen, y aquí sí se
   * saben: son cinco y están cerrados en el dominio. La lista sale de ahí y no copiada a mano, para
   * que añadir un sexto documento no deje su página sin generar — que es un fallo que no se ve hasta
   * que alguien comparte el enlace y le llega un esqueleto vacío.
   *
   * <p>El idioma NO entra en la dirección: el HTML se escribe en el idioma por defecto y el navegador
   * lo sustituye al hidratar, con el texto que ya viaja compilado. Multiplicar cinco documentos por
   * ocho idiomas serían cuarenta páginas para un contenido que casi nadie lee en el idioma minoritario.
   */
  {
    path: 'legal/:doc',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => TIPOS_DE_DOCUMENTO_LEGAL.map((doc) => ({ doc })),
  },

  // ── Pantallas de plataforma: dependen de QUIÉN mira, así que las monta el navegador ────────
  //
  // Prerenderizarlas dejaría el esqueleto de una cuenta cacheado en el borde y servido a todo el
  // mundo. Ninguna de estas tiene valor para un buscador: sin sesión no enseñan nada.
  { path: 'shops', renderMode: RenderMode.Client },
  { path: 'admin/shops', renderMode: RenderMode.Client },
  { path: 'sourcing', renderMode: RenderMode.Client },
  { path: 'admin/sourcing', renderMode: RenderMode.Client },
  { path: 'intelligence', renderMode: RenderMode.Client },
  { path: 'admin/intelligence', renderMode: RenderMode.Client },
  { path: 'odm', renderMode: RenderMode.Client },
  { path: 'admin/odm', renderMode: RenderMode.Client },
  { path: 'pod', renderMode: RenderMode.Client },
  { path: 'admin/pod', renderMode: RenderMode.Client },

  // El comodín —la página de «no encontrada»— lo declara `app.routes.server.ts`, que ya prerenderiza.
];
