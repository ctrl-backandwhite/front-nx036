import { Divisa } from './dinero';

/**
 * Ajustes del sistema: los idiomas de la tienda y el registro de divisas.
 */

export interface IdiomaDeTienda {
  readonly id: string;
  readonly codigo: string;
  readonly etiqueta: string;
  readonly bandera?: string;
  readonly posicion: number;
  readonly activo: boolean;
  readonly porDefecto: boolean;
}

/** Lo que se manda al dar de alta o modificar un idioma. */
export interface BorradorDeIdioma {
  readonly id?: string;
  readonly codigo: string;
  readonly etiqueta?: string;
  readonly bandera?: string;
  readonly posicion?: number;
  readonly activo?: boolean;
  readonly porDefecto?: boolean;
}

/** Los idiomas se enseñan en el orden que decide quien administra, no en el que llegan. */
export function ordenaIdiomas(idiomas: readonly IdiomaDeTienda[]): readonly IdiomaDeTienda[] {
  return [...idiomas].sort((a, b) => a.posicion - b.posicion);
}

/**
 * Los idiomas que se van a publicar SIN diccionario de interfaz.
 *
 * <p>El contenido de producto se traduce por su cuenta, así que un idioma sin diccionario NO deja la
 * tienda vacía: la ficha se ve traducida y el menú, el carrito y el pago en inglés. Ese mestizaje es
 * justo lo que hay que avisar antes de meterlo en el selector de la tienda.
 *
 * <p>La lista de los que SÍ tienen diccionario la pasa quien llama —vive en `shared/i18n`, y el dominio
 * no depende de dónde estén los textos—.
 */
export function sinDiccionarioDeInterfaz(
  codigos: readonly string[],
  conDiccionario: readonly string[],
): readonly string[] {
  const disponibles = new Set(conDiccionario);
  return codigos.filter((codigo) => !disponibles.has(codigo));
}

/**
 * Una divisa sin tipo de cambio no se puede publicar.
 *
 * <p>La conversión divide por la tasa de origen: con la tasa a cero el importe se queda SIN convertir y
 * el comprador ve el número en dólares con el símbolo de su moneda —un producto de 20 USD anunciado
 * como «20 000 COP»—. El cobro lo hace el backend, así que la tienda estaría anunciando un precio que
 * no es el que se cobra.
 */
export function sinTasa(divisa: Divisa): boolean {
  return !divisa.tasaVsUsd || divisa.tasaVsUsd <= 0;
}

/**
 * Las divisas de la selección que no se pueden activar.
 *
 * <p>Solo se bloquea ACTIVAR. Desactivar una divisa rota tiene que seguir siendo posible: es la salida
 * de emergencia si alguna llegó a publicarse.
 */
export function bloqueanLaActivacion(
  codigos: readonly string[],
  divisas: readonly Divisa[],
): readonly string[] {
  return divisas.filter((d) => codigos.includes(d.codigo) && sinTasa(d)).map((d) => d.codigo);
}

/** El filtrado del registro de divisas es local: son unas decenas de filas, no hace falta ir al servidor. */
export function divisaCoincide(divisa: Divisa, texto: string, estado: string | null): boolean {
  if (estado === 'active' && !divisa.activa) {
    return false;
  }
  if (estado === 'inactive' && divisa.activa) {
    return false;
  }
  const buscado = texto.trim().toLowerCase();
  if (!buscado) {
    return true;
  }
  return (
    divisa.codigo.toLowerCase().includes(buscado) ||
    (divisa.nombre ?? '').toLowerCase().includes(buscado)
  );
}

/** La sincronización más reciente de todo el registro, para poder decir cuándo se actualizaron las tasas. */
export function ultimaSincronizacion(divisas: readonly Divisa[]): string | undefined {
  return divisas
    .map((d) => d.sincronizadaEl)
    .filter((f): f is string => !!f)
    .sort()
    .pop();
}
