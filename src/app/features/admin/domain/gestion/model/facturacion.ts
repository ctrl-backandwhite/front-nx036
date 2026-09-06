/**
 * Planes y suscripciones.
 *
 * <p>Los precios se guardan en CÉNTIMOS DE DÓLAR y así se editan: el campo del formulario es un entero,
 * no un decimal con símbolo. Poner una coma donde el backend espera céntimos es la forma más rápida de
 * cobrar cien veces de más.
 */
export interface Plan {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly mensualCentimos: number;
  readonly anualCentimos: number;
  readonly divisa: string;
  readonly activo: boolean;
  readonly posicion: number;
}

export interface Suscripcion {
  readonly id: string;
  readonly idUsuario: string;
  readonly emailUsuario: string;
  readonly plan: string;
  readonly estado: string;
  readonly periodo: string;
  readonly inicioDelPeriodo?: string;
  readonly finDelPeriodo?: string;
}

export const ESTADOS_DE_SUSCRIPCION: readonly string[] = [
  'ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED', 'CANCELLED',
];

/** Los cinco ciclos que sabe pintar la pantalla. `BOTH` no viene del backend: lo deduce `periodoDelPlan`. */
export type Periodo = 'MONTH' | 'YEAR' | 'BOTH' | 'FREE' | 'CUSTOM';

/**
 * La clave de traducción del ciclo de cobro.
 *
 * <p>El backend manda dos convenciones históricas —`MONTHLY`/`YEARLY` del caso de uso real y
 * `MONTH`/`YEAR` de la siembra—. Se unifican aquí para que la pantalla NUNCA pinte el valor crudo del
 * enumerado; devolver `null` es la señal de «no sé traducir esto» y quien llama decide el respaldo.
 */
export function claveDePeriodo(periodo: string | null | undefined): string | null {
  switch ((periodo ?? '').toUpperCase()) {
    case 'MONTHLY':
    case 'MONTH':
      return 'admin.billing.period.monthly';
    case 'YEARLY':
    case 'YEAR':
      return 'admin.billing.period.yearly';
    case 'FREE':
      return 'admin.billing.period.free';
    case 'CUSTOM':
      return 'admin.billing.period.custom';
    default:
      return null;
  }
}

/**
 * Qué ciclo ofrece un plan.
 *
 * <p>Un plan con los dos precios a cero es gratuito; con los dos por encima de cero se vende en ambos
 * ciclos, y decir que está «atado» a uno confundiría. El plan a medida remite a ventas.
 */
export function periodoDelPlan(plan: Plan): Periodo {
  if (plan.codigo === 'ENTERPRISE') {
    return 'CUSTOM';
  }
  if (plan.mensualCentimos === 0 && plan.anualCentimos === 0) {
    return 'FREE';
  }
  if (plan.mensualCentimos > 0 && plan.anualCentimos > 0) {
    return 'BOTH';
  }
  return plan.anualCentimos > 0 ? 'YEAR' : 'MONTH';
}

/**
 * Defensa en profundidad: un plan gratuito nunca está en periodo de prueba.
 *
 * <p>El backend ya lo normaliza; esto cubre los datos antiguos que se escapasen de la migración, que
 * pintados como «prueba» harían pensar que la cuenta va a empezar a pagar.
 */
export function estadoEfectivo(plan: string, estado: string): string {
  return plan === 'FREE' && estado === 'TRIALING' ? 'ACTIVE' : estado;
}

/** ¿Casa esta suscripción con lo que se ha filtrado? El filtrado del listado es local, no del servidor. */
export function suscripcionCoincide(
  suscripcion: Suscripcion,
  estado: string | null,
  texto: string,
): boolean {
  if (estado && suscripcion.estado !== estado) {
    return false;
  }
  const buscado = texto.trim().toLowerCase();
  if (!buscado) {
    return true;
  }
  return (
    suscripcion.emailUsuario.toLowerCase().includes(buscado) ||
    suscripcion.plan.toLowerCase().includes(buscado)
  );
}
