import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Pedido } from '../../domain/model/pedido';
import { PEDIDOS_PORT } from '../../domain/port/pedidos.port';

/**
 * La ficha de un pedido.
 *
 * <p>El idioma lo pone el caso de uso, no la pantalla: el backend devuelve el título del producto
 * traducido a partir de él, y dejarlo en manos de cada pantalla acababa en fichas con los títulos en
 * chino —la copia que se guardó al comprar— cuando alguien olvidaba pasarlo.
 */
@Injectable({ providedIn: 'root' })
export class ConsultaPedido {
  private readonly pedidos = inject(PEDIDOS_PORT);
  private readonly traduccion = inject(TraduccionService);

  ejecuta(id: string): Promise<Result<Pedido, AppError>> {
    return this.pedidos.consulta(id, this.traduccion.idioma());
  }
}
