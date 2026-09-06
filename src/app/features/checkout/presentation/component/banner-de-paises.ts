import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEarthAmericas, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ConsultaLaCobertura } from '../../application/use-case/consulta-la-cobertura.use-case';

/** Un código ISO-3166-1 alfa-2 («ES») convertido en su emoji de bandera (🇪🇸). */
function bandera(codigo: string): string {
  if (!codigo || codigo.length !== 2) {
    return '🏳️';
  }
  const base = 0x1f1e6;
  const arriba = codigo.toUpperCase();
  return (
    String.fromCodePoint(base + (arriba.charCodeAt(0) - 65)) +
    String.fromCodePoint(base + (arriba.charCodeAt(1) - 65))
  );
}

/**
 * Los países a los que se envía, en una cinta que gira.
 *
 * <p>Se cotejan en vivo con la cobertura real del transportista, no con una lista escrita a mano: una
 * lista propia se queda desfasada y promete envíos que después no se pueden hacer. Sin datos no se pinta
 * nada, en vez de un hueco vacío.
 *
 * <p>Vive en «checkout» aunque se enseñe en la portada: quien sabe adónde se puede enviar es el pago.
 */
@Component({
  selector: 'nx-banner-de-paises',
  imports: [FaIconComponent],
  template: `
    @if (paises.value().length > 0) {
      <section class="border-y border-base-200 bg-base-100/60 py-8 overflow-hidden">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-center gap-2 mb-5 text-center">
            <fa-icon [icon]="iconoMundo" class="text-primary" />
            <h3 class="text-base font-medium">{{ t('home.shipping_banner.title') }}</h3>
            <span class="badge badge-primary badge-sm">{{ paises.value().length }}</span>
          </div>

          <!-- La pista se desplaza media anchura en bucle; por eso la lista va duplicada. Se para al
               pasar el ratón por encima. -->
          <div class="group relative">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-base-100 to-transparent"
            ></div>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-base-100 to-transparent"
            ></div>
            <div
              class="flex w-max gap-3 animate-[nx-marquee_90s_linear_infinite] group-hover:[animation-play-state:paused]"
            >
              @for (pais of cinta(); track pais.clave) {
                <div
                  class="flex items-center gap-2 whitespace-nowrap rounded-full border border-base-200 bg-base-100 px-4 py-2 text-sm shadow-sm"
                >
                  <span class="text-lg leading-none">{{ bandera(pais.codigo) }}</span>
                  <span class="font-medium">{{ pais.nombre }}</span>
                </div>
              }
            </div>
          </div>

          <p
            class="mt-4 text-center text-[12px] text-ink-500 flex items-center justify-center gap-1.5"
          >
            <fa-icon [icon]="iconoCamion" class="text-primary/70" />
            {{ t('home.shipping_banner.subtitle') }}
          </p>
        </div>
      </section>
    }
  `,
})
export class BannerDePaises {
  protected readonly paises = inject(ConsultaLaCobertura).paises();
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoMundo = faEarthAmericas;
  protected readonly iconoCamion = faTruckFast;
  protected readonly bandera = bandera;

  /**
   * La lista duplicada: es lo que hace que el desplazamiento se cierre sin salto.
   *
   * <p>Cada copia lleva su propia clave —el código del país más la vuelta— porque el `track` necesita un
   * identificador ESTABLE y ÚNICO: con el código a secas habría dos elementos con la misma clave, y con
   * el índice se reconstruiría la cinta entera cada vez que cambia la cobertura.
   */
  protected cinta(): readonly { clave: string; codigo: string; nombre: string }[] {
    const lista = this.paises.value();
    return [
      ...lista.map((pais) => ({ ...pais, clave: `1:${pais.codigo}` })),
      ...lista.map((pais) => ({ ...pais, clave: `2:${pais.codigo}` })),
    ];
  }
}
