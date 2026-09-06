import { ResumenDePedido } from './pedido';

/**
 * Lo que se puede filtrar de un listado de pedidos. Todo opcional y todo combinable.
 *
 * <p>Vive en el DOMINIO y no en la pantalla: decidir qué pedidos casan con lo que alguien ha pedido es
 * una regla, no un detalle visual, y así se prueba sin montar ningún componente.
 */
export interface CriterioDePedidos {
  /** Se busca por número de pedido, que es lo único que la gente recuerda o copia de su correo. */
  readonly texto: string;
  readonly estado: string | null;
  readonly ano: string | null;
  readonly mes: string | null;
  readonly dia: string | null;
  /** Fechas en formato `AAAA-MM-DD`, tal como las escribe un campo de tipo fecha. */
  readonly desde: string;
  readonly hasta: string;
}

export const CRITERIO_VACIO: CriterioDePedidos = {
  texto: '',
  estado: null,
  ano: null,
  mes: null,
  dia: null,
  desde: '',
  hasta: '',
};

/** Cuántos filtros hay puestos. Es lo que se enseña en la insignia del botón del móvil. */
export function filtrosPuestos(criterio: CriterioDePedidos): number {
  return [
    criterio.texto,
    criterio.estado,
    criterio.ano,
    criterio.mes,
    criterio.dia,
    criterio.desde,
    criterio.hasta,
  ].filter(Boolean).length;
}

/** ¿Se ha pedido acotar por fecha de alguna de las cinco formas posibles? */
function hayFiltroDeFecha(criterio: CriterioDePedidos): boolean {
  return !!(criterio.ano || criterio.mes || criterio.dia || criterio.desde || criterio.hasta);
}

/** Año, mes y día se comprueban por separado: se puede pedir «los días 3» de cualquier mes. */
function casaElCalendario(criterio: CriterioDePedidos, fecha: Date): boolean {
  if (criterio.ano && String(fecha.getFullYear()) !== criterio.ano) {
    return false;
  }
  if (criterio.mes && String(fecha.getMonth() + 1) !== criterio.mes) {
    return false;
  }
  return !(criterio.dia && String(fecha.getDate()) !== criterio.dia);
}

/**
 * El intervalo, con los extremos COMPLETOS: «hasta el 3» incluye todo el día 3, no hasta su medianoche.
 * Cortar a medianoche dejaba fuera los pedidos del propio día que se pedía, que es el más habitual.
 */
function casaElIntervalo(criterio: CriterioDePedidos, fecha: Date): boolean {
  if (criterio.desde && fecha < new Date(`${criterio.desde}T00:00:00`)) {
    return false;
  }
  return !(criterio.hasta && fecha > new Date(`${criterio.hasta}T23:59:59`));
}

function casaLaFecha(criterio: CriterioDePedidos, realizadoEl?: string): boolean {
  if (!hayFiltroDeFecha(criterio)) {
    return true;
  }
  // Un pedido sin fecha no puede afirmarse que caiga dentro del intervalo, así que queda fuera.
  if (!realizadoEl) {
    return false;
  }
  const fecha = new Date(realizadoEl);
  return casaElCalendario(criterio, fecha) && casaElIntervalo(criterio, fecha);
}

/** Los pedidos que casan con el criterio, conservando el orden en que llegaron. */
export function filtraPedidos(
  pedidos: readonly ResumenDePedido[],
  criterio: CriterioDePedidos,
): readonly ResumenDePedido[] {
  const busqueda = criterio.texto.trim().toLowerCase();
  return pedidos.filter((pedido) => {
    if (busqueda && !pedido.numero.toLowerCase().includes(busqueda)) {
      return false;
    }
    if (criterio.estado && pedido.estado !== criterio.estado) {
      return false;
    }
    return casaLaFecha(criterio, pedido.realizadoEl);
  });
}

/** Los años en los que hay pedidos, del más reciente al más antiguo. */
export function anosConPedidos(pedidos: readonly ResumenDePedido[]): readonly string[] {
  const anos = new Set<string>();
  for (const pedido of pedidos) {
    if (pedido.realizadoEl) {
      anos.add(String(new Date(pedido.realizadoEl).getFullYear()));
    }
  }
  return [...anos].sort((a, b) => b.localeCompare(a));
}
