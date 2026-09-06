import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faHouse, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MarcoDeError } from '../component/marco-de-error';

/**
 * La página que se enseña cuando la dirección no existe.
 *
 * <p>Tres salidas y no una: volver atrás sirve a quien ha pinchado un enlace roto dentro del sitio, el
 * inicio a quien llega de fuera, y el catálogo a quien buscaba un producto que ya no está — que es de
 * dónde vienen casi todos los 404 de una tienda.
 */
@Component({
  selector: 'nx-no-encontrada',
  imports: [RouterLink, FaIconComponent, MarcoDeError],
  template: `
    <nx-marco-de-error
      [codigo]="'404'"
      [titulo]="t('errors.404.title')"
      [cuerpo]="t('errors.404.body')"
    >
      <button type="button" (click)="atras()" class="btn btn-outline">
        <fa-icon [icon]="iconos.atras" /> {{ t('errors.back') }}
      </button>
      <a routerLink="/" class="btn btn-primary">
        <fa-icon [icon]="iconos.inicio" /> {{ t('errors.home') }}
      </a>
      <a routerLink="/catalog" class="btn btn-outline">
        <fa-icon [icon]="iconos.buscar" /> {{ t('errors.browse_catalog') }}
      </a>
    </nx-marco-de-error>
  `,
})
export class NoEncontradaPage {
  private readonly ubicacion = inject(Location);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = { atras: faArrowLeft, inicio: faHouse, buscar: faMagnifyingGlass };

  /** `Location` y no el enrutador: aquí se quiere el historial del navegador, no una ruta concreta. */
  protected atras(): void {
    this.ubicacion.back();
  }
}
