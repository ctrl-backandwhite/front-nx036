import {
  CampoDeImportacion,
  ClaseDeImportacion,
  ESQUEMAS,
  TipoDeCampo,
} from './esquema-de-importacion';

/** Una fila de la importación: un objeto libre, porque el formato lo fija el backend, no el panel. */
export type FilaDeImportacion = Record<string, unknown>;

/** Un problema encontrado antes de mandar nada, con la fila y la clave del texto que lo explica. */
export interface ProblemaDeFila {
  readonly fila: number;
  readonly clave: string;
  /** El campo al que se refiere, cuando el problema es de un campo concreto. */
  readonly campo?: string;
}

/**
 * ¿La fila trae título en ALGÚN idioma?
 *
 * <p>El backend exige un título, pero no el español en particular: vale el de cualquier idioma fijo o
 * el de dentro de `translations`. Exigir aquí `titleEs` bloqueaba en el navegador la reimportación de
 * un producto exportado que no tuviera traducción española, sin que el backend lo hubiera rechazado.
 */
export function tieneAlgunTitulo(fila: FilaDeImportacion): boolean {
  const fijos = ['titleEs', 'titleEn', 'titlePt', 'titleZh'];
  if (fijos.some((clave) => typeof fila[clave] === 'string' && (fila[clave] as string).trim() !== '')) {
    return true;
  }
  const traducciones = fila['translations'];
  if (traducciones && typeof traducciones === 'object' && !Array.isArray(traducciones)) {
    return Object.values(traducciones as Record<string, unknown>).some((valor) => {
      const titulo = (valor as { title?: unknown } | null)?.title;
      return typeof titulo === 'string' && titulo.trim() !== '';
    });
  }
  return false;
}

function vacio(valor: unknown): boolean {
  return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
}

/**
 * Qué se comprueba y qué se dice de cada tipo de campo.
 *
 * <p>Va como TABLA y no como una cadena de condiciones: añadir un tipo es una entrada más, y cada
 * comprobación se lee entera de un vistazo junto al mensaje que produce.
 */
const COMPROBACIONES: Readonly<
  Record<TipoDeCampo, { readonly vale: (valor: unknown) => boolean; readonly clave: string } | undefined>
> = {
  string: undefined,
  number: {
    vale: (valor) => typeof valor !== 'boolean' && !isNaN(Number(valor)),
    clave: 'admin.catalog.bulk.err_number',
  },
  int: {
    vale: (valor) => typeof valor !== 'boolean' && Number.isInteger(Number(valor)),
    clave: 'admin.catalog.bulk.err_integer',
  },
  urls: {
    vale: (valor) => Array.isArray(valor) && valor.every((u) => typeof u === 'string'),
    clave: 'admin.catalog.bulk.err_array',
  },
  list: {
    vale: (valor) => Array.isArray(valor) && valor.every((u) => typeof u === 'string'),
    clave: 'admin.catalog.bulk.err_array',
  },
  objects: { vale: (valor) => Array.isArray(valor), clave: 'admin.catalog.bulk.err_array' },
  map: {
    vale: (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor),
    clave: 'admin.catalog.bulk.err_array',
  },
};

/** El problema de tipo de un campo, o nada si el valor encaja. */
function falloDeTipo(campo: CampoDeImportacion, valor: unknown): string | undefined {
  const comprobacion = COMPROBACIONES[campo.tipo];
  return comprobacion && !comprobacion.vale(valor) ? comprobacion.clave : undefined;
}

/**
 * Valida las filas ANTES de enviarlas, con las mismas reglas que el backend.
 *
 * <p>Validar aquí no sustituye al servidor: evita mandar diez mil filas para que la primera vuelva
 * rechazada. Los problemas se devuelven con su fila para poder señalar cuál es.
 */
export function validaFilas(
  filas: readonly unknown[],
  clase: ClaseDeImportacion,
): readonly ProblemaDeFila[] {
  if (!filas.length) {
    return [{ fila: 0, clave: 'admin.catalog.bulk.empty' }];
  }
  const esquema = ESQUEMAS[clase];
  const problemas: ProblemaDeFila[] = [];
  filas.forEach((cruda, indice) => {
    const numero = indice + 1;
    if (typeof cruda !== 'object' || cruda === null || Array.isArray(cruda)) {
      problemas.push({ fila: numero, clave: 'admin.catalog.bulk.err_object' });
      return;
    }
    const fila = cruda as FilaDeImportacion;
    if (clase === 'products' && !tieneAlgunTitulo(fila)) {
      problemas.push({ fila: numero, clave: 'admin.catalog.bulk.err_no_title' });
    }
    for (const campo of esquema) {
      const valor = fila[campo.clave];
      if (vacio(valor)) {
        if (campo.obligatorio) {
          problemas.push({ fila: numero, clave: 'admin.catalog.bulk.err_required', campo: campo.clave });
        }
        continue;
      }
      const fallo = falloDeTipo(campo, valor);
      if (fallo) {
        problemas.push({ fila: numero, clave: fallo, campo: campo.clave });
      }
    }
  });
  return problemas;
}

export interface LoteDeImportacion<T> {
  readonly filas: readonly T[];
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Parte las filas en lotes que quepan en una petición: como mucho `maxFilas` filas y, sobre todo, como
 * mucho `maxBytes` de cuerpo.
 *
 * <p>El TAMAÑO manda sobre el número. Una ficha exportada pesa unos 33 kB de media pero llega a pasar
 * de 100 kB, así que un lote contado solo por filas es impredecible en bytes — y lo que rechaza el
 * proxy son bytes. De ahí «19 creados, 200 fallidos» al reimportar un export: los lotes gordos se caían
 * ENTEROS con un 413 mudo antes de que el backend viera una sola fila.
 *
 * <p>Una fila que por sí sola pase del tope viaja igualmente sola: es la única forma de que llegue a
 * evaluarse y de que el error que reciba sea el suyo y no un 413 sin explicación.
 */
export function lotes<T>(
  filas: readonly T[],
  maxFilas: number,
  maxBytes: number,
): readonly LoteDeImportacion<T>[] {
  const salida: LoteDeImportacion<T>[] = [];
  let actual: T[] = [];
  let bytes = 0;
  let inicio = 1;
  filas.forEach((fila, indice) => {
    const peso = JSON.stringify(fila).length;
    if (actual.length > 0 && (actual.length >= maxFilas || bytes + peso > maxBytes)) {
      salida.push({ filas: actual, desde: inicio, hasta: indice });
      actual = [];
      bytes = 0;
      inicio = indice + 1;
    }
    actual.push(fila);
    bytes += peso;
  });
  if (actual.length > 0) {
    salida.push({ filas: actual, desde: inicio, hasta: filas.length });
  }
  return salida;
}

/** Cuántas filas van por lote como techo, y cuánto puede ocupar el cuerpo de una petición. */
export const FILAS_POR_LOTE = 100;
export const BYTES_POR_LOTE = 4 * 1024 * 1024;
