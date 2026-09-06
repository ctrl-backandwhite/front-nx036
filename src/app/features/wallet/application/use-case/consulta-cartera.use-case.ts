import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Cartera, PaginaDeMovimientos } from '../../domain/model/cartera';
import { CARTERA_PORT } from '../../domain/port/cartera.port';

/** Cuántos movimientos se traen de una vez. Es lo que cabe sin paginar en la tarjeta. */
const MOVIMIENTOS_POR_PAGINA = 20;

/** El saldo y los últimos movimientos, que es lo que pinta la pantalla de la cartera. */
@Injectable()
export class ConsultaCartera {
  private readonly cartera = inject(CARTERA_PORT);

  ejecuta(): Promise<Result<Cartera, AppError>> {
    return this.cartera.consulta();
  }

  ultimosMovimientos(): Promise<Result<PaginaDeMovimientos, AppError>> {
    return this.cartera.movimientos(0, MOVIMIENTOS_POR_PAGINA);
  }
}
