/**
 * La bandeja de soporte del panel: incidencias y disputas de los clientes.
 *
 * <p>Un ticket lo abre quien compra; aquí solo se lee, se contesta y se resuelve. La resolución cierra
 * el caso para el cliente, así que se escribe una razón: cerrar sin explicación deja al cliente sin
 * saber qué pasó con su reclamación.
 */
export interface Ticket {
  readonly id: string;
  readonly clase: string;
  readonly estado: string;
  readonly prioridad: string;
  readonly asunto: string;
  readonly cuerpo?: string;
  readonly resolucion?: string;
  readonly creadoEl: string;
}

/** Un mensaje del hilo. `deSoporte` distingue quién lo escribió, que es lo que ordena la conversación. */
export interface MensajeDeTicket {
  readonly id: string;
  readonly deSoporte: boolean;
  readonly cuerpo: string;
  readonly creadoEl: string;
}

export const ESTADOS_DE_TICKET: readonly string[] = ['OPEN', 'RESOLVED', 'CLOSED'];

/** Un ticket ya resuelto no se vuelve a resolver: el formulario de cierre desaparece. */
export function admiteResolucion(ticket: Ticket): boolean {
  return ticket.estado !== 'RESOLVED';
}
