import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEarthAmericas, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { banderaDePais } from './paises';

/** Lo único que la cinta necesita saber de un país: cómo se llama y de dónde sale su bandera. */
export interface PaisDeLaCinta {
  readonly codigo: string;
  readonly nombre: string;
}

/**
 * La cinta giratoria de países a los que se envía.
 *
 * <p>Está en el sistema de diseño y no en un contexto porque NO tiene negocio: recibe una lista y la
 * pasea. Quién sabe adónde se puede enviar —y con qué puerto lo pregunta— es asunto de quien la monta.
 * La escriben dos sitios distintos: la cobertura de «checkout» y la portada de «catalog», y esos dos
 * contextos tienen prohibido verse entre ellos, así que la pieza compartida solo podía vivir aquí. La
 * alternativa era copiar setenta líneas de marquesina en dos ficheros y arreglar el difuminado dos veces.
 *
 * <p>Sin países no se pinta NADA, ni siquiera el titular: una sección vacía con un cero al lado se lee
 * como una avería, no como «todavía no hay datos».
 */
@Component({
  selector: 'nx-cinta-de-paises',
  imports: [FaIconComponent],
  template: `
    @if (paises().length > 0) {
      <section class="border-y border-base-200 bg-base-100/60 py-8 overflow-hidden">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-center gap-2 mb-5 text-center">
            <fa-icon [icon]="iconoMundo" class="text-primary" />
            <h3 class="text-base font-medium">{{ t('home.shipping_banner.title') }}</h3>
            <span class="badge badge-primary badge-sm">{{ paises().length }}</span>
          </div>

          <!-- La pista se desplaza media anchura en bucle; por eso la lista va duplicada. Se para al
               pasar el ratón por encima. La animación —y su versión quieta para quien pide menos
               movimiento— vive en styles.css, como todo el estilo del proyecto. -->
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
export class CintaDePaises {
  readonly paises = input<readonly PaisDeLaCinta[]>([]);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoMundo = faEarthAmericas;
  protected readonly iconoCamion = faTruckFast;

  /**
   * La lista duplicada: es lo que hace que el desplazamiento se cierre sin salto.
   *
   * <p>Cada copia lleva su propia clave —el código del país más la vuelta— porque el `track` necesita un
   * identificador ESTABLE y ÚNICO: con el código a secas habría dos elementos con la misma clave, y con
   * el índice se reconstruiría la cinta entera cada vez que cambia la cobertura.
   */
  protected readonly cinta = computed<readonly (PaisDeLaCinta & { clave: string })[]>(() => {
    const lista = this.paises();
    return [
      ...lista.map((pais) => ({ ...pais, clave: `1:${pais.codigo}` })),
      ...lista.map((pais) => ({ ...pais, clave: `2:${pais.codigo}` })),
    ];
  });

  /**
   * La bandera del código, con respaldo.
   *
   * <p>`banderaDePais` devuelve vacío cuando el código no tiene dos letras, y un hueco en mitad de la
   * cinta se ve como una imagen rota. Aquí se prefiere la bandera blanca: se entiende como «país sin
   * bandera» y no descuadra la píldora.
   */
  protected bandera(codigo: string): string {
    return banderaDePais(codigo) || '🏳️';
  }
}
