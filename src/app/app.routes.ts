import { Routes } from '@angular/router';
import { PaginaDeEscaparate } from './layout/escaparate/pagina-de-escaparate';
import { PaginaDePanel } from './layout/admin/pagina-de-panel';
import {
  proveeAcompanantesDelCatalogo,
  proveeCatalogo,
} from '@features/catalog/catalog.providers';
import { proveeAfiliado } from '@features/affiliate/affiliate.providers';
import { exigeRol, exigeSesion } from '@core/auth/sesion.guard';
import { rutas as rutasDeAcceso } from '@features/auth/presentation/auth.routes';

/**
 * El mapa de rutas de la aplicación.
 *
 * <p>Aquí no hay ninguna pantalla: solo el reparto por contexto acotado y qué MARCO envuelve a cada
 * grupo. Cada contexto declara sus rutas en su propio fichero y se carga en diferido, de modo que quien
 * entra a mirar el catálogo no se descarga el panel de administración.
 *
 * <p>Tres grupos, y la diferencia entre ellos es el marco:
 *
 * <ul>
 *   <li><b>Sin marco</b> — acceso, alta, activación, restablecer contraseña, vuelta del acceso social y
 *       baja del boletín. Son pantallas que se abren solas, muchas veces desde un correo, y la cabecera
 *       de la tienda alrededor distrae de lo único que hay que hacer en ellas. El front anterior hacía
 *       lo mismo.
 *   <li><b>Marco del escaparate</b> — todo lo demás de cara al público y la zona de cliente.
 *   <li><b>Marco del panel</b> — la administración, con su barra lateral.
 * </ul>
 *
 * <p>El orden importa: lo más específico primero. `admin` va antes que el grupo de camino vacío, o este
 * se lo tragaría.
 */
