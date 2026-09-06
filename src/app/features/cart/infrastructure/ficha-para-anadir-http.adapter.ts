import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { FichaParaAnadir, FichaParaAnadirPort } from '../domain/port/ficha-para-anadir.port';

interface VarianteDto {
  id: string;
  sku?: string;
  price?: number;
  stock?: number;
  active?: boolean;
  options?: Record<string, string>;
}

interface FichaDto {
  moq?: number;
  displayPrice?: number;
  displayCurrency?: string;
  variants?: VarianteDto[];
}

/**
 * La ficha, leída por la cesta y recortada a lo que la cesta usa.
 *
 * <p>Va contra el mismo sitio que el catálogo, pero se queda con cuatro campos: el resto de la respuesta
 * —galería, reseñas, cumplimiento, especificaciones— ni se mira. Es lo que permite que la cesta no se
 * entere de que el catálogo cambia de forma.
 */
@Injectable()
export class FichaParaAnadirHttpAdapter implements FichaParaAnadirPort {
  private readonly api = inject(ApiService);

  async consulta(slug: string, idioma: string): Promise<Result<FichaParaAnadir, AppError>> {
    const respuesta = await this.api.get<FichaDto>(`/catalog/products/${slug}`, { lang: idioma });
    return mapea(respuesta, (dto) => ({
      // Un pedido mínimo de cero no significa nada, y con él el aviso de ahorro nunca saldría.
      pedidoMinimo: Math.max(1, dto?.moq ?? 1),
      precioMostrado: dto?.displayPrice,
      divisaMostrada: dto?.displayCurrency,
      variantes: (dto?.variants ?? []).map((variante) => ({
        id: variante.id,
        sku: variante.sku,
        precio: variante.price,
        existencias: variante.stock ?? 0,
        activa: variante.active !== false,
        opciones: variante.options ?? {},
      })),
    }));
  }
}
