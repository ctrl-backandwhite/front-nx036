import { Routes } from '@angular/router';

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
