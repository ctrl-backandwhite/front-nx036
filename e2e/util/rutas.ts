/**
 * El catálogo de direcciones que hay que certificar.
 *
 * <p>NO está escrito a mano: se extrajo del `src/routes.ts` del frontend React, que es la fuente de la
 * verdad de lo que hoy existe. Escribirlo a mano habría dejado fuera precisamente lo que se olvida —los
 * alias, las vueltas de las pasarelas de pago— que es donde se esconden los agujeros de un porte.
 *
 * <p>Al añadir una pantalla al React hay que volver a extraerlo, o la certificación dejará de mirarla
 * sin decir nada.
 */

/** Abiertas a cualquiera. Son las que se PRERENDERIZAN, así que su HTML tiene que llegar ya pintado. */
export const RUTAS_PUBLICAS: readonly string[] = [
  '/about',
  '/activate',
  '/catalog/:slug',
  '/connect',
  '/contact',
  '/developers',
  '/legal/:doc',
  '/login',
  '/newsletter/unsubscribe',
  '/password-reset',
  '/register',
  '/status',
];

/** Exigen sesión. Se montan en el navegador: su contenido depende de quién mira. */
export const RUTAS_PRIVADAS: readonly string[] = [
  '/cart',
  '/addresses',
  '/affiliate',
  '/catalog',
  '/checkout',
  '/checkout/return',
  '/favorites',
  '/history',
  '/notifications',
  '/orders',
  '/orders/:id',
  '/profile',
  '/wallet',
  '/wallet/paypal-return',
  '/wallet/recharge',
  '/wallet/recharge/return',
];

/** Exigen sesión Y papel de administrador u operador. */
export const RUTAS_DE_PANEL: readonly string[] = [
  '/admin',
  '/admin/*',
  '/admin/academy',
  '/admin/admin',
  '/admin/affiliate',
  '/admin/affiliates',
  '/admin/billing',
  '/admin/browse',
  '/admin/browse/:slug',
  '/admin/carrier-limits',
  '/admin/catalog',
  '/admin/catalog/:id',
  '/admin/categories',
  '/admin/compliance',
  '/admin/currencies',
  '/admin/declaration-groups',
  '/admin/intelligence',
  '/admin/languages',
  '/admin/legal',
  '/admin/mentors',
  '/admin/newsletter',
  '/admin/notifications',
  '/admin/odm',
  '/admin/operator/earnings',
  '/admin/operators',
  '/admin/orders',
  '/admin/orders/:id',
  '/admin/partners',
  '/admin/pod',
  '/admin/pricing',
  '/admin/product-groups',
  '/admin/profile',
  '/admin/promotions',
  '/admin/purchases',
  '/admin/shops',
  '/admin/sourcing',
  '/admin/styleguide',
  '/admin/suppliers',
  '/admin/support',
  '/admin/taxes',
  '/admin/users',
  '/admin/wallets',
  '/admin/wallets/:userId',
  '/admin/warehouses',
];

/** Alias públicos que redirigen. Se certifican aparte: una redirección perdida es una página muerta. */
export const ALIAS_DE_ESCAPARATE: readonly string[] = [
  '/academy',
  '/conectar',
  '/intelligence',
  '/legal',
  '/mentors',
  '/odm',
  '/planes',
  '/plans',
  '/platform',
  '/pod',
  '/precios',
  '/prices',
  '/shops',
  '/sourcing',
  '/support',
  '/warehouses',
];

/** Alias del panel, con el mismo motivo. */
export const ALIAS_DE_PANEL: readonly string[] = [
  '/categorias',
  '/dashboard',
  '/facturacion',
  '/ordenes',
  '/perfil',
  '/precios',
  '/productos',
  '/products',
  '/proveedores',
  '/usuarios',
];

/**
 * Direcciones con parámetro, con un valor de ejemplo que EXISTE en la base local.
 *
 * <p>Se resuelven contra el backend antes de certificar (ver `resuelveEjemplos`): fijar aquí un
 * identificador a mano lo convierte en un fallo intermitente en cuanto alguien limpia los datos.
 */
export const RUTAS_CON_PARAMETRO: readonly { patron: string; comoResolver: string }[] = [
  { patron: '/catalog/:slug', comoResolver: '/api/catalog/products?size=1' },
  { patron: '/legal/:doc', comoResolver: 'fijo:terms' },
  { patron: '/orders/:id', comoResolver: '/api/me/orders?size=1' },
  { patron: '/admin/catalog/:id', comoResolver: '/api/admin/products?size=1' },
];

