/**
 * Un pedido, contado con el vocabulario del NEGOCIO.
 *
 * <p>Los importes llegan ya formateados por el backend y aquí no se tocan. Es norma dura del proyecto:
 * el precio se calcula en el servidor —margen por país de registro, envío, arancel, IVA— y el navegador
 * solo lo pinta. Cualquier resta o conversión hecha aquí acabaría enseñando una cifra distinta de la
 * cobrada, que es exactamente la incidencia que la norma vino a cerrar.
 */
export type EstadoDePedido =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'FORWARDED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

/** Con qué se pagó. Decide adónde se puede devolver el dinero al cancelar. */
export type MetodoDePago = 'CARD' | 'PAYPAL' | 'USDT' | 'WALLET';

/** Los estados que se conocen. El orden es el del listado de filtros. */
export const ESTADOS_DE_PEDIDO: readonly EstadoDePedido[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'FORWARDED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export interface DireccionDePedido {
  readonly nombreCompleto: string;
  readonly telefono?: string;
  readonly linea1: string;
  readonly linea2?: string;
  readonly ciudad: string;
  readonly provincia?: string;
  readonly codigoPostal?: string;
  readonly pais: string;
}

export interface LineaDePedido {
  readonly id: string;
  readonly titulo: string;
  readonly variante?: string;
  readonly imagenUrl?: string;
  readonly cantidad: number;
  /** Ya formateado por el backend. Vacío si no vino: no se compone en el navegador. */
  readonly precioUnitarioFormateado: string;
  readonly totalDeLineaFormateado: string;
}

/** Una fila del listado. Trae lo justo para pintarla y decidir qué acciones se ofrecen. */
export interface ResumenDePedido {
  readonly id: string;
  readonly numero: string;
  readonly estado: EstadoDePedido;
  readonly metodoDePago?: MetodoDePago;
  /**
   * ¿Se puede cancelar todavía? Lo decide el SERVIDOR y no se deduce del estado: un pedido PAGADO deja
   * de poder cancelarse en cuanto se compra el género en 1688, y esa compra avanza en su propio tablero
   * sin mover el estado del pedido.
   */
  readonly cancelable: boolean;
  readonly totalFormateado: string;
  readonly articulos: number;
  readonly realizadoEl?: string;
}

export interface Pedido {
  readonly id: string;
  readonly numero: string;
  readonly estado: EstadoDePedido;
  readonly metodoDePago?: MetodoDePago;
  readonly cancelable: boolean;
  readonly subtotalFormateado: string;
  readonly envioFormateado: string;
  readonly impuestosFormateado: string;
  /** Descuento de referido del comprador. Cadena vacía cuando no hay ninguno que enseñar. */
  readonly descuentoFormateado: string;
  readonly totalFormateado: string;
  readonly direccionDeEnvio?: DireccionDePedido;
  readonly notas?: string;
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly realizadoEl?: string;
  readonly enviadoEl?: string;
  readonly entregadoEl?: string;
  readonly canceladoEl?: string;
  readonly lineas: readonly LineaDePedido[];
}

/** Un archivo que se le entrega a quien lo pidió, con el nombre con el que debe guardarse. */
export interface ArchivoDescargable {
  readonly contenido: Blob;
  readonly nombre: string;
}

/** Los pasos que recorre un pedido en la línea de tiempo de la ficha, en orden. */
export const PASOS_DEL_PEDIDO = [
  'placed',
  'paid',
  'forwarded',
  'shipped',
  'delivered',
] as const;

export type PasoDelPedido = (typeof PASOS_DEL_PEDIDO)[number];

/** El pedido se dio por terminado sin llegar a destino: no hay línea de tiempo que pintar. */
export function estaCancelado(estado: EstadoDePedido): boolean {
  return estado === 'CANCELLED' || estado === 'REFUNDED';
}

/**
 * Hasta qué paso ha llegado el pedido; -1 si se canceló.
 *
 * <p>Manda la FECHA sobre el estado: un pedido que ya tiene fecha de entrega está entregado aunque su
 * estado todavía no se haya movido, y al revés. Enseñar el camión parado cuando el paquete ya está en
 * casa es el tipo de detalle que hace desconfiar del resto del seguimiento.
 */
export function pasoActivo(pedido: Pick<Pedido, 'estado' | 'enviadoEl' | 'entregadoEl'>): number {
  if (estaCancelado(pedido.estado)) {
    return -1;
  }
  if (pedido.entregadoEl || pedido.estado === 'DELIVERED') {
    return 4;
  }
  if (pedido.enviadoEl || pedido.estado === 'SHIPPED') {
    return 3;
  }
  if (pedido.estado === 'FORWARDED') {
    return 2;
  }
  return pedido.estado === 'PAID' ? 1 : 0;
}

/** Estados con actividad de envío: son los que merecen el acceso directo al seguimiento. */
export function tieneEnvioEnCurso(estado: EstadoDePedido): boolean {
  return estado === 'FORWARDED' || estado === 'SHIPPED' || estado === 'DELIVERED';
}

/**
 * ¿Hay factura que descargar?
 *
 * <p>No la hay mientras el pedido no se ha cobrado ni cuando se anuló: facturar algo que nadie pagó
 * dejaría un documento con validez fiscal sin operación detrás.
 */
export function tieneFactura(estado: EstadoDePedido): boolean {
  return estado !== 'PENDING' && estado !== 'AWAITING_PAYMENT' && estado !== 'CANCELLED';
}

/**
 * ¿Hay que preguntar adónde va el reembolso?
 *
 * <p>Solo cuando se pagó con tarjeta o PayPal: ahí el cliente elige entre recuperarlo al instante en la
 * cartera o esperar los plazos de su banco. Lo pagado con la cartera vuelve a la cartera y no hay nada
 * que preguntar.
 */
export function permiteElegirDestinoDelReembolso(metodo?: MetodoDePago): boolean {
  return metodo === 'CARD' || metodo === 'PAYPAL';
}
