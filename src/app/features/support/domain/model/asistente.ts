/**
 * El asistente que acompaña la navegación: cómo está, dónde vive y qué le toca decir.
 *
 * <p>Todo esto son reglas puras y viven en el dominio porque cada una nació de un problema real en
 * pantalla, y conviene poder probarlas sin montar un navegador.
 */
export type EstadoDelAsistente = 'activo' | 'mini' | 'oculto';

export interface PosicionDelAsistente {
  readonly derecha: number;
  readonly abajo: number;
}

/**
 * Dónde arranca: la columna de la esquina, de abajo arriba, es volver al inicio (24), el chat (112) y
 * el asistente aquí. Con aire entre cada uno: pegados se leen como un solo bloque y se pulsa el que no
 * es. Es solo el punto de partida — se puede arrastrar a donde estorbe menos.
 *
 * <p>En el móvil los tres suben en bloque lo que mide la barra de pestañas, y eso se resuelve en la
 * hoja de estilos, no aquí: esta posición se guarda y se arrastra, así que si dependiera del tamaño de
 * la pantalla, un valor guardado en el móvil reaparecería descolocado en el escritorio.
 */
export const POSICION_INICIAL: PosicionDelAsistente = { derecha: 24, abajo: 200 };

/** Cuánto hay que mover el dedo para que cuente como arrastre y no como pulsación. */
export const UMBRAL_DE_ARRASTRE = 4;

/**
 * Acota la posición al hueco visible.
 *
 * <p>Se ancla por la DERECHA y por ABAJO, no en coordenadas absolutas: así, al cambiar el tamaño de la
 * ventana, el asistente sigue dentro de la pantalla en vez de quedarse fuera del borde.
 */
export function acotaPosicion(
  posicion: PosicionDelAsistente,
  ancho: number,
  alto: number,
): PosicionDelAsistente {
  return {
    derecha: Math.max(8, Math.min(Math.max(8, ancho - 80), posicion.derecha)),
    abajo: Math.max(8, Math.min(Math.max(8, alto - 80), posicion.abajo)),
  };
}

/** La cara que pone según lo que está ocurriendo. Es el 90 % de lo que le da carácter. */
export type Animo = 'quieto' | 'pensando' | 'contento' | 'arrastrado' | 'dormido';

export function animoDe(datos: {
  estado: EstadoDelAsistente;
  arrastrando: boolean;
  consultando: boolean;
  contento: boolean;
}): Animo {
  if (datos.estado === 'mini') {
    return 'dormido';
  }
  if (datos.arrastrando) {
    return 'arrastrado';
  }
  if (datos.consultando) {
    return 'pensando';
  }
  return datos.contento ? 'contento' : 'quieto';
}

/**
 * Qué toca decir ahora mismo, en el MISMO orden en que se pinta.
 *
 * <p>El orden no es caprichoso: primero la guía —quien no sabe cómo se calcula el precio final no
 * entiende una sugerencia sobre aranceles—, después el saludo y, por último, lo que conviene añadir.
 * Enseñar las tres cosas a la vez es no enseñar ninguna.
 *
 * <p>Devuelve CLAVES de traducción y no textos: el dominio no sabe de idiomas.
 */
export interface QueDecir {
  readonly clave: string;
  /** Nombres de producto que se leen detrás del titular, cuando los hay. */
  readonly productos?: readonly string[];
}

export function queToca(datos: {
  guiaPendiente: boolean;
  saludando: boolean;
  globoAbierto: boolean;
  sugerencias: readonly { titulo: string; motivo?: string }[];
}): QueDecir | null {
  if (datos.guiaPendiente) {
    return { clave: 'avatar.guide_offer' };
  }
  if (datos.saludando) {
    return { clave: 'avatar.greeting' };
  }
  if (datos.globoAbierto && datos.sugerencias.length > 0) {
    return {
      clave: esPorEnvio(datos.sugerencias)
        ? 'avatar.suggest_title_shipping'
        : 'avatar.suggest_title',
      productos: datos.sugerencias.map((s) => s.titulo),
    };
  }
  return null;
}

/**
 * ¿El ahorro que se ofrece es de ENVÍO y no de aduana?
 *
 * <p>Cambia el discurso entero del globo. Anunciar «sin arancel extra» cuando la razón es el envío
 * sería prometer un ahorro que la aduana no da.
 */
export function esPorEnvio(sugerencias: readonly { motivo?: string }[]): boolean {
  return sugerencias.length > 0 && sugerencias[0].motivo === 'SHIPPING';
}
