import { Component, ElementRef, computed, inject, input, resource, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';

/** Cuánto avanza cada pulsación de las flechas. Un poco más de dos tarjetas. */
const PASO_PX = 360;

/**
 * Los productos relacionados: misma categoría, sin el actual y ordenados por tendencia.
 *
 * <p>Se pintan con enlaces de enrutador, no con anclas normales: con un ancla, pulsar un recomendado
 * recargaba la aplicación entera y se perdía el carrito de invitado que vive en memoria.
 */
@Component({
  selector: 'nx-recomendados',
  imports: [RouterLink, FaIconComponent, ImagenSegura],
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body">
        <header class="flex items-center justify-between">
          <h2 class="card-title">{{ t('pdp.section.recommend') }}</h2>
          <div class="join">
            <button
              type="button"
              (click)="desplaza(-paso)"
              class="btn btn-sm btn-square join-item"
              [attr.aria-label]="t('quickview.prev')"
            >
              <fa-icon [icon]="iconos.izquierda" />
            </button>
            <button
              type="button"
              (click)="desplaza(paso)"
              class="btn btn-sm btn-square join-item"
              [attr.aria-label]="t('quickview.next')"
            >
              <fa-icon [icon]="iconos.derecha" />
            </button>
          </div>
        </header>
        <div #carril class="mt-3 flex gap-3 overflow-x-auto scrollbar-thin scroll-smooth">
          @if (productos().length === 0) {
            <div class="opacity-60 text-sm">{{ t('pdp.recommend.empty') }}</div>
          } @else {
            @for (producto of productos(); track producto.id) {
              <a
                [routerLink]="['/catalog', producto.slug]"
                class="shrink-0 w-44 card card-border bg-base-100 hover:shadow-lg transition-shadow"
              >
                <figure class="aspect-square bg-base-200">
                  <nx-imagen-segura
                    [src]="producto.imagenPrincipal"
                    [alt]="producto.titulo"
                    clase="w-full h-full object-cover"
                  />
                </figure>
                <div class="card-body p-2 text-[12px]">
                  <div class="line-clamp-2">{{ producto.titulo }}</div>
                  <!-- El backend ya manda el precio de venta compuesto y formateado: aquí solo se
                       pinta. El coste del proveedor no viaja fuera del panel. -->
                  <div class="text-primary font-medium">{{ producto.precio.formateado ?? '—' }}</div>
                </div>
              </a>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class Recomendados {
  readonly idDelProducto = input.required<string>();

  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly preferencias = inject(PreferenciasService);
  private readonly carril = viewChild<ElementRef<HTMLElement>>('carril');

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { izquierda: faChevronLeft, derecha: faChevronRight };
  protected readonly paso = PASO_PX;

  private readonly datos = resource({
    // La moneda entra en la lectura: las tarjetas recomendadas traen su precio ya calculado.
    params: () => ({
      id: this.idDelProducto(),
      idioma: this.preferencias.idioma(),
      moneda: this.preferencias.moneda(),
    }),
    loader: async ({ params }) => {
      const resultado = await this.catalogo.relacionados(params.id, 8);
      // Que no haya recomendaciones no puede romper la ficha: se pinta el texto de vacío y ya está.
      return resultado.ok ? resultado.valor : [];
    },
  });

  protected readonly productos = computed(() => this.datos.value() ?? []);

  protected desplaza(pixeles: number): void {
    this.carril()?.nativeElement.scrollBy({ left: pixeles, behavior: 'smooth' });
  }
}
