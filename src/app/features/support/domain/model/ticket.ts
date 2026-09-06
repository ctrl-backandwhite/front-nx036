/**
 * Un ticket de soporte: lo que alguien abre cuando algo no va, y la conversación que sigue.
 *
 * <p>Modelo de NEGOCIO, no la respuesta del backend. `estado` y `prioridad` se dejan como texto libre a
 * propósito: los define el servidor y añade valores nuevos sin avisar al front. Con una lista cerrada,
 * un estado nuevo dejaría el ticket sin etiqueta o —peor— reventaría la pantalla.
 */
export type ClaseDeTicket = 'SUPPORT' | 'DISPUTE';

export interface Ticket {
  readonly id: string;
  readonly clase: ClaseDeTicket;
  readonly asunto: string;
  readonly cuerpo?: string;
  readonly idPedido?: string;
  readonly estado: string;
  readonly prioridad: string;
  readonly resolucion?: string;
  readonly creadoEl: string;
}

export interface NuevoTicket {
  readonly clase: ClaseDeTicket;
  readonly asunto: string;
  readonly cuerpo?: string;
  readonly idPedido?: string;
  readonly prioridad?: string;
}

/** Un mensaje del hilo. `deSoporte` dice quién lo escribió: la casa o quien abrió el ticket. */
export interface MensajeDelHilo {
  readonly id: string;
  readonly deSoporte: boolean;
  readonly cuerpo: string;
  readonly creadoEl: string;
}

/**
 * ¿Este mensaje es «mío»?
 *
 * <p>Depende de quién mira, y por eso es una regla y no un campo: en el panel, «mío» es lo que escribió
 * soporte; en la pantalla del cliente, lo contrario. El mismo hilo se pinta al revés según el lado, y
 * tenerlo escrito una sola vez evita que las dos vistas acaben discrepando.
 */
export function esMio(mensaje: MensajeDelHilo, miroComoSoporte: boolean): boolean {
  return miroComoSoporte ? mensaje.deSoporte : !mensaje.deSoporte;
}

/** Un ticket ya resuelto no se vuelve a resolver: la pantalla oculta el formulario. */
export function estaResuelto(ticket: Ticket): boolean {
  return ticket.estado.toUpperCase() === 'RESOLVED';
}
