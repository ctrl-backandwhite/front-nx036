import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { FichaDeProducto } from '../../../domain/model/producto';
import { estaEnLaGaleria, galeriaVisible } from '../../../domain/model/galeria';
import { ejePrincipal, etiquetaDeValor } from '../../../domain/model/seleccion-de-variante';

/**
 * Las fotos de color que aún NO están en la galería, listas para arrastrarlas a ella.
 *
 * <p>Existe porque muchas cargas traen la foto buena en la variante y no en la galería, y sin esto
 * había que reimportar el producto entero para arreglarlo. Al soltarla se copia la MISMA dirección: no
 * se vuelve a subir el fichero.
 *
 * <p>La dirección viaja en el propio gesto de arrastre (`text/uri-list`), no en un estado compartido:
 * así el componente que recibe la foto no necesita conocer a este, y el navegador se encarga de que el
 * dato solo exista mientras dura el arrastre.
 *
 * <p>Se carga EN DIFERIDO y solo para el administrador.
 */
@Component({
  selector: 'nx-fotos-de-variante',
  template: `
    @if (fotos().length > 0) {
      <div class="mt-3 pt-3 border-t border-base-200">
        <h4 class="text-[12px] font-medium mb-0.5">{{ t('admin.catalog.images.from_variants') }}</h4>
        <p class="text-[11px] opacity-60 mb-2">{{ t('admin.catalog.images.from_variants_hint') }}</p>
        <div class="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          @for (foto of fotos(); track foto.id) {
            <div
              draggable="true"
              (dragstart)="empieza($event, foto.direccion)"
              [title]="foto.etiqueta"
              class="aspect-square relative group cursor-grab active:cursor-grabbing rounded border border-base-200"
            >
              <img
                [src]="foto.direccion"
                [alt]="foto.etiqueta"
                class="w-full h-full object-cover rounded pointer-events-none"
              />
              @if (foto.etiqueta) {
                <span
                  class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] truncate px-1 py-0.5 rounded-b"
                >
                  {{ foto.etiqueta }}
                </span>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class FotosDeVariante {
  readonly ficha = input.required<FichaDeProducto>();

  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  /** Solo las que faltan en la galería, y sin repetir entre sí. */
  protected readonly fotos = computed(() => {
    const ficha = this.ficha();
    const galeria = galeriaVisible(ficha.imagenes);
    const eje = ejePrincipal(ficha.ejesDeVariante);
    const vistas = new Set<string>();
    const salida: { id: string; direccion: string; etiqueta: string }[] = [];
    for (const valor of eje?.valores ?? []) {
      if (!valor.imagen || estaEnLaGaleria(galeria, valor.imagen) || vistas.has(valor.imagen)) {
        continue;
      }
      vistas.add(valor.imagen);
      salida.push({
        id: valor.id,
        direccion: valor.imagen,
        etiqueta: etiquetaDeValor(valor, this.preferencias.idioma()),
      });
    }
    return salida;
  });

  protected empieza(evento: DragEvent, direccion: string): void {
    evento.dataTransfer?.setData('text/uri-list', direccion);
    evento.dataTransfer?.setData('text/plain', direccion);
  }
}
