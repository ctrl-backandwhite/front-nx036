import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto } from '../../../../domain/catalogo/model/ficha-de-producto';

/**
 * La descripción del producto en el idioma que se está revisando.
 *
 * <p>La versión con marcado se pinta con `[innerHTML]`, que Angular SANEA por su cuenta: quita los
 * scripts y los manejadores de eventos antes de insertar nada. La descripción viene del catálogo de
 * origen —contenido ajeno—, así que pintarla sin sanear convertiría el panel en la vía de entrada de
 * un script. No hace falta ninguna biblioteca: es el comportamiento por defecto de la asociación.
 */
@Component({
  selector: 'nx-descripcion-de-ficha',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="card p-5">
      @if (editando()) {
        <div class="space-y-3">
          <label for="descripcion-producto" class="sr-only">
            {{ t('admin.catalog.detail.write_description') }}
          </label>
          <textarea
            id="descripcion-producto"
            class="textarea textarea-bordered w-full h-56 text-[13px]"
            [placeholder]="t('admin.catalog.detail.write_description')"
            [formField]="formulario.descripcion"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" (click)="editando.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="guardando() || formulario().invalid()"
              (click)="confirma()"
            >
              {{ t('admin.catalog.detail.save_description') }}
            </button>
          </div>
        </div>
      } @else {
        <div class="space-y-4">
          @if (ficha().descripcionHtml) {
            <div class="prose prose-sm max-w-none text-ink-700" [innerHTML]="ficha().descripcionHtml"></div>
          } @else if (texto()) {
            <p class="text-ink-700 whitespace-pre-wrap text-[13px]">{{ texto() }}</p>
          } @else {
            <p class="text-ink-400 text-center py-6">{{ t('admin.catalog.detail.no_description') }}</p>
          }
          <div class="flex justify-end">
            <button type="button" class="btn btn-primary btn-sm text-[12px]" (click)="empieza()">
              <fa-icon [icon]="iconoEditar" /> {{ t('admin.catalog.detail.edit_description') }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DescripcionDeFicha {
  readonly ficha = input.required<FichaDeProducto>();
  readonly guardando = input(false);
  readonly guarda = output<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoEditar = faPen;
  protected readonly editando = signal(false);

  protected readonly modelo = signal({ descripcion: '' });

  /**
   * El formulario no lleva reglas: la descripción puede quedarse vacía a propósito —es como se borra
   * una que llegó mal del origen—. Está aquí para que el campo se gestione como todos los demás y para
   * que el botón salga del estado del formulario en vez de una comprobación suelta.
   */
  protected readonly formulario = form(this.modelo);

  /** Lo que hay guardado hoy en la ficha, que es lo que se pinta cuando no se está editando. */
  protected readonly texto = computed(() => this.ficha().descripcion ?? '');

  protected empieza(): void {
    this.modelo.set({ descripcion: this.texto() });
    this.editando.set(true);
  }

  protected confirma(): void {
    this.guarda.emit(this.modelo().descripcion);
    this.editando.set(false);
  }
}
