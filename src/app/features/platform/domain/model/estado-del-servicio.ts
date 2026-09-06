/**
 * El estado del servicio, tal y como lo ve quien mira desde fuera.
 *
 * <p>Sustituye al enlace roto a un panel de estado externo. No hay sondas por componente: se pincha un
 * endpoint público y, si el backend responde, todo lo que cuelga de él se da por operativo. Es una
 * simplificación honesta —y así está redactada la página—, mucho mejor que un enlace a un dominio que
 * no existe.
 */
export type SaludDelServicio = 'comprobando' | 'operativo' | 'degradado';

/** Los componentes que se enseñan. El nombre sale del diccionario con `status.comp.<clave>`. */
export const COMPONENTES_DEL_SERVICIO: readonly string[] = [
  'api',
  'catalog',
  'payments',
  'shipping',
  'email',
  'wallet',
];

/**
 * Traduce «¿responde el backend?» a lo que se pinta.
 *
 * <p>Mientras se comprueba NO se dice que esté degradado: un parpadeo de alarma cada vez que alguien
 * abre la página es peor que no tener página. Y no responder todavía no es lo mismo que responder mal.
 */
export function saludSegun(comprobando: boolean, respondio: boolean): SaludDelServicio {
  if (comprobando) {
    return 'comprobando';
  }
  return respondio ? 'operativo' : 'degradado';
}

/** La clave del diccionario para el rótulo grande de cabecera. */
export function claveDelTitular(salud: SaludDelServicio): string {
  switch (salud) {
    case 'comprobando':
      return 'status.checking';
    case 'operativo':
      return 'status.all_ok';
    default:
      return 'status.degraded';
  }
}

/** La clave del diccionario para la insignia de cada componente. */
export function claveDeLaInsignia(salud: SaludDelServicio): string {
  switch (salud) {
    case 'comprobando':
      return 'status.checking';
    case 'operativo':
      return 'status.operational';
    default:
      return 'status.issues';
  }
}
