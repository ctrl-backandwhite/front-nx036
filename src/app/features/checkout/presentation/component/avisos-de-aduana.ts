import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CotizacionDeEnvio } from '../../domain/model/cotizacion-de-envio';

/**
 * Los avisos del destino: sin cobertura, umbral de importación superado o destino bloqueado.
 *
 * <p>Los tres van juntos porque los tres hablan de lo mismo —qué admite la aduana del país— y los tres se
 * leen antes de pagar. Separarlos repartía por la pantalla mensajes que se explican entre sí.
 *
 * <p>El de umbral superado NO es un error: el total ya lleva el recargo de despacho formal, así que no
 * habrá cargos extra al recibir. El aviso existe para explicar por qué el envío es más caro.
 */
@Component({
  selector: 'nx-avisos-de-aduana',
  template: `
    @if (hayPais() && cotizacion() && !cotizacion()!.cubierto) {
      <div
        role="alert"
        class="mt-2 text-[12px] text-warning-content/90 bg-warning/10 border border-warning/30 rounded p-2"
      >
        {{ t('checkout.ship_unsupported') }}
      </div>
    }

    @if (cubierto() && cotizacion()!.aduanaBloqueada) {
      <div role="alert" class="mt-2 text-[12px] text-error bg-error/10 border border-error/30 rounded p-2">
        <!-- Sin límite que enseñar, el destino no admite NINGÚN importe (EE. UU. suspendió su franquicia),
             así que invitar a «ajustar el pedido para quedar por debajo» sería mandar a una puerta que no
             existe. Y el mensaje con el límite vacío se quedaba en «supera el límite de este país ()». -->
        {{
          cotizacion()!.limiteDeAduana
            ? tCon('checkout.customs_blocked', { limit: cotizacion()!.limiteDeAduana ?? '' })
            : t('checkout.customs_destination_blocked')
        }}
      </div>
    }

    @if (cubierto() && cotizacion()!.umbralDeAduanaSuperado && !cotizacion()!.aduanaBloqueada) {
      <div
        role="alert"
        class="mt-2 text-[12px] text-warning-content/90 bg-warning/10 border border-warning/30 rounded p-2"
      >
        {{ t('checkout.customs_threshold') }}
      </div>
    }
  `,
})
export class AvisosDeAduana {
  readonly cotizacion = input<CotizacionDeEnvio | undefined>(undefined);
  readonly hayPais = input.required<boolean>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected cubierto(): boolean {
    return this.cotizacion()?.cubierto === true;
  }
}
