import { Injectable, Injector, Signal, computed, inject, resource, untracked } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import {
  CotizacionDeCarrito,
  aItemsACotizar,
  cotizacionDeLinea,
  firmaDeLaCesta,
  formateaPeso,
} from '../../domain/model/cotizacion-de-carrito';
import { COTIZACION_DE_CARRITO_PORT } from '../../domain/port/cotizacion-de-carrito.port';

/**
 * Lo que una pantalla necesita para pintar precios y pesos de una lista de líneas. Todo son cadenas ya
 * escritas por el servidor; aquí no se multiplica, no se convierte y no se redondea nada.
 */
export interface VistaDeCotizacion {
  readonly cargando: Signal<boolean>;
  readonly subtotal: Signal<string>;
  /** El peso total ya escrito, o nada cuando no se conoce ni uno: entonces no hay nada que decir. */
  readonly pesoTotal: Signal<string | null>;
  /** Alguna línea no declara peso: el total se enseña como «desde X». */
  readonly pesoIncompleto: Signal<boolean>;
  unitario(linea: LineaDeCarrito): string;
  totalDeLinea(linea: LineaDeCarrito): string;
  pesoDeLinea(linea: LineaDeCarrito): string | null;
}

/**
 * Lo que se pinta mientras la cotización viaja.
 *
 * <p>NO se enseña el precio congelado convertido en el navegador, que es lo que hacía el front anterior:
 * convertir divisas en el cliente es exactamente lo que la norma del proyecto prohíbe, y era la causa de
 * que la cesta dijera un importe y el cobro fuera otro. Un punto suspensivo dura décimas; un precio
 * equivocado dura hasta que alguien reclama.
 */
const MIENTRAS_LLEGA = '…';

/**
 * Re-cotiza la cesta con el precio ACTUAL del servidor.
 *
 * <p>La cesta congela el precio al añadir para poder pintar algo de inmediato; el que se factura es el
 * que sale del backend con el margen y el cambio del día. Centralizarlo aquí es lo que hace que el cajón,
 * la página de la cesta y el pago enseñen SIEMPRE el mismo importe.
 *
 * <p>Se vuelve a pedir cuando cambia el contenido de la cesta o la divisa activa, y solo entonces: la
 * clave de la petición es la firma del contenido, así que repintar no dispara nada.
 */
@Injectable()
export class CotizaElCarrito {
  private readonly puerto = inject(COTIZACION_DE_CARRITO_PORT);
  private readonly preferencias = inject(PreferenciasService);
  private readonly inyector = inject(Injector);

  /**
   * Prepara la cotización de una lista de líneas.
   *
   * <p>Recibe una SEÑAL y no un valor: la cesta cambia mientras la pantalla está abierta y quien la pinta
   * no tiene que acordarse de volver a pedir nada.
   */
  para(lineas: Signal<readonly LineaDeCarrito[]>): VistaDeCotizacion {
    const idioma = this.preferencias.idioma;

    const fuente = resource<CotizacionDeCarrito | undefined, string | undefined>({
      injector: this.inyector,
      // La divisa entra en la clave porque el backend formatea en la divisa activa: al cambiarla hay que
      // volver a pedir, o los importes seguirían escritos en la anterior.
      params: () => {
        const actuales = lineas();
        return actuales.length === 0
          ? undefined
          : `${this.preferencias.moneda()}|${firmaDeLaCesta(actuales)}`;
      },
      loader: async () => {
        const items = aItemsACotizar(untracked(lineas));
        const resultado = await this.puerto.cotiza(items);
        // Un fallo deja la vista sin importes en vez de con importes inventados. La pantalla sigue
        // usable: se puede quitar líneas y reintentar, y el total real lo dirá el pago.
        return resultado.ok ? resultado.valor : undefined;
      },
    });

    const cotizacion = computed(() => fuente.value());

    const pesoTotal = computed(() => {
      const gramos = cotizacion()?.pesoTotalGramos ?? 0;
      return gramos > 0 ? formateaPeso(gramos, idioma()) : null;
    });

    return {
      cargando: fuente.isLoading,
      subtotal: computed(() => cotizacion()?.subtotalFormateado ?? MIENTRAS_LLEGA),
      pesoTotal,
      pesoIncompleto: computed(() => cotizacion()?.pesoIncompleto === true),
      unitario: (linea) => cotizacionDeLinea(cotizacion(), linea)?.unitarioFormateado ?? MIENTRAS_LLEGA,
      totalDeLinea: (linea) =>
        cotizacionDeLinea(cotizacion(), linea)?.totalDeLineaFormateado ?? MIENTRAS_LLEGA,
      pesoDeLinea: (linea) => {
        const gramos = cotizacionDeLinea(cotizacion(), linea)?.pesoGramos;
        return gramos == null ? null : formateaPeso(gramos, idioma());
      },
    };
  }
}
