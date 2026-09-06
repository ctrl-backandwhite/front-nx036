/**
 * El impuesto indirecto que se aplica al destino, por país y —donde varía— por región.
 *
 * <p>El panel lo CONFIGURA; quien lo aplica al cobro es el backend. Aquí no se liquida nada: apagar el
 * impuesto de un país cambia lo que cobra el servidor, no lo que pinta esta pantalla.
 *
 * <p>El backend guarda puntos básicos (una centésima de punto porcentual) porque un porcentaje con
 * decimales en coma flotante acaba en tasas de 20,999999. La pantalla trabaja en porcentaje, que es
 * como lo escribe quien lo configura, y la conversión vive aquí para que sea la misma en los dos
 * sentidos.
 */

export interface ImpuestoDePais {
  /** ISO 3166-1 alfa-2. */
  readonly pais: string;
  readonly etiqueta?: string;
  readonly puntosBasicos: number;
  readonly porcentaje: number;
  readonly activo: boolean;
}

export interface RegionFiscal {
  readonly pais: string;
  readonly codigo: string;
  readonly nombre: string;
  /** Nulo = usa la tasa nacional. Solo se pone donde el impuesto varía por región (US, CA, BR). */
  readonly puntosBasicos: number | null;
  readonly porcentaje: number | null;
  readonly activo: boolean;
  readonly posicion: number;
}

/** Porcentaje escrito por una persona → puntos básicos, que es lo que entiende el backend. */
export function aPuntosBasicos(porcentaje: number): number {
  return Math.round((porcentaje || 0) * 100);
}

/**
 * Lo mismo para la tasa de una región, donde el vacío SIGNIFICA algo: «usa la nacional». Un 0 sería
 * «exenta», que es una configuración distinta y perfectamente válida.
 */
export function tasaDeRegion(porcentaje: string): number | null {
  return porcentaje.trim() === '' ? null : Math.round(Number(porcentaje) * 100);
}

export interface DatosDeImpuesto {
  readonly pais: string;
  readonly etiqueta: string;
  readonly porcentaje: number;
  readonly activo: boolean;
}

export interface DatosDeRegion {
  readonly codigo: string;
  readonly nombre: string;
  /** En texto, para poder distinguir «vacío» de «cero». */
  readonly porcentaje: string;
  readonly activo: boolean;
}

export function impuestoEnBlanco(): DatosDeImpuesto {
  return { pais: '', etiqueta: '', porcentaje: 0, activo: true };
}

export function regionEnBlanco(): DatosDeRegion {
  return { codigo: '', nombre: '', porcentaje: '', activo: true };
}

/** Sin país no hay clave. El resto puede quedar a cero: un país exento es una configuración real. */
export function impuestoGuardable(datos: DatosDeImpuesto): boolean {
  return datos.pais.trim().length > 0;
}

/** Una región necesita código y nombre: el código es la clave y el nombre es lo que se lee. */
export function regionGuardable(datos: DatosDeRegion): boolean {
  return datos.codigo.trim().length > 0 && datos.nombre.trim().length > 0;
}

export function datosDeImpuesto(fila: ImpuestoDePais): DatosDeImpuesto {
  return {
    pais: fila.pais,
    etiqueta: fila.etiqueta ?? '',
    porcentaje: fila.porcentaje,
    activo: fila.activo,
  };
}

export function datosDeRegion(fila: RegionFiscal): DatosDeRegion {
  return {
    codigo: fila.codigo,
    nombre: fila.nombre,
    porcentaje: fila.porcentaje != null ? String(fila.porcentaje) : '',
    activo: fila.activo,
  };
}
