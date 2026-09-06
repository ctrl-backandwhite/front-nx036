import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El cierre del pago: lo que falta, el aviso legal y el botón.
 *
 * <p>INFORMACIÓN OBLIGATORIA ANTES DE COMPRAR, no después. La Directiva 2011/83/UE exige que se conozcan
 * las condiciones y el derecho de desistimiento antes de quedar vinculado. Y no informar del desistimiento
 * no solo se sanciona: AMPLÍA EL PLAZO DE DEVOLUCIÓN EN DOCE MESES sobre los catorce días. Es decir, cada
 * pedido salido de un pago mudo se puede devolver durante un año. Por eso va pegado al botón y no
 * enterrado en el pie: la ley pide información previa al pedido, y un enlace que nadie ve donde se decide
 * no lo es.
 *
 * <p>El rótulo dice que SE PAGA. «Confirmar pedido» no lo dice: la norma exige una fórmula inequívoca
 * sobre la obligación de pago, y si el botón no la lleva, quien compra no queda obligado por el pedido.
 *
 * <p>La lista de lo que falta existe porque un botón gris sin explicación es un callejón sin salida: se
 * ve que no se puede seguir y no se sabe por qué.
 */
@Component({
  selector: 'nx-boton-de-pago',
  imports: [RouterLink, FaIconComponent],
  template: `
    @if (error()) {
      <div role="alert" class="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
        {{ error() }}
      </div>
    }

    @if (faltas().length > 0 && !cobrando()) {
      <div
        class="text-[11px] text-warning-content/80 bg-warning/10 border border-warning/30 rounded p-2 space-y-0.5"
      >
        @for (falta of faltas(); track falta) {
          <div>• {{ falta }}</div>
        }
      </div>
    }

    <p class="text-[11px] text-ink-500 leading-relaxed">
      {{ t('checkout.legal.before') }}
      <a routerLink="/legal/terms" class="link" target="_blank" rel="noreferrer">{{
        t('footer.link.terms')
      }}</a>
      {{ t('checkout.legal.and') }}
      <a routerLink="/legal/withdrawal" class="link" target="_blank" rel="noreferrer">{{
        t('checkout.legal.withdrawal_link')
      }}</a
      >. {{ t('checkout.legal.withdrawal_note') }}
    </p>

    <button type="submit" class="btn btn-primary w-full" [disabled]="!sePuedePagar()">
      @if (cobrando()) {
        {{ t('common.processing') }}
      } @else {
        <fa-icon [icon]="iconoOk" /> {{ t('checkout.confirm_order_pay') }}
      }
    </button>
    <a routerLink="/cart" class="btn btn-ghost block text-center text-sm">{{
      t('checkout.back_to_cart')
    }}</a>
  `,
})
export class BotonDePago {
  readonly sePuedePagar = input.required<boolean>();
  readonly cobrando = input.required<boolean>();
  readonly error = input<string | null>(null);
  /** Lo que impide pagar ahora mismo, ya escrito en el idioma activo. */
  readonly faltas = input<readonly string[]>([]);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoOk = faCircleCheck;
}
