import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import { colorToCss } from '@shared/i18n/color-terms';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { EjeDeVariante } from '../../domain/model/producto';
import { etiquetaDeValor } from '../../domain/model/seleccion-de-variante';

/** Lo que se elige: la etiqueta (que es la clave) y la foto de ese color, si la tiene. */
export interface ColorElegido {
  readonly etiqueta: string;
  readonly foto?: string;
}

/**
 * Los recuadros de color (o del eje principal que haya: modelo, enchufe…).
 *
 * <p>El estado seleccionado va MUY marcado —recuadro y anillo del color de la variante, escala, sombra
 * y un visto en la esquina— porque con una diferencia sutil no se distinguía cuál estaba elegido, y de
 * ahí salían pedidos del color equivocado. Si el color no se reconoce, se cae al color primario.
 */
/**
 * Cómo se llama cada eje en el idioma de quien mira.
 *
 * <p>El nombre del eje se guarda en la base EN ESPAÑOL y no tiene tabla de traducción —«Color»,
 * «Talla», «Altura recomendada»—, así que se pintaba igual en los ocho idiomas: quien compraba en
 * alemán leía «Farbe» en la etiqueta de arriba y «Talla» en la de abajo. Aquí se traduce por clave,
 * y lo que no esté en el mapa se enseña tal cual vino, que es mejor que no enseñar nada.
 *
 * <p>Es un MAPA y no una clave calculada a propósito: hay nombres con paréntesis y símbolos
 * —«Medidas (largo x ancho en cm)»— donde cualquier normalización automática produce claves que
 * nadie encuentra al buscarlas en el diccionario.
 */
const CLAVES_DE_EJE: Readonly<Record<string, string>> = {
  color: 'attr.color',
  talla: 'attr.size',
  tamaño: 'attr.size',
  'altura recomendada': 'attr.recommended_height',
  medidas: 'attr.measurements',
  'medidas (largo x ancho en cm)': 'attr.measurements_lw_cm',
  estampado: 'attr.print',
  'longitud (cm)': 'attr.length_cm',
  modelo: 'attr.model',
  'talla de calcetín infantil': 'attr.kids_sock_size',
  'color de la montura': 'attr.frame_color',
  pureza: 'attr.purity',
  capacidad: 'attr.capacity',
  'formato del producto': 'attr.product_format',
  cristal: 'attr.lens',
};

