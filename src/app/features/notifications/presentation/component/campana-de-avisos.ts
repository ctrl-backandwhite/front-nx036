import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';
import { BuzonStore } from '../../application/state/buzon.store';

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
  private readonly buzon = inject(BuzonStore);

  /**
   * El número sale del ESTADO compartido, no de una señal propia.
   *
   * <p>Tenía la suya y ahí estaba el fallo: el buzón ya descontaba al leer un aviso y vacía al
   * marcarlos todos, pero lo hacía sobre el contador del estado —que la campana no miraba—. Así que
   * leías todo y la insignia seguía diciendo «9+» hasta que el reloj de aquí volviera a preguntar, un
   * minuto después. Dos contadores del mismo número siempre acaban discrepando; el reloj se queda,
   * pero solo para ponerlo al día por si llegan avisos nuevos.
   */
  protected readonly sinLeer = this.buzon.sinLeer;

  constructor() {
    if (!esNavegador()) {
      return;
    }
    void this.actualiza();
    const reloj = setInterval(() => void this.actualiza(), CADA_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  private async actualiza(): Promise<void> {
    this.buzon.fijaSinLeer(await this.consulta.cuantosSinLeer());
  }
}
