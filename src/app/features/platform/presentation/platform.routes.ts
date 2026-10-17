import { Routes } from '@angular/router';
import { exigeSesion } from '@core/auth/sesion.guard';
import { proveePlatform } from '../platform.providers';

/**
 * Rutas del contexto «platform».
 *
 * <p>Cada contexto declara las suyas y `app.routes.ts` las carga en diferido. Es lo que hace que el
 * navegador se baje solo la parte de la aplicación que hace falta, y de paso que dos equipos puedan
 * trabajar en contextos distintos sin editar el mismo fichero.
 *
 * <p>Los proveedores cuelgan de estas rutas (`providers`) y no de la raíz: quien entra a mirar el
 * catálogo no tiene por qué cargar con los adaptadores de la documentación ni con los de impresión
 * bajo demanda.
 *
 * <p>Los ALIAS —`/conectar`, `/shops`, `/sourcing`…— se resuelven aquí con `redirectTo` en vez de
 * montar el mismo componente dos veces. Dos direcciones que sirven la misma página son contenido
 * duplicado para un buscador; una redirección deja claro cuál es la buena.
 *
 * <p>El guardián es el ÚNICO de la aplicación, el de `@core/auth`. No se escribe uno propio: cuando
 * cada contexto tenía el suyo, había ocho parecidos y ninguno idéntico, y no había forma de asegurar
 * que todos redirigieran igual ni que todos esperaran a saber quién mira antes de decidir.
 *
 * <p><b>Las variantes bajo `/admin/…` NO se declaran aquí.</b> Estuvieron, y el resultado era que
 * `/admin/shops` o `/admin/sourcing` se pintaban con la cabecera y el pie del ESCAPARATE: quien las
 * abría desde el menú del panel se quedaba sin barra lateral, como si hubiera salido de la casa. Lo
 * que dan el marco son las rutas hijas de `admin` en `app.routes.ts`, y allí están montadas junto a
 * `browse` y `affiliate` por la misma razón que ellas: juntar dos contextos es componer, y componer
 * se hace en la raíz.
 *
 * <p>Las públicas —«sobre nosotros», legales, conexión, documentación, estado— no llevan guardián a
 * propósito: son justo las que tienen que poder abrirse sin cuenta y las que indexa un buscador.
 */
export const rutas: Routes = [
  {
    path: '',
    providers: [proveePlatform()],
    children: [
      {
        path: 'about',
        data: { seo: { titulo: 'seo.about.title', descripcion: 'seo.about.desc' } },
        loadComponent: () =>
          import('./page/sobre-nosotros.page').then((m) => m.SobreNosotrosPage),
      },
      {
        path: 'connect',
        data: { privada: true },
        loadComponent: () =>
          import('./page/conecta-tu-tienda.page').then((m) => m.ConectaTuTiendaPage),
      },
      { path: 'conectar', redirectTo: 'connect', pathMatch: 'full' },
      {
        path: 'developers',
        data: { privada: true },
        loadComponent: () =>
          import('./page/desarrolladores.page').then((m) => m.DesarrolladoresPage),
      },
      {
        path: 'status',
        data: { seo: { titulo: 'seo.status.title', descripcion: 'seo.status.desc' } },
        loadComponent: () =>
          import('./page/estado-del-servicio.page').then((m) => m.EstadoDelServicioPage),
      },
      {
        // Sin documento no hay página: se manda a la privacidad, que es la que más se busca.
        path: 'legal',
        redirectTo: 'legal/privacy',
        pathMatch: 'full',
      },
      {
        path: 'legal/:doc',
        // Se PRECARGA de fondo, dos segundos después del arranque: el aviso de cookies enlaza aquí y
        // está en todas las páginas de la web, así que es la ruta de este contexto a la que más gente
        // llega —y desde cualquier sitio—. Las demás no se marcan: precargarlo todo compite con lo que
        // la persona está mirando ahora.
        data: { precarga: true },
        loadComponent: () =>
          import('./page/documento-legal.page').then((m) => m.DocumentoLegalPage),
      },

      // ── Pantallas de plataforma: exigen sesión, así que su HTML lo monta el navegador ──────
      {
        path: 'shops',
        canActivate: [exigeSesion],
        data: { privada: true },
        loadComponent: () => import('./page/tiendas.page').then((m) => m.TiendasPage),
      },
      {
        path: 'sourcing',
        canActivate: [exigeSesion],
        data: { privada: true },
        loadComponent: () =>
          import('./page/aprovisionamiento.page').then((m) => m.AprovisionamientoPage),
      },
      {
        path: 'intelligence',
        canActivate: [exigeSesion],
        data: { privada: true },
        loadComponent: () => import('./page/inteligencia.page').then((m) => m.InteligenciaPage),
      },
      {
        path: 'odm',
        canActivate: [exigeSesion],
        data: { privada: true },
        loadComponent: () => import('./page/odm.page').then((m) => m.OdmPage),
      },
      {
        path: 'pod',
        canActivate: [exigeSesion],
        data: { privada: true },
        loadComponent: () => import('./page/pod.page').then((m) => m.PodPage),
      },

      /**
       * El comodín va AL FINAL y dentro de este contexto: la página de «no encontrada» es de
       * «platform». Al montarse aquí, `app.routes.ts` tiene que cargar este contexto el último —y así
       * está declarado—, porque un comodín antes de tiempo se tragaría las rutas de los demás.
       */
      {
        path: '**',
        data: { privada: true },
        loadComponent: () => import('./page/no-encontrada.page').then((m) => m.NoEncontradaPage),
      },
    ],
  },
];

/**
 * Las pantallas de este contexto que el PANEL enseña dentro de su marco: tiendas, aprovisionamiento,
 * inteligencia, ODM e impresión bajo demanda.
 *
 * <p>Se exportan aparte para que `app.routes.ts` las cuelgue del nodo `admin` —que es quien monta la
 * barra lateral— sin importar de aquí nada en firme: con un import normal, los proveedores de este
 * contexto entran en el paquete inicial y el presupuesto de arranque se pasa en 115 kB.
 *
 * <p>Sin guardián propio: el nodo del que cuelgan ya exige ADMIN u OPERATOR, y repetirlo aquí sería
 * tener dos sitios donde cambiar lo mismo.
 */
export const rutasDelPanel: Routes = [
  {
    path: '',
    providers: [proveePlatform()],
    children: [
      {
        path: 'shops',
        loadComponent: () => import('./page/tiendas.page').then((m) => m.TiendasPage),
      },
      {
        path: 'sourcing',
        loadComponent: () =>
          import('./page/aprovisionamiento.page').then((m) => m.AprovisionamientoPage),
      },
      {
        path: 'intelligence',
        loadComponent: () => import('./page/inteligencia.page').then((m) => m.InteligenciaPage),
      },
      {
        path: 'odm',
        loadComponent: () => import('./page/odm.page').then((m) => m.OdmPage),
      },
      {
        path: 'pod',
        loadComponent: () => import('./page/pod.page').then((m) => m.PodPage),
      },
    ],
  },
];
