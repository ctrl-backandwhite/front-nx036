import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMoneyBillTransfer } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { METODOS_DE_COBRO, MetodoDeCobro, PerfilDeCobro } from '../../domain/model/afiliado';

/** Lo que sale del formulario. El IBAN va como cadena: vacío significa «no lo toques». */
export interface FormularioDeCobro {
  readonly titular: string;
  readonly iban: string;
  readonly bic: string;
  readonly correoPaypal: string;
  readonly metodoPreferido: MetodoDeCobro;
  readonly contrasena: string;
}

/**
 * Los datos de cobro del afiliado: banco, PayPal y método preferido.
 *
 * <p>El guardado REEMPLAZA el perfil entero, así que el formulario arranca con lo que hay guardado y lo
 * reenvía todo, no solo el campo tocado. El IBAN es la excepción: el servidor solo lo devuelve
 * enmascarado, el campo nace vacío y solo viaja si se teclea uno nuevo.
 *
 * <p>La contraseña se pide en cada guardado: cambiar adónde va el dinero es la operación que un
 * atacante con la sesión robada querría hacer primero.
 */
@Component({
  selector: 'nx-perfil-de-cobro',
  imports: [FaIconComponent],
  template: `
    @if (perfil(); as datos) {
      <section class="card p-5">
        <h2 class="font-medium text-sm mb-3 flex items-center gap-2">
          <fa-icon [icon]="iconoDinero" class="text-ink-400" />
          {{ t('affiliate.payout.profile.title') }}
        </h2>
        <form (submit)="envia($event)" class="grid gap-3 sm:grid-cols-2">
          <div>
            <label for="af-titular" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.bank_holder') }}
            </label>
            <input
              id="af-titular"
              class="input mt-1"
              maxlength="120"
              [value]="titular()"
              (input)="titular.set(texto($event))"
            />
          </div>
          <div>
            <label for="af-iban" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.iban') }}
              @if (datos.ibanEnmascarado) {
                <span class="text-ink-400"> ({{ datos.ibanEnmascarado }})</span>
              }
            </label>
            <input
              id="af-iban"
              class="input mt-1"
              maxlength="34"
              [value]="iban()"
              (input)="iban.set(texto($event))"
              [placeholder]="marcadorDeIban()"
            />
          </div>
          <div>
            <label for="af-bic" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.bic') }}
            </label>
            <input
              id="af-bic"
              class="input mt-1"
              maxlength="11"
              [value]="bic()"
              (input)="bic.set(texto($event))"
            />
          </div>
          <div>
            <label for="af-paypal" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.paypal_email') }}
            </label>
            <input
              id="af-paypal"
              type="email"
              class="input mt-1"
              maxlength="160"
              [value]="correoPaypal()"
              (input)="correoPaypal.set(texto($event))"
            />
          </div>
          <div>
            <label for="af-metodo" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.preferred_method') }}
            </label>
            <select
              id="af-metodo"
              class="input mt-1"
              [value]="metodoPreferido()"
              (change)="eligeMetodo($event)"
            >
              @for (metodo of metodos; track metodo) {
                <option [value]="metodo">{{ t('affiliate.payout.method.' + metodo) }}</option>
              }
            </select>
          </div>
          <div>
            <label for="af-clave" class="text-xs text-ink-500">
              {{ t('affiliate.payout.profile.password') }}
            </label>
            <input
              id="af-clave"
              type="password"
              class="input mt-1"
              required
              autocomplete="current-password"
              [value]="contrasena()"
              (input)="contrasena.set(texto($event))"
              [placeholder]="t('affiliate.payout.profile.password_hint')"
            />
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              [disabled]="guardando() || !contrasena()"
              class="btn btn-primary btn-sm"
            >
              {{ guardando() ? t('common.saving') : t('affiliate.payout.profile.save') }}
            </button>
          </div>
        </form>
      </section>
    }
  `,
})
export class PerfilDeCobroForm {
  readonly perfil = input<PerfilDeCobro | null>(null);
  readonly guardando = input(false);
  readonly guarda = output<FormularioDeCobro>();

  protected readonly metodos = METODOS_DE_COBRO;
  protected readonly iconoDinero = faMoneyBillTransfer;
  protected readonly t = inject(TraduccionService).t;

  protected readonly titular = signal('');
  protected readonly iban = signal('');
  protected readonly bic = signal('');
  protected readonly correoPaypal = signal('');
  protected readonly metodoPreferido = signal<MetodoDeCobro>('WALLET');
  protected readonly contrasena = signal('');

  constructor() {
    // El formulario se rellena con lo guardado en cuanto llega: hay que reenviarlo entero al guardar.
    effect(() => {
      const datos = this.perfil();
      if (!datos) {
        return;
      }
      this.titular.set(datos.titular ?? '');
      this.bic.set(datos.bic ?? '');
      this.correoPaypal.set(datos.correoPaypal ?? '');
      this.metodoPreferido.set(datos.metodoPreferido);
    });
  }

  protected marcadorDeIban(): string {
    return this.perfil()?.ibanEnmascarado
      ? this.t('affiliate.payout.profile.iban_placeholder')
      : 'ES00 0000 0000 0000 0000 0000';
  }

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected eligeMetodo(evento: Event): void {
    this.metodoPreferido.set((evento.target as HTMLSelectElement).value as MetodoDeCobro);
  }

  protected envia(evento: Event): void {
    evento.preventDefault();
    this.guarda.emit({
      titular: this.titular(),
      iban: this.iban(),
      bic: this.bic(),
      correoPaypal: this.correoPaypal(),
      metodoPreferido: this.metodoPreferido(),
      contrasena: this.contrasena(),
    });
  }

  /** Tras guardar se olvidan los dos datos que no deben quedarse escritos en pantalla. */
  limpiaSecretos(): void {
    this.contrasena.set('');
    this.iban.set('');
  }
}
