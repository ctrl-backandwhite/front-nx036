import { Component, computed, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { PreferenciasService } from '@core/preferences/preferencias';
import { TraduccionService } from '@core/i18n/traduccion.service';

const TEMA_OSCURO = 'nx036-pastel-dark';
const TEMA_CLARO = 'nx036-pastel';

/**
 * El botón de claro/oscuro.
 *
 * <p>No guarda nada por su cuenta: la preferencia vive en una cookie que lee el servicio de
 * preferencias, y el atributo `data-theme` del documento lo escribe el armazón de la aplicación. Aquí
 * solo se pulsa.
 */
@Component({
  selector: 'nx-interruptor-tema',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      (click)="alterna()"
      class="btn btn-ghost btn-sm btn-square"
      [attr.aria-label]="etiqueta()"
      [title]="etiqueta()"
    >
      <fa-icon [icon]="esOscuro() ? iconoSol : iconoLuna" />
    </button>
  `,
})
export class InterruptorTema {
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoSol = faSun;
  protected readonly iconoLuna = faMoon;

  protected readonly esOscuro = computed(() => this.preferencias.tema() === TEMA_OSCURO);

  /** El rótulo anuncia a DÓNDE lleva el botón, no en qué tema se está: es lo que se va a conseguir. */
  protected readonly etiqueta = computed(() =>
    this.esOscuro() ? this.t('theme.light') : this.t('theme.dark'),
  );

  protected alterna(): void {
    this.preferencias.cambiaTema(this.esOscuro() ? TEMA_CLARO : TEMA_OSCURO);
  }
}
