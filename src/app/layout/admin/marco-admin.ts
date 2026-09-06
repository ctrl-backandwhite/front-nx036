import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faBars,
  faCartShopping,
  faCircleNodes,
  faRightFromBracket,
  faStore,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { InterruptorTema } from '@ds/component/tema/interruptor-tema';
import { SelectorPaisMoneda } from '@ds/component/selector-pais-moneda/selector-pais-moneda';
import { SombraAlDesplazar } from '@ds/directive/sombra-al-desplazar.directive';
import { TransicionPagina } from '@ds/directive/transicion-pagina.directive';
import { PapelAdmin, seccionesPara } from './navegacion-admin';

/** Lo que el marco del panel necesita saber de quien lo abre. */
export interface UsuarioDelPanel {
  readonly nombre: string;
  readonly correo: string;
  readonly papel: PapelAdmin;
  readonly avatar?: string;
}

/**
 * El marco del panel: barra lateral con el mapa de secciones, cabecera y contenido.
 *
 * <p>Igual que el del escaparate, es una pieza de MARCO: la sesión, la cesta, el buscador global y el
 * buzón de avisos entran por sus huecos. Lo único que decide aquí dentro es qué opciones se pintan
 * según el papel, y eso no es un permiso —los permisos los aplica el backend— sino no ofrecer puertas
 * que van a rebotar.
 */
