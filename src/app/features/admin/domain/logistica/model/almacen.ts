/**
 * Un almacén de la red. El código es el que se pega en la dirección de envío del proveedor, así que
 * cambiarlo tiene consecuencias fuera de la aplicación.
 */
export interface Almacen {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly pais?: string;
  readonly ciudad?: string;
  readonly activo: boolean;
}

/** Lo que se manda al crear o editar: el identificador no se escribe, lo pone el backend. */
export type DatosDeAlmacen = Omit<Almacen, 'id'>;

export function almacenEnBlanco(): DatosDeAlmacen {
  return { codigo: '', nombre: '', pais: '', ciudad: '', activo: true };
}

/** Un almacén sin código ni nombre no se puede identificar en el albarán: el backend lo rechaza. */
export function almacenGuardable(datos: DatosDeAlmacen): boolean {
  return datos.codigo.trim().length > 0 && datos.nombre.trim().length > 0;
}

export function datosDe(almacen: Almacen): DatosDeAlmacen {
  return {
    codigo: almacen.codigo,
    nombre: almacen.nombre,
    pais: almacen.pais ?? '',
    ciudad: almacen.ciudad ?? '',
    activo: almacen.activo,
  };
}

/**
 * El parte de una acción en lote hecha fila a fila.
 *
 * <p>No hay endpoint masivo de almacenes: se repite la escritura por identificador y se junta el
 * resultado. Se cuenta lo que salió y lo que no, porque un lote a medias sin decirlo es peor que un
 * fallo entero — nadie sabría cuáles repetir.
 */
export interface ParteDeLote {
  readonly correctas: number;
  readonly errores: readonly string[];
}
