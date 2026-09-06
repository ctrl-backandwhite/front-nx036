import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { ResumenDeProducto } from '../../domain/model/producto';

/**
 * Un producto en la vista de LISTA.
 *
 * <p>`flex-row` explícito: la clase `card` ya trae dirección de columna, y la utilidad `flex` solo
 * activa el modo flexible sin tocar la dirección. Sin esto la vista de lista se pintaba en columna y
 * centrada —imagen arriba, título debajo, precio debajo—, es decir, como la cuadrícula pero ocupando
 * el doble. No era una lista.
 *
 * <p>La miniatura CRECE con la pantalla: en escritorio la fila ocupa todo el ancho y con 96 píxeles
 * quedaba un hueco enorme entre el título y el precio, con la foto —lo que hace que se reconozca un
 * producto de un vistazo— del tamaño de un icono.
 */
@Component({
  selector: 'nx-fila-listado',
  imports: [RouterLink, ImagenSegura],
  template: `
    <a
      [routerLink]="['/catalog', producto().slug]"
      class="card w-full p-3 sm:p-4 flex flex-row items-center gap-3 sm:gap-4 text-left
             hover:border-brand-300 hover:shadow-pastel transition-colors"
    >
      <nx-imagen-segura
        [src]="producto().imagenPrincipal"
        [alt]="producto().titulo"
        clase="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-cover rounded-lg shrink-0"
        claseMarcador="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-lg shrink-0"
      />
      <div class="flex-1 min-w-0">
        <!-- Dos líneas de título en pantalla grande: con una sola, los títulos largos del catálogo se
             cortaban justo donde está el dato que distingue un modelo de otro. -->
        <div class="text-[14px] lg:text-[15px] font-medium line-clamp-1 lg:line-clamp-2">
          {{ producto().titulo }}
        </div>
        @if (producto().proveedor) {
          <div class="text-[11px] text-ink-500 truncate">{{ producto().proveedor }}</div>
        }
        <!-- Los rótulos salen del diccionario: estaban escritos en español dentro del componente, así
             que en inglés o en chino esta vista seguía diciendo «ventas/mes» y «En stock». -->
        <div class="text-[11px] text-ink-500 mt-1 flex items-center gap-x-3 gap-y-0.5 flex-wrap">
          <span>★ {{ producto().valoracion ?? '—' }}</span>
          <span>· {{ ventas() }}</span>
          @if (producto().enviaDesde) {
            <span class="hidden sm:inline">· {{ producto().enviaDesde }}</span>
          }
          @if (producto().estado === 'ACTIVE') {
            <span class="text-success">· {{ t('catalog.list.in_stock') }}</span>
          }
        </div>
      </div>
      <div class="text-right shrink-0 self-center">
        <!-- El importe llega ya formateado del backend, que es la norma del proyecto: el front pinta
             precios, no los calcula ni los convierte. -->
        <div class="text-[15px] font-semibold text-brand-700 whitespace-nowrap">
          {{ producto().precio.formateado ?? '—' }}
        </div>
        <!-- En el móvil el rótulo sobra: la fila entera ya es el enlace a la ficha, y un botón de
             ciento y pico píxeles se come el ancho que necesita el título. -->
        <span class="btn btn-outline btn-sm mt-2 hidden sm:inline-flex">
          {{ t('catalog.list.details') }}
        </span>
      </div>
    </a>
  `,
})
export class FilaListado {
  readonly producto = input.required<ResumenDeProducto>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly ventas = computed(() =>
    this.traduccion.tCon('catalog.list.sales', { n: String(this.producto().ventasMensuales) }),
  );
}
