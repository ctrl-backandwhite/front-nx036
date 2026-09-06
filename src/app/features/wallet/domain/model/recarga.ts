/** Con qué se puede meter dinero en la cartera. */
export type MetodoDeRecarga = 'CARD' | 'PAYPAL' | 'USDT';

/**
 * Los métodos que se OFRECEN hoy.
 *
 * <p>USDT está fuera a propósito, no borrado: la maquinaria de cadena y dirección sigue entera para
 * volver a encenderlo sin rehacer la pantalla. Quitarla habría obligado a reescribir el paso tres.
 */
export const METODOS_OFRECIDOS: readonly MetodoDeRecarga[] = ['CARD', 'PAYPAL'];

/** Las cadenas admitidas si se reactiva el pago en USDT. */
export const CADENAS_USDT: readonly string[] = ['TRC20', 'ERC20', 'BEP20'];

/** Un importe sugerido, ya redondeado y formateado por el backend en la divisa activa. */
export interface ImporteSugerido {
  /** El número que hay que enviar como importe; es el mismo que el backend redondeó. */
  readonly importe: number;
  readonly formateado: string;
}

export interface OpcionesDeRecarga {
  readonly divisa: string;
  readonly simbolo: string;
  readonly sugeridos: readonly ImporteSugerido[];
}

/** Lo que devuelve el servidor al abrir una recarga: por dónde seguir para pagarla. */
export interface Recarga {
  readonly idDePago: string;
  readonly metodo: MetodoDeRecarga;
  readonly estado: string;
  /** Lo que se va a cobrar, ya formateado, y en qué moneda. */
  readonly importeFormateado: string;
  readonly divisaDeCobro: string;
  readonly proveedor: string;
  readonly secretoDeCliente?: string;
  /** Adónde hay que mandar al cliente para que pague. Cuando viene, se salta a la pasarela. */
  readonly urlDeAprobacion?: string;
  readonly direccionCripto?: string;
  readonly cadenaCripto?: string;
  readonly urlQr?: string;
}

/**
 * ¿Esta recarga la lleva una pasarela de mentira?
 *
 * <p>En los entornos sin pasarela real el servidor devuelve un proveedor manual o unas credenciales con
 * la marca «mock». Ahí la pantalla ofrece un botón para dar el cobro por bueno; contra una pasarela de
 * verdad ese botón no existe, porque quien confirma es la pasarela.
 */
export function esSimulada(recarga: Recarga): boolean {
  return (
    recarga.proveedor === 'manual' ||
    !!recarga.secretoDeCliente?.includes('mock') ||
    !!recarga.urlDeAprobacion?.includes('mock=1')
  );
}

/**
 * ¿El importe tecleado vale?
 *
 * <p>`Number.isFinite` no es paranoia: si el campo dejara de ser numérico, un «1e999» pegado daría
 * infinito, y al serializar el cuerpo JSON el infinito viaja como `null` — el servidor recibiría una
 * recarga SIN importe.
 */
export function importeValido(texto: string): boolean {
  const numero = Number.parseFloat(texto);
  return Number.isFinite(numero) && numero > 0;
}

/** El importe tecleado como número, o cero si no vale. */
export function importeTecleado(texto: string): number {
  return importeValido(texto) ? Number.parseFloat(texto) : 0;
}
