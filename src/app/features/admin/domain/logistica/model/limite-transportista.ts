/**
 * Los límites físicos que el transportista impone a cada canal en cada país de destino.
 *
 * <p>Son los que deciden si un pedido sale en un bulto o en varios. Si el peso máximo configurado es
 * mayor que el que el canal admite de verdad, se emite una guía que el transportista rechaza en el
 * almacén y el pedido se queda parado. Por eso se editan a mano y no se dan por fijos en el código.
 *
 * <p>El panel los MUESTRA y los EDITA; el reparto en bultos lo calcula el backend.
 */

/**
 * Comodín de país. No es un país: es la fila que se aplica a cualquier destino del canal que no tenga
 * la suya propia, así que en pantalla se nombra y nunca se enseña el asterisco a pelo.
 */
export const PAIS_COMODIN = '*';

export interface LimiteDeTransportista {
  /** Canal del transportista (p. ej. `FZZXR`, la línea de ropa). Identificador interno del carrier. */
  readonly canal: string;
  /** Destino ISO-2, o el comodín para «el resto de países de ese canal». */
  readonly pais: string;
  /** Peso máximo por bulto, en gramos. 0 = sin límite conocido. */
  readonly pesoMaximoGramos: number;
  /** Divisor del peso volumétrico. 0 = el canal NO factura por volumen. */
  readonly divisorVolumetrico: number;
  /** Mínimo facturable en gramos: por debajo se cobra igual. 0 = sin mínimo. */
  readonly minimoFacturableGramos: number;
  readonly largoMaximoMm: number;
  readonly anchoMaximoMm: number;
  readonly altoMaximoMm: number;
  /** El transportista no admite varios bultos bajo una misma guía. */
  readonly bultoUnico: boolean;
  readonly notas?: string;
  readonly activo: boolean;
}

/**
 * Fila en blanco. El destino arranca en el comodín porque un canal nuevo se configura primero para
 * todos sus países y solo después se le añaden las excepciones.
 */
export function limiteEnBlanco(): LimiteDeTransportista {
  return {
    canal: '',
    pais: PAIS_COMODIN,
    pesoMaximoGramos: 0,
    divisorVolumetrico: 0,
    minimoFacturableGramos: 0,
    largoMaximoMm: 0,
    anchoMaximoMm: 0,
    altoMaximoMm: 0,
    bultoUnico: false,
    notas: '',
    activo: true,
  };
}

/**
 * El backend guarda GRAMOS porque es la unidad con la que factura el transportista, pero «30000 g» no
 * se lee de un vistazo y esta pantalla se revisa comparando canales. Pasarlo a kilos es formateo de
 * unidades: no cambia el dato que se guarda ni el que se manda.
 */
export function formateaGramos(gramos: number): string {
  if (gramos < 1000) {
    return `${gramos} g`;
  }
  const kilos = gramos / 1000;
  return `${Number.isInteger(kilos) ? kilos : Number(kilos.toFixed(2))} kg`;
}

/** Las medidas en una línea, o nada si el canal no declara ninguna. */
export function medidasLegibles(limite: LimiteDeTransportista): string | undefined {
  const hayMedidas = limite.largoMaximoMm > 0 || limite.anchoMaximoMm > 0 || limite.altoMaximoMm > 0;
  return hayMedidas
    ? `${limite.largoMaximoMm} × ${limite.anchoMaximoMm} × ${limite.altoMaximoMm} mm`
    : undefined;
}

/** Los canales presentes, sin repetir y en orden, para poder filtrar por uno. */
export function canalesDe(limites: readonly LimiteDeTransportista[]): readonly string[] {
  return [...new Set(limites.map((l) => l.canal))].sort((a, b) => a.localeCompare(b));
}

/**
 * El par canal+país ES la clave del registro. Guardar una fila que ya existe la sustituye; por eso al
 * editar esos dos campos quedan bloqueados, o en vez de cambiar la fila se crearía otra distinta.
 */
export function claveDe(limite: LimiteDeTransportista): string {
  return `${limite.canal}|${limite.pais}`;
}

/** Sin canal y sin destino no hay clave, así que no se puede guardar. */
export function limiteGuardable(limite: LimiteDeTransportista): boolean {
  return limite.canal.trim().length > 0 && limite.pais.trim().length > 0;
}
