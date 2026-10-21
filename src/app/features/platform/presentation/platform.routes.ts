import { Route, Routes } from '@angular/router';
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
 *
 * <p>Y SIN nodo envolvente de camino vacío, que es lo que tenía y dejó el PANEL DE CONTROL EN BLANCO.
 * Este grupo se cuelga de `/admin` ANTES que el del propio panel. Con un padre `path: ''`, la
 * dirección `/admin` —resto del camino vacío— la capturaba este grupo, que no tiene ninguna hija
 * vacía que la atienda, y el marco se pintaba con el contenido vacío. Las demás pantallas del panel
 * no lo notaban porque su resto del camino no está vacío.
 *
 * <p>Es la MISMA trampa que `admin.routes.ts` documenta y que ya se pagó una vez: un camino vacío
 * repartido entre varios grupos solo lo resuelve el primero. Se reintrodujo al insertar este grupo
 * por encima del suyo, y volvió a salir en blanco. Por eso aquí no hay padre: cada pantalla lleva
 * su camino y sus proveedores, y nada reclama el camino vacío.
 */
/**
 * Una ruta del panel: su pantalla y los proveedores de este contexto, SIN nodo envolvente.
 *
 * <p>Los proveedores van en cada ruta y no en un padre de camino vacío. Ese padre existía y costó
 * el panel de control entero: ver {@link rutasDelPanel}.
 */
function delPanel(camino: string, pantalla: Route['loadComponent']): Route {
  return { path: camino, loadComponent: pantalla, providers: [proveePlatform()] };
}

export const rutasDelPanel: Routes = [
  delPanel('shops', () => import('./page/tiendas.page').then((m) => m.TiendasPage)),
  delPanel('sourcing', () =>
    import('./page/aprovisionamiento.page').then((m) => m.AprovisionamientoPage),
  ),
  delPanel('intelligence', () =>
    import('./page/inteligencia.page').then((m) => m.InteligenciaPage),
  ),
  delPanel('odm', () => import('./page/odm.page').then((m) => m.OdmPage)),
  delPanel('pod', () => import('./page/pod.page').then((m) => m.PodPage)),
];
