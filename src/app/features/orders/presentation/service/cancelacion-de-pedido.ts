import { Injectable, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { MetodoDePago, reembolsaPorPasarelaExterna } from '../../domain/model/pedido';
import { CancelaPedido } from '../../application/use-case/cancela-pedido.use-case';

/**
 * La conversación de cancelar un pedido: confirmar y avisar del resultado.
 *
 * <p>Vive en PRESENTACIÓN y no en un caso de uso porque lo que hace es hablar con quien mira —dos
 * diálogos—, y el sistema de diseño solo es visible desde aquí. La regla de negocio (¿el reembolso sale
 * por una pasarela externa?) está en el dominio; lo de aquí es únicamente cómo se avisa.
 *
 * <p>El reembolso va SIEMPRE al método de pago original (decisión del titular, 19-nov-2026) y lo hace el
 * servidor: no se pregunta adónde va el dinero. Antes había un segundo diálogo con «Confirmar/Cancelar»
 * en el que «Confirmar» mandaba el dinero a la billetera, y un pedido pagado con tarjeta no volvió a la
 * tarjeta. Lo único que cambia con el método es el aviso final.
 *
 * <p>Es un servicio y no código repetido en dos pantallas: el listado y la ficha ofrecen la misma
 * cancelación, y tenerla dos veces garantizaba que un día solo se arreglara una.
 */
/*
 * NO lleva `providedIn: 'root'`: se registra en `orders.providers.ts`, con la ruta. Un servicio de la
 * raíz solo ve los proveedores de la raíz, y este inyecta `CancelaPedido`, que vive en el inyector de la
 * ruta de pedidos: marcado como de raíz, abrir /orders moría con «NG0201: No provider found».
 */
@Injectable()
export class CancelacionDePedido {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly cancela = inject(CancelaPedido);

  private readonly t = this.traduccion.t;

  /**
   * Lleva la conversación entera.
   *
   * @returns cierto solo si el pedido se canceló de verdad, para que quien lo pidió vuelva a leer sus
   *          datos. Un «false» tanto significa «se arrepintió» como «falló»; en el segundo caso el aviso
   *          ya se ha enseñado.
   */
  async pide(id: string, metodoDePago?: MetodoDePago): Promise<boolean> {
    if (!(await this.dialogo.confirma(this.t('order.detail.cancel_confirm')))) {
      return false;
    }

    const resultado = await this.cancela.ejecuta(id);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('order.detail.cancel_error'),
        undefined,
        'error',
      );
      return false;
    }

    await this.dialogo.alerta(
      this.t(
        reembolsaPorPasarelaExterna(metodoDePago)
          ? 'order.detail.cancel_ok_original'
          : 'order.detail.cancel_ok',
      ),
      undefined,
      'success',
    );
    return true;
  }
}
