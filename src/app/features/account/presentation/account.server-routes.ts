import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de las rutas de «account».
 *
 * <p>Va PEGADO a las rutas del contexto y no en un fichero central a propósito: quien crea una pantalla
 * es quien sabe si su contenido es el mismo para todo el mundo —y entonces se escribe al construir— o
 * depende de quién mira —y entonces lo monta el navegador. En un fichero central, esa decisión se olvida,
 * y olvidarla del lado malo deja el esqueleto de una cuenta cacheado en el borde.
 *
 * <p>Va en un fichero aparte de `account.routes.ts` para que al construir el HTML no se arrastren los
 * componentes: aquí solo hay datos.
 *
 * <p>Las TRES pantallas dependen de quién mira:
 * <ul>
 *   <li>El perfil y las direcciones son la cuenta de una persona. Prerenderizarlas dejaría su esqueleto
 *       —y con él la estructura de una cuenta ajena— guardado en el nodo de borde más cercano.</li>
 *   <li>La página de precios es pública, pero sus importes los convierte el backend a la divisa y al
 *       país de quien mira, y el botón cambia según haya sesión o no. Un precio escrito al construir
 *       sería el precio de otro para casi todo el que la abra, y en esta plataforma el país de registro
 *       es justo lo que decide el margen.</li>
 * </ul>
 *
 * <p>Lo que no se declare cae en el comodín de `app.routes.server.ts`, que PRERENDERIZA. Es el valor
 * correcto por defecto para el escaparate; toda ruta con sesión tiene que aparecer aquí como `Client`.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'addresses', renderMode: RenderMode.Client },
  { path: 'pricing', renderMode: RenderMode.Client },
  // Los caminos alternativos solo redirigen: no tienen HTML propio que escribir al construir.
  { path: 'precios', renderMode: RenderMode.Client },
  { path: 'prices', renderMode: RenderMode.Client },
  { path: 'planes', renderMode: RenderMode.Client },
  { path: 'plans', renderMode: RenderMode.Client },
];
