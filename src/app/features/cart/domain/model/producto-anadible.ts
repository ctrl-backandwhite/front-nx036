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
  /** Lo que quien compra YA ha elegido. Ausente = elígelo tú. */
  readonly eleccion?: EleccionDeCompra;
}

/**
 * Variante y cantidad YA decididas por quien compra, tal como salen de la ficha.
 *
 * <p>Es opcional a propósito. Desde una tarjeta o desde una sugerencia no hay nada elegido y la cesta
 * resuelve sola la primera variante con existencias; desde la ficha, en cambio, la elección ya está
 * hecha —color, talla y unidades— y volver a resolverla aquí significaría dos cosas malas: pedir otra vez
 * la ficha para redescubrir lo que se acaba de decidir, y arriesgarse a meter en la cesta una variante
 * distinta de la que se estaba mirando.
 */
export interface EleccionDeCompra {
  readonly varianteId?: string;
  readonly sku?: string;
  /** Etiqueta legible ya compuesta: «Negro / M». La compone quien conoce los ejes. */
  readonly etiquetaDeVariante?: string;
  /**
   * Precio unitario de ESA variante, en la divisa que se le enseñó a quien compra. Importe y divisa
   * viajan emparejados en `ProductoAnadible`: separarlos fue lo que una vez pintó «117,26 €» por algo
   * que valía 14,90 €.
   */
  readonly precioUnitario?: number;
  readonly cantidad: number;
  /** Pedido mínimo del producto. Ausente equivale a uno. */
  readonly pedidoMinimo?: number;
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
