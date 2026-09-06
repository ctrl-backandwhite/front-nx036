import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AltaEnElBoletin, AltaEnElBoletinPort } from './alta-en-el-boletin.port';

/** El alta contra el backend. `alreadySubscribed` distingue «te acabas de dar de alta» de «ya estabas». */
@Injectable()
export class AltaEnElBoletinHttpAdapter implements AltaEnElBoletinPort {
  private readonly api = inject(ApiService);

  async suscribe(correo: string): Promise<Result<AltaEnElBoletin, AppError>> {
    const respuesta = await this.api.post<{ status: string; alreadySubscribed: boolean }>(
      '/newsletter/subscribe',
      { email: correo },
    );
    return mapea(respuesta, (r) => ({ yaEstaba: !!r?.alreadySubscribed }));
  }
}
