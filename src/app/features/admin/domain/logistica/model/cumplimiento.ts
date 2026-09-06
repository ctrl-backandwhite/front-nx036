/**
 * Cumplimiento del Reglamento (UE) 2023/988 de seguridad general de los productos.
 *
 * <p>El art. 16.1 impide introducir un producto en el mercado si no hay un operador económico
 * establecido en la Unión, y el art. 19 obliga a mostrarlo —junto al fabricante y a las advertencias—
 * en la propia oferta en línea. Esta parte del panel es donde se declara y donde se ve lo que falta.
 */

/** La figura del art. 4.2 (importador, fabricante, representante…), ya traducida por el backend. */
export interface PapelDeOperador {
  readonly codigo: string;
  readonly etiqueta: string;
}

export interface OperadorEconomico {
  readonly nombre: string;
  readonly direccion: string;
  readonly codigoPostal: string;
  readonly ciudad: string;
  readonly provincia: string;
  /** ISO 3166-1 alfa-2. */
  readonly pais: string;
  readonly email: string;
  readonly telefono: string;
  readonly papel: string;
  /** Publicar en fichas y facturas. Solo se deja activar cuando el bloque está completo. */
  readonly publicado: boolean;
}

export interface EstadoDeCumplimiento {
  /** Hay operador económico publicable: habilitado y con los datos del art. 16.3 completos. */
  readonly operadorPublicado: boolean;
  readonly productosActivos: number;
  /** Referencias ACTIVAS sin la identidad completa del fabricante que exige el art. 19.a. */
  readonly sinFabricante: number;
}

export function operadorEnBlanco(): OperadorEconomico {
  return {
    nombre: '',
    direccion: '',
    codigoPostal: '',
    ciudad: '',
    provincia: '',
    pais: 'ES',
    email: '',
    telefono: '',
    papel: 'IMPORTER',
    publicado: false,
  };
}

/** Los campos del art. 16.3 y la clave con la que se nombra cada uno en la interfaz. */
const OBLIGATORIOS: readonly (readonly [keyof OperadorEconomico, string])[] = [
  ['nombre', 'compliance.field.name'],
  ['direccion', 'compliance.field.address'],
  ['codigoPostal', 'compliance.field.postal_code'],
  ['ciudad', 'compliance.field.city'],
  ['pais', 'compliance.field.country'],
  ['email', 'compliance.field.email'],
];

/**
 * Qué falta para poder publicar, en claves de traducción.
 *
 * <p>Son los MISMOS campos que el backend considera obligatorios. Se comprueban aquí también para poder
 * decir en el acto qué falta, no para decidir: quien publica o no es el servidor.
 */
export function camposQueFaltan(operador: OperadorEconomico): readonly string[] {
  return OBLIGATORIOS.filter(([campo]) => !String(operador[campo] ?? '').trim()).map(
    ([, clave]) => clave,
  );
}

export function operadorCompleto(operador: OperadorEconomico): boolean {
  return camposQueFaltan(operador).length === 0;
}
