/**
 * Lo mínimo para poder añadir algo a la cesta: quién es y cómo se llama.
 *
 * <p>El precio es opcional porque no todas las superficies que añaden lo conocen: por las sugerencias del
 * asistente no viaja ningún importe, y se resuelve contra la ficha en el momento de añadir.
 *
 * <p>Vive en el DOMINIO y no junto al caso de uso porque forma parte del contrato público de la cesta: es
 * lo que otros contextos —el catálogo, el asistente— tienen que saber componer para poder añadir.
 */
export interface ProductoAnadible {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagen?: string;
  readonly precioMostrado?: number;
  readonly divisaMostrada?: string;
}

/**
 * Cómo acabó el intento de añadir.
 *
 * <p>No se lanza ningún aviso desde dentro: los avisos son interfaz y quien pinta decide cómo contarlo.
 * Aquí solo se dice QUÉ ha pasado.
 */
export interface ResultadoAlAnadir {
  readonly estado: 'anadido' | 'sin-existencias';
  /**
   * Conviene recordar el ahorro por juntar unidades. Solo con pedido mínimo de una: con más, la segunda
   * unidad no es una decisión de quien compra.
   */
  readonly sugiereAhorroDeEnvio: boolean;
}
