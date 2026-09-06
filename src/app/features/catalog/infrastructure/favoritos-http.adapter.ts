import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { FavoritosPort } from '../domain/port/favoritos.port';
import { HistorialPort } from '../domain/port/historial.port';
import { PaginaDeProductos } from '../domain/model/producto';
import { PaginaDto, ResumenDto, aPagina } from './producto.dto';

/**
 * La lista de deseos contra el backend.
 *
 * <p>Va separada del historial aunque las dos llamadas se parezcan: son dos capacidades distintas y
 * cada puerto tiene que poder sustituirse solo.
 */
@Injectable()
export class FavoritosHttpAdapter implements FavoritosPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  async identificadores(): Promise<Result<readonly string[], AppError>> {
    return this.api.get<string[]>('/me/favorites/ids');
  }

  async anade(idDelProducto: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<void>(`/me/favorites/${idDelProducto}`), () => undefined);
  }

  async quita(idDelProducto: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/favorites/${idDelProducto}`), () => undefined);
  }

  async lista(pagina: number, tamano: number): Promise<Result<PaginaDeProductos, AppError>> {
    return mapea(
      await this.api.get<PaginaDto<ResumenDto>>('/me/favorites', {
        page: pagina,
        size: tamano,
        lang: this.preferencias.idioma(),
      }),
      aPagina,
    );
  }
}

/**
 * Las fichas ya visitadas.
 *
 * <p>Anotar es ACCESORIO a la ficha: si falla, no se enseña ningún error. No tiene sentido interrumpir
 * a quien está mirando un producto para decirle que no se ha podido guardar su historial.
 */
@Injectable()
export class HistorialHttpAdapter implements HistorialPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  async anota(idDelProducto: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<void>(`/me/product-views/${idDelProducto}`), () => undefined);
  }

  async lista(pagina: number, tamano: number): Promise<Result<PaginaDeProductos, AppError>> {
    return mapea(
      await this.api.get<PaginaDto<ResumenDto>>('/me/product-views', {
        page: pagina,
        size: tamano,
        lang: this.preferencias.idioma(),
      }),
      aPagina,
    );
  }
}
