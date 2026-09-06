/**
 * Los colores de las etiquetas de un ticket.
 *
 * <p>Están en presentación y no en el dominio: el estado de un ticket es negocio, de qué color se pinta
 * no. Van en una tabla y no repartidos por las plantillas para que la lista del cliente y la del panel
 * no acaben pintando el mismo estado de dos colores distintos.
 *
 * <p>Las claves se buscan en MINÚSCULAS porque el backend manda unas veces `OPEN` y otras `open`, y una
 * etiqueta sin color se leía como un estado desconocido.
 */
const ESTADO: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-primary/15 text-primary',
  pending: 'bg-warning/15 text-warning',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-base-300 opacity-80',
};

const PRIORIDAD: Record<string, string> = {
  low: 'bg-base-300 opacity-80',
  normal: 'bg-base-300 opacity-80',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-error/15 text-error',
};

const POR_DEFECTO = 'bg-base-300 opacity-80';

export function colorDeEstado(estado: string): string {
  return ESTADO[(estado || '').toLowerCase()] ?? POR_DEFECTO;
}

export function colorDePrioridad(prioridad: string): string {
  return PRIORIDAD[(prioridad || '').toLowerCase()] ?? POR_DEFECTO;
}

/** Una reclamación se distingue de una consulta a simple vista: no se atienden igual. */
export function colorDeClase(clase: string): string {
  return clase === 'DISPUTE' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary';
}
