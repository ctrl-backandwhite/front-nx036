/**
 * El mapa del panel que alimenta la búsqueda rápida (Ctrl/⌘+K).
 *
 * <p>Es un índice ESCRITO, no una consulta: la paleta busca entre las pantallas del panel, no entre los
 * datos. Así no hace falta ningún endpoint nuevo y responde al instante mientras se teclea; quien busca
 * un producto concreto entra a la pantalla y busca allí.
 *
 * <p>Los rótulos son CLAVES de traducción, no texto: esta lista se pinta en ocho idiomas.
 */
export interface EntradaDelPanel {
  /** Clave de la sección bajo la que se agrupa. */
  readonly seccion: string;
  /** Clave del rótulo de la pantalla. */
  readonly etiqueta: string;
  readonly destino: string;
  /** Qué familia de icono le corresponde; la pantalla decide el dibujo concreto. */
  readonly icono: 'catalogo' | 'ventas' | 'llave' | 'personas';
}

export const MAPA_DEL_PANEL: readonly EntradaDelPanel[] = [
  { seccion: 'admin.section.catalog', etiqueta: 'admin.nav.products', destino: '/admin/catalog', icono: 'catalogo' },
  { seccion: 'admin.section.catalog', etiqueta: 'admin.nav.categories', destino: '/admin/categories', icono: 'catalogo' },
  { seccion: 'admin.section.catalog', etiqueta: 'admin.nav.suppliers', destino: '/admin/suppliers', icono: 'catalogo' },
  { seccion: 'admin.section.catalog', etiqueta: 'admin.nav.warehouses', destino: '/admin/warehouses', icono: 'catalogo' },
  { seccion: 'admin.section.catalog', etiqueta: 'admin.nav.pricing', destino: '/admin/pricing', icono: 'catalogo' },
  { seccion: 'admin.section.operations', etiqueta: 'admin.nav.orders', destino: '/admin/orders', icono: 'ventas' },
  { seccion: 'admin.section.operations', etiqueta: 'admin.nav.shops', destino: '/admin/shops', icono: 'ventas' },
  { seccion: 'admin.section.finance', etiqueta: 'admin.nav.billing', destino: '/admin/billing', icono: 'llave' },
  { seccion: 'admin.section.finance', etiqueta: 'admin.nav.wallets', destino: '/admin/wallets', icono: 'llave' },
  { seccion: 'admin.section.system', etiqueta: 'admin.nav.users', destino: '/admin/users', icono: 'personas' },
  { seccion: 'admin.section.system', etiqueta: 'admin.nav.partners', destino: '/admin/partners', icono: 'llave' },
  { seccion: 'admin.section.system', etiqueta: 'admin.notifications.title', destino: '/admin/notifications', icono: 'llave' },
  { seccion: 'admin.section.account', etiqueta: 'admin.nav.profile', destino: '/admin/profile', icono: 'personas' },
  { seccion: 'admin.section.account', etiqueta: 'admin.nav.styleguide', destino: '/admin/styleguide', icono: 'personas' },
];

/**
 * Filtra el índice por lo tecleado.
 *
 * <p>Se compara contra el TEXTO YA TRADUCIDO —el rótulo y su sección— y no contra la clave: quien teclea
 * «usuarios» no está pensando en `admin.nav.users`. Sin texto se devuelve el índice entero, que es lo
 * que se enseña al abrir la paleta.
 */
export function filtraElMapa(
  entradas: readonly EntradaDelPanel[],
  texto: string,
  t: (clave: string) => string,
): readonly EntradaDelPanel[] {
  const buscado = texto.trim().toLowerCase();
  if (!buscado) {
    return entradas;
  }
  return entradas.filter(
    (entrada) =>
      t(entrada.etiqueta).toLowerCase().includes(buscado) ||
      t(entrada.seccion).toLowerCase().includes(buscado),
  );
}

/** Agrupa por sección conservando el orden del índice: es el orden en que se lee el menú del panel. */
export function agrupaPorSeccion(
  entradas: readonly EntradaDelPanel[],
): readonly { seccion: string; entradas: readonly EntradaDelPanel[] }[] {
  const grupos: { seccion: string; entradas: EntradaDelPanel[] }[] = [];
  for (const entrada of entradas) {
    const grupo = grupos.find((g) => g.seccion === entrada.seccion);
    if (grupo) {
      grupo.entradas.push(entrada);
    } else {
      grupos.push({ seccion: entrada.seccion, entradas: [entrada] });
    }
  }
  return grupos;
}