export const routes: Routes = [
  /* ── Pantallas sueltas, sin marco ──────────────────────────────────────────────────────────
   *
   * Se montan con `...` y no con `loadChildren` bajo un camino vacío. La diferencia no es de estilo:
   * un `path: ''` con carga en diferido CONSUME el intento de resolución, y si el grupo cargado no
   * contiene la dirección pedida, el enrutador no siempre vuelve atrás a probar los grupos siguientes.
   * Con la portada eso se traducía en un documento sin nada dentro.
   *
   * Solo se carga por adelantado la TABLA de rutas, que son unas líneas; cada pantalla sigue
   * descargándose cuando se entra en ella, porque el diferido está en cada `loadComponent`. */
  ...rutasDeAcceso,

  // La baja del boletín se agrupa aquí, con las pantallas de acceso: son las «páginas sueltas, sin el
  // marco de la tienda» del front anterior. Ver el porqué en `notifications.routes.ts`.
  {
    path: 'newsletter/unsubscribe',
    loadChildren: () =>
      import('@features/notifications/presentation/notifications.routes').then(
        (m) => m.rutasSinMarco,
      ),
  },


  /* ── Alias del panel ────────────────────────────────────────────────────────────────────────
   *
   * Direcciones cortas que el front anterior redirige al panel: `/academy` lleva a
   * `/admin/academy`, y `/platform` al panel a secas. Se descubrieron al certificar, porque en el
   * Angular NO EXISTÍAN: caían en la página de «no encontrado», y con la cabecera y el pie alrededor
   * parecían una página vacía en vez de un error.
   *
   * Son enlaces que la gente tiene guardados y que aparecen en correos enviados hace meses, así que
   * perderlos no se nota hasta que alguien se queja. Van aquí, en la raíz, porque redirigen fuera del
   * escaparate y no pertenecen a ningún contexto. */
  { path: 'academy', redirectTo: 'admin/academy', pathMatch: 'full' },
  { path: 'dashboard', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'productos', redirectTo: 'admin/productos', pathMatch: 'full' },
  { path: 'products', redirectTo: 'admin/products', pathMatch: 'full' },
  { path: 'categorias', redirectTo: 'admin/categorias', pathMatch: 'full' },
  { path: 'proveedores', redirectTo: 'admin/proveedores', pathMatch: 'full' },
  { path: 'ordenes', redirectTo: 'admin/ordenes', pathMatch: 'full' },
  { path: 'facturacion', redirectTo: 'admin/facturacion', pathMatch: 'full' },
  { path: 'usuarios', redirectTo: 'admin/usuarios', pathMatch: 'full' },
  { path: 'perfil', redirectTo: 'admin/perfil', pathMatch: 'full' },
  { path: 'mentors', redirectTo: 'admin/mentors', pathMatch: 'full' },
  { path: 'warehouses', redirectTo: 'admin/warehouses', pathMatch: 'full' },
  { path: 'platform', redirectTo: 'admin', pathMatch: 'full' },

  // ── Panel de administración ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: PaginaDePanel,
    /* El guardián va en el PADRE, no solo en las hijas.
     *
     * Cada área del panel protegía sus propias rutas, pero `/admin` a secas no tenía guardián: quien no
     * había entrado veía el marco entero con su barra de secciones —«Resumen», «Dashboard», los
     * nombres de todo el back-office— antes de que nadie le echara. No filtraba datos, porque los pide
     * la API con credencial, pero sí el mapa de la casa. Lo destapó la certificación comparando qué
     * pasa al abrir `/admin` sin sesión en cada front. */
    canActivate: [exigeRol('ADMIN', 'OPERATOR')],
    children: [
      /*
       * Tres pantallas del ESCAPARATE dentro del marco del panel, como en el front anterior. No son
       * copias: son las mismas, con el menú lateral alrededor, para que quien administra pueda mirar el
       * catálogo o su cuenta de afiliado sin salir de aquí.
       *
       * Faltaban las tres y el menú del panel YA las enlazaba: «Explorar catálogo» y la entrada de
       * afiliado llevaban a una página de «no encontrada». Un enlace del propio menú que no lleva a
       * ninguna parte es de lo peor que puede tener un panel: quien lo pulsa cree que está roto.
       *
       * Van AQUÍ y no en las rutas del panel porque juntar dos contextos es componer, y componer se
       * hace en la raíz. El contexto «admin» no puede entrar en las tripas de «catalog» ni de
       * «affiliate» —el lint lo impide, y es la regla que sostiene el diseño—, pero este fichero sí.
       */
      {
        path: 'browse',
        providers: [proveeCatalogo()],
        loadComponent: () =>
          import('@features/catalog/presentation/page/listado.page').then((m) => m.ListadoPage),
      },
      {
        path: 'browse/:slug',
        providers: [proveeCatalogo()],
        loadComponent: () =>
          import('@features/catalog/presentation/page/ficha.page').then((m) => m.FichaPage),
      },
      {
        path: 'affiliate',
        providers: [proveeAfiliado()],
        loadComponent: () =>
          import('./composition/afiliado-ensamblado').then((m) => m.AfiliadoEnsamblado),
      },
      {
        path: '',
        loadChildren: () => import('@features/admin/presentation/admin.routes').then((m) => m.rutas),
      },
    ],
  },

  // ── Escaparate y zona de cliente ────────────────────────────────────────────────────────────
  {
    path: '',
    component: PaginaDeEscaparate,
    /* Lo que necesitan los ACOMPAÑANTES del marco —la guía de bienvenida y la vista rápida—, y solo
     * ellos. Va en esta ruta y no dentro del catálogo porque los dos se pintan sobre cualquier pantalla
     * del escaparate: quien entra por `/orders` también puede abrir la guía desde el asistente, y allí
     * los proveedores del catálogo no existen. */
    providers: [proveeAcompanantesDelCatalogo()],
    children: [
      {
        path: '',
        loadChildren: () => import('@features/catalog/presentation/catalog.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/cart/presentation/cart.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/checkout/presentation/checkout.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/orders/presentation/orders.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/wallet/presentation/wallet.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/account/presentation/account.routes').then((m) => m.rutas),
      },
      /*
       * El panel del afiliado va ENSAMBLADO: lleva dentro el interruptor de correo comercial, que es del
       * contexto del buzón. Juntar dos contextos es componer, y componer se hace aquí — el contexto
       * «affiliate» no puede entrar en las tripas de «notifications», y esa prohibición es la que
       * mantiene a los dos capaces de evolucionar por separado.
       *
       * Por eso esta entrada sustituye al `loadChildren` de las rutas del contexto, que sirven a
       * `/admin/affiliate` de la misma forma unas líneas más arriba.
       */
      {
        path: 'affiliate',
        canActivate: [exigeSesion],
        providers: [proveeAfiliado()],
        loadComponent: () =>
          import('./composition/afiliado-ensamblado').then((m) => m.AfiliadoEnsamblado),
      },
      {
        path: '',
        loadChildren: () =>
          import('@features/notifications/presentation/notifications.routes').then((m) => m.rutas),
      },
      {
        path: '',
        loadChildren: () => import('@features/support/presentation/support.routes').then((m) => m.rutas),
      },
      // El comodín de «no encontrada» lo declara «platform», así que va el ÚLTIMO: cualquier grupo
      // añadido detrás quedaría tapado por él.
      {
        path: '',
        loadChildren: () => import('@features/platform/presentation/platform.routes').then((m) => m.rutas),
      },
    ],
  },
];
