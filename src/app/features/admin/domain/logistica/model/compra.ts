/**
 * El tramo chino: qué comprar al proveedor, qué está de camino al almacén y qué falta por registrar en
 * el sistema de re-empaquetado.
 *
 * <p>Los estados son los del PROCESO real, no los de una tabla: se compra, el proveedor envía, el
 * almacén recibe y se registra el re-empaquetado. Las cuentas —coste esperado, coste real, desviación y
 * margen— llegan ya formateadas del backend; aquí no se calcula ni un céntimo.
 */

export type EstadoDeCompra =
  | 'PENDING'
  | 'PURCHASED'
  | 'IN_TRANSIT'
  | 'AT_WAREHOUSE'
  | 'PACKED'
  | 'CANCELLED';

/**
 * Las columnas del tablero, en el orden del proceso.
 *
 * <p>`CANCELLED` no está: una compra anulada no da trabajo y ocupar una columna con ella empujaba las
 * cinco que sí importan a una segunda fila. `PACKED` sí, porque sin su columna las re-empaquetadas
 * desaparecían del tablero en cuanto se marcaban y no había dónde volver a mirarlas.
 */
export const COLUMNAS_DE_COMPRA: readonly EstadoDeCompra[] = [
  'PENDING',
  'PURCHASED',
  'IN_TRANSIT',
  'AT_WAREHOUSE',
  'PACKED',
];

/** A los 30 días el almacén destruye el bulto sin compensación; a los 20 ya conviene avisar. */
export const DIAS_HASTA_DESTRUCCION = 30;
export const DIAS_DE_AVISO = 20;

/** Una línea del pedido dentro de la compra. El título chino es el que sirve para buscar en 1688. */
export interface LineaDeCompra {
  readonly lineaDePedidoId: string;
  readonly titulo: string;
  readonly tituloZh?: string;
  readonly variante?: string;
  readonly imagenUrl?: string;
  readonly origenUrl?: string;
  readonly cantidad: number;
}

export interface CompraAProveedor {
  readonly id: string;
  readonly pedidoId: string;
  readonly numeroDePedido?: string;
  readonly estado: EstadoDeCompra;
  readonly proveedor?: string;
  /** Dirección china completa con el código de cliente, lista para pegar en 1688. */
  readonly direccionDeAlmacen?: string;
  readonly costeEsperadoFormateado?: string;
  readonly costeRealFormateado?: string;
  readonly desviacionFormateada?: string;
  readonly fueraDePresupuesto?: boolean;
  readonly margenRealFormateado?: string;
  readonly margenRealPorcentaje?: number;
  readonly seguimientoDomestico?: string;
  /** Ausente = pendiente de exportar al fichero que se sube al sistema del almacén. */
  readonly exportadoEl?: string;
  readonly diasEnAlmacen?: number;
  readonly servicioSugerido?: string;
  readonly lineas: readonly LineaDeCompra[];
}

export interface IncidenciaDeHoja {
  readonly pedidoId: string;
  readonly numeroDePedido: string;
  readonly motivo: string;
}

export interface AvanceDeHoja {
  readonly exportables: number;
  readonly incidencias: readonly IncidenciaDeHoja[];
}

/** Los pasos que se pueden dar sobre una compra. Cada uno es un endpoint distinto. */
export type PasoDeCompra = 'bought' | 'shipped' | 'received' | 'packed' | 'cancel' | 'reexport';

/** Qué paso toca ahora según el estado. `null` = no hay nada que hacer desde el tablero. */
export function pasoQueToca(estado: EstadoDeCompra): PasoDeCompra | null {
  switch (estado) {
    case 'PENDING':
      return 'bought';
    case 'PURCHASED':
      return 'shipped';
    case 'IN_TRANSIT':
      return 'received';
    case 'AT_WAREHOUSE':
      return 'packed';
    default:
      return null;
  }
}

/**
 * Las que se acercan a la fecha de destrucción y aún no se han re-empaquetado.
 *
 * <p>Una vez tiene número de re-empaquetado ya no corre peligro: el almacén la ha tomado por su cuenta.
 */
export function enRiesgo(compras: readonly CompraAProveedor[]): readonly CompraAProveedor[] {
  return compras.filter(
    (c) => (c.diasEnAlmacen ?? 0) >= DIAS_DE_AVISO && c.estado !== 'PACKED',
  );
}

/**
 * Reparte las compras de una columna por PEDIDO, conservando el orden de llegada.
 *
 * <p>Un pedido con varios proveedores genera una compra por cada uno. Sueltas, las tarjetas repetían la
 * misma referencia y parecían pedidos distintos; agrupadas se ve de un vistazo qué queda pendiente de
 * un mismo pedido, que es como se decide si ya se puede exportar.
 */
export function agrupaPorPedido(
  compras: readonly CompraAProveedor[],
): readonly { readonly pedido: string; readonly compras: readonly CompraAProveedor[] }[] {
  const porPedido = new Map<string, CompraAProveedor[]>();
  for (const compra of compras) {
    // Sin número de pedido se agrupa por su propio id: mejor una tarjeta suelta que meterlas todas
    // juntas bajo una cabecera vacía.
    const clave = compra.numeroDePedido ?? compra.id;
    const existentes = porPedido.get(clave);
    if (existentes) {
      existentes.push(compra);
    } else {
      porPedido.set(clave, [compra]);
    }
  }
  return [...porPedido.entries()].map(([pedido, lista]) => ({ pedido, compras: lista }));
}

/**
 * Cuántos PEDIDOS distintos están bloqueados.
 *
 * <p>Se cuentan pedidos y no incidencias: uno solo puede acumular varios motivos, y decir «2 pedidos»
 * cuando es uno con dos fallos hace buscar un pedido que no existe.
 */
export function pedidosBloqueados(incidencias: readonly IncidenciaDeHoja[]): number {
  return new Set(incidencias.map((i) => i.pedidoId)).size;
}

/**
 * Re-exportar una compra ya re-empaquetada no lleva a ninguna parte: la validación la rechaza por
 * duplicada —ya tiene orden en el sistema del almacén— y el fichero seguiría a cero.
 */
export function puedeReexportarse(compra: CompraAProveedor): boolean {
  return !!compra.exportadoEl && compra.estado !== 'PACKED';
}

/** Nombre del fichero de re-empaquetado, con marca de tiempo ordenable para saber cuál es el último. */
export function nombreDeHoja(momento: Date): string {
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  const sello =
    `${momento.getFullYear()}-${dosDigitos(momento.getMonth() + 1)}-${dosDigitos(momento.getDate())}` +
    `_${dosDigitos(momento.getHours())}-${dosDigitos(momento.getMinutes())}`;
  return `yunfulfillment-packorder_${sello}.xls`;
}
