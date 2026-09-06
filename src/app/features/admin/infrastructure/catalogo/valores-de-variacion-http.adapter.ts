import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import { ValoresDeVariacionPort } from '../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Los valores de variación (los colores y los estampados) contra nuestro backend.
 *
 * <p>Va en su propia clase y no junto a las variantes porque los dos puertos tienen un `elimina` y no
 * podrían convivir. Además son cosas distintas: borrar un color se lleva por delante todas las
 * combinaciones que lo usan, y borrar una variante solo esa fila.
 */
@Injectable()
export class ValoresDeVariacionHttpAdapter implements ValoresDeVariacionPort {
  private readonly api = inject(ApiService);

  async renombra(id: string, valor: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/variant-values/${encodeURIComponent(id)}/label`,
      { value: valor },
    );
    return mapea(respuesta, () => undefined);
  }

  async fijaImagen(id: string, url: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/variant-values/${encodeURIComponent(id)}/image`,
      { imageUrl: url },
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/variant-values/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }
}
