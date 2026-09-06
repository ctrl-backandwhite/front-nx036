import { TasaDeCambio, aDolares } from './tasa-de-cambio';

/**
 * ODM/OEM: encargar un producto a medida, o el empaquetado con la marca de quien vende.
 */
export type ClaseDeProyecto = 'ODM_FREE' | 'ODM_PAID' | 'OEM' | 'CUSTOM_PACKAGING';

export const CLASES_DE_PROYECTO: readonly ClaseDeProyecto[] = [
  'ODM_FREE',
  'ODM_PAID',
  'OEM',
  'CUSTOM_PACKAGING',
];

export type EstadoDeProyecto =
  | 'INTAKE'
  | 'REVIEW'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'CANCELLED';

export const ESTADOS_DE_PROYECTO: readonly EstadoDeProyecto[] = [
  'INTAKE',
  'REVIEW',
  'APPROVED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
];

/** Las divisas en las que se puede escribir un presupuesto. El backend siempre lo guarda en dólares. */
export const DIVISAS_DE_PRESUPUESTO: readonly string[] = [
  'USD',
  'EUR',
  'GBP',
  'BRL',
  'MXN',
  'JPY',
  'CNY',
  'CAD',
];

export interface ProyectoOdm {
  readonly id: string;
  readonly clase: string;
  readonly titulo: string;
  readonly resumen?: string;
  /** En CÉNTIMOS de dólar. Es la unidad del backend y no se toca al viajar. */
  readonly presupuestoEnCentimosUsd?: number;
  readonly diasDeCompromiso?: number;
  readonly estado: string;
  readonly creadoEl: string;
}

export interface NuevoProyecto {
  readonly clase: string;
  readonly titulo: string;
  readonly resumen?: string;
  readonly presupuestoEnCentimosUsd?: number;
}

/**
 * El presupuesto tecleado, convertido a los céntimos de dólar que guarda el backend.
 *
 * <p>Aquí es donde se paga la trampa de la dirección del cambio: `porDolar` son unidades de la divisa
 * por un dólar, así que pasar de euros a dólares es DIVIDIR. Multiplicando, 100 € se guardaban como
 * 92 $ y el proveedor trabajaba con un 15 % menos del presupuesto autorizado. La cuenta está aquí,
 * probada y en un solo sitio, para que ninguna pantalla la repita a su manera.
 *
 * <p>Devuelve `undefined` —y no cero— cuando no se escribió nada: un presupuesto vacío no es un
 * presupuesto de cero dólares, y el backend distingue los dos casos.
 */
export function presupuestoEnCentimosUsd(
  tecleado: string,
  divisa: string,
  tasas: readonly TasaDeCambio[],
): number | undefined {
  const valor = parseFloat(tecleado);
  if (!Number.isFinite(valor) || valor <= 0) {
    return undefined;
  }
  return Math.round(aDolares(valor, divisa, tasas) * 100);
}

/**
 * ¿Hay presupuesto que enseñar?
 *
 * <p>La comprobación es `> 0` y no el valor a secas porque un presupuesto de cero es falso: la
 * plantilla lo trataba como «no hay» en unos sitios y pintaba el propio «0» en otros.
 */
export function tienePresupuesto(proyecto: ProyectoOdm): boolean {
  return (proyecto.presupuestoEnCentimosUsd ?? 0) > 0;
}

/** El presupuesto en dólares enteros, para pintarlo o para rellenar el formulario de edición. */
export function presupuestoEnDolares(proyecto: ProyectoOdm): number {
  return (proyecto.presupuestoEnCentimosUsd ?? 0) / 100;
}
