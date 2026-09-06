import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResumenDePedido } from '../../domain/model/pedido';
import { PEDIDOS_PORT } from '../../domain/port/pedidos.port';

/** Los pedidos de quien mira, tal cual llegan. Filtrar y ordenar es cosa de la pantalla. */
@Injectable({ providedIn: 'root' })
export class ListaPedidos {
  private readonly pedidos = inject(PEDIDOS_PORT);

  ejecuta(): Promise<Result<readonly ResumenDePedido[], AppError>> {
    return this.pedidos.lista();
  }
}
