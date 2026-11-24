/**
 * Una incidencia de envío: algo que el transportista ha detectado en un bulto —aduana, retención,
 * dirección, devolución— y que alguien de la casa tiene que atender.
 *
 * <p>Se abre sola cuando el seguimiento la detecta y solo se cierra a mano, con una nota: así queda
 * dicho qué se hizo, y no se pierde entre los pedidos que avanzan con normalidad.
 */
export type EstadoDeIncidencia = 'OPEN' | 'RESOLVED';

export interface IncidenciaDeEnvio {
  readonly id: string;
  readonly pedidoId: string;
  readonly numeroDePedido?: string;
  readonly secuenciaDelBulto?: number;
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly codigo?: string;
  readonly causa?: string;
  /** ¿Es culpa nuestra (dirección mal puesta, partida equivocada…) y no del transportista o del cliente? */
  readonly culpaNuestra: boolean;
  readonly estado: EstadoDeIncidencia;
  readonly abiertaEl?: string;
  readonly resueltaEl?: string;
  readonly resueltaPor?: string;
  readonly nota?: string;
}

/** Lo que se filtra EN EL SERVIDOR: el listado crece con las ventas y no se recorta en el navegador. */
export interface CriterioDeIncidencias {
  readonly transportista?: string;
  readonly estado?: EstadoDeIncidencia;
  readonly pagina: number;
  readonly tamano: number;
}

export interface PaginaDeIncidencias {
  readonly incidencias: readonly IncidenciaDeEnvio[];
  readonly total: number;
  readonly paginas: number;
  readonly pagina: number;
}

/** Los transportistas que se ofrecen para filtrar. Los dos que hoy emiten guías. */
export const TRANSPORTISTAS_FILTRABLES = ['YUNEXPRESS', 'FOURPX'] as const;
