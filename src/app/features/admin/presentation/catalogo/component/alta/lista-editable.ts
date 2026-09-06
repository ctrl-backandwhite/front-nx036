import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { conRespaldo } from '../../etiquetas';
import { CamposEscalares } from './campos-escalares';
import { ListaDelAlta } from './filas-del-alta';

/** Qué fila se ha tocado, qué campo y con qué valor. */
export interface CambioEnFila {
  readonly indice: number;
  readonly clave: string;
  readonly valor: string;
}

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
    @for (fila of filas(); track fila['idDeFila']) {
      <div [class]="definicion().enBloque ? 'rounded border border-base-200 p-2 space-y-2' : 'space-y-2'">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <nx-campos-escalares
              [campos]="definicion().campos"
              [valores]="fila"
              (cambia)="cambia.emit({ indice: $index, clave: $event.clave, valor: $event.valor })"
            />
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
  readonly filas = input.required<readonly Readonly<Record<string, string>>[]>();

  readonly cambia = output<CambioEnFila>();
  readonly anade = output<void>();
  readonly quita = output<number>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoBorrar = faTrash;
  protected readonly iconoMas = faPlus;

  protected etiquetaDeAnadir(): string {
    return conRespaldo(this.t, this.definicion().anadir, this.definicion().respaldoDeAnadir);
  }
}
