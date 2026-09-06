import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldHalved, faShop } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Quién vende.
 *
 * <p>El cliente compra a la PLATAFORMA, no a la fábrica de origen. Por eso aquí NO se enseñan los datos
 * del proveedor —número de fábrica, sello de confianza, años en el mercado, «contactar al proveedor»—:
 * enseñarlos invitaría a comprarle directamente y, sobre todo, atribuiría a otro las garantías que da
 * esta tienda.
 */
@Component({
  selector: 'nx-tarjeta-vendedor',
  imports: [RouterLink, FaIconComponent],
  template: `
    <section class="card card-border bg-base-100 mt-6">
      <div class="card-body flex-row items-center gap-4 flex-wrap">
        <div
          class="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0 select-none"
        >
          <fa-icon [icon]="iconos.tienda" class="text-2xl" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[12px] opacity-60">{{ t('pdp.seller.label') }}</div>
          <div class="font-medium">NX036</div>
          <div class="text-[12px] opacity-70 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <fa-icon [icon]="iconos.escudo" class="text-success" />
              {{ t('pdp.seller.verified') }}
            </span>
            <span>
              <fa-icon [icon]="iconos.escudo" class="text-primary" />
              {{ t('pdp.seller.protection') }}
            </span>
          </div>
        </div>
        <a routerLink="/contact" class="btn btn-outline btn-sm">{{ t('pdp.seller.contact') }}</a>
      </div>
    </section>
  `,
})
export class TarjetaVendedor {
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { tienda: faShop, escudo: faShieldHalved };
}
