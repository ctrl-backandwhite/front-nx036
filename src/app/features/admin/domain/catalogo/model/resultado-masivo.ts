/**
 * Lo que devuelve una acción aplicada a muchas filas.
 *
 * <p>El backend itera y reporta POR IDENTIFICADOR: una transición imposible cuenta como fallo pero no
 * aborta el lote. Por eso hay dos números y una lista de motivos, y no un simple «salió bien».
 */
export interface ResultadoMasivo {
  readonly correctos: number;
  readonly fallidos: number;
  readonly errores: readonly string[];
}

/** Los primeros motivos, que es lo que cabe en un aviso sin convertirlo en un muro de texto. */
export function primerosErrores(resultado: ResultadoMasivo, cuantos = 8): string {
  return resultado.errores.slice(0, cuantos).join('\n');
}

/** Un lote con algún fallo no es un éxito, pero tampoco un fracaso: se avisa en tono de advertencia. */
export function huboFallos(resultado: ResultadoMasivo): boolean {
  return resultado.fallidos > 0;
}
