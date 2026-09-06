import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBagShopping,
  faHouse,
  faStore,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La barra de pestañas del móvil, abajo del todo.
 *
 * <p>Es lo que hace que la tienda se USE como una aplicación y no como una página: lo principal está
 * siempre a un toque del pulgar, en la zona que se alcanza sin recolocar la mano, en vez de escondido
 * tras un menú que hay que abrir. En pantallas grandes no se pinta: ahí manda la barra de arriba, que
 * tiene sitio de sobra.
 *
 * <p>Cuatro destinos y no más: con cinco o seis, cada uno queda tan estrecho que se falla el toque. Los
 * que están son los que se repiten a diario —mirar, buscar, comprar, y lo tuyo—; el resto sigue en el
 * cajón.
 */
@Component({
  selector: 'nx-barra-inferior-movil',
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  template: `
    <nav
      [attr.aria-label]="t('nav.menu')"
      class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-base-100 border-t border-base-200
             pb-[env(safe-area-inset-bottom)]"
    >
      <ul class="grid grid-cols-4">
        @for (pestana of pestanas(); track pestana.destino + pestana.texto) {
          <li>
            <a
              [routerLink]="pestana.destino"
              routerLinkActive="text-primary font-medium"
              [routerLinkActiveOptions]="{ exact: pestana.exacta }"
              class="relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] text-ink-500"
            >
              <!-- El identificador marca el destino del efecto de «volar al carrito». En el móvil el
                   icono de la barra de arriba no se pinta, así que sin esto la imagen volaría hacia un
                   elemento sin caja: la esquina superior izquierda. -->
              <span class="relative" [attr.id]="pestana.esCesta ? 'nx-cart-icon-movil' : null">
                <fa-icon [icon]="pestana.icono" class="text-[17px]" />
                @if (pestana.esCesta && lineasCesta() > 0) {
                  <span
                    class="absolute -top-1.5 -right-2.5 badge badge-primary badge-xs px-1
                           text-[9px] leading-none"
                  >
                    {{ lineasCesta() > 9 ? '9+' : lineasCesta() }}
                  </span>
                }
              </span>
              {{ pestana.texto }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class BarraInferiorMovil {
  readonly autenticado = input(false);
  readonly lineasCesta = input(0);

  protected readonly t = inject(TraduccionService).t;

  protected readonly pestanas = computed(() => {
    const dentro = this.autenticado();
    return [
      { destino: '/', icono: faHouse, texto: this.t('nav.home'), exacta: true, esCesta: false },
      {
        destino: dentro ? '/catalog' : '/login',
        icono: faStore,
        texto: this.t('nav.catalog'),
        exacta: false,
        esCesta: false,
      },
      {
        destino: '/cart',
        icono: faBagShopping,
        texto: this.t('nav.cart'),
        exacta: false,
        esCesta: true,
      },
      {
        destino: dentro ? '/profile' : '/login',
        icono: faUser,
        texto: dentro ? this.t('nav.profile') : this.t('nav.signin'),
        exacta: false,
        esCesta: false,
      },
    ];
  });
}
