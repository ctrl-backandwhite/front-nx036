/**
 * Un número que viene del backend, listo para usar.
 *
 * <p>Existe porque los importes y los recuentos llegan de tres formas —número, texto decimal o
 * ausentes— y las tres tienen que acabar en un número de verdad. Lo que NO puede pasar es que llegue un
 * `NaN` a la pantalla: se pinta literalmente, y «NaN €» en una tabla de saldos es de las cosas que
 * hacen desconfiar de todo el panel.
 *
 * <p>Está aquí y no repetido en cada adaptador para que la comprobación no se olvide en el siguiente:
 * de paso, deja cada traducción como una lista de asignaciones legible, sin una ristra de `??`.
 */
export function cifra(valor: unknown, porDefecto = 0): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
}
