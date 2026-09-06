import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ajusteValido, depositoValido } from '../../../domain/gestion/model/carteras';
import { VentanaModal } from './ventana-modal';

/** Qué se está moviendo: un ingreso a favor del cliente, o una corrección con signo. */
export type ClaseDeMovimiento = 'deposito' | 'ajuste';

export interface ImporteConMotivo {
  readonly importeCentimos: number;
  readonly descripcion: string;
}

/**
 * El formulario que mueve saldo de una cartera.
 *
 * <p>Sirve para las dos operaciones porque son la misma forma con reglas distintas: el DEPÓSITO solo
 * suma y su nota es opcional; el AJUSTE lleva SIGNO —puede restar— y el motivo es OBLIGATORIO, porque
 * el apunte queda en el libro mayor y alguien tendrá que explicarlo cuando un cliente pregunte por qué
 * le falta dinero. Ninguna de las dos admite el cero: no mueve saldo y solo ensucia el libro con un
 * apunte mudo.
 *
 * <p>Las dos reglas viven en el ESQUEMA del formulario y se aplican con `when` según la clase de
 * movimiento, así que el mínimo del depósito y la obligatoriedad del motivo dejan de estar repartidos
 * entre un atributo de la plantilla y un `computed`: hay UN sitio que dice cuándo se puede enviar.
 *
 * <p>El botón deshabilitado NO es la regla: las mismas comprobaciones están en el caso de uso, que es
 * quien de verdad impide el envío. Aquí solo evitan el viaje inútil.
 *
 * <p>Cada `<label>` apunta a SU campo con `for`. En una pantalla que mueve dinero real, teclear el
 * motivo en la casilla del importe no puede ser un accidente posible, y sin `for` un lector de pantalla
 * no sabe decir cuál es cuál. Los identificadores son fijos porque solo hay un formulario abierto.
 */
@Component({
  selector: 'nx-carteras-modal-saldo',
  imports: [VentanaModal, FormField],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      @if (clase() === 'deposito') {
        <p class="text-[12px] text-ink-500">
          {{ t('admin.wallets.topup.body') }} <strong>{{ email() }}</strong>
        </p>
      } @else {
        <p class="text-[12px] text-ink-500">{{ t('admin.wallets.adjust.body') }}</p>
      }

      <label for="cartera-importe" class="text-xs text-ink-500">{{ etiquetaDelImporte() }}</label>
      <input
        id="cartera-importe"
        type="number"
        step="0.01"
        class="input"
        [placeholder]="clase() === 'deposito' ? '25.00' : '-10.00'"
        [formField]="formulario.importe"
      />
      @if (formulario.importe().touched() && formulario.importe().errors().length) {
        <p role="alert" class="text-[11px] text-error">
          {{ formulario.importe().errors()[0].message }}
        </p>
      }

      <label for="cartera-motivo" class="text-xs text-ink-500">{{ etiquetaDelMotivo() }}</label>
      <input
        id="cartera-motivo"
        type="text"
        class="input"
        [placeholder]="marcadorDelMotivo()"
        [formField]="formulario.motivo"
      />
      @if (formulario.motivo().touched() && formulario.motivo().errors().length) {
        <p role="alert" class="text-[11px] text-error">
          {{ formulario.motivo().errors()[0].message }}
        </p>
      }

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" (click)="cierra.emit()" class="btn btn-outline text-[12px]">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="formulario().invalid() || enviando()"
          (click)="envia()"
        >
          {{
            clase() === 'deposito'
              ? t('admin.wallets.topup.submit')
              : t('admin.wallets.adjust.submit')
          }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class CarterasModalSaldo {
  readonly clase = input.required<ClaseDeMovimiento>();
  /** El correo de quien recibe el ingreso. Solo se enseña en el depósito, como hacía el panel anterior. */
  readonly email = input('');
  readonly enviando = input(false);

  readonly cierra = output<void>();
  readonly confirma = output<ImporteConMotivo>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  /**
   * El importe se teclea en unidades y viaja en céntimos.
   *
   * <p>Vacío es `null` y no cero: son cosas distintas —«todavía no ha escrito nada» frente a «quiere
   * mover cero»— y con la cadena vacía de antes las dos acababan valiendo `NaN` en el mismo sitio.
   */
  protected readonly modelo = signal<{ importe: number | null; motivo: string }>({
    importe: null,
    motivo: '',
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.importe, { message: () => this.t('dialog.field.required') });
    // El depósito SOLO suma: el mínimo lo pone el esquema y la directiva lo proyecta al campo, que es
    // como el atributo del navegador y la regla dejan de poder decir cosas distintas.
    min(ruta.importe, () => (this.clase() === 'deposito' ? 0.01 : undefined), {
      message: () => this.t('dialog.field.min'),
    });
    // Las dos reglas de negocio salen del dominio, no se reescriben aquí: el cero nunca vale, y el
    // ajuste además exige motivo porque el apunte queda en el libro mayor.
    validate(ruta.importe, ({ value, valueOf }) => {
      const centimos = aCentimos(value());
      const valido =
        this.clase() === 'deposito'
          ? depositoValido(centimos)
          : ajusteValido(centimos, valueOf(ruta.motivo));
      return valido ? null : { kind: 'importe', message: this.t('dialog.field.number') };
    });
    required(ruta.motivo, {
      when: () => this.clase() === 'ajuste',
      message: () => this.t('dialog.field.required'),
    });
  });

  protected readonly titulo = computed(() =>
    this.clase() === 'deposito'
      ? this.t('admin.wallets.topup.title')
      : this.t('admin.wallets.adjust.title'),
  );

  /** En el ajuste se avisa de que el signo cuenta; en el depósito no, porque solo suma. */
  protected readonly etiquetaDelImporte = computed(() =>
    this.clase() === 'deposito'
      ? this.t('admin.wallets.amount_usd')
      : `${this.t('admin.wallets.amount_usd')} (${this.t('admin.wallets.signed_hint')})`,
  );

  protected readonly etiquetaDelMotivo = computed(() =>
    this.clase() === 'deposito'
      ? this.t('admin.wallets.note_optional')
      : this.t('admin.wallets.reason_required'),
  );

  protected readonly marcadorDelMotivo = computed(() =>
    this.clase() === 'deposito'
      ? this.t('admin.wallets.topup.note_placeholder')
      : this.t('admin.wallets.adjust.reason_placeholder'),
  );

  /**
   * Los céntimos se calculan redondeando: `12.34 * 100` da 1233,9999… en coma flotante, y truncar ahí
   * habría cobrado un céntimo de menos en cada apunte.
   */
  protected readonly centimos = computed(() => aCentimos(this.modelo().importe));

  protected envia(): void {
    this.confirma.emit({
      importeCentimos: this.centimos(),
      descripcion: this.modelo().motivo.trim(),
    });
  }
}

/** Unidades a céntimos, redondeando; sin importe todavía, no hay número que mover. */
function aCentimos(importe: number | null): number {
  return importe === null || !Number.isFinite(importe) ? Number.NaN : Math.round(importe * 100);
}
