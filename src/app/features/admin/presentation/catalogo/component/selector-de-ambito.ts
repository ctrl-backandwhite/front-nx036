import { Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';

/** A qué se aplica el cambio: a lo marcado, a la categoría del filtro o a todo el catálogo. */
export type AmbitoElegido = 'seleccion' | 'categoria' | 'todo';

/**
 * El selector de alcance de un cambio en lote.
 *
 * <p>Se comparte entre el recargo y las bolsas de subvención porque son la MISMA decisión, y tenerla
 * escrita dos veces garantizaba que un día se corrigiera solo en una. La opción de categoría se apaga
 * cuando no hay filtro de categoría puesto: sin él no habría a qué aplicarlo.
 *
 * <p>Recibe el CAMPO del formulario de quien lo monta, no un valor suelto: el ámbito forma parte de lo
 * que se envía, así que vive en el mismo modelo que el importe y no en un signal aparte que hubiera que
 * mantener sincronizado a mano.
 */
@Component({
  selector: 'nx-selector-de-ambito',
  imports: [FormField],
  template: `
    <fieldset class="space-y-1.5">
      <legend class="sr-only">{{ t('admin.catalog.surcharge.title') }}</legend>
      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input type="radio" class="radio radio-xs" value="seleccion" [formField]="campo()" />
        {{ etiquetaDeSeleccion() }}
      </label>
      <!--
        Sin categoría en el filtro no hay a qué aplicarlo: la opción se enseña apagada y NO se ata al
        formulario. Una opción que no se puede elegir no forma parte de lo que se envía, y apagarla desde
        el esquema apagaría el ámbito ENTERO, que son las otras dos opciones también. La etiqueta se
        repite entera en cada rama porque un control dentro de un bloque @if no cuenta como asociado a ella.
      -->
      @if (nombreDeCategoria()) {
        <label class="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="radio" class="radio radio-xs" value="categoria" [formField]="campo()" />
          {{ etiquetaDeCategoria() }}
        </label>
      } @else {
        <label class="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="radio" class="radio radio-xs" disabled />
          {{ etiquetaDeCategoria() }}
        </label>
      }
      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input type="radio" class="radio radio-xs" value="todo" [formField]="campo()" />
        {{ t(prefijo() + '.scope_all') }}
      </label>
    </fieldset>
  `,
})
export class SelectorDeAmbito {
  readonly campo = input.required<FieldTree<AmbitoElegido>>();
  readonly seleccionados = input(0);
  readonly nombreDeCategoria = input<string | null>(null);
  /** `admin.catalog.surcharge` o `admin.catalog.subsidy`: los dos tienen las mismas cuatro claves. */
  readonly prefijo = input.required<string>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;

  protected readonly etiquetaDeSeleccion = computed(() =>
    this.tCon(`${this.prefijo()}.scope_selected`, { n: this.seleccionados() }),
  );

  protected readonly etiquetaDeCategoria = computed(() => {
    const nombre = this.nombreDeCategoria();
    return nombre
      ? this.tCon(`${this.prefijo()}.scope_category`, { cat: nombre })
      : this.t(`${this.prefijo()}.scope_category_disabled`);
  });
}
