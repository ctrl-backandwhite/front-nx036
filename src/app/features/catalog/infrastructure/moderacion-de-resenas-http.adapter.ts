import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ModeracionDeResenasPort } from '../domain/port/moderacion-de-resenas.port';

@Injectable()
export class ModeracionDeResenasHttpAdapter implements ModeracionDeResenasPort {
  private readonly api = inject(ApiService);

  async ocultaResena(idDeResena: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.patch<unknown>(`/admin/catalog/reviews/${idDeResena}`, {
      approved: false,
    });
    return mapea(respuesta, () => undefined);
  }

  async quitaFoto(idDeResena: string, idDeFoto: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/reviews/${idDeResena}/images/${idDeFoto}`,
    );
    return mapea(respuesta, () => undefined);
  }
}
