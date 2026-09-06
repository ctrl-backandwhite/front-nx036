import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Plan } from '../../../domain/gestion/model/facturacion';
import { VentanaModal } from './ventana-modal';

/**
 * El editor de un plan de suscripción.
 *
 * <p>Aquí se teclea el precio que se cobra a TODOS los suscriptores de ese plan, así que las dos casillas
 * de precio llevan etiqueta asociada con `for`: sin ella, un lector de pantalla anuncia «cuadro de
 * edición» sin decir cuál, y pulsar el rótulo no enfocaba el campo. Confundir la cuota mensual con la
 * anual no puede ser un accidente posible.
 *
 * <p>Los precios se teclean en CÉNTIMOS DE DÓLAR y son enteros. El símbolo «¢» confundía cuando el
 * listado se pinta en euros, así que la unidad se escribe literal —«USD cents»— y en inglés a propósito:
 * es la unidad del dato que guarda el backend, no prosa de interfaz, y traducirla haría creer que el
 * campo cambia con la divisa activa. Es la única cadena literal de esta pantalla.
 *
 * <p>MOBILE FIRST: en el móvil los campos van uno debajo de otro y las dos casillas de precio se ponen
 * en dos columnas a partir de `sm:`, donde ya caben sin apretarse.
 */
@Component({
  selector: 'nx-facturacion-editor-de-plan',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cancela.emit()">
      <div class="space-y-3 text-sm">
        <div>
          <label for="plan-nombre" class="text-xs text-ink-500">
            {{ t('admin.billing.col.name') }}
          </label>
          <input
            id="plan-nombre"
            class="input"
            [value]="borrador().nombre"
            (input)="cambiaTexto('nombre', $event)"
          />
        </div>

        <div>
          <label for="plan-descripcion" class="text-xs text-ink-500">
            {{ t('admin.billing.description') }}
          </label>
          <input
            id="plan-descripcion"
            class="input"
            [value]="borrador().descripcion ?? ''"
            (input)="cambiaTexto('descripcion', $event)"
          />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="plan-mensual" class="text-xs text-ink-500">
              {{ t('admin.billing.col.monthly') }} <span class="opacity-60">(USD cents)</span>
            </label>
            <input
              id="plan-mensual"
              type="number"
              class="input"
              [value]="borrador().mensualCentimos"
              (input)="cambiaCentimos('mensualCentimos', $event)"
            />
          </div>
          <div>
            <label for="plan-anual" class="text-xs text-ink-500">
              {{ t('admin.billing.col.yearly') }} <span class="opacity-60">(USD cents)</span>
            </label>
            <input
              id="plan-anual"
              type="number"
              class="input"
              [value]="borrador().anualCentimos"
              (input)="cambiaCentimos('anualCentimos', $event)"
            />
          </div>
        </div>

        <label for="plan-activo" class="text-sm flex items-center gap-2">
          <input
            id="plan-activo"
            type="checkbox"
            [checked]="borrador().activo"
            (change)="cambiaActivo($event)"
          />
          {{ t('admin.billing.col.active') }}
        </label>
      </div>

      <div class="flex justify-end gap-2 pt-3">
        <button type="button" class="btn btn-outline" (click)="cancela.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="guardando()"
          (click)="guarda.emit(borrador())"
        >
          {{ guardando() ? t('common.saving') : t('actions.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class FacturacionEditorDePlan {
  readonly plan = input.required<Plan>();
  readonly guardando = input(false);
  readonly cancela = output<void>();
  readonly guarda = output<Plan>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  /**
   * Copia de trabajo: se edita aquí y solo sale al pulsar guardar. Se rehace sola cuando entra otro
   * plan, para que abrir el editor de un plan distinto no arrastre lo tecleado en el anterior.
   */
  protected readonly borrador = linkedSignal<Plan>(() => ({ ...this.plan() }));

  protected titulo(): string {
    return `${this.t('admin.billing.edit_plan')} ${this.plan().codigo}`;
  }

  protected cambiaTexto(campo: 'nombre' | 'descripcion', evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.borrador.update((plan) => ({ ...plan, [campo]: texto }));
  }

  /** El campo es un ENTERO de céntimos: un número roto se queda en cero antes de llegar al backend. */
  protected cambiaCentimos(campo: 'mensualCentimos' | 'anualCentimos', evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.borrador.update((plan) => ({
      ...plan,
      [campo]: Number.isFinite(valor) ? valor : 0,
    }));
  }

  protected cambiaActivo(evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    this.borrador.update((plan) => ({ ...plan, activo }));
  }
}
