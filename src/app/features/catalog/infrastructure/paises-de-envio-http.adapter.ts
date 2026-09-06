import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PaisDeEnvio, PaisesDeEnvioPort } from '../domain/port/paises-de-envio.port';

/** Lo que devuelve `GET /api/shipping/countries`. */
interface PaisDto {
  readonly countryCode?: string;
  readonly countryName?: string;
}

@Injectable()
export class PaisesDeEnvioHttpAdapter implements PaisesDeEnvioPort {
  private readonly api = inject(ApiService);

  /**
   * La cobertura real, ya en el vocabulario del dominio.
   *
   * <p>Se descartan las filas sin código o sin nombre en vez de pintarlas con un hueco: la banda es un
   * argumento de venta y un país «sin nombre» con bandera blanca lee como una avería. Si el backend
   * responde otra cosa —un objeto, un nulo— sale una lista vacía y la sección entera no se pinta.
   */
  async lista(): Promise<Result<readonly PaisDeEnvio[], AppError>> {
    const respuesta = await this.api.get<PaisDto[]>('/shipping/countries');
    return mapea(respuesta, (filas) =>
      (Array.isArray(filas) ? filas : [])
        .filter((fila) => !!fila?.countryCode && !!fila?.countryName)
        .map((fila) => ({
          codigo: String(fila.countryCode).toUpperCase(),
          nombre: String(fila.countryName),
        })),
    );
  }
}
