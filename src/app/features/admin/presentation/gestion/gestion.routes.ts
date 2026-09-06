import { Routes } from '@angular/router';
import { exigeRol } from '@core/auth/sesion.guard';
import { proveeAdminGestion } from '../../gestion.providers';

/**
 * Rutas del área de USUARIOS, FINANZAS Y SISTEMA del panel.
 *
 * <p>Cuelgan de `/admin`, así que los caminos de aquí van SIN ese prefijo. Los proveedores del área se
 * declaran una sola vez, en la ruta que las agrupa: así se instancian al entrar al panel y no en el
 * arranque de la aplicación, y quien solo mira el escaparate no se descarga nada de esto.
 *
 * <p>Cada pantalla se carga EN DIFERIDO. Con dieciocho pantallas, bajarlas todas para enseñar una sola
 * es la diferencia entre que el panel abra al instante o tarde varios segundos en una conexión mala.
 *
 * <p>QUIÉN PUEDE ENTRAR. Todo el panel exige sesión y papel. La línea que separa los dos papeles es la
 * misma que separa atender el día a día de cambiar las reglas: quien OPERA ve el cuadro de mando, la
 * bandeja de soporte, la academia, los mentores y su propio perfil; todo lo que mueve DINERO
 * (carteras, planes, márgenes, promociones, pagos a afiliados), cambia IDENTIDADES (usuarios), reparte
 * CREDENCIALES (socios de integración) o escribe a toda la base de usuarios (boletín, textos legales)
 * queda reservado a administración.
 *
 * <p>Esto NO es la seguridad: la seguridad la aplica el backend en cada petición. Aquí solo se evita
 * enseñar una pantalla que de todos modos no se va a poder usar. El guardián es el ÚNICO de la
 * aplicación, el de `core`: mientras cada zona privada se escribía el suyo, había ocho parecidos y
 * ninguna garantía de que todos redirigieran igual.
 */

/** Quien opera el día a día. */
const OPERACION = exigeRol('ADMIN', 'OPERATOR');
/** Solo administración: dinero, identidades, credenciales y comunicaciones masivas. */
const SOLO_ADMINISTRACION = exigeRol('ADMIN');

export const rutas: Routes = [
  {
    path: '',
    providers: [proveeAdminGestion()],
    children: [
      // ── Resumen ────────────────────────────────────────────────────────────────────────────
      {
        path: '',
        pathMatch: 'full',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/panel.page').then((m) => m.PanelPage),
      },

      // ── Sistema: cuentas ───────────────────────────────────────────────────────────────────
      {
        path: 'users',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/usuarios.page').then((m) => m.UsuariosPage),
      },

      // ── Finanzas ───────────────────────────────────────────────────────────────────────────
      {
        path: 'wallets',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/carteras.page').then((m) => m.CarterasPage),
      },
      {
        path: 'wallets/:userId',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/cartera-detalle.page').then((m) => m.CarteraDetallePage),
      },
      {
        path: 'billing',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/facturacion.page').then((m) => m.FacturacionPage),
      },
      {
        path: 'pricing',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/precios.page').then((m) => m.PreciosPage),
      },
      {
        path: 'promotions',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/promociones.page').then((m) => m.PromocionesPage),
      },
      {
        path: 'affiliates',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/afiliados.page').then((m) => m.AfiliadosPage),
      },

      // ── Plataforma ─────────────────────────────────────────────────────────────────────────
      {
        path: 'partners',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/socios.page').then((m) => m.SociosPage),
      },

      // ── Crecimiento y formación ────────────────────────────────────────────────────────────
      {
        path: 'newsletter',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/boletin.page').then((m) => m.BoletinPage),
      },
      {
        path: 'academy',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/academia.page').then((m) => m.AcademiaPage),
      },
      {
        path: 'mentors',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/mentores.page').then((m) => m.MentoresPage),
      },

      /*
       * SOPORTE. En el React esta pantalla estaba HUÉRFANA: `AdminSupportPage` existía, pero
       * `/admin/support` montaba la página del escaparate (`platform/SupportPage`), que es la que ve
       * quien COMPRA —abre incidencias y consulta las suyas—. Es decir, quien atendía soporte desde el
       * panel no tenía a mano la bandeja de todos los tickets, y la pantalla escrita para eso no se
       * enseñaba en ninguna parte. Aquí se enruta la de administración, que es la que corresponde.
       */
      {
        path: 'support',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/soporte.page').then((m) => m.SoportePage),
      },

      // ── Sistema: configuración de la tienda ────────────────────────────────────────────────
      {
        path: 'languages',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/idiomas.page').then((m) => m.IdiomasPage),
      },
      {
        path: 'currencies',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/monedas.page').then((m) => m.MonedasPage),
      },
      {
        path: 'legal',
        canActivate: [SOLO_ADMINISTRACION],
        loadComponent: () => import('./page/legal.page').then((m) => m.LegalPage),
      },

      // ── Cuenta ─────────────────────────────────────────────────────────────────────────────
      {
        path: 'profile',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/perfil.page').then((m) => m.PerfilPage),
      },
      {
        path: 'styleguide',
        canActivate: [OPERACION],
        loadComponent: () => import('./page/guia-de-estilo.page').then((m) => m.GuiaDeEstiloPage),
      },

      /*
       * DIRECCIONES ANTIGUAS Y EN ESPAÑOL. Se redirigen en vez de duplicar la ruta: así hay UNA sola
       * dirección buena por pantalla —la que se comparte y la que se marca— y las demás llevan a ella
       * sin dejar dos páginas idénticas indexadas ni dos historiales distintos.
       */
      { path: 'dashboard', pathMatch: 'full', redirectTo: '' },
      { path: 'usuarios', pathMatch: 'full', redirectTo: 'users' },
      { path: 'facturacion', pathMatch: 'full', redirectTo: 'billing' },
      { path: 'precios', pathMatch: 'full', redirectTo: 'pricing' },
      { path: 'perfil', pathMatch: 'full', redirectTo: 'profile' },
    ],
  },
];
