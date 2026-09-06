/**
 * Los filtros del catálogo, como dato del negocio y no como cadena de consulta.
 *
 * <p>Viven aquí, y no dentro de la pantalla, porque la dirección del navegador es un DETALLE: la misma
 * búsqueda llega desde el cartel de rebajas, desde la tarjeta de un producto y desde un enlace
 * compartido. Convertir de una a otra son dos funciones puras que se prueban sin abrir un navegador.
 */

export type OrdenDelCatalogo =
  | 'random'
  | 'best_match'
  | 'trending'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'sales'
  | 'rating'
  | 'inventory'
  | 'lists';

/** El orden por defecto. Barajado: un catálogo siempre igual parece un catálogo muerto. */
export const ORDEN_POR_DEFECTO: OrdenDelCatalogo = 'random';

const ORDENES: readonly OrdenDelCatalogo[] = [
  'random',
  'best_match',
  'trending',
  'price_asc',
  'price_desc',
  'newest',
  'sales',
  'rating',
  'inventory',
  'lists',
];

/**
 * Centinela del filtro de arancel: «las líneas de declaración de MI carrito».
 *
 * <p>Va así y no con la lista de grupos resuelta en el navegador porque el navegador no sabe a qué
 * grupo pertenece lo que lleva: solo tiene identificadores de producto. Y en la dirección se comparte
 * igual de bien, resolviéndose contra el carrito de quien la abra.
 */
export const GRUPO_DEL_CARRITO = 'carrito';

export interface CriterioDeBusqueda {
  readonly texto?: string;
  readonly categoria?: string;
  readonly proveedor?: string;
  readonly precioMinimo?: string;
  readonly precioMaximo?: string;
  readonly enviaDesde?: string;
  readonly envioGratis: boolean;
  readonly conVideo: boolean;
  readonly valoracionMinima?: string;
  readonly certificacion?: string;
  /** Solo administrador: el backend lo ignora para el resto. '' = todos. */
  readonly verificado: string;
  readonly orden: OrdenDelCatalogo;
  readonly promocion?: string;
  readonly nombreDePromocion?: string;
  /** Grupo de declaración, o el centinela `carrito`. */
  readonly grupoDeArancel?: string;
}

export const CRITERIO_VACIO: CriterioDeBusqueda = {
  envioGratis: false,
  conVideo: false,
  verificado: '',
  orden: ORDEN_POR_DEFECTO,
};

/** Un identificador de categoría tiene que ser un UUID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ¿La categoría que llega es utilizable?
 *
 * <p>Si algún enlace antiguo mete un `slug` donde va un identificador, la consulta reintentaba en bucle
 * y la pantalla se quedaba con el esqueleto puesto para siempre, sin vacío ni error. Se comprueba antes
 * de pedir nada.
 */
export function categoriaValida(categoria: string | undefined): boolean {
  return !categoria || UUID.test(categoria);
}

function esOrden(valor: string | null): valor is OrdenDelCatalogo {
  return !!valor && (ORDENES as readonly string[]).includes(valor);
}

/**
 * Qué parámetro de la dirección corresponde a cada filtro de TEXTO.
 *
 * <p>Es una tabla y no una cadena de asignaciones porque los filtros crecen: cada uno nuevo era una
 * línea aquí, otra allá y una tercera en el recuento, y el que se olvidaba dejaba un filtro que se
 * aplicaba pero no se podía compartir por enlace.
 */
const PARAMETROS_DE_TEXTO = {
  q: 'texto',
  categoryId: 'categoria',
  supplierId: 'proveedor',
  minPrice: 'precioMinimo',
  maxPrice: 'precioMaximo',
  shipFrom: 'enviaDesde',
  minRating: 'valoracionMinima',
  certification: 'certificacion',
  promotionId: 'promocion',
  promo: 'nombreDePromocion',
  grupo: 'grupoDeArancel',
} as const satisfies Record<string, keyof CriterioDeBusqueda>;

/** Reconstruye el criterio desde la dirección, para que un enlace compartido llegue con sus filtros. */
export function desdeParametros(parametros: URLSearchParams): CriterioDeBusqueda {
  const orden = parametros.get('sort');
  const criterio: Record<string, unknown> = {
    envioGratis: parametros.get('freeShipping') === '1',
    conVideo: parametros.get('hasVideo') === '1',
    verificado: parametros.get('verified') ?? '',
    orden: esOrden(orden) ? orden : ORDEN_POR_DEFECTO,
  };
  for (const [parametro, campo] of Object.entries(PARAMETROS_DE_TEXTO)) {
    criterio[campo] = parametros.get(parametro) ?? undefined;
  }
  return criterio as unknown as CriterioDeBusqueda;
}

/** Y al revés: la dirección que representa este criterio, para poder compartirla. */
export function aParametros(criterio: CriterioDeBusqueda): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [parametro, campo] of Object.entries(PARAMETROS_DE_TEXTO)) {
    const valor = criterio[campo];
    if (typeof valor === 'string' && valor) {
      salida[parametro] = valor;
    }
  }
  // El nombre de la promoción solo viaja acompañando a su identificador: suelto no filtra nada y
  // dejaría un rótulo puesto sin filtro detrás.
  if (!criterio.promocion) {
    delete salida['promo'];
  }
  if (criterio.envioGratis) salida['freeShipping'] = '1';
  if (criterio.conVideo) salida['hasVideo'] = '1';
  if (criterio.verificado) salida['verified'] = criterio.verificado;
  if (criterio.orden !== ORDEN_POR_DEFECTO) salida['sort'] = criterio.orden;
  return salida;
}

/**
 * Cuántos filtros hay puestos. Es el número del contador de la barra y decide si se ofrece «limpiar».
 *
 * <p>El orden cuenta como filtro solo cuando NO es el de por defecto: si contara siempre, «limpiar»
 * dejaría un distintivo puesto que al quitarlo se volvía a poner.
 */
export function cuantosFiltros(criterio: CriterioDeBusqueda): number {
  return [
    criterio.texto,
    criterio.categoria,
    criterio.proveedor,
    criterio.precioMinimo,
    criterio.precioMaximo,
    criterio.enviaDesde,
    criterio.envioGratis || undefined,
    criterio.conVideo || undefined,
    criterio.valoracionMinima,
    criterio.certificacion,
    criterio.verificado || undefined,
    criterio.promocion,
    criterio.grupoDeArancel,
    criterio.orden !== ORDEN_POR_DEFECTO ? criterio.orden : undefined,
  ].filter(Boolean).length;
}

/** Cuántas barajas ofrece el servidor. Coincide con `BARAJAS` en `CatalogStorefrontReadService`. */
export const BARAJAS = 32;

/**
 * Una baraja distinta a la que había: refrescar y ver exactamente lo mismo no parecería un refresco.
 */
export function otraBaraja(anterior: number | null, azar: () => number = Math.random): number {
  let siguiente = Math.floor(azar() * BARAJAS);
  let intentos = 0;
  // El tope de intentos evita quedarse aquí si alguien inyecta un azar constante en una prueba.
  while (siguiente === anterior && intentos < BARAJAS) {
    siguiente = Math.floor(azar() * BARAJAS);
    intentos += 1;
  }
  return siguiente;
}

/**
 * Con una búsqueda por texto NO se baraja: ahí el orden lo decide la relevancia, y barajar el
 * desempate mezclaría resultados que el buscador ya había ordenado por lo bien que casan.
 */
export function barajaEfectiva(
  criterio: CriterioDeBusqueda,
  baraja: number | null,
): number | undefined {
  return criterio.texto ? undefined : (baraja ?? undefined);
}
