/**
 * El cuadro de mando: las cifras de cabecera, los últimos pedidos y las series de treinta días.
 *
 * <p>Los importes llegan en DÓLARES canónicos, que es la divisa en la que el backend guarda todo. La
 * conversión a lo que mira quien administra se hace al pintar, nunca aquí: si el dominio guardara ya el
 * importe convertido, dos pantallas con divisas distintas contarían cosas distintas.
 */
export interface Metricas {
  readonly productosActivos: number;
  readonly productosTotales: number;
  readonly productosBorrador: number;
  readonly pedidos: number;
  readonly usuarios: number;
  readonly proveedores: number;
  readonly planesActivos: number;
  readonly suscripciones: number;
  readonly gmvUsd: number;
  readonly mrrUsd: number;
}

export interface PedidoReciente {
  readonly id: string;
  readonly numero: string;
  readonly estado: string;
  readonly totalCentimos: number;
  readonly divisa: string;
  readonly realizadoEl?: string;
}

/** Las dos series del panel, indexadas por día en formato `AAAA-MM-DD`. */
export interface SeriesDelPanel {
  readonly pedidosPorDia: Readonly<Record<string, number>>;
  readonly gmvCentimosPorDia: Readonly<Record<string, number>>;
}

/** Qué proporción del catálogo está publicada. Cero productos no es cero por ciento: es «no aplica». */
export function porcentajeActivo(activos: number, totales: number): number {
  return totales ? Math.round((activos / totales) * 100) : 0;
}

/** Los que hay dados de alta pero no publicados. Nunca negativo, aunque las dos cifras se crucen. */
export function productosInactivos(activos: number, totales: number): number {
  return Math.max(0, totales - activos);
}

/**
 * El eje de los últimos `cuantos` días, del más antiguo al más reciente.
 *
 * <p>Se construye en el cliente y no se pide al backend porque la serie llega como un diccionario con
 * huecos: los días sin ventas sencillamente no vienen, y una gráfica que solo pinta los días con datos
 * miente sobre el ritmo.
 */
export function ultimosDias(cuantos: number, hoy: Date = new Date()): readonly string[] {
  const dias: string[] = [];
  for (let atras = cuantos - 1; atras >= 0; atras--) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() - atras);
    dias.push(dia.toISOString().slice(0, 10));
  }
  return dias;
}

/** Los valores de la serie alineados con el eje, con cero donde no hubo nada. */
export function valoresDeLaSerie(
  dias: readonly string[],
  serie: Readonly<Record<string, number>> | undefined,
  divisor = 1,
): readonly number[] {
  return dias.map((dia) => (serie?.[dia] ?? 0) / divisor);
}
