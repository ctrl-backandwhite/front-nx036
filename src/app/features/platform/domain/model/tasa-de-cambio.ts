/**
 * Las tasas de cambio, vistas desde «platform».
 *
 * <p>No es el catálogo de divisas de la aplicación: es lo mínimo que estas pantallas necesitan para
 * enseñar un importe que el backend guarda en dólares o en yuanes. Cuando el equipo de `core` publique
 * su servicio de divisas, este modelo y su puerto desaparecen y se llama a aquel. Mientras tanto,
 * declarar aquí lo poco que hace falta es preferible a esperar o a copiar el almacén entero.
 */
export interface TasaDeCambio {
  readonly codigo: string;
  /**
   * Unidades de esa divisa por UN dólar (USD = 1, EUR = 0,92, CNY = 7,24), igual que en el backend.
   *
   * <p>OJO CON EL SENTIDO: pasar de la divisa a dólares es DIVIDIR. Se multiplicaba, y 100 € se
   * guardaban como 92 $ en vez de 108,70 $: un 15 % menos de presupuesto del que el cliente había
   * autorizado. Por eso la conversión está en {@link aDolares} y no suelta en una plantilla.
   */
  readonly porDolar: number;
}

/** La tasa de una divisa, o 1 si no se conoce: un cambio desconocido no puede inventar un importe. */
export function tasaDe(tasas: readonly TasaDeCambio[], codigo: string): number {
  const tasa = tasas.find((t) => t.codigo === codigo)?.porDolar;
  return tasa && tasa > 0 ? tasa : 1;
}

/** De una divisa cualquiera a dólares. DIVIDIR, no multiplicar. */
export function aDolares(
  importe: number,
  divisa: string,
  tasas: readonly TasaDeCambio[],
): number {
  if (!Number.isFinite(importe) || importe === 0) {
    return 0;
  }
  return divisa === 'USD' ? importe : importe / tasaDe(tasas, divisa);
}

/** De una divisa a otra, pasando por dólares, que es la unidad común. */
export function convierte(
  importe: number,
  desde: string,
  hasta: string,
  tasas: readonly TasaDeCambio[],
): number {
  return aDolares(importe, desde, tasas) * tasaDe(tasas, hasta);
}

/**
 * Un importe listo para leer.
 *
 * <p>`Intl` sabe dónde va el símbolo y cuántos decimales lleva cada divisa; escribirlo a mano acaba
 * enseñando «1.234,56 €» a quien espera «€1,234.56». Si la divisa no es un código válido, `Intl`
 * lanza: se cae a enseñar el número con el código detrás antes que dejar la pantalla en blanco.
 */
export function formateaImporte(importe: number, divisa: string, idioma: string): string {
  try {
    return new Intl.NumberFormat(idioma, { style: 'currency', currency: divisa }).format(importe);
  } catch {
    return `${importe.toFixed(2)} ${divisa}`;
  }
}
