import { Component, DestroyRef, inject, input, linkedSignal, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El buscador con freno y con aspa.
 *
 * <p>Quien lo monta recibe el texto solo cuando quien escribe hace una pausa: así una consulta al
 * servidor no viaja en cada pulsación. El aspa, en cambio, vacía al instante — borrar es una decisión
 * tomada, no un titubeo.
 */
@Component({
  selector: 'nx-campo-busqueda',
  imports: [FaIconComponent],
  template: `
    <label [class]="'input input-bordered input-sm flex items-center gap-2 ' + clase()">
      <fa-icon [icon]="iconoBuscar" class="opacity-60 text-[12px]" />
      <input
        type="search"
        [value]="local()"
        (input)="escribe($event)"
        [placeholder]="marcador() || t('common.search')"
        class="grow bg-transparent focus:outline-none text-[13px]"
      />
      @if (local()) {
        <button
          type="button"
          (click)="limpia()"
          class="opacity-60 hover:opacity-100"
          [attr.aria-label]="t('common.cancel')"
        >
          <fa-icon [icon]="iconoAspa" class="text-[11px]" />
        </button>
      }
    </label>
  `,
})
export class CampoBusqueda {
  readonly valor = model('');
  readonly marcador = input('');
  /** Milisegundos de pausa antes de avisar a quien lo monta. */
  readonly retardo = input(280);
  readonly clase = input('');

  protected readonly iconoBuscar = faMagnifyingGlass;
  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;

  /**
   * Lo tecleado va aparte de lo publicado. Si el valor de fuera cambia —al vaciar los filtros, por
   * ejemplo—, el campo se pone al día solo; mientras se escribe, manda lo local.
   */
  protected readonly local = linkedSignal(() => this.valor());

  private readonly destruccion = inject(DestroyRef);
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destruccion.onDestroy(() => clearTimeout(this.temporizador));
  }

  protected escribe(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.local.set(texto);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.valor.set(texto), this.retardo());
  }

  protected limpia(): void {
    clearTimeout(this.temporizador);
    this.local.set('');
    this.valor.set('');
  }
}
