import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AtribucionDeReferidoPort } from '../domain/port/referido.port';

interface SeguimientoDto {
  visitorToken: string;
}

/** La atribución del referido contra nuestro backend. */
@Injectable()
export class AtribucionHttpAdapter implements AtribucionDeReferidoPort {
  private readonly api = inject(ApiService);

  async registra(codigo: string, tokenDeVisitante: string): Promise<Result<string, AppError>> {
    const respuesta = await this.api.post<SeguimientoDto>('/affiliate/track', {
      ref: codigo,
      visitorToken: tokenDeVisitante,
    });
    // El servidor puede devolver otro testigo del que se mandó: manda el suyo, y guardarlo es lo que
    // mantiene la atribución si la visita cambia de dispositivo o se le limpió el almacenamiento.
    return mapea(respuesta, (dto) => dto?.visitorToken || tokenDeVisitante);
  }

  async vincula(tokenDeVisitante: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<unknown>('/me/affiliate/bind', { visitorToken: tokenDeVisitante }),
      () => undefined,
    );
  }
}
