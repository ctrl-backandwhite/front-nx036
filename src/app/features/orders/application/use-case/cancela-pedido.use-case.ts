import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CANCELACION_DE_PEDIDO_PORT } from '../../domain/port/pedidos.port';

/**
 * Cancelar un pedido y devolver el dinero.
 *
 * <p>Solo se puede mientras el pedido está pagado y aún no ha salido hacia el proveedor; después sería
 * una devolución, que es otro proceso. Quién puede y quién no lo decide el SERVIDOR con `cancelable`:
 * el estado no basta, porque el género puede estar ya comprado en 1688 sin que el pedido se haya movido.
 *
 * <p>El reembolso va siempre al método de pago original y lo hace el servidor: aquí no hay nada que
 * elegir, y confirmar la cancelación es cosa de la pantalla.
 */
@Injectable()
export class CancelaPedido {
  private readonly cancelacion = inject(CANCELACION_DE_PEDIDO_PORT);
  private readonly traduccion = inject(TraduccionService);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.cancelacion.cancela(id, this.traduccion.idioma());
  }
}
