/**
 * Lo que cuesta cada canal del transportista en cada destino, por tramos de peso.
 *
 * <p>La tabla la mide sola un cron cada tres horas: el panel está para MIRARLA —saber qué se está
 * cobrando y si el refresco sigue vivo— y para forzar una medición cuando el transportista acaba de
 * cambiar precios y no se quiere esperar.
 *
 * <p><b>Lo que se edita a mano se pisa en el siguiente refresco.</b> La fuente de verdad es el
 * transportista; una corrección aquí es un parche hasta que la medición lo confirme. Para que un
 * valor sobreviva hay que desactivar la fila, no editarla.
 */

/**
 * La tarifa de un tramo, tal y como la guarda el backend.
 *
 * <p>No es un precio por peso sino los parámetros de la recta que lo describe:
 * {@code registro + precioPorKilo × max(peso redondeado al escalón, mínimo)}. Guardar la recta y no
 * una fila por peso es lo que permite cotizar cualquier bulto sin preguntar al transportista.
 */
export interface TarifaDeTransportista {
  readonly id: string;
  /** Canal del transportista (p. ej. `FZZXR`, la línea de ropa). */
  readonly canal: string;
  /** Destino ISO-2. */
  readonly pais: string;
  /** Nombre comercial del canal, el que se le enseña al comprador. */
  readonly nombreCanal?: string;
  /** Techo del tramo en gramos; el tramo empieza donde acaba el anterior. */
  readonly hastaGramos: number;
  /** Lo que se paga por emitir la guía, haya el peso que haya. En yuanes. */
  readonly registroRmb: number;
  /** Lo que se paga por cada kilo facturable. En yuanes. */
  readonly precioRmbKg: number;
  /** Peso mínimo que factura el canal. 0 = no tiene. */
  readonly minGramos: number;
  /** Múltiplo al que el canal redondea el peso hacia arriba. 0 = no redondea. */
  readonly escalonGramos: number;
  readonly diasMin: number;
  readonly diasMax: number;
  /** Con qué desvío encajó la recta al medirla. Por encima de cero, la tarifa dejó de ser recta. */
  readonly desvioRmb: number;
  readonly activo: boolean;
  /** Cuándo se midió. Sin esto no se distingue una tarifa buena de una de hace una semana. */
  readonly medidoEn?: string;
  /** Lo que costaría medio kilo: la columna que hace legible una tabla de parámetros. */
  readonly ejemplo500gRmb: number;
  /** El cron no la ha tocado en más de diez horas, o sea que se ha saltado tres pasadas. */
  readonly vieja: boolean;
}

/** Lo que se puede filtrar en el listado. Todo opcional y combinable. */
export interface FiltroDeTarifas {
  readonly pais: string;
  readonly canal: string;
  readonly soloViejas: boolean;
  readonly soloDesviadas: boolean;
  readonly incluirInactivas: boolean;
}

export const FILTRO_DE_TARIFAS_VACIO: FiltroDeTarifas = {
  pais: '',
  canal: '',
  soloViejas: false,
  soloDesviadas: false,
  incluirInactivas: false,
};

/** Cuántos filtros hay puestos, para la insignia de la barra. */
export function cuantosFiltrosDeTarifas(filtro: FiltroDeTarifas): number {
  return (
    (filtro.pais ? 1 : 0) +
    (filtro.canal ? 1 : 0) +
    (filtro.soloViejas ? 1 : 0) +
    (filtro.soloDesviadas ? 1 : 0) +
    (filtro.incluirInactivas ? 1 : 0)
  );
}

/** Los destinos presentes en la tabla, ordenados, para poder elegir uno. */
export function paisesDe(tarifas: readonly TarifaDeTransportista[]): readonly string[] {
  return [...new Set(tarifas.map((t) => t.pais))].sort((a, b) => a.localeCompare(b));
}

/** Los canales presentes en la tabla, ordenados. */
export function canalesDe(tarifas: readonly TarifaDeTransportista[]): readonly string[] {
  return [...new Set(tarifas.map((t) => t.canal))].sort((a, b) => a.localeCompare(b));
}

/**
 * Las filas agrupadas por canal y destino, que es como se miran.
 *
 * <p>Un canal tiene treinta y pico tramos y enseñarlos sueltos llena la pantalla de filas casi
 * iguales. Lo que interesa de un vistazo es «cuánto cobra este canal a este país», y el detalle de
 * los tramos solo cuando se abre uno.
 */
export interface GrupoDeTarifas {
  readonly canal: string;
  readonly pais: string;
  readonly nombreCanal?: string;
  readonly tramos: readonly TarifaDeTransportista[];
  /** Lo que costaría medio kilo por ese canal: el número con el que se compara entre canales. */
  readonly ejemplo500gRmb: number;
  readonly diasMin: number;
  readonly diasMax: number;
  readonly escalonGramos: number;
  readonly alguntramoViejo: boolean;
  readonly algunTramoDesviado: boolean;
  readonly medidoEn?: string;
}

/** Agrupa el listado por (canal, país), de más barato a más caro dentro de cada destino. */
export function agrupaTarifas(
  tarifas: readonly TarifaDeTransportista[],
): readonly GrupoDeTarifas[] {
  const porClave = new Map<string, TarifaDeTransportista[]>();
  for (const tarifa of tarifas) {
    const clave = `${tarifa.pais}|${tarifa.canal}`;
    const grupo = porClave.get(clave);
    if (grupo) {
      grupo.push(tarifa);
    } else {
      porClave.set(clave, [tarifa]);
    }
  }

  const grupos: GrupoDeTarifas[] = [];
  for (const tramos of porClave.values()) {
    const ordenados = [...tramos].sort((a, b) => a.hastaGramos - b.hastaGramos);
    const primero = ordenados[0];
    // El ejemplo se toma del tramo que de verdad cubre el medio kilo, no del primero: en un canal
    // con tramos de cien gramos el primero llega a diez y su precio no dice nada del envío normal.
    const deMedioKilo = ordenados.find((t) => t.hastaGramos >= 500) ?? ordenados[ordenados.length - 1];
    grupos.push({
      canal: primero.canal,
      pais: primero.pais,
      nombreCanal: primero.nombreCanal,
      tramos: ordenados,
      ejemplo500gRmb: deMedioKilo.ejemplo500gRmb,
      diasMin: primero.diasMin,
      diasMax: primero.diasMax,
      escalonGramos: primero.escalonGramos,
      alguntramoViejo: ordenados.some((t) => t.vieja),
      algunTramoDesviado: ordenados.some((t) => t.desvioRmb > 0),
      medidoEn: primero.medidoEn,
    });
  }
  return grupos.sort(
    (a, b) => a.pais.localeCompare(b.pais) || a.ejemplo500gRmb - b.ejemplo500gRmb,
  );
}
