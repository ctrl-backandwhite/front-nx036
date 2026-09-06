/**
 * La conversación con el asistente.
 *
 * <p>Por aquí NO viaja ningún importe: los productos que sugiere llegan sin precio a propósito, y el
 * precio lo calcula y lo pinta la ficha. Un asistente que dice una cifra que luego no coincide con la
 * del carrito cuesta la venta entera.
 */
export interface ProductoDeLaConversacion {
  readonly slug: string;
  readonly titulo?: string;
  readonly imagen?: string;
}

/** Por qué no hubo respuesta. Lo dice el backend; el aviso lo pinta el front, ya traducido. */
export type MotivoSinRespuesta = 'OK' | 'UNAVAILABLE' | 'QUOTA';

export interface RespuestaDelAsistente {
  readonly idConversacion: string;
  /** Nulo cuando no pudo responder. */
  readonly texto: string | null;
  readonly productos: readonly ProductoDeLaConversacion[];
  readonly degradada: boolean;
  readonly motivo?: MotivoSinRespuesta;
  /** Con qué buscó en el catálogo, y cuántos encontró en total. */
  readonly busqueda?: { readonly consulta: string; readonly total: number };
}

/**
 * Un turno de la conversación, de quien pregunta o del asistente.
 *
 * <p>Lleva IDENTIFICADOR propio aunque la lista solo crezca por el final. Seguirla por su posición
 * obliga a Angular a reconstruir todas las burbujas cada vez que se añade una, y con ellas las fichas
 * de producto y sus imágenes: en una conversación larga se nota como un parpadeo con cada respuesta.
 */
export interface Turno {
  readonly id: string;
  readonly de: 'yo' | 'asistente';
  readonly texto: string;
  readonly productos?: readonly ProductoDeLaConversacion[];
  readonly busqueda?: { readonly consulta: string; readonly total: number };
}

/**
 * Qué clave de texto toca enseñar cuando el asistente no contesta.
 *
 * <p>Distinguir «cupo agotado» de «apagado» importa: lo primero se arregla esperando y lo segundo no,
 * y decir siempre lo mismo hace que se vuelva a intentar cuando no sirve de nada.
 */
export function claveDelAviso(motivo: MotivoSinRespuesta | undefined): string {
  return motivo === 'QUOTA' ? 'chat.quota' : 'chat.unavailable';
}

/**
 * El turno del asistente a partir de su respuesta, con el aviso puesto si no hubo texto.
 *
 * <p>Sale SIN identificador: lo pone el almacén al añadirlo, que es quien lleva la cuenta. Ponerlo
 * también aquí serían dos sitios decidiendo lo mismo.
 */
export function turnoDelAsistente(
  respuesta: RespuestaDelAsistente,
  avisoTraducido: string,
): Omit<Turno, 'id'> {
  return {
    de: 'asistente',
    texto: respuesta.degradada || !respuesta.texto ? avisoTraducido : respuesta.texto,
    productos: respuesta.productos,
    ...(respuesta.busqueda ? { busqueda: respuesta.busqueda } : {}),
  };
}
