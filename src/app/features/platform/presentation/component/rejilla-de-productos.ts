import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFire } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { ProductoGanador } from '../../domain/model/inteligencia';
import { TasaDeCambio, convierte, formateaImporte } from '../../domain/model/tasa-de-cambio';

/**
 * La rejilla de productos ganadores. La comparten las pestañas de ventas y de productos ganadores.
 *
 * <p>El precio llega en YUANES, que es la divisa canónica del coste, y se enseña en la divisa activa.
 * Antes se pintaba con un dólar fijo delante del número chino: el importe era falso en las ocho
 * divisas menos en una.
 *
 * <p>MOBILE FIRST: dos columnas en el móvil —una tarjeta de producto por debajo de eso queda
 * ilegible— y hasta seis en pantalla ancha.
 */
@Component({
  selector: 'nx-rejilla-de-productos',
  imports: [RouterLink, FaIconComponent, ImagenSegura],
  template: `
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      @for (producto of productos(); track producto.slug) {
        <a
          [routerLink]="['/catalog', producto.slug]"
          class="card overflow-hidden hover:border-brand-300"
        >
          <nx-imagen-segura
            [src]="producto.imagenPrincipal"
            [alt]="producto.titulo"
            clase="aspect-square w-full object-cover"
            claseMarcador="aspect-square w-full"
          />
          <div class="p-2">
            <div class="text-[12px] line-clamp-2">{{ producto.titulo }}</div>
            <div class="text-[11px] text-ink-500 mt-1">
              <fa-icon [icon]="iconoFuego" class="text-amber-500 mr-1" />{{
                producto.ventasMensuales
              }}
              · {{ tendencia(producto) }}
            </div>
            @if (producto.precio !== null && producto.precio !== undefined) {
              <div class="text-[12px] font-medium text-brand-700 mt-1">{{ precio(producto) }}</div>
            }
          </div>
        </a>
      }
    </div>
  `,
})
export class RejillaDeProductos {
  readonly productos = input<readonly ProductoGanador[]>([]);
  readonly tasas = input<readonly TasaDeCambio[]>([]);
  readonly divisa = input('USD');

  private readonly traduccion = inject(TraduccionService);
  protected readonly iconoFuego = faFire;

  protected tendencia(producto: ProductoGanador): string {
    return Number(producto.puntuacionDeTendencia ?? 0).toFixed(2);
  }

  protected precio(producto: ProductoGanador): string {
    const enDivisa = convierte(Number(producto.precio ?? 0), 'CNY', this.divisa(), this.tasas());
    return formateaImporte(enDivisa, this.divisa(), this.traduccion.idioma());
  }
}
