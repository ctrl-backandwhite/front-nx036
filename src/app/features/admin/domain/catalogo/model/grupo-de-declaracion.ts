/**
 * Los grupos de declaración aduanera: la terna (partida, material y uso) y la descripción genérica con
 * la que se declaran todos los productos que la comparten.
 *
 * <p>El derecho temporal de la Unión son 3 EUR <b>por línea de declaración</b>, no por producto. Dos
 * artículos que viajan con la misma descripción son una sola línea y pagan un solo derecho; con
 * descripciones distintas son dos y pagan dos.
 *
 * <p><b>Aprobar es firmar.</b> Mientras un grupo esté sin aprobar, cada producto sigue siendo su propia
 * línea: se cobra de más, nunca de menos. Y editar el texto de uno ya aprobado lo devuelve a «sin
 * revisar», porque cambiar la descripción es cambiar lo que se declara ante veintisiete aduanas.
 */
export interface GrupoDeDeclaracion {
  readonly id: string;
  readonly hs6: string;
  readonly material: string;
  readonly codigoDeUso: string;
  /** Descripción en inglés: es la que viaja en la guía. Sin ella no hay nada que firmar. */
  readonly nombreEn: string;
  readonly nombreZh: string;
  readonly numeroDeProductos: number;
  readonly aprobado: boolean;
  /**
   * La descripción sigue siendo el relleno con el que nació el grupo —el número de la partida y nada
   * más—, así que no se puede firmar hasta escribirla. Lo decide el backend, que es donde vive la
   * regla que genera ese relleno.
   */
  readonly sinRedactar: boolean;
  readonly aprobadoEl?: string;
  readonly aprobadoPor?: string;
}

/**
 * Sin descripción en inglés el transportista rechazaría la guía, así que no se puede aprobar.
 *
 * <p>Que el texto siga siendo el relleno de la partida —«Goods of HS heading 611212»— NO lo impide:
 * es lo que se firma en producción, y quien firma responde de lo que se declara. La fila lo marca
 * como «Sin redactar» para que se vea lo que se está firmando; decidirlo por quien tiene la
 * responsabilidad sería otra cosa.
 */
export function puedeAprobarse(nombreEn: string): boolean {
  return nombreEn.trim() !== '';
}

/** ¿Se ha tocado el texto respecto a lo que guarda el servidor? Sin cambios no hay nada que guardar. */
export function descripcionCambiada(
  grupo: GrupoDeDeclaracion,
  nombreEn: string,
  nombreZh: string,
): boolean {
  return nombreEn !== (grupo.nombreEn ?? '') || nombreZh !== (grupo.nombreZh ?? '');
}
