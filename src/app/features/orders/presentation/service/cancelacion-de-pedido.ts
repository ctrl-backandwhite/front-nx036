import { Injectable, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { MetodoDePago, permiteElegirDestinoDelReembolso } from '../../domain/model/pedido';
import { CancelaPedido } from '../../application/use-case/cancela-pedido.use-case';

/**
 * La conversación de cancelar un pedido: confirmar, elegir adónde va el dinero y avisar del resultado.
 *
 * <p>Vive en PRESENTACIÓN y no en un caso de uso porque lo que hace es hablar con quien mira —tres
 * diálogos—, y el sistema de diseño solo es visible desde aquí. La regla de negocio («¿hay que preguntar
 * adónde va el reembolso?») está en el dominio; lo de aquí es únicamente cómo se pregunta.
 *
 * <p>Es un servicio y no código repetido en dos pantallas: el listado y la ficha ofrecen la misma
 * cancelación, y tenerla dos veces garantizaba que un día solo se arreglara una.
 *
 * <p>LIMITACIÓN CONOCIDA del sistema de diseño: `DialogoStore.confirma` no admite etiquetas propias para
 * los botones, aunque el componente `Dialogo` sí sabe pintarlas. Por eso la elección del reembolso sale
 * con «Confirmar» y «Cancelar» en vez de «a mi billetera» y «a mi tarjeta». La pregunta está redactada
 * como un sí/no, así que se entiende, pero está anotado para cuando el atajo del almacén acepte
 * etiquetas.
 */
@Injectable({ providedIn: 'root' })
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

    // Con la cartera no hay nada que elegir: el dinero vuelve por donde vino, y al instante.
    let aLaCartera = true;
    if (permiteElegirDestinoDelReembolso(metodoDePago)) {
      const metodo =
        metodoDePago === 'CARD' ? this.t('order.detail.refund_card') : 'PayPal';
      aLaCartera = await this.dialogo.confirma(
        this.traduccion.tCon('order.detail.refund_choice', { method: metodo }),
      );
    }

    const resultado = await this.cancela.ejecuta(id, aLaCartera);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('order.detail.cancel_error'),
        undefined,
        'error',
      );
      return false;
    }

    await this.dialogo.alerta(
      this.t(aLaCartera ? 'order.detail.cancel_ok' : 'order.detail.cancel_ok_original'),
      undefined,
      'success',
    );
    return true;
  }
}
