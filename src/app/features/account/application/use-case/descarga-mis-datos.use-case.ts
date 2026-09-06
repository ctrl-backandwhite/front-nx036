import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PORTABILIDAD_PORT } from '../../domain/port/perfil.port';
import { DESCARGA_PORT } from '../../domain/port/descarga.port';

/**
 * Entrega la copia de los datos personales (artículo 20 del RGPD, portabilidad).
 *
 * <p>Son dos pasos que siempre van juntos —pedirlo y entregarlo— y por eso hay un caso de uso: si la
 * pantalla tuviera que acordarse de los dos, el día que se añada otra descarga faltaría uno.
 */
@Injectable()
export class DescargaMisDatos {
  private readonly portabilidad = inject(PORTABILIDAD_PORT);
  private readonly descarga = inject(DESCARGA_PORT);

  async ejecuta(): Promise<Result<void, AppError>> {
    const fichero = await this.portabilidad.exporta();
    if (!fichero.ok) {
      return fichero;
    }
    this.descarga.entrega(fichero.valor);
    return exito(undefined);
  }
}
