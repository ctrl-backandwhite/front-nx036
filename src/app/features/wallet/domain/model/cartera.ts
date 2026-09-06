/**
 * La cartera de quien mira: cuánto tiene y qué se ha movido.
 *
 * <p>Los importes llegan como CADENAS ya formateadas por el backend. No es una comodidad: es la norma
 * dura del proyecto. El saldo canónico se lleva en céntimos de dólar y la conversión a la moneda que se
 * enseña la hace el servidor; repetirla aquí daría, tarde o temprano, un saldo que no cuadra con lo que
 * el cobro descuenta.
 *
 * <p>La cartera NO se siembra con saldo: nace a cero y solo sube recargando o por un reembolso.
 */
export interface Cartera {
  readonly id: string;
  /** Saldo en la moneda que se le enseña a quien mira, ya formateado. */
  readonly saldoFormateado: string;
  readonly divisaMostrada: string;
  /** El mismo saldo en dólares, que es la unidad canónica. Se enseña como referencia. */
  readonly saldoCanonicoFormateado: string;
  /**
   * Lo retenido por operaciones en curso, ya formateado. Cadena vacía cuando no hay nada retenido: la
   * línea entonces no se pinta, para no inquietar con un «Retenido: 0,00 $».
   */
  readonly retenidoFormateado: string;
}

export type ClaseDeMovimiento =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'PAYMENT'
  | 'REFUND'
  | 'HOLD'
  | 'RELEASE'
  | 'ADJUSTMENT';

export interface MovimientoDeCartera {
  readonly id: string;
  readonly clase: ClaseDeMovimiento;
  /** Importe con su signo, ya formateado por el backend. */
  readonly importeFormateado: string;
  readonly saldoPosteriorFormateado: string;
  /** ¿Suma o resta? Sale del signo del importe canónico, que sí es un número del servidor. */
  readonly esEntrada: boolean;
  readonly descripcion?: string;
  readonly creadoEl: string;
}

export interface PaginaDeMovimientos {
  readonly movimientos: readonly MovimientoDeCartera[];
  readonly total: number;
}