@Component({
  selector: 'nx-selector-color',
  imports: [FaIconComponent],
  template: `
    @if (valores().length > 0) {
      <div>
        <!--
          El rótulo respira. Con «mb-1» —cuatro píxeles— el nombre del color quedaba pegado a las
          muestras y se leía como parte de la primera, no como el título de la fila.
        -->
        <div class="text-[12px] opacity-70 mb-3">
          {{ nombreDelEje() }}: <strong>{{ elegido() ?? '—' }}</strong>
        </div>
        <!--
          Miniatura Y NOMBRE, como en la ficha del proveedor. Solo con la foto había que pasar el
          ratón por encima para saber qué color era cada una —y en un móvil no hay ratón—, así que el
          nombre estaba solo en el título del navegador: invisible para quien compra con el dedo.
        -->
        <div class="flex flex-wrap gap-2">
          @for (valor of valores(); track valor.id) {
            <!-- gap-2 y no gap-1: la muestra elegida crece un 10 % («scale-110»), y con cuatro
                   píxeles de hueco el nombre quedaba tocando el borde de su propia foto. -->
              <div class="relative group flex flex-col items-center gap-2 w-[3.9rem]">
              <!--
                3,9rem = 62,4 px: los 48 de «w-12» más un 30%. Medida explícita y no «w-16», que son 64
                y el encargo era el 30% exacto. La foto de la variante es lo que distingue un color de
                otro, y a 48 px había que acercarse a la pantalla para verlo.
              -->
              <button
                type="button"
                (click)="elige.emit({ etiqueta: etiqueta(valor), foto: valor.imagen })"
                [title]="etiqueta(valor)"
                [attr.aria-pressed]="elegido() === etiqueta(valor)"
                [style.border-color]="borde(valor)"
                class="w-[3.9rem] h-[3.9rem] rounded-lg border-2 overflow-hidden relative transition-all block"
                [class]="
                  elegido() === etiqueta(valor)
                    ? 'ring-2 ring-offset-2 scale-110 shadow-lg'
                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                "
              >
                @if (valor.imagen) {
                  <img
                    [src]="valor.imagen"
                    [alt]="etiqueta(valor)"
                    loading="lazy"
                    class="w-full h-full object-contain bg-base-100"
                  />
                } @else {
                  <span
                    class="flex items-center justify-center w-full h-full text-[10px] px-1 text-center"
                  >
                    {{ etiqueta(valor) }}
                  </span>
                }
              </button>
              @if (elegido() === etiqueta(valor)) {
                <span
                  class="pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-neutral text-neutral-content shadow ring-2 ring-base-100"
                >
                  <fa-icon [icon]="iconos.visto" class="text-[13px]" />
                </span>
              }
              @if (puedeEditar()) {
                <!--
                  Visible SIEMPRE en el móvil; solo se esconde tras el puntero a partir de sm, donde de
                  verdad hay un puntero. Con opacity-0 a secas no se veía nunca en un teléfono.
                -->
                <button
                  type="button"
                  (click)="borra.emit(valor.id); $event.stopPropagation()"
                  [title]="t('admin.catalog.variant.delete')"
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white text-[10px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity shadow z-10"
                >
                  <fa-icon [icon]="iconos.papelera" />
                </button>
              }

              <!-- El nombre debajo, recortado a dos líneas: los colores del proveedor llegan con
                   referencias largas («P888白蓝», «YX11225 verde agua») y a tres líneas la fila se
                   descuadra entera. -->
              <!-- Sin «title» propio: el nombre completo ya lo lleva la miniatura de encima, y
                   repetirlo aquí deja DOS elementos con el mismo título por cada color. -->
              <span
                class="text-[10px] leading-tight text-center line-clamp-2 w-full"
                [class]="elegido() === etiqueta(valor) ? 'font-semibold' : 'opacity-70'"
              >
                {{ etiqueta(valor) }}
              </span>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SelectorColor {
  readonly eje = input.required<EjeDeVariante>();
  readonly elegido = input<string | null>(null);
  readonly puedeEditar = input(false);

  readonly elige = output<ColorElegido>();
  readonly borra = output<string>();

  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { visto: faCircleCheck, papelera: faTrash };

  protected readonly valores = computed(() => this.eje().valores);

  protected readonly nombreDelEje = computed(() => {
    const eje = this.eje();
    const crudo = (eje.nombre?.trim() || eje.nombreZh?.trim()) ?? '';
    if (!crudo) {
      return this.t('pdp.color');
    }
    const clave = CLAVES_DE_EJE[crudo.toLowerCase()];
    return clave ? this.t(clave) : crudo;
  });

  protected etiqueta(valor: EjeDeVariante['valores'][number]): string {
    return etiquetaDeValor(valor, this.preferencias.idioma());
  }

  protected borde(valor: EjeDeVariante['valores'][number]): string {
    return colorToCss(this.etiqueta(valor)) ?? '#d1d5db';
  }

  constructor() {
    // El PRIMER color queda elegido al abrir la ficha, para que el stock y el precio sean los de una
    // variante real desde el principio. Se elige SIN cambiar la foto: al entrar se enseña la imagen
    // principal del producto, y solo cambia cuando quien mira pulsa un recuadro.
    effect(() => {
      const valores = this.valores();
      if (this.elegido() == null && valores.length > 0) {
        this.elige.emit({ etiqueta: this.etiqueta(valores[0]) });
      }
    });
  }
}
