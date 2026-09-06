import { Categoria } from '../../domain/model/aviso';

/**
 * Los colores de las etiquetas del buzón.
 *
 * <p>Están aquí, en la capa de presentación, y no en el dominio: de qué va un aviso es negocio, de qué
 * color se pinta no. Van como tabla y no repartidos por las plantillas para que la lista y el panel de
 * lectura no puedan pintar el mismo estado de dos colores distintos.
 */
export const COLOR_DE_CATEGORIA: Record<Categoria, string> = {
  support: 'bg-info/15 text-info',
  affiliate: 'bg-success/15 text-success',
  order: 'bg-primary/15 text-primary',
  billing: 'bg-warning/15 text-warning',
  newsletter: 'bg-secondary/15 text-secondary',
  system: 'bg-base-300 opacity-80',
  general: 'bg-base-300 opacity-80',
};

export const COLOR_DE_ESTADO: Record<string, string> = {
  NEW: 'bg-base-300 opacity-80',
  RECEIVED: 'bg-info/15 text-info',
  IN_PROGRESS: 'bg-warning/15 text-warning',
  WAITING: 'bg-secondary/15 text-secondary',
  RESOLVED: 'bg-success/15 text-success',
};

/** La clave de traducción del estado. `NEW` es el de partida cuando el backend no manda ninguno. */
export function claveDeEstado(estado: string | undefined): string {
  return 'notif.status.' + (estado || 'NEW').toLowerCase();
}

/**
 * El nombre legible del tipo de suceso.
 *
 * <p>Si no hay traducción, se humaniza el código en vez de enseñarlo tal cual: el backend añade sucesos
 * nuevos sin avisar al front, y ver `ORDER_FORWARDED` en pantalla es peor que ver «Order forwarded».
 */
export function nombreDelSuceso(t: (clave: string) => string, tipoDeSuceso: string): string {
  if (!tipoDeSuceso) {
    return '';
  }
  const clave = 'notif.type.' + tipoDeSuceso;
  const traducido = t(clave);
  if (traducido !== clave) {
    return traducido;
  }
  const legible = tipoDeSuceso.replace(/_/g, ' ').toLowerCase();
  return legible.charAt(0).toUpperCase() + legible.slice(1);
}
