/**
 * Aprovisionamiento: pedir a un agente que consiga un producto que todavía no está en el catálogo.
 *
 * <p>El ciclo es: se abre una solicitud con el enlace del mercado de origen, los agentes envían sus
 * cotizaciones, y quien la abrió elige una. Desde ahí el pedido sigue el camino normal.
 */

export interface SolicitudDeAprovisionamiento {
  readonly id: string;
  readonly urlDeOrigen: string;
  readonly origen?: string;
  readonly idExterno?: string;
  readonly estado: string;
  readonly tituloOrientativo?: string;
  readonly notas?: string;
  readonly cotizacionElegida?: string;
  readonly creadaEl: string;
  readonly cuantasCotizaciones: number;
}

export interface AgenteResumido {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly satisfaccion: number;
  readonly trabajosCompletados: number;
  readonly avatarUrl?: string;
}

export interface Cotizacion {
  readonly id: string;
  readonly idSolicitud: string;
  readonly agente?: AgenteResumido;
  /**
   * En CÉNTIMOS de dólar, que es como lo guarda el backend. No se convierte aquí: quien lo pinta lo
   * pasa por el formateador con su divisa de origen, para que una división suelta no se cuele en la
   * plantilla y acabe habiendo dos maneras distintas de calcular el mismo importe.
   */
  readonly precioEnCentimosUsd: number;
  readonly diasEstimados: number;
  readonly cantidadMinima?: number;
  readonly notas?: string;
  readonly estado: string;
  readonly creadaEl: string;
}

export interface NuevaSolicitud {
  readonly url: string;
  readonly tituloOrientativo?: string;
  readonly notas?: string;
}

/** Por qué se rechaza un enlace. `null` significa que vale. */
export type FalloDeUrl = 'invalida' | 'no-soportada';

/**
 * Los mercados de los que se sabe extraer una ficha. Cualquier otro enlace se rechaza ANTES de gastar
 * una llamada, porque el agente no podría trabajar con él.
 */
const MERCADOS_SOPORTADOS = /(1688\.com|taobao\.com|aliexpress\.com|ebay\.com|amazon\.)/i;

/**
 * ¿Sirve este enlace para abrir una solicitud?
 *
 * <p>Se comprueban dos cosas distintas y se distinguen en la respuesta, porque el remedio no es el
 * mismo: «no es una dirección» se arregla escribiéndola bien, y «no es un mercado soportado» se
 * arregla buscando el producto en otro sitio. Un único mensaje para los dos casos dejaba al usuario
 * corrigiendo la parte que ya estaba bien.
 *
 * <p>Se exige `http`/`https` explícitamente: `javascript:` y `data:` construyen una `URL` válida.
 */
export function validaUrlDeMercado(bruta: string): FalloDeUrl | null {
  const texto = bruta.trim();
  let analizada: URL;
  try {
    analizada = new URL(texto);
  } catch {
    return 'invalida';
  }
  if (analizada.protocol !== 'http:' && analizada.protocol !== 'https:') {
    return 'invalida';
  }
  return MERCADOS_SOPORTADOS.test(texto) ? null : 'no-soportada';
}

/**
 * ¿Se puede cancelar todavía?
 *
 * <p>Una solicitud ya aprobada tiene un pedido detrás y cancelarla desde aquí dejaría al proveedor
 * trabajando en algo que nadie va a recoger; una ya cancelada no se cancela dos veces.
 */
export function sePuedeCancelar(solicitud: SolicitudDeAprovisionamiento): boolean {
  return solicitud.estado !== 'CANCELLED' && solicitud.estado !== 'APPROVED';
}

/** Una vez aprobada, la cotización elegida ya no se cambia. */
export function sePuedeElegirCotizacion(solicitud: SolicitudDeAprovisionamiento): boolean {
  return solicitud.estado !== 'APPROVED';
}
