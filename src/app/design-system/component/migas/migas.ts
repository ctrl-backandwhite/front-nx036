import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight, faHouse } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

export interface Miga {
  readonly etiqueta: string;
  readonly destino?: string;
  /**
   * Parámetros de consulta del destino, APARTE de la ruta.
   *
   * <p>No se pueden meter en `destino`: `routerLink` trata la cadena entera como camino y escapa la
   * interrogación y el igual, con lo que sale un enlace a «/catalog%3FcategoryId%3D…» que no lleva a
   * ninguna parte. Con esto la miga de una ficha puede apuntar a su categoría dentro del catálogo.
   */
  readonly parametros?: Readonly<Record<string, string>>;
}

/**
 * Un identificador largo no dice nada a nadie: en su sitio va un puntito. Se reconoce por la forma del
 * principio de un UUID, que es lo que llevan las direcciones de ficha.
 */
const PARECE_IDENTIFICADOR = /^[0-9a-f]{8}-[0-9a-f]{4}/i;

/** Convierte un trozo de la dirección en algo legible: guiones por espacios y cada palabra en mayúscula. */
function legible(trozo: string): string {
  if (PARECE_IDENTIFICADOR.test(trozo)) {
    return '…';
  }
  return trozo.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * El rastro de migas de la página.
 *
 * <p>Sin `migas` propias se deduce de la dirección: cada trozo busca su texto en el diccionario
 * (`breadcrumb.<trozo>`) y, si no lo tiene, se pinta legible. Así una pantalla nueva ya sale con su
 * rastro sin que nadie lo escriba.
 */
@Component({
  selector: 'nx-migas',
  imports: [RouterLink, FaIconComponent],
  template: `
    @if (!(rastro().length === 0 && ocultaInicio())) {
      <nav
        aria-label="Breadcrumb"
        class="text-[12px] text-ink-500 flex items-center gap-1.5 mb-3 flex-wrap"
      >
        @if (!ocultaInicio()) {
          <a routerLink="/" class="hover:text-brand-700 inline-flex items-center gap-1">
            <fa-icon [icon]="iconoInicio" class="text-[11px]" />
            <span>{{ t('breadcrumb.home') }}</span>
          </a>
          @if (rastro().length > 0) {
            <fa-icon [icon]="iconoSeparador" class="text-[9px] text-ink-300" />
          }
        }
        @for (miga of rastro(); track $index; let ultima = $last) {
          <span class="inline-flex items-center gap-1.5">
            @if (ultima || !miga.destino) {
              <span [class]="ultima ? 'text-ink-700 font-medium' : ''">{{ miga.etiqueta }}</span>
            } @else {
              <a
                [routerLink]="miga.destino"
                [queryParams]="miga.parametros ?? null"
                class="hover:text-brand-700"
                >{{ miga.etiqueta }}</a
              >
            }
            @if (!ultima) {
              <fa-icon [icon]="iconoSeparador" class="text-[9px] text-ink-300" />
            }
          </span>
        }
      </nav>
    }
  `,
})
export class Migas {
  /** Las migas explícitas ganan a las deducidas de la dirección. */
  readonly migas = input<readonly Miga[] | undefined>(undefined);
  /** Esconde el enlace inicial a la portada. */
  readonly ocultaInicio = input(false);

  protected readonly iconoInicio = faHouse;
  protected readonly iconoSeparador = faChevronRight;
  protected readonly t = inject(TraduccionService).t;

  private readonly enrutador = inject(Router);

  /**
   * La dirección actual, ya como signal. Se toma de los eventos del enrutador porque `router.url` es un
   * valor suelto: leerlo no vuelve a pintar nada cuando cambia de página.
   */
  private readonly direccion = toSignal(
    this.enrutador.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.enrutador.url },
  );

  protected readonly rastro = computed<readonly Miga[]>(() => {
    const explicitas = this.migas();
    if (explicitas) {
      return explicitas;
    }
    // La parte de consulta y el ancla no son pasos de la navegación: filtrar o abrir una pestaña no
    // añade una miga.
    const camino = this.direccion().split('?')[0].split('#')[0];
    let acumulado = '';
    return camino
      .split('/')
      .filter(Boolean)
      .map((trozo) => {
        acumulado += '/' + trozo;
        const clave = `breadcrumb.${trozo}`;
        const traducido = this.t(clave);
        return {
          destino: acumulado,
          // El servicio devuelve la CLAVE cuando no hay traducción: es la señal de que hay que
          // arreglárselas con el propio trozo de la dirección.
          etiqueta: traducido !== clave ? traducido : legible(decodeURIComponent(trozo)),
        };
      });
  });
}
