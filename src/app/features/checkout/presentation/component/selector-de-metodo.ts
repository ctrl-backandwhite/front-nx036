import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import {
  faCreditCard,
  faTriangleExclamation,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MetodoGuardado } from '../../domain/model/pago';
import { MetodoDePago } from '../../domain/model/pedido';
import { SaldoDeCartera } from '../../domain/port/cartera.port';

/** Lo que se emite al elegir: la clave de la interfaz, el método del negocio y la tarjeta, si la hay. */
export interface MetodoElegido {
  readonly clave: string;
  readonly metodo: MetodoDePago;
  readonly idDeTarjeta: string | null;
}

/**
 * Con qué se paga.
 *
 * <p>La clave de la interfaz y el método del negocio son cosas distintas: dos tarjetas guardadas son dos
 * claves y un solo método. Mezclarlas obligaba a la pantalla a adivinar cuál de las dos estaba marcada.
 *
 * <p>El método elegido se marca con el color primario COMO TEXTO sobre un fondo tenue. Llevaba el color
 * pensado para ir sobre un primario SÓLIDO y, encima de un fondo al diez por ciento, quedaba claro sobre
 * claro: el nombre del método seleccionado no se leía, justo el que hay que comprobar antes de pagar.
 *
 * <p>El cripto está oculto a propósito; su maquinaria sigue viva para reactivarlo.
 */
