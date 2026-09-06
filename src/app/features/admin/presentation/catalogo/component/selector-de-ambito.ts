import { Component, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/** A qué se aplica el cambio: a lo marcado, a la categoría del filtro o a todo el catálogo. */
export type AmbitoElegido = 'seleccion' | 'categoria' | 'todo';

/**
 * El selector de alcance de un cambio en lote.
 *
 * <p>Se comparte entre el recargo y las bolsas de subvención porque son la MISMA decisión, y tenerla
 * escrita dos veces garantizaba que un día se corrigiera solo en una. La opción de categoría se apaga
 * cuando no hay filtro de categoría puesto: sin él no habría a qué aplicarlo.
 */
@Component({
  selector: 'nx-selector-de-ambito',
  template: `
    <fieldset class="space-y-1.5">
      <legend class="sr-only">{{ t('admin.catalog.surcharge.title') }}</legend>
      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="radio"
          class="radio radio-xs"
          [checked]="ambito() === 'seleccion'"
          (change)="ambito.set('seleccion')"
        />
        {{ etiquetaDeSeleccion() }}
      </label>
      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="radio"
          class="radio radio-xs"
          [checked]="ambito() === 'categoria'"
          [disabled]="!nombreDeCategoria()"
          (change)="ambito.set('categoria')"
        />
        {{ etiquetaDeCategoria() }}
      </label>
      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="radio"
          class="radio radio-xs"
          [checked]="ambito() === 'todo'"
          (change)="ambito.set('todo')"
        />
        {{ t(prefijo() + '.scope_all') }}
      </label>
    </fieldset>
  `,
})
export class SelectorDeAmbito {
  readonly ambito = model.required<AmbitoElegido>();
  readonly seleccionados = input(0);
  readonly nombreDeCategoria = input<string | null>(null);
  /** `admin.catalog.surcharge` o `admin.catalog.subsidy`: los dos tienen las mismas cuatro claves. */
  readonly prefijo = input.required<string>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;

  protected etiquetaDeSeleccion(): string {
    return this.tCon(`${this.prefijo()}.scope_selected`, { n: this.seleccionados() });
  }

  protected etiquetaDeCategoria(): string {
    const nombre = this.nombreDeCategoria();
    return nombre
      ? this.tCon(`${this.prefijo()}.scope_category`, { cat: nombre })
      : this.t(`${this.prefijo()}.scope_category_disabled`);
  }
}
