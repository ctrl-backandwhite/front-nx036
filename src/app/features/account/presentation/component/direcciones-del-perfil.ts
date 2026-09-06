import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Direccion } from '../../domain/model/direccion';
import { DireccionesStore } from '../../application/state/direcciones.store';
import {
  CargaDirecciones,
  EliminaDireccion,
} from '../../application/use-case/direcciones.use-case';
import { FormularioDeDireccion } from './formulario-de-direccion';
import { TarjetaDeDireccion } from './tarjeta-de-direccion';

/**
 * La pestaña «Direcciones» del perfil.
 *
 * <p>Enseña solo las primeras: quien tenga muchas las gestiona en la página dedicada. Alta y edición van
 * en una ventana emergente para no perder de vista el resto del perfil.
 */
@Component({
  selector: 'nx-direcciones-del-perfil',
  imports: [RouterLink, FaIconComponent, TarjetaDeDireccion, FormularioDeDireccion],
  template: `
    <section class="card p-5">
      <div class="flex items-center justify-between gap-2">
        <h3 class="flex items-center gap-2">
          <fa-icon [icon]="iconos.direccion" class="text-brand-600" /> {{ t('profile.section.addresses') }}
        </h3>
        <button type="button" class="btn btn-primary btn-sm" (click)="abreAlta()">
          <fa-icon [icon]="iconos.anadir" /> {{ t('profile.addresses.add') }}
        </button>
      </div>

      @if (almacen.direcciones().length === 0) {
        <p class="text-sm text-ink-500 mt-3">{{ t('profile.addresses.empty') }}</p>
      } @else {
        <!-- Mobile first: una tarjeta por fila, dos desde «sm». -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          @for (direccion of almacen.primeras(); track direccion.id) {
            <nx-tarjeta-de-direccion
              [direccion]="direccion"
              (edita)="abreEdicion($event)"
              (borra)="borra($event)"
            />
          }
          @if (almacen.cuantasSobran() > 0) {
            <a routerLink="/addresses" class="text-xs text-brand-700 hover:underline self-center">
              +{{ almacen.cuantasSobran() }} {{ t('common.more') }}…
            </a>
          }
        </div>
      }
    </section>

    @if (formularioAbierto()) {
      <nx-formulario-de-direccion
        [direccion]="enEdicion()"
        [seraLaPrimera]="almacen.seraLaPrimera()"
        (cierra)="cierra()"
      />
    }
  `,
})
export class DireccionesDelPerfil {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly carga = inject(CargaDirecciones);
  private readonly elimina = inject(EliminaDireccion);

  protected readonly almacen = inject(DireccionesStore);
  protected readonly t = this.traduccion.t;
  protected readonly iconos = { direccion: faLocationDot, anadir: faPlus };

  protected readonly formularioAbierto = signal(false);
  /** Con dirección la ventana edita; sin ella, crea. Es el mismo formulario en los dos casos. */
  protected readonly enEdicion = signal<Direccion | null>(null);

  constructor() {
    void this.carga.ejecuta();
  }

  protected abreAlta(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
  }

  protected abreEdicion(direccion: Direccion): void {
    this.enEdicion.set(direccion);
    this.formularioAbierto.set(true);
  }

  protected cierra(): void {
    this.formularioAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected async borra(id: string): Promise<void> {
    const resultado = await this.elimina.ejecuta(id);
    if (!resultado.ok) {
      // Sin este aviso la tarjeta seguía ahí y parecía que el toque no se había registrado: se vuelve a
      // pulsar, otra vez sin efecto, y se acaba sin saber qué direcciones hay de verdad.
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
    }
  }
}
