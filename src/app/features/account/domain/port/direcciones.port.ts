import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DatosDeDireccion, Direccion, FormatoPostal } from '../model/direccion';

/** El libro de direcciones de la cuenta. */
export interface DireccionesPort {
  lista(): Promise<Result<readonly Direccion[], AppError>>;
  crea(datos: DatosDeDireccion): Promise<Result<Direccion, AppError>>;
  actualiza(id: string, datos: DatosDeDireccion): Promise<Result<Direccion, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const DIRECCIONES_PORT = new InjectionToken<DireccionesPort>('DireccionesPort');

/** Una subdivisión de primer nivel del país: su código alimenta el impuesto por estado. */
export interface Provincia {
  readonly codigo: string;
  readonly nombre: string;
}

/**
 * Las provincias de un país y el formato de su código postal.
 *
 * <p>Los dos datos los sirve el mismo sitio que cotiza el envío. Se declara un puerto PROPIO en vez de
 * pedir el del contexto de pago porque lo que se necesita son dos listas para rellenar un formulario, no
 * la maquinaria de cotización: así este formulario no se rompe cada vez que aquella cambia.
 *
 * <p>El formato postal se pregunta en vez de copiar aquí la tabla: la regla que decide es la del
 * servidor —él rechaza la dirección igualmente— y con dos copias una acabaría corregida y la otra no.
 */
export interface AyudaDeDireccionPort {
  provincias(pais: string): Promise<Result<readonly Provincia[], AppError>>;
  formatoPostal(pais: string): Promise<Result<FormatoPostal, AppError>>;
}

export const AYUDA_DE_DIRECCION_PORT = new InjectionToken<AyudaDeDireccionPort>(
  'AyudaDeDireccionPort',
);
