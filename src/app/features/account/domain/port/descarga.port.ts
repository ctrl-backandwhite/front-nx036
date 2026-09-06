import { InjectionToken } from '@angular/core';

/**
 * Un fichero que se le entrega a quien está mirando: la copia de sus datos, una factura en PDF.
 *
 * <p>Va por un puerto porque no se puede resolver con un enlace normal: la petición necesita el testigo
 * de la sesión en su cabecera, y un `<a href>` no lo lleva —abriría la dirección sin identificarse y el
 * servidor respondería que no autoriza.
 */
export interface FicheroDescargable {
  readonly nombre: string;
  readonly contenido: Blob;
}

export interface DescargaPort {
  entrega(fichero: FicheroDescargable): void;
}

export const DESCARGA_PORT = new InjectionToken<DescargaPort>('DescargaPort');
