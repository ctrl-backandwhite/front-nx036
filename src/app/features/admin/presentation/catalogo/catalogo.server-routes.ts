import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML del área de catálogo del panel: SIEMPRE en el navegador.
 *
 * <p>Todo lo de aquí depende de quién mira —hace falta sesión y papel de administrador u operador—, así
 * que prerenderizarlo dejaría el esqueleto de una pantalla privada cacheado en el borde, servido a
 * quien no ha entrado. `RenderMode.Client` es lo que lo impide.
 *
 * <p>Va en un fichero aparte de las rutas de navegación para que al construir el HTML no se arrastren
 * los componentes: aquí solo hay datos. Quien coordina lo junta en `admin.server-routes.ts`.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'admin/catalog', renderMode: RenderMode.Client },
  { path: 'admin/catalog/:id', renderMode: RenderMode.Client },
  { path: 'admin/categories', renderMode: RenderMode.Client },
  { path: 'admin/suppliers', renderMode: RenderMode.Client },
  { path: 'admin/product-groups', renderMode: RenderMode.Client },
  { path: 'admin/declaration-groups', renderMode: RenderMode.Client },
  { path: 'admin/productos', renderMode: RenderMode.Client },
  { path: 'admin/products', renderMode: RenderMode.Client },
  { path: 'admin/categorias', renderMode: RenderMode.Client },
  { path: 'admin/proveedores', renderMode: RenderMode.Client },
];
