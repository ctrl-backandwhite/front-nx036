import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faClipboard,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Recarga, esSimulada } from '../../domain/model/recarga';

/**
 * El tercer paso de la recarga: qué hacer ahora para que el dinero llegue.
 *
 * <p>Solo se ve cuando el servidor NO ha devuelto una dirección de pasarela; con tarjeta y PayPal reales
 * el navegador ya se ha ido al cobro hospedado y esta pantalla no llega a pintarse. Queda, entonces,
 * para los entornos sin pasarela —donde hay que dar el cobro por bueno a mano— y para el pago en USDT,
 * que está apagado pero con toda su maquinaria en pie.
 */
@Component({
  selector: 'nx-resultado-de-recarga',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="space-y-4">
      <div class="card p-5">
        <div class="flex items-center gap-2 text-emerald-600 text-sm">
          <fa-icon [icon]="iconos.ok" /> {{ t('recharge.payment_started') }}
        </div>
        <div class="mt-1 text-xs text-ink-500">
          ID: <span class="font-mono">{{ recarga().idDePago.slice(0, 8) }}…</span>
        </div>
        <div class="mt-3 text-xl font-medium">
          {{ recarga().importeFormateado }}
          <span class="text-sm text-ink-500">{{ recarga().divisaDeCobro }}</span>
        </div>
        <!--
          Sin la preposición «vía» escrita a fuego: salía en español con la interfaz en inglés o en
          chino. El nombre del proveedor y el estado vienen del servidor y no se traducen aquí.
        -->
        <div class="text-xs text-ink-500 mt-1">
          {{ recarga().proveedor }} · {{ estadoEnMinuscula() }} {{ recarga().estado }}
        </div>
      </div>

      @if (recarga().metodo === 'CARD') {
        <div class="card p-5">
          <h3>{{ t('recharge.method.card') }} (Stripe)</h3>
          @if (simulada()) {
            <p class="text-sm text-ink-500 mt-2">
              {{ t('recharge.stripe.mock') }}
              <code>clientSecret={{ recarga().secretoDeCliente?.slice(0, 24) }}…</code>
            </p>
            <button
              type="button"
              (click)="confirma.emit()"
              [disabled]="confirmando()"
              class="btn btn-primary mt-3 w-full"
            >
              {{ confirmando() ? t('recharge.confirming') : t('recharge.stripe.simulate') }}
            </button>
          } @else {
            <p class="text-sm text-ink-500 mt-2">{{ t('recharge.stripe.live') }}</p>
          }
        </div>
      }

      @if (recarga().metodo === 'PAYPAL') {
        <div class="card p-5">
          <h3>PayPal</h3>
          @if (recarga().urlDeAprobacion && !simulada()) {
            <a [href]="recarga().urlDeAprobacion" class="btn btn-primary w-full mt-3">
              {{ t('recharge.paypal.continue') }}
            </a>
          }
          @if (simulada()) {
            <p class="text-sm text-ink-500 mt-2">
              {{ t('recharge.paypal.mock') }}
              <code>{{ recarga().urlDeAprobacion?.slice(0, 40) }}…</code>
            </p>
            <button
              type="button"
              (click)="confirma.emit()"
              [disabled]="confirmando()"
              class="btn btn-primary mt-3 w-full"
            >
              {{ confirmando() ? t('recharge.confirming') : t('recharge.paypal.simulate') }}
            </button>
          }
        </div>
      }

      @if (recarga().metodo === 'USDT') {
        <div class="card p-5 space-y-4">
          <h3>{{ t('recharge.usdt.send_to') }}</h3>
          <div class="text-xs text-ink-500">
            {{ t('recharge.usdt.network') }}: <strong>{{ recarga().cadenaCripto }}</strong>
          </div>
          <div class="bg-ink-50 rounded p-3 break-all font-mono text-xs flex items-center gap-2">
            {{ recarga().direccionCripto }}
            <button
              type="button"
              (click)="copiaDireccion()"
              [attr.aria-label]="t('affiliate.codes.copy')"
              class="btn btn-ghost ml-auto p-1 text-ink-500"
            >
              <fa-icon [icon]="iconos.portapapeles" />
            </button>
          </div>
          @if (recarga().urlQr; as qr) {
            <div class="flex justify-center">
              <img [src]="qr" alt="QR" class="border border-ink-100 rounded p-2 bg-white" />
            </div>
          }
          <div class="text-xs text-ink-500">
            <fa-icon [icon]="iconos.aviso" class="text-amber-500 mr-1" />
            {{ avisoDeCadena() }}
          </div>
          <button
            type="button"
            (click)="confirma.emit()"
            [disabled]="confirmando()"
            class="btn btn-outline w-full"
          >
            {{ confirmando() ? t('recharge.usdt.verifying') : t('recharge.usdt.simulate') }}
          </button>
        </div>
      }

      <a routerLink="/wallet" class="btn btn-ghost block text-center">
        {{ t('recharge.back_to_wallet') }}
      </a>
    </div>
  `,
})
export class ResultadoDeRecarga {
  readonly recarga = input.required<Recarga>();
  readonly confirmando = input(false);
  /** Dar el cobro por bueno. Solo tiene sentido cuando la pasarela es de mentira. */
  readonly confirma = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly iconos = {
    ok: faCircleCheck,
    portapapeles: faClipboard,
    aviso: faTriangleExclamation,
  };

  protected readonly simulada = computed(() => esSimulada(this.recarga()));

  protected estadoEnMinuscula(): string {
    return this.t('common.status').toLowerCase();
  }

  protected avisoDeCadena(): string {
    return this.traduccion.tCon('recharge.usdt.warning', {
      chain: this.recarga().cadenaCripto ?? '',
    });
  }

  /**
   * Copia la dirección al portapapeles.
   *
   * <p>El navegador lo deniega sin TLS, sin permiso o dentro de un marco sin `clipboard-write`. Si no se
   * puede, no se hace nada más: quien copia una dirección de criptomoneda la comprueba antes de enviar,
   * y aquí lo importante es que el fallo no deje una promesa rechazada suelta.
   */
  protected copiaDireccion(): void {
    void navigator.clipboard?.writeText(this.recarga().direccionCripto ?? '').catch(() => undefined);
  }
}
