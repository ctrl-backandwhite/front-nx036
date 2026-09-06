/**
 * Lo que gana quien opera los pedidos.
 *
 * <p>REGLA DEL NEGOCIO: la comisión se devenga al ENTREGAR, no al despachar ni al cobrar. Un pedido
 * enviado todavía puede volver, y la comisión de algo que vuelve no se ha ganado. Por eso el histórico
 * cuenta «órdenes entregadas» y no «órdenes procesadas».
 *
 * <p>Va en YUAN porque es la divisa del desembolso al proveedor, que es sobre lo que se calcula. El
 * backend manda céntimos enteros; convertir a otra moneda aquí sería inventarse una tasa.
 */

export interface ResumenDeGanancias {
  readonly operador: string;
  readonly email?: string;
  readonly nombre?: string;
  readonly operaciones: number;
  readonly comisionCentimosCny: number;
  readonly desde: string;
  readonly hasta: string;
}

export interface OperacionDeOperador {
  readonly operador: string;
  readonly email?: string;
  readonly nombre?: string;
  readonly pedidoId: string;
  readonly numeroDePedido: string;
  readonly comisionCentimosCny: number;
  readonly articulos: number;
  readonly procesadoEl: string;
}

export interface PaginaDeOperaciones {
  readonly operaciones: readonly OperacionDeOperador[];
  readonly total: number;
  readonly pagina: number;
  readonly tamano: number;
}

export interface FilaDeReporte {
  readonly operador: string;
  readonly email?: string;
  readonly nombre?: string;
  readonly operaciones: number;
  readonly comisionCentimosCny: number;
}

export interface RangoDeFechas {
  readonly desde: string;
  readonly hasta: string;
}

/** Céntimos de yuan → «¥ 12,34». Es formateo de la divisa, no una conversión. */
export function formateaCny(centimos: number): string {
  const yuanes = (centimos / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `¥ ${yuanes}`;
}

/** Con quién se está tratando: el nombre si lo hay, si no el correo, y en último caso el identificador. */
export function nombreDeOperador(fila: {
  readonly nombre?: string;
  readonly email?: string;
  readonly operador: string;
}): string {
  return fila.nombre || fila.email || fila.operador;
}

/** Cuántas páginas hay. Siempre al menos una: una tabla vacía sigue siendo la página 1 de 1. */
export function paginasDe(total: number, tamano: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, tamano)));
}

/** El rango por defecto: el último mes hasta hoy, que es lo que se mira al abrir. */
export function ultimoMes(hoy: Date): RangoDeFechas {
  const dia = 86_400_000;
  return {
    desde: new Date(hoy.getTime() - 30 * dia).toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

/** Los totales del reporte. Se suman aquí y no en la plantilla porque es una regla, no un adorno. */
export function totalesDelReporte(filas: readonly FilaDeReporte[]): {
  readonly operaciones: number;
  readonly comisionCentimosCny: number;
} {
  return filas.reduce(
    (acumulado, fila) => ({
      operaciones: acumulado.operaciones + fila.operaciones,
      comisionCentimosCny: acumulado.comisionCentimosCny + fila.comisionCentimosCny,
    }),
    { operaciones: 0, comisionCentimosCny: 0 },
  );
}
