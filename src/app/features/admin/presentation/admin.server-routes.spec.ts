import { RenderMode } from '@angular/ssr';
import { Routes } from '@angular/router';
import { rutas as catalogo } from './catalogo/catalogo.routes';
import { rutas as gestion } from './gestion/gestion.routes';
import { rutas as logistica } from './logistica/logistica.routes';
import { rutasDeServidor } from './admin.server-routes';

/**
 * Cada pantalla del panel tiene que estar en las DOS listas: la del router y la de rutas de servidor.
 *
 * <p><b>Qué se rompía.</b> El 11-nov-2026 se añadió `/admin/carrier-coverage` al router y al menú, y
 * nadie la añadió aquí. El resultado no fue un error: el comodín de `app.routes.server.ts`
 * PRERENDERIZA por defecto, así que esa pantalla se escribió al construir, con el guardián corriendo
 * sin sesión, y lo que quedó en el disco fue una redirección al catálogo. En el navegador la ruta
 * «existía» —nginx servía el fichero y devolvía 200— y llevaba al catálogo. Ni 404, ni consola, ni
 * aviso en el build: una pantalla recién hecha, desplegada y simplemente inalcanzable.
 *
 * <p>Y la cara fea del mismo fallo: lo que se prerenderiza acaba cacheado en el borde. Una pantalla
 * del panel que se cuele en el comodín deja su esqueleto en Cloudflare para quien pase.
 *
 * <p>Es la misma clase de trampa que el mapa de rutas conocidas de `nginx.conf` y que el de robots:
 * dos listas que tienen que decir lo mismo y ningún mecanismo que lo compruebe. Esta prueba ES ese
 * mecanismo; sin ella la norma es una nota en un comentario que el siguiente no lee.
 */
describe('las rutas de servidor del panel', () => {
  /** Aplana el árbol del router a los caminos completos que de verdad se pueden abrir. */
  const caminos = (rutas: Routes, prefijo: string): string[] =>
    rutas.flatMap((ruta) => {
      const propio = [prefijo, ruta.path].filter((trozo) => trozo !== '' && trozo !== undefined);
      const camino = propio.join('/');
      // Una ruta sin camino solo agrupa (guardianes y proveedores): no se abre, pero sus hijas sí.
      const hijas = ruta.children ? caminos(ruta.children, camino) : [];
      const seAbre = ruta.loadComponent !== undefined || ruta.redirectTo !== undefined;
      return seAbre ? [camino, ...hijas] : hijas;
    });

  const delRouter = [
    // La raíz del panel no la declara ningún área: vive en `app.routes.ts`, con el marco y el
    // guardián del grupo. Se cuenta aquí porque su ruta de servidor sí la declara un área.
    'admin',
    ...caminos(catalogo, 'admin'),
    ...caminos(gestion, 'admin'),
    ...caminos(logistica, 'admin'),
  ];
  const delServidor = rutasDeServidor.map((ruta) => ruta.path);

  it('cubren todas las pantallas que declara el router', () => {
    const sinDeclarar = delRouter.filter((camino) => !delServidor.includes(camino));
    expect(sinDeclarar).toEqual([]);
  });

  it('no declaran ninguna pantalla que el router no conozca', () => {
    // La lista sobrante es igual de dañina: una ruta de servidor huérfana hace creer que la pantalla
    // sigue ahí, y el día que alguien la busque no la encontrará en el router.
    const sobrantes = delServidor.filter((camino) => !delRouter.includes(camino));
    expect(sobrantes).toEqual([]);
  });

  it('se generan todas en el navegador, nunca prerenderizadas', () => {
    // Prerenderizar una pantalla del panel deja su esqueleto cacheado en el borde para cualquiera.
    const prerenderizadas = rutasDeServidor
      .filter((ruta) => ruta.renderMode !== RenderMode.Client)
      .map((ruta) => ruta.path);
    expect(prerenderizadas).toEqual([]);
  });
});
