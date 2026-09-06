/**
 * Impresión bajo demanda: se elige una prenda en blanco, se le pone un diseño y se vende sin stock.
 */

/** Una prenda o un objeto sin estampar, listo para llevar un diseño encima. */
export interface ProductoEnBlanco {
  readonly id: string;
  readonly titulo: string;
  readonly imagen?: string;
  readonly precio: number;
  readonly divisa: string;
}

export interface DisenoPod {
  readonly id: string;
  readonly idProducto: string;
  readonly tituloDelProducto: string;
  readonly nombre: string;
  readonly maquetaUrl?: string;
  readonly estado: string;
  readonly instruccionIa?: string;
  readonly creadoEl: string;
}

export interface NuevoDiseno {
  readonly idProducto: string;
  readonly nombre: string;
  readonly instruccionIa?: string;
}

/** Lo que devuelve el generador: la maqueta y con qué instrucción y proveedor se hizo. */
export interface MaquetaGenerada {
  readonly maquetaUrl: string;
  readonly instruccion: string;
  readonly proveedor: string;
}

/**
 * Instrucciones de ejemplo para el generador.
 *
 * <p>El texto va en INGLÉS a propósito y no pasa por el diccionario: es lo que se le manda al modelo,
 * no lo que se le enseña a nadie. Lo traducible es el nombre del estilo, que sí va por clave. Cuando
 * se tradujeron las instrucciones, el modelo entendía peor y las maquetas salían genéricas.
 */
export interface PlantillaDeInstruccion {
  readonly clave: string;
  readonly instruccion: string;
}

export const PLANTILLAS_DE_INSTRUCCION: readonly PlantillaDeInstruccion[] = [
  {
    clave: 'pod.template.minimalist',
    instruccion: 'Minimalist line-art mountain at sunset, single weight, off-white background',
  },
  {
    clave: 'pod.template.streetwear',
    instruccion: 'Bold Y2K streetwear graphic with neon gradients and chrome typography',
  },
  {
    clave: 'pod.template.botanical',
    instruccion: 'Vintage botanical illustration of monstera leaves, watercolor texture',
  },
  {
    clave: 'pod.template.retro',
    instruccion: 'Retro 80s arcade sun and palm trees, magenta and cyan grid',
  },
];

/** Los cuatro pasos que explica la portada de la sección. Son datos, no marcado. */
export const PASOS_DE_IMPRESION: readonly string[] = [
  'pod.how.s1',
  'pod.how.s2',
  'pod.how.s3',
  'pod.how.s4',
];

/**
 * ¿Se puede crear el diseño ya?
 *
 * <p>Sin nombre no se crea: el listado de diseños es una rejilla de miniaturas y una fila sin nombre
 * es indistinguible de las demás en cuanto hay tres.
 */
export function sePuedeCrear(nombre: string): boolean {
  return nombre.trim().length > 0;
}

/**
 * ¿Vale este nombre nuevo al renombrar?
 *
 * <p>Vacío no, y el mismo de antes tampoco: guardar lo que ya estaba guardado gasta una llamada y
 * enseña una confirmación de algo que no ha pasado.
 */
export function esRenombradoValido(nuevo: string | null, actual: string): boolean {
  const limpio = (nuevo ?? '').trim();
  return limpio.length > 0 && limpio !== actual;
}
