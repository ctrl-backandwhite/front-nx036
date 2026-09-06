/**
 * La cartera de un cliente vista desde el panel: saldo, retenido y libro mayor.
 *
 * <p>Todos los importes son DÓLARES canónicos. La cartera se lleva internamente en dólares aunque quien
 * mira el panel tenga otra divisa activa: mezclar las dos convertía el saldo en un número distinto en
 * cada pantalla.
 */
export interface ResumenDeCartera {
  readonly id: string;
  readonly idUsuario: string;
  readonly email: string;
  readonly nombre?: string;
  readonly saldoUsd: number;
  readonly retenidoUsd: number;
  readonly estado: string;
}

export interface DetalleDeCartera extends ResumenDeCartera {
  readonly disponibleUsd: number;
  readonly divisa: string;
}

/**
 * Un apunte del libro mayor.
 *
 * <p>`saldoResultanteCentimos` viene PERSISTIDO por el backend, no se recalcula sumando: si se
 * recalculara, un apunte perdido o desordenado cambiaría todo el histórico hacia atrás.
 */
export interface MovimientoDeCartera {
  readonly id: string;
  readonly clase: string;
  readonly importeCentimos: number;
  readonly saldoResultanteCentimos: number;
  readonly descripcion?: string | null;
  readonly idPedido?: string | null;
  readonly creadoEl: string;
}

export const ESTADOS_DE_CARTERA: readonly string[] = ['ACTIVE', 'FROZEN'];

/** Las divisas por las que se puede filtrar el listado de carteras. */
export const DIVISAS_DE_FILTRO: readonly string[] = ['USD', 'EUR', 'GBP', 'BRL', 'MXN', 'CNY', 'JPY'];

export interface FiltroDeCarteras {
  readonly texto?: string;
  readonly estado?: string;
  readonly divisa?: string;
  readonly pagina: number;
  readonly tamano: number;
}

/** Un depósito manual: sin motivo obligatorio, pero nunca de importe cero o negativo. */
export interface Deposito {
  readonly idUsuario: string;
  readonly importeCentimos: number;
  readonly descripcion?: string;
}

/** Un ajuste: lleva SIGNO —puede restar— y el motivo es obligatorio, porque queda en el libro mayor. */
export interface Ajuste {
  readonly idUsuario: string;
  readonly importeCentimos: number;
  readonly descripcion: string;
}

/** Un depósito solo vale si suma. Un cero no mueve saldo y ensucia el libro con un apunte mudo. */
export function depositoValido(importeCentimos: number): boolean {
  return Number.isFinite(importeCentimos) && importeCentimos > 0;
}

/** Un ajuste vale en las dos direcciones, pero nunca a cero y nunca sin explicación. */
export function ajusteValido(importeCentimos: number, motivo: string): boolean {
  return Number.isFinite(importeCentimos) && importeCentimos !== 0 && motivo.trim().length > 0;
}

/**
 * Pasa a idioma la nota que el backend escribió en inglés.
 *
 * <p>El libro mayor guarda las notas en inglés («Order NX-1234», «Wallet recharge via CARD») porque las
 * escribe el servidor sin saber quién las va a leer. Traducirlas al pintar es lo único que evita un
 * histórico bilingüe; lo que no reconoce se devuelve tal cual, que es peor que traducido pero mucho
 * mejor que un hueco.
 */
export function traduceNota(
  nota: string | null | undefined,
  t: (clave: string) => string,
): string {
  if (!nota) {
    return '—';
  }
  const pedido = /^Order\s+(.+)$/i.exec(nota);
  if (pedido) {
    return t('admin.wallets.note.order').replace('{order}', pedido[1]);
  }
  const recarga = /^Wallet recharge via\s+(.+)$/i.exec(nota);
  if (recarga) {
    const metodo = recarga[1].toLowerCase();
    return t('admin.wallets.note.recharge').replace('{method}', t(`recharge.method.${metodo}`));
  }
  if (/^Hold for order/i.test(nota)) {
    return t('admin.wallets.note.hold');
  }
  if (/^Refund/i.test(nota)) {
    return t('admin.wallets.note.refund');
  }
  if (/^Admin manual top-up/i.test(nota)) {
    return t('admin.wallets.note.manual_topup');
  }
  if (/^\[Adjustment]/i.test(nota)) {
    return `${t('admin.wallets.note.adjustment')}: ${nota.replace(/^\[Adjustment]\s*/i, '')}`;
  }
  return nota;
}

/** La referencia legible de un apunte: el pedido si lo tiene, y si no la nota traducida. */
export function referenciaDelMovimiento(
  movimiento: MovimientoDeCartera,
  t: (clave: string) => string,
): string {
  if (movimiento.idPedido) {
    return t('admin.wallets.detail.order_ref').replace('{id}', String(movimiento.idPedido).slice(0, 8));
  }
  return traduceNota(movimiento.descripcion, t);
}
