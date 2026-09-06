import { ClaseDeImportacion } from './esquema-de-importacion';
import { FilaDeImportacion, ProblemaDeFila, validaFilas } from './importacion-masiva';

/**
 * Lo que se sabe del texto pegado en el importador, sin haber mandado nada.
 *
 * <p>Se analiza EN VIVO al escribir porque el fallo típico —una coma de más al pegar desde otro
 * sitio— se arregla en dos segundos si se ve dónde está, y cuesta un viaje al servidor si no.
 */
export type AnalisisDeJson =
  | { readonly clase: 'vacio' }
  | { readonly clase: 'sintaxis'; readonly mensaje: string; readonly linea?: number; readonly columna?: number }
  | { readonly clase: 'no-es-lista' }
  | { readonly clase: 'invalido'; readonly filas: number; readonly problemas: readonly ProblemaDeFila[] }
  | { readonly clase: 'valido'; readonly filas: number; readonly lista: readonly FilaDeImportacion[] };

/**
 * Traduce la posición que da `JSON.parse` a línea y columna.
 *
 * <p>El mensaje del navegador dice «position 1423», que en un fichero de mil líneas no ayuda a nadie.
 */
function ubica(texto: string, mensaje: string): { linea?: number; columna?: number } {
  const encontrado = mensaje.match(/position (\d+)/);
  if (!encontrado) {
    return {};
  }
  const posicion = Math.min(Number(encontrado[1]), texto.length);
  const anterior = texto.slice(0, posicion);
  return { linea: anterior.split('\n').length, columna: posicion - anterior.lastIndexOf('\n') };
}

export function analizaJson(texto: string, clase: ClaseDeImportacion): AnalisisDeJson {
  const limpio = texto.trim();
  if (!limpio) {
    return { clase: 'vacio' };
  }
  let analizado: unknown;
  try {
    analizado = JSON.parse(limpio);
  } catch (error) {
    const mensaje = String((error as Error)?.message ?? '');
    return { clase: 'sintaxis', mensaje, ...ubica(limpio, mensaje) };
  }
  if (!Array.isArray(analizado)) {
    return { clase: 'no-es-lista' };
  }
  const problemas = validaFilas(analizado, clase);
  return problemas.length
    ? { clase: 'invalido', filas: analizado.length, problemas }
    : { clase: 'valido', filas: analizado.length, lista: analizado as FilaDeImportacion[] };
}
