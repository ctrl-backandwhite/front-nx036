/**
 * Rebajas y cupones.
 *
 * <p>REGLA DEL NEGOCIO: entre varias promociones aplicables gana la que MÁS descuenta; nunca se suman, y
 * ninguna baja del precio base del producto. Esa resolución la hace el backend al calcular el precio;
 * aquí solo se administran las reglas.
 *
 * <p>Sin código es una rebaja automática que se anuncia en la portada. Con código es un cupón que hay
 * que teclear en el pago y que no se enseña en el catálogo.
 */
export interface Promocion {
  readonly id: string;
  readonly nombre: string;
  readonly codigo?: string;
  readonly clase: string;
  readonly ambito: string;
  readonly porcentaje?: number;
  readonly importeCentimos?: number;
  readonly empiezaEl?: string;
  readonly terminaEl?: string;
  /** Lo que marcó quien administra. */
  readonly activa: boolean;
  /** Si de verdad está descontando AHORA: cuenta las fechas y los topes, no solo la casilla. */
  readonly vigente: boolean;
  readonly prioridad: number;
  readonly usosMaximos?: number;
  readonly usos: number;
  readonly pedidoMinimoCentimos?: number;
  readonly usosPorPersona?: number;
  readonly categorias: readonly string[];
  readonly productos: readonly string[];
}

/** Lo que se manda al crear o editar una promoción. */
export interface BorradorDePromocion {
  nombre: string;
  codigo?: string;
  clase: string;
  ambito: string;
  porcentaje?: number;
  importeCentimos?: number;
  empiezaEl?: string;
  terminaEl?: string;
  activa?: boolean;
  prioridad?: number;
  usosMaximos?: number;
  pedidoMinimoCentimos?: number;
  usosPorPersona?: number;
  categorias?: readonly string[];
  productos?: readonly string[];
  avisaUsuarios?: boolean;
}

export function promocionEnBlanco(): BorradorDePromocion {
  return {
    nombre: '', codigo: '', clase: 'SEASONAL', ambito: 'ALL', porcentaje: 10,
    empiezaEl: '', terminaEl: '', activa: true, prioridad: 0, categorias: [], productos: [],
  };
}

/**
 * Un instante ISO recortado a lo que entiende `datetime-local`.
 *
 * <p>El campo del navegador no admite zona horaria: con la `Z` al final se queda vacío sin decir nada, y
 * quien edita cree que la promoción no tenía fecha.
 */
export function paraCampoDeFecha(iso: string | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

/**
 * Y de vuelta: se le devuelve la zona. Sin ella el backend lo lee como hora local del SERVIDOR, y una
 * rebaja programada para las nueve empieza a otra hora según dónde esté la máquina.
 */
export function paraElBackend(local: string | undefined): string | undefined {
  if (!local) {
    return undefined;
  }
  const fecha = new Date(local);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/** Cómo se resume el alcance en la tabla, sin tener que abrir la promoción. */
export function resumenDeAmbito(promocion: Promocion): { clave: string; cuantos: number } {
  if (promocion.ambito === 'CATEGORY') {
    return { clave: 'admin.promo.scope_cat', cuantos: promocion.categorias.length };
  }
  if (promocion.ambito === 'PRODUCT') {
    return { clave: 'admin.promo.scope_prod', cuantos: promocion.productos.length };
  }
  return { clave: 'admin.promo.scope_all', cuantos: 0 };
}

/**
 * Qué contar de una promoción: descontando ahora, programada o apagada.
 *
 * <p>Se distingue `vigente` de `activa` a propósito: una promoción marcada activa pero fuera de fechas
 * no rebaja nada, y pintarla igual que una viva haría creer que el escaparate está de rebajas.
 */
export function estadoDePromocion(promocion: Promocion): 'viva' | 'programada' | 'apagada' {
  if (promocion.vigente) {
    return 'viva';
  }
  return promocion.activa ? 'programada' : 'apagada';
}

/** El descuento en una línea: porcentaje si lo hay, importe si no, y un guion cuando no hay ninguno. */
export function descuentoLegible(promocion: Promocion): string {
  if (promocion.porcentaje) {
    return `-${promocion.porcentaje}%`;
  }
  if (promocion.importeCentimos) {
    return `-${(promocion.importeCentimos / 100).toFixed(2)}`;
  }
  return '—';
}
