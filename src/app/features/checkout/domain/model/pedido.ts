/**
 * El pedido que se está componiendo y lo que hace falta para cobrarlo.
 *
 * <p>Los importes NO están aquí: los pone el servidor al crear el pedido. Lo que viaja desde el navegador
 * es QUÉ se compra, ADÓNDE va y CÓMO se paga; el precio nunca se manda desde el cliente, porque un precio
 * que llega del navegador es un precio que se puede manipular.
 */

/** Las formas de pago admitidas. */
export type MetodoDePago = 'WALLET' | 'CARD' | 'PAYPAL' | 'USDT';

export interface DireccionDeEnvio {
  readonly nombreCompleto: string;
  readonly telefono?: string;
  readonly linea1: string;
  readonly linea2?: string;
  readonly ciudad: string;
  readonly provincia?: string;
  readonly codigoPostal?: string;
  readonly pais: string;
}

/** Una dirección ya guardada en la cuenta. */
export interface DireccionGuardada extends DireccionDeEnvio {
  readonly id: string;
  readonly etiqueta?: string;
  readonly porDefecto: boolean;
}

export interface ItemDelPedido {
  readonly productId: string;
  readonly variantId?: string;
  readonly cantidad: number;
}

export interface SolicitudDePedido {
  readonly items: readonly ItemDelPedido[];
  readonly notas?: string;
  readonly metodoDePago: MetodoDePago;
  readonly codigoDeCupon?: string;
  /**
   * El canal COTIZADO, no el que se pulsó: es el que se ha visto marcado y con cuyo precio se ha
   * calculado el total que se está aceptando. El backend lo revalida contra la cotización del momento.
   */
  readonly opcionDeEnvio?: string;
  readonly idDeDireccion?: string;
  /** Dirección escrita a mano que no se quiere guardar en la cuenta. */
  readonly direccionSuelta?: DireccionDeEnvio;
}

export interface PedidoCreado {
  readonly id: string;
  readonly numero?: string;
}

/**
 * ¿Está la dirección lo bastante completa para poder cotizar y cobrar?
 *
 * <p>Es una regla del negocio, no del formulario: sin nombre, calle, ciudad y país no hay envío posible,
 * y el resto —piso, provincia, código postal— depende del país. La comprobación que MANDA es la del
 * servidor; esta solo evita que el fallo se descubra después de pulsar «pagar».
 */
export function direccionUtilizable(direccion: DireccionDeEnvio): boolean {
  return (
    direccion.nombreCompleto.trim() !== '' &&
    direccion.linea1.trim() !== '' &&
    direccion.ciudad.trim() !== '' &&
    direccion.pais.trim() !== ''
  );
}

/**
 * ¿Alcanza el saldo del monedero?
 *
 * <p>Los dos importes llegan en céntimos de DÓLAR del servidor: aquí no se convierte ni se redondea nada.
 * Enfrentarlos en crudo con divisas distintas fue un fallo real —con el yen, sin decimales, el pedido
 * salía cien veces más caro y un cliente japonés no podía pagar con su saldo—.
 *
 * <p>Se mide contra el TOTAL y no contra el subtotal: con saldo para la mercancía pero no para el pedido
 * entero, se creaba el pedido, el cobro lo rechazaba y quedaba un pedido a medias que limpiar a mano.
 *
 * <p>Mientras no se conoce el total NO alcanza: la comprobación es lo único que separa un pedido cobrable
 * de uno que nace roto, y dejarla pasar «solo un momento» era el rato en que ocurría. El botón espera a
 * la cotización, que llega en décimas.
 */
export function elSaldoAlcanza(
  saldoDisponibleCentimosUsd: number | undefined,
  totalCentimosUsd: number | undefined,
): boolean {
  if (saldoDisponibleCentimosUsd == null || totalCentimosUsd == null) {
    return false;
  }
  return saldoDisponibleCentimosUsd >= totalCentimosUsd;
}
