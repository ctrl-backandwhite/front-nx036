import { Component, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FilaTecleada } from '../../../../domain/catalogo/model/alta-de-producto';
import { conRespaldo } from '../../etiquetas';
import { CampoDelAlta } from './campos-del-alta';

/** Contador de instancias: dos grupos pintados a la vez no pueden repetir identificadores. */
let siguienteGrupo = 0;

/**
 * Un grupo de campos escalares del alta, pintado a partir de su definición.
 *
 * <p>Recibe el TROZO DE FORMULARIO al que pertenecen —el mapa de campos escalares o una fila de una de
 * las seis listas— y ata cada control a su campo por la clave. Antes publicaba cada tecla hacia arriba y
 * el diálogo la volvía a mezclar en su borrador: ese rodeo era lo que hacía falta cuando el estado del
 * formulario no existía como tal.
 *
 * <p>MOBILE FIRST: en el móvil todos ocupan la fila entera —escribir en medio campo con el pulgar es
 * incómodo— y a partir de `sm` se reparten en dos o tres columnas según lo que pida cada uno.
 */
@Component({
  selector: 'nx-campos-escalares',
  imports: [FormField],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-6 gap-3">
      @for (campo of campos(); track campo.clave) {
        <div [class]="'block ' + columnas(campo)">
          <!--
            La etiqueta va ATADA al campo por identificador y no envolviéndolo: el tipo de control se
            decide con un bloque de conmutación, y así el lector de pantalla lo anuncia con su nombre
            en los tres casos. El prefijo hace único el identificador aunque el grupo se pinte dos veces.
          -->
          <label [for]="identificador(campo)" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ etiqueta(campo) }}
          </label>
          @switch (campo.clase) {
            @case ('area') {
              <textarea
                [id]="identificador(campo)"
                class="textarea textarea-bordered textarea-sm w-full h-16 font-mono text-[11px]"
                [placeholder]="campo.marcador ?? ''"
                [formField]="valores()[campo.clave]"
              ></textarea>
            }
            @case ('seleccion') {
              <select
                [id]="identificador(campo)"
                class="select select-bordered select-sm w-full"
                [formField]="valores()[campo.clave]"
              >
                @for (opcion of campo.opciones ?? []; track opcion.valor) {
                  <option [value]="opcion.valor">
                    {{ conRespaldo(opcion.etiqueta, opcion.respaldo) }}
                  </option>
                }
              </select>
            }
            @default {
              <input
                [id]="identificador(campo)"
                class="input input-bordered input-sm w-full"
                [type]="campo.clase === 'texto' ? 'text' : 'number'"
                [attr.step]="campo.clase === 'numero' ? '0.01' : null"
                [placeholder]="campo.marcador ?? ''"
                [formField]="valores()[campo.clave]"
              />
            }
          }
        </div>
      }
    </div>
  `,
})
export class CamposEscalares {
  private readonly prefijo = `alta-${++siguienteGrupo}`;

  readonly campos = input.required<readonly CampoDelAlta[]>();
  /** El trozo de formulario con los campos de este grupo: el mapa escalar o una fila de una lista. */
  readonly valores = input.required<FieldTree<FilaTecleada>>();

  private readonly traduccion = inject(TraduccionService);

  protected identificador(campo: CampoDelAlta): string {
    return `${this.prefijo}-${campo.clave}`;
  }

  protected etiqueta(campo: CampoDelAlta): string {
    return conRespaldo(this.traduccion.t, campo.etiqueta, campo.respaldo);
  }

  protected conRespaldo(clave: string, respaldo: string): string {
    return conRespaldo(this.traduccion.t, clave, respaldo);
  }

  /** Media fila son tres de seis columnas; un tercio, dos. Sin prefijo, la fila entera del móvil. */
  protected columnas(campo: CampoDelAlta): string {
    if (campo.ancho === 'media') {
      return 'sm:col-span-3';
    }
    return campo.ancho === 'tercio' ? 'sm:col-span-2' : 'sm:col-span-6';
  }
}
