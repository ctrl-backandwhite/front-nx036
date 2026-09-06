import {
  Injectable,
  Injector,
  Signal,
  computed,
  inject,
  linkedSignal,
  resource,
  untracked,
} from '@angular/core';
import { CotizacionDeEnvio, OpcionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { ItemDelPedido } from '../../domain/model/pedido';
import { ENVIO_PORT } from '../../domain/port/envio.port';
import { CompraStore } from '../state/compra.store';

/** Lo que la pantalla necesita del envío. Todo importe viene ya escrito por el servidor. */
export interface VistaDeEnvio {
  readonly cotizacion: Signal<CotizacionDeEnvio | undefined>;
  readonly cargando: Signal<boolean>;
  readonly opciones: Signal<readonly OpcionDeEnvio[]>;
  /**
   * El canal con el que el SERVIDOR ha calculado el desglose que se está viendo, que no siempre es el que
   * se pulsó: si el elegido dejó de cotizar, aquí llega el que de verdad se cobra.
   */
  readonly opcionCotizada: Signal<string | undefined>;
}

/** La firma de lo que se está cotizando: cambia solo cuando cambia algo que altera el precio. */
function firma(
  pais: string,
  region: string,
  cupon: string,
  opcion: string | undefined,
  items: readonly ItemDelPedido[],
): string {
  const cesta = items.map((item) => `${item.productId}:${item.variantId ?? ''}:${item.cantidad}`).join(',');
  return `${pais}|${region}|${cupon}|${opcion ?? ''}|${cesta}`;
}

/**
 * El desglose del pedido para el destino elegido, recotizado EN EL SERVIDOR.
 *
 * <p>Se vuelve a pedir al cambiar de dirección, de forma de envío, de cupón o de contenido de la cesta, y
 * SOLO entonces. Nunca se ajusta un total sumando en el navegador: el envío entra en la base del
 * impuesto, así que el total de una opción más cara no es el anterior más la diferencia.
 */
@Injectable()
export class CotizaElEnvio {
  private readonly puerto = inject(ENVIO_PORT);
  private readonly estado = inject(CompraStore);
  private readonly inyector = inject(Injector);

  /**
   * Prepara la cotización para una cesta.
   *
   * <p>Recibe las líneas como SEÑAL porque en esta misma pantalla se pueden ajustar cantidades: cuando el
   * destino no admite el importe, el aviso pide reducir el pedido, y pedir una acción donde no se puede
   * ejecutar es la peor forma de bloquear una compra.
   */
  para(items: Signal<readonly ItemDelPedido[]>): VistaDeEnvio {
    const fuente = resource<CotizacionDeEnvio | undefined, string | undefined>({
      injector: this.inyector,
      params: () => {
        const pais = this.estado.paisDeEnvio();
        const lineas = items();
        // Sin destino no hay tarifa que pedir, y sin líneas tampoco hay nada que llevar.
        return pais && lineas.length > 0
          ? firma(
              pais,
              this.estado.regionDeEnvio(),
              this.estado.cupon(),
              this.estado.opcionDeEnvio(),
              lineas,
            )
          : undefined;
      },
      loader: async () => {
        const resultado = await this.puerto.cotiza({
          pais: untracked(this.estado.paisDeEnvio),
          region: untracked(this.estado.regionDeEnvio) || undefined,
          items: untracked(items),
          codigoDeCupon: untracked(this.estado.cupon) || undefined,
          opcionDeEnvio: untracked(this.estado.opcionDeEnvio),
        });
        return resultado.ok ? resultado.valor : undefined;
      },
    });

    /**
     * Mientras se recotiza se sigue enseñando el desglose ANTERIOR en vez de vaciarlo: el precio
     * parpadeando a «…» cada vez que se toca una opción es justo lo que hace dudar del total.
     */
    const cotizacion = linkedSignal<CotizacionDeEnvio | undefined, CotizacionDeEnvio | undefined>({
      source: () => fuente.value(),
      computation: (llegada, previa) => llegada ?? previa?.value,
    });

    return {
      cotizacion,
      cargando: fuente.isLoading,
      opciones: computed(() => cotizacion()?.opciones ?? []),
      opcionCotizada: computed(() => cotizacion()?.opcionCotizada),
    };
  }
}
