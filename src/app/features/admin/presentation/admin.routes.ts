import { Routes } from '@angular/router';
import { coincideSiTieneRol, exigeRol } from '@core/auth/sesion.guard';
import { proveeAdminGestion } from '../gestion.providers';

/**
 * El PANEL DE CONTROL es de quien administra, y no «de la casa» como decía antes.
 *
 * <p>Se alimenta de `/api/admin/dashboard/**`, que el backend reserva a ADMIN igual que todo
 * `/api/admin/**` salvo pedidos y las ganancias del operador. A quien da soporte le salían las tarjetas
 * de facturación, márgenes y usuarios —rotuladas y maquetadas, porque eso se pinta antes de la primera
 * petición— para terminar vacías por un 403.
 */
const SOLO_ADMINISTRACION = exigeRol('ADMIN');

/**
 * Rutas del panel de administración.
 *
 * <p>El panel es, con diferencia, la parte más grande de la aplicación —unas 35 pantallas—, así que se
 * porta en tres ÁREAS trabajadas por equipos distintos: catálogo, logística y gestión. Este fichero solo
 * las junta; ninguna pantalla se declara aquí.
 *
 * <p>Cada área se carga EN DIFERIDO y por separado. No es un detalle: significa que quien entra a
 * revisar pedidos no se descarga el editor de productos ni el panel de precios. Con un solo bloque, el
 * panel entero viajaría en la primera pantalla que alguien abra de él.
 *
 * <p>El orden no importa entre áreas —sus caminos no se solapan— pero sí que ninguna declare un camino
 * vacío que se coma a las demás. Cada una lleva sus propios proveedores y su propio guardián de papel,
 * declarados en sus rutas, para que juntarlas aquí sea exactamente esto: tres líneas.
 */
export const rutas: Routes = [
  /*
   * El PANEL DE CONTROL se declara aquí, el primero, y no dentro de «gestión».
   *
   * Estaba allí y NUNCA se llegaba a él: al abrir /admin salía el marco con el menú y el contenido en
   * blanco. El motivo es que este fichero cuelga tres grupos del MISMO camino vacío, y el enrutador
   * prueba el primero —«catálogo»—, se lo carga, no encuentra dentro ninguna ruta vacía y ahí se queda:
   * con `loadChildren` no vuelve atrás para probar el hermano siguiente. Así que la pantalla de resumen,
   * que vive en el tercero, quedaba inalcanzable.
   *
   * Es la misma trampa que dejó la portada del escaparate en blanco, y por eso se anota otra vez: un
   * camino vacío repartido entre varios `loadChildren` solo resuelve el del primero.
   *
   * Se queda con sus propios proveedores porque son los de «gestión», que es de donde sale la pantalla.
   */
  {
    path: '',
    pathMatch: 'full',
    // `canMatch` y no solo `canActivate`: al negar, deja que el enrutador pruebe la ruta siguiente en
    // vez de cortar la navegación. Es lo que convierte `/admin` en dos destinos según quién mire.
    canMatch: [coincideSiTieneRol('ADMIN')],
    canActivate: [SOLO_ADMINISTRACION],
    providers: [proveeAdminGestion()],
    loadComponent: () => import('./gestion/page/panel.page').then((m) => m.PanelPage),
  },

  /*
   * La puerta de quien da soporte.
   *
   * <p>Al entrar se le manda a `/admin` igual que a quien administra —lo decide `destinoPorDefecto`—,
   * así que cerrar el panel de control sin más le dejaba en el escaparate en cada acceso: una regresión
   * causada por el propio arreglo. Aquí se le lleva a los pedidos, que es su trabajo y lo único del
   * panel que el backend le abre entero.
   *
   * <p>Va DESPUÉS del panel de control y antes de los tres grupos en diferido: solo lo alcanza quien no
   * ha pasado el `canMatch` anterior.
   */
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: '',
    loadChildren: () => import('./catalogo/catalogo.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('./logistica/logistica.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('./gestion/gestion.routes').then((m) => m.rutas),
  },
];
