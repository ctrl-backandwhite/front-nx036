import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Plan, Suscripcion } from '../../../domain/gestion/model/facturacion';
import { FACTURACION_PORT } from '../../../domain/gestion/port/facturacion.port';

@Injectable()
export class ConsultaPlanes {
  private readonly facturacion = inject(FACTURACION_PORT);

  ejecuta(): Promise<Result<readonly Plan[], AppError>> {
    return this.facturacion.planes();
  }
}

/**
 * Cambia un plan.
 *
 * <p>Toca el precio que se cobra a TODOS los suscriptores de ese plan, así que la pantalla enseña un
 * fallo del backend en vez de tragárselo: sin eso, un rechazo de validación dejaba el diálogo abierto
 * y quien administra se iba creyendo que el precio estaba cambiado.
 */
@Injectable()
export class ActualizaElPlan {
  private readonly facturacion = inject(FACTURACION_PORT);

  ejecuta(plan: Plan): Promise<Result<void, AppError>> {
    return this.facturacion.actualizaPlan(plan.codigo, plan);
  }
}

@Injectable()
export class ConsultaSuscripciones {
  private readonly facturacion = inject(FACTURACION_PORT);

  ejecuta(estado?: string): Promise<Result<readonly Suscripcion[], AppError>> {
    return this.facturacion.suscripciones(estado);
  }
}
