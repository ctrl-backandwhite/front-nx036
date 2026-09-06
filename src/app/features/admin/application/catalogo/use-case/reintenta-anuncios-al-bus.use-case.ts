import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { ANUNCIOS_AL_BUS_PORT } from '../../../domain/catalogo/port/productos-admin.port';

/** Vuelve a encolar los anuncios al bus que se dieron por perdidos. Devuelve cuántos se reencolaron. */
@Injectable()
export class ReintentaAnunciosAlBus {
  private readonly bus = inject(ANUNCIOS_AL_BUS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.bus.reintenta();
  }
}
