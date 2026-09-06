import { Component, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '../marcador/imagen-segura';

/**
 * La miniatura que se abre a pantalla completa.
 *
 * <p>Se cierra pulsando el fondo, el aspa o la tecla de escape — las tres, porque quien abre una foto a
 * pantalla completa espera salir por donde le salga, y quedarse encerrado en una imagen es de las cosas
 * que más irritan. Sin imagen no es pulsable: un botón que no hace nada es peor que ningún botón.
 */
@Component({
  selector: 'nx-lupa-imagen',
  imports: [FaIconComponent, ImagenSegura],
  template: `
    <button
      type="button"
      (click)="abre()"
      [attr.aria-label]="alt()"
      class="block p-0 border-0 bg-transparent"
      [class.cursor-zoom-in]="!!src()"
      [class.cursor-default]="!src()"
    >
      <nx-imagen-segura
        [src]="src()"
        [alt]="alt()"
        [clase]="clase()"
        [claseMarcador]="claseMarcador()"
      />
    </button>
    @if (abierta() && src()) {
      <div
        class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
      >
        <!-- El fondo va en su propia capa, marcada como decorativa: así el clic que cierra no cuelga de
             un contenedor que además envuelve a la imagen, que es justo lo que no debe cerrarse. -->
        <div class="absolute inset-0" (click)="cierra()" aria-hidden="true"></div>
        <img
          [src]="src()"
          [alt]="alt()"
          class="relative max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-2xl cursor-default"
        />
        <button
          type="button"
          (click)="cierra()"
          [attr.aria-label]="t('common.close')"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl"
        >
          <fa-icon [icon]="iconoAspa" />
        </button>
      </div>
    }
  `,
  host: { '(document:keydown.escape)': 'cierra()' },
})
export class LupaImagen {
  readonly src = input<string | null | undefined>(undefined);
  readonly alt = input('');
  readonly clase = input('');
  readonly claseMarcador = input('');

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;
  protected readonly abierta = signal(false);

  protected abre(): void {
    if (this.src()) {
      this.abierta.set(true);
    }
  }

  protected cierra(): void {
    this.abierta.set(false);
  }
}
