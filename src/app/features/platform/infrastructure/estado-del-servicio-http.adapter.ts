import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { EstadoDelServicioPort } from '../domain/port/estado-del-servicio.port';

/**
 * Comprueba que la plataforma responde.
 *
 * <p>Se pincha la cobertura de envío porque es PÚBLICA —no exige sesión, así que la página de estado
 * sirve igual a quien no ha entrado— y porque atraviesa el camino completo: pasarela, aplicación y base
 * de datos. Un endpoint de salud que solo dijera «el proceso está vivo» habría marcado todo en verde
 * con la base caída.
 *
 * <p>Se tira la respuesta a propósito: aquí solo interesa si hubo fallo.
 */
@Injectable()
export class EstadoDelServicioHttpAdapter implements EstadoDelServicioPort {
  private readonly api = inject(ApiService);

  async comprueba(): Promise<Result<void, AppError>> {
    return mapea(await this.api.get<unknown>('/shipping/countries'), () => undefined);
  }
}
