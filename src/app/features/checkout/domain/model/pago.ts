/**
 * El cobro: qué se ha iniciado y qué tiene que pasar a continuación.
 *
 * <p>Nada de esto nombra a Stripe ni a PayPal. El dominio sabe que un cobro puede resolverse en el acto,
 * exigir una autenticación reforzada o mandar a una página externa; qué proveedor hay detrás es cosa del
 * adaptador, y por eso añadir una pasarela no obliga a tocar ni la pantalla ni estas reglas.
 */

/** Un cobro iniciado contra un pedido. */
export interface CobroIniciado {
  readonly id: string;
  readonly idDePedido: string;
  /** Adónde hay que mandar a quien paga para que apruebe. Ausente en los cobros sin redirección. */
  readonly urlDeAprobacion?: string;
  /** Datos del depósito en cripto, cuando el método lo es. */
  readonly deposito?: DepositoEnCripto;
}

export interface DepositoEnCripto {
  readonly direccion?: string;
  readonly red?: string;
  readonly caducaEl?: string;
}

/** Lo que devuelve intentar cobrar con una tarjeta ya guardada. */
export interface CobroConTarjetaGuardada {
  readonly resuelto: boolean;
  /**
   * El secreto con el que completar la autenticación reforzada en el navegador. Solo llega cuando el
   * banco la exige.
   */
  readonly secretoDeCliente?: string;
  readonly idDeCobro?: string;
}

/** Un método de pago que ya está guardado en la cuenta. */
export interface MetodoGuardado {
  readonly id: string;
  readonly clase: 'CARD' | 'PAYPAL';
  readonly marca?: string;
  readonly ultimosCuatro?: string;
  readonly correoDePaypal?: string;
  readonly porDefecto: boolean;
}

/**
 * Una dirección de aprobación es EXTERNA cuando es absoluta.
 *
 * <p>Distinguirlo importa: a una externa se sale del sitio con el navegador, y a una interna se navega
 * por el enrutador. En modo simulado el backend devuelve una relativa, y tratarla como externa recargaba
 * la aplicación entera en medio de un cobro.
 */
export function esDireccionExterna(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
