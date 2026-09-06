import { Injectable, inject } from '@angular/core';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { PAGO_PORT } from '../../domain/port/pago.port';
import { CompraStore } from '../state/compra.store';

/**
 * Da por hecho el depósito en cripto sin esperar a la cadena.
 *
 * <p>Solo tiene sentido donde el proveedor está simulado: en producción el cobro lo marca su aviso
 * automático en cuanto la transferencia se confirma en la red. Se conserva porque es lo que permite
 * terminar una compra de prueba de punta a punta en los entornos previos.
 */
@Injectable()
export class ConfirmaElDeposito {
  private readonly pagos = inject(PAGO_PORT);
  private readonly carrito = inject(CARRITO_COMPARTIDO_PORT);
  private readonly estado = inject(CompraStore);

  /** Devuelve el pedido cobrado, o nada si no se pudo (el motivo queda en el estado). */
  async ejecuta(): Promise<string | null> {
    const cobro = this.estado.depositoEnCripto();
    if (!cobro) {
      return null;
    }
    const resultado = await this.pagos.confirmaSimulado(cobro.idDePedido, cobro.id);
    if (!resultado.ok) {
      this.estado.fijaError(resultado.error.mensaje);
      return null;
    }
    this.carrito.vacia();
    return cobro.idDePedido;
  }
}
