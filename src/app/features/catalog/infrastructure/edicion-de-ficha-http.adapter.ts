import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CampoEnYuanes, EdicionDeFichaPort } from '../domain/port/edicion-de-ficha.port';

/**
 * El editor en línea de la ficha, contra los endpoints de administración.
 *
 * <p>El backend valida el enlace de origen (esquema y dominio) y devuelve el motivo YA TRADUCIDO si no
 * vale, así que aquí no se duplica la comprobación: dos validaciones que se separan acaban diciendo
 * cosas distintas.
 */
@Injectable()
export class EdicionDeFichaHttpAdapter implements EdicionDeFichaPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  async marcaVerificado(idDelProducto: string, verificado: boolean): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.put<void>(
        `/admin/catalog/products/${idDelProducto}?lang=${this.preferencias.idioma()}`,
        { verified: verificado },
      ),
      () => undefined,
    );
  }

  async guardaUrlDeOrigen(idDelProducto: string, url: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.put<void>(
        `/admin/catalog/products/${idDelProducto}/source-url?lang=${this.preferencias.idioma()}`,
        { sourceUrl: url },
      ),
      () => undefined,
    );
  }

  /**
   * Guarda UN importe en yuanes por su nombre de campo.
   *
   * <p>Se manda solo el que se toca. Enviar los tres pisaría las bolsas de subsidio que no se estaban
   * editando, y esas dos bolsas son estancas por diseño: una cubre el envío y la otra el arancel.
   */
  async guardaImporteEnYuanes(
    idDelProducto: string,
    campo: CampoEnYuanes,
    valor: number,
  ): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.put<void>(`/admin/catalog/products/${idDelProducto}`, { [campo]: valor }),
      () => undefined,
    );
  }

  async borraImagen(idDeLaImagen: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.delete<void>(`/admin/catalog/products/images/${idDeLaImagen}`),
      () => undefined,
    );
  }

  /** Copia la foto de una variante a la galería REFERENCIANDO la misma dirección: no se resube nada. */
  async anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>(`/admin/catalog/products/${idDelProducto}/images`, {
        sourceUrl: direccion,
      }),
      () => undefined,
    );
  }

  async reordenaImagenes(
    idDelProducto: string,
    idsEnOrden: readonly string[],
  ): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.put<void>(`/admin/catalog/products/${idDelProducto}/images/order`, {
        imageIds: [...idsEnOrden],
      }),
      () => undefined,
    );
  }

  async borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.delete<void>(`/admin/catalog/variant-values/${idDelValor}`),
      () => undefined,
    );
  }

  async borraVideo(idDelProducto: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.delete<void>(`/admin/catalog/products/${idDelProducto}/video`),
      () => undefined,
    );
  }

  async borraProducto(idDelProducto: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.delete<void>(`/admin/catalog/products/${idDelProducto}`),
      () => undefined,
    );
  }
}
