import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Plan } from '../../../domain/gestion/model/facturacion';
import { VentanaModal } from './ventana-modal';

/** Lo editable de un plan. El resto —identificador, código, divisa, posición— no se toca aquí. */
interface BorradorDePlan {
  nombre: string;
  descripcion: string;
  mensualCentimos: number | null;
  anualCentimos: number | null;
  activo: boolean;
}

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
 * <p>Un precio VACÍO ya no se convierte en cero calladamente: el esquema lo declara obligatorio y no
 * negativo, así que el botón se apaga y el campo dice por qué. Antes, borrar la casilla y guardar dejaba
 * el plan a coste cero para todos sus suscriptores sin un solo aviso.
 *
 * <p>MOBILE FIRST: en el móvil los campos van uno debajo de otro y las dos casillas de precio se ponen
 * en dos columnas a partir de `sm:`, donde ya caben sin apretarse.
 */
@Component({
  selector: 'nx-facturacion-editor-de-plan',
  imports: [VentanaModal, FormField],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cancela.emit()">
      <div class="space-y-3 text-sm">
        <div>
          <label for="plan-nombre" class="text-xs text-ink-500">
            {{ t('admin.billing.col.name') }}
          </label>
          <input id="plan-nombre" class="input" [formField]="formulario.nombre" />
          @if (formulario.nombre().touched() && formulario.nombre().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.nombre().errors()[0].message }}
            </p>
          }
        </div>

        <div>
          <label for="plan-descripcion" class="text-xs text-ink-500">
            {{ t('admin.billing.description') }}
          </label>
          <input id="plan-descripcion" class="input" [formField]="formulario.descripcion" />
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
              [formField]="formulario.mensualCentimos"
            />
            @if (formulario.mensualCentimos().touched() && formulario.mensualCentimos().errors().length) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.mensualCentimos().errors()[0].message }}
              </p>
            }
          </div>
          <div>
            <label for="plan-anual" class="text-xs text-ink-500">
              {{ t('admin.billing.col.yearly') }} <span class="opacity-60">(USD cents)</span>
            </label>
            <input
              id="plan-anual"
              type="number"
              class="input"
              [formField]="formulario.anualCentimos"
            />
            @if (formulario.anualCentimos().touched() && formulario.anualCentimos().errors().length) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.anualCentimos().errors()[0].message }}
              </p>
            }
          </div>
        </div>

        <label for="plan-activo" class="text-sm flex items-center gap-2">
          <input id="plan-activo" type="checkbox" [formField]="formulario.activo" />
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
          [disabled]="guardando() || formulario().invalid()"
          (click)="guarda.emit(planEditado())"
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
  protected readonly modelo = linkedSignal<BorradorDePlan>(() => ({
    nombre: this.plan().nombre,
    descripcion: this.plan().descripcion ?? '',
    mensualCentimos: this.plan().mensualCentimos,
    anualCentimos: this.plan().anualCentimos,
    activo: this.plan().activo,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: () => this.t('dialog.field.required') });
    required(ruta.mensualCentimos, { message: () => this.t('dialog.field.required') });
    required(ruta.anualCentimos, { message: () => this.t('dialog.field.required') });
    // Una cuota negativa devolvería dinero cada ciclo a todos los suscriptores del plan.
    min(ruta.mensualCentimos, 0, { message: () => this.t('dialog.field.min') });
    min(ruta.anualCentimos, 0, { message: () => this.t('dialog.field.min') });
  });

  /** Depende del plan y del idioma: es un valor derivado, no un método que se recalcula al pintar. */
  protected readonly titulo = computed(
    () => `${this.t('admin.billing.edit_plan')} ${this.plan().codigo}`,
  );

  /**
   * El plan tal y como sale de la ventana: lo que no se edita aquí viaja intacto.
   *
   * <p>Los precios no pueden ser nulos al llegar aquí —el botón está apagado mientras lo sean— pero se
   * escribe la salvaguarda igualmente: quien lea esto no tiene por qué reconstruir esa cadena.
   */
  protected readonly planEditado = computed<Plan>(() => {
    const borrador = this.modelo();
    return {
      ...this.plan(),
      nombre: borrador.nombre,
      descripcion: borrador.descripcion,
      mensualCentimos: borrador.mensualCentimos ?? 0,
      anualCentimos: borrador.anualCentimos ?? 0,
      activo: borrador.activo,
    };
  });
}
