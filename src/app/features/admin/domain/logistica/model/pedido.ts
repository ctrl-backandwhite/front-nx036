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
  /** El transportista (identificador) y el canal por los que se cobró el envío; vacíos si no tiene. */
  readonly transportista?: string;
  readonly canalDeEnvio?: string;
  /**
   * Si el pedido saldría hoy por su canal. Ausente cuando el servidor no lo dice: entonces NO se
   * avisa de nada, porque «no lo sé» no es «está mal».
   */
  readonly canalAdmisible?: boolean;
  readonly motivoDelCanal?: MotivoDelCanal;
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

/** La clase de mercancía que admite el canal por el que se cobró el envío. */
export type TipoDeLineaDeCanal = 'ropa' | 'general' | 'con-bateria' | 'desconocida';

/**
 * Por qué un pedido no saldría hoy por su canal. `desconocido` recoge un motivo que el servidor añada
 * después: se avisa igual, con un texto genérico, en vez de callar un pedido que no puede salir.
 */
export type MotivoDelCanal =
  | 'sin-transportista'
  | 'sin-canal'
  | 'transportista-distinto'
  | 'producto-no-localizable'
  | 'mercancia-no-admitida'
  | 'valor-fuera-del-tope'
  | 'desconocido';

/** Un bulto del pedido, con el canal por el que REALMENTE se emitió su guía. */
export interface BultoDePedido {
  readonly numero: number;
  readonly transportista?: string;
  /** El canal con el que se emitió, que puede no ser el cobrado. */
  readonly canalEmitido?: string;
  readonly numeroDeSeguimiento?: string;
  readonly numeroDeGuia?: string;
  readonly estado?: string;
  readonly pesoEnGramos?: number;
  /** Falso: el bulto salió por un canal distinto del cobrado. Ausente: no se sabe. */
  readonly coincideConElCanal?: boolean;
}

export interface FichaDePedido extends Pedido {
  /** Lo que dice el servidor sobre la factura; ausente en un backend antiguo (entonces, {@link tieneFactura}). */
  readonly conFactura?: boolean;
  readonly origen?: OrigenDePedido;
  readonly notas?: string;
  readonly numeroDeSeguimiento?: string;
  readonly direccionDeEnvio?: DireccionDeEnvio;
  readonly subtotalFormateado?: string;
  /** Ausente mientras no se haya cotizado: un «0,00 €» de envío se lee como envío gratis. */
  readonly envioFormateado?: string;
  readonly impuestosFormateado?: string;
  /**
   * El transportista por el que se COBRÓ el envío (nombre visible), con su canal y su clase de línea.
   *
   * <p>No es el de la guía ya emitida: es el que eligió quien compró y el que decide a quién se le pide
   * la guía al despachar. Con dos transportistas, sin esto no hay forma de saber por qué un pedido
   * salió por donde salió — ni de ver que salió por el que no tocaba.
   */
  readonly nombreDelTransportista?: string;
  readonly nombreDelCanal?: string;
  readonly tipoDeLinea?: TipoDeLineaDeCanal;
  /** El detalle que escribe el servidor cuando el canal no es admisible. */
  readonly detalleDelCanal?: string;
  readonly bultos: readonly BultoDePedido[];
  readonly lineas: readonly LineaDePedido[];
}

/**
 * Qué falla en el canal de un pedido, o nada si está en regla.
 *
 * <p>Un pedido SIN canal es un problema aunque el servidor no lo declare inadmisible: ya no hay
 * transportista por defecto al que caer, así que sin canal no sale. En cambio, si el servidor no dice
 * nada de admisibilidad y el canal está, no se inventa un fallo.
 */
export function problemaDeCanal(pedido: Pedido): MotivoDelCanal | undefined {
  if (pedido.canalAdmisible === false) {
    return pedido.motivoDelCanal ?? 'desconocido';
  }
  if (!pedido.canalDeEnvio) {
    return pedido.motivoDelCanal ?? (pedido.transportista ? 'sin-canal' : 'sin-transportista');
  }
  return undefined;
}

/** ¿Algún bulto salió por un canal distinto del cobrado? */
export function hayBultoPorOtroCanal(ficha: FichaDePedido): boolean {
  return ficha.bultos.some((bulto) => bulto.coincideConElCanal === false);
}

/** RESERVA por estado, para cuando el servidor no manda `conFactura`: la factura existe una vez que el pedido dejó de ser una intención. */
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
  // Fechas: el servidor las filtra con la misma semántica que el panel (ver el backend). `desde`/`hasta`
  // acotan un intervalo; `anio`/`mes`/`dia` filtran cada componente de forma independiente.
  readonly desde?: string;
  readonly hasta?: string;
  readonly anio?: string;
  readonly mes?: string;
  readonly dia?: string;
  /** `true`: solo pedidos cuyo canal falta o no admitiría su mercancía; `false`: solo los que están en regla. */
  readonly canalProblema?: boolean;
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

/**
 * La fecha de un pedido, escrita para leerla.
 *
 * <p>El backend manda el instante en ISO —`2026-10-15T20:27:27.114854Z`— y la tabla lo pintaba tal
 * cual: una columna con microsegundos y zona horaria que nadie lee y que descuadra el ancho de la
 * fila. Se escribe en el idioma del panel, no en el del navegador, que es la misma regla que siguen
 * los importes.
 *
 * <p>Cadena vacía si no hay fecha o si no se entiende, para que quien pinta decida qué poner en su
 * lugar; devolver el texto original «por si acaso» es justo lo que dejaba el ISO en pantalla.
 */
export function fechaDelPedido(iso: string | undefined, idioma: string): string {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return fecha.toLocaleString(idioma, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Los años elegibles en el filtro, del más reciente al más antiguo.
 *
 * <p>A diferencia del listado, NO salen de la página cargada: con filtrado en servidor, derivar los años
 * de las 25 filas visibles dejaba fuera cualquier año que no estuviera en esa página, y entonces no se
 * podía filtrar por él. Se generan desde el primer año con actividad ({@code desdeAnio}) hasta el año en
 * curso, que llega como parámetro para que la función siga siendo pura y verificable.
 */
export function aniosDisponibles(hastaAnio: number, desdeAnio = 2024): readonly string[] {
  const fin = Math.max(hastaAnio, desdeAnio);
  const anios: string[] = [];
  for (let anio = fin; anio >= desdeAnio; anio--) {
    anios.push(String(anio));
  }
  return anios;
}
