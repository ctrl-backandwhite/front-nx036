/**
 * Las tiendas que alguien ha conectado a la plataforma (Shopify, WooCommerce…).
 *
 * <p>Modelo de NEGOCIO, no del backend: el servidor habla de `shopHandle` y `lastSyncAt`, y aquí se
 * llaman como se llaman en el negocio. La traducción entre los dos vocabularios es trabajo del
 * adaptador, y mientras exista, renombrar un campo del servidor no toca ninguna pantalla.
 */

/**
 * Estado de la conexión. Se guarda como cadena y no como enumeración cerrada a propósito: el backend
 * puede añadir estados —ya lo hizo con `SYNCING`— y una lista cerrada aquí obligaría a desplegar el
 * front para poder pintarlos. El texto sale del diccionario con la clave `shops.status.<estado>`.
 */
export type EstadoDeTienda = string;

export interface TiendaConectada {
  readonly id: string;
  readonly plataforma: string;
  readonly identificador: string;
  readonly estado: EstadoDeTienda;
  readonly ultimaSincronizacion?: string;
  /** Qué contó la última sincronización. Es lo que explica por qué hay cero productos publicados. */
  readonly mensajeDeSincronizacion?: string;
  readonly errorDeSincronizacion?: string;
  readonly creadaEl: string;
  readonly publicaciones: number;
}

/**
 * Una plataforma que se puede conectar.
 *
 * <p>`disponible` distingue las integraciones REALES de las anunciadas como «Próximamente». Sin esa
 * marca, la pantalla ofrecía conectar tiendas que el backend rechaza después, y el usuario lo
 * interpretaba como que había escrito mal su token.
 */
export interface PlataformaDeTienda {
  readonly codigo: string;
  readonly etiqueta: string;
  readonly disponible: boolean;
}

/** Lo que hay que dar para conectar una tienda. El token es opcional: no todas las plataformas lo piden. */
export interface SolicitudDeConexion {
  readonly plataforma: string;
  readonly identificador: string;
  readonly token?: string;
}

/**
 * ¿Se puede conectar esta plataforma?
 *
 * <p>Es regla de negocio y no adorno de la pantalla: una plataforma «Próximamente» no se conecta, y
 * comprobarlo antes ahorra una llamada que el backend iba a rechazar. Vive aquí para que la respondan
 * igual el botón, el desplegable y el caso de uso.
 */
export function estaDisponible(
  plataformas: readonly PlataformaDeTienda[],
  codigo: string,
): boolean {
  return plataformas.find((p) => p.codigo === codigo)?.disponible ?? false;
}

/**
 * La inicial con la que se pinta el mosaico de plataformas cuando no hay logotipo.
 *
 * <p>Con `?` de respaldo: una etiqueta vacía dejaba una tarjeta muda, y en el mosaico de seis columnas
 * eso se lee como un fallo de carga.
 */
export function inicialDePlataforma(plataforma: PlataformaDeTienda): string {
  return (plataforma.etiqueta[0] ?? '?').toUpperCase();
}
