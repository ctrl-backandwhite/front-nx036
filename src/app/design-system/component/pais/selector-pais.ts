import { Component, input, model } from '@angular/core';
import { COUNTRIES } from '@shared/data/countries';
import { banderaDePais, nombreDePais } from './paises';

/**
 * El desplegable de país, con bandera y nombre.
 *
 * <p>En modo de solo lectura —el caso normal, porque el país lo detecta la dirección de red y solo un
 * administrador lo cambia— enseña bandera y nombre sin poder editarse.
 */
@Component({
  selector: 'nx-selector-pais',
  template: `
    @if (soloLectura()) {
      <div [class]="(clase() || 'input mt-1') + ' bg-ink-50 flex items-center gap-2'">
        @if (valor()) {
          <span>{{ bandera(valor()) }} {{ nombre(valor()) }}</span>
        } @else {
          <span class="text-ink-400">{{ marcador() }}</span>
        }
      </div>
    } @else {
      <select
        [attr.aria-label]="etiqueta()"
        [value]="valor()"
        (change)="elige($event)"
        [class]="clase() || 'input mt-1'"
      >
        <option value="">{{ marcador() }}</option>
        @for (pais of paises; track pais.code) {
          <option [value]="pais.code" [selected]="pais.code === valor()">
            {{ bandera(pais.code) }} {{ pais.name }}
          </option>
        }
      </select>
    }
  `,
})
export class SelectorPais {
  readonly valor = model('');
  readonly soloLectura = input(false);
  readonly clase = input('');
  readonly marcador = input('—');
  /**
   * El nombre accesible del desplegable. Sin él es un `select` anónimo: quien usa un lector de pantalla
   * oye «lista desplegable» sin saber de qué, y en un formulario con varios —prefijo, país, provincia—
   * no hay forma de distinguirlos.
   */
  readonly etiqueta = input('País');

  protected readonly paises = COUNTRIES;
  protected readonly bandera = banderaDePais;
  protected readonly nombre = nombreDePais;

  protected elige(evento: Event): void {
    this.valor.set((evento.target as HTMLSelectElement).value);
  }
}
