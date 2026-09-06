import { Injectable, inject } from '@angular/core';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PAGO_PORT } from '../../domain/port/pago.port';

/** Cómo acabó el retorno de la pasarela. */
export type ResultadoDelRetorno =
  | { readonly tipo: 'confirmado' }
  | { readonly tipo: 'error'; readonly mensaje: string };

/**
 * Cierra el cobro cuando quien paga vuelve de la pasarela.
 *
 * <p>La confirmación se hace DEL LADO DEL SERVIDOR —él consulta al proveedor y captura el cobro—, y no se
 * depende del aviso automático del proveedor: en los entornos de prueba ese aviso no llega, y sin esto el
 * pedido se quedaba pagado por fuera y pendiente por dentro.
 *
 * <p>AHORA sí se vacía la cesta, y no antes: al salir hacia la pasarela se conservó a propósito, para que
 * volver atrás sin pagar no costara la compra.
 */
@Injectable()
export class ConfirmaElPago {
  private readonly pagos = inject(PAGO_PORT);
  private readonly carrito = inject(CARRITO_COMPARTIDO_PORT);
  private readonly traduccion = inject(TraduccionService);

  async ejecuta(
    idDePedido: string,
    idDeCobro: string,
    cancelado: boolean,
  ): Promise<ResultadoDelRetorno> {
    if (cancelado) {
      return { tipo: 'error', mensaje: this.traduccion.t('checkout.return.cancelled') };
    }
    if (!idDePedido || !idDeCobro) {
      // Sin los dos identificadores no hay nada que confirmar. Pasa cuando se llega a esta dirección a
      // mano o cuando el proveedor recorta los parámetros al volver.
      return { tipo: 'error', mensaje: this.traduccion.t('checkout.return.missing') };
    }
    const resultado = await this.pagos.confirma(idDePedido, idDeCobro);
    if (!resultado.ok) {
      return {
        tipo: 'error',
        mensaje: resultado.error.mensaje || this.traduccion.t('checkout.return.err'),
      };
    }
    this.carrito.vacia();
    return { tipo: 'confirmado' };
  }
}
