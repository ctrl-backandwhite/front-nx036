import { Injectable, Injector, Signal, computed, inject, resource } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import {
  PRECIO_POR_CANTIDAD_PORT,
  PrecioPorCantidad,
} from '../../domain/port/precio-por-cantidad.port';

/** Qué se está a punto de comprar: producto, variante y cuántas unidades. */
export interface SeleccionACotizar {
  readonly idDeProducto: string;
  readonly idDeVariante?: string;
  readonly cantidad: number;
}

/**
 * El precio de lo que hay elegido en la ficha, tal como lo va a cobrar el servidor.
 *
 * <p>Hace falta porque el precio por rango de cantidad NO se puede componer en el navegador: los
 * tramos son del producto, cada variante tiene su coste, y el escalón se aplica como una proporción
 * sobre el precio de la variante. Antes de esto la ficha enseñaba el precio de la variante sin mirar
 * la cantidad y el cobro sí la miraba, que es exactamente el «veo X y me cobran Y» que este proyecto
 * lleva años cerrando.
 *
 * <p>Se pide al MISMO presupuesto que usa la cesta, no a un cálculo paralelo. Y solo cuando hace
 * falta: quien no ha elegido nada, o lleva una sola unidad y no hay escalera, no dispara ninguna
 * petición —la clave de la consulta es nula y el recurso ni arranca—.
 */
@Injectable()
export class ConsultaElPrecioPorCantidad {
  private readonly puerto = inject(PRECIO_POR_CANTIDAD_PORT);
  private readonly preferencias = inject(PreferenciasService);
  private readonly inyector = inject(Injector);

  /**
   * Prepara la consulta de una selección que cambia mientras la pantalla está abierta.
   *
   * <p>Recibe una SEÑAL: la cantidad y la talla se tocan sin salir de la ficha, y quien la pinta no
   * tiene que acordarse de volver a preguntar. La divisa entra en la clave porque el importe llega ya
   * escrito por el servidor: al cambiarla hay que volver a pedir o seguiría en la anterior.
   */
  para(seleccion: Signal<SeleccionACotizar | null>): Signal<PrecioPorCantidad | undefined> {
    const fuente = resource<PrecioPorCantidad | undefined, string | undefined>({
      injector: this.inyector,
      params: () => {
        const s = seleccion();
        return s === null
          ? undefined
          : `${this.preferencias.moneda()}|${s.idDeProducto}|${s.idDeVariante ?? ''}|${s.cantidad}`;
      },
      loader: async ({ params }) => {
        const [, idDeProducto, idDeVariante, cantidad] = params.split('|');
        const resultado = await this.puerto.cotiza(
          idDeProducto,
          idDeVariante || undefined,
          Number(cantidad),
        );
        // Un fallo devuelve nada, y quien pinta cae al precio de la ficha. Enseñar un importe
        // inventado sería peor que enseñar el de una unidad.
        return resultado.ok ? resultado.valor : undefined;
      },
    });

    return computed(() => fuente.value());
  }
}
