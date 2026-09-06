import { Component, computed, inject, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ContenidoDeIdioma } from '../../../../domain/catalogo/model/alta-de-producto';
import { IdiomaDeTienda } from '../../../../domain/catalogo/port/catalogo-comun.port';

/**
 * El título y la descripción, idioma a idioma.
 *
 * <p>Los idiomas son ILIMITADOS y salen del registro que se administra en el panel: no se pueden
 * escribir aquí. Las pestañas llevan un punto verde cuando ese idioma ya tiene título, que es la única
 * forma de ver de un vistazo cuántos quedan sin rellenar.
 *
 * <p>Recibe el trozo de formulario con el contenido de todos los idiomas y ata los dos campos al del
 * idioma activo: cambiar de pestaña cambia a qué campo apuntan, no qué valor se copia a dónde.
 */
@Component({
  selector: 'nx-seccion-idiomas',
  imports: [FormField],
  template: `
    <div class="flex flex-wrap gap-1 border-b border-ink-100 mb-1">
      @for (idioma of idiomas(); track idioma.codigo) {
        <button
          type="button"
          [class]="
            'px-3 py-1.5 text-[12px] -mb-px border-b-2 transition-colors ' +
            (activo() === idioma.codigo
              ? 'border-brand-600 text-brand-700 font-medium'
              : 'border-transparent text-ink-500')
          "
          (click)="activo.set(idioma.codigo)"
        >
          {{ idioma.etiqueta }}
          @if (relleno(idioma.codigo)) {
            <span class="text-emerald-500" aria-hidden="true"> •</span>
          }
        </button>
      }
    </div>

    @if (campoActivo(); as campo) {
      <label class="block">
        <span class="text-[12px] font-medium text-ink-600 mb-1 block">
          {{ t('admin.create_product.title_field') }} ({{ etiquetaActiva() }})
        </span>
        <input class="input input-bordered input-sm w-full" [formField]="campo.titulo" />
      </label>
      <label class="block">
        <span class="text-[12px] font-medium text-ink-600 mb-1 block">
          {{ t('admin.create_product.desc') }} ({{ etiquetaActiva() }})
        </span>
        <textarea
          class="textarea textarea-bordered textarea-sm w-full h-20"
          [formField]="campo.descripcion"
        ></textarea>
      </label>
    }
    <p class="text-[11px] text-ink-400">{{ t('admin.create_product.multilang_hint') }}</p>
  `,
})
export class SeccionIdiomas {
  readonly idiomas = input.required<readonly IdiomaDeTienda[]>();
  readonly contenido = input.required<FieldTree<Record<string, ContenidoDeIdioma>>>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly activo = signal('es');

  /** El par de campos del idioma que se está editando. */
  protected readonly campoActivo = computed(() => this.contenido()[this.activo()]);

  /** Lo escrito en todos los idiomas: de aquí sale el punto verde de cada pestaña. */
  private readonly valores = computed(() => this.contenido()().value());

  protected readonly etiquetaActiva = computed(
    () => this.idiomas().find((i) => i.codigo === this.activo())?.etiqueta ?? this.activo(),
  );

  protected relleno(codigo: string): boolean {
    return (this.valores()[codigo]?.titulo ?? '').trim() !== '';
  }
}
