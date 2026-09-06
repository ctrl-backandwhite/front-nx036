/**
 * El producto tal y como lo entiende el NEGOCIO, no como lo escribe el backend.
 *
 * <p>El JSON del servidor habla de `displayFormatted`, `monthlySales` o `extraDutyCents`; aquí se habla
 * de precio, ventas y arancel. La traducción entre los dos vocabularios es trabajo del adaptador, y es
 * lo que permite que el día que el servidor renombre un campo se cambie un fichero y no treinta
 * plantillas. Cuando un modelo de dominio tiene exactamente la forma del JSON, la dependencia está
 * invertida y el negocio ha quedado atado al transporte.
 */

/**
 * Lo que se pinta en la etiqueta de precio.
 *
 * <p>NORMA DEL PROYECTO: los importes vienen YA calculados y formateados por el backend (margen, IVA,
 * envío, redondeo y divisa). El front no convierte ni recalcula: enseñar un número que el pedido no va
 * a cobrar ya costó una incidencia real. `formateado` es lo que se paga —con el descuento aplicado— y
 * `anteriorFormateado` es lo que se tacha, nunca al revés.
 */
export interface PrecioParaMostrar {
  readonly formateado?: string;
  readonly anteriorFormateado?: string;
  readonly descuentoPorcentaje?: number;
  readonly promocion?: string;
  /** El importe crudo. Solo se usa como último recurso cuando el backend no manda la cadena. */
  readonly importe?: number;
  readonly divisa?: string;
}

/**
 * El arancel que SUMA llevarse este producto, tomando el carrito actual como referencia.
 *
 * <p>El derecho de la Unión se cobra por línea de declaración y por bulto, no por producto: si comparte
 * grupo con lo que ya se lleva, viaja en la misma línea y no cuesta un derecho más (`0`). `null`
 * significa que no hay nada que prometer —carrito vacío, o país que no cobra derecho por artículo— y
 * entonces no se pinta ningún distintivo. El cálculo es del backend a propósito: comparar grupos en el
 * navegador daría un visto bueno falso en cuanto el carrito se partiera en dos bultos.
 */
export interface ArancelDelProducto {
  readonly centimosExtra: number | null;
  readonly formateado?: string;
  /** La tienda paga el derecho de este producto. Solo lo hay donde se cobra: hoy, la Unión. */
  readonly cubierto: boolean;
  readonly grupo?: string;
}

/** Un producto en una cuadrícula: lo justo para pintar una tarjeta. */
export interface ResumenDeProducto {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagenPrincipal?: string;
  readonly valoracion?: number;
  readonly ventasMensuales: number;
  /** Lo que el backend recalcula cada noche con los pedidos REALES de esta tienda. */
  readonly tendencia?: number;
  readonly estado: string;
  readonly precio: PrecioParaMostrar;
  readonly arancel: ArancelDelProducto;
  /** Revisión manual del administrador. Falso o ausente = pendiente o con error. */
  readonly verificado?: boolean;
  readonly etiquetas: readonly string[];
  readonly proveedor?: string;
  readonly enviaDesde?: string;
}

export interface PaginaDeProductos {
  readonly items: readonly ResumenDeProducto[];
  readonly pagina: number;
  readonly tamano: number;
  readonly total: number;
  readonly totalDePaginas: number;
}

export interface ImagenDeProducto {
  readonly id: string;
  readonly direccion: string;
  readonly posicion: number;
  readonly papel: string;
}

export interface VarianteDeProducto {
  readonly id: string;
  readonly sku?: string;
  readonly precio?: number;
  readonly precioFormateado?: string;
  readonly existencias: number;
  readonly imagen?: string;
  readonly opciones: Readonly<Record<string, string>>;
  readonly activa: boolean;
  /** Báscula por variante: gramos y milímetros, tal y como los da 1688. */
  readonly pesoGramos?: number;
  readonly largoMm?: number;
  readonly anchoMm?: number;
  readonly altoMm?: number;
  /**
   * Rebaja de ESTA variante. Tiene que ser suya y no la del producto: cada variante parte de un precio
   * distinto, y el «antes» del producto junto al «ahora» de la variante llegó a dar un tachado MENOR
   * que el precio rebajado.
   */
  readonly anteriorFormateado?: string;
  readonly descuentoPorcentaje?: number;
}

export interface ValorDeEje {
  readonly id: string;
  readonly valorZh: string;
  readonly valor?: string;
  readonly valorLocalizado?: string;
  readonly imagen?: string;
  readonly posicion: number;
}

/** Un eje de variación: «Color», «Talla», «Modelo»… con sus valores. */
export interface EjeDeVariante {
  readonly id: string;
  readonly nombreZh: string;
  readonly nombre?: string;
  readonly posicion: number;
  readonly valores: readonly ValorDeEje[];
}

export interface TramoDePrecio {
  readonly cantidadMinima: number;
  readonly cantidadMaxima?: number;
  readonly precioUnitario: number;
  readonly divisa: string;
  readonly precioUnitarioFormateado?: string;
}

