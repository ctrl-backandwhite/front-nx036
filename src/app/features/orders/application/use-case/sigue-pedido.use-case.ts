import { Injectable, inject } from '@angular/core';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Seguimiento, pasosDelEnvio } from '../../domain/model/seguimiento';
import { SEGUIMIENTO_DE_PEDIDO_PORT } from '../../domain/port/pedidos.port';

/**
 * El rastro del envío, ya limpio de avisos repetidos.
 *
 * <p>La limpieza se aplica AQUÍ y no en la pantalla: así el seguimiento llega igual de depurado a la
 * ficha del cliente, a la del panel o a cualquier sitio que lo pinte mañana, sin que nadie tenga que
 * acordarse de llamar a la misma función.
 */
@Injectable({ providedIn: 'root' })
export class SiguePedido {
  private readonly seguimiento = inject(SEGUIMIENTO_DE_PEDIDO_PORT);

  async ejecuta(id: string): Promise<Result<Seguimiento, AppError>> {
    const resultado = await this.seguimiento.consulta(id);
    return mapea(resultado, (s) => ({
      ...s,
      hitos: pasosDelEnvio(s.hitos),
      bultos: s.bultos.map((b) => ({ ...b, hitos: pasosDelEnvio(b.hitos) })),
    }));
  }
}
