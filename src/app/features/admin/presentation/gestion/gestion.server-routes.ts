import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML del área de USUARIOS, FINANZAS Y SISTEMA.
 *
 * <p>TODO va en el navegador. Estas pantallas dependen enteras de quién mira: no hay ninguna versión
 * «para todo el mundo» que tenga sentido escribir al construir, y el comodín de la aplicación
 * PRERENDERIZA por defecto — dejar una fuera de esta lista significaría publicar el esqueleto de una
 * pantalla de administración como fichero estático, cacheado en el borde de la red.
 *
 * <p>Va en un fichero aparte de las rutas de navegación para que al construir el HTML no se arrastren
 * los componentes: aquí solo hay datos.
 *
 * <p>PENDIENTE DE INTEGRACIÓN: quien coordine el panel tiene que concatenar esta lista en
 * `presentation/admin.server-routes.ts`, que es el fichero que lee la aplicación. No se toca desde aquí
 * porque lo comparten las tres áreas del panel.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/dashboard', renderMode: RenderMode.Client },
  { path: 'admin/users', renderMode: RenderMode.Client },
  { path: 'admin/usuarios', renderMode: RenderMode.Client },
  { path: 'admin/wallets', renderMode: RenderMode.Client },
  { path: 'admin/wallets/:userId', renderMode: RenderMode.Client },
  { path: 'admin/billing', renderMode: RenderMode.Client },
  { path: 'admin/facturacion', renderMode: RenderMode.Client },
  { path: 'admin/pricing', renderMode: RenderMode.Client },
  { path: 'admin/precios', renderMode: RenderMode.Client },
  { path: 'admin/promotions', renderMode: RenderMode.Client },
  { path: 'admin/affiliates', renderMode: RenderMode.Client },
  { path: 'admin/partners', renderMode: RenderMode.Client },
  { path: 'admin/newsletter', renderMode: RenderMode.Client },
  { path: 'admin/academy', renderMode: RenderMode.Client },
  { path: 'admin/mentors', renderMode: RenderMode.Client },
  { path: 'admin/support', renderMode: RenderMode.Client },
  { path: 'admin/languages', renderMode: RenderMode.Client },
  { path: 'admin/currencies', renderMode: RenderMode.Client },
  { path: 'admin/legal', renderMode: RenderMode.Client },
  { path: 'admin/profile', renderMode: RenderMode.Client },
  { path: 'admin/perfil', renderMode: RenderMode.Client },
  { path: 'admin/styleguide', renderMode: RenderMode.Client },
];
