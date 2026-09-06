import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faSpinner,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ConfirmaElPago } from '../../application/use-case/confirma-el-pago.use-case';

/** Cuánto se deja leer «Pago confirmado» antes de llevar al pedido. */
const ESPERA_MS = 1200;

/**
 * El retorno de la pasarela.
 *
 * <p>El proveedor devuelve aquí con el pedido y el cobro en la dirección; se confirma DEL LADO DEL
 * SERVIDOR y se lleva al pedido ya pagado. No se depende del aviso automático del proveedor, que en los
 * entornos de prueba no llega.
 *
 * <p>Los parámetros llegan como ENTRADAS del componente porque el enrutador los enlaza solo: no hace falta
 * inyectar la ruta ni suscribirse a nada.
 *
 * <p>FALLO REAL CORREGIDO EN EL FRONT ANTERIOR: el temporizador que llevaba al pedido se lanzaba dentro de
 * la confirmación y no se cancelaba nunca. Quien pulsaba «ver pedido», el logotipo o el botón de atrás
 * durante ese segundo escaso acababa teletransportado al pedido desde la página a la que hubiera ido. Aquí
 * se cancela al destruir la pantalla.
 */
@Component({
  selector: 'nx-retorno-del-pago-page',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="max-w-md mx-auto card p-8 text-center">
      @switch (situacion()) {
        @case ('confirmando') {
          <fa-icon [icon]="iconoEspera" animation="spin" class="text-3xl text-primary mb-3" />
          <h1>{{ t('checkout.return.confirming') }}</h1>
          <p class="text-sm text-ink-500 mt-2">
            {{ proveedor() === 'paypal' ? t('checkout.return.paypal') : t('checkout.return.stripe') }}
            · {{ t('checkout.return.dont_close') }}
          </p>
        }
        @case ('confirmado') {
          <fa-icon [icon]="iconoOk" class="text-3xl text-emerald-500 mb-3" />
          <h1>{{ t('checkout.return.ok') }}</h1>
          <p class="text-sm text-ink-500 mt-2">{{ t('checkout.return.redirecting') }}</p>
        }
        @default {
          <fa-icon [icon]="iconoAviso" class="text-3xl text-amber-500 mb-3" />
          <h1>{{ t('checkout.return.err') }}</h1>
          <p role="alert" class="text-sm text-ink-500 mt-2">{{ error() }}</p>
          <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a routerLink="/checkout" class="btn btn-primary text-sm">{{ t('common.retry') }}</a>
            @if (orderId()) {
              <a [routerLink]="['/orders', orderId()]" class="btn btn-ghost text-sm">{{
                t('checkout.return.see_order')
              }}</a>
            }
          </div>
        }
      }
    </div>
  `,
})
export class RetornoDelPagoPage {
  /** Los nombres son los que manda el proveedor en la dirección de vuelta; no se pueden traducir. */
  readonly orderId = input('');
  readonly paymentId = input('');
  readonly provider = input('');
  readonly cancelled = input('');

  private readonly confirmaElPago = inject(ConfirmaElPago);
  private readonly router = inject(Router);
  protected readonly t = inject(TraduccionService).t;

  protected readonly situacion = signal<'confirmando' | 'confirmado' | 'error'>('confirmando');
  protected readonly error = signal<string | null>(null);

  protected readonly iconoEspera = faSpinner;
  protected readonly iconoOk = faCircleCheck;
  protected readonly iconoAviso = faTriangleExclamation;

  private temporizador: ReturnType<typeof setTimeout> | undefined;
  /** El pestillo: la confirmación cierra un COBRO y solo puede salir una vez por visita. */
  private lanzada = false;

  constructor() {
    // Se cancela al salir: sin esto, quien navega a otro sitio durante la espera acaba en el pedido.
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
    /*
     * FALLO REAL. Esto estaba en el constructor, y allí las ENTRADAS todavía no están puestas: el
     * enrutador las enlaza DESPUÉS de crear el componente (`RouterOutlet.activateWith` construye y solo
     * entonces llama al enlazador). Se confirmaba con el pedido y el cobro VACÍOS, así que quien acababa
     * de pagar en la pasarela volvía a un «No pudimos confirmar el pago · Falta la referencia del pago»,
     * el cobro nunca se cerraba del lado del servidor y la cesta no se vaciaba. Es el mismo error que la
     * vuelta de la recarga ya tenía corregido con un efecto.
     *
     * El efecto lee las entradas cuando ya han llegado; el pestillo impide que un repintado o un cambio
     * de idioma disparen una segunda confirmación sobre el mismo cobro.
     */
    effect(() => {
      const pedido = this.orderId();
      const cobro = this.paymentId();
      const cancelado = this.cancelled() === '1';
      if (this.lanzada) {
        return;
      }
      this.lanzada = true;
      void this.confirma(pedido, cobro, cancelado);
    });
  }

  protected proveedor(): string {
    return this.provider();
  }

  private async confirma(pedido: string, cobro: string, cancelado: boolean): Promise<void> {
    const resultado = await this.confirmaElPago.ejecuta(pedido, cobro, cancelado);
    if (resultado.tipo === 'error') {
      this.situacion.set('error');
      this.error.set(resultado.mensaje);
      return;
    }
    this.situacion.set('confirmado');
    this.temporizador = setTimeout(() => {
      void this.router.navigate(['/orders', pedido], {
        queryParams: { placed: 1, paid: 1 },
      });
    }, ESPERA_MS);
  }
}
