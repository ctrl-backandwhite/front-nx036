import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faCheckDouble,
  faCircleInfo,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import { Aviso, categoriaDe, sinLeer } from '../../domain/model/aviso';
import { BuzonStore } from '../../application/state/buzon.store';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';
import { LeeUnAviso } from '../../application/use-case/lee-un-aviso.use-case';

/** Cada cuánto se vuelve a preguntar. Igual que la campana: un minuto es de sobra. */
const CADA_MS = 60_000;

/**
 * El desplegable de avisos del panel.
 *
 * <p>Lee de `/me/notifications`, la MISMA ruta que el buzón. Cuando cada uno miraba una distinta, el
 * resultado era un contador con dos avisos sobre una pantalla que decía «sin notificaciones».
 *
 * <p>Cada fila lleva SIEMPRE al buzón con ese aviso abierto. Antes solo era pulsable si traía un enlace
 * propio y el backend no manda ese campo: pulsar un aviso no hacía absolutamente nada.
 *
 * <p>MOBILE FIRST: en el móvil el panel ocupa el ancho de la pantalla anclado bajo la barra; a partir de
 * `sm` se convierte en el desplegable de siempre, pegado al botón.
 */
@Component({
  selector: 'nx-desplegable-de-avisos',
  imports: [RouterLink, FaIconComponent],
  host: {
    class: 'relative block',
    // Cerrar al pulsar fuera se resuelve con un oyente del documento y no con un fondo invisible: un
    // fondo a pantalla completa se traga el primer clic, y quien quería pulsar otra cosa tiene que
    // pulsarla dos veces.
    '(document:mousedown)': 'cierraSiEsFuera($event)',
  },
  template: `
    <button type="button" class="btn btn-ghost btn-sm btn-square indicator"
            [attr.aria-label]="t('admin.notifications.title')"
            [attr.aria-expanded]="abierto()"
            [title]="t('admin.notifications.title')"
            (click)="abierto.set(!abierto())">
      @if (sinLeer() > 0) {
        <span class="indicator-item badge badge-error badge-xs">{{ sinLeer() > 9 ? '9+' : sinLeer() }}</span>
      }
      <fa-icon [icon]="iconos.campana" />
    </button>

    @if (abierto()) {
      <div class="fixed top-14 inset-x-2 z-50 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96
                  max-h-[75vh] overflow-y-auto card bg-base-100 shadow-xl border border-base-200">
        <div class="card-body p-3">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-sm">{{ t('admin.notifications.title') }}</h3>
            @if (sinLeer() > 0) {
              <button type="button" class="btn btn-xs btn-ghost gap-1" (click)="marcaTodos()">
                <fa-icon [icon]="iconos.todos" class="text-[11px]" />
                {{ t('admin.notifications.mark_all_read') }}
              </button>
            }
          </div>

          <div class="max-h-96 overflow-y-auto -mx-3 mt-2 divide-y divide-base-200">
            @for (aviso of avisos(); track aviso.id) {
              <a [routerLink]="['/admin/notifications']" [queryParams]="{ n: aviso.id }" (click)="abierto.set(false)">
                <div class="px-3 py-2 hover:bg-base-200/50" [class.opacity-70]="!estaSinLeer(aviso)">
                  <div class="flex items-start gap-2">
                    <fa-icon [icon]="iconoDe(aviso)" class="mt-0.5 text-[12px]" [class]="colorDe(aviso)" />
                    <div class="flex-1 min-w-0">
                      <div class="text-[13px] font-medium truncate">{{ aviso.titulo }}</div>
                      @if (aviso.cuerpo) {
                        <div class="text-[11px] opacity-70 line-clamp-2">{{ aviso.cuerpo }}</div>
                      }
                      <div class="text-[10px] opacity-50 mt-0.5">{{ cuando(aviso.creadoEl) }}</div>
                    </div>
                    @if (estaSinLeer(aviso)) {
                      <span class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"
                            [attr.aria-label]="t('notif.unread')"></span>
                    }
                  </div>
                </div>
              </a>
            } @empty {
              <div class="text-center opacity-60 text-[12px] py-6 px-3">
                {{ t('admin.notifications.empty') }}
              </div>
            }
          </div>

          <a routerLink="/admin/notifications" (click)="abierto.set(false)"
             class="btn btn-ghost btn-xs w-full mt-2">
            {{ t('admin.notifications.see_all') }}
          </a>
        </div>
      </div>
    }
  `,
})
export class DesplegableDeAvisos {
  private readonly consulta = inject(ConsultaElBuzon);
  private readonly lee = inject(LeeUnAviso);
  private readonly buzon = inject(BuzonStore);
  // El elemento anfitrión, para saber si el clic cayó dentro o fuera del desplegable.
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly t = inject(TraduccionService).t;
  protected readonly abierto = signal(false);

  /** Se comparte el almacén del buzón: marcar leído en la página apaga el contador de aquí sin más. */
  protected readonly avisos = this.buzon.visibles;
  protected readonly sinLeer = computed(() => this.avisos().filter(sinLeer).length);

  protected readonly iconos = {
    campana: faBell,
    todos: faCheckDouble,
    info: faCircleInfo,
    aviso: faTriangleExclamation,
  };

  constructor() {
    if (!esNavegador()) {
      return;
    }
    void this.consulta.ejecuta('inbox');
    const reloj = setInterval(() => void this.consulta.ejecuta('inbox'), CADA_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected estaSinLeer(aviso: Aviso): boolean {
    return sinLeer(aviso);
  }

  protected iconoDe(aviso: Aviso): IconDefinition {
    return categoriaDe(aviso.tipoDeSuceso) === 'support' ? this.iconos.aviso : this.iconos.info;
  }

  protected colorDe(aviso: Aviso): string {
    return categoriaDe(aviso.tipoDeSuceso) === 'support' ? 'text-warning' : 'text-info';
  }

  protected cuando(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  protected async marcaTodos(): Promise<void> {
    await this.lee.todos();
    await this.consulta.ejecuta('inbox');
  }

  protected cierraSiEsFuera(evento: MouseEvent): void {
    if (this.abierto() && !this.anfitrion.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
  }
}
