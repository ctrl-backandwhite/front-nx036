import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
  validaUrlDeMercado,
} from '../../domain/model/aprovisionamiento';
import { SOLICITUDES_DE_APROVISIONAMIENTO_PORT } from '../../domain/port/aprovisionamiento.port';

/**
 * Abrir una solicitud de aprovisionamiento.
 *
 * <p>Valida el enlace ANTES de gastar una llamada, y distingue los dos motivos de rechazo —«no es una
 * dirección» y «no es un mercado del que sepamos extraer»— porque el remedio no es el mismo: uno se
 * arregla escribiendo bien, el otro buscando el producto en otro sitio. Con un único mensaje, la gente
 * corregía la parte que ya estaba bien.
 */
@Injectable()
export class CreaSolicitudDeAprovisionamiento {
  private readonly solicitudes = inject(SOLICITUDES_DE_APROVISIONAMIENTO_PORT);

  async ejecuta(
    solicitud: NuevaSolicitud,
  ): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    const problema = validaUrlDeMercado(solicitud.url);
    if (problema) {
      return fallo(
        creaError('peticion-invalida', '', {
          codigo: problema === 'invalida' ? 'URL_INVALIDA' : 'MERCADO_NO_SOPORTADO',
        }),
      );
    }
    return this.solicitudes.crea({ ...solicitud, url: solicitud.url.trim() });
  }
}
