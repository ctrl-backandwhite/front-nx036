import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CamposDeAlta } from '../../../../domain/catalogo/model/alta-de-producto';
import { conRespaldo } from '../../etiquetas';
import { CampoDelAlta } from './campos-del-alta';

/** Lo que cambia: qué campo y con qué valor. */
export interface CambioDeCampo {
  readonly clave: string;
  readonly valor: string;
}

/** Contador de instancias: dos grupos pintados a la vez no pueden repetir identificadores. */
let siguienteGrupo = 0;

/**
 * Un grupo de campos escalares del alta, pintado a partir de su definición.
 *
 * <p>MOBILE FIRST: en el móvil todos ocupan la fila entera —escribir en medio campo con el pulgar es
 * incómodo— y a partir de `sm` se reparten en dos o tres columnas según lo que pida cada uno.
 */
@Component({
  selector: 'nx-campos-escalares',
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
                [value]="valorDe(campo)"
                (input)="emite(campo.clave, $event)"
              ></textarea>
            }
            @case ('seleccion') {
              <select
                [id]="identificador(campo)"
                class="select select-bordered select-sm w-full"
                [value]="valorDe(campo)"
                (change)="emite(campo.clave, $event)"
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
                [value]="valorDe(campo)"
                (input)="emite(campo.clave, $event)"
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
  readonly valores = input.required<CamposDeAlta>();
  readonly cambia = output<CambioDeCampo>();

  private readonly traduccion = inject(TraduccionService);

  /**
   * El valor tecleado del campo.
   *
   * <p>Va por método y no con un `??` en la plantilla porque el tipo del mapa promete una cadena
   * siempre, pero en tiempo de ejecución una clave que aún no se ha tocado no está: sin esto, el campo
   * nacería con «undefined» escrito dentro.
   */
  protected valorDe(campo: CampoDelAlta): string {
    return this.valores()[campo.clave] ?? '';
  }

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

  protected emite(clave: string, evento: Event): void {
    this.cambia.emit({ clave, valor: (evento.target as HTMLInputElement).value });
  }
}
