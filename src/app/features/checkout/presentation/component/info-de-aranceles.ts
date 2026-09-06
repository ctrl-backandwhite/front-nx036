import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La explicación del arancel de la Unión, detrás de un icono junto al importe.
 *
 * <p>POR QUÉ EXISTE: en el resumen aparecía una línea «Aranceles UE · 23,99 €» sin nada más. Quien compra
 * ve un cargo que no entiende, en un pedido que ya paga envío e impuestos, y lo natural es pensar que se lo
 * están inventando. No es un cargo nuestro: es un derecho de aduana que la Unión cobra desde el 1 de julio
 * de 2026, y explicarlo con su norma y su plazo es la diferencia entre un cargo sospechoso y uno legítimo.
 *
 * <p>El detalle va en un diálogo y no en el resumen porque son cinco párrafos: dejarlos siempre visibles
 * empujaría el botón de pagar fuera de la pantalla justo en el paso donde eso más cuesta.
 */
@Component({
  selector: 'nx-info-de-aranceles',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      class="ml-1 align-middle text-ink-400 hover:text-primary transition-colors"
      [attr.aria-label]="t('checkout.customs_info.aria')"
      (click)="abre($event)"
    >
      <fa-icon [icon]="iconoInfo" class="text-[11px] animate-attention" />
    </button>

    @if (abierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- El fondo es un elemento APARTE del panel. Así, pinchar dentro del texto no lo cierra —al leer
             cinco párrafos es habitual hacer clic para seleccionar— y no hace falta frenar el evento, que
             es lo que dejaba el cierre fuera del alcance del teclado. -->
        <div
          class="absolute inset-0 bg-black/40"
          role="presentation"
          tabindex="-1"
          (click)="cierra()"
          (keydown.enter)="cierra()"
        ></div>
        <div
          class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-base-100 p-5 shadow-xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="t('checkout.customs_info.title')"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-[15px] font-semibold text-ink-900">
              {{ t('checkout.customs_info.title') }}
            </h3>
            <button
              type="button"
              class="text-ink-400 hover:text-ink-700"
              [attr.aria-label]="t('common.close')"
              (click)="cierra()"
            >
              <fa-icon [icon]="iconoCerrar" />
            </button>
          </div>

          <div class="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-600">
            <p>{{ t('checkout.customs_info.what') }}</p>
            <p>{{ t('checkout.customs_info.how') }}</p>

            <!-- Qué entra en el umbral y qué no. Es la duda que más se repite: se suma el total con envío
                 e impuestos, se pasa de ciento cincuenta y no se entiende por qué unas veces salta el
                 aviso y otras no. Se declara el valor de la mercancía, nada más. -->
            <div class="rounded-lg bg-base-200/60 p-3">
              <div class="font-medium text-ink-800">
                {{ t('checkout.customs_info.counts_title') }}
              </div>
              <ul class="mt-1.5 space-y-1">
                <li>✅ {{ t('checkout.customs_info.counts_in') }}</li>
                <li>❌ {{ t('checkout.customs_info.counts_out_shipping') }}</li>
                <li>❌ {{ t('checkout.customs_info.counts_out_tax') }}</li>
                <li>❌ {{ t('checkout.customs_info.counts_out_duty') }}</li>
              </ul>
            </div>

            <p>{{ t('checkout.customs_info.period') }}</p>
            <p class="text-[12px] text-ink-500">{{ t('checkout.customs_info.source') }}</p>
          </div>

          <button type="button" class="btn btn-primary btn-sm mt-4 w-full" (click)="cierra()">
            {{ t('common.understood') }}
          </button>
        </div>
      </div>
    }
  `,
  host: { '(document:keydown.escape)': 'cierra()' },
})
export class InfoDeAranceles {
  protected readonly t = inject(TraduccionService).t;
  protected readonly abierto = signal(false);

  protected readonly iconoInfo = faCircleInfo;
  protected readonly iconoCerrar = faXmark;

  /**
   * El icono vive DENTRO del formulario del pago: sin frenar el evento, pulsarlo enviaría el pedido. Es
   * exactamente lo que pasaba en el front anterior y por lo que allí también se frena.
   */
  protected abre(evento: Event): void {
    evento.preventDefault();
    this.abierto.set(true);
  }

  protected cierra(): void {
    this.abierto.set(false);
  }
}