@Component({
  selector: 'nx-selector-de-metodo',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="space-y-2">
      <div class="text-xs font-medium opacity-70">{{ t('checkout.payment_method') }}</div>

      @if (guardados().length > 0) {
        <div class="space-y-1.5 text-xs">
          <div class="opacity-60">{{ t('checkout.saved_methods') }}</div>
          @for (metodo of guardados(); track metodo.id) {
            <button
              type="button"
              class="w-full border rounded-md p-2 flex items-center gap-2 min-h-11"
              [class.border-primary]="clave() === 'guardado:' + metodo.id"
              [class.bg-primary/10]="clave() === 'guardado:' + metodo.id"
              [class.text-primary]="clave() === 'guardado:' + metodo.id"
              [class.font-medium]="clave() === 'guardado:' + metodo.id"
              [class.border-base-300]="clave() !== 'guardado:' + metodo.id"
              [attr.aria-pressed]="clave() === 'guardado:' + metodo.id"
              (click)="eligeGuardado(metodo)"
            >
              <fa-icon [icon]="metodo.clase === 'CARD' ? iconoTarjeta : iconoPaypal" />
              <span class="flex-1 text-left">{{ etiqueta(metodo) }}</span>
              @if (metodo.porDefecto) {
                <span class="badge badge-ghost badge-sm">{{ t('checkout.default_method') }}</span>
              }
            </button>
          }
        </div>
      }

      <div class="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          class="border rounded-md p-2 flex items-center gap-1.5 min-h-11"
          [class.border-primary]="clave() === 'new-card'"
          [class.bg-primary/10]="clave() === 'new-card'"
          [class.text-primary]="clave() === 'new-card'"
          [class.font-medium]="clave() === 'new-card'"
          [class.border-base-300]="clave() !== 'new-card'"
          [attr.aria-pressed]="clave() === 'new-card'"
          (click)="elige.emit({ clave: 'new-card', metodo: 'CARD', idDeTarjeta: null })"
        >
          <fa-icon [icon]="iconoTarjeta" />
          <span>{{ t('checkout.pay_card') }}</span>
        </button>
        <button
          type="button"
          class="border rounded-md p-2 flex items-center gap-1.5 min-h-11"
          [class.border-primary]="clave() === 'paypal'"
          [class.bg-primary/10]="clave() === 'paypal'"
          [class.text-primary]="clave() === 'paypal'"
          [class.font-medium]="clave() === 'paypal'"
          [class.border-base-300]="clave() !== 'paypal'"
          [attr.aria-pressed]="clave() === 'paypal'"
          (click)="elige.emit({ clave: 'paypal', metodo: 'PAYPAL', idDeTarjeta: null })"
        >
          <fa-icon [icon]="iconoPaypal" />
          <span>PayPal</span>
        </button>
        <button
          type="button"
          class="col-span-2 justify-center border rounded-md p-2 flex items-center gap-1.5 min-h-11"
          [class.border-primary]="clave() === 'wallet'"
          [class.bg-primary/10]="clave() === 'wallet'"
          [class.text-primary]="clave() === 'wallet'"
          [class.font-medium]="clave() === 'wallet'"
          [class.border-base-300]="clave() !== 'wallet'"
          [attr.aria-pressed]="clave() === 'wallet'"
          (click)="elige.emit({ clave: 'wallet', metodo: 'WALLET', idDeTarjeta: null })"
        >
          <fa-icon [icon]="iconoMonedero" />
          <span>{{ t('checkout.pay_wallet') }}</span>
        </button>
      </div>
    </div>

    @if (metodo() === 'WALLET') {
      <div class="bg-base-200/50 rounded-md p-3 text-xs space-y-1">
        <div class="flex items-center gap-2 font-medium">
          <fa-icon [icon]="iconoMonedero" /> {{ t('checkout.pay_wallet') }}
        </div>
        @if (saldo(); as disponible) {
          <div class="opacity-80">
            {{ t('checkout.available') }}: <strong>{{ disponible.disponibleFormateado }}</strong>
          </div>
          @if (!alcanza()) {
            <div role="alert" class="text-warning-content mt-1 flex items-start gap-1">
              <fa-icon [icon]="iconoAviso" class="mt-0.5" />
              {{ t('checkout.insufficient') }}
              <a routerLink="/wallet/recharge" class="link link-primary ml-1">{{
                t('checkout.recharge_link')
              }}</a>
            </div>
          }
        } @else {
          <div class="opacity-60">{{ t('checkout.loading_balance') }}</div>
        }
      </div>
    }

    @if (metodo() === 'CARD') {
      <!-- La tarjeta NO se teclea en nuestro sitio: con una nueva se sale a la página segura del
           proveedor, y con una guardada el cobro lo hace el servidor. Así no hay datos de tarjeta en el
           navegador en ningún momento. -->
      <div class="bg-base-200/50 rounded-md p-3 text-xs space-y-1">
        <div class="flex items-center gap-2 font-medium">
          <fa-icon [icon]="iconoTarjeta" /> {{ t('checkout.pay_card') }}
        </div>
        <div class="opacity-80">
          {{ idDeTarjeta() ? t('checkout.saved_card_note') : t('checkout.stripe_redirect_note') }}
        </div>
      </div>
    }

    @if (metodo() === 'PAYPAL') {
      <div class="bg-base-200/50 rounded-md p-3 text-xs space-y-1">
        <div class="flex items-center gap-2 font-medium"><fa-icon [icon]="iconoPaypal" /> PayPal</div>
        <div class="opacity-80">{{ t('checkout.paypal_redirect_note') }}</div>
      </div>
    }
  `,
})
export class SelectorDeMetodo {
  readonly guardados = input.required<readonly MetodoGuardado[]>();
  readonly clave = input.required<string>();
  readonly metodo = input.required<MetodoDePago>();
  readonly idDeTarjeta = input<string | null>(null);
  readonly saldo = input<SaldoDeCartera | null>(null);
  readonly alcanza = input(true);
  readonly elige = output<MetodoElegido>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoTarjeta = faCreditCard;
  protected readonly iconoPaypal = faPaypal;
  protected readonly iconoMonedero = faWallet;
  protected readonly iconoAviso = faTriangleExclamation;

  protected etiqueta(metodo: MetodoGuardado): string {
    return metodo.clase === 'CARD'
      ? `${(metodo.marca ?? 'card').toUpperCase()} •••• ${metodo.ultimosCuatro ?? '????'}`
      : `PayPal · ${metodo.correoDePaypal ?? ''}`;
  }

  protected eligeGuardado(metodo: MetodoGuardado): void {
    this.elige.emit({
      clave: `guardado:${metodo.id}`,
      metodo: metodo.clase === 'CARD' ? 'CARD' : 'PAYPAL',
      idDeTarjeta: metodo.clase === 'CARD' ? metodo.id : null,
    });
  }
}
