/**
 * El pedido tal como lo mira quien opera el panel.
 *
 * <p>Es un modelo de NEGOCIO, no la respuesta del backend: el adaptador traduce. Los importes viajan
 * YA FORMATEADOS por el servidor y aquí no se recalcula ninguno — el cobro se convierte línea a línea
 * con la tasa del momento, y volver a convertir el total entero en el navegador enseñaba 9,53 € donde
 * se habían cargado 9,54 €.
 */

export type EstadoPedido =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'FORWARDED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

/** Los estados en el orden en que se ofrecen para filtrar. */
export const ESTADOS_DE_PEDIDO: readonly EstadoPedido[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'FORWARDED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

/** Lo que se le puede hacer a un pedido. Cada una es una transición de estado del backend. */
export type AccionSobrePedido = 'forward' | 'ship' | 'deliver' | 'cancel' | 'refund';

/**
 * Qué transiciones admite cada estado.
 *
 * <p>Vive en el dominio y no en la pantalla porque la usan tres sitios —el listado, la ficha y las
 * acciones en lote— y tenerla escrita tres veces era garantía de que se separasen. Esto NO es la
 * seguridad: el backend vuelve a comprobarlo. Aquí solo se evita ofrecer un botón que va a fallar.
 */
const TRANSICIONES: Readonly<Record<EstadoPedido, readonly AccionSobrePedido[]>> = {
  PENDING: ['forward', 'cancel'],
  AWAITING_PAYMENT: ['cancel'],
  PAID: ['forward', 'cancel'],
  FORWARDED: ['ship', 'cancel'],
  SHIPPED: ['deliver'],
  DELIVERED: ['refund'],
  CANCELLED: [],
  REFUNDED: [],
};

/** Las acciones que este estado permite. Un estado desconocido no permite ninguna, nunca todas. */
export function accionesPermitidas(estado: string): readonly AccionSobrePedido[] {
  return TRANSICIONES[estado as EstadoPedido] ?? [];
}

export function permite(estado: string, accion: AccionSobrePedido): boolean {
  return accionesPermitidas(estado).includes(accion);
}

/**
 * Un importe listo para pintar.
 *
 * <p>Si el backend mandó el texto, ese manda. Si no —pedidos antiguos—, se escribe la cantidad en SU
 * moneda sin convertirla: enseñar el número en otra divisa exigiría una tasa que el navegador no
 * conoce, y la que adivinara no sería la del cobro.
 */
export function importeLegible(
  formateado: string | undefined,
  centimos: number | undefined,
  moneda: string | undefined,
): string | undefined {
  if (formateado) {
    return formateado;
  }
  if (centimos == null) {
    return undefined;
  }
  return `${(centimos / 100).toFixed(2)} ${moneda ?? ''}`.trim();
}

export interface DireccionDeEnvio {
  readonly nombreCompleto: string;
  readonly linea1: string;
  readonly linea2?: string;
  readonly ciudad: string;
  readonly provincia?: string;
  readonly codigoPostal?: string;
  /** ISO 3166-1 alfa-2. */
  readonly pais: string;
  readonly telefono?: string;
  readonly email?: string;
}

/** Una fila del listado. Trae lo justo para decidir qué hacer sin abrir la ficha. */
export interface Pedido {
  readonly id: string;
  readonly numero: string;
  readonly estado: string;
  readonly emailCliente?: string;
  readonly tienda?: string;
  readonly proveedor?: string;
  readonly articulos: number;
  readonly totalFormateado?: string;
  readonly totalCentimos?: number;
  readonly moneda?: string;
  readonly realizadoEl?: string;
}

/** Una línea de la ficha. `origenUrl` es la ficha del proveedor, que el operador abre al comprar. */
export interface LineaDePedido {
  readonly id: string;
  readonly titulo?: string;
  readonly sku?: string;
  readonly variante?: string;
  readonly imagenUrl?: string;
  readonly origenUrl?: string;
  readonly cantidad: number;
  readonly precioUnitarioFormateado?: string;
  readonly totalLineaFormateado?: string;
}

/** De dónde vino el pedido: nuestro escaparate o una tienda integrada (Shopify, WooCommerce). */
export type OrigenDePedido = 'PLATFORM' | 'INTEGRATION';

export interface FichaDePedido extends Pedido {
  readonly origen?: OrigenDePedido;
  readonly notas?: string;
  readonly numeroDeSeguimiento?: string;
  readonly direccionDeEnvio?: DireccionDeEnvio;
  readonly subtotalFormateado?: string;
  /** Ausente mientras no se haya cotizado: un «0,00 €» de envío se lee como envío gratis. */
  readonly envioFormateado?: string;
  readonly impuestosFormateado?: string;
  readonly lineas: readonly LineaDePedido[];
}

/** La factura solo existe una vez que el pedido dejó de ser una intención. */
export function tieneFactura(estado: string): boolean {
  return !['PENDING', 'AWAITING_PAYMENT', 'CANCELLED'].includes(estado);
}

/** El seguimiento solo tiene sentido desde que el pedido sale hacia el transportista. */
export function admiteSeguimiento(estado: string): boolean {
  return ['FORWARDED', 'SHIPPED', 'DELIVERED'].includes(estado);
}

export interface PaginaDePedidos {
  readonly pedidos: readonly Pedido[];
  readonly total: number;
  readonly paginas: number;
  readonly pagina: number;
}

export interface CriterioDePedidos {
  readonly estado?: string;
  readonly texto?: string;
  readonly pagina: number;
  readonly tamano: number;
}

/** Lo que devuelve una acción en lote: el backend itera y una fila que falla no aborta el resto. */
export interface ResultadoEnLote {
  readonly correctas: number;
  readonly fallidas: number;
  readonly errores: readonly string[];
}

export interface LineaNueva {
  readonly productoId: string;
  readonly varianteId?: string;
  readonly cantidad: number;
}

export interface PedidoNuevo {
  readonly emailCliente?: string;
  readonly idExterno?: string;
  readonly direccionDeEnvio: DireccionDeEnvio;
  readonly lineas: readonly LineaNueva[];
  readonly notas?: string;
}

export interface ResultadoDeImportacion {
  readonly importados: number;
  readonly fallidos: number;
  readonly errores: readonly string[];
}

/**
 * Una línea siempre vale al menos una unidad ENTERA.
 *
 * <p>Con 0 o con 1,5 el almacén no sabe qué preparar. Se aplica al salir del campo y otra vez antes de
 * enviar: forzarlo en cada pulsación hacía reaparecer un «1» al vaciar el campo, y el dígito siguiente
 * se pegaba detrás — corregir una línea a 5 unidades acababa pidiendo 15.
 */
export function cantidadValida(cantidad: number): number {
  return Math.max(1, Math.floor(Number.isFinite(cantidad) ? cantidad : 1));
}

/** Los campos sin los que el backend rechaza el alta. Se comprueban aquí para no gastar una petición. */
export function faltanDatosDeEnvio(direccion: DireccionDeEnvio): boolean {
  return (
    !direccion.nombreCompleto.trim() ||
    !direccion.linea1.trim() ||
    !direccion.ciudad.trim() ||
    !direccion.pais.trim()
  );
}

/** El filtro de fechas del listado. Todo opcional: lo que no se rellena no filtra. */
export interface FiltroDeFechas {
  readonly desde?: string;
  readonly hasta?: string;
  readonly anio?: string;
  readonly mes?: string;
  readonly dia?: string;
}

export function filtroDeFechasVacio(filtro: FiltroDeFechas): boolean {
  return !filtro.desde && !filtro.hasta && !filtro.anio && !filtro.mes && !filtro.dia;
}

/**
 * Recorta el listado por fecha, sobre lo que ya se ha traído.
 *
 * <p>Se hace aquí y no en el servidor porque el backend pagina por otros criterios: son afinados sobre
 * la página que se está mirando, para responder «de este lote, cuáles fueron en marzo». Un pedido SIN
 * fecha se descarta cuando hay filtro puesto: no se puede afirmar que caiga dentro.
 *
 * <p>El «hasta» incluye el día entero. Sin sumarle las veinticuatro horas, filtrar «hasta el 3» dejaba
 * fuera todo lo del día 3 salvo lo ocurrido a las cero horas en punto.
 */
export function filtraPorFecha(
  pedidos: readonly Pedido[],
  filtro: FiltroDeFechas,
): readonly Pedido[] {
  if (filtroDeFechasVacio(filtro)) {
    return pedidos;
  }
  const desdeMs = filtro.desde ? new Date(filtro.desde).getTime() : Number.NEGATIVE_INFINITY;
  const hastaMs = filtro.hasta
    ? new Date(filtro.hasta).getTime() + 86_400_000
    : Number.POSITIVE_INFINITY;

  return pedidos.filter((pedido) => {
    if (!pedido.realizadoEl) {
      return false;
    }
    const fecha = new Date(pedido.realizadoEl);
    const instante = fecha.getTime();
    if (Number.isNaN(instante) || instante < desdeMs || instante > hastaMs) {
      return false;
    }
    if (filtro.anio && String(fecha.getFullYear()) !== filtro.anio) {
      return false;
    }
    if (filtro.mes && String(fecha.getMonth() + 1) !== filtro.mes) {
      return false;
    }
    return !filtro.dia || String(fecha.getDate()) === filtro.dia;
  });
}

/** Los años presentes en el listado, del más reciente al más antiguo, para poder elegir uno. */
export function aniosDe(pedidos: readonly Pedido[]): readonly string[] {
  const anios = new Set<string>();
  for (const pedido of pedidos) {
    if (pedido.realizadoEl) {
      const fecha = new Date(pedido.realizadoEl);
      if (!Number.isNaN(fecha.getTime())) {
        anios.add(String(fecha.getFullYear()));
      }
    }
  }
  return [...anios].sort((a, b) => b.localeCompare(a));
}
