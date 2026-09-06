import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ComisionesPendientes } from '../../domain/model/comisiones-pendientes';
import { COMISIONES_PENDIENTES_PORT } from '../../domain/port/comisiones-pendientes.port';

/**
 * Las comisiones de afiliado que todavía no cuentan como saldo.
 *
 * <p>Se consulta aparte del saldo a propósito: quien no es afiliado recibe un rechazo del servidor y eso
 * no puede impedir que se vea la cartera. Por eso la pantalla trata este dato como decorado.
 */
@Injectable()
export class ConsultaComisionesPendientes {
  private readonly comisiones = inject(COMISIONES_PENDIENTES_PORT);

  ejecuta(): Promise<Result<ComisionesPendientes, AppError>> {
    return this.comisiones.consulta();
  }
}
