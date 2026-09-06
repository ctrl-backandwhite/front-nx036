import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { GuiaPuntos } from '@ds/component/guia-puntos/guia-puntos';
import { CotizacionDeEnvio, OpcionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { InfoDeAranceles } from './info-de-aranceles';

/**
 * El desglose del pedido: subtotal, envío, arancel, impuesto y total.
 *
 * <p>TODOS los importes llegan escritos por el servidor. Aquí no hay una sola operación con dinero: ni
 * para el total, ni para restar la subvención, ni «para enseñar un aproximado».
 *
 * <p>Cada concepto que subvencionamos se enseña en TRES líneas —la tarifa, lo que ponemos y lo que se
 * paga—, y la tercera existe porque sin ella el resumen dejaba la resta a quien compra: «Envío 13,30 €» y
 * «Subsidio −12,37 €» sin decir en ninguna línea que pagaba 0,93 €.
 *
 * <p>Sin país no se finge un total. Enseñar el subtotal como total decía un precio final que no era: en un
 * pedido de prueba pasó de 6,20 € a 14,06 € al elegir España.
 */
@Component({
  selector: 'nx-desglose-del-pedido',
  imports: [GuiaPuntos, InfoDeAranceles],
  template: `
    <div class="text-sm space-y-1.5">
      <div class="flex items-baseline">
        <span class="text-ink-500">{{ t('cart.subtotal') }}</span>
        <nx-guia-puntos />
        <span>{{ subtotal() }}</span>
      </div>

      @if (cubierto() && (cotizacion()?.descuentoCentimos ?? 0) > 0) {
        <div class="flex items-baseline text-emerald-600">
          <span>{{ t('checkout.discount') }}</span>
          <nx-guia-puntos />
          <span>−{{ cotizacion()?.descuentoFormateado }}</span>
        </div>
      }

      <div class="flex items-baseline text-ink-500">
        <!-- El plazo es el del canal con el que se ha cotizado, no el genérico del país: si se elige uno
             más rápido y el resumen sigue diciendo el plazo del más barato, se está anunciando una fecha
             de entrega que no es la contratada. -->
        <span>
          {{ t('order.detail.shipping') }}
          @if (cubierto()) {
            <span class="block text-[11px] opacity-70">
              {{ t('tracking.carrier_default') }} · {{ plazo() }} {{ t('checkout.ship_days') }}
            </span>
          }
        </span>
        <nx-guia-puntos />
        <span>{{ importeDelEnvio() }}</span>
      </div>

      @if (cubierto() && (cotizacion()?.subvencionDeEnvioPorciento ?? 0) > 0) {
        <div class="flex items-baseline text-emerald-600 text-[12px]">
          <!-- El porcentaje va DENTRO del texto y no en una etiqueta contigua: como dos elementos
               seguidos se leía «Envío que cubrimosSubsidio 93 %» de corrido. -->
          <span class="pl-3">
            {{
              cotizacion()?.envioGratis
                ? t('checkout.free_shipping')
                : tCon('checkout.shipping_subsidy_pct', {
                    p: cotizacion()?.subvencionDeEnvioPorciento ?? 0
                  })
            }}
          </span>
          <nx-guia-puntos />
          <span>−{{ cotizacion()?.subvencionDeEnvioFormateada }}</span>
        </div>
      }

      @if (cubierto() && cotizacion()?.envioNetoFormateado) {
        <div class="flex items-baseline text-[12px]">
          <span class="pl-3 text-ink-500">{{ t('checkout.shipping_to_pay') }}</span>
          <nx-guia-puntos />
          <span>{{ cotizacion()?.envioNetoFormateado }}</span>
        </div>
      }

      @if (hayArancel()) {
        <div class="flex items-baseline text-ink-500">
          <span>{{ t('checkout.customs_eu') }}<nx-info-de-aranceles /></span>
          <nx-guia-puntos />
          <span>{{ cotizacion()?.recargoDeAduanaFormateado }}</span>
        </div>
      }

      <!-- Lo que ponemos del ARANCEL va debajo del suyo. Son dos bolsas INDEPENDIENTES —una por concepto,
           asignadas por producto—: lo que sobre de la del envío NO llega hasta aquí, así que cada
           porcentaje se lee por separado. -->
      @if (cubierto() && (cotizacion()?.subvencionDeArancelPorciento ?? 0) > 0) {
        <div class="flex items-baseline text-emerald-600 text-[12px]">
          <span class="pl-3">{{
            tCon('checkout.customs_subsidy_pct', {
              p: cotizacion()?.subvencionDeArancelPorciento ?? 0
            })
          }}</span>
          <nx-guia-puntos />
          <span>−{{ cotizacion()?.subvencionDeAranceLFormateada }}</span>
        </div>
      }

      <!-- Solo cuando hay arancel: en los destinos sin derecho por artículo no existe la línea de arriba,
           y un «a pagar» huérfano no diría de qué. -->
      @if (hayArancel() && cotizacion()?.aranceLNetoFormateado) {
        <div class="flex items-baseline text-[12px]">
          <span class="pl-3 text-ink-500">{{ t('checkout.customs_to_pay') }}</span>
          <nx-guia-puntos />
          <span>{{ cotizacion()?.aranceLNetoFormateado }}</span>
        </div>
      }

      @if (cubierto() && (cotizacion()?.impuestoPuntosBasicos ?? 0) > 0) {
        <div class="flex items-baseline text-ink-500">
          <!-- Sin el porcentaje: el tipo depende del país y lo decide el servidor, así que enseñarlo aquí
               obligaría al front a hacer una cuenta con un dato fiscal que no es suyo. Lo que hace falta
               saber es cuánto se paga de impuesto, no a qué tipo se ha calculado. -->
          <span>{{ t('order.detail.tax') }}</span>
          <nx-guia-puntos />
          <span>{{ cotizacion()?.impuestoFormateado }}</span>
        </div>
      }

      <div class="border-t border-ink-100 pt-2 mt-2 flex items-baseline font-medium text-base">
        <span>{{ t('checkout.total') }}</span>
        <nx-guia-puntos />
        @if (!hayPais()) {
          <span class="text-[12px] font-normal text-ink-500">{{
            t('checkout.pick_country_for_total')
          }}</span>
        } @else {
          <span>{{ cubierto() ? cotizacion()?.totalFormateado : subtotal() }}</span>
        }
      </div>
    </div>
  `,
})
export class DesgloseDelPedido {
  readonly cotizacion = input<CotizacionDeEnvio | undefined>(undefined);
  readonly subtotal = input.required<string>();
  readonly hayPais = input.required<boolean>();
  /** El canal con el que se ha cotizado: su plazo es el que se anuncia. */
  readonly opcionCotizada = input<OpcionDeEnvio | undefined>(undefined);

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected cubierto(): boolean {
    return this.cotizacion()?.cubierto === true;
  }

  protected hayArancel(): boolean {
    return this.cubierto() && (this.cotizacion()?.recargoDeAduanaCentimos ?? 0) > 0;
  }

  protected plazo(): string {
    const cotizacion = this.cotizacion();
    const minimo = this.opcionCotizada()?.diasMinimos ?? cotizacion?.diasMinimos ?? 0;
    const maximo = this.opcionCotizada()?.diasMaximos ?? cotizacion?.diasMaximos ?? 0;
    return `${minimo}–${maximo}`;
  }

  /** Sin país no hay tarifa; con país no cubierto se dice, y mientras viaja se espera. */
  protected importeDelEnvio(): string {
    if (!this.hayPais()) {
      return '—';
    }
    const cotizacion = this.cotizacion();
    if (!cotizacion) {
      return '…';
    }
    return cotizacion.cubierto
      ? (cotizacion.envioBaseFormateado ?? cotizacion.envioFormateado ?? '…')
      : this.t('checkout.ship_unsupported_short');
  }
}
