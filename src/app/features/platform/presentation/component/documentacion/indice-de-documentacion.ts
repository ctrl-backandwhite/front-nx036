import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { INDICE } from '../../../domain/model/referencia-api';
import { iconoDeDocumentacion } from './iconos-de-documentacion';

/**
 * El índice lateral de la documentación, con su buscador.
 *
 * <p>El buscador filtra por el texto TRADUCIDO, no por la clave: quien busca «pedidos» no sabe que la
 * entrada se llama `docs.toc.checkout`.
 *
 * <p>MOBILE FIRST: el índice se oculta por debajo de `lg`. No es un descuido — en una pantalla estrecha
 * la documentación se lee de arriba abajo, y un índice de veintiuna entradas antes del primer párrafo
 * es una pared. La navegación por anclas sigue funcionando desde los enlaces del pie.
 */
@Component({
  selector: 'nx-indice-de-documentacion',
  imports: [FaIconComponent],
  template: `
    <aside class="hidden lg:block">
      <nav class="sticky top-20 space-y-4" [attr.aria-label]="t('docs.toc.heading')">
        <div class="relative">
          <fa-icon
            [icon]="iconoLupa"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-400"
          />
          <label class="sr-only" for="docs-buscar">{{ t('docs.search_placeholder') }}</label>
          <input
            id="docs-buscar"
            type="search"
            class="input pl-7 h-9 text-[12px]"
            [placeholder]="t('docs.search_placeholder')"
            [value]="busqueda()"
            (input)="busqueda.set(valor($event))"
          />
        </div>

        <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
          {{ t('docs.toc.heading') }}
        </div>

        <div class="space-y-0.5">
          @for (entrada of filtradas(); track entrada.id) {
            <a [href]="'#' + entrada.id" [class]="clasesDeEntrada(entrada.sangrada)">
              <fa-icon
                [icon]="icono(entrada.icono)"
                class="w-4 text-ink-400 group-hover:text-brand-600"
              />
              {{ t(entrada.clave) }}
            </a>
          }
        </div>
      </nav>
    </aside>
  `,
})
export class IndiceDeDocumentacion {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly iconoLupa = faMagnifyingGlass;

  protected readonly busqueda = signal('');

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) {
      return INDICE;
    }
    return INDICE.filter((entrada) => this.t(entrada.clave).toLowerCase().includes(texto));
  });

  protected icono = iconoDeDocumentacion;

  /**
   * Las clases de una entrada, en UNA cadena.
   *
   * <p>Y no con `[class.x]` por entrada: los nombres de utilidad de Tailwind llevan dos puntos y
   * corchetes —`hover:bg-ink-50`, `text-[12px]`— y esos caracteres rompen el analizador de plantillas
   * de Angular dentro de un enlace de clase. Componer la cadena es la forma de conservar el mismo
   * diseño sin pelearse con la sintaxis.
   */
  protected clasesDeEntrada(sangrada: boolean | undefined): string {
    const comunes =
      'flex items-center gap-2 px-2 py-1.5 rounded text-ink-700 hover:bg-ink-50 hover:text-brand-700 group';
    return sangrada ? `${comunes} pl-6 text-[12px] text-ink-600` : `${comunes} text-[13px]`;
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }
}
