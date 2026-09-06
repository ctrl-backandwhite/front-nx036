import { Component, computed, inject, input, output } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FilaTecleada } from '../../../../domain/catalogo/model/alta-de-producto';
import { conRespaldo } from '../../etiquetas';
import { CamposEscalares } from './campos-escalares';
import { ListaDelAlta } from './filas-del-alta';

/**
 * Una lista de filas editables del alta: tramos, ejes, variantes, atributos, ficha técnica o reseñas.
 *
 * <p>Las seis se editan igual, así que se pintan con el mismo componente a partir de su definición.
 * Las de muchos campos van cada una en su bloque con borde; las de tres, en una fila.
 */
@Component({
  selector: 'nx-lista-editable',
  imports: [FaIconComponent, CamposEscalares],
  template: `
    <!--
      Se sigue la fila por su identificador propio y no por su posición: al editar un campo se crea un
      objeto nuevo, y seguirla por posición reconstruiría toda la lista y el campo perdería el foco a
      cada tecla. Se llama «idDeFila» y no «clave» porque los atributos y la ficha técnica ya tienen un
      campo con ese nombre.
    -->
    @for (fila of filas(); track fila().value()['idDeFila']) {
      <div [class]="definicion().enBloque ? 'rounded border border-base-200 p-2 space-y-2' : 'space-y-2'">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <nx-campos-escalares [campos]="definicion().campos" [valores]="fila" />
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-error mt-6 shrink-0"
            [attr.aria-label]="t('actions.delete')"
            [title]="t('actions.delete')"
            (click)="quita.emit($index)"
          >
            <fa-icon [icon]="iconoBorrar" />
          </button>
        </div>
      </div>
    }
    <button type="button" class="btn btn-outline btn-xs" (click)="anade.emit()">
      <fa-icon [icon]="iconoMas" /> {{ etiquetaDeAnadir() }}
    </button>
  `,
})
export class ListaEditable {
  readonly definicion = input.required<ListaDelAlta>();
  /** El trozo de formulario con las filas de esta lista. Cada fila es un campo compuesto. */
  readonly filas = input.required<FieldTree<readonly FilaTecleada[]>>();

  readonly anade = output<void>();
  readonly quita = output<number>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoBorrar = faTrash;
  protected readonly iconoMas = faPlus;

  protected readonly etiquetaDeAnadir = computed(() =>
    conRespaldo(this.t, this.definicion().anadir, this.definicion().respaldoDeAnadir),
  );
}
