/**
 * El resultado de una operación que puede fallar: o trae el valor, o trae el error.
 *
 * <p>Existe para que el DOMINIO no tenga que hablar en excepciones. Una excepción es un salto invisible:
 * no aparece en la firma, el compilador no obliga a atenderla y cualquier `catch` de más arriba se la
 * traga. Con esto, «esta operación puede fallar» está escrito en el tipo y quien la llama no puede seguir
 * sin decidir qué hace con el fallo.
 *
 * <p>Se usa en los PUERTOS y en los CASOS DE USO. Dentro de un adaptador se puede seguir trabajando con
 * excepciones —es lo que hablan las bibliotecas—, pero al cruzar la frontera se traducen a un `Result`.
 */
export type Result<T, E> = Exito<T> | Fallo<E>;

export interface Exito<T> {
  readonly ok: true;
  readonly valor: T;
}

export interface Fallo<E> {
  readonly ok: false;
  readonly error: E;
}

export function exito<T>(valor: T): Exito<T> {
  return { ok: true, valor };
}

export function fallo<E>(error: E): Fallo<E> {
  return { ok: false, error };
}

/** Transforma el valor si lo hubo; el fallo pasa de largo sin tocarse. */
export function mapea<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return r.ok ? exito(f(r.valor)) : r;
}

/** El valor, o el de repuesto si la operación falló. Para cuando el fallo no cambia lo que hay que pintar. */
export function valorOAlternativa<T, E>(r: Result<T, E>, alternativa: T): T {
  return r.ok ? r.valor : alternativa;
}
