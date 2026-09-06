import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  CambiosDeVariante,
  VarianteDeProducto,
} from '../../domain/catalogo/model/variante-de-producto';
import { VariantesPort } from '../../domain/catalogo/port/ficha-de-producto.port';
import { VarianteDto } from './ficha-de-producto.dto';

/** Se exporta porque la ficha también trae variantes dentro y las dos rutas tienen que traducirlas igual. */
export function aVariante(dto: VarianteDto): VarianteDeProducto {
  return {
    id: dto.id,
    sku: dto.sku,
    titulo: dto.title,
    precio: dto.price,
    existencias: Number(dto.stock ?? 0),
    urlImagen: dto.imageUrl,
    opciones: dto.options ?? {},
    activa: dto.active !== false,
  };
}

function aCuerpo(cambios: CambiosDeVariante): Record<string, unknown> {
  return {
    sku: cambios.sku,
    title: cambios.titulo,
    price: cambios.precio,
    stock: cambios.existencias,
    imageUrl: cambios.urlImagen,
    options: cambios.opciones,
    active: cambios.activa,
  };
}

/**
 * Las variantes de un producto contra nuestro backend.
 *
 * <p>Esta ruta devuelve los precios CRUDOS, sin margen y en la divisa canónica. Es a propósito: la
 * pestaña de precios edita el coste, y leerlo de la ficha —que ya viene con margen— hacía que el margen
 * se aplicara encima del margen.
 */
@Injectable()
export class VariantesHttpAdapter implements VariantesPort {
  private readonly api = inject(ApiService);

  async lista(productoId: string): Promise<Result<readonly VarianteDeProducto[], AppError>> {
    const respuesta = await this.api.get<VarianteDto[]>(
      `/admin/catalog/products/${encodeURIComponent(productoId)}/variants`,
    );
    return mapea(respuesta, (lista) => (lista ?? []).map(aVariante));
  }

  async crea(productoId: string, cambios: CambiosDeVariante): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/catalog/products/${encodeURIComponent(productoId)}/variants`,
      aCuerpo(cambios),
    );
    return mapea(respuesta, () => undefined);
  }

  async actualiza(id: string, cambios: CambiosDeVariante): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/variants/${encodeURIComponent(id)}`,
      aCuerpo(cambios),
    );
    return mapea(respuesta, () => undefined);
  }

  async actualizaPrecio(id: string, precio: number): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/variants/${encodeURIComponent(id)}/price`,
      { price: precio },
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/variants/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }
}
