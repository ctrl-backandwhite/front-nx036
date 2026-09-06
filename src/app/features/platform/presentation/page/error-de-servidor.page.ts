import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MarcoDeError } from '../component/marco-de-error';

/**
 * La página de «algo ha fallado por nuestra parte».
 *
 * <p>No tiene ruta propia: la monta quien captura un fallo —el manejador global de errores o el
 * respaldo de una ruta— porque un 500 no es un sitio al que se navegue, es algo que le pasa a otra
 * pantalla. El botón de reintentar solo aparece si quien la monta sabe qué reintentar; ofrecerlo
 * siempre y que no haga nada es peor que no ofrecerlo.
 */
@Component({
  selector: 'nx-error-de-servidor',
  imports: [RouterLink, FaIconComponent, MarcoDeError],
  template: `
    <nx-marco-de-error [codigo]="'500'" [titulo]="t('errors.500.title')" [cuerpo]="t('errors.500.body')">
      @if (sePuedeReintentar()) {
        <button type="button" (click)="reintenta.emit()" class="btn btn-primary">
          {{ t('errors.retry') }}
        </button>
      }
      <a routerLink="/" class="btn btn-outline">
        <fa-icon [icon]="iconoInicio" /> {{ t('errors.home') }}
      </a>
    </nx-marco-de-error>
  `,
})
export class ErrorDeServidorPage {
  readonly sePuedeReintentar = input(false);
  readonly reintenta = output<void>();

  protected readonly iconoInicio = faHouse;
  protected readonly t = inject(TraduccionService).t;
}
