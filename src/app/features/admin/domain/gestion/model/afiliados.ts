/**
 * El programa de afiliados: quién trae ventas, cuánto se le debe y qué se le ha pagado.
 *
 * <p>Los importes viajan en céntimos de la divisa configurada en el programa, no en dólares: el pago se
 * hace en esa divisa y convertirlo para pintarlo daría una cifra que no coincide con la transferencia.
 */
export interface Afiliado {
  readonly id: string;
  readonly nombre?: string;
  readonly email?: string;
  readonly estado: string;
  readonly codigos: number;
  readonly clics: number;
  readonly conversiones: number;
  readonly pendienteCentimos: number;
  readonly aprobadoCentimos: number;
  readonly pagadoCentimos: number;
}

export interface CodigoDeAfiliado {
  readonly id: string;
  readonly codigo: string;
  readonly clics: number;
  readonly activo: boolean;
}

export interface Comision {
  readonly id: string;
  readonly importeCentimos: number;
  readonly porcentaje: number;
  readonly estado: string;
  readonly creadaEl?: string;
}

export interface DetalleDeAfiliado {
  readonly afiliado?: Afiliado;
  readonly codigos: readonly CodigoDeAfiliado[];
  readonly comisiones: readonly Comision[];
}

/** La configuración del programa: comisión por defecto, ventanas y mínimo de pago. */
export interface ConfiguracionDeAfiliados {
  readonly porcentajePorDefecto: number;
  readonly ventanaDeAtribucionDias: number;
  readonly periodoDeDevolucionDias: number;
  readonly minimoDePagoCentimos: number;
  readonly divisa: string;
  readonly maximoPorPeriodoCentimos: number;
}

/** Una solicitud de pago pendiente de aprobar. */
export interface PagoPendiente {
  readonly id: string;
  readonly idAfiliado: string;
  readonly nombre?: string;
  readonly importeCentimos: number;
  readonly importeFormateado: string;
  readonly divisa: string;
  readonly metodo: string;
  readonly titular?: string;
  readonly iban?: string;
  readonly bic?: string;
  readonly emailPaypal?: string;
  readonly comisiones: number;
  readonly solicitadoEl?: string;
}

export const ESTADOS_DE_AFILIADO: readonly string[] = ['PENDING', 'ACTIVE', 'SUSPENDED'];

/**
 * A dónde va el dinero de un pago externo.
 *
 * <p>La cartera se resuelve aparte porque no tiene destino que enseñar: es una línea traducida, no un
 * número de cuenta. Aquí solo se compone lo que hay que teclear en la transferencia.
 */
export function destinoDelPago(pago: PagoPendiente): string {
  if (pago.metodo === 'BANK') {
    const partes = [pago.titular, pago.iban, pago.bic].filter((v): v is string => !!v);
    return partes.length ? partes.join(' · ') : '—';
  }
  if (pago.metodo === 'PAYPAL') {
    return pago.emailPaypal ?? '—';
  }
  return '—';
}

/**
 * Una transferencia bancaria o de PayPal SIEMPRE lleva referencia: es lo único que permite casar el
 * apunte del banco con la comisión pagada cuando alguien reclama. A la cartera no le hace falta.
 */
export function exigeReferencia(metodo: string): boolean {
  return metodo === 'BANK' || metodo === 'PAYPAL';
}

/** El porcentaje de clics que acabaron en venta. Sin clics no es cero por ciento: es que no hay dato. */
export function tasaDeConversion(afiliado: Afiliado): number | null {
  return afiliado.clics > 0 ? Math.round((afiliado.conversiones / afiliado.clics) * 100) : null;
}
