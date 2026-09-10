import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EsqueletoTarjetaProducto } from '@ds/component/marcador/esqueleto-tarjeta-producto';
import { ResumenDeProducto } from '../../domain/model/producto';
import { TarjetaProducto } from './tarjeta-producto';

/**
 * La cuadrícula de productos, con su esqueleto mientras carga.
 *
 * <p>La usan el listado, los favoritos y el historial. Antes cada pantalla repetía la misma retahíla de
 * clases y su propio esqueleto; cuando se ajustó el número de columnas hubo que tocarlas todas y una se
 * quedó atrás.
 *
 * <p>MOBILE FIRST: dos columnas en el móvil y se va ensanchando. Dos columnas es lo que deja que la
 * foto tenga tamaño suficiente para reconocer un producto sin tener que abrirlo.
 */
@Component({
  /*
   * El anfitrión es BLOQUE, y no es cosmética: un elemento personalizado nace «display: inline», y a
   * un elemento en línea el navegador le IGNORA los márgenes verticales. El contenedor reparte el
   * espacio con `space-y-*`, que funciona poniendo `margin-top` al hermano siguiente, así que ese
   * espacio se perdía y los productos salían pegados a la barra de filtros. Con filtros puestos
   * aparecía un hueco de diecinueve píxeles que no venía de ninguna regla: era el hueco entre líneas
   * de dos cajas en línea, así que la separación dependía de lo que hubiera dentro.
   */
  host: { class: 'block' },
  selector: 'nx-cuadricula-productos',
  imports: [TarjetaProducto, EsqueletoTarjetaProducto],
  template: `
    @if (cargando() && productos().length === 0) {
      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        aria-busy="true"
      >
        @for (hueco of huecos(); track hueco) {
          <nx-esqueleto-tarjeta-producto />
        }
      </div>
    } @else if (productos().length === 0) {
      <div class="card p-10 text-center">
        <p class="text-sm text-ink-500">{{ t(claveDeVacio()) }}</p>
        <ng-content select="[vacio]" />
      </div>
    } @else {
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        @for (producto of productos(); track producto.id; let i = $index) {
          <nx-tarjeta-producto
            [producto]="producto"
            [enPanel]="enPanel()"
            [prioritaria]="i < prioritarias"
          />
        }
      </div>
    }
  `,
})
export class CuadriculaProductos {
  /**
   * Cuántas fotos se piden con prioridad. Dos, que son las que caben en la primera fila del móvil:
   * es donde está la imagen que decide el tiempo hasta ver algo útil. Marcar más competiría con ella.
   */
  protected readonly prioritarias = 2;

  readonly productos = input.required<readonly ResumenDeProducto[]>();
  readonly cargando = input(false);
  readonly claveDeVacio = input('catalog.empty');
  readonly enPanel = input(false);
  readonly cuantosHuecos = input(12);

  protected readonly t = inject(TraduccionService).t;

  protected huecos(): readonly number[] {
    return Array.from({ length: this.cuantosHuecos() }, (_, i) => i);
  }
}
