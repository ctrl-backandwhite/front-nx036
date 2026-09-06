import { Route, Routes } from '@angular/router';
import { exigeRol } from '@core/auth/sesion.guard';
import { proveeAdminCatalogo } from '../../catalogo.providers';

/**
 * Rutas del ÁREA DE CATÁLOGO del panel.
 *
 * <p>Se declaran aquí, y no en `admin.routes.ts`, porque el panel se porta entre varios equipos a la
 * vez: cada área trae sus rutas y quien coordina las junta. Todas cuelgan de `/admin`, así que los
 * caminos van sin ese prefijo.
 *
 * <p>Cada ruta lleva SU guardián y SUS proveedores en vez de heredarlos de una ruta padre común: así
 * este bloque se puede pegar tal cual junto al de las otras áreas sin que el orden ni el anidamiento
 * cambien nada. Los proveedores van en la ruta —no en la raíz— para que quien entra a mirar la tienda
 * no se descargue el panel.
 *
 * <p>El guardián es el del NÚCLEO, uno solo para toda la aplicación. Vivía dentro del contexto de
 * autenticación y eso obligaba a cada área a entrar en sus tripas —cosa que la regla de dependencia
 * prohíbe—, así que cada equipo acabó escribiéndose el suyo.
 */
function delCatalogo(camino: string, pantalla: Route['loadComponent']): Route {
  return {
    path: camino,
    loadComponent: pantalla,
    // NO es la seguridad: esa la aplica el backend en cada petición. Aquí solo se evita enseñar una
    // pantalla que de todos modos no se va a poder usar.
    canActivate: [exigeRol('ADMIN', 'OPERATOR')],
    providers: [proveeAdminCatalogo()],
  };
}

export const rutas: Routes = [
  delCatalogo('catalog', () => import('./page/catalogo.page').then((m) => m.CatalogoPage)),
  delCatalogo('catalog/:id', () =>
    import('./page/ficha-de-producto.page').then((m) => m.FichaDeProductoPage),
  ),
  delCatalogo('categories', () => import('./page/categorias.page').then((m) => m.CategoriasPage)),
  delCatalogo('suppliers', () => import('./page/proveedores.page').then((m) => m.ProveedoresPage)),
  delCatalogo('product-groups', () =>
    import('./page/grupos-de-productos.page').then((m) => m.GruposDeProductosPage),
  ),
  delCatalogo('declaration-groups', () =>
    import('./page/grupos-de-declaracion.page').then((m) => m.GruposDeDeclaracionPage),
  ),

  // Direcciones antiguas y en español que siguen repartidas por correos y marcadores. Redirigen en vez
  // de duplicar la pantalla: dos rutas al mismo componente dan dos direcciones canónicas y parten el SEO
  // interno y las estadísticas.
  { path: 'productos', redirectTo: 'catalog', pathMatch: 'full' },
  { path: 'products', redirectTo: 'catalog', pathMatch: 'full' },
  { path: 'categorias', redirectTo: 'categories', pathMatch: 'full' },
  { path: 'proveedores', redirectTo: 'suppliers', pathMatch: 'full' },
];
