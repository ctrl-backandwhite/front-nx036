/**
 * Lo mínimo de divisas que necesita el panel de catálogo.
 *
 * <p>NO es el catálogo de monedas de la aplicación: es lo justo para pintar el COSTE de origen —que el
 * backend guarda en yuanes— en la moneda de quien administra, y para deshacer esa conversión al
 * filtrar. Cuando exista un servicio de divisas compartido en `shared/` o `core/`, este modelo y su
 * puerto desaparecen; declarar aquí lo poco que hace falta es preferible a esperar o a copiar el
 * almacén entero de otro contexto.
 *
 * <p>Nada de esto calcula PRECIOS DE VENTA: el margen, el arancel y el IVA los aplica el backend.
 */
export interface Divisa {
  readonly codigo: string;
  /**
   * Unidades de esa divisa por UN dólar (USD = 1, EUR = 0,92, CNY = 7,24), igual que en el backend.
   *
   * <p>OJO CON EL SENTIDO: pasar de la divisa a dólares es DIVIDIR. Multiplicar deja los importes a un
   * 15 % de lo que valen y no salta ningún error.
   */
  readonly porDolar: number;
}

/** La tasa de una divisa, o 1 si no se conoce: un cambio desconocido no puede inventar un importe. */
export function tasaDe(divisas: readonly Divisa[], codigo: string): number {
  const tasa = divisas.find((divisa) => divisa.codigo === codigo)?.porDolar;
  return tasa && tasa > 0 ? tasa : 1;
}

/** De una divisa a otra, pasando por el dólar, que es la unidad común. */
export function convierte(
  importe: number,
  desde: string,
  hasta: string,
  divisas: readonly Divisa[],
): number {
  if (!Number.isFinite(importe) || importe === 0) {
    return 0;
  }
  const enDolares = desde === 'USD' ? importe : importe / tasaDe(divisas, desde);
  return enDolares * tasaDe(divisas, hasta);
}

/**
 * Un importe listo para leer.
 *
 * <p>`Intl` sabe dónde va el símbolo y cuántos decimales lleva cada divisa; escribirlo a mano acaba
 * enseñando «1.234,56 €» a quien espera «€1,234.56». Si el código no es válido, `Intl` lanza: se cae a
 * enseñar el número con el código detrás antes que dejar la celda en blanco.
 */
export function formateaImporte(importe: number, divisa: string, idioma: string): string {
  try {
    return new Intl.NumberFormat(idioma, { style: 'currency', currency: divisa }).format(importe);
  } catch {
    return `${importe.toFixed(2)} ${divisa}`;
  }
}
