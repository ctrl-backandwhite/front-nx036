import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';

/** Cada cuánto se vuelve a preguntar. Es solo un contador: un minuto basta y no castiga al backend. */
const CADA_MS = 60_000;

/**
 * La campana del escaparate: cuántos avisos quedan sin leer y la puerta al buzón.
 *
 * <p>Sin ella, los avisos —promociones, pedidos— llegaban a la base de datos y quien tiene una cuenta
 * normal no tenía ningún sitio desde donde verlos: `/notifications` llevaba al panel, que no puede abrir.
 *
 * <p>Solo se refresca en el NAVEGADOR. Al prerenderizar no hay a quién contarle avisos, y montar un
 * temporizador allí dejaría la construcción esperando a que termine.
 */
@Component({
  selector: 'nx-campana-de-avisos',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="indicator">
      @if (sinLeer() > 0) {
        <span class="indicator-item badge badge-error badge-sm text-white">
          {{ sinLeer() > 9 ? '9+' : sinLeer() }}
        </span>
      }
      <a
        routerLink="/notifications"
        class="btn btn-ghost btn-sm btn-square"
        [title]="t('nav.notifications')"
        [attr.aria-label]="t('nav.notifications')"
      >
        <fa-icon [icon]="iconoCampana" />
      </a>
    </div>
  `,
})
export class CampanaDeAvisos {
  private readonly consulta = inject(ConsultaElBuzon);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoCampana = faBell;
  protected readonly sinLeer = signal(0);

  constructor() {
    if (!esNavegador()) {
      return;
    }
    void this.actualiza();
    const reloj = setInterval(() => void this.actualiza(), CADA_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  private async actualiza(): Promise<void> {
    this.sinLeer.set(await this.consulta.cuantosSinLeer());
  }
}
