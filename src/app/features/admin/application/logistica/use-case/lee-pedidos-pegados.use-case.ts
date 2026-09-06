import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { PedidoNuevo } from '../../../domain/logistica/model/pedido';
import {
  FalloDeLectura,
  LECTOR_DE_PEDIDOS_PEGADOS_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';

/**
 * Interpreta el volcado que alguien pega en el importador.
 *
 * <p>Va por el puerto y no leyendo el JSON aquí porque lo que se pega tiene la forma del BACKEND: si la
 * capa de aplicación conociera esos nombres de campo, el día que el endpoint renombre uno habría que
 * tocar el caso de uso además del adaptador.
 */
@Injectable()
export class LeePedidosPegados {
  private readonly lector = inject(LECTOR_DE_PEDIDOS_PEGADOS_PORT);

  ejecuta(texto: string): Result<readonly PedidoNuevo[], FalloDeLectura> {
    return this.lector.interpreta(texto);
  }
}
