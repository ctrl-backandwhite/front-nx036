import { InjectionToken } from '@angular/core';

/**
 * Achica una foto antes de subirla. El dominio no conoce el DOM: quien sabe decodificar y volver a
 * codificar una imagen es el navegador, y ese saber vive en un adaptador.
 *
 * <p>Nunca falla: si no puede reducir (servidor, formato que no decodifica, error), devuelve el fichero
 * original y el servidor decide.
 */
export interface ReductorDeFotosPort {
  reduce(fichero: File): Promise<File>;
}

export const REDUCTOR_DE_FOTOS_PORT = new InjectionToken<ReductorDeFotosPort>('ReductorDeFotosPort');
