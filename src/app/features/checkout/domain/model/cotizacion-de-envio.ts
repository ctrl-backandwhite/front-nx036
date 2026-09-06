/**
 * El desglose del pedido para un destino concreto: envío, aranceles, impuesto y total.
 *
 * <p>REGLA DURA DEL PROYECTO: todo esto lo calcula el SERVIDOR y llega ya escrito. Aquí no hay una sola
 * operación aritmética con dinero, ni siquiera «para enseñar un aproximado». El envío entra en la base
 * del impuesto, así que el total de una opción más cara no se puede obtener sumando la diferencia en el
 * navegador; y un aproximado que después sube es la forma más rápida de perder la venta.
 *
 * <p>Los pocos campos numéricos que llegan existen para DECIDIR, no para pintar: si hay línea que
 * enseñar, y si el saldo del monedero alcanza.
 */

/**
 * Una forma de envío entre las que se puede elegir.
 *
 * <p>`codigo` es el canal del transportista: viaja de vuelta al pagar para emitir la guía por el mismo
 * canal que se cotizó, pero NO se le enseña a quien compra —«FZZXR» no le dice nada a nadie—.
 */
export interface OpcionDeEnvio {
  readonly codigo: string;
  /** Solo para comparar entre opciones y nombrarlas. El importe que se pinta es `importeFormateado`. */
  readonly importeParaComparar: number;
  readonly importeFormateado: string;
  /** Con qué empresa viaja, con el nombre ya presentable que compone el backend. */
  readonly transportista?: string;
  readonly diasMinimos: number;
  readonly diasMaximos: number;
}

export interface CotizacionDeEnvio {
  /** Falso cuando el transportista no cubre ese destino: entonces no hay pedido posible. */
  readonly cubierto: boolean;
  readonly envioBaseFormateado?: string;
  readonly envioFormateado?: string;
  /** Lo que se paga de porte con la subvención ya descontada. Llega siempre, aunque sea cero. */
  readonly envioNetoFormateado?: string;
  readonly subvencionDeEnvioFormateada?: string;
  readonly subvencionDeEnvioPorciento?: number;
  /** La subvención cubre el porte entero: se dice «envío gratis», que es lo que se entiende. */
  readonly envioGratis?: boolean;
  readonly recargoDeAduanaFormateado?: string;
  /** Céntimos del recargo de aduana. Solo para saber si hay línea que enseñar. */
  readonly recargoDeAduanaCentimos?: number;
  readonly subvencionDeAranceLFormateada?: string;
  readonly subvencionDeArancelPorciento?: number;
  readonly aranceLNetoFormateado?: string;
  readonly impuestoFormateado?: string;
  /** Tipo del impuesto en puntos básicos. Solo decide si hay línea de impuesto que enseñar. */
  readonly impuestoPuntosBasicos?: number;
  readonly totalFormateado?: string;
  /**
   * Total del pedido en céntimos de DÓLAR.
   *
   * <p>Va además del formateado porque es lo único con lo que se puede comparar el saldo del monedero,
   * que llega en la misma unidad. Sin él, decidir si el saldo alcanza obligaría al navegador a convertir
   * —o a interpretar el texto «129,72 €»—, que es justo lo que la norma de precios impide.
   */
  readonly totalCentimosUsd?: number;
  readonly descuentoCentimos?: number;
  readonly descuentoFormateado?: string;
  /** El valor de los bienes supera el umbral de importación: el envío pasa por despacho formal. */
  readonly umbralDeAduanaSuperado?: boolean;
  /** Ese destino no admite pedidos por encima de su umbral: hay que dividir la cesta. */
  readonly aduanaBloqueada?: boolean;
  /** El umbral en la divisa legal del país («150 EUR»); vacío si no aplica. */
  readonly limiteDeAduana?: string;
  readonly diasMinimos?: number;
  readonly diasMaximos?: number;
  /** Eco del cupón aceptado y, si se rechazó, el motivo para enseñarlo bajo el campo. */
  readonly codigoDeCupon?: string;
  readonly errorDeCupon?: string;
  /** De más barata a más cara, y ya sin las que no pueden cumplir el régimen del destino. */
  readonly opciones?: readonly OpcionDeEnvio[];
  /**
   * El canal con el que está calculado ESTE desglose. No tiene por qué ser el que se pidió: si deja de
   * cotizar, el servidor cobra el más barato, y el selector debe marcar el que de verdad se paga.
   */
  readonly opcionCotizada?: string;
}

/** Cómo se llama cada opción DENTRO de esta cotización. */
export type CategoriaDeEnvio = 'express' | 'standard' | 'economy';

/** La opción con la que se compara el resto: la más barata, y ante empate la primera que cotizó. */
export function laMasBarata(opciones: readonly OpcionDeEnvio[]): OpcionDeEnvio {
  return opciones.reduce((a, b) => (b.importeParaComparar < a.importeParaComparar ? b : a));
}

/** La más rápida por plazo máximo; a igual plazo máximo, la que empieza antes, y luego la más barata. */
export function laMasRapida(opciones: readonly OpcionDeEnvio[]): OpcionDeEnvio {
  return opciones.reduce((a, b) => {
    if (b.diasMaximos !== a.diasMaximos) {
      return b.diasMaximos < a.diasMaximos ? b : a;
    }
    if (b.diasMinimos !== a.diasMinimos) {
      return b.diasMinimos < a.diasMinimos ? b : a;
    }
    return b.importeParaComparar < a.importeParaComparar ? b : a;
  });
}

/**
 * Cómo se llama una opción dentro de su lista.
 *
 * <p>El nombre sale del PRECIO relativo y no de un tramo fijo de plazo, porque «económico» es una palabra
 * sobre dinero: llamar así a la opción más cara —pasó en producción, 8,32 € frente a 7,05 €— destruye la
 * confianza en el resto de la pantalla. El plazo va escrito debajo, así que hay las dos cosas para
 * decidir.
 *
 * <p>Con una sola opción no hay comparación posible y se queda en «estándar»: nombrar la más barata de
 * una lista de una es un truco de venta.
 */
export function categoriaDeOpcion(
  opcion: OpcionDeEnvio,
  todas: readonly OpcionDeEnvio[],
): CategoriaDeEnvio {
  if (todas.length < 2) {
    return 'standard';
  }
  // La más barata manda sobre cualquier otra consideración: quien busca «económico» busca eso. Si además
  // resulta ser la más rápida, la insignia se encarga de decirlo.
  if (opcion.codigo === laMasBarata(todas).codigo) {
    return 'economy';
  }
  return opcion.codigo === laMasRapida(todas).codigo ? 'express' : 'standard';
}

/** Un país al que se puede enviar. */
export interface PaisDeEnvio {
  readonly codigo: string;
  readonly nombre: string;
}

/** Una subdivisión de primer nivel; el código es lo que el backend usa para el impuesto por estado. */
export interface RegionDeEnvio {
  readonly codigo: string;
  readonly nombre: string;
}