export interface Especificacion {
  readonly clave: string;
  readonly valor: string;
  readonly posicion?: number;
}

/** Operador económico establecido en la Unión (art. 16.3 del Reglamento (UE) 2023/988). */
export interface OperadorEuropeo {
  readonly nombre: string;
  readonly direccion: string;
  readonly codigoPostal?: string;
  readonly ciudad: string;
  readonly pais: string;
  readonly email: string;
  /** La figura del art. 4.2 del Reglamento (UE) 2019/1020, ya traducida por el backend. */
  readonly papel: string;
}

/**
 * Lo que exige publicar el art. 19 del Reglamento (UE) 2023/988 en la propia OFERTA: quién fabrica,
 * quién responde en la Unión y qué advertencias de seguridad lleva.
 */
export interface CumplimientoDeProducto {
  readonly fabricante?: string;
  readonly direccionDelFabricante?: string;
  readonly emailDelFabricante?: string;
  readonly advertencias: readonly string[];
  readonly operadorEuropeo?: OperadorEuropeo;
}

/**
 * El desglose del precio. SOLO llega para el administrador: quien compra ve el total y nada más.
 *
 * <p>Los dos subsidios son bolsas estancas en yuanes: la de envío se descuenta del porte del pedido y
 * la de arancel del derecho de aduana, sin mezclarse. No entran en el total del producto —son
 * cobertura, no cargo—, y por eso viven aquí y no en el precio.
 */
export interface DesgloseDePrecio {
  readonly baseFormateado?: string;
  readonly ivaFormateado?: string;
  readonly envioFormateado?: string;
  readonly recargoFormateado?: string;
  readonly recargoCny?: number | null;
  readonly subsidioDeEnvioFormateado?: string;
  readonly subsidioDeEnvioCny?: number | null;
  readonly subsidioDeArancelFormateado?: string;
  readonly subsidioDeArancelCny?: number | null;
}

/** La ficha completa de un producto. */
export interface FichaDeProducto extends ResumenDeProducto {
  readonly origen: string;
  readonly idExterno: string;
  /** Enlace a la ficha en la plataforma de origen. Uso interno: NUNCA se enseña a quien compra. */
  readonly urlDeOrigen?: string;
  readonly urlDeVideo?: string;
  readonly sku?: string;
  readonly descripcion?: string;
  readonly marca?: string;
  readonly moq: number;
  readonly numeroDeResenas: number;
  readonly imagenes: readonly ImagenDeProducto[];
  readonly variantes: readonly VarianteDeProducto[];
  readonly ejesDeVariante: readonly EjeDeVariante[];
  readonly tramosDePrecio: readonly TramoDePrecio[];
  readonly especificaciones: readonly Especificacion[];
  readonly atributos: Readonly<Record<string, string>>;
  readonly cumplimiento?: CumplimientoDeProducto;
  readonly desglose?: DesgloseDePrecio;
}

/**
 * «Superventas» quiere decir que se vende AQUÍ, no en el proveedor.
 *
 * <p>El umbral estaba en `ventasMensuales >= 5000`, y ese campo son las ventas EN EL PROVEEDOR: la
 * etiqueta prometía al comprador un éxito de esta tienda enseñándole el de otra. Se mira la tendencia,
 * que el backend recalcula cada noche con los pedidos reales (70 % ventas de 30 días, 30 % valoración).
 * El corte en 0,5 es lo que separa: un producto sin ninguna venta no pasa de 0,3 por muy bien valorado
 * que esté, así que solo lo alcanza quien ha vendido de verdad.
 */
export const TENDENCIA_DE_SUPERVENTAS = 0.5;

export function esSuperventas(producto: ResumenDeProducto): boolean {
  return (
    producto.etiquetas.includes('bestseller') ||
    (producto.tendencia ?? 0) >= TENDENCIA_DE_SUPERVENTAS
  );
}

/** Las ventas abreviadas: por encima de cinco cifras el número exacto no aporta y ensancha la tarjeta. */
export function ventasAbreviadas(ventas: number): string {
  return ventas > 9999 ? `${(ventas / 1000).toFixed(1)}k` : String(ventas);
}

/**
 * ¿Se pinta el bloque de rebaja?
 *
 * <p>Hacen falta las DOS cosas: el precio anterior y un porcentaje mayor que cero. Con solo una el
 * bloque queda a medias —un tachado sin ahorro visible, o un «−0 %» sin nada tachado—.
 */
export function estaRebajado(precio: PrecioParaMostrar): boolean {
  return !!precio.anteriorFormateado && (precio.descuentoPorcentaje ?? 0) > 0;
}

/** Las existencias vivas del producto, sumando solo las variantes activas. */
export function hayExistencias(ficha: FichaDeProducto): boolean {
  if (ficha.variantes.length === 0) {
    return true;
  }
  return ficha.variantes.reduce((suma, v) => suma + (v.activa ? v.existencias : 0), 0) > 0;
}
