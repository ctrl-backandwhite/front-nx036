/**
 * El producto visto desde el PANEL, que no es el mismo que ve la tienda.
 *
 * <p>La diferencia importa y es de negocio: en el escaparate la columna de precio es lo que paga quien
 * compra —ya con margen, IVA, envío y arancel—, mientras que aquí es el COSTE de origen. Nombrar el
 * campo `coste` y no `precio` es lo que impide que alguien lo confunda y empiece a sumarle cosas en el
 * cliente. Los importes de venta los calcula el backend y llegan ya formateados; aquí no se replica
 * ninguna fórmula.
 */
export type EstadoDeProducto = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

/** Los estados que se pueden elegir en el filtro, en el orden en que se enseñan. */
export const ESTADOS_DE_PRODUCTO: readonly EstadoDeProducto[] = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
];

export interface ProductoDeListado {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagenPrincipal?: string;
  /** COSTE de origen, en la divisa de origen. No es lo que paga el cliente. */
  readonly coste?: number;
  readonly divisa?: string;
  readonly ventasMensuales: number;
  /** De 0 a 1, tal como lo recalcula el backend cada noche. Se enseña sobre 100. */
  readonly tendencia?: number;
  readonly estado: string;
  /** Revisión manual del administrador. Falso o ausente = pendiente o con error. */
  readonly verificado: boolean;
}

export interface PaginaDeProductos {
  readonly productos: readonly ProductoDeListado[];
  readonly total: number;
  readonly paginas: number;
  readonly pagina: number;
}

/** Cómo se ordena el listado. Vacío = el orden natural del backend. */
export type OrdenDeCatalogo = 'price_asc' | 'price_desc';

export interface CriterioDeCatalogo {
  readonly estado?: EstadoDeProducto;
  readonly categoriaId?: string;
  readonly texto?: string;
  readonly verificado?: boolean;
  readonly orden?: OrdenDeCatalogo;
  readonly pagina: number;
  readonly tamano: number;
  readonly idioma: string;
  /** Filtros de coste, YA en la divisa canónica (CNY): la conversión la hace quien pinta la columna. */
  readonly costeMinimo?: number;
  readonly costeMaximo?: number;
  readonly ventasMinimas?: number;
  /** De 0 a 1, como lo guarda el backend. */
  readonly tendenciaMinima?: number;
}

/**
 * El ciclo del botón de ordenar por precio: natural → ascendente → descendente → natural.
 *
 * <p>Vuelve al orden natural en vez de alternar entre los dos sentidos porque el orden del backend
 * —relevancia— es una opción legítima y sin este tercer paso no habría forma de recuperarla sin
 * recargar la página.
 */
export function siguienteOrdenDePrecio(actual?: OrdenDeCatalogo): OrdenDeCatalogo | undefined {
  if (actual === 'price_asc') {
    return 'price_desc';
  }
  return actual === 'price_desc' ? undefined : 'price_asc';
}

/**
 * Un número de un filtro escrito a mano.
 *
 * <p>Un campo vacío o a medio escribir NO es un filtro: se devuelve `undefined` y no un `NaN`, que
 * viajaría al servidor como filtro puesto y dejaría la tabla vacía sin explicación. Se admite la coma
 * como separador decimal porque es lo que teclea media Europa.
 */
export function numeroDeFiltro(texto: string): number | undefined {
  const limpio = texto.trim();
  if (limpio === '') {
    return undefined;
  }
  const numero = Number(limpio.replace(',', '.'));
  return Number.isNaN(numero) ? undefined : numero;
}

/** La tendencia se teclea sobre 100 y se guarda de 0 a 1. */
export function tendenciaAFraccion(texto: string): number | undefined {
  const numero = numeroDeFiltro(texto);
  return numero === undefined ? undefined : numero / 100;
}

/** Las ventas del mes, abreviadas cuando no caben en la columna. */
export function ventasAbreviadas(ventas: number): string {
  if (ventas <= 0) {
    return '—';
  }
  return ventas > 9999 ? `${(ventas / 1000).toFixed(1)}k` : String(ventas);
}

/** La tendencia sobre cien, que es como se lee en la tabla. */
export function tendenciaSobreCien(tendencia?: number | null): string {
  return tendencia == null ? '—' : `${Math.round(Number(tendencia) * 100)}/100`;
}

/**
 * Un estado ilegible del backend, escrito para una persona: `AWAITING_PAYMENT` → `Awaiting payment`.
 *
 * <p>Es el ÚLTIMO recurso, solo para estados que aún no tienen traducción. Vale más eso que enseñar la
 * constante en mayúsculas y guiones bajos.
 */
export function estadoLegible(estado: string): string {
  if (!estado) {
    return estado;
  }
  const minusculas = estado.replace(/_/g, ' ').toLowerCase();
  return minusculas.charAt(0).toUpperCase() + minusculas.slice(1);
}

/**
 * ¿La fila que se acaba de tocar deja de pertenecer a la lista que se está viendo?
 *
 * <p>Corregir la fila en sitio es lo normal: repintar treinta productos por un cambio de uno hace
 * parpadear la tabla y pierde el sitio donde estaba quien administra. Pero si el cambio choca con el
 * FILTRO activo —certificar con el filtro puesto en «pendientes»—, dejarla ahí sería mentir sobre lo
 * que se está mirando, y entonces sí hay que recargar.
 */
export function saleDelFiltro<T>(filtro: T | undefined, nuevoValor: T): boolean {
  return filtro !== undefined && filtro !== nuevoValor;
}
