import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AltaDeDobleFactor, SesionActiva } from '../model/seguridad';

/** El segundo factor de la cuenta: activarlo, verificarlo y quitarlo. */
export interface DobleFactorPort {
  estaActivo(): Promise<Result<boolean, AppError>>;
  inicia(): Promise<Result<AltaDeDobleFactor, AppError>>;
  /** Devuelve los códigos de respaldo, que solo se enseñan UNA vez. */
  verifica(codigo: string): Promise<Result<readonly string[], AppError>>;
  /** Quitarlo exige la contraseña: si no, bastaría un descuido para dejar la cuenta a un solo factor. */
  desactiva(contrasena: string): Promise<Result<void, AppError>>;
}

export const DOBLE_FACTOR_PORT = new InjectionToken<DobleFactorPort>('DobleFactorPort');

/** Los dispositivos con la sesión abierta, y la posibilidad de echarlos. */
export interface SesionesActivasPort {
  lista(): Promise<Result<readonly SesionActiva[], AppError>>;
  revoca(id: string): Promise<Result<void, AppError>>;
}

export const SESIONES_ACTIVAS_PORT = new InjectionToken<SesionesActivasPort>('SesionesActivasPort');

/**
 * Dibujar un código QR.
 *
 * <p>Es un puerto y no una llamada directa a la biblioteca porque el dato que se dibuja es la SEMILLA
 * del segundo factor: dejar esa decisión escrita en la pantalla es lo que llevó a que un día se
 * resolviera pidiéndoselo a un servicio externo, regalando el secreto. Detrás del puerto, el sitio donde
 * se dibuja es una decisión de infraestructura que se revisa en un fichero.
 */
export interface CodigoQrPort {
  /** Devuelve una imagen embebida (`data:`) lista para pintar, o nulo si no se pudo dibujar. */
  dibuja(texto: string): Promise<string | null>;
}

export const CODIGO_QR_PORT = new InjectionToken<CodigoQrPort>('CodigoQrPort');