@Component({
  selector: 'nx-marco-admin',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FaIconComponent,
    InterruptorTema,
    SelectorPaisMoneda,
    SombraAlDesplazar,
    TransicionPagina,
  ],
  template: `
    <div class="min-h-screen bg-base-200">
      @if (abierto()) {
        <div (click)="abierto.set(false)" class="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-hidden="true"></div>
      }

      <aside
        class="fixed z-40 inset-y-0 left-0 w-64 bg-base-100 border-r border-base-300 flex flex-col shadow-pastel-sm
               transform transition-transform duration-500 lg:translate-x-0"
        [class.translate-x-0]="abierto()"
        [class.-translate-x-full]="!abierto()"
      >
        <div class="navbar min-h-14 px-4 border-b border-base-200">
          <a
            routerLink="/"
            class="flex items-center gap-2 hover:opacity-80 flex-1"
            [title]="t('admin.back_to_site')"
          >
            <fa-icon [icon]="iconoMarca" class="text-primary text-lg" />
            <div>
              <div class="font-medium text-[15px] leading-tight">NX036</div>
              <div class="text-[11px] opacity-60 -mt-0.5">{{ t('admin.subtitle') }}</div>
            </div>
          </a>
          <button
            type="button"
            (click)="abierto.set(false)"
            class="lg:hidden btn btn-ghost btn-sm btn-square"
            [attr.aria-label]="t('admin.nav.close_menu')"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>

        <!-- Una sola columna: los títulos de sección son «menu-title» planos y las opciones, hermanas. -->
        <ul class="menu menu-sm w-full flex-1 flex-nowrap overflow-y-auto scrollbar-thin px-2 py-3 gap-0.5">
          @for (seccion of secciones(); track seccion.clave; let primera = $first) {
            <li class="menu-title text-[10px] uppercase tracking-wider opacity-60" [class.mt-3]="!primera">
              {{ t(seccion.clave) }}
            </li>
            @for (opcion of seccion.opciones; track opcion.destino) {
              <li>
                <a
                  [routerLink]="opcion.destino"
                  routerLinkActive="menu-active font-medium"
                  [routerLinkActiveOptions]="{ exact: !!opcion.exacta }"
                  class="text-[13px]"
                >
                  <fa-icon
                    [icon]="opcion.icono"
                    class="w-4 text-center text-[12px] text-base-content/50"
                  />
                  <span class="truncate">{{ t(opcion.clave) }}</span>
                </a>
              </li>
            }
          }
        </ul>

        <div class="p-3 border-t border-base-200">
          @if (usuario(); as quien) {
            <div class="card card-compact bg-base-200 mb-2">
              <div class="card-body p-3">
                <div class="flex items-center gap-2">
                  @if (quien.avatar) {
                    <img [src]="quien.avatar" alt="" class="w-8 h-8 rounded-full object-cover" />
                  } @else {
                    <div class="avatar avatar-placeholder">
                      <!-- Blanco explícito y no «text-primary-content»: en el tema oscuro este último
                           quedaba del mismo color que el fondo y las iniciales desaparecían. -->
                      <div
                        class="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center"
                      >
                        <span class="text-[11px] font-medium leading-none">{{ iniciales() }}</span>
                      </div>
                    </div>
                  }
                  <div class="flex-1 min-w-0">
                    <div class="text-[13px] font-medium truncate">
                      {{ quien.nombre || quien.correo }}
                    </div>
                    <div class="text-[11px] opacity-60 truncate">{{ quien.correo }}</div>
                  </div>
                </div>
                <span class="badge badge-primary badge-sm mt-1">{{ quien.papel }}</span>
              </div>
            </div>
          }
          <!-- Volver a la tienda: en móvil el botón «Ver sitio» de la cabecera está oculto, así que el
               acceso explícito va aquí (el logo también enlaza, pero eso no es evidente). -->
          <a
            routerLink="/"
            (click)="abierto.set(false)"
            class="btn btn-ghost btn-sm w-full mb-2"
            [title]="t('admin.back_to_site')"
          >
            <fa-icon [icon]="iconoTienda" /> {{ t('admin.view_site') }}
          </a>
          <button type="button" (click)="cierraSesion.emit()" class="btn btn-outline btn-sm w-full">
            <fa-icon [icon]="iconoSalir" /> {{ t('admin.signout') }}
          </button>
        </div>
      </aside>

      <main class="lg:ml-64 min-w-0">
        <div
          nxSombraAlDesplazar
          class="navbar bg-base-100/95 backdrop-blur border-b border-base-300 shadow-pastel-sm sticky top-0 z-40 min-h-14 px-4 lg:px-6"
        >
          <div class="navbar-start gap-2">
            <button
              type="button"
              (click)="abierto.set(true)"
              class="lg:hidden btn btn-ghost btn-sm btn-square"
              [attr.aria-label]="t('admin.nav.open_menu')"
            >
              <fa-icon [icon]="iconoBarras" />
            </button>
            <div class="text-[13px] opacity-70 font-medium hidden xl:block">
              {{ t('admin.subtitle') }} · NX036
            </div>
            <ng-content select="[nx-buscador]" />
          </div>
          <div class="navbar-end flex items-center gap-2">
            <div class="indicator">
              @if (lineasCesta() > 0) {
                <span class="indicator-item badge badge-primary badge-sm">
                  {{ lineasCesta() > 9 ? '9+' : lineasCesta() }}
                </span>
              }
              <button
                type="button"
                (click)="abreCesta.emit()"
                class="btn btn-ghost btn-sm btn-square"
                [title]="t('nav.cart')"
                [attr.aria-label]="t('nav.cart')"
              >
                <fa-icon [icon]="iconoCesta" />
              </button>
            </div>
            <ng-content select="[nx-avisos]" />
            <nx-interruptor-tema />
            <a
              routerLink="/"
              class="btn btn-outline btn-sm hidden sm:inline-flex"
              [title]="t('admin.back_to_site')"
            >
              <fa-icon [icon]="iconoAbrirFuera" />
              <span class="hidden md:inline">{{ t('admin.view_site') }}</span>
            </a>
            <nx-selector-pais-moneda />
          </div>
        </div>
        <div class="p-4 sm:p-6 lg:p-8 w-full">
          <div nxTransicionPagina>
            <router-outlet />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class MarcoAdmin {
  readonly usuario = input<UsuarioDelPanel | null>(null);
  readonly lineasCesta = input(0);

  readonly cierraSesion = output<void>();
  readonly abreCesta = output<void>();

  protected readonly iconoMarca = faCircleNodes;
  protected readonly iconoAspa = faXmark;
  protected readonly iconoBarras = faBars;
  protected readonly iconoCesta = faCartShopping;
  protected readonly iconoTienda = faStore;
  protected readonly iconoSalir = faRightFromBracket;
  protected readonly iconoAbrirFuera = faArrowUpRightFromSquare;
  protected readonly t = inject(TraduccionService).t;
  protected readonly abierto = signal(false);

  private readonly enrutador = inject(Router);

  private readonly ruta = toSignal(
    this.enrutador.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.enrutador.url },
  );

  constructor() {
    // El cajón lateral se cierra al navegar: en el móvil tapa la pantalla entera.
    effect(() => {
      this.ruta();
      this.abierto.set(false);
    });
  }

  protected readonly secciones = computed(() => seccionesPara(this.usuario()?.papel ?? null));

  /** Las dos primeras letras del nombre, o del correo si no hay nombre. */
  protected readonly iniciales = computed(() => {
    const quien = this.usuario();
    return (quien?.nombre || quien?.correo || '').slice(0, 2).toUpperCase();
  });
}
