import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCreditCard, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { caducidadDeTarjeta } from '../../domain/model/cobro';
import { CobrosStore } from '../../application/state/cobros.store';
import {
  CargaCobros,
  MarcaMetodoPorDefecto,
  PideCodigoDeBajaDeMetodo,
} from '../../application/use-case/cobros.use-case';
import { AltaDePaypal } from './alta-de-paypal';
import { AltaDeTarjeta } from './alta-de-tarjeta';
import { BajaDeMetodo } from './baja-de-metodo';

/**
 * La sección «Método de pago» del perfil.
 *
 * <p>Si la instalación no cobra con tarjeta, no se pinta nada: el rótulo de una sección vacía solo sirve
 * para que alguien pregunte por qué no funciona.
 */
@Component({
  selector: 'nx-metodos-de-pago',
  imports: [FaIconComponent, AltaDeTarjeta, AltaDePaypal, BajaDeMetodo],
  template: `
    @if (cobros.conTarjeta()) {
      <section class="card p-5">
        <h3 class="flex items-center gap-2">
          <fa-icon [icon]="iconos.tarjeta" class="text-brand-600" /> {{ t('profile.section.billing') }}
        </h3>
        <p class="text-[13px] text-ink-500 mt-1">{{ t('profile.billing.subtitle') }}</p>

        <div class="space-y-2 mt-4">
          @if (cobros.sinMetodos()) {
            <p class="text-[13px] text-ink-400">{{ t('profile.billing.empty') }}</p>
          }
          @for (metodo of cobros.metodos(); track metodo.referencia) {
            <!-- Mobile first: los datos se apilan y las acciones quedan debajo; en fila desde «sm». -->
            <div class="flex flex-col gap-2 border border-ink-100 rounded p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span class="flex items-center flex-wrap gap-2 text-[13px]">
                @if (metodo.tipo === 'PAYPAL') {
                  <fa-icon [icon]="iconos.paypal" class="text-[#003087]" />
                  <span class="font-medium">PayPal</span>
                  <span class="text-ink-400">· {{ metodo.correoPaypal }}</span>
                } @else {
                  <fa-icon [icon]="iconos.tarjeta" class="text-ink-400" />
                  <span class="uppercase font-medium">{{ metodo.marca }}</span>
                  <span>•••• {{ metodo.ultimosCuatro }}</span>
                  <span class="text-ink-400">· {{ caducidad(metodo) }}</span>
                }
                @if (metodo.porDefecto) {
                  <span class="badge bg-brand-50 text-brand-700">
                    <fa-icon [icon]="iconos.defecto" class="mr-1" /> {{ t('profile.billing.default') }}
                  </span>
                }
              </span>
              <div class="flex items-center gap-1 shrink-0">
                @if (!metodo.porDefecto) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-[12px]"
                    [disabled]="ocupado()"
                    (click)="marcaPorDefecto(metodo.referencia)"
                  >
                    {{ t('profile.billing.set_default') }}
                  </button>
                }
                <button
                  type="button"
                  class="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-md text-error hover:bg-error/10 disabled:opacity-50 sm:w-8 sm:h-8"
                  [attr.aria-label]="t('profile.billing.delete')"
                  [title]="t('profile.billing.delete')"
                  [disabled]="ocupado()"
                  (click)="pideCodigo(metodo.referencia)"
                >
                  <fa-icon [icon]="iconos.borrar" class="text-sm" />
                </button>
              </div>
            </div>
          }
        </div>

        <nx-alta-de-tarjeta [clavePublicable]="cobros.clavePublicable()" />

        <nx-alta-de-paypal />
      </section>

      @if (dandoDeBaja(); as referencia) {
        <nx-baja-de-metodo [referencia]="referencia" (cierra)="dandoDeBaja.set(null)" />
      }
    }
  `,
})
export class MetodosDePago {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly carga = inject(CargaCobros);
  private readonly marca = inject(MarcaMetodoPorDefecto);
  private readonly pide = inject(PideCodigoDeBajaDeMetodo);

  protected readonly cobros = inject(CobrosStore);
  protected readonly t = this.traduccion.t;
  protected readonly caducidad = caducidadDeTarjeta;

  protected readonly iconos = {
    tarjeta: faCreditCard,
    paypal: faPaypal,
    defecto: faStar,
    borrar: faTrash,
  };

  /** La referencia del método cuya baja se está confirmando. Nula mientras no haya ninguna en curso. */
  protected readonly dandoDeBaja = signal<string | null>(null);
  protected readonly ocupado = signal(false);

  constructor() {
    void this.carga.ejecuta();
  }

  protected async marcaPorDefecto(referencia: string): Promise<void> {
    await this.conAviso(() => this.marca.ejecuta(referencia));
  }

  protected async pideCodigo(referencia: string): Promise<void> {
    const bien = await this.conAviso(() => this.pide.ejecuta(referencia));
    if (bien) {
      this.dandoDeBaja.set(referencia);
      await this.dialogo.alerta(this.t('profile.billing.code_sent'), undefined, 'success');
    }
  }

  /**
   * Ejecuta y avisa si falla.
   *
   * <p>Sin este aviso, un rechazo del servidor dejaba la pantalla EXACTAMENTE igual que antes de pulsar:
   * quien lo intentaba volvía a pulsar, otra vez sin efecto, y acababa sin saber qué método tiene.
   */
  private async conAviso(accion: () => Promise<Result<void, AppError>>): Promise<boolean> {
    this.ocupado.set(true);
    try {
      const resultado = await accion();
      if (!resultado.ok) {
        const mensaje = resultado.error.mensaje || this.t('profile.billing.error');
        await this.dialogo.alerta(mensaje, undefined, 'error');
      }
      return resultado.ok;
    } finally {
      this.ocupado.set(false);
    }
  }
}
